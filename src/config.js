require('dotenv').config();

const parseRoleMappings = (raw) => {
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    // Fallback: parse key:value,key2:value2
    const mappings = {};
    raw.split(',').forEach(item => {
      const [key, value] = item.split(':').map(s => s.trim());
      if (key && value) mappings[key.toLowerCase()] = value;
    });
    return mappings;
  }
};

module.exports = {
  discord: {
    token: process.env.DISCORD_TOKEN,
    clientId: process.env.DISCORD_CLIENT_ID,
    guildId: process.env.DISCORD_GUILD_ID,
    purchaseChannelId: process.env.DISCORD_PURCHASE_CHANNEL_ID,
    roleMappings: parseRoleMappings(process.env.ROLE_MAPPINGS)
  },
  api: {
    // Supports standard cloud provider PORT (Railway, Render, Heroku) or custom API_PORT
    port: parseInt(process.env.PORT || process.env.API_PORT || '3001', 10),
    secretKey: process.env.API_SECRET_KEY || 'chorigin_default_secret_change_me',
    allowedOrigins: process.env.ALLOWED_ORIGINS 
      ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim()) 
      : ['*']
  }
};
