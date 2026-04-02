const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const { initDatabase, saveDb, getDb } = require('./database/init');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// File upload config
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// Helper to convert sql.js result to array of objects
function queryAll(db, sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

function queryOne(db, sql, params = []) {
  const results = queryAll(db, sql, params);
  return results.length > 0 ? results[0] : null;
}

function runSql(db, sql, params = []) {
  db.run(sql, params);
  saveDb(db);
  return { lastInsertRowid: queryOne(db, 'SELECT last_insert_rowid() as id').id };
}

// ============ API ROUTES ============

// GET all events
app.get('/api/events', (req, res) => {
  try {
    const db = getDb();
    const events = queryAll(db, `
      SELECT e.*, ec.category_name 
      FROM event e 
      LEFT JOIN event_category ec ON e.category_id = ec.category_id
      ORDER BY e.event_id
    `);
    res.json({ success: true, data: events });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET events by category
app.get('/api/events/category/:categoryId', (req, res) => {
  try {
    const db = getDb();
    const events = queryAll(db, `
      SELECT e.*, ec.category_name 
      FROM event e 
      LEFT JOIN event_category ec ON e.category_id = ec.category_id
      WHERE e.category_id = ?
      ORDER BY e.event_id
    `, [parseInt(req.params.categoryId)]);
    res.json({ success: true, data: events });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET single event
app.get('/api/events/:id', (req, res) => {
  try {
    const db = getDb();
    const event = queryOne(db, `
      SELECT e.*, ec.category_name 
      FROM event e 
      LEFT JOIN event_category ec ON e.category_id = ec.category_id
      WHERE e.event_id = ?
    `, [parseInt(req.params.id)]);
    
    if (!event) return res.status(404).json({ success: false, error: 'Event not found' });
    res.json({ success: true, data: event });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET all categories
app.get('/api/categories', (req, res) => {
  try {
    const db = getDb();
    const categories = queryAll(db, 'SELECT * FROM event_category');
    res.json({ success: true, data: categories });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST register for an event
app.post('/api/register', (req, res) => {
  try {
    const db = getDb();
    const { event_id, first_name, last_name, email, phone, college_name, team_name, team_members } = req.body;

    if (!event_id || !first_name || !email || !phone || !college_name) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    // Check if email already registered
    const existing = queryOne(db, `
      SELECT r.reg_id FROM registration r
      JOIN student s ON r.student_id = s.student_id
      WHERE r.event_id = ? AND s.email = ?
    `, [event_id, email]);

    if (existing) {
      return res.status(400).json({ success: false, error: 'You have already registered for this event with this email.' });
    }

    // Get event info
    const event = queryOne(db, 'SELECT * FROM event WHERE event_id = ?', [event_id]);
    if (!event) return res.status(404).json({ success: false, error: 'Event not found' });

    // Insert student
    const studentResult = runSql(db, `
      INSERT INTO student (first_name, last_name, email, phone, college_name)
      VALUES (?, ?, ?, ?, ?)
    `, [first_name, last_name || '', email, phone, college_name]);
    const student_id = studentResult.lastInsertRowid;

    let team_id = null;

    // If team event, create team
    if (team_name) {
      const teamResult = runSql(db, 'INSERT INTO team (team_name, event_id) VALUES (?, ?)', [team_name, event_id]);
      team_id = teamResult.lastInsertRowid;

      runSql(db, 'INSERT INTO team_members (team_id, student_id) VALUES (?, ?)', [team_id, student_id]);

      if (team_members && Array.isArray(team_members)) {
        for (const member of team_members) {
          if (member.name && member.phone) {
            const memberResult = runSql(db, `
              INSERT INTO student (first_name, last_name, email, phone, college_name)
              VALUES (?, ?, ?, ?, ?)
            `, [member.name, '', member.email || '', member.phone, member.college || college_name]);
            runSql(db, 'INSERT INTO team_members (team_id, student_id) VALUES (?, ?)', [team_id, memberResult.lastInsertRowid]);
          }
        }
      }
    }

    // Create payment record
    let payment_id = null;
    if (event.fee > 0) {
      const paymentResult = runSql(db, `
        INSERT INTO payment (amount, payment_status, payment_mode) VALUES (?, 'pending', 'pending')
      `, [event.fee]);
      payment_id = paymentResult.lastInsertRowid;
    }

    // Create registration
    const regResult = runSql(db, `
      INSERT INTO registration (event_id, student_id, team_id, payment_id, status)
      VALUES (?, ?, ?, ?, ?)
    `, [event_id, student_id, team_id, payment_id, event.fee > 0 ? 'pending_payment' : 'confirmed']);

    res.json({
      success: true,
      data: {
        registration_id: regResult.lastInsertRowid,
        status: event.fee > 0 ? 'pending_payment' : 'confirmed',
        event_name: event.event_name,
        fee: event.fee
      },
      message: event.fee > 0 
        ? `Registration successful! Please complete payment of ${event.fee_label} to confirm. Payment integration coming soon — pay at venue.`
        : 'Registration confirmed! See you at the event!'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET registration status
app.get('/api/registration/:id', (req, res) => {
  try {
    const db = getDb();
    const reg = queryOne(db, `
      SELECT r.*, e.event_name, e.fee, e.fee_label, s.first_name, s.last_name, s.email, s.phone, s.college_name,
             t.team_name, p.payment_status, p.amount
      FROM registration r
      JOIN event e ON r.event_id = e.event_id
      JOIN student s ON r.student_id = s.student_id
      LEFT JOIN team t ON r.team_id = t.team_id
      LEFT JOIN payment p ON r.payment_id = p.payment_id
      WHERE r.reg_id = ?
    `, [parseInt(req.params.id)]);

    if (!reg) return res.status(404).json({ success: false, error: 'Registration not found' });
    res.json({ success: true, data: reg });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET all registrations
app.get('/api/registrations', (req, res) => {
  try {
    const db = getDb();
    const regs = queryAll(db, `
      SELECT r.*, e.event_name, s.first_name, s.last_name, s.email, s.phone, s.college_name,
             t.team_name, p.payment_status, p.amount
      FROM registration r
      JOIN event e ON r.event_id = e.event_id
      JOIN student s ON r.student_id = s.student_id
      LEFT JOIN team t ON r.team_id = t.team_id
      LEFT JOIN payment p ON r.payment_id = p.payment_id
      ORDER BY r.registration_date DESC
    `);
    res.json({ success: true, data: regs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET stats
app.get('/api/stats', (req, res) => {
  try {
    const db = getDb();
    const totalEvents = queryOne(db, 'SELECT COUNT(*) as count FROM event').count;
    const totalRegistrations = queryOne(db, 'SELECT COUNT(*) as count FROM registration').count;
    const totalStudents = queryOne(db, 'SELECT COUNT(*) as count FROM student').count;
    const eventStats = queryAll(db, `
      SELECT e.event_name, COUNT(r.reg_id) as registrations
      FROM event e
      LEFT JOIN registration r ON e.event_id = r.event_id
      GROUP BY e.event_id
      ORDER BY registrations DESC
    `);
    res.json({ success: true, data: { totalEvents, totalRegistrations, totalStudents, eventStats } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// File upload
app.post('/api/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });
    res.json({ success: true, data: { filename: req.file.filename, path: `/uploads/${req.file.filename}` } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.use('/uploads', express.static(uploadsDir));

// SPA fallback
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    const filePath = path.join(__dirname, 'public', req.path);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      return res.sendFile(filePath);
    }
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
});

// Start server
async function start() {
  await initDatabase();
  app.listen(PORT, () => {
    console.log(`\n🎉 Genesis'26 Server running at http://localhost:${PORT}`);
    console.log(`📋 API: http://localhost:${PORT}/api/events`);
    console.log(`🌐 Website: http://localhost:${PORT}\n`);
  });
}

start();
