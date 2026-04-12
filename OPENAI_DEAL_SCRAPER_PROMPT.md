# hotILdeals — OpenAI Deal Scraper Prompt Guide

Use this prompt with ChatGPT or Claude to scrape blocked Israeli e-commerce sites and generate deals in the exact JSON format that hotILdeals expects.

---

## How It Works

1. **You** give OpenAI/Claude this prompt + a site URL
2. **OpenAI** browses the site (it has internet access) and extracts deals
3. **You** copy the JSON output
4. **Paste it** into hotILdeals admin panel → `ממתינים לאישור` → `יבוא JSON` button
5. **System** downloads images locally, writes human-like descriptions with typos/personas, publishes

---

## Prompt Template for OpenAI

```
You are a deal extraction bot for an Israeli deals website. Your job is to:
1. Browse the given Israeli e-commerce site URL
2. Find the TOP 10 BEST DEALS (highest discounts, good prices)
3. Extract: title, price, original price, discount %, merchant, category, description, image URL
4. Write a SHORT human-like description (2-3 sentences) that sounds natural and casual
5. Return ONLY a valid JSON array — nothing else

### Important Rules:
- Extract REAL deals from the site (use your browser)
- Discount % = ((original_price - price) / original_price) * 100
- Category MUST be one of: electronics, fashion, home-garden, food-drink, sports, travel, entertainment, other
- Image URL must be publicly accessible (not relative paths)
- Description should be 2-3 sentences, casual Hebrew, natural-sounding
- Do NOT include markdown, explanations, or any text outside the JSON array
- Return ONLY the JSON array

### JSON Format (required):
[
  {
    "title": "Product Name - Brief Description",
    "price": 299.90,
    "original_price": 499.90,
    "discountPct": 40,
    "url": "https://site.co.il/product/full-url-to-deal",
    "merchant": "Store Name",
    "category": "electronics",
    "image": "https://site.co.il/images/product.jpg",
    "description": "תיאור קצר וטבעי של המבצע בעברית, 2-3 משפטים בלבד. סגנון casual ולא רשמי."
  },
  ...
]

NOW: Browse this site and extract the top deals:
{{ SITE_URL }}
```

---

## Israeli E-Commerce Sites to Scrape

Use these URLs with the prompt. Each site has different deals:

| Site | Category | URL | Notes |
|---|---|---|---|
| **KSP** | Electronics, Computers | `https://ksp.co.il/web/cat/compSales` | Largest Israeli electronics retailer, daily deals |
| **Bug** | Electronics, Gaming | `https://www.bug.co.il/content/deals` | Tech & gaming focus, competitive prices |
| **Zap** | Electronics, Appliances | `https://www.zap.co.il/flash-sales.aspx` | Appliances, large electronics |
| **Shufersal** | Groceries, Food | `https://www.shufersal.co.il/online/he/S/c/SA_ROOT?sort=relevance&filter=onSale` | Supermarket, weekly specials |
| **Rami Levy** | Groceries, Food | `https://www.rami-levy.co.il/online/he/promotions` | Supermarket, discount section |
| **iShop** | Apple Products | `https://www.ishop.co.il/Promotions` | Apple authorized, sales events |
| **Fox** | Fashion, Home | `https://www.fox.co.il/sale` | Clothing, home decor, seasonal sales |
| **Quentin** | Fashion, Accessories | `https://www.quentin.co.il/on-sale` | Fashion brands, outlet |
| **Max** | Fashion, Sportswear | `https://www.max.co.il/en/special-offers` | Sportswear, athletic brands |
| **Decathlon Israel** | Sports, Outdoor | `https://www.decathlon.co.il/en/c/3-sale` | Sports equipment, outdoor gear |
| **Office Depot** | Office, School | `https://www.officedepot.co.il/default.aspx?Action=PromoPage&TierId=1` | Office supplies, back to school |
| **Juno** | Jewelry, Watches | `https://www.juno.co.il/on-sale` | Jewelry, watches, luxury items |
| **Steimatzky** | Books, Media | `https://www.steimatzky.co.il/promotions` | Books, ebooks, gifts |
| **Wolt** | Food Delivery | `https://wolt.com/en/isr/tel-aviv/restaurant` | Restaurant deals, delivery promos |

---

## Example: Running Against KSP (Electronics)

**You ask ChatGPT:**
```
You are a deal extraction bot for an Israeli deals website. Your job is to:
1. Browse the given Israeli e-commerce site URL
2. Find the TOP 10 BEST DEALS (highest discounts, good prices)
3. Extract: title, price, original price, discount %, merchant, category, description, image URL
...
[full prompt above]

NOW: Browse this site and extract the top deals:
https://ksp.co.il/web/cat/compSales
```

**ChatGPT returns JSON like:**
```json
[
  {
    "title": "Logitech MX Master 3 Mouse",
    "price": 199.90,
    "original_price": 349.90,
    "discountPct": 43,
    "url": "https://ksp.co.il/product/logitech-mx-master-3",
    "merchant": "KSP",
    "category": "electronics",
    "image": "https://ksp.co.il/images/logitech-mx-master-3.jpg",
    "description": "עכבר לייזר מקצועי של לוג'יטק, עם 8 כפתורים ניתנים לתכנות ובטריה שמספיקה לשבוע שלם. מצוין לעבודה במשרד או בבית."
  },
  {
    "title": "Samsung 32\" Curved Gaming Monitor 144Hz",
    "price": 899,
    "original_price": 1299,
    "discountPct": 31,
    "url": "https://ksp.co.il/product/samsung-curved-32",
    "merchant": "KSP",
    "category": "electronics",
    "image": "https://ksp.co.il/images/samsung-monitor.jpg",
    "description": "מסך משחק 32 אינץ' עם רענון של 144Hz ו-1ms זמן תגובה. מעולה למשחקנים ולמי שעובד עם גרפיקה. כולל רכיבים מהודקים ואחריות."
  }
]
```

---

## Example: Running Against Shufersal (Groceries)

**You ask ChatGPT:**
```
[full prompt above]

NOW: Browse this site and extract the top deals:
https://www.shufersal.co.il/online/he/S/c/SA_ROOT?sort=relevance&filter=onSale
```

**ChatGPT returns JSON like:**
```json
[
  {
    "title": "תה ליפטון מבחר טעמים",
    "price": 12.90,
    "original_price": 18.90,
    "discountPct": 32,
    "url": "https://www.shufersal.co.il/online/he/products/...",
    "merchant": "שופרסל",
    "category": "food-drink",
    "image": "https://www.shufersal.co.il/images/tea.jpg",
    "description": "תה ליפטון 20 שקיות, מגוון טעמים. הנחה ענקית! בקניה של 2 יחידות זול עוד יותר."
  },
  {
    "title": "יוגורט דנון 8 עציצים",
    "price": 7.50,
    "original_price": 10.90,
    "discountPct": 31,
    "url": "https://www.shufersal.co.il/online/he/products/...",
    "merchant": "שופרסל",
    "category": "food-drink",
    "image": "https://www.shufersal.co.il/images/yogurt.jpg",
    "description": "יוגורט דנון טרי, 8 עציצים. מטורף!! הנחה גדולה בשבוע הזה בלבד."
  }
]
```

---

## Example: Running Against Fox (Fashion)

**You ask ChatGPT:**
```
[full prompt above]

NOW: Browse this site and extract the top deals:
https://www.fox.co.il/sale
```

**ChatGPT returns JSON like:**
```json
[
  {
    "title": "חולצת פוקס קטן לנשים",
    "price": 89.90,
    "original_price": 149.90,
    "discountPct": 40,
    "url": "https://www.fox.co.il/product/...",
    "merchant": "Fox",
    "category": "fashion",
    "image": "https://www.fox.co.il/images/tshirt-women.jpg",
    "description": "חולצה קלאסית של פוקס בצבעים שונים, 100% כותנה. אממ כאילו המחיר הזה לא ממש קיים, תופסי את ההנחה עכשיו!"
  },
  {
    "title": "ג'ינס סקיני כחול כהה",
    "price": 139.90,
    "original_price": 249.90,
    "discountPct": 44,
    "url": "https://www.fox.co.il/product/...",
    "merchant": "Fox",
    "category": "fashion",
    "image": "https://www.fox.co.il/images/jeans-blue.jpg",
    "description": "ג'ינס סקיני כחול כהה, תאימות מושלמת. בסגנון זה ממש לא מצאתי בחנויות אחרות. מחיר זהב!"
  }
]
```

---

## Paste Into hotILdeals

1. Open your site: `http://your-server:3001/admin`
2. Log in as admin
3. Click **ממתינים לאישור** tab
4. Click **יבוא JSON** button
5. Paste the JSON array
6. Click **יבוא**

---

## What Happens Next

✅ **System automatically:**
- Downloads all images locally to `/uploads/deals/`
- Auto-categorizes if category is wrong
- Runs Anthropic API on each deal → writes human-like description with typos/personas (4 personas rotate)
- Saves as `status = 'pending'` with `hunter_score` based on discount %
- Shows in **ממתינים לאישור** tab with:
  - Image thumbnail
  - Persona badge (סרקסטי / נרד טק / ציידת מבצעים / יוטיוברית)
  - Hunter score (⭐ for high discount, ▲ for medium)
  - Edit button (optional before approval)
  - Approve / Reject buttons

✅ **On Approve:**
- Deal goes live immediately with `status = 'active'`
- Auto hot-votes seeded:
  - 80+ score → 5 hot votes
  - 60-79 → 3 hot votes
  - 40-59 → 1 hot vote
  - <40 → 0
- Temperature calculated from hot votes

---

## Tips for Best Results

### 1. Get High-Quality Descriptions from OpenAI
Ask it to write more naturally:
```
Write descriptions that sound like real Israeli shoppers talking:
- Use casual slang ("יאללה", "בול", "כזה", "אחלה")
- Include 1-2 small typos (בלבול כ/ק, החלפת אות, סוגריים לא סגורים)
- Be excited about discounts ("מטורף!!", "לא ייאמן")
- Keep it 2-3 sentences max
```

### 2. Batch Multiple Sites
Run separate prompts for each site:
- KSP
- Bug
- Shufersal
- Rami Levy
- Others

Then paste all JSON arrays one after another.

### 3. Filter for Real Discounts
Ask OpenAI to ONLY include:
```
- Discount >= 15% (to avoid noise)
- Price > ₪50 (meaningful deals)
- Not out of stock
```

### 4. Use Honest Descriptions
Let OpenAI extract actual deal descriptions from the site, not generic copy. Best deals have:
- Real product specs
- Why it's a good deal
- Who it's for

---

## JSON Field Reference

| Field | Type | Required | Example | Notes |
|---|---|---|---|---|
| `title` | string | ✅ | "MacBook Pro 14-inch M4" | Concise product name + key feature |
| `price` | number | ✅ | 4999.90 | Current sale price in ₪ |
| `original_price` | number | ✅ | 6499.90 | Regular/list price in ₪ |
| `discountPct` | number | ✅ | 23 | Calculated discount percentage |
| `url` | string | ✅ | "https://ksp.co.il/product/..." | Full URL to deal on site |
| `merchant` | string | ✅ | "KSP" | Store/merchant name |
| `category` | string | ✅ | "electronics" | One of: electronics, fashion, home-garden, food-drink, sports, travel, entertainment, other |
| `image` | string | ✅ | "https://ksp.co.il/images/..." | Public image URL (system downloads locally) |
| `description` | string | ✅ | "תיאור קצר..." | 2-3 sentences, casual Hebrew, natural typos OK |

---

## Workflow Diagram

```
┌─────────────────────┐
│   OpenAI / Claude   │
│  Browse blocked     │
│  site + extract     │
└──────────┬──────────┘
           │ JSON array
           ↓
┌──────────────────────────────┐
│  You copy-paste into admin   │
│  ממתינים לאישור → יבוא JSON  │
└──────────┬───────────────────┘
           │
           ↓
┌──────────────────────────────┐
│  hotILdeals system:          │
│  • Download images locally   │
│  • Auto-categorize           │
│  • Call Anthropic API        │
│  • Write with 4 personas     │
│  • Save as pending           │
└──────────┬───────────────────┘
           │
           ↓
┌──────────────────────────────┐
│  Admin approves in panel     │
│  ממתינים לאישור tab          │
└──────────┬───────────────────┘
           │
           ↓
┌──────────────────────────────┐
│  Deal goes LIVE:             │
│  • Auto hot-votes seeded     │
│  • Appears on homepage       │
│  • Status = 'active'         │
└──────────────────────────────┘
```

---

## Troubleshooting

**Q: "Image download failed"**
A: Make sure image URLs are publicly accessible and start with `https://`. Don't use relative paths.

**Q: "Discount % is wrong"**
A: System calculates automatically from price and original_price. Make sure both are correct.

**Q: "Description doesn't match my persona"**
A: The Anthropic rewrite happens AFTER import. Your description is ignored. System writes fresh with personas.

**Q: "Deal already exists"**
A: System deduplicates by URL. If you import the same deal twice, second one is skipped.

---

## Advanced: Batch Multiple Sites

Create one big JSON file with deals from multiple sources:

```json
[
  {
    "title": "KSP Deal 1",
    "price": 299,
    ...
    "merchant": "KSP",
    "category": "electronics"
  },
  {
    "title": "Bug Deal 1",
    "price": 149,
    ...
    "merchant": "Bug",
    "category": "electronics"
  },
  {
    "title": "Shufersal Deal 1",
    "price": 49,
    ...
    "merchant": "שופרסל",
    "category": "food-drink"
  }
]
```

Paste the ENTIRE array at once. System processes all in batch.
