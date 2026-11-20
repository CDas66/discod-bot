const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getLinkedUserByDiscordId, unlinkUser } = require('../../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unlink')
    .setDescription('Unlink your Discord account from Minecraft'),

  async execute(interaction) {
    const existing = getLinkedUserByDiscordId(interaction.user.id);
    if (!existing) {
      return interaction.reply({
        content: 'ℹ️ You do not currently have any Minecraft account linked.',
        ephemeral: true
      });
    }

    unlinkUser(interaction.user.id);

    const embed = new EmbedBuilder()
      .setColor(0xED4245) // Red
      .setTitle('🔗 Account Unlinked')
      .setDescription(`Successfully unlinked your Discord account from **${existing.minecraft_username}**.`)
      .setFooter({ text: 'CH|ORIGIN Bridge' })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
};
