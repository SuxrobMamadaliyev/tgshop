const express = require('express');
const { Telegraf } = require('telegraf');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();

// Initialize bot
const bot = require('./bot');

// Middleware to parse JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Set the bot API endpoint
const TELEGRAM_API = `https://api.telegram.org/bot${process.env.BOT_TOKEN}`;
const WEBHOOK_PATH = `/webhook/${process.env.BOT_TOKEN}`;
const webhookUrl = process.env.RENDER_EXTERNAL_URL + WEBHOOK_PATH;

// Set webhook
const setWebhook = async () => {
  try {
    const response = await fetch(`${TELEGRAM_API}/setWebhook`, {
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
  bot.handleUpdate(req.body, res);
  res.status(200).send('OK');
});

// Start server
const PORT = process.env.PORT || 3000;
let server;

try {
  server = app.listen(PORT, '0.0.0.0', async () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Webhook URL: ${webhookUrl}`);
    
    if (process.env.RENDER === 'true') {
      try {
        await setWebhook();
        console.log('Webhook set successfully');
      } catch (error) {
        console.error('Failed to set webhook:', error);
      }
    } else {
      console.log('Running in development mode with webhook');
    }
  });
  
  // Handle server errors
  server.on('error', (error) => {
    console.error('Server error:', error);
    process.exit(1);
  });
  
} catch (error) {
  console.error('Failed to start server:', error);
  process.exit(1);
}

// Handle graceful shutdown
const shutdown = async () => {
  console.log('Shutting down gracefully...');
  
  // Delete webhook when shutting down
  if (process.env.RENDER === 'true') {
    try {
      await fetch(`${TELEGRAM_API}/deleteWebhook`);
      console.log('Webhook deleted');
    } catch (error) {
      console.error('Error deleting webhook:', error);
    }
  }
  
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
};

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
