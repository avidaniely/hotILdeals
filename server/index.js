require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { initDb } = require('./db');
const { startScheduler } = require('./agent/dealCollector');
const { startTrendScheduler } = require('./agent/trendCalculator');
const { startHottestScheduler } = require('./agent/hottestCalculator');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// serve uploaded images
const uploadDir = process.env.UPLOAD_DIR || './uploads/deals';
fs.mkdirSync(uploadDir, { recursive: true });
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/deals', require('./routes/deals'));
app.use('/api/votes', require('./routes/votes'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/admin',    require('./routes/admin'));
app.use('/api/messages', require('./routes/messages'));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// serve React build in production
const clientBuild = path.join(__dirname, 'public');
if (fs.existsSync(clientBuild)) {
  app.use(express.static(clientBuild));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientBuild, 'index.html'));
  });
}

async function start() {
  try {
    await initDb();
    app.listen(PORT, () => {
      console.log(`HotILDeals server running on port ${PORT}`);
    });
    startScheduler();
    startTrendScheduler();
    startHottestScheduler();
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
