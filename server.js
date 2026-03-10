try { require('dotenv').config(); } catch(e) {}
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const basicAuth = require('express-basic-auth');
const path = require('path');

const addonRoutes = require('./routes/addon');
const dashboardRoutes = require('./routes/dashboard');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── MIDDLEWARE ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── DATABASE (Vercel serverless safe) ───────────────────────────────────────
let isConnected = false;
async function connectDB() {
  if (isConnected) return;
  await mongoose.connect(process.env.MONGODB_URI);
  isConnected = true;
}

app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    res.status(500).json({ error: 'Database connection failed' });
  }
});

// ─── STREMIO ADDON ROUTES (public) ───────────────────────────────────────────
app.use('/', addonRoutes);

// ─── DASHBOARD AUTH ──────────────────────────────────────────────────────────
const dashboardAuth = basicAuth({
  users: {
    [process.env.DASHBOARD_USER || 'admin']: process.env.DASHBOARD_PASS || 'admin123'
  },
  challenge: true,
  realm: 'Stremio Dashboard'
});

// ─── DASHBOARD API (protected) ───────────────────────────────────────────────
app.use('/api', dashboardAuth, dashboardRoutes);

// ─── DASHBOARD UI (protected) ────────────────────────────────────────────────
app.use('/dashboard', dashboardAuth, express.static(path.join(__dirname, 'public')));
app.get('/dashboard', dashboardAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// ─── ROOT INFO ───────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  const baseUrl = process.env.ADDON_BASE_URL || `http://localhost:${PORT}`;
  res.json({
    name: process.env.ADDON_NAME || 'My Stremio Addon',
    version: '1.0.0',
    manifest: `${baseUrl}/manifest.json`,
    stremioInstall: `stremio://${baseUrl.replace(/^https?:\/\//, '')}/manifest.json`,
    dashboard: `${baseUrl}/dashboard`,
    status: 'running'
  });
});

// ─── LOCAL DEV ONLY ──────────────────────────────────────────────────────────
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 Running on http://localhost:${PORT}`);
  });
}

module.exports = app;
