const express = require('express');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());
app.use(cors());

const SECRET = process.env.JWT_SECRET || 'your-secret-key';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const DB_FILE = './announcements.json';

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env');
  process.exit(1);
}

function loadAnnouncements() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, '[]');
    return [];
  }
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function saveAnnouncements(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

const authenticate = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  jwt.verify(token, SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

app.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    const token = jwt.sign({ email }, SECRET, { expiresIn: '1h' });
    res.json({ token });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

app.get('/announcements', (req, res) => {
  res.json(loadAnnouncements());
});

app.post('/announcements', authenticate, (req, res) => {
  const announcements = loadAnnouncements();
  const newAnnouncement = {
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
    ...req.body
  };
  announcements.unshift(newAnnouncement);
  saveAnnouncements(announcements);
  res.json(newAnnouncement);
});

app.delete('/announcements/:id', authenticate, (req, res) => {
  let announcements = loadAnnouncements();
  announcements = announcements.filter(a => a.id !== req.params.id);
  saveAnnouncements(announcements);
  res.json({ success: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
