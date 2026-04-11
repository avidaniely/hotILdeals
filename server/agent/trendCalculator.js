const cron = require('node-cron');
const { pool } = require('../db');

const TREND_WINDOW_HOURS = 8;
const TREND_DECAY_RATE   = 0.5;  // EXP(-rate * hours): 1h→0.61, 4h→0.14, 8h→0.02

async function recalcTrendScores() {
  try {
    const [result] = await pool.execute(`
      UPDATE deals
      LEFT JOIN (
        SELECT v.deal_id,
          SUM(
            EXP(? * (TIMESTAMPDIFF(SECOND, v.created_at, NOW()) / 3600.0))
            * CASE v.vote_type WHEN 'hot' THEN 1 ELSE -1 END
          ) AS new_trend
        FROM votes v
        WHERE v.created_at >= DATE_SUB(NOW(), INTERVAL ? HOUR)
        GROUP BY v.deal_id
      ) AS recent ON deals.id = recent.deal_id
      SET deals.trend_score = COALESCE(recent.new_trend, 0)
    `, [-TREND_DECAY_RATE, TREND_WINDOW_HOURS]);

    console.log(`[trends] Recalculated trend scores (${result.affectedRows} deals updated)`);
  } catch (err) {
    console.error('[trends] Recalculation failed:', err.message);
  }
}

function startTrendScheduler() {
  // Run immediately on startup so tab isn't empty after a restart
  recalcTrendScores();
  // Then every 10 minutes
  cron.schedule('*/10 * * * *', () => recalcTrendScores());
  console.log('[trends] Trend scheduler started (every 10 minutes)');
}

module.exports = { startTrendScheduler, recalcTrendScores };
