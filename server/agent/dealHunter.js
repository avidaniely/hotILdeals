const cron = require('node-cron');
const { pool } = require('../db');
const { downloadImage } = require('./imageDownloader');

let Anthropic;
try {
  Anthropic = require('@anthropic-ai/sdk');
} catch {
  console.warn('[hunter] @anthropic-ai/sdk not installed — deal writing disabled');
}

// ─── Persona prompts ──────────────────────────────────────────────────────────

const PERSONAS = {
  sarcastic: `אתה ישראלי סרקסטי שכותב בטלפון, בוגר רוסיה, כותב מהר ולא מדייק.
כתוב תיאור של מבצע בעברית יומיומית עם הומור ציני.
כללי שפה: השתמש בסלנג ("יאללה", "בול", "כזה", "אחלה"), כלול שגיאת כתיב אחת טבעית (בלבול כ/ק, ו/ב, שכחת אות),
כתוב במשפטים קצרים, אל תשתמש בפיסוק מושלם. לא רשמי בכלל.
אורך: 2-3 משפטים בלבד.`,

  techNerd: `אתה נרד טכנולוגי שמבלבל עברית ואנגלית כל הזמן.
כתוב תיאור טכני של המוצר/מבצע.
כללי שפה: ערבב מילות טק באנגלית בתוך משפטים עבריים ללא תרגום,
כלול שגיאת כתיב אחת בעברית (בעיקר ליד מילה אנגלית), כתוב משפט ארוך אחד בלי פסיקים מספיקים,
אל תסביר מונחים טכניים.
אורך: 2-3 משפטים.`,

  budget: `את ציידת מבצעים שמתרגשת מכל שקל שחוסכת.
כתבי תיאור נלהב של המבצע.
כללי שפה: השתמשי ב!! לפחות פעם אחת, כלול שגיאת כתיב קטנה מהתלהבות (אות כפולה, החלפת אות),
השתמשי ב"בחיים", "מטורף", "לא ייאמן". ללא פורמליות.
אורך: 2-3 משפטים.`,

  influencer: `את יוטיוברית ביוטי/לייפסטייל שכותבת כמו הודעת ווטסאפ.
כתבי תיאור של המוצר/מבצע.
כללי שפה: התחילי ב"אממ" או "אז", השתמשי ב"כאילו", "ממש", "סיקסטי",
כלול מילה באנגלית מאויתת בעברית (כמו "דיל" במקום deal), שכחי לסגור סוגריים פעם אחת,
כתבי בזרימה ללא פיסוק מושלם.
אורך: 2-3 משפטים.`,
};

const PERSONA_KEYS = ['sarcastic', 'techNerd', 'budget', 'influencer'];

// ─── Category mapping ─────────────────────────────────────────────────────────

const CATEGORY_MAP = {
  electronics: ['ksp', 'bug', 'lastprice', 'מחשב', 'טלפון', 'אוזניות', 'מסך', 'מקלדת', 'עכבר', 'טאבלט', 'מצלמה', 'רמקול'],
  fashion:     ['בגד', 'נעל', 'אופנה', 'חולצה', 'מכנס', 'שמלה'],
  'home-garden': ['בית', 'מטבח', 'ריהוט', 'גינה', 'מנורה', 'כרית'],
  'food-drink':  ['shufersal', 'rami-levy', 'ramiLevy', 'מזון', 'שתייה', 'סופר'],
  sports:      ['decathlon', 'ספורט', 'כדור', 'אופניים', 'ריצה', 'כושר'],
  travel:      ['טיסה', 'מלון', 'חופשה', 'תיור'],
  entertainment: ['משחק', 'סרט', 'ספר', 'מנוי'],
};

async function getCategoryId(title, merchant) {
  const combined = (title + ' ' + merchant).toLowerCase();
  for (const [slug, keywords] of Object.entries(CATEGORY_MAP)) {
    if (keywords.some((k) => combined.includes(k.toLowerCase()))) {
      const [rows] = await pool.execute('SELECT id FROM categories WHERE slug = ?', [slug]);
      if (rows[0]) return rows[0].id;
    }
  }
  // fallback: "other"
  const [rows] = await pool.execute("SELECT id FROM categories WHERE slug = 'other'");
  return rows[0]?.id || null;
}

// ─── Deal scoring ─────────────────────────────────────────────────────────────

function scoreDeal(deal) {
  const discountPct = deal.discountPct || 0;
  const priceBonus = (deal.originalPrice || 0) > 500 ? 10 : 5;
  return discountPct * 2 + priceBonus;
}

// ─── Claude AI writing ────────────────────────────────────────────────────────

async function writeDealWithAI(rawDeal, personaKey) {
  if (!Anthropic || !process.env.ANTHROPIC_API_KEY) {
    // fallback: use raw title/description without AI
    return { title: rawDeal.title, description: rawDeal.description || '' };
  }

  const client = new Anthropic.default({ apiKey: process.env.ANTHROPIC_API_KEY });
  const prompt = PERSONAS[personaKey];

  try {
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      messages: [{
        role: 'user',
        content: `${prompt}

מוצר: ${rawDeal.title}
מחיר: ₪${rawDeal.price || '?'}
מחיר מקורי: ${rawDeal.originalPrice ? '₪' + rawDeal.originalPrice : 'לא ידוע'}
אתר: ${rawDeal.site}
הנחה: ${rawDeal.discountPct ? rawDeal.discountPct + '%' : 'לא ידוע'}

החזר JSON בלבד (ללא markdown):
{ "title": "כותרת קצרה ומושכת", "description": "תיאור בסגנון האישיות" }`,
      }],
    });

    const text = msg.content[0].text
      .replace(/```json?\n?/g, '')
      .replace(/```/g, '')
      .trim();
    return JSON.parse(text);
  } catch (err) {
    console.error('[hunter] Claude API error:', err.message);
    return { title: rawDeal.title, description: rawDeal.description || '' };
  }
}

// ─── Site scrapers ────────────────────────────────────────────────────────────

async function scrapeWithPlaywright(siteConfig) {
  let chromium, playwright;
  try {
    playwright = require('playwright');
    chromium = playwright.chromium;
  } catch {
    console.warn('[hunter] Playwright not available, skipping', siteConfig.name);
    return [];
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const deals = [];

  try {
    await page.goto(siteConfig.url, { timeout: 30000, waitUntil: 'domcontentloaded' });

    if (siteConfig.waitFor) {
      await page.waitForSelector(siteConfig.waitFor, { timeout: 10000 }).catch(() => {});
    }

    const raw = await page.evaluate((config) => {
      const items = document.querySelectorAll(config.selectors.item);
      const results = [];
      items.forEach((el) => {
        const titleEl  = el.querySelector(config.selectors.title);
        const priceEl  = el.querySelector(config.selectors.price);
        const origEl   = el.querySelector(config.selectors.originalPrice);
        const imageEl  = el.querySelector(config.selectors.image);
        const linkEl   = el.querySelector(config.selectors.link) || el.closest('a');

        const title = titleEl?.innerText?.trim();
        if (!title) return;

        const priceText = priceEl?.innerText?.replace(/[^0-9.]/g, '') || '';
        const origText  = origEl?.innerText?.replace(/[^0-9.]/g, '') || '';
        const price     = parseFloat(priceText) || null;
        const original  = parseFloat(origText) || null;
        const image     = imageEl?.getAttribute('src') || imageEl?.getAttribute('data-src') || null;
        const href      = linkEl?.getAttribute('href') || null;
        const discount  = price && original && original > price
          ? Math.round(((original - price) / original) * 100) : 0;

        results.push({ title, price, original, image, href, discount });
      });
      return results;
    }, siteConfig);

    for (const item of raw) {
      const href = item.href
        ? (item.href.startsWith('http') ? item.href : new URL(item.href, siteConfig.url).href)
        : siteConfig.url;

      deals.push({
        title:         item.title,
        price:         item.price,
        originalPrice: item.original,
        discountPct:   item.discount,
        image:         item.image,
        url:           href,
        site:          siteConfig.name,
        merchant:      siteConfig.merchant || siteConfig.name,
      });
    }

    console.log(`[hunter] ${siteConfig.name}: scraped ${deals.length} items`);
  } catch (err) {
    console.error(`[hunter] Error scraping ${siteConfig.name}:`, err.message);
  } finally {
    await browser.close();
  }

  return deals;
}

// ─── Site configurations ──────────────────────────────────────────────────────

const SITES = [
  {
    name: 'KSP',
    merchant: 'KSP',
    url: 'https://ksp.co.il/web/cat/1',
    waitFor: '.products-area',
    selectors: {
      item:          '.product',
      title:         '.productName',
      price:         '.price',
      originalPrice: '.old-price',
      image:         'img.prodImg',
      link:          'a.productName',
    },
  },
  {
    name: 'Bug',
    merchant: 'Bug',
    url: 'https://www.bug.co.il/sale',
    waitFor: '.product-list',
    selectors: {
      item:          '.product-item',
      title:         '.product-name',
      price:         '.special-price .price',
      originalPrice: '.old-price .price',
      image:         'img.product-image-photo',
      link:          'a.product-item-link',
    },
  },
  {
    name: 'osherad',
    merchant: 'osherad.co.il',
    url: 'https://www.osherad.co.il/',
    waitFor: '.deal-item',
    selectors: {
      item:          '.deal-item',
      title:         '.deal-title',
      price:         '.deal-price',
      originalPrice: '.deal-original-price',
      image:         'img.deal-image',
      link:          'a.deal-link',
    },
  },
  {
    name: 'Shufersal',
    merchant: 'שופרסל',
    url: 'https://www.shufersal.co.il/online/he/S?q=%3Arelevance%3Aisale%3Atrue',
    waitFor: '.js-product-list',
    selectors: {
      item:          '.product-grid-item',
      title:         '.shufersal-ui-title',
      price:         '.price',
      originalPrice: '.regularPrice',
      image:         'img.shufersal-ui-image',
      link:          'a.product-grid-item__anchor',
    },
  },
  {
    name: 'Rami Levy',
    merchant: 'רמי לוי',
    url: 'https://www.rami-levy.co.il/he/online/department/sale',
    waitFor: '.product',
    selectors: {
      item:          '.product',
      title:         '.name',
      price:         '.price',
      originalPrice: '.oldprice',
      image:         'img.product-image',
      link:          'a',
    },
  },
  {
    name: 'Decathlon',
    merchant: 'Decathlon',
    url: 'https://www.decathlon.co.il/en/content/168-promotions',
    waitFor: '.product_desc',
    selectors: {
      item:          '.product-container',
      title:         '.product-name',
      price:         '.price',
      originalPrice: '.old-price',
      image:         'img.replace-2x',
      link:          'a.product_img_link',
    },
  },
  {
    name: 'LastPrice',
    merchant: 'LastPrice',
    url: 'https://www.lastprice.co.il/sales',
    waitFor: '.product-row',
    selectors: {
      item:          '.product-row',
      title:         '.product-title',
      price:         '.price-new',
      originalPrice: '.price-old',
      image:         'img.product-thumb',
      link:          'a.product-title',
    },
  },
];

// ─── Save deal to DB ──────────────────────────────────────────────────────────

async function savePendingDeal(deal, persona, hunterScore) {
  // Deduplicate by URL
  const [existing] = await pool.execute('SELECT id FROM deals WHERE url = ?', [deal.url]);
  if (existing[0]) return null;

  const categoryId = await getCategoryId(deal.title, deal.merchant);

  let imagePath = null;
  if (deal.image) {
    imagePath = await downloadImage(deal.image, `hunter_${Date.now()}`);
  }

  const [result] = await pool.execute(
    `INSERT INTO deals
       (title, description, price, original_price, merchant, url, image_path,
        category_id, source, status, hunter_score, persona, user_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'scraper', 'pending', ?, ?, 1)`,
    [
      deal.title,
      deal.description || '',
      deal.price || null,
      deal.originalPrice || null,
      deal.merchant,
      deal.url,
      imagePath,
      categoryId,
      hunterScore,
      persona,
    ]
  );

  return result.insertId;
}

// ─── Main run ─────────────────────────────────────────────────────────────────

async function runDealHunter() {
  console.log('[hunter] Starting deal hunt…');
  let totalSaved = 0;
  let personaIndex = 0;

  for (const site of SITES) {
    console.log(`[hunter] Scanning ${site.name}…`);
    let rawDeals = [];

    try {
      rawDeals = await scrapeWithPlaywright(site);
    } catch (err) {
      console.error(`[hunter] Scrape failed for ${site.name}:`, err.message);
      continue;
    }

    if (rawDeals.length === 0) continue;

    // Score and pick top 5
    const scored = rawDeals
      .map((d) => ({ ...d, score: scoreDeal(d) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    for (const deal of scored) {
      const persona = PERSONA_KEYS[personaIndex % 4];
      personaIndex++;

      try {
        const written = await writeDealWithAI(deal, persona);
        const dealWithText = { ...deal, title: written.title, description: written.description };
        const id = await savePendingDeal(dealWithText, persona, deal.score);
        if (id) {
          console.log(`[hunter] Saved pending deal #${id} (${persona}): ${written.title.slice(0, 50)}`);
          totalSaved++;
        }
      } catch (err) {
        console.error('[hunter] Failed to save deal:', err.message);
      }
    }
  }

  console.log(`[hunter] Done. Saved ${totalSaved} new pending deals.`);
  return totalSaved;
}

// ─── Scheduler ────────────────────────────────────────────────────────────────

function startDealHunter() {
  // Run every day at 8:00 AM Israel time
  cron.schedule('0 8 * * *', () => {
    console.log('[hunter] Daily run triggered');
    runDealHunter().catch(console.error);
  }, { timezone: 'Asia/Jerusalem' });

  console.log('[hunter] Deal hunter scheduled (daily at 08:00 Asia/Jerusalem)');
}

module.exports = { startDealHunter, runDealHunter };
