const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const express = require('express');
const pino = require('pino');

// Express server to keep bot alive
const app = express();
const PORT = process.env.PORT || 3000;

let isConnected = false;
let qrCodeText = 'Waiting for QR code...';

app.get('/', (req, res) => {
  res.send(`
    <html>
      <head><title>Casper2 WhatsApp Bot</title></head>
      <body style="font-family: Arial; padding: 20px;">
        <h1>🤖 Casper2 WhatsApp Bot</h1>
        <p>Status: ${isConnected ? '✅ Connected' : '❌ Not Connected'}</p>
        <p>Uptime: ${Math.floor(process.uptime())} seconds</p>
        <h2>QR Code:</h2>
        <pre style="background: #f4f4f4; padding: 10px; overflow: auto;">${qrCodeText}</pre>
        <p><small>Scan this QR code with WhatsApp to connect the bot</small></p>
      </body>
    </html>
  `);
});

app.get('/status', (req, res) => {
  res.json({
    status: isConnected ? 'connected' : 'disconnected',
    uptime: process.uptime(),
    qrCode: qrCodeText
  });
});

app.listen(PORT, () => {
  console.log(`🌐 Server running on port ${PORT}`);
  console.log(`📱 Visit your Render URL to see the QR code`);
});

// WhatsApp Bot
async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info');
  
  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: 'silent' }),
    browser: ['Casper2', 'Chrome', '1.0.0']
  });

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;
    
    if (qr) {
      console.log('\n========================================');
      console.log('📱 QR CODE GENERATED!');
      console.log('========================================');
      console.log('Visit your Render URL to see the QR code');
      console.log('Or scan this ASCII QR code:\n');
      
      // Store QR for web display
      qrCodeText = qr;
      
      // Also print to console
      const QRCode = require('qrcode-terminal');
      QRCode.generate(qr, { small: true }, function(qrcode) {
        console.log(qrcode);
      });
      
      console.log('\n========================================\n');
    }
    
    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      
      console.log('❌ Connection closed:', lastDisconnect?.error?.message);
      console.log('🔄 Reconnecting:', shouldReconnect);
      
      isConnected = false;
      
      if (shouldReconnect) {
        setTimeout(() => {
          connectToWhatsApp();
        }, 5000); // Wait 5 seconds before reconnecting
      } else {
        console.log('⚠️ Logged out! Delete auth_info folder and restart to generate new QR code');
        qrCodeText = 'Logged out. Need to restart service.';
      }
    } else if (connection === 'open') {
      console.log('✅ Connected to WhatsApp!');
      console.log('📱 Bot is now online and ready!');
      isConnected = true;
      qrCodeText = 'Connected! ✅';
    }
  });

  sock.ev.on('creds.update', saveCreds);

  // Message handler
  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    
    if (!msg.message || msg.key.fromMe) return;
    
    const from = msg.key.remoteJid;
    const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
    
    console.log(`📩 Message from ${from}: ${text}`);

    try {
      // Commands
      if (text.toLowerCase() === '!ping') {
        await sock.sendMessage(from, { text: '🏓 Pong! Casper2 is online!' });
      }
      
      if (text.toLowerCase() === '!help') {
        const helpText = `*Casper2 WhatsApp Bot* 🤖

Available Commands:
• !ping - Check if bot is online
• !help - Show this message
• !info - Bot information
• !time - Current server time
• !echo <text> - Echo your message`;
        
        await sock.sendMessage(from, { text: helpText });
      }
      
      if (text.toLowerCase() === '!info') {
        await sock.sendMessage(from, { 
          text: `*Casper2 Bot Info* ℹ️\n\nStatus: Online ✅\nUptime: ${Math.floor(process.uptime())}s\nVersion: 1.0.0\nPlatform: Render` 
        });
      }
      
      if (text.toLowerCase() === '!time') {
        await sock.sendMessage(from, { 
          text: `🕐 Current time: ${new Date().toLocaleString()}` 
        });
      }
      
      if (text.toLowerCase().startsWith('!echo ')) {
        const echoText = text.substring(6);
        await sock.sendMessage(from, { text: `🔊 ${echoText}` });
      }
    } catch (error) {
      console.error('Error handling message:', error);
    }
  });
}

// Start bot
console.log('🚀 Starting Casper2 WhatsApp Bot...');
connectToWhatsApp().catch(err => {
  console.error('❌ Fatal Error:', err);
  process.exit(1);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n👋 Bot shutting down...');
  process.exit(0);
});
