const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');

const dataDir = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = process.env.DATABASE_PATH || path.join(dataDir, 'bridge.db');
const db = new DatabaseSync(dbPath);

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS linked_users (
    discord_id TEXT PRIMARY KEY,
    minecraft_uuid TEXT UNIQUE,
    minecraft_username TEXT,
    linked_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS link_codes (
    code TEXT PRIMARY KEY,
    minecraft_uuid TEXT NOT NULL,
    minecraft_username TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id TEXT UNIQUE,
    minecraft_username TEXT,
    minecraft_uuid TEXT,
    discord_id TEXT,
    package_id TEXT,
    package_name TEXT,
    price REAL,
    currency TEXT,
    created_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS pending_commands (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id TEXT,
    command TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    executed INTEGER DEFAULT 0
  );
`);

module.exports = {
  db,
  // Helper queries
  getLinkedUserByDiscordId: (discordId) => {
    const stmt = db.prepare('SELECT * FROM linked_users WHERE discord_id = ?');
    return stmt.get(discordId);
  },
  getLinkedUserByUUID: (uuid) => {
    const stmt = db.prepare('SELECT * FROM linked_users WHERE minecraft_uuid = ?');
    return stmt.get(uuid);
  },
  getLinkedUserByUsername: (username) => {
    const stmt = db.prepare('SELECT * FROM linked_users WHERE LOWER(minecraft_username) = LOWER(?)');
    return stmt.get(username);
  },
  saveLinkCode: (code, uuid, username, ttlSeconds = 600) => {
    const now = Date.now();
    const expiresAt = now + (ttlSeconds * 1000);
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO link_codes (code, minecraft_uuid, minecraft_username, created_at, expires_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(code, uuid, username, now, expiresAt);
  },
  getLinkCode: (code) => {
    const stmt = db.prepare('SELECT * FROM link_codes WHERE code = ?');
    const row = stmt.get(code);
    if (!row) return null;
    if (Date.now() > row.expires_at) {
      db.prepare('DELETE FROM link_codes WHERE code = ?').run(code);
      return null;
    }
    return row;
  },
  consumeLinkCode: (code, discordId) => {
    const row = module.exports.getLinkCode(code);
    if (!row) return null;

    const now = Date.now();
    // Insert or update linked_users
    db.prepare(`
      INSERT OR REPLACE INTO linked_users (discord_id, minecraft_uuid, minecraft_username, linked_at)
      VALUES (?, ?, ?, ?)
    `).run(discordId, row.minecraft_uuid, row.minecraft_username, now);

    // Delete used code
    db.prepare('DELETE FROM link_codes WHERE code = ?').run(code);
    return row;
  },
  unlinkUser: (discordId) => {
    const stmt = db.prepare('DELETE FROM linked_users WHERE discord_id = ?');
    return stmt.run(discordId);
  },
  getUserOrders: (usernameOrUuid) => {
    const stmt = db.prepare(`
      SELECT * FROM orders 
      WHERE LOWER(minecraft_username) = LOWER(?) OR minecraft_uuid = ?
      ORDER BY created_at DESC
    `);
    return stmt.all(usernameOrUuid, usernameOrUuid);
  }
};
