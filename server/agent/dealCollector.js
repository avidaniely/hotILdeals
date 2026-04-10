const axios = require('axios');
const cheerio = require('cheerio');
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const { pool } = require('../db');
const { downloadImage } = require('./imageDownloader');

const SOURCES_FILE = path.join(__dirname, '..', 'sources.json');

function loadSources() {
  if (!fs.existsSync(SOURCES_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(SOURCES_FILE, 'utf8'));
  } catch {
    return [];
  }
}

async function scrapeSource(source) {
  try {
    const { data: html } = await axios.get(source.url, {
      timeout: 15000,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HotILDeals/1.0)' },
    });
    const $ = cheerio.load(html);
    const deals = [];
    const sel = source.selectors;

    $(sel.item).each((i, el) => {
      const title = $(el).find(sel.title).first().text().trim();
      const url = $(el).find(sel.link).first().attr('href') || source.url;
      const price = $(el).find(sel.price).first().text().trim();
      const image = $(el).find(sel.image).first().attr('src') || $(el).find(sel.image).first().attr('data-src');
      const merchant = source.merchant || $(el).find(sel.merchant).first().text().trim();

      if (title && url) {
        deals.push({
          title,
          url: url.startsWith('http') ? url : new URL(url, source.url).href,
          price: parseFloat(price.replace(/[^0-9.]/g, '')) || null,
          image: image || null,
          merchant: merchant || source.name,
          category_id: source.category_id || null,
        });
      }
    });

    console.log(`[collector] ${source.name}: found ${deals.length} deals`);
    return deals;
  } catch (err) {
    console.error(`[collector] Failed to scrape ${source.name}:`, err.message);
    return [];
  }
}

async function saveDeal(deal) {
  // deduplicate by URL
  const [existing] = await pool.execute('SELECT id FROM deals WHERE url = ?', [deal.url]);
  if (existing[0]) return;

  let imagePath = null;
  if (deal.image) {
    imagePath = await downloadImage(deal.image, `scraper_${Date.now()}`);
  }

  await pool.execute(
    `INSERT INTO deals (title, price, merchant, url, image_path, category_id, source)
     VALUES (?, ?, ?, ?, ?, ?, 'scraper')`,
    [deal.title, deal.price, deal.merchant, deal.url, imagePath, deal.category_id]
  );
}

async function runCollection() {
  const sources = loadSources();
  if (sources.length === 0) {
    console.log('[collector] No sources configured in sources.json');
    return;
  }
  console.log(`[collector] Running collection from ${sources.length} sources`);
  for (const source of sources) {
    const deals = await scrapeSource(source);
    for (const deal of deals) {
      await saveDeal(deal);
    }
  }
  console.log('[collector] Collection complete');
}

function startScheduler() {
  // run every 30 minutes
  cron.schedule('*/30 * * * *', () => {
    console.log('[collector] Scheduled run triggered');
    runCollection().catch(console.error);
  });
  console.log('[collector] Scheduler started (every 30 minutes)');
}

module.exports = { runCollection, startScheduler };
