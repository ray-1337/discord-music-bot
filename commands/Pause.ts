import { Client, CommandInteraction, AnyGuildTextChannel } from "oceanic.js";
import Music from "../state/Music";

export const config: CommandConfig = {
  cooldown: 5
};

export const info: CommandInfo = {
  description: "Pause the music player."
};

export const run = async (client:  Client, interaction: CommandInteraction<AnyGuildTextChannel>) => {
  try {
    if (!interaction.member || !interaction.guildID || !interaction.data.options) {
      return interaction.createFollowup({content: "Lack of data. Try again later."});
    };

    let userVoiceState = interaction.member.voiceState;
    let botVoiceState = interaction.member.guild.members.get(client.user.id);

    if (!userVoiceState?.channelID) return interaction.createFollowup({content: "You must be connected to a voice channel."});
    if (!botVoiceState?.voiceState) return interaction.createFollowup({content: "Bot voice state cannot be found."});
    if (botVoiceState.voiceState.channelID && botVoiceState.voiceState.channelID !== userVoiceState.channelID) {
      return interaction.createFollowup({content: `You must be on <#${botVoiceState.voiceState.channelID}> to use this feature.`});
    };

    const player = Music.state(interaction.guildID);
    if (!player?.currentQueue) return interaction.createFollowup({content: "No players available."});

    Music.pause(interaction.guildID);

    return interaction.createFollowup({content: "The player has been paused."});
  } catch (error) {
    console.log(error);
    return interaction.createFollowup({content: "An error occurred."});
  };
};

export default { config, info, run };