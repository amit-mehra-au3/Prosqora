const express = require('express');
const router = express.Router();
const ExcelJS = require('exceljs');
const { scanWebsite } = require('../services/scannerService');
const { verifyCsvQueue, verifyCsvBatchChunk, rescanLeadsBatchChunk } = require('../services/verificationService');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');
const { logAuditEvent, getLeadActivity } = require('../services/auditService');
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

const getWorkspaceId = (req) => req.user.workspace_id || req.user.user_id;

// 1. SCAN SINGLE WEBSITE ENDPOINT
router.post('/scan', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url || !url.trim()) {
      return res.status(400).json({ error: 'Target URL is required' });
    }

    const scanData = await scanWebsite(url.trim());
    const userId = req.user.user_id;
    const workspaceId = getWorkspaceId(req);

    // Check if this website is already in the workspace CRM
    const normUrl = normalizeUrl(scanData.website || url);
    const existingLead = await getRow(
      `SELECT * FROM leads WHERE (workspace_id = ? OR (workspace_id = '' AND user_id = ?)) AND normalized_url = ?`,
      [workspaceId, userId, normUrl]
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
    const workspaceId = getWorkspaceId(req);
    const normUrl = normalizeUrl(website);
    const normPhone = normalizePhone(phone);

    let existingLead = null;

    if (normUrl) {
      existingLead = await getRow(
        `SELECT * FROM leads WHERE (workspace_id = ? OR (workspace_id = '' AND user_id = ?)) AND normalized_url = ?`,
        [workspaceId, userId, normUrl]
      );
    }

    if (!existingLead && normPhone) {
      existingLead = await getRow(
        `SELECT * FROM leads WHERE (workspace_id = ? OR (workspace_id = '' AND user_id = ?)) AND normalized_phone != '' AND normalized_phone = ?`,
        [workspaceId, userId, normPhone]
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
    const workspaceId = getWorkspaceId(req);

    if (!leadData.company_name || !leadData.website) {
      return res.status(400).json({ success: false, error: 'Company Name and Website are required.' });
    }

    const normUrl = normalizeUrl(leadData.website);
    const normPhone = normalizePhone(leadData.phone || leadData.normalized_phone);

    const existing = await getRow(
      `SELECT * FROM leads WHERE (workspace_id = ? OR (workspace_id = '' AND user_id = ?)) AND (normalized_url = ? OR (normalized_phone != '' AND normalized_phone = ?))`,
      [workspaceId, userId, normUrl, normPhone]
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
      lead_id, workspace_id, user_id, created_by, updated_by, company_name, website, normalized_url, category, categories, category_evidence, location, address, city, state, country,
      phone, normalized_phone, additional_phones, email, email_source, whatsapp, whatsapp_url, contact_person,
      products, services, industries, machines, applications, linkedin, facebook, instagram, youtube, twitter,
      automation_opportunity, website_status, http_status, final_url, checked_date, lead_status, last_contact,
      next_followup, followup_count, contact_method, notes, search_query, search_location, confidence_score, contact_evidence
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const params = [
      lead_id,
      workspaceId,
      userId,
      userId,
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
    const newLead = await getRow(`SELECT * FROM leads WHERE id = ?`, [result.lastID]);

    res.json({ success: true, status: 'created', lead: newLead, message: 'Lead saved to CRM successfully' });
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE constraint failed')) {
      const userId = req.user.user_id;
      const workspaceId = getWorkspaceId(req);
      const normUrl = normalizeUrl(req.body.website);
      const existing = await getRow(`SELECT * FROM leads WHERE (workspace_id = ? OR (workspace_id = '' AND user_id = ?)) AND normalized_url = ?`, [workspaceId, userId, normUrl]);
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

// 4. GET ALL LEADS ENDPOINT (WORKSPACE ISOLATED)
router.get('/leads', async (req, res) => {
  try {
    const { status, search, location } = req.query;
    const userId = req.user.user_id;
    const workspaceId = getWorkspaceId(req);

    let sql = `SELECT * FROM leads WHERE (workspace_id = ? OR (workspace_id = '' AND user_id = ?))`;
    const params = [workspaceId, userId];

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

// 5. UPDATE LEAD ENDPOINT (WORKSPACE SCOPED + AUDIT LOGGED)
router.put('/leads/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body;
    const userId = req.user.user_id;
    const workspaceId = getWorkspaceId(req);

    const existing = await getRow(
      `SELECT * FROM leads WHERE id = ? AND (workspace_id = ? OR (workspace_id = '' AND user_id = ?))`,
      [id, workspaceId, userId]
    );
    if (!existing) {
      return res.status(404).json({ error: 'Lead not found or access denied.' });
    }

    const fieldsToTrack = {
      phone: 'Phone',
      email: 'Email',
      contact_person: 'Contact Person',
      lead_status: 'Lead Status',
      notes: 'Notes',
      city: 'City',
      state: 'State'
    };

    const diffs = [];
    Object.keys(fieldsToTrack).forEach((key) => {
      if (body[key] !== undefined && String(body[key]) !== String(existing[key] || '')) {
        diffs.push(`${fieldsToTrack[key]}: "${existing[key] || ''}" → "${body[key]}"`);
      }
    });

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
        updated_by = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND (workspace_id = ? OR (workspace_id = '' AND user_id = ?))`,
      [lead_status, last_contact, next_followup, followup_count, contact_method, notes, contact_person, phone, normPhone, email, userId, id, workspaceId, userId]
    );

    if (diffs.length > 0) {
      await logAuditEvent({
        userId: req.user.user_id,
        userName: req.user.full_name,
        userEmail: req.user.email,
        userRole: req.user.role,
        workspaceId: workspaceId,
        action: 'Lead Updated',
        targetType: 'Lead',
        targetId: existing.lead_id || String(existing.id),
        details: `Updated ${existing.company_name}: ${diffs.join('; ')}`,
        changes: { old: existing, new: body }
      });
    }

    const updated = await getRow(`SELECT * FROM leads WHERE id = ?`, [id]);
    res.json({ success: true, lead: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5B. GET LEAD ACTIVITY AUDIT HISTORY ENDPOINT
router.get('/leads/:id/activity', async (req, res) => {
  try {
    const leadId = req.params.id;
    const workspaceId = getWorkspaceId(req);
    const userId = req.user.user_id;

    const lead = await getRow(
      `SELECT id, lead_id, company_name FROM leads WHERE (workspace_id = ? OR (workspace_id = '' AND user_id = ?)) AND (id = ? OR lead_id = ?)`,
      [workspaceId, userId, leadId, leadId]
    );
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found or access denied.' });
    }

    const activity = await getLeadActivity(lead.lead_id || lead.id, workspaceId);
    res.json({ success: true, activity });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. DELETE LEAD ENDPOINT (ADMIN ONLY - WORKSPACE SCOPED)
router.delete('/leads/:id', requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.user_id;
    const workspaceId = getWorkspaceId(req);

    const existing = await getRow(
      `SELECT company_name, lead_id FROM leads WHERE id = ? AND (workspace_id = ? OR (workspace_id = '' AND user_id = ?))`,
      [id, workspaceId, userId]
    );

    await runQuery(`DELETE FROM leads WHERE id = ? AND (workspace_id = ? OR (workspace_id = '' AND user_id = ?))`, [id, workspaceId, userId]);

    if (existing) {
      await logAuditEvent({
        userId: req.user.user_id,
        userName: req.user.full_name,
        userEmail: req.user.email,
        userRole: req.user.role,
        workspaceId: workspaceId,
        action: 'Lead Deleted',
        targetType: 'Lead',
        targetId: existing.lead_id || String(id),
        details: `Deleted lead: ${existing.company_name}`
      });
    }

    res.json({ success: true, message: 'Lead deleted successfully' });

    if (existing) {
      await logAuditEvent({
        userId: req.user.user_id,
        userName: req.user.full_name,
        userEmail: req.user.email,
        userRole: req.user.role,
        workspaceId: userId,
        action: 'Lead Deleted',
        targetType: 'Lead',
        targetId: existing.lead_id || String(id),
        details: `Deleted lead: ${existing.company_name}`
      });
    }

    res.json({ success: true, message: 'Lead deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6B. BULK DELETE LEADS ENDPOINT (ADMIN ONLY)
router.post('/leads/bulk-delete', requireRole('admin'), async (req, res) => {
  try {
    const userId = req.user.user_id;
    const workspaceId = getWorkspaceId(req);
    const leadIds = req.body.leadIds || req.body.ids;

    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return res.status(400).json({ error: 'Array of lead IDs is required.' });
    }

    const placeholders = leadIds.map(() => '?').join(',');
    const validLeads = await getAll(
      `SELECT id, company_name FROM leads WHERE (workspace_id = ? OR (workspace_id = '' AND user_id = ?)) AND id IN (${placeholders})`,
      [workspaceId, userId, ...leadIds]
    );
    const validIds = validLeads.map((l) => l.id);

    if (validIds.length > 0) {
      const validPlaceholders = validIds.map(() => '?').join(',');
      await runQuery(
        `DELETE FROM leads WHERE (workspace_id = ? OR (workspace_id = '' AND user_id = ?)) AND id IN (${validPlaceholders})`,
        [workspaceId, userId, ...validIds]
      );

      await logAuditEvent({
        userId: req.user.user_id,
        userName: req.user.full_name,
        userEmail: req.user.email,
        userRole: req.user.role,
        workspaceId: workspaceId,
        action: 'Bulk Lead Deleted',
        targetType: 'Lead',
        targetId: `${validIds.length} leads`,
        details: `Bulk deleted ${validIds.length} leads`
      });
    }

    res.json({
      success: true,
      deletedCount: validIds.length,
      message: `Successfully deleted ${validIds.length} leads.`
    });
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

// 10. EXPORT CSV & EXCEL ENDPOINTS (TENANT ISOLATED — ADMIN ONLY)
router.get('/export/csv', requireRole('admin'), async (req, res) => {
  try {
    const userId = req.user.user_id;

    // Audit Log Export Event
    await logAuditEvent({
      userId: req.user.user_id,
      userName: req.user.full_name,
      userEmail: req.user.email,
      userRole: req.user.role,
      workspaceId: userId,
      action: 'Export Performed',
      targetType: 'Export',
      targetId: 'CSV',
      details: `Exported CRM leads database to CSV format`
    });

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
    res.setHeader('Content-Disposition', `attachment; filename=prosqora_crm_${Date.now()}.csv`);
    res.send(csvContent);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/export/excel', requireRole('admin'), async (req, res) => {
  try {
    const userId = req.user.user_id;

    // Audit Log Export Event
    await logAuditEvent({
      userId: req.user.user_id,
      userName: req.user.full_name,
      userEmail: req.user.email,
      userRole: req.user.role,
      workspaceId: userId,
      action: 'Export Performed',
      targetType: 'Export',
      targetId: 'Excel',
      details: `Exported Prosqora CRM leads database to Excel format`
    });
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
    const worksheet = workbook.addWorksheet('Prosqora CRM');

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
    res.setHeader('Content-Disposition', `attachment; filename=prosqora_crm_${Date.now()}.xlsx`);

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

// 12. CSV BULK IMPORT ENDPOINT (WITH BATCH UNIFIED DUPLICATE PREVENTION & PERFORMANCE)
router.post('/leads/bulk-import', async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { leads, fileName, allowMissingWebsite } = req.body;

    if (!Array.isArray(leads) || leads.length === 0) {
      return res.status(400).json({ error: 'Array of leads is required' });
    }

    let totalRows = leads.length;
    let importedCount = 0;
    let existingDuplicatesCount = 0;
    let csvDuplicatesCount = 0;
    let invalidWebsitesCount = 0;
    let missingWebsitesCount = 0;

    const seenCsvNormUrls = new Set();
    const leadsToImport = [];

    // Phase 1: Local normalization & CSV-level deduplication
    for (const item of leads) {
      const rawWeb = (item.website || '').trim();

      if (!rawWeb) {
        if (allowMissingWebsite) {
          leadsToImport.push({
            ...item,
            website: '',
            normalized_url: '',
            _status: 'missing_allowed'
          });
        } else {
          missingWebsitesCount++;
          continue;
        }
      } else {
        const normUrl = normalizeUrl(rawWeb);
        if (!normUrl || !normUrl.includes('.') || normUrl.length < 3) {
          invalidWebsitesCount++;
          continue;
        }

        if (seenCsvNormUrls.has(normUrl)) {
          csvDuplicatesCount++;
          continue;
        }

        seenCsvNormUrls.add(normUrl);
        leadsToImport.push({
          ...item,
          website: rawWeb,
          normalized_url: normUrl,
          _status: 'valid'
        });
      }
    }

    // Phase 2: Batch check existing normalized URLs in database (No N+1 queries!)
    const normUrlsToCheck = leadsToImport
      .map((l) => l.normalized_url)
      .filter((u) => u && u.length > 0);

    const existingNormUrlsSet = new Set();

    if (normUrlsToCheck.length > 0) {
      const chunkSize = 500;
      for (let i = 0; i < normUrlsToCheck.length; i += chunkSize) {
        const chunk = normUrlsToCheck.slice(i, i + chunkSize);
        const placeholders = chunk.map(() => '?').join(',');
        const existingRows = await getAll(
          `SELECT normalized_url FROM leads WHERE user_id = ? AND normalized_url IN (${placeholders})`,
          [userId, ...chunk]
        );
        existingRows.forEach((r) => existingNormUrlsSet.add(r.normalized_url));
      }
    }

    // Phase 3: Bulk insert non-duplicate unique leads
    for (const leadData of leadsToImport) {
      if (leadData.normalized_url && existingNormUrlsSet.has(leadData.normalized_url)) {
        existingDuplicatesCount++;
        continue;
      }

      try {
        const lead_id = await generateLeadId();
        const normPhone = normalizePhone(leadData.phone || '');

        const sql = `INSERT INTO leads (
          lead_id, user_id, company_name, website, normalized_url, category, location, address, city, state, country,
          phone, normalized_phone, email, contact_person, products, services, industries, notes, search_query, confidence_score
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'CSV Import', 'HIGH')`;

        const params = [
          lead_id,
          userId,
          leadData.company_name || 'Imported Company',
          leadData.website || '',
          leadData.normalized_url || '',
          leadData.category || '',
          leadData.location || '',
          leadData.address || '',
          leadData.city || 'Unknown',
          leadData.state || 'Unknown',
          leadData.country || 'India',
          leadData.phone || '',
          normPhone,
          leadData.email || '',
          leadData.contact_person || '',
          leadData.products || '',
          leadData.services || '',
          leadData.industries || '',
          leadData.notes || ''
        ];

        const result = await runQuery(sql, params);
        importedCount++;
        if (leadData.normalized_url) {
          existingNormUrlsSet.add(leadData.normalized_url);
        }
      } catch (err) {
        if (err.message && err.message.includes('UNIQUE constraint failed')) {
          existingDuplicatesCount++;
        }
      }
    }

    // Save Import History Log
    try {
      await runQuery(
        `INSERT INTO import_history (user_id, file_name, total_rows, imported_count, existing_duplicates_count, csv_duplicates_count, invalid_websites_count, missing_websites_count)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          fileName || 'imported_leads.csv',
          totalRows,
          importedCount,
          existingDuplicatesCount,
          csvDuplicatesCount,
          invalidWebsitesCount,
          missingWebsitesCount
        ]
      );
    } catch (e) {}

    res.json({
      success: true,
      totalRows,
      importedCount,
      existingDuplicatesCount,
      csvDuplicatesCount,
      invalidWebsitesCount,
      missingWebsitesCount
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 13. FIND DUPLICATES IN CRM ENDPOINT (GROUPED BY NORMALIZED WEBSITE)
router.get('/leads/duplicates', async (req, res) => {
  try {
    const userId = req.user.user_id;

    const duplicateRows = await getAll(
      `SELECT normalized_url, COUNT(*) as cnt FROM leads WHERE user_id = ? AND normalized_url != '' GROUP BY normalized_url HAVING COUNT(*) > 1`,
      [userId]
    );

    if (duplicateRows.length === 0) {
      return res.json({ success: true, count: 0, totalDuplicateLeads: 0, duplicateGroups: [] });
    }

    const duplicateGroups = [];

    for (const dup of duplicateRows) {
      const leads = await getAll(
        `SELECT * FROM leads WHERE user_id = ? AND normalized_url = ? ORDER BY id ASC`,
        [userId, dup.normalized_url]
      );

      // Calculate score for each lead to recommend best one
      let bestLead = null;
      let highestScore = -1;

      leads.forEach((l) => {
        let score = 0;
        if (l.company_name && l.company_name !== 'Imported Company') score += 15;
        if (l.website) score += 15;
        if (l.email) score += 20;
        if (l.phone) score += 20;
        if (l.contact_person) score += 15;
        if (l.address || l.city) score += 10;
        if (l.products || l.services || l.notes) score += 5;

        // Give slight priority to older records if information completeness is equal
        score += (10000000000000 - new Date(l.created_at || Date.now()).getTime()) / 1000000000000;

        if (score > highestScore) {
          highestScore = score;
          bestLead = l;
        }
      });

      duplicateGroups.push({
        normalizedUrl: dup.normalized_url,
        count: dup.cnt,
        recommendedId: bestLead ? bestLead.id : leads[0].id,
        leads
      });
    }

    res.json({
      success: true,
      count: duplicateGroups.length,
      totalDuplicateLeads: duplicateGroups.reduce((acc, g) => acc + g.count, 0),
      duplicateGroups
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 14. MERGE DUPLICATE LEADS ENDPOINT
router.post('/leads/merge', async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { primaryId, duplicateIds } = req.body;

    if (!primaryId || !Array.isArray(duplicateIds) || duplicateIds.length === 0) {
      return res.status(400).json({ error: 'primaryId and array of duplicateIds are required' });
    }

    const primaryLead = await getRow(`SELECT * FROM leads WHERE id = ? AND user_id = ?`, [primaryId, userId]);
    if (!primaryLead) return res.status(404).json({ error: 'Primary lead not found' });

    const placeholders = duplicateIds.map(() => '?').join(',');
    const duplicateLeads = await getAll(
      `SELECT * FROM leads WHERE user_id = ? AND id IN (${placeholders})`,
      [userId, ...duplicateIds]
    );

    // Merge non-empty values into primary lead
    const merged = { ...primaryLead };
    const fieldsToMerge = [
      'company_name', 'website', 'email', 'phone', 'contact_person', 'city', 'state', 'country',
      'address', 'location', 'category', 'categories', 'products', 'services', 'industries',
      'machines', 'applications', 'linkedin', 'facebook', 'instagram', 'youtube', 'twitter',
      'notes', 'automation_opportunity', 'whatsapp'
    ];

    duplicateLeads.forEach((dup) => {
      fieldsToMerge.forEach((f) => {
        if ((!merged[f] || merged[f] === 'Unknown' || merged[f] === '[]') && dup[f] && dup[f] !== 'Unknown' && dup[f] !== '[]') {
          merged[f] = dup[f];
        } else if (f === 'notes' && dup.notes && dup.notes !== merged.notes) {
          merged.notes = (merged.notes + '\n' + dup.notes).trim();
        }
      });
    });

    await runQuery(
      `UPDATE leads SET
        company_name = ?, website = ?, email = ?, phone = ?, contact_person = ?, city = ?, state = ?, country = ?,
        address = ?, location = ?, category = ?, categories = ?, products = ?, services = ?, industries = ?,
        machines = ?, applications = ?, linkedin = ?, facebook = ?, instagram = ?, youtube = ?, twitter = ?,
        notes = ?, automation_opportunity = ?, whatsapp = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`,
      [
        merged.company_name, merged.website, merged.email, merged.phone, merged.contact_person, merged.city, merged.state, merged.country,
        merged.address, merged.location, merged.category, merged.categories, merged.products, merged.services, merged.industries,
        merged.machines, merged.applications, merged.linkedin, merged.facebook, merged.instagram, merged.youtube, merged.twitter,
        merged.notes, merged.automation_opportunity, merged.whatsapp, primaryId, userId
      ]
    );

    // Delete merged duplicate rows
    await runQuery(`DELETE FROM leads WHERE user_id = ? AND id IN (${placeholders})`, [userId, ...duplicateIds]);

    const updatedPrimary = await getRow(`SELECT * FROM leads WHERE id = ? AND user_id = ?`, [primaryId, userId]);
    res.json({ success: true, lead: updatedPrimary });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 15. BULK CLEAN ALL DUPLICATES ENDPOINT (KEEP RECOMMENDED)
router.post('/leads/bulk-clean-duplicates', async (req, res) => {
  try {
    const userId = req.user.user_id;

    const duplicateRows = await getAll(
      `SELECT normalized_url, COUNT(*) as cnt FROM leads WHERE user_id = ? AND normalized_url != '' GROUP BY normalized_url HAVING COUNT(*) > 1`,
      [userId]
    );

    let cleanedGroupsCount = 0;
    let removedLeadsCount = 0;

    for (const dup of duplicateRows) {
      const leads = await getAll(
        `SELECT * FROM leads WHERE user_id = ? AND normalized_url = ? ORDER BY id ASC`,
        [userId, dup.normalized_url]
      );

      if (leads.length < 2) continue;

      let primary = leads[0];
      let highestScore = -1;

      leads.forEach((l) => {
        let score = 0;
        if (l.company_name && l.company_name !== 'Imported Company') score += 15;
        if (l.website) score += 15;
        if (l.email) score += 20;
        if (l.phone) score += 20;
        if (l.contact_person) score += 15;
        if (l.address || l.city) score += 10;
        if (l.products || l.services || l.notes) score += 5;
        score += (10000000000000 - new Date(l.created_at || Date.now()).getTime()) / 1000000000000;

        if (score > highestScore) {
          highestScore = score;
          primary = l;
        }
      });

      const duplicates = leads.filter((l) => l.id !== primary.id);
      const duplicateIds = duplicates.map((l) => l.id);

      const merged = { ...primary };
      const fieldsToMerge = [
        'company_name', 'website', 'email', 'phone', 'contact_person', 'city', 'state', 'country',
        'address', 'location', 'category', 'categories', 'products', 'services', 'industries',
        'machines', 'applications', 'linkedin', 'facebook', 'instagram', 'youtube', 'twitter',
        'notes', 'automation_opportunity', 'whatsapp'
      ];

      duplicates.forEach((d) => {
        fieldsToMerge.forEach((f) => {
          if ((!merged[f] || merged[f] === 'Unknown' || merged[f] === '[]') && d[f] && d[f] !== 'Unknown' && d[f] !== '[]') {
            merged[f] = d[f];
          } else if (f === 'notes' && d.notes && d.notes !== merged.notes) {
            merged.notes = (merged.notes + '\n' + d.notes).trim();
          }
        });
      });

      await runQuery(
        `UPDATE leads SET
          company_name = ?, website = ?, email = ?, phone = ?, contact_person = ?, city = ?, state = ?, country = ?,
          address = ?, location = ?, category = ?, categories = ?, products = ?, services = ?, industries = ?,
          machines = ?, applications = ?, linkedin = ?, facebook = ?, instagram = ?, youtube = ?, twitter = ?,
          notes = ?, automation_opportunity = ?, whatsapp = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND user_id = ?`,
        [
          merged.company_name, merged.website, merged.email, merged.phone, merged.contact_person, merged.city, merged.state, merged.country,
          merged.address, merged.location, merged.category, merged.categories, merged.products, merged.services, merged.industries,
          merged.machines, merged.applications, merged.linkedin, merged.facebook, merged.instagram, merged.youtube, merged.twitter,
          merged.notes, merged.automation_opportunity, merged.whatsapp, primary.id, userId
        ]
      );

      const placeholders = duplicateIds.map(() => '?').join(',');
      await runQuery(`DELETE FROM leads WHERE user_id = ? AND id IN (${placeholders})`, [userId, ...duplicateIds]);

      cleanedGroupsCount++;
      removedLeadsCount += duplicateIds.length;
    }

    res.json({ success: true, cleanedGroupsCount, removedLeadsCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 16. IMPORT HISTORY ENDPOINT
router.get('/import/history', async (req, res) => {
  try {
    const history = await getAll(`SELECT * FROM import_history WHERE user_id = ? ORDER BY id DESC`, [req.user.user_id]);
    res.json({ success: true, history });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 17. VERIFY CSV QUEUE ENDPOINT (WEBSITE SCANNING & COMPANY DATA EXTRACTION PIPELINE)
router.post('/leads/verify-queue', async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { rows, allowMissingWebsite, concurrency } = req.body;

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: 'Rows array required' });
    }

    const verificationResult = await verifyCsvQueue({
      userId,
      rows,
      allowMissingWebsite: !!allowMissingWebsite,
      concurrency: concurrency || 5
    });

    res.json(verificationResult);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 17B. VERIFY CSV BATCH CHUNK ENDPOINT (STREAMING REAL-TIME VERIFICATION PROGRESS)
router.post('/leads/verify-chunk', async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { rowsChunk, allowMissingWebsite, existingDomains, concurrency } = req.body;

    if (!Array.isArray(rowsChunk) || rowsChunk.length === 0) {
      return res.status(400).json({ error: 'rowsChunk array required' });
    }

    const existingDomainsSet = new Set(Array.isArray(existingDomains) ? existingDomains : []);

    const chunkResult = await verifyCsvBatchChunk({
      userId,
      rowsChunk,
      allowMissingWebsite: !!allowMissingWebsite,
      existingDomainsSet,
      concurrency: concurrency || 3
    });

    res.json(chunkResult);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 17C. RESCAN EXISTING LEADS BATCH CHUNK ENDPOINT (REFRESH WEBSITES FOR EXISTING LEADS ONLY)
router.post('/leads/rescan-chunk', async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { leadIdsChunk, concurrency } = req.body;

    if (!Array.isArray(leadIdsChunk) || leadIdsChunk.length === 0) {
      return res.status(400).json({ error: 'leadIdsChunk array required' });
    }

    const placeholders = leadIdsChunk.map(() => '?').join(',');
    const leadsChunk = await getAll(
      `SELECT * FROM leads WHERE user_id = ? AND id IN (${placeholders})`,
      [userId, ...leadIdsChunk]
    );

    const chunkResult = await rescanLeadsBatchChunk({
      userId,
      leadsChunk,
      concurrency: concurrency || 3
    });

    res.json(chunkResult);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 18. IMPORT VERIFIED LEADS ENDPOINT (FINAL SERVER-SIDE DUPLICATE CHECK & CRM INSERTION)
router.post('/leads/import-verified', async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { verifiedLeads, fileName } = req.body;

    if (!Array.isArray(verifiedLeads) || verifiedLeads.length === 0) {
      return res.status(400).json({ error: 'Array of verified lead candidates required' });
    }

    let insertedCount = 0;
    let duplicateAlreadyImportedCount = 0;

    for (const leadData of verifiedLeads) {
      const normUrl = normalizeUrl(leadData.website || leadData.normalized_url || '');

      if (normUrl) {
        const existing = await getRow(
          `SELECT id FROM leads WHERE user_id = ? AND normalized_url = ?`,
          [userId, normUrl]
        );

        if (existing) {
          duplicateAlreadyImportedCount++;
          continue;
        }
      }

      try {
        const lead_id = await generateLeadId();
        const normPhone = normalizePhone(leadData.phone || '');

        // Strict Backend Single-Source-of-Truth Status Validation
        const rawWebStatus = leadData.website_status || '🟢 Accessible';
        const isNotAccessible =
          rawWebStatus.includes('Not Accessible') ||
          rawWebStatus.includes('Unreachable') ||
          rawWebStatus.includes('404') ||
          rawWebStatus.includes('500') ||
          rawWebStatus.includes('Timeout');

        const website_status = isNotAccessible
          ? '🔴 Not Accessible'
          : rawWebStatus.includes('Redirected')
          ? '🟡 Redirected'
          : '🟢 Accessible';

        const verification_status = isNotAccessible ? 'Needs Review' : leadData.verification_status || 'Verified';
        const verified_at = verification_status === 'Verified' ? new Date().toISOString() : null;
        const last_website_check_at = new Date().toISOString();

        const sql = `INSERT INTO leads (
          lead_id, user_id, company_name, website, normalized_url, category, categories, location, address, city, state, country,
          phone, normalized_phone, email, contact_person, products, services, notes, search_query, confidence_score,
          website_status, verification_status, verified_at, last_website_check_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'CSV Verified Import', ?, ?, ?, ?, ?)`;

        const params = [
          lead_id,
          userId,
          leadData.company_name || 'Imported Company',
          leadData.website || '',
          normUrl || '',
          leadData.category || '',
          leadData.categories || '[]',
          leadData.location || '',
          leadData.address || '',
          leadData.city || 'Unknown',
          leadData.state || 'Unknown',
          leadData.country || 'India',
          leadData.phone || '',
          normPhone,
          leadData.email || '',
          leadData.contact_person || '',
          leadData.products || '',
          leadData.services || '',
          leadData.notes || '',
          leadData.confidence_score || 'HIGH',
          website_status,
          verification_status,
          verified_at,
          last_website_check_at
        ];

        const result = await runQuery(sql, params);
        insertedCount++;

        // Add contact record if contact person or email exists
        if (leadData.contact_person || leadData.email) {
          try {
            await runQuery(
              `INSERT INTO contacts (lead_id, user_id, name, email, phone, designation, department) VALUES (?, ?, ?, ?, ?, 'Contact Person', 'General')`,
              [lead_id, userId, leadData.contact_person || leadData.company_name, leadData.email || '', leadData.phone || '']
            );
          } catch (e) {}
        }
      } catch (err) {
        if (err.message && err.message.includes('UNIQUE constraint failed')) {
          duplicateAlreadyImportedCount++;
        }
      }
    }

    // Save Import History Log
    try {
      await runQuery(
        `INSERT INTO import_history (user_id, file_name, total_rows, imported_count, existing_duplicates_count, csv_duplicates_count, invalid_websites_count, missing_websites_count)
         VALUES (?, ?, ?, ?, ?, 0, 0, 0)`,
        [userId, fileName || 'verified_import.csv', verifiedLeads.length, insertedCount, duplicateAlreadyImportedCount]
      );
    } catch (e) {}

    res.json({
      success: true,
      totalSubmitted: verifiedLeads.length,
      insertedCount,
      duplicateAlreadyImportedCount
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
