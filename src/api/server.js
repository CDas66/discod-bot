const express = require('express');
const cors = require('cors');
const config = require('../config');
const webstoreRouter = require('./routes/webstore');
const minecraftRouter = require('./routes/minecraft');

function createApiServer(discordClient) {
  const app = express();

  // Trust reverse proxies (Cloudflare, Railway, Render, Nginx, Caddy)
  app.set('trust proxy', 1);

  // Configure CORS for webstore and external clients
  const corsOptions = {
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or Minecraft plugin)
      if (!origin) return callback(null, true);
      if (config.api.allowedOrigins.includes('*') || config.api.allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, true); // Allow all by default for ease of setup
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
    credentials: true
  };

  app.use(cors(corsOptions));
  app.use(express.json());

  // Attach discord client to express app
  app.set('discordClient', discordClient);

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'CH|ORIGIN Bridge API', timestamp: Date.now() });
  });

  // API Routes
  app.use('/api/webstore', webstoreRouter);
  app.use('/api/minecraft', minecraftRouter);

  return app;
}

module.exports = { createApiServer };
