const router = require('express').Router();
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { runDealHunter } = require('../agent/dealHunter');

const BOT_USER_ID = 1; // hotilbot system user

function calcTemperature(hotVotes, coldVotes, createdAt) {
  const hoursSince = (Date.now() - new Date(createdAt).getTime()) / 3600000;
  const decay = 1 / (1 + hoursSince * 0.1);
  return Math.round((hotVotes - coldVotes) * decay * 10) / 10;
}

async function seedHotVotes(dealId, hunterScore, createdAt) {
  const votes = hunterScore >= 80 ? 5 : hunterScore >= 60 ? 3 : hunterScore >= 40 ? 1 : 0;
  if (votes === 0) return;

  // 1 real vote from bot user (respects unique constraint)
  await pool.execute(
    'INSERT IGNORE INTO votes (user_id, deal_id, vote_type) VALUES (?, ?, "hot")',
    [BOT_USER_ID, dealId]
  );

  // Remaining votes bumped directly on counts
  const extra = votes - 1;
  if (extra > 0) {
    await pool.execute(
      'UPDATE deals SET hot_votes = hot_votes + ? WHERE id = ?',
      [extra, dealId]
    );
  }

  // Always count the bot vote too
  const [[deal]] = await pool.execute('SELECT hot_votes, cold_votes, created_at FROM deals WHERE id = ?', [dealId]);
  const temp = calcTemperature(deal.hot_votes, deal.cold_votes, createdAt || deal.created_at);
  await pool.execute('UPDATE deals SET temperature = ? WHERE id = ?', [temp, dealId]);
}

const PAGE_SIZE = 20;

function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  next();
}

// GET /api/admin/stats
router.get('/stats', requireAuth, requireAdmin, async (req, res) => {
  try {
    const [[dealsRow], [usersRow], [votesRow], topCats, recentDeals, recentUsers] = await Promise.all([
      pool.execute("SELECT COUNT(*) AS total FROM deals WHERE status='active'"),
      pool.execute('SELECT COUNT(*) AS total FROM users'),
      pool.execute('SELECT COUNT(*) AS total FROM votes'),
      pool.execute(`
        SELECT categories.name, categories.slug, categories.icon,
               COUNT(deals.id) AS deal_count
        FROM categories
        LEFT JOIN deals ON deals.category_id = categories.id AND deals.status='active'
        GROUP BY categories.id
        ORDER BY deal_count DESC
        LIMIT 5
      `),
      pool.execute(`
        SELECT 'deal' AS type, deals.id, deals.title, users.username, deals.created_at
        FROM deals LEFT JOIN users ON deals.user_id = users.id
        ORDER BY deals.created_at DESC LIMIT 5
      `),
      pool.execute(`
        SELECT 'user' AS type, id, username, NULL AS title, created_at
        FROM users ORDER BY created_at DESC LIMIT 5
      `),
    ]);

    const activity = [...recentDeals[0], ...recentUsers[0]]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 10);

    res.json({
      totals: {
        deals: dealsRow[0].total,
        users: usersRow[0].total,
        votes: votesRow[0].total,
      },
      top_categories: topCats[0],
      recent_activity: activity,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/admin/deals
router.get('/deals', requireAuth, requireAdmin, async (req, res) => {
  const { page = 1, search, status } = req.query;
  const offset = (parseInt(page) - 1) * PAGE_SIZE;

  let where = '1=1';
  const params = [];

  if (status) { where += ' AND deals.status = ?'; params.push(status); }
  if (search) { where += ' AND deals.title LIKE ?'; params.push(`%${search}%`); }

  try {
    const [rows] = await pool.execute(
      `SELECT deals.*, categories.name AS category_name, users.username AS posted_by
       FROM deals
       LEFT JOIN categories ON deals.category_id = categories.id
       LEFT JOIN users ON deals.user_id = users.id
       WHERE ${where}
       ORDER BY deals.created_at DESC
       LIMIT ${PAGE_SIZE} OFFSET ${offset}`,
      params
    );
    const [[{ total }]] = await pool.execute(
      `SELECT COUNT(*) AS total FROM deals
       LEFT JOIN categories ON deals.category_id = categories.id
       WHERE ${where}`,
      params
    );

    res.json({ deals: rows, total, page: parseInt(page), pages: Math.ceil(total / PAGE_SIZE) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/admin/deals/:id
router.patch('/deals/:id', requireAuth, requireAdmin, async (req, res) => {
  const allowed = ['title', 'description', 'price', 'original_price', 'merchant', 'url', 'category_id', 'status'];
  const fields = Object.keys(req.body).filter(k => allowed.includes(k));
  if (!fields.length) return res.status(400).json({ error: 'No valid fields' });

  const setClauses = fields.map(f => `${f} = ?`).join(', ');
  const values = fields.map(f => req.body[f]);

  try {
    await pool.execute(
      `UPDATE deals SET ${setClauses} WHERE id = ?`,
      [...values, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/admin/deals/:id
router.delete('/deals/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await pool.execute('DELETE FROM deals WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/admin/users
router.get('/users', requireAuth, requireAdmin, async (req, res) => {
  const { page = 1, search } = req.query;
  const offset = (parseInt(page) - 1) * PAGE_SIZE;

  let where = '1=1';
  const params = [];
  if (search) { where += ' AND (users.username LIKE ? OR users.email LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }

  try {
    const [rows] = await pool.execute(
      `SELECT users.id, users.username, users.email, users.role, users.is_banned, users.created_at,
              COUNT(deals.id) AS deal_count
       FROM users
       LEFT JOIN deals ON deals.user_id = users.id
       WHERE ${where}
       GROUP BY users.id
       ORDER BY users.created_at DESC
       LIMIT ${PAGE_SIZE} OFFSET ${offset}`,
      params
    );
    const [[{ total }]] = await pool.execute(
      `SELECT COUNT(*) AS total FROM users WHERE ${where}`,
      params
    );

    res.json({ users: rows, total, page: parseInt(page), pages: Math.ceil(total / PAGE_SIZE) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/admin/users/:id
router.patch('/users/:id', requireAuth, requireAdmin, async (req, res) => {
  const targetId = parseInt(req.params.id);
  if (targetId === req.user.id) {
    return res.status(400).json({ error: 'Cannot modify your own account' });
  }

  const allowed = ['role', 'is_banned'];
  const fields = Object.keys(req.body).filter(k => allowed.includes(k));
  if (!fields.length) return res.status(400).json({ error: 'No valid fields' });

  const setClauses = fields.map(f => `${f} = ?`).join(', ');
  const values = fields.map(f => req.body[f]);

  try {
    await pool.execute(
      `UPDATE users SET ${setClauses} WHERE id = ?`,
      [...values, targetId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── Pending deals (deal hunter queue) ───────────────────────────────────────

// GET /api/admin/pending
router.get('/pending', requireAuth, requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT deals.*, categories.name AS category_name
       FROM deals
       LEFT JOIN categories ON categories.id = deals.category_id
       WHERE deals.status = 'pending'
       ORDER BY deals.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/admin/deals/:id/approve
router.patch('/deals/:id/approve', requireAuth, requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  const allowed = ['title', 'description', 'price', 'original_price', 'category_id'];
  const fields = Object.keys(req.body).filter(k => allowed.includes(k));

  try {
    // Apply any edits + set status active
    if (fields.length) {
      const setClauses = fields.map(f => `${f} = ?`).join(', ');
      const values = fields.map(f => req.body[f]);
      await pool.execute(`UPDATE deals SET ${setClauses} WHERE id = ?`, [...values, id]);
    }
    await pool.execute("UPDATE deals SET status = 'active' WHERE id = ?", [id]);

    // Seed hot votes based on hunter_score
    const [[deal]] = await pool.execute('SELECT hunter_score, created_at FROM deals WHERE id = ?', [id]);
    if (deal?.hunter_score != null) {
      await seedHotVotes(id, deal.hunter_score, deal.created_at);
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/admin/deals/:id/reject
router.patch('/deals/:id/reject', requireAuth, requireAdmin, async (req, res) => {
  try {
    await pool.execute("UPDATE deals SET status = 'hidden' WHERE id = ?", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/admin/import-deals — paste JSON array from manual Claude/OpenAI runs
router.post('/import-deals', requireAuth, requireAdmin, async (req, res) => {
  const { deals } = req.body;
  if (!Array.isArray(deals) || deals.length === 0) {
    return res.status(400).json({ error: 'Expected { deals: [...] }' });
  }

  const CATEGORY_SLUG_MAP = {
    electronics: null, fashion: null, 'home-garden': null,
    'food-drink': null, travel: null, entertainment: null, sports: null, other: null,
  };

  // Pre-fetch category IDs
  const [cats] = await pool.execute('SELECT id, slug FROM categories');
  cats.forEach(c => { CATEGORY_SLUG_MAP[c.slug] = c.id; });

  let saved = 0;
  for (const d of deals) {
    if (!d.title || !d.url) continue;
    const [existing] = await pool.execute('SELECT id FROM deals WHERE url = ?', [d.url]);
    if (existing[0]) continue;

    const categoryId = CATEGORY_SLUG_MAP[d.category] || CATEGORY_SLUG_MAP['other'];
    try {
      await pool.execute(
        `INSERT INTO deals (title, description, price, original_price, merchant, url, category_id, source, status, user_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'scraper', 'pending', 1)`,
        [d.title, d.description || '', d.price || null, d.original_price || null, d.merchant || '', d.url, categoryId]
      );
      saved++;
    } catch (err) {
      console.error('[import]', err.message);
    }
  }

  res.json({ saved });
});

// POST /api/admin/run-hunter — manual trigger
router.post('/run-hunter', requireAuth, requireAdmin, (req, res) => {
  res.json({ started: true });
  // fire-and-forget
  runDealHunter().catch(console.error);
});

module.exports = router;
