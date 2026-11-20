const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getLinkedUserByDiscordId, getUserOrders } = require('../../database');
const { syncMemberRoles } = require('../services/roleSync');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sync')
    .setDescription('Re-sync your Discord roles with your Minecraft purchases & ranks'),

  async execute(interaction) {
    const linked = getLinkedUserByDiscordId(interaction.user.id);
    if (!linked) {
      return interaction.reply({
        content: '❌ You must link your Minecraft account first using `/link`.',
        ephemeral: true
      });
    }

    await interaction.deferReply({ ephemeral: true });

    const orders = getUserOrders(linked.minecraft_username);
    let syncedCount = 0;

    for (const order of orders) {
      if (order.package_id) {
        await syncMemberRoles(interaction.client, interaction.user.id, order.package_id);
        syncedCount++;
      }
    }

    const embed = new EmbedBuilder()
      .setColor(0x57F287)
      .setTitle('🔄 Sync Complete')
      .setDescription(`Checked **${orders.length}** store purchase records for **${linked.minecraft_username}** and refreshed your Discord roles.`)
      .setFooter({ text: 'CH|ORIGIN Bridge' })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  }
};
