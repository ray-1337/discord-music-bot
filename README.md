# Discord Bot Music
This is my latest own project around creating Discord bot music from scratch.

# Disclaimer
This repository is a bit unstable, such as loop command, etc. But, the rest of it is fine. I will gradually fix, or add more features in it.

# Motivation
I have a few friends, hanging out but they couldn't find a single functional Discord music bot from YouTube.<br/>
We've tried Uzox, Hydra, MEE6, Jockie Bot, and similar. But, none of them are working.<br/>
I was disappointed and said, you know what, F- it.<br/>
So, I've tried to create my own from scratch, while keeping it simple and easier to use.

# Library
I use:
- [oceanic](https://npmjs.com/oceanic.js) for the Discord library.
- [ytdl-core](https://npmjs.com/ytdl-core) and [yt-search](https://npmjs.com/yt-search) for retrieving YouTube contents.
- [@discordjs/voice](https://npmjs.com/@discordjs/voice) for Discord voice state management.
- [ffmpeg](https://ffmpeg.org) for video/audio management.
- [libmp3lame](https://trac.ffmpeg.org/wiki/Encode/MP3) to encode video to mp3, helped with `ffmpeg`.
- [soundcloud-downloader](https://www.npmjs.com/soundcloud-downloader) for retrieving SoundCloud contents.

# Installation
- Fork the repo.
- `npm install` first.
  - `pnpm` and `yarn` works too, I mainly use `pnpm`.
  - This repo uses `ffmpeg`, so please install them first.
    - Search Google on how to install `ffmpeg` on Ubuntu, Windows, or any.
- Rename `.env.example` to `.env`, edit the configuration first, such as Discord bot token, etc.
  - You can edit the `Config.ts` file as well.
- Run `npm run dev` for testing, and `npm run prod` for production.

## What's so good about it?
I extended this project with more features, such as:
- Supports YouTube, that's obvious.
- Supports search mode using Discord dropdown component, by using `/play search-mode: true`
- Supports playing contents from the playlist.
- Supports SoundCloud.
- Supports TikTok.
- Supports playing with .mp3 file.
- Supports playing with .mp4 file.
- Supports [age-restriction bypass](guide/bypass.md) (YouTube platform only)
- Supports application/octet-stream.
  - For example, converting [video from TikTok to audio](https://ssstik.io/download-tiktok-mp3), and then copy the URL.
    - Tested URL from [ssstik.io](https://ssstik.io/download-tiktok-mp3), [savefrom.net](https://en.savefrom.net/), [fdown.net](https://fdown.net)
- Auto-disconnect when no one's in voice channel.
- Auto-retry if error occurred, especially [403 error from ytdl-core](https://github.com/fent/node-ytdl-core/issues/417).

## Known unresolved bugs
Yes, there is bugs in this repository, but that wasn't caused by me, I swear. <br/>
And, these bugs can be temporarily fixed by restarting the instance.
- Sometimes, pause command doesn't pause the music.
- TikTok remains unplayable after few plays.
- Sometimes, `ytdl` doesn't play anything at all.

## Can I use this too?
Yeah, sure. I don't mind. You can recreate your own command handler, do your things here.

I'm just hoping that you puts me on credit when you're using this commercial or vice-versa. ;<

# Useful Links
- [Contributing](.github/CONTRIBUTING.md)
- [Vulnerable Report](.github/SECURITY.md)