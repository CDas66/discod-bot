const config = require('../../config');

module.exports = {
  syncMemberRoles: async (client, discordId, packageOrRank) => {
    if (!discordId || !config.discord.guildId) return;

    try {
      const guild = await client.guilds.fetch(config.discord.guildId);
      if (!guild) return;

      const member = await guild.members.fetch(discordId).catch(() => null);
      if (!member) {
        console.log(`[RoleSync] Discord member ${discordId} not in guild.`);
        return;
      }

      const key = (packageOrRank || '').toLowerCase().trim();
      const roleId = config.discord.roleMappings[key];

      if (roleId) {
        if (!member.roles.cache.has(roleId)) {
          await member.roles.add(roleId);
          console.log(`[RoleSync] Added role ${roleId} (${key}) to ${member.user.tag}`);
        } else {
          console.log(`[RoleSync] Member ${member.user.tag} already has role ${roleId}`);
        }
      }
    } catch (err) {
      console.error(`[RoleSync] Error syncing roles for ${discordId}:`, err);
    }
  }
};
