# Discord Bot Music
This is my latest own project around Discord bot music.

# Library
I use:
- [oceanic](https://npmjs.com/oceanic.js) for the Discord library.
- [ytdl-core](https://npmjs.com/ytdl-core) and [yt-search](https://npmjs.com/yt-search) for retrieving YouTube contents.
- [@discordjs/voice](https://npmjs.com/@discordjs/voice) for Discord voice state management.

# Installation
- Fork the repo.
- `npm install` first.
  - `pnpm` and `yarn` works too, I mainly use `pnpm`.
  - This repo uses `ffmpeg`, so please install them first.
    - Search Google on how to install `ffmpeg` on Ubuntu, Windows, or any.
- Rename `.env.example` to `.env`, edit the configuration first, such as Discord bot token, etc.
  - You can edit the `Config.ts` file as well.
- Run `npm dev` for testing, and `npm prod` for production.

## Why bother?
The first thing is I couldn't find any functional YouTube search-based music bot.

So, that's the most obvious reason why should I made my own.

## What's so good about it?
I extended this project with more features, such as:
- Supports YouTube, that's obvious.
- Supports playing with .mp3 file.
- Supports application/octet-stream.
  - For example, converting [video from TikTok to audio](https://ssstik.io/download-tiktok-mp3), and then copy the URL.
- Auto-disconnect when no one's in voice channel.

## Can I use this too?
Yeah, sure. I don't mind. You can recreate your own command handler, do your things here.

I'm just hoping that you puts me on credit when you're using this commercial or vice-versa. ;<