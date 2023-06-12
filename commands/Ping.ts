import { AnyTextableGuildChannel, Client, CommandInteraction, ApplicationCommandOptionsWithValue } from "oceanic.js";

export const config: CommandConfig = {
  cooldown: 5
};

// Information about command, will be displayed in a slash command.
export const info: CommandInfo = {
  description: "Check if the bot is working."
};

// Args for stuff.
export const args: ApplicationCommandOptionsWithValue[] = [];

// things to run
export const run = async (_: Client, interaction: CommandInteraction<AnyTextableGuildChannel>) => {
  return interaction.createFollowup({content: "Pong!"});
};

export default {config, info, run, args};