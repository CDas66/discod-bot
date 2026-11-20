const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getLinkedUserByDiscordId, getLinkedUserByUsername, getUserOrders } = require('../../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('profile')
    .setDescription('View Minecraft profile and linked account details')
    .addUserOption(option => 
      option.setName('user')
        .setDescription('Discord user to view')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('player')
        .setDescription('Minecraft username to lookup')
        .setRequired(false)
    ),

  async execute(interaction) {
    const targetUser = interaction.options.getUser('user');
    const targetPlayerName = interaction.options.getString('player');

    let linkData = null;
    let discordUserId = null;

    if (targetPlayerName) {
      linkData = getLinkedUserByUsername(targetPlayerName);
    } else if (targetUser) {
      discordUserId = targetUser.id;
      linkData = getLinkedUserByDiscordId(discordUserId);
    } else {
      discordUserId = interaction.user.id;
      linkData = getLinkedUserByDiscordId(discordUserId);
    }

    if (!linkData) {
      const targetDesc = targetPlayerName || (targetUser ? targetUser.tag : 'You');
      return interaction.reply({
        content: `ℹ️ No linked Minecraft account found for **${targetDesc}**.`,
        ephemeral: true
      });
    }

    const orders = getUserOrders(linkData.minecraft_username);
    const purchaseSummary = orders.length > 0 
      ? orders.slice(0, 5).map(o => `• **${o.package_name || o.package_id}** (${o.currency} ${o.price})`).join('\n')
      : 'No store purchases recorded.';

    const embed = new EmbedBuilder()
      .setColor(0x5865F2) // Blurple
      .setTitle(`🛡️ Profile: ${linkData.minecraft_username}`)
      .setThumbnail(`https://mc-heads.net/avatar/${encodeURIComponent(linkData.minecraft_username)}/128`)
      .addFields(
        { name: 'Minecraft Username', value: `\`${linkData.minecraft_username}\``, inline: true },
        { name: 'Linked Discord', value: `<@${linkData.discord_id}>`, inline: true },
        { name: 'Linked Date', value: `<t:${Math.floor(linkData.linked_at / 1000)}:R>`, inline: true },
        { name: '🛒 Store Purchases', value: purchaseSummary, inline: false }
      )
      .setFooter({ text: 'CH|ORIGIN Server & Webstore Bridge' })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
};
