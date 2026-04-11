const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { pool } = require('../db');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { downloadImage } = require('../agent/imageDownloader');

const PAGE_SIZE = 20;

// multer for manual image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = process.env.UPLOAD_DIR || './uploads/deals';
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `upload_${Date.now()}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

function calcTemperature(hotVotes, coldVotes, createdAt) {
  const hoursSince = (Date.now() - new Date(createdAt).getTime()) / 3600000;
  const decay = 1 / (1 + hoursSince * 0.1);
  return Math.round((hotVotes - coldVotes) * decay * 10) / 10;
}

// GET /api/deals
router.get('/', optionalAuth, async (req, res) => {
  const { tab = 'new', category, page = 1, search } = req.query;
  const offset = (parseInt(page) - 1) * PAGE_SIZE;

  let orderBy = 'deals.created_at DESC';
  if (tab === 'hottest') orderBy = 'deals.temperature DESC';
  else if (tab === 'hot') orderBy = 'deals.temperature DESC';
  else if (tab === 'highlights') orderBy = 'deals.hot_votes DESC';
  else if (tab === 'trends') orderBy = 'deals.trend_score DESC';

  let where = "deals.status = 'active'";
  const params = [];

  if (tab === 'hot') {
    where += ' AND deals.temperature > 50';
  }
  if (tab === 'trends') {
    where += ' AND deals.trend_score >= 2.0';
  }
  if (category) {
    where += ' AND categories.slug = ?';
    params.push(category);
  }
  if (search) {
    where += ' AND (deals.title LIKE ? OR deals.merchant LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  try {
    const [rows] = await pool.execute(
      `SELECT deals.*, categories.name AS category_name, categories.slug AS category_slug,
              users.username AS posted_by
       FROM deals
       LEFT JOIN categories ON deals.category_id = categories.id
       LEFT JOIN users ON deals.user_id = users.id
       WHERE ${where}
       ORDER BY ${orderBy}
       LIMIT ${PAGE_SIZE} OFFSET ${offset}`,
      params
    );

    const [countRows] = await pool.execute(
      `SELECT COUNT(*) AS total FROM deals
       LEFT JOIN categories ON deals.category_id = categories.id
       WHERE ${where}`,
      params
    );

    res.json({
      deals: rows,
      total: countRows[0].total,
      page: parseInt(page),
      pages: Math.ceil(countRows[0].total / PAGE_SIZE),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/deals/:id
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT deals.*, categories.name AS category_name, categories.slug AS category_slug,
              users.username AS posted_by
       FROM deals
       LEFT JOIN categories ON deals.category_id = categories.id
       LEFT JOIN users ON deals.user_id = users.id
       WHERE deals.id = ?`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Deal not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/deals — submit new deal
router.post('/', requireAuth, upload.single('image'), async (req, res) => {
  const { title, description, price, original_price, merchant, url, category_id, image_url, expires_at } = req.body;
  if (!title || !url) {
    return res.status(400).json({ error: 'Title and URL are required' });
  }

  let imagePath = null;
  try {
    if (req.file) {
      imagePath = `/uploads/deals/${req.file.filename}`;
    } else if (image_url) {
      imagePath = await downloadImage(image_url, `user_${Date.now()}`);
    }

    const [result] = await pool.execute(
      `INSERT INTO deals (title, description, price, original_price, merchant, url, image_path,
        category_id, user_id, source, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'user', ?)`,
      [title, description || null, price || null, original_price || null,
       merchant || null, url, imagePath, category_id || null,
       req.user.id, expires_at || null]
    );

    const [rows] = await pool.execute('SELECT * FROM deals WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/deals/:id
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM deals WHERE id = ?', [req.params.id]);
    const deal = rows[0];
    if (!deal) return res.status(404).json({ error: 'Deal not found' });
    if (deal.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }
    await pool.execute('DELETE FROM deals WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
