const {
    rudhra,
    getJson,
    isUrl,
    mode
} = require("../lib/");
const fetch = require('node-fetch');
const yts = require("yt-search");

// Helper functions to detect URLs
const isIgUrl = (text) => /(https?:\/\/(?:www\.)?instagram\.com\/p\/[\w-]+\/?)/.test(text);
const isFbUrl = (text) => /(https?:\/\/(?:www\.)?(?:facebook\.com|fb\.com|fb\.watch)\/[^\s]+)/.test(text);
const isYtUrl = (text) => /(https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)[\w-]+)/.test(text);

// rudhra to handle auto media downloads
rudhra({
    on: "text",
    fromMe: mode,
    desc: "Auto download media from any URL",
    type: "auto",
}, async (message, match) => {
    const text = match;

    if (isIgUrl(text)) {
        await downloadInstaMedia(message, text);
    } else if (isFbUrl(text)) {
        await downloadFacebookMedia(message, text);
    } else if (isYtUrl(text)) {
        await downloadYoutubeMedia(message, text);
    }
});

// **Instagram Media Downloader**
const downloadInstaMedia = async (message, match) => {
    try {
        await message.reply("_Downloading..._");

        const regex = /(https?:\/\/[^\s]+)/;
        const Inurl = match.match(regex)[0];

        const { result, status } = await getJson(`https://api-25ca.onrender.com/api/instagram?url=${Inurl}`);

        if (!status || result.length < 1) {
            return await message.reply("*No media found!*");
        }

        await message.reply("_Uploading media... ⎙_", { quoted: message.data });

        for (const url of result) {
            await message.sendFromUrl(url);
        }
    } catch (error) {
        console.error(error);
        await message.reply("*Failed to fetch media.*\n_Please try again later._");
    }
};

// **Facebook Media Downloader**
const downloadFacebookMedia = async (message, match) => {
    try {
        await message.reply("_Downloading..._");

        const regex = /(https?:\/\/[^\s]+)/;
        const link = match.match(regex)[0];

        const fbApi = `https://api.siputzx.my.id/api/d/igdl?url=${link}`;
        const res = await fetch(fbApi);

        if (!res.ok) {
            return await message.reply("Please try again.");
        }

        await message.reply("_Uploading media... ⎙_", { quoted: message.data });

        const data = await res.json();
        const igmedia = data.data;

        if (igmedia && igmedia.length > 0) {
            let counter = 0;
            for (const media of igmedia) {
                if (counter >= 10) break;
                await message.sendFile(media.url);
                counter++;
            }
        } else {
            await message.reply("No media found for the provided URL.");
        }
    } catch (error) {
        console.error(error);
        await message.reply("*Error fetching media.*");
    }
};

// **YouTube Media Downloader**
const downloadYoutubeMedia = async (message, match) => {
    try {
        await message.reply("_Downloading..._");

        const regex = /(https?:\/\/[^\s]+)/;
        const link = match.match(regex)[0];

        const ytApi = `https://api.siputzx.my.id/api/d/ytmp4?url=${link}`;
        const response = await fetch(ytApi);
        const result = await response.json();
        const data = result.data;

        if (!data || !data.dl) {
            return await message.reply("Failed to retrieve video. Try another link.");
        }

        const mp3 = data.dl;
        const title = data.title;

        await message.reply(`_Downloading ${title}_`);

        await message.client.sendMessage(
            message.jid,
            { audio: { url: mp3 }, mimetype: 'audio/mp4' },
            { quoted: message.data }
        );

        await message.client.sendMessage(
            message.jid,
            { document: { url: mp3 }, mimetype: 'audio/mpeg', fileName: `${title}.mp3`, caption: `_${title}_` },
            { quoted: message.data }
        );
    } catch (error) {
        console.error('Error fetching audio:', error);
        await message.reply('Failed to download audio. Please try again later.');
    }
};