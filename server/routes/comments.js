const router = require('express').Router({ mergeParams: true });
const { pool } = require('../db');
const { requireAuth, optionalAuth } = require('../middleware/auth');

// GET /api/deals/:dealId/comments
router.get('/', optionalAuth, async (req, res) => {
  const { dealId } = req.params;
  try {
    const [rows] = await pool.execute(
      `SELECT comments.id, comments.body, comments.created_at,
              comments.user_id, users.username
       FROM comments
       JOIN users ON users.id = comments.user_id
       WHERE comments.deal_id = ?
       ORDER BY comments.created_at ASC`,
      [dealId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/deals/:dealId/comments
router.post('/', requireAuth, async (req, res) => {
  const { dealId } = req.params;
  const { body } = req.body;
  if (!body || !body.trim()) return res.status(400).json({ error: 'Comment body required' });
  if (body.length > 1000) return res.status(400).json({ error: 'Comment too long (max 1000 chars)' });

  try {
    const [result] = await pool.execute(
      'INSERT INTO comments (deal_id, user_id, body) VALUES (?, ?, ?)',
      [dealId, req.user.id, body.trim()]
    );
    res.status(201).json({
      id: result.insertId,
      deal_id: parseInt(dealId),
      user_id: req.user.id,
      username: req.user.username,
      body: body.trim(),
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/deals/:dealId/comments/:id
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const [result] = await pool.execute(
      `DELETE FROM comments WHERE id = ? AND deal_id = ? AND (user_id = ? OR ? = 'admin')`,
      [req.params.id, req.params.dealId, req.user.id, req.user.role]
    );
    if (result.affectedRows === 0) return res.status(403).json({ error: 'Not authorized or not found' });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
