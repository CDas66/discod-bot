const config = require('./config');
const { createDiscordClient } = require('./bot/client');
const { createApiServer } = require('./api/server');

async function main() {
  console.log('--- Starting CH|ORIGIN Bridge System ---');

  // 1. Initialize Discord Bot Client
  const client = createDiscordClient();

  if (config.discord.token && config.discord.token !== 'your_bot_token_here') {
    client.login(config.discord.token).catch(err => {
      console.error('❌ Failed to login to Discord:', err.message);
      console.log('👉 Make sure you entered a valid DISCORD_TOKEN in your .env file.');
    });
  } else {
    console.warn('⚠️  DISCORD_TOKEN is not set yet in .env. Bot client will not connect to Discord until configured.');
  }

  // 2. Initialize and start the Bridge API Server (Webstore Webhooks & Minecraft Plugin)
  const app = createApiServer(client);
  const port = config.api.port;

  app.listen(port, () => {
    console.log(`🚀 Bridge API Server listening on http://localhost:${port}`);
    console.log(`   - Webstore Webhook: POST http://localhost:${port}/api/webstore/webhook`);
    console.log(`   - Minecraft Plugin Link: POST http://localhost:${port}/api/minecraft/link/request`);
    console.log(`   - Minecraft Deliveries: GET http://localhost:${port}/api/minecraft/deliveries`);
  });
}

main().catch(err => {
  console.error('Fatal startup error:', err);
});
