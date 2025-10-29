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
app.use(cors({ origin: '*' })); // Allow all origins

// ─────────────────────────────────────────────────────────────────────
// Environment Variables
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
// SQLite Setup
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
  if (!token) return res.status(401).json({ error: 'No token provided' });

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

// Login
app.post('/login', (req, res) => {
  const { email, password } = req.body;
  console.log('Login attempt:', { email, ip: req.ip });

  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: '7d' });
    console.log('Login SUCCESS for:', email);
    res.json({ token });
  } else {
    console.log('Login FAILED for:', email);
    res.status(401).json({ error: 'Invalid email or password' });
  }
});

// Helper: unified GET handler for announcements
function getAnnouncementsHandler(req, res) {
  db.all('SELECT * FROM announcements ORDER BY createdAt DESC', (err, rows) => {
    if (err) {
      console.error('DB error (GET):', err.message);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
}

// Helper: unified POST handler for announcements
function postAnnouncementHandler(req, res) {
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
}

// Helper: unified DELETE handler for announcements
function deleteAnnouncementHandler(req, res) {
  const { id } = req.params;
  db.run(`DELETE FROM announcements WHERE id = ?`, [id], function (err) {
    if (err) {
      console.error('DB error (DELETE):', err.message);
      return res.status(500).json({ error: 'Failed to delete' });
    }
    if (this.changes === 0) return res.status(404).json({ error: 'Announcement not found' });
    console.log('Announcement deleted:', id);
    res.json({ success: true });
  });
}

// Main routes
app.get('/announcements', getAnnouncementsHandler);
app.post('/announcements', authenticate, postAnnouncementHandler);
app.delete('/announcements/:id', authenticate, deleteAnnouncementHandler);

// API-prefixed aliases for frontend compatibility
app.get('/api/announcements', getAnnouncementsHandler);
app.post('/api/announcements', authenticate, postAnnouncementHandler);
app.delete('/api/announcements/:id', authenticate, deleteAnnouncementHandler);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', time: new Date().toISOString() });
});

// ─────────────────────────────────────────────────────────────────────
// Start Server
// ─────────────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on http://209.25.141.185:${PORT}`);
  console.log(`Admin login email: ${ADMIN_EMAIL}`);
});
