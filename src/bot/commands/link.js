const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { consumeLinkCode, getLinkedUserByDiscordId } = require('../../database');
const { syncMemberRoles } = require('../services/roleSync');
const { getUserOrders } = require('../../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('link')
    .setDescription('Link your Discord account with your in-game Minecraft account')
    .addStringOption(option =>
      option.setName('code')
        .setDescription('The 6-digit link code shown in Minecraft (/link)')
        .setRequired(true)
    ),

  async execute(interaction) {
    const existing = getLinkedUserByDiscordId(interaction.user.id);
    if (existing) {
      return interaction.reply({
        content: `⚠️ Your Discord account is already linked to Minecraft player **${existing.minecraft_username}**.\nUse \`/unlink\` first if you want to switch accounts.`,
        ephemeral: true
      });
    }

    const inputCode = interaction.options.getString('code').trim().toUpperCase();
    const result = consumeLinkCode(inputCode, interaction.user.id);

    if (!result) {
      return interaction.reply({
        content: '❌ Invalid or expired link code. Please run `/link` inside Minecraft to get a fresh code.',
        ephemeral: true
      });
    }

    // Role synchronization on link: check if user bought past items
    const orders = getUserOrders(result.minecraft_username);
    if (orders && orders.length > 0) {
      for (const order of orders) {
        if (order.package_id) {
          await syncMemberRoles(interaction.client, interaction.user.id, order.package_id);
        }
      }
    }

    const embed = new EmbedBuilder()
      .setColor(0x57F287) // Discord Green
      .setTitle('✅ Account Linked Successfully!')
      .setDescription(`Your Discord account has been linked to **${result.minecraft_username}**!`)
      .setThumbnail(`https://mc-heads.net/avatar/${encodeURIComponent(result.minecraft_username)}/128`)
      .addFields(
        { name: 'Minecraft Player', value: `\`${result.minecraft_username}\``, inline: true },
        { name: 'UUID', value: `\`${result.minecraft_uuid}\``, inline: true },
        { name: 'Synced Roles', value: orders.length > 0 ? `Synced from ${orders.length} previous orders` : 'No active store ranks yet', inline: false }
      )
      .setFooter({ text: 'CH|ORIGIN Bridge' })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
};
