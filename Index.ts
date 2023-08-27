import "dotenv/config";
import { Client, Constants } from "oceanic.js";
import DiscordEvents from "./manager/DiscordEvents";

const Bot = new Client({
  auth: `Bot ${process.env.DISCORD_TOKEN}`,
  gateway: {
    compress: false,
    intents: Constants.Intents.GUILD_VOICE_STATES | Constants.Intents.GUILDS
  },
  collectionLimits: {
    auditLogEntries: 0,
    autoModerationRules: 0,
    stickers: 0,
    stageInstances: 0,
    invites: 0,
    emojis: 0,
    groupChannels: 0,
    guildThreads: 0,
    integrations: 0,
    privateChannels: 0,
    scheduledEvents: 0,
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