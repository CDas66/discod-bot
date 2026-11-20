const express = require('express');
const router = express.Router();
const config = require('../../config');
const { db, getLinkedUserByUsername, getLinkedUserByUUID } = require('../../database');
const { queueCommands } = require('../../services/deliveryQueue');
const { announcePurchase } = require('../../bot/services/announcer');
const { syncMemberRoles } = require('../../bot/services/roleSync');

/**
 * Authentication middleware for webstore webhook
 */
const requireAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') 
    ? authHeader.slice(7) 
    : req.headers['x-api-key'] || req.query.secret;

  if (!token || token !== config.api.secretKey) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Invalid API secret token' });
  }
  next();
};

/**
 * POST /api/webstore/webhook
 * Receives purchase notifications from the Webstore
 * 
 * Expected payload:
 * {
 *   "orderId": "ORD-12345",
 *   "username": "Steve",
 *   "uuid": "optional-minecraft-uuid",
 *   "packageId": "vip",
 *   "packageName": "VIP Rank",
 *   "price": 9.99,
 *   "currency": "USD",
 *   "commands": ["lp user Steve parent add vip", "say Steve bought VIP!"] // optional custom commands
 * }
 */
router.post('/webhook', requireAuth, async (req, res) => {
  try {
    const {
      orderId,
      username,
      uuid,
      packageId,
      packageName,
      price,
      currency = 'USD',
      commands = []
    } = req.body;

    if (!username && !uuid) {
      return res.status(400).json({ success: false, error: 'Missing username or uuid in payload' });
    }

    const orderIdentifier = orderId || `ORD-${Date.now()}`;

    // Find if user is linked in Discord
    let linked = null;
    if (uuid) linked = getLinkedUserByUUID(uuid);
    if (!linked && username) linked = getLinkedUserByUsername(username);

    const discordId = linked ? linked.discord_id : null;

    // Save order in database
    const now = Date.now();
    try {
      db.prepare(`
        INSERT OR IGNORE INTO orders (order_id, minecraft_username, minecraft_uuid, discord_id, package_id, package_name, price, currency, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(orderIdentifier, username || '', uuid || '', discordId, packageId || '', packageName || 'Item', price || 0, currency, now);
    } catch (dbErr) {
      console.error('[Webstore Route] DB Error:', dbErr);
    }

    // Default command generator if no explicit commands provided
    let finalCommands = Array.isArray(commands) ? [...commands] : [];
    if (finalCommands.length === 0 && packageId) {
      // Common LuckPerms grant command
      finalCommands.push(`lp user ${username} parent add ${packageId.toLowerCase()}`);
      finalCommands.push(`tellraw @a [{"text":"[CH|ORIGIN Store] ","color":"gold","bold":true},{"text":"${username}","color":"yellow"},{"text":" purchased ","color":"white"},{"text":"${packageName || packageId}","color":"green"},{"text":"! Thank you!","color":"white"}]`);
    }

    // Queue in-game commands for Paper server
    if (finalCommands.length > 0) {
      queueCommands(orderIdentifier, finalCommands);
    }

    // Post Discord announcement
    const client = req.app.get('discordClient');
    if (client) {
      announcePurchase(client, {
        orderId: orderIdentifier,
        username,
        packageName: packageName || packageId,
        price,
        currency,
        discordId
      });

      // Grant Discord role if player is linked
      if (discordId && packageId) {
        syncMemberRoles(client, discordId, packageId);
      }
    }

    return res.json({
      success: true,
      message: 'Purchase processed and queued successfully',
      orderId: orderIdentifier,
      queuedCommands: finalCommands.length,
      linkedDiscordUser: discordId
    });
  } catch (error) {
    console.error('[Webstore Route] Error handling webhook:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

module.exports = router;
