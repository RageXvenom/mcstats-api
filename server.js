// server.js
const express = require('express');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());
app.use(cors({ origin: '*' })); // Allow your frontend

// ─────────────────────────────────────────────────────────────────────
// Environment Variables (with validation)
// ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL?.trim();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD?.trim();
const JWT_SECRET = process.env.JWT_SECRET?.trim() || 'fallback-secret-change-me';

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('ERROR: ADMIN_EMAIL and ADMIN_PASSWORD are required in .env');
  process.exit(1);
}

if (JWT_SECRET === 'fallback-secret-change-me') {
  console.warn('WARNING: Using default JWT_SECRET. Generate a strong one!');
}

// ─────────────────────────────────────────────────────────────────────
// SQLite Setup (persistent)
// ─────────────────────────────────────────────────────────────────────
const DB_PATH = path.join(__dirname, 'db.sqlite');
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Database connection error:', err.message);
    process.exit(1);
  } else {
    console.log('Connected to SQLite database at:', DB_PATH);
  }
});

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS announcements (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL,
      createdAt TEXT NOT NULL
    )
  `);
});

// ─────────────────────────────────────────────────────────────────────
// JWT Middleware
// ─────────────────────────────────────────────────────────────────────
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.log('Invalid token from:', req.ip);
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// ─────────────────────────────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────────────────────────────

// 1. Login
app.post('/login', (req, res) => {
  const { email, password } = req.body;

  console.log('Login attempt:', {
    email,
    password_length: password?.length,
    ip: req.ip,
  });

  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: '7d' });
    console.log('Login SUCCESS for:', email);
    res.json({ token });
  } else {
    console.log('Login FAILED:', { email, correct_email: ADMIN_EMAIL });
    res.status(401).json({ error: 'Invalid email or password' });
  }
});

// 2. Get all announcements
app.get('/announcements', (req, res) => {
  db.all('SELECT * FROM announcements ORDER BY createdAt DESC', (err, rows) => {
    if (err) {
      console.error('DB error (GET):', err.message);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

// 3. Add announcement
app.post('/announcements', authenticate, (req, res) => {
  const { title, message, type = 'info' } = req.body;

  if (!title?.trim() || !message?.trim()) {
    return res.status(400).json({ error: 'Title and message are required' });
  }

  const id = Date.now().toString();
  const createdAt = new Date().toISOString();

  db.run(
    `INSERT INTO announcements (id, title, message, type, createdAt) VALUES (?, ?, ?, ?, ?)`,
    [id, title.trim(), message.trim(), type, createdAt],
    function (err) {
      if (err) {
        console.error('DB error (INSERT):', err.message);
        return res.status(500).json({ error: 'Failed to save' });
      }
      console.log('Announcement added:', { id, title });
      res.json({ id, title: title.trim(), message: message.trim(), type, createdAt });
    }
  );
});

// 4. Delete announcement
app.delete('/announcements/:id', authenticate, (req, res) => {
  const { id } = req.params;

  db.run(`DELETE FROM announcements WHERE id = ?`, [id], function (err) {
    if (err) {
      console.error('DB error (DELETE):', err.message);
      return res.status(500).json({ error: 'Failed to delete' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Announcement not found' });
    }
    console.log('Announcement deleted:', id);
    res.json({ success: true });
  });
});

// ─────────────────────────────────────────────────────────────────────
// Health Check
// ─────────────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'OK', time: new Date().toISOString() });
});

// ─────────────────────────────────────────────────────────────────────
// Start Server
// ─────────────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
  console.log(`Admin: ${ADMIN_EMAIL}`);
  console.log(`API URL: https://api.aafatsyndicateroleplay.fun`);
});
