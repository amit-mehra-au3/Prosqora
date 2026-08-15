const express = require('express');
const router = express.Router();
const ExcelJS = require('exceljs');
const { scanWebsite } = require('../services/scannerService');
const { authenticateToken } = require('../middleware/authMiddleware');
const {
  runQuery,
  getRow,
  getAll,
  normalizeUrl,
  normalizePhone,
  generateLeadId
} = require('../db');

// PROTECT ALL CRM ENDPOINTS WITH TENANT AUTHENTICATION
router.use(authenticateToken);

// 1. SCAN SINGLE WEBSITE ENDPOINT
router.post('/scan', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url || !url.trim()) {
      return res.status(400).json({ error: 'Target URL is required' });
    }

    const scanData = await scanWebsite(url.trim());
    const userId = req.user.user_id;

    // Check if this website is already in the user's CRM
    const normUrl = normalizeUrl(scanData.website || url);
    const existingLead = await getRow(
      `SELECT * FROM leads WHERE user_id = ? AND normalized_url = ?`,
      [userId, normUrl]
    );

    if (existingLead) {
      scanData.isAlreadyInCrm = true;
      scanData.existingLead = existingLead;
    } else {
      scanData.isAlreadyInCrm = false;
    }

    // Record website scan history for logged in user
    try {
      await runQuery(
        `INSERT INTO website_scans (user_id, website_url, results) VALUES (?, ?, ?)`,
        [userId, url.trim(), JSON.stringify(scanData)]
      );
    } catch (e) {}

    res.json({
      success: true,
      data: scanData
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Website could not be scanned.'
    });
  }
});

// 2. DUPLICATE CHECK ENDPOINT
router.post('/leads/check-duplicate', async (req, res) => {
  try {
    const { website, company_name, phone } = req.body;
    const userId = req.user.user_id;
    const normUrl = normalizeUrl(website);
    const normPhone = normalizePhone(phone);

    let existingLead = null;

    if (normUrl) {
      existingLead = await getRow(
        `SELECT * FROM leads WHERE user_id = ? AND normalized_url = ?`,
        [userId, normUrl]
      );
    }

    if (!existingLead && normPhone) {
      existingLead = await getRow(
        `SELECT * FROM leads WHERE user_id = ? AND normalized_phone != '' AND normalized_phone = ?`,
        [userId, normPhone]
      );
    }

    if (existingLead) {
      return res.json({
        success: true,
        duplicate: true,
        status: 'duplicate',
        lead: existingLead
      });
    }

    res.json({
      success: true,
      duplicate: false,
      status: 'not_found'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to check duplicate lead.' });
  }
});

// 3. SAVE NEW / UPDATE LEAD ENDPOINT
router.post('/leads', async (req, res) => {
  try {
    const leadData = req.body;
    const userId = req.user.user_id;

    if (!leadData.company_name || !leadData.website) {
      return res.status(400).json({ success: false, error: 'Company Name and Website are required.' });
    }

    const normUrl = normalizeUrl(leadData.website);
    const normPhone = normalizePhone(leadData.phone || leadData.normalized_phone);

    const existing = await getRow(
      `SELECT * FROM leads WHERE user_id = ? AND (normalized_url = ? OR (normalized_phone != '' AND normalized_phone = ?))`,
      [userId, normUrl, normPhone]
    );

    // If duplicate found and not explicitly performing update: return structured duplicate response without error
    if (existing && !req.body.allowUpdate) {
      return res.json({
        success: true,
        status: 'duplicate',
        duplicate: true,
        message: 'Already in your CRM',
        lead: existing,
        savedDate: existing.created_at
      });
    }

    const categoriesStr = typeof leadData.categories === 'string'
      ? leadData.categories
      : JSON.stringify(leadData.categories || []);

    const categoryEvidenceStr = typeof leadData.category_evidence === 'string'
      ? leadData.category_evidence
      : JSON.stringify(leadData.category_evidence || []);

    const addPhonesStr = typeof leadData.additional_phones === 'string'
      ? leadData.additional_phones
      : JSON.stringify(leadData.additional_phones || []);

    const evidenceStr = typeof leadData.contact_evidence === 'string'
      ? leadData.contact_evidence
      : JSON.stringify(leadData.contact_evidence || []);

    // Perform Update on Existing Lead (Preserving CRM manual fields lead_status, notes, followups)
    if (existing && req.body.allowUpdate) {
      await runQuery(
        `UPDATE leads SET
          company_name = ?, category = ?, categories = ?, category_evidence = ?, location = ?, address = ?, city = ?, state = ?, country = ?,
          phone = ?, normalized_phone = ?, additional_phones = ?, email = ?, email_source = ?, whatsapp = ?, whatsapp_url = ?,
          contact_person = ?, products = ?, services = ?, industries = ?, machines = ?, applications = ?,
          linkedin = ?, facebook = ?, instagram = ?, youtube = ?, twitter = ?, automation_opportunity = ?,
          website_status = ?, http_status = ?, final_url = ?, checked_date = ?, confidence_score = ?, contact_evidence = ?,
          lead_status = ?, notes = ?, last_contact = ?, next_followup = ?,
          updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND user_id = ?`,
        [
          leadData.company_name || existing.company_name,
          leadData.category || existing.category,
          categoriesStr || existing.categories,
          categoryEvidenceStr || existing.category_evidence,
          leadData.location || existing.location,
          leadData.address || existing.address,
          leadData.city || existing.city,
          leadData.state || existing.state,
          leadData.country || existing.country,
          leadData.phone || existing.phone,
          normPhone || existing.normalized_phone,
          addPhonesStr || existing.additional_phones,
          leadData.email || existing.email,
          leadData.email_source || existing.email_source,
          leadData.whatsapp || existing.whatsapp,
          leadData.whatsapp_url || existing.whatsapp_url,
          leadData.contact_person || existing.contact_person,
          leadData.products || existing.products,
          leadData.services || existing.services,
          leadData.industries || existing.industries,
          leadData.machines || existing.machines,
          leadData.applications || existing.applications,
          leadData.linkedin || existing.linkedin,
          leadData.facebook || existing.facebook,
          leadData.instagram || existing.instagram,
          leadData.youtube || existing.youtube,
          leadData.twitter || existing.twitter,
          leadData.automation_opportunity || existing.automation_opportunity,
          leadData.website_status || existing.website_status,
          leadData.http_status || existing.http_status,
          leadData.final_url || existing.final_url,
          leadData.checked_date || existing.checked_date,
          leadData.confidence_score || existing.confidence_score,
          evidenceStr || existing.contact_evidence,
          // Preserve manually entered CRM fields unless explicitly passed
          leadData.lead_status || existing.lead_status,
          leadData.notes || existing.notes,
          leadData.last_contact || existing.last_contact,
          leadData.next_followup || existing.next_followup,
          existing.id,
          userId
        ]
      );

      const updated = await getRow(`SELECT * FROM leads WHERE id = ? AND user_id = ?`, [existing.id, userId]);
      return res.json({ success: true, status: 'updated', lead: updated, message: 'Lead updated successfully' });
    }

    // Insert New Lead
    const lead_id = await generateLeadId();

    const sql = `INSERT INTO leads (
      lead_id, user_id, company_name, website, normalized_url, category, categories, category_evidence, location, address, city, state, country,
      phone, normalized_phone, additional_phones, email, email_source, whatsapp, whatsapp_url, contact_person,
      products, services, industries, machines, applications, linkedin, facebook, instagram, youtube, twitter,
      automation_opportunity, website_status, http_status, final_url, checked_date, lead_status, last_contact,
      next_followup, followup_count, contact_method, notes, search_query, search_location, confidence_score, contact_evidence
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const params = [
      lead_id,
      userId,
      leadData.company_name,
      leadData.website,
      normUrl,
      leadData.category || '',
      categoriesStr,
      categoryEvidenceStr,
      leadData.location || '',
      leadData.address || '',
      leadData.city || 'Unknown',
      leadData.state || 'Unknown',
      leadData.country || 'India',
      leadData.phone || '',
      normPhone,
      addPhonesStr,
      leadData.email || '',
      leadData.email_source || '',
      leadData.whatsapp || '',
      leadData.whatsapp_url || '',
      leadData.contact_person || '',
      leadData.products || '',
      leadData.services || '',
      leadData.industries || '',
      leadData.machines || '',
      leadData.applications || '',
      leadData.linkedin || '',
      leadData.facebook || '',
      leadData.instagram || '',
      leadData.youtube || '',
      leadData.twitter || '',
      leadData.automation_opportunity || '',
      leadData.website_status || '⚪ Not Accessible',
      leadData.http_status || 0,
      leadData.final_url || '',
      leadData.checked_date || new Date().toISOString(),
      leadData.lead_status || 'New',
      leadData.last_contact || '',
      leadData.next_followup || '',
      leadData.followup_count || 0,
      leadData.contact_method || '',
      leadData.notes || '',
      leadData.search_query || '',
      leadData.search_location || '',
      leadData.confidence_score || 'LOW',
      evidenceStr
    ];

    const result = await runQuery(sql, params);
    const newLead = await getRow(`SELECT * FROM leads WHERE id = ? AND user_id = ?`, [result.lastID, userId]);

    res.json({ success: true, status: 'created', lead: newLead, message: 'Lead saved to CRM successfully' });
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE constraint failed')) {
      // Graceful fallback for race conditions or composite duplicates
      const userId = req.user.user_id;
      const normUrl = normalizeUrl(req.body.website);
      const existing = await getRow(`SELECT * FROM leads WHERE user_id = ? AND normalized_url = ?`, [userId, normUrl]);
      return res.json({
        success: true,
        status: 'duplicate',
        duplicate: true,
        message: 'Already in your CRM',
        lead: existing
      });
    }
    res.status(500).json({ success: false, error: 'Could not save lead to CRM.' });
  }
});

// 4. GET ALL LEADS ENDPOINT (TENANT ISOLATED)
router.get('/leads', async (req, res) => {
  try {
    const { status, search, location } = req.query;
    const userId = req.user.user_id;

    let sql = `SELECT * FROM leads WHERE user_id = ?`;
    const params = [userId];

    if (status && status !== 'All') {
      sql += ` AND lead_status = ?`;
      params.push(status);
    }

    if (location) {
      sql += ` AND (location LIKE ? OR city LIKE ? OR state LIKE ?)`;
      params.push(`%${location}%`, `%${location}%`, `%${location}%`);
    }

    if (search) {
      sql += ` AND (company_name LIKE ? OR website LIKE ? OR products LIKE ? OR notes LIKE ? OR category LIKE ? OR phone LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    sql += ` ORDER BY id DESC`;

    const leads = await getAll(sql, params);
    res.json({ success: true, count: leads.length, leads });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. UPDATE LEAD ENDPOINT (TENANT ISOLATED)
router.put('/leads/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body;
    const userId = req.user.user_id;

    const existing = await getRow(`SELECT * FROM leads WHERE id = ? AND user_id = ?`, [id, userId]);
    if (!existing) {
      return res.status(404).json({ error: 'Lead not found or access denied.' });
    }

    const lead_status = body.lead_status !== undefined ? body.lead_status : existing.lead_status;
    const last_contact = body.last_contact !== undefined ? body.last_contact : existing.last_contact;
    const next_followup = body.next_followup !== undefined ? body.next_followup : existing.next_followup;
    const followup_count = body.followup_count !== undefined ? parseInt(body.followup_count, 10) : existing.followup_count;
    const contact_method = body.contact_method !== undefined ? body.contact_method : existing.contact_method;
    const notes = body.notes !== undefined ? body.notes : existing.notes;
    const contact_person = body.contact_person !== undefined ? body.contact_person : existing.contact_person;
    const phone = body.phone !== undefined ? body.phone : existing.phone;
    const email = body.email !== undefined ? body.email : existing.email;
    const normPhone = normalizePhone(phone);

    await runQuery(
      `UPDATE leads SET
        lead_status = ?, last_contact = ?, next_followup = ?, followup_count = ?,
        contact_method = ?, notes = ?, contact_person = ?, phone = ?, normalized_phone = ?, email = ?,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`,
      [lead_status, last_contact, next_followup, followup_count, contact_method, notes, contact_person, phone, normPhone, email, id, userId]
    );

    const updated = await getRow(`SELECT * FROM leads WHERE id = ? AND user_id = ?`, [id, userId]);
    res.json({ success: true, lead: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. DELETE LEAD ENDPOINT (TENANT ISOLATED)
router.delete('/leads/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.user_id;

    await runQuery(`DELETE FROM leads WHERE id = ? AND user_id = ?`, [id, userId]);
    res.json({ success: true, message: 'Lead deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. SAVED FILTERS ENDPOINTS (TENANT ISOLATED)
router.get('/saved-filters', async (req, res) => {
  try {
    const filters = await getAll(`SELECT * FROM saved_filters WHERE user_id = ? ORDER BY id DESC`, [req.user.user_id]);
    res.json({ success: true, filters });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/saved-filters', async (req, res) => {
  try {
    const { name, filter_config } = req.body;
    if (!name || !filter_config) {
      return res.status(400).json({ error: 'Filter name and configuration are required' });
    }

    const configStr = typeof filter_config === 'string' ? filter_config : JSON.stringify(filter_config);
    const result = await runQuery(
      `INSERT INTO saved_filters (user_id, name, filter_config) VALUES (?, ?, ?)`,
      [req.user.user_id, name.trim(), configStr]
    );

    const newFilter = await getRow(`SELECT * FROM saved_filters WHERE id = ? AND user_id = ?`, [result.lastID, req.user.user_id]);
    res.json({ success: true, filter: newFilter });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/saved-filters/:id', async (req, res) => {
  try {
    await runQuery(`DELETE FROM saved_filters WHERE id = ? AND user_id = ?`, [req.params.id, req.user.user_id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 8. DEDICATED FOLLOW-UPS ENDPOINT (TENANT ISOLATED)
router.get('/followups', async (req, res) => {
  try {
    const userId = req.user.user_id;
    const todayStr = new Date().toISOString().split('T')[0];
    const allLeads = await getAll(`SELECT * FROM leads WHERE user_id = ? AND next_followup != '' ORDER BY next_followup ASC`, [userId]);

    const dueToday = [];
    const upcoming = [];
    const overdue = [];

    for (const lead of allLeads) {
      if (lead.next_followup === todayStr) {
        dueToday.push(lead);
      } else if (lead.next_followup > todayStr) {
        upcoming.push(lead);
      } else if (lead.next_followup < todayStr) {
        overdue.push(lead);
      }
    }

    res.json({
      success: true,
      dueToday,
      upcoming,
      overdue
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 9. DASHBOARD STATS ENDPOINT (TENANT ISOLATED)
router.get('/dashboard/stats', async (req, res) => {
  try {
    const userId = req.user.user_id;

    const totalLeadsRow = await getRow(`SELECT COUNT(*) as cnt FROM leads WHERE user_id = ?`, [userId]);
    const newLeadsRow = await getRow(`SELECT COUNT(*) as cnt FROM leads WHERE user_id = ? AND lead_status = 'New'`, [userId]);
    const contactedRow = await getRow(`SELECT COUNT(*) as cnt FROM leads WHERE user_id = ? AND lead_status = 'Contacted'`, [userId]);
    const interestedRow = await getRow(`SELECT COUNT(*) as cnt FROM leads WHERE user_id = ? AND lead_status = 'Interested'`, [userId]);
    const convertedRow = await getRow(`SELECT COUNT(*) as cnt FROM leads WHERE user_id = ? AND lead_status = 'Converted'`, [userId]);

    const todayStr = new Date().toISOString().split('T')[0];
    const followupsDueRow = await getRow(`SELECT COUNT(*) as cnt FROM leads WHERE user_id = ? AND next_followup != '' AND next_followup <= ?`, [userId, todayStr]);

    const recentLeads = await getAll(`SELECT * FROM leads WHERE user_id = ? ORDER BY id DESC LIMIT 5`, [userId]);
    const followupsDueList = await getAll(`SELECT * FROM leads WHERE user_id = ? AND next_followup != '' ORDER BY next_followup ASC LIMIT 5`, [userId]);

    res.json({
      success: true,
      stats: {
        totalLeads: totalLeadsRow ? totalLeadsRow.cnt : 0,
        newLeads: newLeadsRow ? newLeadsRow.cnt : 0,
        contacted: contactedRow ? contactedRow.cnt : 0,
        followupsDue: followupsDueRow ? followupsDueRow.cnt : 0,
        interested: interestedRow ? interestedRow.cnt : 0,
        converted: convertedRow ? convertedRow.cnt : 0
      },
      recentLeads,
      followupsDueList
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 10. EXPORT CSV & EXCEL ENDPOINTS (TENANT ISOLATED)
router.get('/export/csv', async (req, res) => {
  try {
    const userId = req.user.user_id;
    const ids = req.query.ids;
    let leads = [];

    if (ids) {
      const idArray = ids.split(',').map((i) => parseInt(i, 10));
      const placeholders = idArray.map(() => '?').join(',');
      leads = await getAll(`SELECT * FROM leads WHERE user_id = ? AND id IN (${placeholders}) ORDER BY id DESC`, [userId, ...idArray]);
    } else {
      leads = await getAll(`SELECT * FROM leads WHERE user_id = ? ORDER BY id DESC`, [userId]);
    }

    const headers = [
      'Lead ID', 'Company Name', 'Website', 'Categories', 'Category', 'Location', 'City', 'State', 'Country',
      'Phone', 'Normalized Phone', 'Email', 'Email Source', 'WhatsApp', 'Contact Person', 'Products', 'Services',
      'Automation Opportunity', 'Website Status', 'Lead Status', 'Confidence Score', 'Last Contact', 'Next Follow-up',
      'Follow-up Count', 'Contact Method', 'Notes', 'Created Date'
    ];

    let csvContent = headers.join(',') + '\n';

    leads.forEach((l) => {
      const row = [
        l.lead_id, l.company_name, l.website, l.categories, l.category, l.location, l.city, l.state, l.country,
        l.phone, l.normalized_phone, l.email, l.email_source, l.whatsapp, l.contact_person, l.products, l.services,
        l.automation_opportunity, l.website_status, l.lead_status, l.confidence_score, l.last_contact, l.next_followup,
        l.followup_count, l.contact_method, l.notes, l.created_at
      ].map((val) => `"${(val || '').toString().replace(/"/g, '""')}"`);

      csvContent += row.join(',') + '\n';
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=autolead_crm_${Date.now()}.csv`);
    res.send(csvContent);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/export/excel', async (req, res) => {
  try {
    const userId = req.user.user_id;
    const ids = req.query.ids;
    let leads = [];

    if (ids) {
      const idArray = ids.split(',').map((i) => parseInt(i, 10));
      const placeholders = idArray.map(() => '?').join(',');
      leads = await getAll(`SELECT * FROM leads WHERE user_id = ? AND id IN (${placeholders}) ORDER BY id DESC`, [userId, ...idArray]);
    } else {
      leads = await getAll(`SELECT * FROM leads WHERE user_id = ? ORDER BY id DESC`, [userId]);
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('AutoLead CRM');

    worksheet.columns = [
      { header: 'Lead ID', key: 'lead_id', width: 15 },
      { header: 'Company Name', key: 'company_name', width: 25 },
      { header: 'Website', key: 'website', width: 25 },
      { header: 'City', key: 'city', width: 15 },
      { header: 'State', key: 'state', width: 15 },
      { header: 'Categories', key: 'categories', width: 35 },
      { header: 'Primary Phone', key: 'phone', width: 18 },
      { header: 'Email', key: 'email', width: 25 },
      { header: 'Confidence', key: 'confidence_score', width: 15 },
      { header: 'Automation Opportunity', key: 'automation_opportunity', width: 40 },
      { header: 'Website Status', key: 'website_status', width: 18 },
      { header: 'Lead Status', key: 'lead_status', width: 15 },
      { header: 'Last Contact', key: 'last_contact', width: 15 },
      { header: 'Next Follow-up', key: 'next_followup', width: 15 },
      { header: 'Notes', key: 'notes', width: 30 }
    ];

    leads.forEach((l) => worksheet.addRow(l));

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename=autolead_crm_${Date.now()}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 11. APP SETTINGS ENDPOINTS
router.get('/settings', async (req, res) => {
  try {
    const settingsRows = await getAll(`SELECT * FROM settings`);
    const settingsMap = {};
    settingsRows.forEach((r) => {
      settingsMap[r.key] = r.value;
    });

    res.json({
      success: true,
      settings: settingsMap
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/settings', async (req, res) => {
  try {
    const { key, value } = req.body;
    if (!key) return res.status(400).json({ error: 'Setting key is required' });

    await runQuery(
      `INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?`,
      [key, String(value), String(value)]
    );

    res.json({ success: true, key, value });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
