import { Client, CommandInteraction, Constants } from "oceanic.js";
import { EmbedBuilder as RichEmbed } from "@oceanicjs/builders";
import { awaitComponentInteraction } from "oceanic-collectors";
import Music from "../state/Music";
import ms from "ms";
import { chunk } from "../state/Utility";

export const config: CommandConfig = {
  cooldown: 7.5
};

export const info: CommandInfo = {
  description: "Display the audio queue of the current."
};

export const run = async (client: Client, interaction: CommandInteraction) => {
  try {
    if (!interaction.member || !interaction.guildID) {
      return interaction.createFollowup({content: "Lack of data. Try again later."});
    };

    const player = Music.state(interaction.guildID);
    if (!player?.currentQueue) return interaction.createFollowup({content: "No players available."});
    
    const queue = Music.queue(interaction.guildID);
    if (!queue?.length) return interaction.createFollowup({content: "No player content is playing right now."});
  
    let index = 0, limit = 10;
    let pages = chunk(queue.map((song, i) => `\`${i + 1}\`. ${song.url} ${player?.currentQueue?.url === song.url ? "▶️" : ""}`), limit);
  
    const embed = new RichEmbed()
    .setColor(0x7289DA)
    .setAuthor("Track Queue", interaction.member?.guild.iconURL("png", 32) || undefined, undefined)
    .setDescription(pages[index].join("\n"))
    .setFooter(`Page ${index+1} of ${pages.length} page(s)`);

    const pageBack = "paginatingBack";
    const pageForward = "paginatingForward";
    
    const message = await interaction.createFollowup({
      embeds: embed.toJSON(true),
      components: [{
        type: Constants.ComponentTypes.ACTION_ROW,
        components: [
          {
            type: Constants.ComponentTypes.BUTTON,
            style: Constants.ButtonStyles.PRIMARY,
            customID: pageBack,
            label: "Back",
            emoji: { name: "⬅", id: null },
            disabled: queue.length < limit
          },
          {
            type: Constants.ComponentTypes.BUTTON,
            style: Constants.ButtonStyles.PRIMARY,
            customID: pageForward,
            label: "Next",
            emoji: { name: "➡", id: null },
            disabled: queue.length < limit
          }
        ]
      }]
    });

    async function awaitPaginate() {
      const response = await awaitComponentInteraction(client, { max: 1, time: ms("5m") });
      if (!response) return;

      if (response.member?.id !== interaction.member?.id) {
        response.createFollowup({content: "Invalid original user.", flags: 64});
        return awaitPaginate();
      };

      if (response.data.componentType === Constants.ComponentTypes.BUTTON) {
        if (response.data.customID === pageBack) {
          index--;
        } else if (response.data.customID === pageForward) {
          index++;
        } else {
          response.createFollowup({content: "Invalid value.", flags: 64});
          return awaitPaginate();
        };
      } else {
        response.createFollowup({content: "Invalid components.", flags: 64});
        return awaitPaginate();
      };
  
      index = ((index % pages.length) + pages.length) % pages.length;

      embed.setDescription(pages[index].join('\n'));
      embed.setFooter(`Page ${index+1} of ${pages.length} page(s)`);

      await interaction.editFollowup(message.id, { embeds: embed.toJSON(true) });

      await response.deferUpdate();

      return awaitPaginate();
    };

    return awaitPaginate();
  } catch (error) {
    console.log(error);
    return interaction.createFollowup({content: "An error occurred."});
  };
};

export default { config, info, run };