import Database from 'better-sqlite3';
import { readFileSync, mkdirSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../../data');
const DB_PATH = path.join(DATA_DIR, 'satellites.db');

if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

let db;

export function getDB() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    db.pragma('synchronous = NORMAL');
    db.pragma('cache_size = 10000');
    db.pragma('temp_store = memory');
  }
  return db;
}

export function initDB() {
  const database = getDB();
  const schema = readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  const statements = schema.split(';').map(s => s.trim()).filter(s => s.length > 10);
  const migrate = database.transaction(() => {
    statements.forEach(stmt => {
      try { database.prepare(stmt + ';').run(); } catch (e) {
        if (!e.message.includes('already exists')) console.warn('Schema warn:', e.message);
      }
    });
  });
  migrate();
  console.log('✅ Database initialized:', DB_PATH);
  return database;
}

export default getDB;
