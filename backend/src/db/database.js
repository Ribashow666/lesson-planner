const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/lesson_plans.db');

let db;

async function initDb() {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
    logger.info('Database loaded from file', { path: DB_PATH });
  } else {
    db = new SQL.Database();
    logger.info('New database created', { path: DB_PATH });
  }

  initializeSchema();
  return db;
}

function save() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, buffer);
}

function initializeSchema() {
  db.run(`
    CREATE TABLE IF NOT EXISTS lesson_plans (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      objective TEXT NOT NULL,
      summary TEXT NOT NULL,
      scheduled_date TEXT NOT NULL,
      discipline TEXT NOT NULL,
      contents TEXT DEFAULT '',
      support_resources TEXT DEFAULT '',
      tags TEXT DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_lesson_plans_discipline ON lesson_plans(discipline);
    CREATE INDEX IF NOT EXISTS idx_lesson_plans_scheduled_date ON lesson_plans(scheduled_date);
    CREATE INDEX IF NOT EXISTS idx_lesson_plans_title ON lesson_plans(title);
  `);
  save();
  logger.info('Database schema initialized');
}

function getDb() {
  if (!db) throw new Error('Database not initialized. Call initDb() first.');
  return db;
}

function all(sql, params) {
  const stmt = db.prepare(sql);
  if (params) stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

function get(sql, params) {
  const rows = all(sql, params);
  return rows[0] || null;
}

function run(sql, params) {
  db.run(sql, params);
  save();
}

function count(sql, params) {
  const row = get(sql, params);
  if (!row) return 0;
  return Number(Object.values(row)[0]) || 0;
}

module.exports = { initDb, getDb, all, get, run, count };
