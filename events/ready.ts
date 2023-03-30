import { Client } from "oceanic.js";
import SlashCommand from "../state/SlashCommand";

export default async (client: Client) => {
  try {
    console.log(`The bot [${client.user.username}#${client.user.discriminator}] is ready.`);

    await SlashCommand(client);
    return;
  } catch (error) {
    console.error(error);
  };
};