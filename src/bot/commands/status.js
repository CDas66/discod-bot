const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('status')
    .setDescription('View CH|ORIGIN server status and bridge health')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    await interaction.deferReply();

    const config = require('../../config');
    const { db } = require('../../database');

    // Gather stats
    const linkedCount = db.prepare('SELECT COUNT(*) AS cnt FROM linked_users').get().cnt;
    const totalOrders = db.prepare('SELECT COUNT(*) AS cnt FROM orders').get().cnt;
    const pendingCmds = db.prepare('SELECT COUNT(*) AS cnt FROM pending_commands WHERE executed = 0').get().cnt;
    const executedCmds = db.prepare('SELECT COUNT(*) AS cnt FROM pending_commands WHERE executed = 1').get().cnt;

    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);

    const embed = new EmbedBuilder()
      .setColor(0xFFA500)
      .setTitle('🏠 CH|ORIGIN Bridge Status')
      .addFields(
        { name: '🤖 Bot Uptime', value: `\`${hours}h ${minutes}m ${seconds}s\``, inline: true },
        { name: '🔗 Linked Accounts', value: `\`${linkedCount}\``, inline: true },
        { name: '🛒 Total Orders', value: `\`${totalOrders}\``, inline: true },
        { name: '📦 Pending Deliveries', value: `\`${pendingCmds}\``, inline: true },
        { name: '✅ Executed Commands', value: `\`${executedCmds}\``, inline: true },
        { name: '🌐 API Port', value: `\`${config.api.port}\``, inline: true }
      )
      .setFooter({ text: 'CH|ORIGIN Bridge Dashboard' })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  }
};
