import { Client, CommandInteraction } from "oceanic.js";
import { commandCache } from "./SlashCommand";

export default async (client: Client, interaction: CommandInteraction) => {
  try {
    // i like ephemeral messages
    await interaction.defer(64);

    if (!interaction.member || !interaction.guildID) {
      return interaction.createFollowup({ content: "Invalid user/guild data during interaction. Please try again later."});
    };

    let cmd = commandCache.get(interaction.data.name);
    if (!cmd) return interaction.createFollowup({ content: "No command available." });
  
    let command: CommandInterface;
    
    try {
      command = require(cmd.path);
    } catch (error) {
      console.error(error);
      return interaction.createFollowup({ content: "The command is non-existent." });
    };
  
    try {
      await command.run(client, interaction);
    } catch (error) {
      console.error(error);
      return interaction.createFollowup({ content: "Unable to execute this command." });
    };
  
    return;
  } catch (error) {
    console.error(error);

    return interaction.createMessage({ content: "Interaction (internal) error." })
    .catch((error) => console.error(error));
  };
};