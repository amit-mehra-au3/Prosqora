const { getRow, getAll, runQuery } = require('../db');
const { sendGmailMessage } = require('./gmailService');

// Active running campaign timers map
const activeCampaignTimers = new Map();

/**
 * Perform Variable Replacement on Email Templates
 */
function substituteVariables(templateText, lead = {}) {
  if (!templateText) return '';

  let contactsList = [];
  try {
    contactsList = typeof lead.contacts === 'string' ? JSON.parse(lead.contacts || '[]') : lead.contacts;
  } catch (e) {}
  if (!Array.isArray(contactsList)) contactsList = [];

  let rawContactName = lead.contact_person || (contactsList[0] ? contactsList[0].name : '') || '';
  rawContactName = rawContactName.trim();

  let contactName = rawContactName || "Sir/Ma’am";
  let firstName = rawContactName ? rawContactName.split(' ')[0] : "Sir/Ma’am";

  let companyName = (lead.company_name || '').trim() || 'your esteemed organization';
  let city = (lead.city || '').trim() || 'your location';
  let email = (lead.email || '').trim() || 'amautomationtrading@gmail.com';
  let phone = (lead.phone || '').trim() || '+91 86072 85969';

  let senderName = 'Amit Mehra';
  let businessName = 'AM Automation Trading';
  let productInterest = (lead.products || lead.category || '').trim() || 'industrial automation components';

  let text = templateText;
  text = text.replace(/\{\{\s*contact_name\s*\}\}/gi, contactName);
  text = text.replace(/\{\{\s*first_name\s*\}\}/gi, firstName);
  text = text.replace(/\{\{\s*company_name\s*\}\}/gi, companyName);
  text = text.replace(/\{\{\s*city\s*\}\}/gi, city);
  text = text.replace(/\{\{\s*email\s*\}\}/gi, email);
  text = text.replace(/\{\{\s*phone\s*\}\}/gi, phone);
  text = text.replace(/\{\{\s*sender_name\s*\}\}/gi, senderName);
  text = text.replace(/\{\{\s*business_name\s*\}\}/gi, businessName);
  text = text.replace(/\{\{\s*product_interest\s*\}\}/gi, productInterest);

  return text;
}

/**
 * Validate Recipient Email Address Format
 */
function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const clean = email.trim().toLowerCase();
  if (clean.includes('example.com') || clean.includes('sentry') || clean.includes('domain.com')) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean);
}

/**
 * Pre-Flight Recipient Audit
 */
async function auditCampaignRecipients({ userId, leadIds, allowPreviouslyContacted = false, isTestMode = false, testEmail = '' }) {
  const validLeads = [];
  let skippedInvalid = 0;
  let skippedDuplicates = 0;
  let skippedSuppressed = 0;

  for (const leadId of leadIds) {
    const lead = await getRow(`SELECT * FROM leads WHERE id = ? AND user_id = ?`, [leadId, userId]);
    if (!lead) continue;

    if (lead.suppressed) {
      skippedSuppressed++;
      continue;
    }

    const email = (lead.email || '').trim();
    if (!isTestMode && !isValidEmail(email)) {
      skippedInvalid++;
      continue;
    }

    // Check duplicate sent in last 14 days
    if (!allowPreviouslyContacted && !isTestMode && email) {
      const recentLog = await getRow(
        `SELECT id FROM email_logs WHERE user_id = ? AND recipient_email = ? AND status = 'Sent' AND sent_at >= datetime('now', '-14 days')`,
        [userId, email]
      );
      if (recentLog) {
        skippedDuplicates++;
        continue;
      }
    }

    validLeads.push(lead);
  }

  return {
    validLeads,
    totalSelected: leadIds.length,
    validCount: validLeads.length,
    skippedInvalid,
    skippedDuplicates,
    skippedSuppressed,
    totalSkipped: skippedInvalid + skippedDuplicates + skippedSuppressed
  };
}

/**
 * Process Next Item in Email Queue (Sequential with 7-12s Delay)
 */
async function processNextCampaignEmail(campaignId) {
  const campaign = await getRow(`SELECT * FROM email_campaigns WHERE campaign_id = ?`, [campaignId]);

  if (!campaign || campaign.status !== 'Running') {
    activeCampaignTimers.delete(campaignId);
    return;
  }

  // Check Daily Sending Safety Limit
  const todayStr = new Date().toISOString().split('T')[0];
  const todaySentRow = await getRow(
    `SELECT COUNT(*) as cnt FROM email_logs WHERE user_id = ? AND status = 'Sent' AND date(sent_at) = ?`,
    [campaign.user_id, todayStr]
  );
  const todaySent = todaySentRow ? todaySentRow.cnt : 0;

  if (todaySent >= campaign.daily_limit && !campaign.is_test_mode) {
    await runQuery(`UPDATE email_campaigns SET status = 'Paused', updated_at = CURRENT_TIMESTAMP WHERE campaign_id = ?`, [campaignId]);
    activeCampaignTimers.delete(campaignId);
    console.log(`[CAMPAIGN QUEUE] Campaign ${campaignId} paused: Daily limit (${campaign.daily_limit}) reached.`);
    return;
  }

  // Get Next Pending Item in Log Queue
  const nextLog = await getRow(
    `SELECT * FROM email_logs WHERE campaign_id = ? AND status = 'Pending' ORDER BY id ASC LIMIT 1`,
    [campaignId]
  );

  if (!nextLog) {
    // Campaign Complete! Calculate final status
    const finalStatus = (campaign.sent_count === 0 && campaign.failed_count > 0) ? 'Failed' : 'Completed';
    await runQuery(
      `UPDATE email_campaigns SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE campaign_id = ?`,
      [finalStatus, campaignId]
    );
    activeCampaignTimers.delete(campaignId);
    console.log(`[CAMPAIGN QUEUE] Campaign ${campaignId} finished with status: ${finalStatus}`);
    return;
  }

  // Update Log Status to 'Sending'
  await runQuery(`UPDATE email_logs SET status = 'Sending' WHERE id = ?`, [nextLog.id]);

  try {
    const res = await sendGmailMessage({
      userId: campaign.user_id,
      to: nextLog.recipient_email,
      subject: nextLog.subject,
      body: nextLog.body,
      businessCardImage: campaign.business_card_image || '',
      fromName: 'AM Automation Trading',
      isTestMode: !!campaign.is_test_mode,
      testEmail: campaign.test_email
    });

    // Update Log as Sent
    await runQuery(
      `UPDATE email_logs SET status = 'Sent', sent_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [nextLog.id]
    );

    // Update Lead last_email_sent_at
    if (nextLog.lead_id) {
      await runQuery(
        `UPDATE leads SET last_email_sent_at = CURRENT_TIMESTAMP, lead_status = CASE WHEN lead_status = 'New' THEN 'Contacted' ELSE lead_status END WHERE id = ?`,
        [nextLog.lead_id]
      );
    }

    // Update Campaign Stats
    await runQuery(
      `UPDATE email_campaigns SET sent_count = sent_count + 1, updated_at = CURRENT_TIMESTAMP WHERE campaign_id = ?`,
      [campaignId]
    );

    console.log(`[CAMPAIGN QUEUE] Email sent to ${nextLog.recipient_email} (${res.messageId})`);
  } catch (err) {
    console.error(`[CAMPAIGN QUEUE] Email failed for ${nextLog.recipient_email}:`, err.message);

    await runQuery(
      `UPDATE email_logs SET status = 'Failed', error_message = ?, sent_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [err.message, nextLog.id]
    );

    await runQuery(
      `UPDATE email_campaigns SET failed_count = failed_count + 1, updated_at = CURRENT_TIMESTAMP WHERE campaign_id = ?`,
      [campaignId]
    );

    // Auto-Pause if Gmail Authentication or Quota Error occurs
    if (err.message.includes('expired') || err.message.includes('rate limit')) {
      await runQuery(`UPDATE email_campaigns SET status = 'Paused' WHERE campaign_id = ?`, [campaignId]);
      activeCampaignTimers.delete(campaignId);
      return;
    }
  }

  // Schedule Next Lead with Randomized 7-12 Second Delay
  const delayMs = campaign.is_test_mode ? 2000 : Math.floor(Math.random() * 5000) + 7000;

  const timer = setTimeout(() => {
    processNextCampaignEmail(campaignId);
  }, delayMs);

  activeCampaignTimers.set(campaignId, timer);
}

/**
 * Start Campaign Queue Execution
 */
async function startCampaignQueue(campaignId) {
  if (activeCampaignTimers.has(campaignId)) return;
  await runQuery(`UPDATE email_campaigns SET status = 'Running', updated_at = CURRENT_TIMESTAMP WHERE campaign_id = ?`, [campaignId]);
  processNextCampaignEmail(campaignId);
}

/**
 * Pause Campaign Execution
 */
async function pauseCampaignQueue(campaignId) {
  if (activeCampaignTimers.has(campaignId)) {
    clearTimeout(activeCampaignTimers.get(campaignId));
    activeCampaignTimers.delete(campaignId);
  }
  await runQuery(`UPDATE email_campaigns SET status = 'Paused', updated_at = CURRENT_TIMESTAMP WHERE campaign_id = ?`, [campaignId]);
}

/**
 * Stop Campaign Execution
 */
async function stopCampaignQueue(campaignId) {
  if (activeCampaignTimers.has(campaignId)) {
    clearTimeout(activeCampaignTimers.get(campaignId));
    activeCampaignTimers.delete(campaignId);
  }
  await runQuery(`UPDATE email_campaigns SET status = 'Stopped', updated_at = CURRENT_TIMESTAMP WHERE campaign_id = ?`, [campaignId]);
  await runQuery(`UPDATE email_logs SET status = 'Cancelled' WHERE campaign_id = ? AND status = 'Pending'`, [campaignId]);
}

module.exports = {
  substituteVariables,
  isValidEmail,
  auditCampaignRecipients,
  startCampaignQueue,
  pauseCampaignQueue,
  stopCampaignQueue,
  processNextCampaignEmail
};
