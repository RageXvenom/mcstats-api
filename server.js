// server.js
const express = require('express');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
require('dotenv').config();

const app = express();
app.use(bodyParser.json());
app.use(cors({ origin: '*' })); // Allow your frontend

const SECRET = process.env.JWT_SECRET || 'fallback';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const DB_FILE = './db.sqlite';

// Validate env
if (!ADMIN_EMAIL || !ADMIN_PASSWORD || !SECRET) {
  console.error('Missing ADMIN_EMAIL, ADMIN_PASSWORD, or JWT_SECRET');
  process.exit(1);
}

// Init DB
const db = new sqlite3.Database(DB_FILE);
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS announcements (
      id TEXT PRIMARY KEY,
      title TEXT,
      message TEXT,
      type TEXT,
      createdAt TEXT
    )
  `);
});

// Middleware
const authenticate = (req, res, next) => {
  const auth = req.headers.authorization;
  const token = auth?.startsWith('Bearer ') ? auth.split(' ')[1] : null;
  if (!token) return res.status(401).json({ error: 'No token' });

  jwt.verify(token, SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

// Routes
app.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    const token = jwt.sign({ email }, SECRET, { expiresIn: '7d' });
    res.json({ token });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

app.get('/announcements', (req, res) => {
  db.all('SELECT * FROM announcements ORDER BY createdAt DESC', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/announcements', authenticate, (req, res) => {
  const { title, message, type = 'info' } = req.body;
  if (!title || !message) return res.status(400).json({ error: 'Title and message required' });

  const id = Date.now().toString();
  const createdAt = new Date().toISOString();

  db.run(
    `INSERT INTO announcements (id, title, message, type, createdAt) VALUES (?, ?, ?, ?, ?)`,
    [id, title, message, type, createdAt],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id, title, message, type, createdAt });
    }
  );
});

app.delete('/announcements/:id', authenticate, (req, res) => {
  db.run(`DELETE FROM announcements WHERE id = ?`, [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API running on port ${PORT}`));
