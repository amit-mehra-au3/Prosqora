const { getRow, getAll, runQuery } = require('../db');
const { sendGmailMessage } = require('./gmailService');

// Active running campaign timers and status map
const activeCampaignTimers = new Map();
const campaignCountdownMap = new Map();

/**
 * Hard Application Safety Cap: 499 Emails per Rolling 24 Hours
 */
const HARD_APPLICATION_DAILY_CAP = 499;

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

    // Check duplicate send to recipient in last 24h (or 14 days)
    if (!isTestMode && email) {
      const isPostgres = process.env.DATABASE_URL && process.env.DATABASE_URL.includes('postgres');
      const intervalStr = allowPreviouslyContacted ? '24 hours' : '14 days';
      const query = isPostgres
        ? `SELECT id FROM email_logs WHERE user_id = $1 AND recipient_email = $2 AND status = 'Sent' AND sent_at >= NOW() - INTERVAL '${intervalStr}'`
        : `SELECT id FROM email_logs WHERE user_id = ? AND recipient_email = ? AND status = 'Sent' AND sent_at >= datetime('now', '-${intervalStr}')`;

      const recentLog = await getRow(query, [userId, email]);
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
 * Retrieve or Initialize User Email Settings (Min/Max Delay, Auto-Resume)
 */
async function getEmailSettings(userId) {
  let settings = await getRow(`SELECT * FROM email_settings WHERE user_id = ?`, [userId]);
  if (!settings) {
    await runQuery(
      `INSERT INTO email_settings (user_id, min_delay_sec, max_delay_sec, auto_resume, pause_on_quota_error) VALUES (?, 2, 5, 1, 1)`,
      [userId]
    );
    settings = {
      user_id: userId,
      min_delay_sec: 2,
      max_delay_sec: 5,
      auto_resume: 1,
      pause_on_quota_error: 1
    };
  }
  return {
    min_delay_sec: Math.max(1, parseInt(settings.min_delay_sec) || 2),
    max_delay_sec: Math.max(Math.max(1, parseInt(settings.min_delay_sec) || 2), parseInt(settings.max_delay_sec) || 5),
    auto_resume: settings.auto_resume !== 0,
    pause_on_quota_error: settings.pause_on_quota_error !== 0
  };
}

/**
 * Calculate Server-Side Authoritative 499 / Rolling 24-Hour Sending Capacity
 */
async function getSendingCapacity(userId) {
  const isPostgres = process.env.DATABASE_URL && process.env.DATABASE_URL.includes('postgres');
  const query = isPostgres
    ? `SELECT id, sent_at FROM email_logs WHERE user_id = $1 AND status = 'Sent' AND is_test_mode = 0 AND sent_at >= NOW() - INTERVAL '24 hours' ORDER BY sent_at ASC`
    : `SELECT id, sent_at FROM email_logs WHERE user_id = ? AND status = 'Sent' AND is_test_mode = 0 AND sent_at >= datetime('now', '-24 hours') ORDER BY sent_at ASC`;

  const recentSends = await getAll(query, [userId]);
  const used = recentSends.length;
  const remaining = Math.max(0, HARD_APPLICATION_DAILY_CAP - used);
  const isCapReached = used >= HARD_APPLICATION_DAILY_CAP;

  let nextAvailableAt = null;
  let secondsUntilAvailable = 0;

  if (used > 0) {
    const oldestSend = recentSends[0];
    const oldestTime = new Date(oldestSend.sent_at).getTime();
    const availableTime = oldestTime + (24 * 60 * 60 * 1000);
    const nowTime = Date.now();

    if (availableTime > nowTime) {
      nextAvailableAt = new Date(availableTime).toISOString();
      secondsUntilAvailable = Math.ceil((availableTime - nowTime) / 1000);
    }
  }

  return {
    limit: HARD_APPLICATION_DAILY_CAP,
    used,
    remaining,
    windowHours: 24,
    isCapReached,
    nextAvailableAt,
    secondsUntilAvailable
  };
}

/**
 * Process Next Item in Email Queue (Idempotent Server-Side Queue Worker)
 */
async function processNextCampaignEmail(campaignId) {
  const campaign = await getRow(`SELECT * FROM email_campaigns WHERE campaign_id = ?`, [campaignId]);

  if (!campaign || (campaign.status !== 'Running' && campaign.status !== 'QUEUED')) {
    activeCampaignTimers.delete(campaignId);
    campaignCountdownMap.delete(campaignId);
    return;
  }

  // 1. Check Hard 499 / Rolling 24-Hour Application Capacity
  const capacity = await getSendingCapacity(campaign.user_id);

  if (capacity.isCapReached && !campaign.is_test_mode) {
    await runQuery(
      `UPDATE email_campaigns SET status = 'CAP_REACHED', updated_at = CURRENT_TIMESTAMP WHERE campaign_id = ?`,
      [campaignId]
    );
    activeCampaignTimers.delete(campaignId);
    campaignCountdownMap.delete(campaignId);
    console.log(`[CAMPAIGN QUEUE] Campaign ${campaignId} set to CAP_REACHED. 499/24h cap reached. Next available at ${capacity.nextAvailableAt}`);
    return;
  }

  // 2. Fetch User's Configured Sending Delays
  const settings = await getEmailSettings(campaign.user_id);

  // 3. Atomically Reserve Next Pending Item in Log Queue
  const nextLogItem = await getRow(
    `SELECT * FROM email_logs WHERE campaign_id = ? AND status = 'Pending' ORDER BY id ASC LIMIT 1`,
    [campaignId]
  );

  if (!nextLogItem) {
    // Campaign Finished! Calculate final status
    const finalStatus = (campaign.sent_count === 0 && campaign.failed_count > 0) ? 'Failed' : 'Completed';
    await runQuery(
      `UPDATE email_campaigns SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE campaign_id = ?`,
      [finalStatus, campaignId]
    );
    activeCampaignTimers.delete(campaignId);
    campaignCountdownMap.delete(campaignId);
    console.log(`[CAMPAIGN QUEUE] Campaign ${campaignId} completed with status: ${finalStatus}`);
    return;
  }

  // 4. Check 24-Hour Duplicate Send Protection Rule (Max 1 send per recipient per 24 hours)
  if (!campaign.is_test_mode && nextLogItem.recipient_email) {
    const isPostgres = process.env.DATABASE_URL && process.env.DATABASE_URL.includes('postgres');
    const recentQuery = isPostgres
      ? `SELECT id, sent_at FROM email_logs WHERE user_id = $1 AND recipient_email = $2 AND status = 'Sent' AND sent_at >= NOW() - INTERVAL '24 hours' AND id != $3`
      : `SELECT id, sent_at FROM email_logs WHERE user_id = ? AND recipient_email = ? AND status = 'Sent' AND sent_at >= datetime('now', '-24 hours') AND id != ?`;

    const recent24hLog = await getRow(recentQuery, [campaign.user_id, nextLogItem.recipient_email, nextLogItem.id]);
    if (recent24hLog) {
      await runQuery(
        `UPDATE email_logs SET status = 'Skipped', error_message = 'Already sent email in last 24 hours', sent_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [nextLogItem.id]
      );
      await runQuery(
        `UPDATE email_campaigns SET skipped_count = skipped_count + 1, updated_at = CURRENT_TIMESTAMP WHERE campaign_id = ?`,
        [campaignId]
      );
      console.log(`[CAMPAIGN QUEUE] Skipped duplicate send to ${nextLogItem.recipient_email} (Already contacted in last 24h)`);

      // Immediately process next queue item without delay
      return setTimeout(() => processNextCampaignEmail(campaignId), 100);
    }
  }

  // Atomic Status Lock: Update status to 'Sending' so no parallel worker claims it
  const updateRes = await runQuery(
    `UPDATE email_logs SET status = 'Sending' WHERE id = ? AND status = 'Pending'`,
    [nextLogItem.id]
  );

  if (updateRes.changes === 0 && process.env.DATABASE_URL) {
    // Retry if race condition occurred
    return setTimeout(() => processNextCampaignEmail(campaignId), 500);
  }

  try {
    const res = await sendGmailMessage({
      userId: campaign.user_id,
      to: nextLogItem.recipient_email,
      subject: nextLogItem.subject,
      body: nextLogItem.body,
      businessCardImage: campaign.business_card_image || '',
      fromName: 'AM Automation Trading',
      isTestMode: !!campaign.is_test_mode,
      testEmail: campaign.test_email
    });

    // Mark Log as Sent
    await runQuery(
      `UPDATE email_logs SET status = 'Sent', sent_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [nextLogItem.id]
    );

    // Update Lead last_email_sent_at
    if (nextLogItem.lead_id) {
      await runQuery(
        `UPDATE leads SET last_email_sent_at = CURRENT_TIMESTAMP, lead_status = CASE WHEN lead_status = 'New' THEN 'Contacted' ELSE lead_status END WHERE id = ?`,
        [nextLogItem.lead_id]
      );
    }

    // Update Campaign Stats
    await runQuery(
      `UPDATE email_campaigns SET sent_count = sent_count + 1, status = 'Running', updated_at = CURRENT_TIMESTAMP WHERE campaign_id = ?`,
      [campaignId]
    );

    console.log(`[CAMPAIGN QUEUE] Email sent successfully to ${nextLogItem.recipient_email} (${res.messageId})`);
  } catch (err) {
    console.error(`[CAMPAIGN QUEUE] Email failed for ${nextLogItem.recipient_email}:`, err.message);

    const isQuotaErr = err.message.includes('quota') || err.message.includes('rate limit') || err.message.includes('429');
    const failStatus = isQuotaErr ? 'Failed' : 'Failed';

    await runQuery(
      `UPDATE email_logs SET status = ?, error_message = ?, sent_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [failStatus, err.message, nextLogItem.id]
    );

    await runQuery(
      `UPDATE email_campaigns SET failed_count = failed_count + 1, updated_at = CURRENT_TIMESTAMP WHERE campaign_id = ?`,
      [campaignId]
    );

    if (isQuotaErr) {
      await runQuery(
        `UPDATE email_campaigns SET status = 'GMAIL_LIMIT_REACHED', updated_at = CURRENT_TIMESTAMP WHERE campaign_id = ?`,
        [campaignId]
      );
      activeCampaignTimers.delete(campaignId);
      campaignCountdownMap.delete(campaignId);
      console.log(`[CAMPAIGN QUEUE] Campaign ${campaignId} paused: Gmail quota/rate limit error encountered.`);
      return;
    }
  }

  // 4. Calculate Randomized Delay for Next Send
  let delaySec = 3;
  if (campaign.is_test_mode) {
    delaySec = 1.5;
  } else {
    const minD = settings.min_delay_sec;
    const maxD = settings.max_delay_sec;
    delaySec = (Math.random() * (maxD - minD)) + minD;
    delaySec = Math.round(delaySec * 10) / 10; // Round to 1 decimal
  }

  const delayMs = delaySec * 1000;
  campaignCountdownMap.set(campaignId, {
    nextEmailInSec: delaySec,
    targetTimestamp: Date.now() + delayMs
  });

  const timer = setTimeout(() => {
    processNextCampaignEmail(campaignId);
  }, delayMs);

  activeCampaignTimers.set(campaignId, timer);
}

/**
 * Start Campaign Queue Execution
 */
async function startCampaignQueue(campaignId) {
  const campaign = await getRow(`SELECT * FROM email_campaigns WHERE campaign_id = ?`, [campaignId]);
  if (!campaign) return;

  const capacity = await getSendingCapacity(campaign.user_id);
  if (capacity.isCapReached && !campaign.is_test_mode) {
    await runQuery(`UPDATE email_campaigns SET status = 'CAP_REACHED', updated_at = CURRENT_TIMESTAMP WHERE campaign_id = ?`, [campaignId]);
    return { success: false, reason: 'cap_reached', capacity };
  }

  await runQuery(`UPDATE email_campaigns SET status = 'Running', updated_at = CURRENT_TIMESTAMP WHERE campaign_id = ?`, [campaignId]);

  if (!activeCampaignTimers.has(campaignId)) {
    processNextCampaignEmail(campaignId);
  }
  return { success: true };
}

/**
 * Pause Campaign Execution
 */
async function pauseCampaignQueue(campaignId) {
  if (activeCampaignTimers.has(campaignId)) {
    clearTimeout(activeCampaignTimers.get(campaignId));
    activeCampaignTimers.delete(campaignId);
  }
  campaignCountdownMap.delete(campaignId);
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
  campaignCountdownMap.delete(campaignId);
  await runQuery(`UPDATE email_campaigns SET status = 'Stopped', updated_at = CURRENT_TIMESTAMP WHERE campaign_id = ?`, [campaignId]);
  await runQuery(`UPDATE email_logs SET status = 'Cancelled' WHERE campaign_id = ? AND status = 'Pending'`, [campaignId]);
}

/**
 * Clear Pending Queue Jobs for a Campaign
 */
async function clearCampaignQueue(campaignId) {
  await runQuery(`DELETE FROM email_logs WHERE campaign_id = ? AND status = 'Pending'`, [campaignId]);
  const pendingRow = await getRow(`SELECT COUNT(*) as cnt FROM email_logs WHERE campaign_id = ? AND status = 'Pending'`, [campaignId]);
  if (!pendingRow || pendingRow.cnt === 0) {
    const campaign = await getRow(`SELECT * FROM email_campaigns WHERE campaign_id = ?`, [campaignId]);
    if (campaign && (campaign.status === 'Running' || campaign.status === 'Paused')) {
      const finalStatus = (campaign.sent_count === 0 && campaign.failed_count > 0) ? 'Failed' : 'Completed';
      await runQuery(`UPDATE email_campaigns SET status = ? WHERE campaign_id = ?`, [finalStatus, campaignId]);
    }
  }
}

/**
 * Get Next Email Countdown Timer info for a running campaign
 */
function getCampaignCountdown(campaignId) {
  const info = campaignCountdownMap.get(campaignId);
  if (!info) return null;
  const remainingSec = Math.max(0, Math.round((info.targetTimestamp - Date.now()) / 100) / 10);
  return {
    nextEmailInSec: remainingSec
  };
}

/**
 * Global Background Worker & Auto-Resumer
 * Periodically checks for CAP_REACHED campaigns that can resume, and restores un-started RUNNING campaigns
 */
function initCampaignQueueWorker() {
  setInterval(async () => {
    try {
      // 1. Auto-resume CAP_REACHED campaigns when 24h capacity becomes available
      const capReachedCampaigns = await getAll(`SELECT * FROM email_campaigns WHERE status = 'CAP_REACHED'`);
      for (const camp of capReachedCampaigns) {
        const cap = await getSendingCapacity(camp.user_id);
        const settings = await getEmailSettings(camp.user_id);
        if (cap.remaining > 0 && settings.auto_resume) {
          console.log(`[CAMPAIGN AUTO-RESUME] Capacity available (${cap.remaining} remaining). Auto-resuming campaign ${camp.campaign_id}`);
          startCampaignQueue(camp.campaign_id);
        }
      }

      // 2. Restore active Running campaigns if server restarted or timer dropped
      const runningCampaigns = await getAll(`SELECT * FROM email_campaigns WHERE status = 'Running' OR status = 'QUEUED'`);
      for (const camp of runningCampaigns) {
        if (!activeCampaignTimers.has(camp.campaign_id)) {
          const pendingRow = await getRow(`SELECT COUNT(*) as cnt FROM email_logs WHERE campaign_id = ? AND status = 'Pending'`, [camp.campaign_id]);
          if (pendingRow && pendingRow.cnt > 0) {
            console.log(`[CAMPAIGN RESTORE] Restoring running campaign worker for ${camp.campaign_id}`);
            processNextCampaignEmail(camp.campaign_id);
          }
        }
      }
    } catch (e) {
      console.error('[CAMPAIGN WORKER POLL ERROR]', e.message);
    }
  }, 20000); // Check every 20 seconds
}

// Initialize queue worker automatically
initCampaignQueueWorker();

module.exports = {
  substituteVariables,
  isValidEmail,
  auditCampaignRecipients,
  getEmailSettings,
  getSendingCapacity,
  startCampaignQueue,
  pauseCampaignQueue,
  stopCampaignQueue,
  clearCampaignQueue,
  getCampaignCountdown,
  processNextCampaignEmail
};
