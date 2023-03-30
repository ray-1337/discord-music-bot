import "dotenv/config";
import { Client, Constants } from "oceanic.js";
import DiscordEvents from "./state/DiscordEvents";

const Bot = new Client({
  auth: `Bot ${process.env.DISCORD_TOKEN}`,
  gateway: {
    compress: false,
    intents: Constants.Intents.GUILD_VOICE_STATES | Constants.Intents.GUILDS
  },
  collectionLimits: {
    messages: 5 // message is not really necessary here
  }
});

// add discord events listener early
DiscordEvents(Bot);

// connect the bot
Bot.connect();

// handle errors
process
.on('unhandledRejection', error => console.error('unhandledRejection \n', error))
.on('uncaughtException', error => console.log('uncaughtException \n', error));