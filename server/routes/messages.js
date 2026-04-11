const router = require('express').Router();
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');

// GET /api/messages/unread-count
router.get('/unread-count', requireAuth, async (req, res) => {
  try {
    const [[{ count }]] = await pool.execute(
      'SELECT COUNT(*) AS count FROM messages WHERE receiver_id = ? AND is_read = 0',
      [req.user.id]
    );
    res.json({ count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/messages — list all conversations
router.get('/', requireAuth, async (req, res) => {
  const uid = req.user.id;
  try {
    const [rows] = await pool.execute(
      `SELECT
         partner_id,
         u.username AS partner_username,
         (SELECT body FROM messages m2
          WHERE (m2.sender_id = ? AND m2.receiver_id = partner_id)
             OR (m2.sender_id = partner_id AND m2.receiver_id = ?)
          ORDER BY m2.created_at DESC LIMIT 1) AS last_message,
         (SELECT created_at FROM messages m2
          WHERE (m2.sender_id = ? AND m2.receiver_id = partner_id)
             OR (m2.sender_id = partner_id AND m2.receiver_id = ?)
          ORDER BY m2.created_at DESC LIMIT 1) AS last_message_at,
         SUM(CASE WHEN m.receiver_id = ? AND m.sender_id = partner_id AND m.is_read = 0 THEN 1 ELSE 0 END) AS unread_count
       FROM (
         SELECT CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END AS partner_id
         FROM messages
         WHERE sender_id = ? OR receiver_id = ?
         GROUP BY partner_id
       ) AS partners
       JOIN users u ON u.id = partner_id
       JOIN messages m ON (m.sender_id = ? AND m.receiver_id = partner_id)
                       OR (m.sender_id = partner_id AND m.receiver_id = ?)
       GROUP BY partner_id
       ORDER BY last_message_at DESC`,
      [uid, uid, uid, uid, uid, uid, uid, uid, uid, uid]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/messages/:partnerId — full thread
router.get('/:partnerId', requireAuth, async (req, res) => {
  const uid = req.user.id;
  const pid = parseInt(req.params.partnerId);
  if (isNaN(pid)) return res.status(400).json({ error: 'Invalid partner ID' });

  try {
    // verify partner exists
    const [[partner]] = await pool.execute(
      'SELECT id, username FROM users WHERE id = ?', [pid]
    );
    if (!partner) return res.status(404).json({ error: 'User not found' });

    // mark incoming messages as read
    await pool.execute(
      'UPDATE messages SET is_read = 1 WHERE receiver_id = ? AND sender_id = ? AND is_read = 0',
      [uid, pid]
    );

    const [messages] = await pool.execute(
      `SELECT id, sender_id, body, is_read, created_at FROM messages
       WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
       ORDER BY created_at ASC LIMIT 200`,
      [uid, pid, pid, uid]
    );

    res.json({ partner, messages });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/messages/:partnerId — send message
router.post('/:partnerId', requireAuth, async (req, res) => {
  const uid = req.user.id;
  const pid = parseInt(req.params.partnerId);
  const { body } = req.body;

  if (isNaN(pid) || pid === uid) return res.status(400).json({ error: 'Invalid recipient' });
  if (!body || typeof body !== 'string' || !body.trim()) return res.status(400).json({ error: 'Message body required' });
  if (body.length > 2000) return res.status(400).json({ error: 'Message too long (max 2000 chars)' });

  try {
    const [[partner]] = await pool.execute('SELECT id FROM users WHERE id = ?', [pid]);
    if (!partner) return res.status(404).json({ error: 'User not found' });

    const [result] = await pool.execute(
      'INSERT INTO messages (sender_id, receiver_id, body) VALUES (?, ?, ?)',
      [uid, pid, body.trim()]
    );
    const [[msg]] = await pool.execute('SELECT * FROM messages WHERE id = ?', [result.insertId]);
    res.status(201).json(msg);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
