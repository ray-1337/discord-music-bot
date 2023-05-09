# Bypass Age-restriction (YouTube Platform)
This is optional, but if you want to access further content such as restricted content, you need to use your own YouTube cookies.

And, of course, you have to sign in to Google first.

- Open a new tab.
- __Open inspect element first__ by doing **CTRL + SHIFT + I**, or **F12**
- Visit https://youtube.com <br/>
> ![image](https://github.com/ray-1337/discord-music-bot/assets/33544674/7179e1d4-6ea4-4d26-9b91-8930707a0e09)
- Wait until it fully loaded.
- Open your inspect element again.
- Find **network** tab. <br/>
> ![image](https://github.com/ray-1337/discord-music-bot/assets/33544674/3402d1e0-4672-41e9-a391-0053350aa49f)
- Find `youtube.com`, you can sort **Waterfall** from up <br/>
> ![image](https://github.com/ray-1337/discord-music-bot/assets/33544674/e0266181-03e2-4333-8a57-872d0a9a8cf0)
- Click `youtube.com`
- Scroll down and find **Request Headers**
- Inside the **Request Headers**, copy the `cookie` value. <br/>
> ![image](https://github.com/ray-1337/discord-music-bot/assets/33544674/2dc76e84-2548-41b3-a4f5-d26a40db1d78)
- Paste the `cookie` value to `YOUTUBE_COOKIE=` on your **.env** file.
> ![image](https://github.com/ray-1337/discord-music-bot/assets/33544674/c4b10bcd-66ec-497e-a26c-f7b2bf3d95fa)
- Restart the app.
