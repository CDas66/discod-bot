const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
const config = require('../config');

function createDiscordClient() {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessages
    ]
  });

  client.commands = new Collection();

  // Load commands dynamically
  const commandsPath = path.join(__dirname, 'commands');
  if (fs.existsSync(commandsPath)) {
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
      const filePath = path.join(commandsPath, file);
      const command = require(filePath);
      if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
        console.log(`[Bot] Loaded command: /${command.data.name}`);
      }
    }
  }

  // Ready event
  client.once('ready', () => {
    console.log(`===============================================`);
    console.log(`🤖 CH|ORIGIN Discord Bot is ONLINE! Logged in as: ${client.user.tag}`);
    console.log(`===============================================`);
  });

  // Interaction (Slash Command) handler
  client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(`[Bot] Error executing /${interaction.commandName}:`, error);
      const replyFn = interaction.deferred || interaction.replied ? 'editReply' : 'reply';
      await interaction[replyFn]({
        content: '❌ There was an error while executing this command!',
        ephemeral: true
      }).catch(() => null);
    }
  });

  return client;
}

module.exports = { createDiscordClient };
