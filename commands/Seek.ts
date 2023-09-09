import { Client, CommandInteraction, ApplicationCommandOptionsWithValue, Constants, AnyTextableGuildChannel, VoiceChannel } from "oceanic.js";
import Music from "../manager/Music";

export const info: CommandInfo = {
  description: "Seek audio to a specific timeframe. (YouTube only)"
};

export const args: ApplicationCommandOptionsWithValue[] = [
  {
    name: "time",
    type: Constants.ApplicationCommandOptionTypes.STRING,
    description: "A time. (e.g. 00:25, 1 minute 17 seconds)",
    required: true,
    maxLength: 100
  }
];

export const run = async (client: Client, interaction: CommandInteraction<AnyTextableGuildChannel>) => {
  try {
    if (!interaction.member || !interaction.guildID) {
      return interaction.createFollowup({content: "Lack of data. Try again later."});
    };

    let time = interaction.data.options.getString("time", true);

    let userVoiceState = interaction.member.voiceState;
    if (!userVoiceState?.channelID) return interaction.createFollowup({content: "You must be connected to a voice channel."});

    let botVoiceState = client?.getChannel<VoiceChannel>(userVoiceState.channelID) || await client.rest.channels.get<VoiceChannel>(userVoiceState.channelID).catch(() => {});
    if (!botVoiceState) {
      return interaction.createFollowup({content: "Unknown voice channel."});
    };

    if (botVoiceState.voiceMembers.get(client.user.id) && botVoiceState.voiceMembers?.get(client.user.id)?.voiceState?.channelID !== userVoiceState.channelID) {
      return interaction.createFollowup({content: `You must be on ${botVoiceState.mention} to use this feature.`});
    };

    const seekResult = await Music.seek(interaction.guildID, time);
    if (!seekResult) {
      return interaction.createFollowup({
        content: "Unable to seek the song."
      });
    };

    return interaction.createFollowup({content: "Successfully changed the current audio timeframe."});
  } catch (error) {
    console.log(error);
    return interaction.createFollowup({content: "An error occurred."});
  };
};

export default { info, run, args };