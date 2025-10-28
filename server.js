// server.js
const express = require('express');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
require('dotenv').config();

const app = express();
app.use(bodyParser.json());
app.use(cors());

const SECRET = process.env.JWT_SECRET || 'fallback-secret';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const DB_FILE = './db.sqlite';

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD in .env');
  process.exit(1);
}

// === Initialize SQLite ===
const db = new sqlite3.Database(DB_FILE, (err) => {
  if (err) console.error('DB error:', err);
  else console.log('SQLite connected');
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

// === Middleware ===
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });

  jwt.verify(token, SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

// === Routes ===
app.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    const token = jwt.sign({ email }, SECRET, { expiresIn: '24h' });
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

// === Start ===
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API running on port ${PORT}`);
});
