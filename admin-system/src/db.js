const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = process.env.DB_PATH || path.join(DATA_DIR, 'clinic.db');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS patients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  phone_enc TEXT,
  email_enc TEXT,
  notes_enc TEXT,
  consent_given INTEGER NOT NULL DEFAULT 0,
  consent_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS appointments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  starts_at TEXT NOT NULL,
  ends_at TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled',
  notes_enc TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id INTEGER,
  details TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_starts_at ON appointments(starts_at);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_log(created_at);
`);

// Τυποποιημένα πεδία ανά συνεδρία (θέμα, διάθεση, αξιολόγηση προόδου, επόμενα βήματα).
// Προστίθενται με ALTER TABLE ώστε να μη χαθούν ήδη υπάρχουσες βάσεις.
const appointmentColumns = db.prepare('PRAGMA table_info(appointments)').all().map((c) => c.name);
function addColumnIfMissing(name, definition) {
  if (!appointmentColumns.includes(name)) {
    db.exec(`ALTER TABLE appointments ADD COLUMN ${name} ${definition}`);
  }
}
addColumnIfMissing('topic_enc', 'TEXT');
addColumnIfMissing('plan_enc', 'TEXT');
addColumnIfMissing('mood_rating', 'INTEGER');
addColumnIfMissing('progress_rating', 'INTEGER');

module.exports = db;
