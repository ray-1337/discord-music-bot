import { VoiceState } from "oceanic.js";
import { search as ytSearch } from "yt-search";
import ytdl, { downloadOptions as ytdlDO } from "ytdl-core";
import { createAudioPlayer, StreamType, createAudioResource, AudioResource, AudioPlayer, VoiceConnection, AudioPlayerStatus, joinVoiceChannel } from "@discordjs/voice";
import validator from "validator";
import { Readable } from "node:stream";
import ms from "ms";
import { request } from "undici";
import { spawn } from "node:child_process";

const { isURL } = validator;

export const appropriateContentType = /(audio\/(mp3|ogg|webm|mpeg3?))|(application\/octet-stream)|(video\/mp4)/gi;

const durationLimit = ms("6h"); // 6 hours

// music state
const musicData: GuardedMap<string, MusicDataInference[]> = new Map();
const musicConnection: GuardedMap<string, { voiceState: VoiceState, audioPlayer: AudioPlayer, voiceConnection: VoiceConnection }> = new Map();
const currentMusicData: GuardedMap<string, AudioResource> = new Map();

// loop state
type loopState = "single" | "whole";
const loopMusic: GuardedMap<string, loopState> = new Map();
const loopedQuery: GuardedMap<string, MusicDataInference[]> = new Map();

const youtubeRegex = /(https?:\/\/(?:www\.)?((?:youtu\.be\/.{4,16})|(youtube\.com\/watch\?v=.{4,16})))/gim;
const youtubeShortRegex = /https?:\/\/(?:www\.)?youtube\.com\/shorts\/(.{10,13})/im;

class MusicUtil {
  constructor() { };
  // expose music configuration
  state(guildID: string) {
    if (!currentMusicData.has(guildID) || !musicData.has(guildID) || !musicConnection.has(guildID)) return null;

    const connection = musicConnection.get(guildID);

    return {
      ...connection,
      currentQueue: musicData.get(guildID)[0],
      audioResource: currentMusicData.get(guildID),
      loop: loopMusic.get(guildID),
      paused: connection?.audioPlayer.state.status === AudioPlayerStatus.Paused
    };
  };
  
  stop(guildID: string) {
    if (!musicConnection.has(guildID)) return false;
    const { audioPlayer, voiceConnection } = musicConnection.get(guildID);

    audioPlayer.stop();
    voiceConnection.destroy(true);
    musicConnection.delete(guildID);
    loopMusic.delete(guildID); // remove loop state
    loopedQuery.delete(guildID); // remove loop queue

    return true;
  };

  // expose queue
  queue(guildID: string) {
    return musicData.has(guildID) ? musicData.get(guildID) : [];
  };

  // loop the song or queue__
  loop(guildID: string, loopState: loopState | "off") {
    if (!musicConnection.has(guildID) || !musicData.has(guildID)) return false;

    if (loopState === "off") {
      loopMusic.delete(guildID);
      loopedQuery.delete(guildID);
      return true;
    };

    loopMusic.set(guildID, loopState);

    // if whole, store last queried songs, exhaust it, and bring it back to loopedQuery again
    if (loopState === "whole") {
      loopedQuery.set(guildID, musicData.get(guildID)!);
    };

    return true;
  };

  // pause/resume the song
  pauseResume(guildID: string) {
    if (!musicConnection.has(guildID)) return false;
    const { audioPlayer } = musicConnection.get(guildID);

    audioPlayer.state.status === AudioPlayerStatus.Paused ? audioPlayer.unpause() : audioPlayer.pause(true);

    return audioPlayer.state.status === AudioPlayerStatus.Paused;
  };

  // play some songs
  async play(voiceState: VoiceState, query: string, disableQueuing?: boolean) {
    try {
      const highWaterMark = 1 << 26; // i set higher so it can play audio smoothly, you can make it higher if you have a huge memory usage
      const downloadOptions: ytdlDO = { filter: "audioonly", quality: "lowestaudio", highWaterMark };

      // transform youtube short to normal video
      const gotYTShort = query.match(youtubeShortRegex);
      if (gotYTShort?.[1]) {
        query = "https://youtu.be/" + gotYTShort[1];
      };

      if (query.match(youtubeRegex)) {
        if (!disableQueuing) this.#saveQueue(voiceState.guildID, voiceState.userID, query);
        await this.#privatePlay(voiceState, ytdl(query, downloadOptions));
        return query;
      } else if (isURL(query)) {
        try {
          const data = await request(query, { 
            headers: {
              // bypass cloudflare error
              "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36"
            }
          });

          if (!data || data.statusCode >= 400) {
            console.error(data.statusCode, await data.body.text());
            return null;
          };

          const header = data.headers?.["content-type"] as string;
          if (data.statusCode === 302 && data.headers?.["location"]) {
            return this.play(voiceState, data.headers["location"] as string);
          };

          if (!header?.match(appropriateContentType)) {
            return null;
          };

          const buf = await data.body.arrayBuffer();

          // if the content is video
          if (header?.match(/video\/(mp4)/gim) || (data.headers?.["content-disposition"] as string).match(/(mp4|mov|webm)^/gim)) {
            await new Promise<boolean>((resolve, reject) => {
              const buffers: Buffer[] = [];

              const args = [
                '-i', query,
                '-b:a', '128k',
                '-acodec', 'libmp3lame',
                '-f', 'mp3',
                'pipe:1'
              ];
            
              const ffmpegProcess = spawn('ffmpeg', args);

              ffmpegProcess.stdout.on('data', (data) => {
                buffers.push(data);
              });

              ffmpegProcess.on("error", (error) => {
                console.error(error);
                return reject();
              })
              
              ffmpegProcess.on("close", async () => {
                await this.#privatePlay(voiceState, Readable.from(Buffer.concat(buffers)));
                resolve(true);
              });
            })
          } else {
            await this.#privatePlay(voiceState, Readable.from(Buffer.from(buf)));
          };

          if (!disableQueuing) {
            this.#saveQueue(voiceState.guildID, voiceState.userID, query);
          };
        } catch (error) {
          console.error(error);
          return null;
        };

        return query;
      };

      const search = await ytSearch(query);
      const current = search?.videos?.[0];

      if (
        !current?.url ||
        current.seconds >= Math.round(durationLimit / 1000) ||
        !current.seconds
      ) return null;

      if (!disableQueuing) this.#saveQueue(voiceState.guildID, voiceState.userID, search.videos[0].url);
      await this.#privatePlay(voiceState, ytdl(search.videos[0].url, downloadOptions));
      return search.videos[0].url;
    } catch (error) {
      console.error(error);
      return null;
    };
  };

  // skip the music if queued, otherwise stopped the player
  async skip(guildID: string) {
    try {
      if (!musicConnection.has(guildID)) return false;
      const { audioPlayer, voiceState } = musicConnection.get(guildID);

      // delete audio resource from cache
      currentMusicData.delete(guildID);

      // remove listener to prevent conflicts
      audioPlayer.off(AudioPlayerStatus.Idle, () => this.skip(guildID));

      const queue = musicData.get(guildID);
      const loopState = loopMusic?.get(guildID);

      // loop management
      if (loopMusic.has(guildID)) {
        // repeat whole queue
        if (loopState === "whole" && loopedQuery.has(guildID)) {
          const loopedQueue = loopedQuery.get(guildID);
          loopedQueue.shift();

          if (!loopedQueue?.length && queue?.length) {
            loopedQuery.set(guildID, queue);
          };

          const play = await this.play(voiceState, loopedQueue[0].url, true);
          if (!play) {
            // draft (might look at it, this might be an infinite loop)
            return this.skip(guildID);
          };

          return;
        };
      } else {
        // ignore single/off mode
        queue?.shift();
      };

      // disconnect if no queue left
      if (!queue?.length) {
        return this.stop(guildID);
      };

      const play = await this.play(voiceState, queue[0].url, true);
      if (play === null) {
        // draft (might look at it, this might be an infinite loop)
        return this.skip(guildID);
      };

      return true;
    } catch (error) {
      console.error(error);
      return false;
    };
  };

  // private function
  async #privatePlay(voiceState: VoiceState, query: Readable | string) {
    const audioPlayer = createAudioPlayer();
    const { guildID } = voiceState;

    if (musicConnection.has(guildID)) {
      const {voiceConnection} = musicConnection.get(guildID);

      if (!currentMusicData.has(guildID)) {
        voiceConnection.subscribe(audioPlayer);
      };
    } else {
      const voiceConnection = joinVoiceChannel({
        adapterCreator: voiceState.guild.voiceAdapterCreator,
        channelId: voiceState.channelID!,
        guildId: guildID,
        selfDeaf: true
      });

      if (!currentMusicData.has(guildID)) {
        voiceConnection.subscribe(audioPlayer);
      };

      musicConnection.set(guildID, { audioPlayer, voiceConnection, voiceState });
    };

    let resource = createAudioResource(query, {
      silencePaddingFrames: 5,
      inputType: StreamType.Arbitrary
    });

    if (!currentMusicData.has(guildID)) {
      audioPlayer.play(resource);
      currentMusicData.set(guildID, resource);
    };

    // idle (music finished)
    audioPlayer
    .on(AudioPlayerStatus.Idle, () => this.skip(guildID))
    .on("error", (error) => {
      console.error(error);
      this.skip(guildID);
    });

    return;
  };

  #saveQueue(guildID: string, requesterID: string, url: string) {
    if (musicData.has(guildID)) {
      musicData.get(guildID).push({requesterID, url});

      // loop whole queue
      if (loopMusic.has(guildID) && loopMusic.get(guildID) === "whole") {
        loopedQuery.get(guildID)?.push({requesterID, url});
      };
    } else {
      musicData.set(guildID, [{requesterID, url}]);
    };

    return true;
  };
};

interface MusicDataInference {
  requesterID: string;
  url: string;
};

export default new MusicUtil();