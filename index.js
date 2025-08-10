const mineflayer = require('mineflayer');
const { Movements, goals } = require('mineflayer-pathfinder');
const pathfinder = require('mineflayer-pathfinder').pathfinder;
const express = require('express');
const fetch = require('node-fetch');

const config = {
  'bot-account': {
    username: process.env.MC_USERNAME || 'YourBotUsername',
    password: process.env.MC_PASSWORD || '',
    type: 'mojang' // atau 'microsoft' sesuaikan
  },
  server: {
    ip: process.env.MC_SERVER_IP || 'nature-extension.aternos.me',
    port: parseInt(process.env.MC_SERVER_PORT) || 46282,
    version: '1.19.4' // sesuaikan dengan versi server Minecraft
  },
  utils: {
    'anti-afk': {
      enabled: true,
      sneak: false
    },
    'chat-messages': {
      enabled: false,
      messages: [],
      repeat: false,
      'repeat-delay': 60
    },
    'auto-reconnect': true,
    'auto-recconect-delay': 5000
  }
};

const app = express();
app.get('/', (req, res) => res.send('Bot is running!'));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`[WEB] Server started on port ${PORT}`));

// Self-pinger tiap 5 menit (kalau mau, bisa dimatikan kalau di Render)
setInterval(() => {
  const url = `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;
  fetch(url).then(() => console.log('[PING] Sent self-ping')).catch(() => {});
}, 5 * 60 * 1000);

function createBot() {
  const bot = mineflayer.createBot({
    username: config['bot-account'].username,
    password: config['bot-account'].password,
    auth: config['bot-account'].type,
    host: config.server.ip,
    port: config.server.port,
    version: config.server.version,
  });

  bot.loadPlugin(pathfinder);
  const mcData = require('minecraft-data')(bot.version);
  const defaultMove = new Movements(bot, mcData);
  bot.settings.colorsEnabled = false;

  let spawnPos = null;

  bot.once('spawn', () => {
    console.log('\x1b[33m[AfkBot] Bot joined the server\x1b[0m');
    spawnPos = bot.entity.position.clone();

    // Anti AFK
    if (config.utils['anti-afk'].enabled) {
      if (config.utils['anti-afk'].sneak) bot.setControlState('sneak', true);
      console.log('\x1b[32m[AfkBot] Anti-AFK started (jumping)\x1b[0m');

      setInterval(() => {
        bot.setControlState('jump', true);
        setTimeout(() => bot.setControlState('jump', false), 500);
      }, 3000);
    }

    // Chat otomatis
    if (config.utils['chat-messages'].enabled) {
      console.log('[INFO] Started chat-messages module');
      const messages = config.utils['chat-messages'].messages;
      if (config.utils['chat-messages'].repeat) {
        let i = 0;
        setInterval(() => {
          bot.chat(messages[i]);
          i = (i + 1) % messages.length;
        }, config.utils['chat-messages']['repeat-delay'] * 1000);
      } else {
        messages.forEach(msg => bot.chat(msg));
      }
    }

    // Gerak random dalam radius 8 blok
    function walkRandom() {
      if (!spawnPos) return;

      const radius = 8;
      const x = spawnPos.x + Math.floor(Math.random() * radius * 2 - radius);
      const y = spawnPos.y;
      const z = spawnPos.z + Math.floor(Math.random() * radius * 2 - radius);

      bot.pathfinder.setMovements(defaultMove);
      bot.pathfinder.setGoal(new goals.GoalBlock(x, y, z));
    }

    bot.on('goal_reached', () => {
      setTimeout(walkRandom, 5000); // delay 5 detik sebelum jalan lagi
    });

    walkRandom(); // mulai pertama kali
  });

  bot.on('death', () => {
    console.log(`\x1b[33m[AfkBot] Bot has died and respawned at ${bot.entity.position}\x1b[0m`);
  });

  if (config.utils['auto-reconnect']) {
    bot.on('end', () => {
      console.log(`\x1b[33m[AfkBot] Disconnected, reconnecting in ${config.utils['auto-recconect-delay'] / 1000}s...\x1b[0m`);
      setTimeout(createBot, config.utils['auto-recconect-delay']);
    });
  }

  bot.on('kicked', reason => {
    console.log(`\x1b[33m[AfkBot] Bot was kicked. Reason: ${reason}\x1b[0m`);
  });

  bot.on('error', err => {
    console.log(`\x1b[31m[ERROR] ${err.message}\x1b[0m`);
  });
}

createBot();
