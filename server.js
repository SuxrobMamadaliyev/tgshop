// Debug: Log process start
console.log('=== Starting server.js ===');
console.log('Node.js version:', process.version);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('Current directory:', __dirname);

// Load environment variables
require('dotenv').config();

// Debug: Log environment
console.log('Environment variables loaded');
console.log('RENDER_EXTERNAL_URL:', process.env.RENDER_EXTERNAL_URL);
console.log('BOT_TOKEN exists:', !!process.env.BOT_TOKEN);
console.log('RENDER:', process.env.RENDER);

// Verify required environment variables
const requiredEnvVars = ['BOT_TOKEN', 'ADMIN_ID1', 'ADMIN_ID2', 'UZCARD_NUMBER', 'HUMO_NUMBER'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('Missing required environment variables:', missingVars.join(', '));
  process.exit(1);
}

// Import required modules
const express = require('express');
const fetch = require('node-fetch');
const bot = require('./bot');

// Debug: Try to import bot
try {
  console.log('Bot module loaded successfully');
} catch (error) {
  console.error('Failed to load bot module:', error);
  process.exit(1);
}

// Initialize Express app
const app = express();
console.log('Express app initialized');

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/', (req, res) => {
  res.send('Bot is running!');
});

// Webhook path - should match the one set in Telegram API
const WEBHOOK_PATH = `/webhook/${process.env.BOT_TOKEN}`;
const webhookUrl = process.env.RENDER_EXTERNAL_URL + WEBHOOK_PATH;

console.log('Webhook URL:', webhookUrl);

// Set webhook
const setWebhook = async () => {
  try {
    const response = await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ['message', 'callback_query']
      })
    });
    const data = await response.json();
    console.log('Webhook set:', data);
    return data;
  } catch (error) {
    console.error('Error setting webhook:', error);
    throw error;
  }
};

// Webhook endpoint
app.post(WEBHOOK_PATH, (req, res) => {
  console.log('Received update:', req.body.update_id);
  
  // Send immediate response to prevent timeouts
  res.status(200).send('OK');
  
  // Process the update in the next tick to ensure response is sent first
  process.nextTick(async () => {
    try {
      if (req.body && req.body.update_id) {
        const success = await bot.handleUpdate(req.body);
        if (!success) {
          console.error('Failed to process update:', req.body.update_id);
        }
      } else {
        console.error('Invalid update received (missing update_id):', req.body);
      }
    } catch (error) {
      console.error('Error processing update:', error);
    }
  });
});

// Start server
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, '0.0.0.0', async () => {
  console.log(`Server is running on port ${PORT}`);
  
  if (process.env.RENDER === 'true') {
    try {
      console.log(`Setting webhook URL: ${webhookUrl}`);
      const webhookResult = await setWebhook();
      console.log('Webhook set successfully:', webhookResult);
      
      // Verify webhook was set correctly
      const webhookInfo = await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/getWebhookInfo`)
        .then(res => res.json());
      console.log('Current webhook info:', JSON.stringify(webhookInfo, null, 2));
      
      if (!webhookInfo.ok || !webhookInfo.result.url) {
        throw new Error('Failed to verify webhook setup');
      }
      
      console.log(`Bot is running in webhook mode. Webhook URL: ${webhookInfo.result.url}`);
    } catch (error) {
      console.error('Failed to set webhook:', error);
      process.exit(1);
    }
  } else {
    console.log('Bot is running in polling mode (development)');
    bot.launch()
      .then(() => console.log('Bot started in polling mode'))
      .catch(err => {
        console.error('Failed to start bot in polling mode:', err);
        process.exit(1);
      });
  }
});

// Handle errors
server.on('error', (error) => {
  console.error('Server error:', error);
  process.exit(1);
});

// Graceful shutdown
const shutdown = async () => {
  console.log('Shutting down gracefully...');
  
  if (process.env.RENDER === 'true') {
    try {
      await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/deleteWebhook`);
      console.log('Webhook deleted');
    } catch (error) {
      console.error('Error deleting webhook:', error);
    }
  }
  
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
