const cron = require('node-cron');
const { pool } = require('../db');

const HOTTEST_WINDOW_HOURS = 48;
const HOTTEST_DECAY_RATE   = 0.08;  // EXP(-rate * hours): 6h→0.62, 24h→0.15, 48h→0.02

async function recalcHottestScores() {
  try {
    const [result] = await pool.execute(`
      UPDATE deals
      LEFT JOIN (
        SELECT v.deal_id,
          SUM(
            EXP(? * (TIMESTAMPDIFF(SECOND, v.created_at, NOW()) / 3600.0))
            * CASE v.vote_type WHEN 'hot' THEN 1 ELSE -1 END
          ) AS new_hot
        FROM votes v
        WHERE v.created_at >= DATE_SUB(NOW(), INTERVAL ? HOUR)
        GROUP BY v.deal_id
      ) AS recent ON deals.id = recent.deal_id
      SET deals.hottest_score = COALESCE(recent.new_hot, 0)
    `, [-HOTTEST_DECAY_RATE, HOTTEST_WINDOW_HOURS]);

    console.log(`[hottest] Recalculated hottest scores (${result.affectedRows} deals updated)`);
  } catch (err) {
    console.error('[hottest] Recalculation failed:', err.message);
  }
}

function startHottestScheduler() {
  recalcHottestScores();
  cron.schedule('*/10 * * * *', () => recalcHottestScores());
  console.log('[hottest] Hottest scheduler started (every 10 minutes)');
}

module.exports = { startHottestScheduler, recalcHottestScores };
