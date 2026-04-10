const axios = require('axios');
const fs = require('fs');
const path = require('path');

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads/deals';

async function downloadImage(imageUrl, namePrefix) {
  try {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });

    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 10000,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HotILDeals/1.0)' },
    });

    const contentType = response.headers['content-type'] || 'image/jpeg';
    const ext = contentType.includes('png') ? '.png'
      : contentType.includes('gif') ? '.gif'
      : contentType.includes('webp') ? '.webp'
      : '.jpg';

    const filename = `${namePrefix}_${Date.now()}${ext}`;
    const filepath = path.join(UPLOAD_DIR, filename);
    fs.writeFileSync(filepath, response.data);

    return `/uploads/deals/${filename}`;
  } catch (err) {
    console.warn(`Failed to download image from ${imageUrl}:`, err.message);
    return null;
  }
}

module.exports = { downloadImage };
