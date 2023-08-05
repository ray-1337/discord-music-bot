import { Client, Uncached, VoiceChannel, StageChannel, Member } from "oceanic.js";
import Music from "../manager/Music";

export default async (client: Client, _: Member, unprocessedChannel: Uncached | VoiceChannel | StageChannel) => {
  try {
    if (unprocessedChannel?.id) {
      const channel = client?.getChannel<VoiceChannel | StageChannel>(unprocessedChannel.id) || await client.rest.channels.get<VoiceChannel | StageChannel>(unprocessedChannel.id);
      if (!channel) return;
  
      if (channel.voiceMembers.filter(val => !val.bot).length <= 0) {
        return Music.stop(channel.guildID);
      };
    };
  } catch (error) {
    return console.error(error);
  };
};