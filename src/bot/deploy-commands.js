const { REST, Routes } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
const config = require('../config');

async function deployCommands() {
  if (!config.discord.token || !config.discord.clientId) {
    console.error('❌ DISCORD_TOKEN or DISCORD_CLIENT_ID is missing in .env');
    return;
  }

  const commands = [];
  const commandsPath = path.join(__dirname, 'commands');
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

  for (const file of commandFiles) {
    const command = require(path.join(commandsPath, file));
    if ('data' in command && 'execute' in command) {
      commands.push(command.data.toJSON());
    }
  }

  const rest = new REST({ version: '10' }).setToken(config.discord.token);

  try {
    console.log(`[Deploy] Refreshing ${commands.length} application (/) commands...`);

    if (config.discord.guildId) {
      // Fast guild command update (instant update for development/server)
      await rest.put(
        Routes.applicationGuildCommands(config.discord.clientId, config.discord.guildId),
        { body: commands }
      );
      console.log(`✅ Successfully reloaded slash commands for Guild: ${config.discord.guildId}`);
    } else {
      // Global commands (takes ~1 hour to propagate across Discord)
      await rest.put(
        Routes.applicationCommands(config.discord.clientId),
        { body: commands }
      );
      console.log('✅ Successfully reloaded global slash commands.');
    }
  } catch (error) {
    console.error('❌ Error deploying commands:', error);
  }
}

if (require.main === module) {
  deployCommands();
}

module.exports = { deployCommands };
