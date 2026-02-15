require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');

// Create Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

// Create Express app to keep the bot alive
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('🤖 Casper2 Bot is running!');
});

app.get('/status', (req, res) => {
  res.json({
    status: 'online',
    uptime: process.uptime(),
    botStatus: client.user ? 'connected' : 'disconnected'
  });
});

app.listen(PORT, () => {
  console.log(`🌐 Web server is running on port ${PORT}`);
});

// Bot ready event
client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  console.log(`📊 Serving ${client.guilds.cache.size} servers`);
  
  // Set bot status
  client.user.setActivity('Casper2 Online', { type: 'PLAYING' });
});

// Message command handler
client.on('messageCreate', async (message) => {
  // Ignore bot messages
  if (message.author.bot) return;

  // Ping command
  if (message.content === '!ping') {
    const sent = await message.reply('Pinging...');
    sent.edit(`🏓 Pong! Latency: ${sent.createdTimestamp - message.createdTimestamp}ms`);
  }

  // Help command
  if (message.content === '!help') {
    message.reply(`
**Available Commands:**
\`!ping\` - Check bot latency
\`!help\` - Show this message
\`!serverinfo\` - Get server information
    `);
  }

  // Server info command
  if (message.content === '!serverinfo') {
    const guild = message.guild;
    message.reply(`
**Server Information:**
📝 Name: ${guild.name}
👥 Members: ${guild.memberCount}
📅 Created: ${guild.createdAt.toDateString()}
    `);
  }
});

// Error handling
client.on('error', error => {
  console.error('Discord client error:', error);
});

process.on('unhandledRejection', error => {
  console.error('Unhandled promise rejection:', error);
});

// Login to Discord
client.login(process.env.DISCORD_TOKEN).catch(err => {
  console.error('❌ Failed to login:', err.message);
  process.exit(1);
});
