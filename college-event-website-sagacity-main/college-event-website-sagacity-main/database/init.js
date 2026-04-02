const initSQL = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'genesis.db');

let dbInstance = null;

async function initDatabase() {
  if (dbInstance) return dbInstance;

  const SQL = await initSQL();
  
  let db;
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS event_category (
      category_id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_name VARCHAR(100) NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS event (
      event_id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_name VARCHAR(200) NOT NULL,
      category_id INTEGER,
      competition_type VARCHAR(50),
      description TEXT,
      rules TEXT,
      min_participants INTEGER DEFAULT 1,
      max_participants INTEGER DEFAULT 1,
      date VARCHAR(50),
      venue VARCHAR(200),
      fee INTEGER DEFAULT 0,
      fee_label VARCHAR(200),
      prize_pool TEXT,
      coordinator_name VARCHAR(200),
      coordinator_phone VARCHAR(20),
      image_icon VARCHAR(50) DEFAULT '🎯'
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS student (
      student_id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name VARCHAR(100) NOT NULL,
      last_name VARCHAR(100),
      email VARCHAR(200) NOT NULL,
      phone VARCHAR(20) NOT NULL,
      college_name VARCHAR(200) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS team (
      team_id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_name VARCHAR(200),
      event_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS team_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id INTEGER,
      student_id INTEGER
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS registration (
      reg_id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER,
      student_id INTEGER,
      team_id INTEGER,
      payment_id INTEGER,
      status VARCHAR(50) DEFAULT 'pending',
      registration_date DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS faculty_coordinator (
      coord_id INTEGER PRIMARY KEY AUTOINCREMENT,
      name VARCHAR(200),
      email VARCHAR(200),
      phone VARCHAR(20)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS event_coordinator (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER,
      coord_id INTEGER
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS payment (
      payment_id INTEGER PRIMARY KEY AUTOINCREMENT,
      amount INTEGER,
      payment_status VARCHAR(50) DEFAULT 'pending',
      payment_mode VARCHAR(50),
      transaction_id VARCHAR(200),
      payment_date DATETIME
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS submission (
      submission_id INTEGER PRIMARY KEY AUTOINCREMENT,
      reg_id INTEGER,
      file_type VARCHAR(50),
      file_url VARCHAR(500),
      uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Save to disk
  saveDb(db);
  dbInstance = db;
  return db;
}

function saveDb(db) {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

function getDb() {
  return dbInstance;
}

module.exports = { initDatabase, saveDb, getDb, DB_PATH };
