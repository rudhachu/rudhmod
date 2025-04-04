const { rudhra, mode, getCpuInfo, runtime, commands, removePluginHandler, installPluginHandler, listPluginsHandler, getJson } = require("../lib");
const util = require("util");
const axios = require("axios");
const config = require("../config");
const version = require("../package.json").version;
const { exec, execSync } = require("child_process");
const { PausedChats } = require("../lib/database");

rudhra({
		pattern: "ping",
		fromMe: mode,
		desc: "Bot response in milliseconds.",
		type: "system",
	},
	async message => {
		const start = new Date().getTime();
		const msg = await message.reply("Checking");
		const end = new Date().getTime();
		const responseTime = (end - start) / 1000;
		await msg.edit(`Responce : ${responseTime} secs`);
	},
);

rudhra({
		pattern: "restart",
		fromMe: true,
		desc: "Restarts Bot",
		type: "system",
	},
	async (msg, match, client) => {
		await msg.sendReply("*_Restarting_*");
		await exec(require("../package.json").scripts.start);
	},
);

rudhra({
		pattern: "shutdown",
		fromMe: true,
		desc: "stops the bot",
		type: "system",
	},
	async (message, match) => {
		await message.sendReply("*_Shutting Down_*");
		await exec(require("../package.json").scripts.stop);
	},
);

rudhra({
		pattern: "enable ?(.*)",
		fromMe: true,
		desc: "Disables the bot",
		type: "system",
	},
	async message => {
		await PausedChats.savePausedChat(message.key.remoteJid);
		await message.reply("_Bot Disabled in this Chat_");
	},
);

rudhra({
		pattern: "disable ?(.*)",
		fromMe: true,
		desc: "Enables the bot",
		type: "system",
	},
	async message => {
		const pausedChat = await PausedChats.PausedChats.findOne({ where: { chatId: message.key.remoteJid } });
		if (pausedChat) {
			await pausedChat.destroy();
			await message.reply("_Bot Enabled in this Chat_");
		} else {
			await message.reply("_Bot wasn't disabled_");
		}
	},
);

rudhra({
		pattern: "runtime",
		fromMe: true,
		desc: "Check uptime of bot",
		type: "system",
	},
	async (message, match) => {
		message.reply(`*Alive ${runtime(process.uptime())}*`);
	},
);

rudhra({
		pattern: "logout",
		fromMe: true,
		desc: "logouts of out the bot",
		type: "system",
	},
	async (message, match, client) => {
		await message.sendReply("_Logged Out!_");
		await message.Logout();
		return await exec(require("../package.json").scripts.stop);
	},
);
rudhra({
		pattern: "cpu",
		fromMe: mode,
		desc: "Returns CPU Info",
		type: "system",
	},
	async message => {
		const cpuInfo = await getCpuInfo();
		await message.send(cpuInfo);
	},
);
rudhra({
		pattern: "install",
		fromMe: true,
		desc: "Installs External plugins",
		type: "system",
	},
	installPluginHandler,
);
rudhra({
		pattern: "plugin",
		fromMe: true,
		desc: "Plugin list",
		type: "system",
	},
	listPluginsHandler,
);
rudhra({
		pattern: "remove",
		fromMe: true,
		desc: "Remove external plugins",
		type: "system",
	},
	removePluginHandler,
);

rudhra({
    pattern: "list",
    fromMe: mode,
    dontAddCommandList: true
}, async (message, query) => {
    let msg = '';
    let no = 1;
    for (const command of commands) {
        if (command.dontAddCommandList === false && command.pattern !== undefined) {
            msg += `${no++}. ${command.pattern.toString().query(/(\W*)([A-Za-z0-9_ğüşiö ç]*)/)[2].trim()}\n${command.desc}\n\n`;
        }
    }
    await message.send(msg.trim());
});

rudhra({
    pattern: "menu",
    fromMe: mode,
    dontAddCommandList: true
}, async (message, query) => {
const readMore = String.fromCharCode(8206).repeat(4001);
    if (query) {
      for (let i of commands) {
        if (
          i.pattern instanceof RegExp &&
          i.pattern.test(message.prefix + query)
        ) {
          const cmdName = i.pattern.toString().split(/\W+/)[1];
          message.reply(`\`\`\`rudhra: ${message.prefix}${cmdName.trim()}
Description: ${i.desc}\`\`\``);
        }
      }
    } else {
      let { prefix } = message;
      let [date, time] = new Date()
        .toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
        .split(",");
      let menu = `                                                             
        Hey 👋   ${message.pushName}
        *Bot Name*  :  ${config.BOT_INFO.split(";")[0]} 
        *Version*   :   ${version}
        *Prefix*   :   ${PREFIX}
        *Mode*   :   ${config.MODE}
        *Date*    :    ${date}
        *Commands*   :   ${commands.length}
                  
                █║▌║▌║║▌║ █
                 ʀ   ᴜ   ᴅ   ʜ   ʀ   ᴀ
                                                             \n\n ${readMore}`;
      let cmnd = [];
      let cmd;
      let category = [];
      commands.map((rudhra, num) => {
        if (rudhra.pattern instanceof RegExp) {
          cmd = rudhra.pattern.toString().split(/\W+/)[1];
        }

        if (!rudhra.dontAddCommandList && cmd !== undefined) {
          let type = rudhra.type ? rudhra.type.toLowerCase() : "misc";

          cmnd.push({ cmd, type });

          if (!category.includes(type)) category.push(type);
        }
      });
      cmnd.sort();
      category.sort().forEach((cmmd) => {
        menu += `\n         ❮ *${cmmd.toUpperCase()}* ❯         `;
        menu += `\n      `;
        let comad = cmnd.filter(({ type }) => type == cmmd);
        comad.forEach(({ cmd }) => {
          menu += `\n      •  ${cmd.trim()} `;
        });
        menu += `\n\n      `;
      menu += `\n                                                `;
        });
      menu += `\n\n${config.BOT_INFO.split(";")[0]}`;
      return await message.send(menu, {
    contextInfo: {
externalAdReply: {
                    title: config.LINK_PREVIEW.split(";")[0],
                    body: config.LINK_PREVIEW.split(";")[1],
                    sourceUrl: "https://github.com/princerudh/rudhra-bot",
                    mediaUrl: "https://instagram.com",
                    mediaType: 1,
                    showAdAttribution: true,
                    renderLargerThumbnail: false,
                    thumbnailUrl: config.LINK_PREVIEW.split(";")[2]
                }
    },
  });
    }
  }
);

rudhra({
		pattern: "patch ?(.*)",
		fromMe: true,
		desc: "Run bot patching",
		type: "system",
	},
	async m => {
		await m.reply("_Feature UnderDevelopment!_");
	},
);

rudhra({
		pattern: "rudhra ?(.*)",
		fromMe: mode,
		desc: "Get Active Fxop Users",
		type: "system",
	},
	async m => {
		await m.reply("_Feature UnderDevelopment!_");
	},
);

rudhra({
		pattern: "checkupdates ?(.*)",
		fromMe: true,
		desc: "Check remote for Updates",
		type: "system",
	},
	async (message, match, m, client) => {
		try {
			const repoUrl = "https://api.github.com/repos/princerudh/rudhra-bot/commits/master";
			const response = await axios.get(repoUrl);
			const latestRemoteCommit = response.data.sha;
			const latestLocalCommit = execSync("git rev-parse HEAD").toString().trim();
			if (latestRemoteCommit === latestLocalCommit) {
				await message.send("You are on the latest version.");
			} else {
				await message.send(`*New updates are available*\n> ${latestRemoteCommit}.`);
			}
		} catch (error) {
			await message.send("Failed to check for updates.");
		}
	},
);

rudhra({
    on: "text",
    fromMe: true,
    dontAddCommandList: true,
  },
  async (message, match, m, client) => {
    const content = message.text;
    if (!content) return;
    if (!(content.startsWith(">") || content.startsWith("$") || content.startsWith("|"))) return;

    const evalCmd = content.slice(1).trim();
    
    try {
      let result = await eval(`(${evalCmd})`);
      
      if (typeof result === 'function') {
        let functionString = result.toString();
        if (functionString.includes('[native code]') || functionString.length < 50) {
          let properties = Object.getOwnPropertyNames(result);
          let propertyString = properties.map(prop => {
            try {
              return `${prop}: ${util.inspect(result[prop], { depth: 0 })}`;
            } catch (e) {
              return `${prop}: [Unable to inspect]`;
            }
          }).join('\n');
          
          functionString += '\n\nProperties:\n' + propertyString;
        }
        result = functionString;
      } else if (typeof result !== "string") {
        result = util.inspect(result, { depth: null });
      }
      await message.reply(result);
    } catch (error) {
      await message.reply(`Error: ${error.message}`);
    }
  },
);
