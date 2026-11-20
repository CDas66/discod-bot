const express = require('express');
const router = express.Router();
const config = require('../../config');
const { saveLinkCode, getLinkedUserByUUID } = require('../../database');
const { getPendingCommands, markCommandsExecuted } = require('../../services/deliveryQueue');

/**
 * Authentication middleware for Minecraft Paper plugin
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
 * POST /api/minecraft/link/request
 * Called by Paper plugin when player types /link in-game
 * Generates an expiring 6-digit link code
 */
router.post('/link/request', requireAuth, (req, res) => {
  const { uuid, username } = req.body;
  if (!uuid || !username) {
    return res.status(400).json({ success: false, error: 'Missing uuid or username' });
  }

  // Generate 6-digit alphanumeric code
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  const ttlSeconds = 600; // 10 minutes
  saveLinkCode(code, uuid, username, ttlSeconds);

  return res.json({
    success: true,
    code,
    expiresInSeconds: ttlSeconds,
    instructions: `Type /link ${code} in the CH|ORIGIN Discord server!`
  });
});

/**
 * GET /api/minecraft/deliveries
 * Called by Paper plugin to poll for pending console commands to execute
 */
router.get('/deliveries', requireAuth, (req, res) => {
  const limit = parseInt(req.query.limit || '20', 10);
  const commands = getPendingCommands(limit);
  return res.json({
    success: true,
    count: commands.length,
    commands
  });
});

/**
 * POST /api/minecraft/deliveries/confirm
 * Called by Paper plugin after commands have executed in console
 */
router.post('/deliveries/confirm', requireAuth, (req, res) => {
  const { commandIds } = req.body;
  if (!Array.isArray(commandIds)) {
    return res.status(400).json({ success: false, error: 'commandIds array required' });
  }

  const updatedCount = markCommandsExecuted(commandIds);
  return res.json({
    success: true,
    confirmedCount: updatedCount
  });
});

/**
 * GET /api/minecraft/check-link/:uuid
 * Checks if a player has linked their Discord account
 */
router.get('/check-link/:uuid', requireAuth, (req, res) => {
  const { uuid } = req.params;
  const linked = getLinkedUserByUUID(uuid);
  return res.json({
    success: true,
    linked: !!linked,
    data: linked || null
  });
});

module.exports = router;
