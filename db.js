// Opens the SQLite database, creates tables from schema.sql and loads demo data on first run.
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DB_FILE = path.join(__dirname, 'vehicle_service.db');
const DB_DIR = path.join(__dirname, '..', 'database');

if (process.argv.includes('--reset') && fs.existsSync(DB_FILE)) {
  fs.unlinkSync(DB_FILE);
  console.log('Old database removed.');
}

const db = new Database(DB_FILE);
db.pragma('foreign_keys = ON');
db.exec(fs.readFileSync(path.join(DB_DIR, 'schema.sql'), 'utf8'));

if (db.prepare('SELECT COUNT(*) AS n FROM customers').get().n === 0) {
  db.exec(fs.readFileSync(path.join(DB_DIR, 'seed.sql'), 'utf8'));
  console.log('Demo data loaded.');
}

module.exports = db;
if (require.main === module) console.log('Database ready:', DB_FILE);
