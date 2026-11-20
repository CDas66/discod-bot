const { EmbedBuilder } = require('discord.js');
const config = require('../../config');

module.exports = {
  announcePurchase: async (client, orderData) => {
    const channelId = config.discord.purchaseChannelId;
    if (!channelId) {
      console.warn('[Announcer] DISCORD_PURCHASE_CHANNEL_ID is not configured, skipping public announcement.');
      return;
    }

    try {
      const channel = await client.channels.fetch(channelId);
      if (!channel || !channel.isTextBased()) {
        console.warn(`[Announcer] Channel ${channelId} not found or not text-based.`);
        return;
      }

      const {
        username,
        packageName,
        price,
        currency = 'USD',
        discordId
      } = orderData;

      // Clean skin avatar URL
      const avatarUrl = username 
        ? `https://mc-heads.net/avatar/${encodeURIComponent(username)}/128`
        : 'https://mc-heads.net/avatar/MHF_Steve/128';

      const embed = new EmbedBuilder()
        .setColor(0xFFA500) // Gold / Orange
        .setTitle('🛒 Store Purchase Received!')
        .setDescription(`**${username || 'A player'}** just supported the server by purchasing **${packageName}**!`)
        .addFields(
          { name: '👤 In-Game Player', value: `\`${username || 'Unknown'}\``, inline: true },
          { name: '📦 Package', value: `\`${packageName || 'Store Item'}\``, inline: true },
          { name: '💰 Total', value: `\`${currency} ${price !== undefined ? price : 'N/A'}\``, inline: true }
        )
        .setThumbnail(avatarUrl)
        .setFooter({ text: 'CH|ORIGIN Store • Thank you for your support!' })
        .setTimestamp();

      if (discordId) {
        embed.addFields({ name: '🔗 Discord Member', value: `<@${discordId}>`, inline: true });
      }

      await channel.send({ embeds: [embed] });
      console.log(`[Announcer] Sent purchase announcement for ${username} (${packageName})`);
    } catch (err) {
      console.error('[Announcer] Failed to send purchase announcement:', err);
    }
  }
};
