import { Client, CommandInteraction, ApplicationCommandOptionsWithValue, Constants, AnyTextableGuildChannel, VoiceChannel } from "oceanic.js";
import Music, { PlayerAvailability, appropriateContentType, ContentErrorEnum } from "../state/Music";
import { awaitComponentInteraction } from "oceanic-collectors";
import ms from "ms";

export const config: CommandConfig = {
  cooldown: 5
};

export const info: CommandInfo = {
  description: "Play a song from YouTube, or a file."
};

export const args: ApplicationCommandOptionsWithValue[] = [
  {
    name: "query",
    type: Constants.ApplicationCommandOptionTypes.STRING,
    description: "A song query, YouTube/TikTok/SoundCloud url, or a URL of file.",
    required: false
  },
  {
    name: "file",
    type: Constants.ApplicationCommandOptionTypes.ATTACHMENT,
    description: "Play song with file instead. Currently supports .mp3 and .mp4",
    required: false
  },
  {
    name: "provider",
    type: Constants.ApplicationCommandOptionTypes.STRING,
    description: "Choose the audio provider.",
    required: false,
    choices: [
      { name: "YouTube", value: "yt" },
      { name: "SoundCloud", value: "sc" }
    ]
  },
  {
    name: "search-mode",
    type: Constants.ApplicationCommandOptionTypes.BOOLEAN,
    description: "Enabling this will let you choose the tracks before playing it.",
    required: false
  },
];

export const run = async (client: Client, interaction: CommandInteraction<AnyTextableGuildChannel>) => {
  try {
    if (!interaction.member || !interaction.guildID) {
      return interaction.createFollowup({content: "Lack of data. Try again later."});
    };

    let query = interaction.data.options.getString("query");
    let file = interaction.data.options.getAttachment("file");
    let provider = interaction.data.options.getString<PlayerAvailability>("provider");
    let searchMode = interaction.data.options.getBoolean("search-mode", false);

    if (!query && !file) {
      return interaction.createFollowup({content: "Unknown audio query. Choose at least `query` or `file` option."});
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
      if (!file.contentType?.match(appropriateContentType)) {
        return interaction.createFollowup({content: "The file type must be at least .mp3/.ogg/.webm"});
      };
    };

    // search mode
    if (searchMode) {
      if (!query) {
        return interaction.createFollowup({content: "Search mode only works with `query` option only."});
      };
      
      const queries = await Music.search(query, provider);
      if (!queries?.length) {
        return interaction.createFollowup({content: "Nothing comes up from the search."});
      };

      const choosingQueryCustomID = "choosetrack_" + Date.now();
      const choosingQuery = await interaction.createFollowup({
        content: "Choose one of these tracks to play.",
        components: [{
          type: Constants.ComponentTypes.ACTION_ROW,
          components: [{
            type: Constants.ComponentTypes.STRING_SELECT,
            customID: choosingQueryCustomID,
            minValues: 1, maxValues: 1,
            placeholder: "Choose the track",
            options: queries.map(({title, url, artist}) => {
              return {
                label: title,
                description: artist,
                value: url
              };
            })
          }]
        }]
      });

      const componentResponse = await awaitComponentInteraction(client, { max: 1, time: ms("1m"), filter: (val => val.member?.id === interaction.member.id) })
      if (
        !componentResponse?.data ||
        componentResponse?.data.componentType !== Constants.ComponentTypes.STRING_SELECT ||
        componentResponse?.data?.customID !== choosingQueryCustomID
      ) {
        return interaction.editFollowup(choosingQuery.id, { content: "Invalid followup components.", components: [] });
      };

      const finalChoose = componentResponse.data.values.getStrings();
      if (!finalChoose?.[0]) {
        return interaction.editFollowup(choosingQuery.id, { content: "Failed to retrieve chosen content.", components: [] });
      };

      // track check before enter
      const contentCheck = await Music.trackCheck(finalChoose[0]);
      if (contentCheck !== ContentErrorEnum.GOOD) return interaction.editFollowup(choosingQuery.id, { content: Music.explainContentError(contentCheck), components: [] });

      const player = await Music.play(userVoiceState, finalChoose[0], undefined, provider);
      if (!player) return interaction.editFollowup(choosingQuery.id, {
        components: [],
        content: "Unable to play song due to lacking of information, copyright, deleted content, the duration is too long, and many more."
      });

      return interaction.editFollowup(choosingQuery.id, { content: `Successfully added **${player}** to queue.`, components: [] });
    };

    const finalContent = String(file?.proxyURL || query);
    const contentCheck = await Music.trackCheck(finalContent);
    if (contentCheck !== ContentErrorEnum.GOOD) {
      return interaction.createFollowup({content: Music.explainContentError(contentCheck)});
    };

    const player = await Music.play(userVoiceState, finalContent, undefined, provider);
    if (!player) return interaction.createFollowup({content: "Unable to play song due to lacking of information, copyright, deleted content, the duration is too long, and many more."});

    return interaction.createFollowup({content: `Successfully added **${player}** to queue.`});
  } catch (error) {
    console.log(error);
    return interaction.createFollowup({content: "An error occurred."});
  };
};

export default { config, info, run, args };