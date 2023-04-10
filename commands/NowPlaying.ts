import { Client, CommandInteraction, AnyGuildTextChannel } from "oceanic.js";
import Music from "../state/Music";

export const config: CommandConfig = {
  cooldown: 5
};

export const info: CommandInfo = {
  description: "Display the current playing song."
};

export const run = async (client:  Client, interaction: CommandInteraction<AnyGuildTextChannel>) => {
  try {
    if (!interaction.member || !interaction.guildID || !interaction.data.options) {
      return interaction.createFollowup({content: "Lack of data. Try again later."});
    };

    let botVoiceState = interaction.member.guild.members.get(client.user.id);
    if (!botVoiceState?.voiceState) return interaction.createFollowup({content: "Bot voice state cannot be found."});

    const player = Music.state(interaction.guildID);
    if (!player?.currentQueue) return interaction.createFollowup({content: "No players available."});

    let loopIcon = () => {
      switch (player.loop) {
        case "single": return "🔂";
        case "whole": return "🔁";
        default: return "";
      };
    };

    return interaction.createFollowup({content: `<@${player.currentQueue.requesterID}> — ${player.currentQueue.url} ${loopIcon()}`});
  } catch (error) {
    console.log(error);
    return interaction.createFollowup({content: "An error occurred."});
  };
};

export default { config, info, run };