const { db } = require('../database');

module.exports = {
  queueCommands: (orderId, commands) => {
    if (!commands || !Array.isArray(commands)) return;
    const now = Date.now();
    const stmt = db.prepare(`
      INSERT INTO pending_commands (order_id, command, created_at, executed)
      VALUES (?, ?, ?, 0)
    `);
    for (const cmd of commands) {
      if (typeof cmd === 'string' && cmd.trim()) {
        stmt.run(orderId, cmd.trim(), now);
      }
    }
  },

  getPendingCommands: (limit = 50) => {
    const stmt = db.prepare(`
      SELECT id, order_id, command, created_at 
      FROM pending_commands 
      WHERE executed = 0 
      ORDER BY id ASC 
      LIMIT ?
    `);
    return stmt.all(limit);
  },

  markCommandsExecuted: (commandIds) => {
    if (!commandIds || !Array.isArray(commandIds) || commandIds.length === 0) return 0;
    const placeholders = commandIds.map(() => '?').join(',');
    const stmt = db.prepare(`
      UPDATE pending_commands 
      SET executed = 1 
      WHERE id IN (${placeholders})
    `);
    const result = stmt.run(...commandIds);
    return result.changes;
  }
};
