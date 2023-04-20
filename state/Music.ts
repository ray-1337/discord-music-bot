import { VoiceState } from "oceanic.js";
import { search as ytSearch } from "yt-search";
import ytdl, { downloadOptions as ytdlDO, validateURL as validateYTURL } from "ytdl-core";
import { createAudioPlayer, StreamType, createAudioResource, AudioResource, AudioPlayer, VoiceConnection, AudioPlayerStatus, joinVoiceChannel } from "@discordjs/voice";
import isURL from "validator/lib/isURL";
import { Readable } from "node:stream";
import ms from "ms";
import { request } from "undici";
import { spawn } from "node:child_process";

// soundcloud management
import { create as scdlContent } from "soundcloud-downloader";
const scdl = scdlContent({ clientID: process.env?.SOUNDCLOUD_CLIENT_ID });

export const appropriateContentType = /(audio\/(mp3|ogg|webm|mpeg3?))|(application\/octet-stream)|(video\/mp4)/gi;

const durationLimit = ms("6h"); // 6 hours

// music state
const musicData: GuardedMap<string, MusicDataInference[]> = new Map();
const musicConnection: GuardedMap<string, { voiceState: VoiceState, audioPlayer: AudioPlayer, voiceConnection: VoiceConnection }> = new Map();
const currentMusicData: GuardedMap<string, AudioResource> = new Map();

// loop state
export type loopState = "single" | "whole";
export type PlayerAvailability = "sc" | "yt";
const loopMusic: GuardedMap<string, loopState> = new Map();
const loopedQuery: GuardedMap<string, MusicDataInference[]> = new Map();

const youtubeRegex = /(https?:\/\/(?:www\.)?((?:youtu\.be\/.{4,16})|(youtube\.com\/watch\?v=.{4,16})))/gim;
const youtubeShortRegex = /https?:\/\/(?:www\.)?youtube\.com\/shorts\/(.{10,13})/im;
const youtubePlaylistRegex = /^http(?:s)?:\/\/(?:www\.)?youtube\.com\/playlist\?list=(PL[a-zA-Z0-9_-]{1,})/gim;
const soundCloudRegex = /^(?:https?:\/\/)((?:www\.)|(?:m\.))?soundcloud\.com\/[a-z0-9](?!.*?(-|_){2})[\w-]{1,23}[a-z0-9](?:\/.+)?$/gim;

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

    voiceConnection.off("error", (error) => console.error(error));

    audioPlayer
    .off(AudioPlayerStatus.Idle, () => this.skip(guildID))
    .off("error", (error) => {
      console.error(error);
      this.skip(guildID, true);
    });

    musicData.delete(guildID);

    try {
      // bozo
      voiceConnection.destroy();
    } catch {}

    audioPlayer.stop(true);
    musicConnection.delete(guildID);
    loopMusic.delete(guildID); // remove loop state
    loopedQuery.delete(guildID); // remove loop queue

    return true;
  };

  // search through lots
  async search(query: string, playerType?: PlayerAvailability, limitPagination?: number): Promise<Array<{url: string, title: string, artist?: string | undefined}>> {
    if (!playerType) playerType = "yt";
    if (!limitPagination) limitPagination = 5;

    switch (playerType) {
      case "sc": {
        const search = await scdl.search({ query, limit: limitPagination });
        if (!search?.collection?.length) return [];
        
        return search.collection
        .map(({permalink_url}) => {
          if (permalink_url) {
            return { url: permalink_url, title: permalink_url, artist: permalink_url.match(/soundcloud\.com\/([^/]+)\//)?.[1] };
          };
        })
        
        // https://stackoverflow.com/a/54318054
        .filter(<T>(argument: T | undefined): argument is T => {
          return argument !== undefined;
        });
      };

      default:
      case "yt": {
        const search = await ytSearch(query);
        if (!search?.videos?.length) return [];

        return search.videos.slice(0, limitPagination).map(({url, title, author}) => {
          return { url, title, artist: author.name };
        });
      };
    };
  };

  // get track info
  async trackInfo(query: string): Promise<{ title: string; url: string; duration: number; thumbnail: string; embed_color: number } | null> {
    try {
      switch (true) {
        // soundcloud
        case scdl.isValidUrl(query): {
          const {title, permalink_url, full_duration, artwork_url} = await scdl.getInfo(query);
          if (!title || !permalink_url || !artwork_url) return null;

          return {
            title,
            url: permalink_url,
            duration: full_duration || 0,
            thumbnail: artwork_url.replace("large", "t500x500"),
            embed_color: 0xF26F23
          };
        };

        // youtube
        case validateYTURL(query): {
          const {videoDetails} = await ytdl.getInfo(query);
          if (!videoDetails) return null;

          const { title, video_url, lengthSeconds, videoId } = videoDetails;

          return {
            title,
            url: video_url,
            duration: ms(lengthSeconds + "s"),
            thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
            embed_color: 0xFF0000
          };
        };

        default: return null;
      };
    } catch (error) {
      console.error(error);
      return null;
    };
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
      loopedQuery.set(guildID, musicData.get(guildID));
    };

    return true;
  };

  // pause the player
  pause(guildID: string) {
    if (!musicConnection.has(guildID)) return false;
    const { audioPlayer } = musicConnection.get(guildID);
    return audioPlayer.pause(true);
  };

  // resume the player
  resume(guildID: string) {
    if (!musicConnection.has(guildID)) return false;
    const { audioPlayer } = musicConnection.get(guildID);
    return audioPlayer.unpause();
  };

  // play some songs
  async play(voiceState: VoiceState, query: string, disableQueuing?: boolean, playerType?: PlayerAvailability) {
    try {
      // transform youtube short to normal video
      const gotYTShort = query.match(youtubeShortRegex);
      if (gotYTShort?.[1]) {
        query = "https://youtu.be/" + gotYTShort[1];
      };

      // url validation
      switch (true) {
        // playlist
        case scdl.isPlaylistURL(query):
        case !!query?.match?.(youtubePlaylistRegex)?.length: {
          const playlist = await this.#pushPlaylistIntoQueue(query);
          if (!playlist?.length) return null;

          // push everything from the playlist to the queue
          playlist.forEach((content) => this.#saveQueue(voiceState.guildID, voiceState.userID, content));

          // soundcloud playlist
          if (scdl.isPlaylistURL(query)) {
            const scPlaylist = await this.#safeSoundCloud(playlist[0]);
            if (!scPlaylist) return null;

            this.#privatePlay(voiceState, scPlaylist);
            return query;
          };
          
          // play first content
          this.#privatePlay(voiceState, this.#safeytdl(playlist[0]));
          return query;
        };

        // youtube
        case !!query?.match?.(youtubeRegex)?.length: {
          if (!disableQueuing) this.#saveQueue(voiceState.guildID, voiceState.userID, query);
          this.#privatePlay(voiceState, this.#safeytdl(query));
          return query;
        };

        // soundcloud
        case !!query?.match?.(soundCloudRegex)?.length: {
          const clientID = process.env?.SOUNDCLOUD_CLIENT_ID;
          if (!clientID) return null;
  
          const trackDownload = await this.#safeSoundCloud(query);
          if (!trackDownload) return null;
  
          if (!disableQueuing) this.#saveQueue(voiceState.guildID, voiceState.userID, query);
  
          this.#privatePlay(voiceState, trackDownload);
          return query;
        };

        // raw URL
        case isURL(query): {
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
            if (header?.match(/video\/(mp4)/gim) || (data.headers?.["content-disposition"] as string | undefined)?.match(/(mp4|mov|webm)^/gim)) {
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
                  this.#privatePlay(voiceState, Readable.from(Buffer.concat(buffers)));
                  resolve(true);
                });
              })
            } else {
              this.#privatePlay(voiceState, Readable.from(Buffer.from(buf)));
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

        default: break;
      };

      // string validation
      switch (playerType) {
        case "sc": {
          const search = await scdl.search({
            query, limit: 1, resourceType: "tracks"
          });

          const current = search?.collection?.[0];
          if (!current?.permalink_url) return null;

          const scURL = current.permalink_url;

          const trackDownload = await this.#safeSoundCloud(query);
          if (!trackDownload) return null;

          if (!disableQueuing) this.#saveQueue(voiceState.guildID, voiceState.userID, scURL);
          this.#privatePlay(voiceState, trackDownload);
          return scURL;
        };

        case "yt":
        default: {
          const search = await ytSearch(query);
          const current = search?.videos?.[0];

          if (
            !current?.url ||
            current.seconds >= Math.round(durationLimit / 1000) ||
            !current.seconds
          ) return null;

          if (!disableQueuing) this.#saveQueue(voiceState.guildID, voiceState.userID, search.videos[0].url);
          this.#privatePlay(voiceState, this.#safeytdl(search.videos[0].url));
          return search.videos[0].url;
        };
      };
    } catch (error) {
      console.error(error);
      return null;
    };
  };

  // skip the music if queued, otherwise stopped the player
  async skip(guildID: string, forced?: boolean) {
    if (typeof forced == "undefined") forced = false;

    try {
      if (!musicConnection.has(guildID)) return false;
      const { audioPlayer, voiceState } = musicConnection.get(guildID);

      // delete audio resource from cache
      currentMusicData.delete(guildID);

      // remove listener to prevent conflicts
      audioPlayer.off(AudioPlayerStatus.Idle, () => this.skip(guildID, forced));

      const queue = musicData.get(guildID);
      //const lastChance = queue?.[0];

      // single loop
      if (loopMusic.has(guildID) && loopMusic.get(guildID) === "single" && queue?.length) {
        if (!forced) {
          const play = await this.play(voiceState, queue[0].url, true);
          if (!play) return this.skip(guildID, true);
          return;
        };
      };

      // loop whole queue
      // if (loopMusic.has(guildID) && loopedQuery.has(guildID) && loopMusic.get(guildID) === "whole" && !forced) {
      //   let loopedQueue = loopedQuery.get(guildID);

      //   loopedQueue.shift();
      //   if (!loopedQueue?.length) {
      //     if (queue?.length) {
      //       loopedQuery.set(guildID, queue);
      //     } else if (lastChance) {
      //       loopedQuery.set(guildID, [lastChance]);
      //     };

      //     loopedQueue = loopedQuery.get(guildID);
      //   };

      //   const play = await this.play(voiceState, loopedQueue[0].url, true);
      //   if (!play) return this.skip(guildID, true);
      
      //   return;
      // };

      queue?.shift();

      // disconnect if no queue left
      if (!queue?.length) {
        return this.stop(guildID);
      };

      const play = await this.play(voiceState, queue[0].url, true);
      if (play === null) {
        // draft (might look at it, this might be an infinite loop)
        return this.skip(guildID, forced);
      };

      return true;
    } catch (error) {
      console.error(error);
      return false;
    };
  };

  async #safeSoundCloud(url: string): Promise<Readable | null> {
    try {
      // @ts-expect-error
      const trackDownload = await scdl.downloadFormat(url, "audio/mpeg");
      return trackDownload || null;
    } catch (error) {
      console.error(error);
      return null;
    };
  };

  async #pushPlaylistIntoQueue(url: string) {
    try {
      switch (true) {
        // youtube playlist
        case !!url?.match?.(youtubePlaylistRegex)?.length: {
          const ytPlaylistID = new URL(url).searchParams?.get("list");
          if (!ytPlaylistID) return null;
  
          const list = await ytSearch({listId: ytPlaylistID});
          if (!list?.videos?.length) return null;
  
          return list.videos.map(val => "https://youtu.be/" + val.videoId);
        };

        // soundcloud playlist
        case scdl.isPlaylistURL(url): {
          const scPlaylist = await scdl.getSetInfo(url);
          if (!scPlaylist?.tracks?.length) return null;

          return scPlaylist.tracks
          .map(val => val.permalink_url)
          .filter(<T>(argument: T | undefined): argument is T => {
            return argument !== undefined;
          });
        };

        default: return null;
      };
    } catch (error) {
      console.error(error);
      return null;
    };
  };

  #safeytdl(query: string) {
    // i set higher so it can play audio smoothly, you can make it higher if you have a huge memory usage
    const highWaterMark = 1 << 26;

    const downloadOptions: ytdlDO = {
      filter: "audioonly",
      quality: "lowestaudio",
      highWaterMark
    };

    return ytdl(query, downloadOptions);
  };

  // private function
  #privatePlay(voiceState: VoiceState, query: Readable | string) {
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

      voiceConnection.on("error", (error) => console.error(error));

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
      this.skip(guildID, true);
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