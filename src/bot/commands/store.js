const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('store')
    .setDescription('View store info and links')
    .addSubcommand(sub =>
      sub.setName('info')
        .setDescription('Show store link and information')
    )
    .addSubcommand(sub =>
      sub.setName('lookup')
        .setDescription('Look up a player\'s store purchases (admin)')
        .addStringOption(option =>
          option.setName('player')
            .setDescription('Minecraft username')
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'info') {
      const embed = new EmbedBuilder()
        .setColor(0xFFA500)
        .setTitle('🛒 CH|ORIGIN Webstore')
        .setDescription(
          '**Visit our store to support the server and unlock exclusive perks!**\n\n' +
          '> 🌐 [**Click here to open the store**](https://your-webstore-url.com)\n\n' +
          '**How to link your account:**\n' +
          '1. Join the Minecraft server\n' +
          '2. Type `/link` in-game to get a code\n' +
          '3. Use `/link <code>` here in Discord\n' +
          '4. Purchases will auto-sync your roles!'
        )
        .setFooter({ text: 'CH|ORIGIN Store' })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    if (subcommand === 'lookup') {
      if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild)) {
        return interaction.reply({ content: '❌ You need **Manage Server** permission.', ephemeral: true });
      }

      const { getUserOrders } = require('../../database');
      const playerName = interaction.options.getString('player');
      const orders = getUserOrders(playerName);

      if (orders.length === 0) {
        return interaction.reply({ content: `No purchase records found for **${playerName}**.`, ephemeral: true });
      }

      const list = orders.slice(0, 10).map((o, i) =>
        `\`${i + 1}.\` **${o.package_name}** — ${o.currency} ${o.price} — <t:${Math.floor(o.created_at / 1000)}:R>`
      ).join('\n');

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(`🛒 Purchase History: ${playerName}`)
        .setThumbnail(`https://mc-heads.net/avatar/${encodeURIComponent(playerName)}/128`)
        .setDescription(list)
        .setFooter({ text: `Total: ${orders.length} orders` })
        .setTimestamp();

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
  }
};
