// =====================
// Web server & Self Ping
// =====================
const express = require('express');
const fetch = require('node-fetch');

const app = express();
app.get('/', (req, res) => res.send('Bot is running!'));
app.listen(3000, () => console.log('[WEB] Server started on port 3000'));

// Self-ping setiap 5 menit
setInterval(() => {
    const url = `https://${process.env.RENDER_EXTERNAL_HOSTNAME}`;
    if (process.env.RENDER_EXTERNAL_HOSTNAME) {
        fetch(url)
            .then(() => console.log('[PING] Sent self-ping'))
            .catch(() => {});
    }
}, 5 * 60 * 1000);

// =====================
// Minecraft AFK Bot
// =====================
const mineflayer = require('mineflayer');
const { Movements, goals } = require('mineflayer-pathfinder');
const pathfinder = require('mineflayer-pathfinder').pathfinder;
const config = require('./settings.json');

function createBot() {
    const bot = mineflayer.createBot({
        username: config['bot-account'].username,
        password: config['bot-account'].password,
        auth: config['bot-account'].type,
        host: config.server.ip,
        port: config.server.port,
        version: config.server.version
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
            setTimeout(walkRandom, 5000);
        });

        walkRandom();
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
