const router = require('express').Router();
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');

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

module.exports = router;
