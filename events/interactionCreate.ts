import { Client, AnyInteractionGateway, CommandInteraction } from "oceanic.js";
import CommandHandler from "../manager/CommandHandler";

export default async (client: Client, interaction: AnyInteractionGateway) => {
  try {
    if (interaction instanceof CommandInteraction) {
      return await CommandHandler(client, interaction);
    };
  } catch (error) {
    return console.error(error);
  };
};