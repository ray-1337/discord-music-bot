import { Client, Constants, CreateChatInputApplicationCommandOptions, CreateApplicationCommandOptions } from "oceanic.js";
import path from "node:path";
import { readdir, lstat } from "node:fs/promises";
import { pascalToCamel, truncateString } from "./Utility";

export const commandCache: GuardedMap<string, CommandSmallDetails> = new Map();

const fileSpecificRegex = /\.(t|j)s+$/gi;

export default async function (client: Client) {
  try {
    if (commandCache.size >= 1) return;
    
    // for analytics
    const firstTime = performance.now();
    const finaleCommand: (CreateChatInputApplicationCommandOptions & CreateApplicationCommandOptions)[] = [];
    const cmdPath = path.join(__dirname, "..", "commands");
    const cmdFolder = await readdir(cmdPath);

    // im not interested in sub command in this, so ..
    // but seriously you can modify this by yourself
    for await (const category of cmdFolder) {
      let commandPath = path.join(cmdPath, category);
      let firstCommandType = await lstat(commandPath);

      if (firstCommandType.isFile() && category.match(fileSpecificRegex)) {
        const command = require(commandPath) as CommandInterface;

        // ignore nothing
        if (!command?.info && !command?.run && !command?.args) {
          continue;
        };

        const cmdName = pascalToCamel((command.info?.name || category).toLowerCase().replace(fileSpecificRegex, ""));

        const cmdDescription = command.info?.description || "Unknown.";
        const truncatedDesc = cmdDescription.length > 100 ? truncateString(cmdDescription, 97) : cmdDescription;
        const optionsMap = command.args?.map(x => {
          return {
            ...x,
            name: x.name.toLowerCase(),
            description: x?.description.length > 100 ? truncateString(x?.description, 97) : x?.description
          };
        });

        finaleCommand.push({
          name: cmdName,
          description: truncatedDesc,
          type: Constants.ApplicationCommandTypes.CHAT_INPUT,
          options: optionsMap || []
        });

        commandCache.set(cmdName, {
          path: commandPath,
          raw: cmdName
        });

        continue;
      };
    };

    if (client.guilds.size) {
      // if your bot is big, replace this line below with .bulkEditGlobalCommands instead
      for await (const guild of client.guilds.toArray()) {
        await client.rest.applicationCommands.bulkEditGuildCommands(client.user.id, guild.id, finaleCommand);
      };

      return console.log(`Generated slash commands for ${client.guilds.size} guilds for ${Math.round(performance.now() - firstTime).toLocaleString()} ms.`);
    };
  } catch (error) {
    console.error(error);
    return process.exit(1);
  };
};