import { Client, CommandInteraction } from "oceanic.js";
import prettyMS from "pretty-ms";
import { commandCache } from "./SlashCommand";
import { ownerIDs } from "../Config";

const cooldownMap: GuardedMap<string, {time: number, cmd: string}> = new Map();

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

    // Cooldown
    const defaultCooldownTime = 5; // 5 means 5 seconds
    if (command.config.cooldown) {
      const cooldownTime = Date.now();
      const cooldownAmount = Math.floor((command.config.cooldown || defaultCooldownTime) * 1000);
      const currentCooldown = cooldownMap.has(interaction.member.id);
      const cooldown = cooldownMap.get(interaction.member.id);
  
      // set cooldown and exclude whitelisted owner
      if ((!currentCooldown && cooldown?.cmd !== command.info.name) && !ownerIDs.includes(interaction.member.id)) {
        cooldownMap.set(interaction.member.id, {
          time: cooldownTime,
          cmd: command.info.name || interaction.data.name
        });
        
        setTimeout(() => cooldownMap.delete(interaction.member!.id), cooldownAmount);
      } else {
        const expirationTime: number = Math.floor(cooldown?.time || 0 + cooldownAmount);
  
        if (cooldownTime < expirationTime) {
          let current = (expirationTime - cooldownTime);
  
          return interaction.createFollowup({
            content: `You're currently in a cooldown mode, please wait ${prettyMS(current, {verbose: !0})}`
          });
        };
      };
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