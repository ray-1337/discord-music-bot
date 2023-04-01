import { Client, CommandInteraction, ApplicationCommandOptionsWithValue, Constants, AnyGuildTextChannel, VoiceChannel } from "oceanic.js";
import Music from "../state/Music";
// import validator from "validator";
// const { isURL } = validator;

export const config: CommandConfig = {
  cooldown: 5
};

export const info: CommandInfo = {
  description: "Play a song from YouTube."
};

export const args: ApplicationCommandOptionsWithValue[] = [
  {
    name: "title",
    type: Constants.ApplicationCommandOptionTypes.STRING,
    description: "A song title, or YouTube url.",
    required: false
  },
  {
    name: "file",
    type: Constants.ApplicationCommandOptionTypes.ATTACHMENT,
    description: "Play song with file instead. Currently supports .mp3 only.",
    required: false
  }
];

export const run = async (client: Client, interaction: CommandInteraction<AnyGuildTextChannel>) => {
  try {
    if (!interaction.member || !interaction.guildID) {
      return interaction.createFollowup({content: "Lack of data. Try again later."});
    };

    let content = interaction?.data?.options;
    if (!content) return interaction.createFollowup({content: "Unknown command interaction. Try again later."});

    let title = content.getString("title")
    let file = content.getAttachment("file");

    if (!title && !file) {
      return interaction.createFollowup({content: "Unknown audio query. Choose at least title or file option."});
    };

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
  
    // play with file
    if (file) {
      let allowedContentType = new RegExp(/(audio\/(mp3|ogg|webm|mpeg))/gi);
      if (!file.contentType?.match(allowedContentType)) {
        return interaction.createFollowup({content: "The file type must be at least .mp3/.ogg/.webm"});
      };
    };

    // const checkPlayer = Music.state(interaction.guildID);
    
    // let isOpponentVideo = file?.contentType ? /(video\/(mp4))/gim.test(file.contentType) : (title && isURL(title) ? title.endsWith("mp4") : false);
    const player = await Music.play(userVoiceState, String(file?.proxyURL || title), /*undefined, isOpponentVideo*/);
    if (!player) return interaction.createFollowup({content: "Unable to play song due to lacking of information, copyright, deleted content, the duration is too long, and many more."});

    return interaction.createFollowup({content: `Successfully added **${player}** to queue.`});
  } catch (error) {
    console.log(error);
    return interaction.createFollowup({content: "An error occurred."});
  };
};

export default { config, info, run, args };