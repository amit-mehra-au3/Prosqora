const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticateToken } = require('../middleware/authMiddleware');
const { getRow, getAll, runQuery } = require('../db');
const { parsePdfPriceList, parseCsvPriceList, MITSUBISHI_FX3S_BASELINE } = require('../services/pdfPriceParser');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB Max
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
  try {
    const userId = req.user.user_id;
    const brandName = req.body.brandName || 'Mitsubishi Electric';
    const listTitle = req.body.listTitle || 'Factory Automation Systems Price List';

    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ success: false, error: 'Please upload a valid PDF file.' });
    }

    console.log(`[PDF UPLOAD] Processing PDF upload: ${req.file.originalname} (${req.file.size} bytes)...`);

    const items = await parsePdfPriceList(req.file.buffer, brandName);
    const listId = `LIST-${Date.now()}`;

    // Save catalogue header
    await runQuery(
      `INSERT INTO price_lists (list_id, user_id, brand_name, list_title, file_name, total_items)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [listId, userId, brandName, listTitle, req.file.originalname, items.length]
    );

    // Save catalogue items
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const itemId = `ITEM-${listId}-${i + 1}`;
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
    }

    res.json({
      success: true,
      listId,
      message: `Successfully extracted and imported ${items.length} models and prices from PDF!`,
      totalItems: items.length,
      items
    });
  } catch (err) {
    console.error('[PDF UPLOAD ERROR]:', err);
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

module.exports = router;
