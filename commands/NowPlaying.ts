import { Client, CommandInteraction, AnyGuildTextChannel } from "oceanic.js";
import Music from "../state/Music";
import { EmbedBuilder } from "@oceanicjs/builders";
import { millisToMinutesAndSeconds } from "../state/Utility";

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

    const current = await Music.trackInfo(player.currentQueue.url);
    if (!current) return interaction.createFollowup({content: `<@${player.currentQueue.requesterID}> — ${player.currentQueue.url} ${loopIcon()}`});

    const embed = new EmbedBuilder()
    .setColor(current.embed_color)
    .setTitle(current.title)
    .setURL(current.url)
    .setImage(current.thumbnail)
    .addField("Track Duration", millisToMinutesAndSeconds(current.duration), true)
    .addField("Requested", `<@${player.currentQueue.requesterID}>`);

    if (current?.authorName?.length) {
      embed.setAuthor(current.authorName, current.authorAvatar, current.authorURL);
    };

    const queue = Music.queue(interaction.guildID);
    if (queue?.length > 1) {
      const nextSongDetail = await Music.trackInfo(queue[1].url)
      if (nextSongDetail?.title) {
        embed.addField("Next Track", nextSongDetail.title);
      };
    };

    return interaction.createFollowup({embeds: embed.toJSON(true)});
  } catch (error) {
    console.log(error);
    return interaction.createFollowup({content: "An error occurred."});
  };
};

export default { config, info, run };