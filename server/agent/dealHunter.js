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
  electronics: ['מחשב', 'טלפון', 'אוזניות', 'מסך', 'מקלדת', 'עכבר', 'טאבלט', 'מצלמה', 'רמקול'],
  fashion:     ['בגד', 'נעל', 'אופנה', 'חולצה', 'מכנס', 'שמלה'],
  'home-garden': ['בית', 'מטבח', 'ריהוט', 'גינה', 'מנורה', 'כרית'],
  'food-drink':  ['מזון', 'שתייה', 'סופר', 'קפה', 'שוקולד'],
  sports:      ['ספורט', 'כדור', 'אופניים', 'ריצה', 'כושר'],
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

// ─── Process deals batch ──────────────────────────────────────────────────────

async function processDealsBatch(deals) {
  if (!Array.isArray(deals) || deals.length === 0) return 0;

  let saved = 0;
  let personaIndex = 0;

  for (const deal of deals) {
    const persona = PERSONA_KEYS[personaIndex % 4];
    personaIndex++;

    try {
      const score = scoreDeal(deal);
      const written = await writeDealWithAI(deal, persona);
      const dealWithText = { ...deal, title: written.title, description: written.description };
      const id = await savePendingDeal(dealWithText, persona, score);
      if (id) {
        console.log(`[hunter] Saved pending deal #${id} (${persona}): ${written.title.slice(0, 50)}`);
        saved++;
      }
    } catch (err) {
      console.error('[hunter] Failed to save deal:', err.message);
    }
  }

  return saved;
}

// ─── Main run ─────────────────────────────────────────────────────────────────

async function runDealHunter(dealsInput = []) {
  console.log('[hunter] Processing batch of', dealsInput.length, 'deals…');
  const saved = await processDealsBatch(dealsInput);
  console.log(`[hunter] Done. Saved ${saved} new pending deals.`);
  return saved;
}

// ─── Scheduler ────────────────────────────────────────────────────────────────

function startDealHunter() {
  // Cron job fires but does nothing (no sources configured)
  cron.schedule('0 8 * * *', () => {
    console.log('[hunter] Daily run triggered — no sources configured');
  }, { timezone: 'Asia/Jerusalem' });

  console.log('[hunter] Scheduler started — use /api/admin/import-deals or JSON modal to add deals');
}

module.exports = { startDealHunter, runDealHunter };
