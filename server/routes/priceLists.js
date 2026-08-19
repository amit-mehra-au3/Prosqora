const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticateToken } = require('../middleware/authMiddleware');
const { getRow, getAll, runQuery } = require('../db');
const { parsePdfPriceList, parseImagePriceList, parseCsvPriceList, MITSUBISHI_FX3S_BASELINE } = require('../services/pdfPriceParser');

const path = require('path');
const fs = require('fs');

const uploadsDir = path.resolve(__dirname, '../uploads/price-lists');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'pricelist-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 500 * 1024 * 1024 } // 500MB Max for Large PDF & Scanned Documents
});

router.use(authenticateToken);

/**
 * 1. SEARCH MODELS & GET INSTANT PRICES
 * GET /api/price-lists/search?q=FX3S-10MR
 */
router.get('/search', async (req, res) => {
  try {
    const query = (req.query.q || '').trim();
    const userId = req.user.user_id;

    let items = [];

    if (query) {
      const searchPattern = `%${query}%`;
      items = await getAll(
        `SELECT * FROM price_list_items
         WHERE (user_id = ? OR user_id = 'system')
           AND (model_number LIKE ? OR description LIKE ? OR category LIKE ? OR brand_name LIKE ?)
         ORDER BY s_no ASC, model_number ASC LIMIT 100`,
        [userId, searchPattern, searchPattern, searchPattern, searchPattern]
      );
    } else {
      items = await getAll(
        `SELECT * FROM price_list_items
         WHERE (user_id = ? OR user_id = 'system')
         ORDER BY s_no ASC, model_number ASC LIMIT 100`,
        [userId]
      );
    }

    // Auto seed baseline items if empty
    if (items.length === 0 && (!query || query.toUpperCase().includes('FX3S') || query.toUpperCase().includes('PLC'))) {
      await seedBaselineForUser(userId);
      items = await getAll(
        `SELECT * FROM price_list_items WHERE user_id = ? ORDER BY s_no ASC LIMIT 100`,
        [userId]
      );
    }

    res.json({
      success: true,
      query,
      count: items.length,
      items
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 2. UPLOAD PDF PRICE LIST FILE
 * POST /api/price-lists/upload-pdf
 */
router.post('/upload-pdf', upload.single('pdfFile'), async (req, res) => {
  const startTime = Date.now();
  try {
    await ensurePriceListTablesExist();
    const userId = req.user.user_id;
    const brandName = req.body.brandName || 'Mitsubishi Electric';
    const listTitle = req.body.listTitle || 'Factory Automation Systems Price List';

    if (!req.file || (!req.file.buffer && !req.file.path)) {
      return res.status(400).json({ success: false, error: 'Please upload a valid PDF file.' });
    }

    console.log(`[PDF UPLOAD] Processing PDF upload: ${req.file.originalname} (${req.file.size} bytes)...`);

    const fileBuffer = req.file.buffer || fs.readFileSync(req.file.path);
    const items = await parsePdfPriceList(fileBuffer, brandName, req.file.path);
    const listId = `LIST-${Date.now()}`;

    // Save catalogue header
    try {
      await runQuery(
        `INSERT INTO price_lists (list_id, user_id, brand_name, list_title, file_name, total_items)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [listId, userId, brandName, listTitle, req.file.originalname, items.length]
      );
    } catch (headerErr) {
      console.warn('[PDF UPLOAD HEADER WARNING]:', headerErr.message);
    }

    // Save catalogue items
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const itemId = `ITEM-${listId}-${i + 1}`;
      try {
        await runQuery(
          `INSERT INTO price_list_items (
             item_id, list_id, user_id, s_no, model_number, description, list_price, currency, category, stock_status, brand_name
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            itemId, listId, userId, item.s_no || `${i + 1}`,
            item.model_number, item.description || '', item.list_price || 0,
            'INR', item.category || 'General Automation', item.stock_status || 'Stock', brandName
          ]
        );
      } catch (itemErr) {
        console.warn(`[PDF ITEM INSERT WARNING ${itemId}]:`, itemErr.message);
      }
    }

    const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);

    res.json({
      success: true,
      listId,
      message: `Successfully extracted and imported ${items.length} models and prices from PDF in ${durationSec}s!`,
      totalItems: items.length,
      durationSeconds: parseFloat(durationSec),
      items
    });
  } catch (err) {
    console.error('[PDF UPLOAD ERROR]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 2B. BULK UPLOAD PRICE LIST IMAGES (Up to 500 Images via OCR)
 * POST /api/price-lists/upload-images
 */
router.post('/upload-images', upload.array('imageFiles', 500), async (req, res) => {
  const startTime = Date.now();
  try {
    await ensurePriceListTablesExist();
    const userId = req.user.user_id;
    const brandName = req.body.brandName || 'Mitsubishi Electric';
    const listTitle = req.body.listTitle || 'Scanned Price List Images Batch';

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, error: 'Please upload at least one image file (up to 500 images).' });
    }

    console.log(`[BULK IMAGE UPLOAD] Processing ${req.files.length} image files for user ${userId}...`);

    let totalExtractedItems = [];
    const listId = `IMG-LIST-${Date.now()}`;

    for (let f = 0; f < req.files.length; f++) {
      const file = req.files[f];
      try {
        const fileBuffer = file.buffer || fs.readFileSync(file.path);
        const imageItems = await parseImagePriceList(fileBuffer, brandName);
        if (imageItems && imageItems.length > 0) {
          totalExtractedItems.push(...imageItems);
        }
      } catch (imgErr) {
        console.warn(`[IMAGE OCR FILE WARNING ${file.originalname}]:`, imgErr.message);
      }
    }

    // Save catalogue header
    try {
      await runQuery(
        `INSERT INTO price_lists (list_id, user_id, brand_name, list_title, file_name, total_items)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [listId, userId, brandName, listTitle, `${req.files.length} Images Batch`, totalExtractedItems.length]
      );
    } catch (headerErr) {
      console.warn('[IMAGE UPLOAD HEADER WARNING]:', headerErr.message);
    }

    // Save catalogue items
    for (let i = 0; i < totalExtractedItems.length; i++) {
      const item = totalExtractedItems[i];
      const itemId = `ITEM-${listId}-${i + 1}`;
      try {
        await runQuery(
          `INSERT INTO price_list_items (
             item_id, list_id, user_id, s_no, model_number, description, list_price, currency, category, stock_status, brand_name
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            itemId, listId, userId, item.s_no || `${i + 1}`,
            item.model_number, item.description || '', item.list_price || 0,
            'INR', item.category || 'General Automation', item.stock_status || 'Stock', brandName
          ]
        );
      } catch (itemErr) {
        console.warn(`[IMAGE ITEM INSERT WARNING ${itemId}]:`, itemErr.message);
      }
    }

    const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);

    res.json({
      success: true,
      listId,
      message: `Successfully processed ${req.files.length} images via OCR and imported ${totalExtractedItems.length} model prices in ${durationSec}s!`,
      totalFiles: req.files.length,
      totalItems: totalExtractedItems.length,
      durationSeconds: parseFloat(durationSec),
      items: totalExtractedItems
    });
  } catch (err) {
    console.error('[BULK IMAGE UPLOAD ERROR]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 3. SEED DEMO PRICE LIST (Mitsubishi Electric FX3S PLC Series)
 * POST /api/price-lists/seed-demo
 */
router.post('/seed-demo', async (req, res) => {
  try {
    const userId = req.user.user_id;
    await seedBaselineForUser(userId);

    const items = await getAll(
      `SELECT * FROM price_list_items WHERE user_id = ? ORDER BY id ASC`,
      [userId]
    );

    res.json({
      success: true,
      message: `Successfully seeded Mitsubishi Electric FY 2026-27 FX3S PLC Price List (${items.length} items)!`,
      items
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 4. LIST ALL CATALOGUES
 * GET /api/price-lists
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.user.user_id;
    const lists = await getAll(
      `SELECT * FROM price_lists WHERE user_id = ? OR user_id = 'system' ORDER BY id DESC`,
      [userId]
    );

    res.json({ success: true, lists });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 5. DELETE A CATALOGUE
 * DELETE /api/price-lists/:listId
 */
router.delete('/:listId', async (req, res) => {
  try {
    const { listId } = req.params;
    const userId = req.user.user_id;

    await runQuery(`DELETE FROM price_lists WHERE list_id = ? AND user_id = ?`, [listId, userId]);
    await runQuery(`DELETE FROM price_list_items WHERE list_id = ? AND user_id = ?`, [listId, userId]);

    res.json({ success: true, message: 'Price catalogue deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Helper function to seed baseline Mitsubishi FX3S price list items
async function seedBaselineForUser(userId) {
  const listId = `LIST-MITSUBISHI-FY26`;

  try {
    const existingList = await getRow(`SELECT * FROM price_lists WHERE list_id = ?`, [listId]);
    if (!existingList) {
      await runQuery(
        `INSERT INTO price_lists (list_id, user_id, brand_name, list_title, file_name, total_items)
         VALUES (?, ?, 'Mitsubishi Electric', 'Factory Automation Systems Price List FY 2026-27', 'Searchable_PRICE LIST - 26-27.pdf', ?)`,
        [listId, userId, MITSUBISHI_FX3S_BASELINE.length]
      );
    }
  } catch (e) {}

  // Insert baseline items
  for (let i = 0; i < MITSUBISHI_FX3S_BASELINE.length; i++) {
    const item = MITSUBISHI_FX3S_BASELINE[i];
    const itemId = `ITEM-${listId}-${i + 1}`;

    try {
      const existingItem = await getRow(`SELECT * FROM price_list_items WHERE item_id = ?`, [itemId]);
      if (!existingItem) {
        await runQuery(
          `INSERT INTO price_list_items (
             item_id, list_id, user_id, s_no, model_number, description, list_price, currency, category, stock_status, brand_name
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            itemId, listId, userId, item.s_no,
            item.model_number, item.description, item.list_price,
            'INR', item.category, item.stock_status, item.brand_name
          ]
        );
      }
    } catch (e) {}
  }
}

async function ensurePriceListTablesExist() {
  try {
    await runQuery(`
      CREATE TABLE IF NOT EXISTS price_lists (
        id SERIAL PRIMARY KEY,
        list_id VARCHAR(255) UNIQUE NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        brand_name VARCHAR(255) DEFAULT 'Mitsubishi Electric',
        list_title VARCHAR(255) NOT NULL,
        file_name VARCHAR(255) DEFAULT '',
        total_items INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } catch (e) {
    try {
      await runQuery(`
        CREATE TABLE IF NOT EXISTS price_lists (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          list_id TEXT UNIQUE NOT NULL,
          user_id TEXT NOT NULL,
          brand_name TEXT DEFAULT 'Mitsubishi Electric',
          list_title TEXT NOT NULL,
          file_name TEXT DEFAULT '',
          total_items INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
    } catch (e2) {}
  }

  try {
    await runQuery(`
      CREATE TABLE IF NOT EXISTS price_list_items (
        id SERIAL PRIMARY KEY,
        item_id VARCHAR(255) UNIQUE NOT NULL,
        list_id VARCHAR(255) NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        s_no VARCHAR(50) DEFAULT '',
        model_number VARCHAR(255) NOT NULL,
        description TEXT DEFAULT '',
        list_price DOUBLE PRECISION DEFAULT 0,
        currency VARCHAR(10) DEFAULT 'INR',
        category VARCHAR(100) DEFAULT 'Compact PLC',
        stock_status VARCHAR(100) DEFAULT 'Stock',
        brand_name VARCHAR(255) DEFAULT 'Mitsubishi Electric',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } catch (e) {
    try {
      await runQuery(`
        CREATE TABLE IF NOT EXISTS price_list_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          item_id TEXT UNIQUE NOT NULL,
          list_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          s_no TEXT DEFAULT '',
          model_number TEXT NOT NULL,
          description TEXT DEFAULT '',
          list_price REAL DEFAULT 0,
          currency TEXT DEFAULT 'INR',
          category TEXT DEFAULT 'Compact PLC',
          stock_status TEXT DEFAULT 'Stock',
          brand_name TEXT DEFAULT 'Mitsubishi Electric',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
    } catch (e2) {}
  }
}

module.exports = router;
