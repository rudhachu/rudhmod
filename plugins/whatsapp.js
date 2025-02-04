const fileType = require("file-type");
const { rudhra, mode, serialize, parsedJid } = require("../lib");
const { loadMessage, getName } = require("../lib/database/StoreDb");
const { DELETED_LOG_CHAT, DELETED_LOG } = require("../config");

rudhra({
		pattern: "readmore ?(.*)",
		fromMe: mode,
		desc: "Make Readmore Text",
		type: "whatsapp",
	},
	async (message, match) => {
		if (!match) return message.reply("Need text\n_Example: .readmore Hi\\how are you_");
		const [c1, c2] = match.split("\\");
		message.reply(`${c1}\n${"‎".repeat(4000)}\n${c2}`);
	},
);

rudhra({
		pattern: "pp ?(.*)",
		fromMe: true,
		desc: "Set profile picture",
		type: "whatsapp",
	},
	async (message, match, m) => {
		if (!message.reply_message.image) return await message.reply("_Reply to a photo_");

		const buff = await m.quoted.download();
		await message.setPP(message.user, buff);
		await message.reply("_Profile Picture Updated_");
	},
);

rudhra({
		pattern: "rpp ?(.*)",
		fromMe: true,
		desc: "Remove profile picture",
		type: "whatsapp",
	},
	async message => {
		await message.removePP(message.user);
		return await message.sendReply("_Profile Photo Removed!_");
	},
);

rudhra({
		pattern: "setname ?(.*)",
		fromMe: true,
		desc: "Set User name",
		type: "whatsapp",
	},
	async (message, match) => {
		if (!match) return await message.reply("_Enter name_");

		await message.updateName(match);
		await message.reply(`_Username Updated : ${match}_`);
	},
);

rudhra({
		pattern: "block ?(.*)",
		fromMe: true,
		desc: "Block a person",
		type: "whatsapp",
	},
	async (message, match) => {
		const jid = message.isGroup ? message.mention[0] || message.reply_message.jid : message.jid;
		if (!jid) return await message.reply(message.isGroup ? "_Reply to a person or mention_" : "_Blocked_");
		await message.sendMessage(message.isGroup ? `_@${jid.split("@")[0]} Blocked_` : "_Blocked_", { mentions: [jid] });
		return await message.block(jid);
	},
);

rudhra({
		pattern: "unblock ?(.*)",
		fromMe: true,
		desc: "Unblock a person",
		type: "whatsapp",
	},
	async (message, match) => {
		const jid = message.isGroup ? message.mention[0] || message.reply_message.jid : message.jid;
		if (!jid) return await message.reply(message.isGroup ? "_Reply to a person or mention_" : "_User unblocked_");
		await message.sendMessage(message.isGroup ? `_@${jid.split("@")[0]} unblocked_` : "_User unblocked_", { mentions: [jid] });
		return await message.unblock(jid);
	},
);

rudhra({
		pattern: "jid ?(.*)",
		fromMe: true,
		desc: "Give jid of chat/user",
		type: "whatsapp",
	},
	async message => {
		const jid = message.mention[0] || message.reply_message.jid || message.jid;
		await message.sendMessage(message.jid, jid);
	},
);

rudhra({
		pattern: "dlt ?(.*)",
		fromMe: true,
		desc: "Deletes a message",
		type: "whatsapp",
	},
	async (message, match, m, client) => {
		if (!message.reply_message) return await message.reply("Please reply to the message you want to delete.");

		await client.sendMessage(message.jid, { delete: message.reply_message.key });
	},
);

rudhra({
    pattern: "vv ?(.*)",
    fromMe: true,
    desc: "Forwards The View once message",
    type: "whatsapp",
  },
  async (message, match, m) => {
      const buff = await m.quoted.download();
      const buffer = Buffer.isBuffer(buff) ? buff : Buffer.from(buff);
      await message.sendFile(message.user, buffer);
      return await message.sendReply("_Check Your PM SiR_");
  }
);

rudhra({
		pattern: "quoted ?(.*)",
		fromMe: mode,
		desc: "Quoted message",
		type: "whatsapp",
	},
	async message => {
		if (!message.reply_message) return await message.reply("*Reply to a message*");

		const key = message.reply_message.key;
		let msg = await loadMessage(key.id);
		if (!msg) return await message.reply("_Message not found, maybe bot was not running at that time_");

		msg = await serialize(JSON.parse(JSON.stringify(msg.message)), message.client);
		if (!msg.quoted) return await message.reply("No quoted message found");

		await message.forward(message.jid, msg.quoted.message);
	},
);

// rudhra({
// 	
// 		on: "text",
// 		fromMe: !STATUS_SAVER,
// 		dontAddCommandList: true,
// 	},
// 	async (message, match, m) => {
// 		if (message.isGroup) return;

// 		const triggerKeywords = ["save", "send", "sent", "snt", "give", "snd"];
// 		const cmdz = match.toLowerCase().split(" ")[0];
// 		if (triggerKeywords.some(tr => cmdz.includes(tr))) {
// 			const relayOptions = { messageId: m.quoted.key.id };
// 			await message.client.relayMessage(message.sender.jid, m.quoted.message, relayOptions, { quoted: message });
// 		}
// 	},
// );

rudhra({
		pattern: "save ?(.*)",
		fromMe: true,
		desc: "Saves WhatsApp Status",
		type: "whatsapp",
	},
	async (message, match, m, client) => {
		if (!message.reply_message?.image && !message.reply_message.video && !message.reply_message.audio) return await message.sendReply("_Reply A Status_");
		await message.forward(message.user, m.quoted.message);
	},
);

rudhra({
		on: "delete",
		fromMe: false,
		dontAddCommandList: true,
	},
	async message => {
		if (!DELETED_LOG) return;
		if (!DELETED_LOG_CHAT) return await message.sendMessage(message.user, "Please set DELETED_LOG_CHAT in ENV to use log delete message");

		let msg = await loadMessage(message.messageId);
		if (!msg) return;

		msg = await serialize(JSON.parse(JSON.stringify(msg.message)), message.client);
		if (!msg) return await message.reply("No deleted message found");

		const deleted = await message.forward(DELETED_LOG_CHAT, msg.message);
		const name = !msg.from.endsWith("@g.us") ? `_Name : ${await getName(msg.from)}_` : `_Group : ${(await message.client.groupMetadata(msg.from)).subject}_\n_Name : ${await getName(msg.sender)}_`;

		await message.sendMessage(DELETED_LOG_CHAT, `_Message Deleted_\n_From : ${msg.from}_\n${name}\n_SenderJid : ${msg.sender}_`, { quoted: deleted });
	},
);

rudhra({
		pattern: "forward ?(.*)",
		fromMe: mode,
		desc: "Forwards the replied message (any type)",
		type: "whatsapp",
	},
	async (message, match, m) => {
		if (!m.quoted) return await message.reply("Reply to a message to forward");
		const jids = parsedJid(match);
		const contextInfo = {
			forwardingScore: 1,
			isForwarded: true,
		};
		for (const jid of jids) {
			await message.forward(jid, m.quoted.message, { contextInfo });
		}
	},
);

rudhra({
		pattern: "edit ?(.*)",
		fromMe: true,
		desc: "Edit message sent by the bot",
		type: "whatsapp",
	},
	async (message, match, m, client) => {
		if (!message.reply_message) return await message.reply("_Reply to a message_");
		if (!match) return await message.reply("```Wrong Format " + message.pushName + "\n\n" + message.prefix + "edit hello```");

		const repliedMessage = message.reply_message;
		const messageKey = repliedMessage.key;
		if (repliedMessage.edit) {
			await repliedMessage.edit(match, { key: messageKey });
		} else {
			await message.reply("_Edit function not available on the message_");
		}
	},
);

rudhra({
		pattern: "clear ?(.*)",
		fromMe: true,
		desc: "delete whatsapp chat",
		type: "whatsapp",
	},
	async (message, match) => {
		await message.client.chatModify(
			{
				delete: true,
				lastMessages: [
					{
						key: message.data.key,
						messageTimestamp: message.messageTimestamp,
					},
				],
			},
			message.jid,
		);
		await message.reply("_Cleared.._");
	},
);

rudhra({
		pattern: "archive ?(.*)",
		fromMe: true,
		desc: "archive whatsapp chat",
		type: "whatsapp",
	},
	async (message, match) => {
		const lstMsg = {
			message: message.message,
			key: message.key,
			messageTimestamp: message.messageTimestamp,
		};
		await message.client.chatModify(
			{
				archive: true,
				lastMessages: [lstMsg],
			},
			message.jid,
		);
		await message.reply("_Archived.._");
	},
);

rudhra({
		pattern: "unarchive ?(.*)",
		fromMe: true,
		desc: "unarchive whatsapp chat",
		type: "whatsapp",
	},
	async (message, match) => {
		const lstMsg = {
			message: message.message,
			key: message.key,
			messageTimestamp: message.messageTimestamp,
		};
		await message.client.chatModify(
			{
				archive: false,
				lastMessages: [lstMsg],
			},
			message.jid,
		);
		await message.reply("_Unarchived.._");
	},
);

rudhra({
		pattern: "pin",
		fromMe: true,
		desc: "pin a chat",
		type: "whatsapp",
	},
	async (message, match, m, client) => {
		await client.pinchat();
		await message.reply("_Pined.._");
	},
);

rudhra({
		pattern: "unpin ?(.*)",
		fromMe: true,
		desc: "unpin a msg",
		type: "whatsapp",
	},
	async (message, match, m, client) => {
		await client.unpinchat();
		await message.reply("_Unpined.._");
	},
);

rudhra({
		pattern: "setbio",
		fromMe: true,
		desc: "To change your profile status",
		type: "whatsapp",
	},
	async (message, match) => {
		match = match || message.reply_message.text;
		if (!match) return await message.send("*Need Status!*\n*Example: setbio Hey there! I am using WhatsApp*.");
		await message.client.updateProfileStatus(match);
		await message.reply("_Profile bio updated_");
	},
);

rudhra({
		pattern: "getprivacy ?(.*)",
		fromMe: true,
		desc: "get your privacy settings",
		type: "whatsapp",
	},
	async (message, match) => {
		const { readreceipts, profile, status, online, last, groupadd, calladd } = await message.client.fetchPrivacySettings(true);
		const msg = `*♺ my privacy*\n\n*ᝄ name :* ${message.client.user.name}\n*ᝄ online:* ${online}\n*ᝄ profile :* ${profile}\n*ᝄ last seen :* ${last}\n*ᝄ read receipt :* ${readreceipts}\n*ᝄ about seted time :*\n*ᝄ group add settings :* ${groupadd}\n*ᝄ call add settings :* ${calladd}`;
		let img = await message.client.profilePictureUrl(message.user.jid, "image").catch(() => "https://f.uguu.se/oHGtgfmR.jpg");
		await message.send(img, { caption: msg }, "image");
	},
);

rudhra({
		pattern: "lastseen ?(.*)",
		fromMe: true,
		desc: "to change lastseen privacy",
		type: "whatsapp",
	},
	async (message, match, m) => {
		if (!match) return await message.send(`_*Example:-* ${message.prefix} all_\n_to change last seen privacy settings_`);
		const available_privacy = ["all", "contacts", "contact_blacklist", "none"];
		if (!available_privacy.includes(match)) return await message.send(`_action must be *${available_privacy.join("/")}* values_`);
		await message.client.updateLastSeenPrivacy(match);
		await message.send(`_Privacy settings *last seen* Updated to *${match}*_`);
	},
);

rudhra({
		pattern: "online ?(.*)",
		fromMe: true,
		desc: "to change online privacy",
		type: "whatsapp",
	},
	async (message, match, m) => {
		if (!match) return await message.send(`_*Example:-* ${message.prefix} all_\n_to change *online*  privacy settings_`);
		const available_privacy = ["all", "match_last_seen"];
		if (!available_privacy.includes(match)) return await message.send(`_action must be *${available_privacy.join("/")}* values_`);
		await message.client.updateOnlinePrivacy(match);
		await message.send(`_Privacy Updated to *${match}*_`);
	},
);

rudhra({
		pattern: "mypp ?(.*)",
		fromMe: true,
		desc: "privacy setting profile picture",
		type: "whatsapp",
	},
	async (message, match) => {
		if (!match) return await message.send(`_*Example:-* ${message.prefix} all_\n_to change *profile picture*  privacy settings_`);
		const available_privacy = ["all", "contacts", "contact_blacklist", "none"];
		if (!available_privacy.includes(match)) return await message.send(`_action must be *${available_privacy.join("/")}* values_`);
		await message.client.updateProfilePicturePrivacy(match);
		await message.send(`_Privacy Updated to *${match}*_`);
	},
);

rudhra({
		pattern: "mystatus ?(.*)",
		fromMe: true,
		desc: "privacy for my status",
		type: "whatsapp",
	},
	async (message, match) => {
		if (!match) return await message.send(`_*Example:-* ${message.prefix} all_\n_to change *status*  privacy settings_`);
		const available_privacy = ["all", "contacts", "contact_blacklist", "none"];
		if (!available_privacy.includes(match)) return await message.send(`_action must be *${available_privacy.join("/")}* values_`);
		await message.client.updateStatusPrivacy(match);
		await message.send(`_Privacy Updated to *${match}*_`);
	},
);

rudhra({
		pattern: "read ?(.*)",
		fromMe: true,
		desc: "privacy for read message",
		type: "whatsapp",
	},
	async (message, match, m) => {
		if (!match) return await message.send(`_*Example:-* ${message.prefix} all_\n_to change *read and receipts message*  privacy settings_`);
		const available_privacy = ["all", "none"];
		if (!available_privacy.includes(match)) return await message.send(`_action must be *${available_privacy.join("/")}* values_`);
		await message.client.updateReadReceiptsPrivacy(match);
		await message.send(`_Privacy Updated to *${match}*_`);
	},
);

rudhra({
		pattern: "groupadd ?(.*)",
		fromMe: true,
		desc: "privacy for group add",
		type: "whatsapp",
	},
	async (message, match, m) => {
		if (!match) return await message.send(`_*Example:-* ${message.prefix} all_\n_to change *group add*  privacy settings_`);
		const available_privacy = ["all", "contacts", "contact_blacklist", "none"];
		if (!available_privacy.includes(match)) return await message.send(`_action must be *${available_privacy.join("/")}* values_`);
		await message.client.updateGroupsAddPrivacy(match);
		await message.send(`_Privacy Updated to *${match}*_`);
	},
);
