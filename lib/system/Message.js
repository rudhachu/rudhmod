const axios = require("axios");
const { decodeJid, createInteractiveMessage, parsedJid } = require("../functions");
const Base = require("./Base");
const { writeExifWebp } = require("../exif");
const config = require("../../config");
const ReplyMessage = require("./ReplyMessage");
const fileType = require("file-type");
const { generateWAMessageFromContent, downloadContentFromMessage, generateWAMessage } = require("baileys");
const { getName } = require("../database/StoreDb");

class Message extends Base {
	constructor(client, data) {
		super(client);
		if (data) this._patch(data);
	}

	_patch(data) {
		this.user = decodeJid(this.client.user.id);
		this.key = data.key;
		this.isGroup = data.isGroup;
		this.prefix = config.HANDLERS;
		this.id = data.key ? data.key.id : undefined;
		this.jid = data.key ? data.key.remoteJid : undefined;
		this.chat = data.key ? data.key.remoteJid : undefined;
		this.message = { key: data.key, message: data.message };
		this.pushName = data.pushName;
		this.senderName = data.pushName;
		this.participant = parsedJid(data.sender)[0];
		this.store = getName;
		let cleanJid = "";
		if (data.sender) {
			cleanJid = data.sender.includes(":") ? data.sender.split(":")[0] + "@s.whatsapp.net" : data.sender;
		} else if (data.key && data.key.remoteJid) {
			cleanJid = data.key.remoteJid;
		}

		this.sender = {
			jid: cleanJid,
			name: data.pushName || "",
		};

		try {
			this.sudo = config.SUDO.split(",").includes(this.participant.split("@")[0]);
		} catch {
			this.sudo = false;
		}

		this.text = data.body;
		this.fromMe = data.key ? data.key.fromMe : false;
		this.isBaileys = this.id ? this.id.startsWith("BAE5") : false;
		this.timestamp = data.messageTimestamp?.low || data.messageTimestamp;

		const contextInfo = data.message.extendedTextMessage?.contextInfo;
		this.mention = contextInfo?.mentionedJid || false;

		this.isForwarded = data.message.forwardingScore > 0;
		this.messageStatus = data.message.status || "unknown";
		this.reactions = data.message.reactions || [];
		this.isStarred = data.message.starred || false;
		this.isPinned = data.message.pinned || false;
		this.isDeleted = data.message.deleted || false;

		this.location = data.message.locationMessage || null;
		this.contact = data.message.contactMessage || null;
		this.sticker = data.message.stickerMessage || null;
		this.videoCall = data.message.videoCallMessage || null;
		this.audioCall = data.message.audioCallMessage || null;
		this.liveLocation = data.message.liveLocationMessage || null;
		this.documentPreview = data.message.documentMessage?.preview || null;
		this.reactionEmoji = data.message.reactionEmoji || null;

		this.audioQuality = data.message.audioMessage?.quality || "unknown";
		this.videoQuality = data.message.videoMessage?.quality || "unknown";
		this.forwardingSource = data.message.forwardingSource || null;
		this.mediaCaption = data.message.imageMessage?.caption || data.message.videoMessage?.caption || null;
		this.documentSize = data.message.documentMessage?.fileSize || 0;
		this.mediaUrl = data.message.imageMessage?.url || data.message.videoMessage?.url || null;

		if (data.message.imageMessage) {
			this.messageType = "image";
			this.imageData = data.message.imageMessage;
		} else if (data.message.videoMessage) {
			this.messageType = "video";
			this.videoData = data.message.videoMessage;
		} else if (data.message.audioMessage) {
			this.messageType = "audio";
			this.audioData = data.message.audioMessage;
		} else if (data.message.documentMessage) {
			this.messageType = "document";
			this.documentData = data.message.documentMessage;
		} else if (data.message.textMessage) {
			this.messageType = "text";
			this.textData = data.message.textMessage;
		} else {
			this.messageType = "unknown";
		}

		if (data.quoted) {
			if (data.message.buttonsResponseMessage) return;
			this.reply_message = new ReplyMessage(this.client, contextInfo, data);
			const quotedMessage = data.quoted.message.extendedTextMessage;
			this.reply_text = data.quoted.text;
			this.reply_message.type = data.quoted.type || "extendedTextMessage";
			this.reply_message.mtype = data.quoted.mtype;
			this.reply_message.key = data.quoted.key;
			this.reply_message.mention = quotedMessage?.contextInfo?.mentionedJid || false;
		} else {
			this.reply_message = false;
		}

		return super._patch(data);
	}

	async isAdmin(jid, user) {
		const groupMetadata = await this.client.groupMetadata(jid);
		const groupAdmins = groupMetadata.participants.filter(participant => participant.admin !== null).map(participant => participant.id);

		return groupAdmins.includes(decodeJid(user));
	}
	async sendReply(text, opt = {}) {
		if (!this.jid) {
			throw new Error("No recipient JID available. Make sure this.jid is set.");
		}

		const options = {
			quoted: this,
			...opt,
		};

		return this.client.sendMessage(this.jid, { text }, options);
	}
	async pinchat() {
		return await this.client.chatModify({ pin: true }, this.jid);
	}
	async unpinchat() {
		return await this.client.chatModify({ pin: false }, this.jid);
	}
	async react(msg) {
		return await this.client.sendMessage(
			this.jid,
			{
				react: {
					text: msg,
					key: this.key,
				},
			},
			{
				cachedGroupMetadata: this.store.fetchGroupMetadata,
			},
		);
	}

	async log() {
		console.log(this.data);
	}

	async sendFile(content, options = {}) {
		const { data } = await this.client.getFile(content);
		const type = (await fileType.fromBuffer(data)) || {};
		return this.client.sendMessage(this.jid, { [type.mime.split("/")[0]]: data }, options);
	}
	async sendFromUrl(url, options = {}) {
		try {
			let buffer, mime, type;
			if (options.jsonPath) {
				const response = await axios.get(url);
				url = this.getValueByPath(response.data, options.jsonPath);
				if (!url) throw new Error("URL not found in JSON data");
			}
			const response = await axios.get(url, { responseType: "arraybuffer" });
			buffer = Buffer.from(response.data, "binary");
			mime = await fileType.fromBuffer(buffer);
			if (!mime) throw new Error("Unsupported file type");

			type = mime.mime.split("/")[0];
			if (type === "audio") {
				options.mimetype = "audio/mpeg";
			}
			if (type === "application") type = "document";
			const message = { [type]: buffer, ...options };
			return await this.client.sendMessage(this.jid, message, { ...options });
		} catch (error) {
			console.error("Error in sendFromUrl:", error);
			throw error;
		}
	}
	getValueByPath(obj, path) {
		return path.split(".").reduce((acc, part) => acc && acc[part], obj);
	}

	async edit(text, opt = {}) {
		await this.client.sendMessage(this.jid, { text, edit: this.key, ...opt });
	}

	async reply(text, options) {
		const message = await this.client.sendMessage(this.jid, { text }, { quoted: this.data, ...options });
		return new Message(this.client, message);
	}

	async send(content, options = {}) {
		const jid = this.jid || options.jid;

		if (!jid) {
			console.error("JID is missing. Cannot send message.");
			throw new Error("JID is required to send a message.");
		}

		let type;
		try {
			type = options.type || (await this._detectType(content));
		} catch (error) {
			console.error("Error detecting content type:", error);
			type = "text"; // Default to text if type detection fails
		}

		const defaultOptions = {
			packname: "ᴀsᴛʀᴏ",
			author: "ғxᴏᴘ-ᴍᴅ",
			quoted: this,
		};

		const mergedOptions = { ...defaultOptions, ...options };

		try {
			switch (type.toLowerCase()) {
				case "text":
					return await this.client.sendMessage(jid, {
						text: content,
						...mergedOptions,
					});

				case "image":
				case "video":
				case "audio":
					const mediaContent = Buffer.isBuffer(content) ? content : { url: content };
					return await this.client.sendMessage(jid, {
						[type]: mediaContent,
						...mergedOptions,
					});

				case "template":
					const optional = await generateWAMessage(jid, content, mergedOptions);
					const message = {
						viewOnceMessage: {
							message: {
								...optional.message,
							},
						},
					};
					await this.client.relayMessage(jid, message, {
						messageId: optional.key.id,
					});
					break;

				case "interactive":
					const genMessage = createInteractiveMessage(content);
					await this.client.relayMessage(jid, genMessage.message, {
						messageId: genMessage.key.id,
					});
					break;

				case "sticker":
					const { data, mime } = await this.client.getFile(content);
					if (mime == "image/webp") {
						const buff = await writeExifWebp(data, mergedOptions);
						await this.client.sendMessage(jid, { sticker: { url: buff }, ...mergedOptions }, mergedOptions);
					} else {
						const mimePrefix = mime.split("/")[0];
						if (mimePrefix === "video" || mimePrefix === "image") {
							await this.client.sendImageAsSticker(jid, content, mergedOptions);
						}
					}
					break;

				default:
					throw new Error(`Unsupported message type: ${type}`);
			}
		} catch (error) {
			console.error(`Error sending ${type} message to ${jid}:`, error);
			throw error; // Re-throw the error for the caller to handle
		}
	}

	async _detectType(content) {
		if (typeof content === "string") {
			if (isUrl(content)) {
				try {
					const response = await fetch(content, { method: "HEAD" });
					const contentType = response.headers.get("content-type");
					if (contentType) {
						const [type] = contentType.split("/");
						return ["image", "video", "audio"].includes(type) ? type : "text";
					}
				} catch (error) {
					console.error("Error detecting URL content type:", error);
				}
			}
			return "text";
		}

		if (Buffer.isBuffer(content)) {
			try {
				const type = await fileType.fromBuffer(content);
				if (type) {
					const { mime } = type;
					if (mime.startsWith("image/")) return "image";
					if (mime.startsWith("video/")) return "video";
					if (mime.startsWith("audio/")) return "audio";
					if (mime === "application/pdf") return "document";
					if (mime === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") return "document";
				}
			} catch (error) {
				console.error("Error detecting buffer type:", error);
			}
		}

		return "text"; // Default to text if type couldn't be determined
	}

	async sendMessage(jid, content, opt = { packname: "ᴀsᴛʀᴏ", author: "ғxᴏᴘ-ᴍᴅ", fileName: "ғxᴏᴘ-ᴍᴅ" }, type = "text") {
		switch (type.toLowerCase()) {
			case "text":
				return this.client.sendMessage(jid, { text: content, ...opt });
			case "image" || "photo":
				if (Buffer.isBuffer(content)) {
					return this.client.sendMessage(jid, { image: content, ...opt });
				} else if (isUrl(content)) {
					return this.client.sendMessage(jid, {
						image: { url: content },
						...opt,
					});
				}
				break;
			case "video":
				if (Buffer.isBuffer(content)) {
					return this.client.sendMessage(jid, { video: content, ...opt });
				} else if (isUrl(content)) {
					return this.client.sendMessage(jid, {
						video: { url: content },
						...opt,
					});
				}
				break;
			case "audio":
				if (Buffer.isBuffer(content)) {
					return this.client.sendMessage(jid, { audio: content, ...opt });
				} else if (isUrl(content)) {
					return this.client.sendMessage(jid, {
						audio: { url: content },
						...opt,
					});
				}
				break;
			case "template":
				const optional = await generateWAMessage(jid, content, opt);
				const message = {
					viewOnceMessage: {
						message: {
							...optional.message,
						},
					},
				};
				await this.client.relayMessage(jid, message, {
					messageId: optional.key.id,
				});
				break;
			case "interactive":
				const genMessage = createInteractiveMessage(content);
				await this.client.relayMessage(jid, genMessage.message, {
					messageId: genMessage.key.id,
				});
				break;
			case "sticker":
				const { data, mime } = await this.client.getFile(content);
				if (mime == "image/webp") {
					const buff = await writeExifWebp(data, opt);
					await this.client.sendMessage(jid, { sticker: { url: buff }, ...opt }, opt);
				} else {
					const mimePrefix = mime.split("/")[0];
					if (mimePrefix === "video" || mimePrefix === "image") {
						await this.client.sendImageAsSticker(this.jid, content, opt);
					}
				}
				break;
			case "document":
				if (!opt.mimetype) throw new Error("Mimetype is required for document");
				if (Buffer.isBuffer(content)) {
					return this.client.sendMessage(jid, { document: content, ...opt });
				} else if (isUrl(content)) {
					return this.client.sendMessage(jid, {
						document: { url: content },
						...opt,
					});
				}
				break;
		}
	}
	async forward(jid, message, options = {}) {
		const m = generateWAMessageFromContent(jid, message, {
			...options,
			userJid: this.client.user.id,
		});
		if (options.contextInfo) {
			m.message.contextInfo = options.contextInfo;
		}

		await this.client.relayMessage(jid, m.message, {
			messageId: m.key.id,
			...options,
		});

		return m;
	}

	async downloadAndSaveMediaMessage(message, fileName, addExtension = true) {
		const messageContent = message.msg || message;
		const mimetype = messageContent.mimetype || "";
		const mediaType = message.mtype ? message.mtype.replace(/Message/gi, "") : mimetype.split("/")[0];
		const contentStream = await downloadContentFromMessage(messageContent, mediaType);

		let buffer = Buffer.from([]);
		for await (const chunk of contentStream) {
			buffer = Buffer.concat([buffer, chunk]);
		}

		const dataKind = await dataKind.fromBuffer(buffer);
		const finalFileName = addExtension ? `${fileName}.${dataKind.ext}` : fileName;

		await fs.writeFileSync(finalFileName, buffer);
		return finalFileName;
	}

	async PresenceUpdate(status) {
		await sock.sendPresenceUpdate(status, this.jid);
	}

	async delete(key) {
                await this.client.sendMessage(this.jid, { delete: key });
	}
	async Logout() {
		await this.client.logout();
	}
	async updateName(name) {
		await this.client.updateProfileName(name);
	}

	async getPP(jid) {
		return await this.client.profilePictureUrl(jid, "image");
	}

	async setPP(jid, pp) {
		const profilePicture = Buffer.isBuffer(pp) ? pp : { url: pp };
		await this.client.updateProfilePicture(jid, profilePicture);
	}

	async removePP(jid) {
		await this.client.removeProfilePicture(jid);
	}

	async block(jid) {
		await this.client.updateBlockStatus(jid, "block");
	}

	async unblock(jid) {
		await this.client.updateBlockStatus(jid, "unblock");
	}

	async add(jid) {
		return await this.client.groupParticipantsUpdate(this.jid, jid, "add");
	}

	async kick(jid) {
		return await this.client.groupParticipantsUpdate(this.jid, jid, "remove");
	}

	async promote(jid) {
		return await this.client.groupParticipantsUpdate(this.jid, jid, "promote");
	}

	async demote(jid) {
		return await this.client.groupParticipantsUpdate(this.jid, jid, "demote");
	}
}

module.exports = Message;
