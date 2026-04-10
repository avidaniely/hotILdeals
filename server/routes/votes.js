const router = require('express').Router();
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');

function calcTemperature(hotVotes, coldVotes, createdAt) {
  const hoursSince = (Date.now() - new Date(createdAt).getTime()) / 3600000;
  const decay = 1 / (1 + hoursSince * 0.1);
  return Math.round((hotVotes - coldVotes) * decay * 10) / 10;
}

// POST /api/votes/:dealId  body: { vote_type: 'hot'|'cold' }
router.post('/:dealId', requireAuth, async (req, res) => {
  const { vote_type } = req.body;
  const dealId = parseInt(req.params.dealId);
  if (!['hot', 'cold'].includes(vote_type)) {
    return res.status(400).json({ error: "vote_type must be 'hot' or 'cold'" });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [deals] = await conn.execute('SELECT * FROM deals WHERE id = ? FOR UPDATE', [dealId]);
    if (!deals[0]) {
      await conn.rollback();
      return res.status(404).json({ error: 'Deal not found' });
    }
    const deal = deals[0];

    const [existing] = await conn.execute(
      'SELECT * FROM votes WHERE user_id = ? AND deal_id = ?',
      [req.user.id, dealId]
    );

    let hotVotes = deal.hot_votes;
    let coldVotes = deal.cold_votes;

    if (existing[0]) {
      if (existing[0].vote_type === vote_type) {
        // remove vote (toggle off)
        if (vote_type === 'hot') hotVotes--;
        else coldVotes--;
        await conn.execute('DELETE FROM votes WHERE id = ?', [existing[0].id]);
      } else {
        // change vote
        if (vote_type === 'hot') { hotVotes++; coldVotes--; }
        else { coldVotes++; hotVotes--; }
        await conn.execute('UPDATE votes SET vote_type = ? WHERE id = ?', [vote_type, existing[0].id]);
      }
    } else {
      if (vote_type === 'hot') hotVotes++;
      else coldVotes++;
      await conn.execute(
        'INSERT INTO votes (user_id, deal_id, vote_type) VALUES (?, ?, ?)',
        [req.user.id, dealId, vote_type]
      );
    }

    hotVotes = Math.max(0, hotVotes);
    coldVotes = Math.max(0, coldVotes);
    const temperature = calcTemperature(hotVotes, coldVotes, deal.created_at);

    await conn.execute(
      'UPDATE deals SET hot_votes = ?, cold_votes = ?, temperature = ? WHERE id = ?',
      [hotVotes, coldVotes, temperature, dealId]
    );

    await conn.commit();
    res.json({ hot_votes: hotVotes, cold_votes: coldVotes, temperature });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    conn.release();
  }
});

// GET /api/votes/my/:dealId — get current user's vote on a deal
router.get('/my/:dealId', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT vote_type FROM votes WHERE user_id = ? AND deal_id = ?',
      [req.user.id, req.params.dealId]
    );
    res.json({ vote_type: rows[0]?.vote_type || null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
