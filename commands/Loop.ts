import { Client, CommandInteraction, ApplicationCommandOptionsWithValue, Constants, AnyGuildTextChannel, VoiceChannel } from "oceanic.js";
import Music, {loopState} from "../state/Music";

export const config: CommandConfig = {
  cooldown: 5
};

export const info: CommandInfo = {
  description: "Loop the current query, or whole queue."
};

export const args: ApplicationCommandOptionsWithValue[] = [
  {
    name: "type",
    type: Constants.ApplicationCommandOptionTypes.STRING,
    description: "Type of loop.",
    required: true,
    choices: [
      { name: "Whole Queue", value: "whole" },
      { name: "Current Track", value: "single" },
      { name: "Default", value: "off" }
    ]
  }
];

export const run = async (client: Client, interaction: CommandInteraction<AnyGuildTextChannel>) => {
  try {
    if (!interaction.member || !interaction.guildID) {
      return interaction.createFollowup({content: "Lack of data. Try again later."});
    };

    let content = interaction?.data?.options;
    if (!content) return interaction.createFollowup({content: "Unknown command interaction. Try again later."});

    let type: loopState | "off" = content.getString("type", true);

    let userVoiceState = interaction.member.voiceState;
    if (!userVoiceState?.channelID) return interaction.createFollowup({content: "You must be connected to a voice channel. "});

    let botVoiceState = client?.getChannel<VoiceChannel>(userVoiceState.channelID) || await client.rest.channels.get<VoiceChannel>(userVoiceState.channelID).catch(() => {});
    if (!botVoiceState) {
      return interaction.createFollowup({content: "Unknown voice channel."});
    };

    if (botVoiceState.voiceMembers.get(client.user.id) && botVoiceState.voiceMembers?.get(client.user.id)?.voiceState?.channelID !== userVoiceState.channelID) {
      return interaction.createFollowup({content: `You must be on <#${botVoiceState.id}> to use this feature.`});
    };

    if (!botVoiceState.permissionsOf(client.user.id).has("VIEW_CHANNEL")) {
      return interaction.createFollowup({content: "The bot doesn't have permission to **view** the voice channel."});
    };

    if (!botVoiceState.permissionsOf(client.user.id).has("CONNECT")) {
      return interaction.createFollowup({content: "The bot doesn't have permission to **connect** the voice channel."});
    };

    if (!botVoiceState.permissionsOf(client.user.id).has("SPEAK")) {
      return interaction.createFollowup({content: "The bot doesn't have permission to **speak** in the voice channel."});
    };

    const player = Music.state(interaction.guildID);
    if (!player?.currentQueue) return interaction.createFollowup({content: "No players available."});

    Music.loop(interaction.guildID, type);  

    let message!: string;

    switch (type) {
      case "single": {
        message = "The current queue will be repeated."
        break;
      };

      case "whole": {
        message = "The whole queue will be repeated.";
        break;
      };

      case "off": {
        message = "The repeat is disabled.";
        break;
      };
    };

    return interaction.createFollowup({content: message});
  } catch (error) {
    console.log(error);
    return interaction.createFollowup({content: "An error occurred."});
  };
};

export default { config, info, run, args };