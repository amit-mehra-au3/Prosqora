const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const { getRow, getAll, runQuery } = require('../db');
const { getAuthUrl, getTokensFromCode, validateOAuthCredentials, sendGmailMessage, getDynamicRedirectUri } = require('../services/gmailService');
const {
  substituteVariables,
  auditCampaignRecipients,
  startCampaignQueue,
  pauseCampaignQueue,
  stopCampaignQueue
} = require('../services/campaignQueue');

// OAuth Callback with Strict Identity Verification
router.get('/gmail/oauth/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    if (!code) return res.status(400).send('Authorization code missing');

    const userId = state || 'demo_user';
    const computedRedirectUri = getDynamicRedirectUri(req);
    const { email, tokens } = await getTokensFromCode(code, req, computedRedirectUri);

    const targetEmail = 'amautomationtrading@gmail.com';

    // STRICT IDENTITY CHECK: Require amautomationtrading@gmail.com
    if (email.toLowerCase() !== targetEmail.toLowerCase()) {
      return res.send(`
        <html>
          <body style="font-family: sans-serif; background: #0f172a; color: white; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0;">
            <div style="text-align: center; padding: 2.5rem; background: #1e293b; border-radius: 1rem; border: 1px solid #ef4444; max-width: 480px;">
              <h2 style="color: #ef4444; margin-top: 0;">⚠️ Wrong Gmail Account Connected</h2>
              <p style="font-size: 14px; color: #cbd5e1; line-height: 1.5;">
              You connected <strong>${email}</strong>, but Prosqora CRM requires the official business account:
            </p>
              <div style="background: #0f172a; padding: 0.75rem; border-radius: 0.5rem; margin: 1rem 0; font-family: monospace; font-weight: bold; color: #f97316;">
                amautomationtrading@gmail.com
              </div>
              <p style="font-size: 13px; color: #94a3b8; margin-bottom: 1.5rem;">
                Campaign emails will NOT be sent from personal Google accounts. Please click below to select your business account.
              </p>
              <button onclick="window.location.href='/api/gmail/auth-url'" style="background: #f97316; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 0.5rem; font-weight: bold; cursor: pointer; font-size: 14px;">
                Reconnect Business Gmail
              </button>
            </div>
          </body>
        </html>
      `);
    }

    await runQuery(
      `INSERT INTO gmail_tokens (user_id, email, access_token, refresh_token, scope, token_type, expiry_date)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         email = ?, access_token = ?, refresh_token = COALESCE(?, refresh_token),
         expiry_date = ?, updated_at = CURRENT_TIMESTAMP`,
      [
        userId, email, tokens.access_token, tokens.refresh_token || '', tokens.scope || '', tokens.token_type || 'Bearer', tokens.expiry_date || 0,
        email, tokens.access_token, tokens.refresh_token || null, tokens.expiry_date || 0
      ]
    );

    // Redirect to frontend settings page with success indicator
    res.send(`
      <html>
        <body style="font-family: sans-serif; background: #0f172a; color: white; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0;">
          <div style="text-align: center; padding: 2.5rem; background: #1e293b; border-radius: 1rem; border: 1px solid #22c55e; max-width: 480px;">
            <h2 style="color: #22c55e; margin-top: 0;">✅ Official Business Gmail Connected!</h2>
            <p style="font-size: 14px; color: #cbd5e1;">Connected Account:</p>
            <div style="background: #0f172a; padding: 0.75rem; border-radius: 0.5rem; margin: 1rem 0; font-family: monospace; font-weight: bold; color: #22c55e;">
              ${email}
            </div>
            <p style="font-size: 13px; color: #94a3b8;">Closing window and returning to Prosqora CRM...</p>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'GMAIL_CONNECTED', email: '${email}' }, '*');
                window.close();
              } else {
                window.location.href = '/#/settings?gmail=success';
              }
            </script>
          </div>
        </body>
      </html>
    `);
  } catch (err) {
    res.status(500).send('Gmail Authorization Failed: ' + err.message);
  }
});

// Protect remaining routes with JWT auth
router.use(authenticateToken);

// 1. GMAIL OAUTH STATUS & AUTH URL
router.get('/gmail/auth-url', (req, res) => {
  try {
    const hostHeader = req.get('host');
    const protocol = req.protocol || 'http';
    const computedRedirectUri = process.env.GOOGLE_REDIRECT_URI || `${protocol}://${hostHeader}/api/gmail/oauth/callback`;

    const url = getAuthUrl(req.user.user_id, computedRedirectUri);
    res.json({ success: true, url, redirectUri: computedRedirectUri });
  } catch (err) {
    res.status(400).json({
      success: false,
      configured: false,
      error: err.message,
      reason: 'configuration_error'
    });
  }
});

router.get(['/gmail/status', '/gmail/oauth/status'], async (req, res) => {
  const targetEmail = 'amautomationtrading@gmail.com';
  const hostHeader = req.get('host');
  const protocol = req.protocol || 'http';
  const computedRedirectUri = process.env.GOOGLE_REDIRECT_URI || (process.env.APP_URL ? `${process.env.APP_URL.replace(/\/+$/, '')}/api/gmail/oauth/callback` : `${protocol}://${hostHeader}/api/gmail/oauth/callback`);

  const hasClientId = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_ID.trim() && !process.env.GOOGLE_CLIENT_ID.includes('dummy'));
  const hasClientSecret = Boolean(process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_CLIENT_SECRET.trim() && !process.env.GOOGLE_CLIENT_SECRET.includes('dummy'));
  const isConfigured = hasClientId && hasClientSecret;

  try {
    const tokenRow = await getRow(`SELECT * FROM gmail_tokens WHERE user_id = ?`, [req.user.user_id]);

    if (!tokenRow) {
      return res.json({
        success: true,
        configured: isConfigured,
        clientIdConfigured: hasClientId,
        redirectUri: computedRedirectUri,
        connected: false,
        reason: isConfigured ? 'not_connected' : 'configuration_error',
        email: '',
        targetEmail,
        isValidAccount: false,
        message: isConfigured ? 'No Gmail account connected. Click Connect Gmail to authenticate.' : 'Google OAuth setup required.'
      });
    }

    const isValidAccount = tokenRow.email.toLowerCase() === targetEmail.toLowerCase();
    res.json({
      success: true,
      configured: isConfigured,
      clientIdConfigured: hasClientId,
      redirectUri: computedRedirectUri,
      connected: true,
      reason: isValidAccount ? 'connected' : 'wrong_account',
      email: tokenRow.email,
      targetEmail,
      isValidAccount,
      connectedAt: tokenRow.connected_at,
      message: isValidAccount ? `Verified official business Gmail account (${tokenRow.email}) is active.` : `Connected (${tokenRow.email}).`
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Save Google OAuth Application Credentials (Admin / Super Admin Only)
router.post('/gmail/oauth/config', async (req, res) => {
  const role = (req.user?.role || '').toLowerCase();
  if (role !== 'admin' && role !== 'super_admin') {
    return res.status(403).json({ success: false, error: 'Only Workspace Admins or Super Admins can configure Google OAuth application credentials.' });
  }

  try {
    const { clientId, clientSecret, redirectUri } = req.body;
    if (!clientId || !clientId.trim()) {
      return res.status(400).json({ success: false, error: 'Google Client ID is required.' });
    }
    if (!clientSecret || !clientSecret.trim()) {
      return res.status(400).json({ success: false, error: 'Google Client Secret is required.' });
    }

    // Set process environment variables in memory
    process.env.GOOGLE_CLIENT_ID = clientId.trim();
    process.env.GOOGLE_CLIENT_SECRET = clientSecret.trim();
    if (redirectUri && redirectUri.trim()) {
      process.env.GOOGLE_REDIRECT_URI = redirectUri.trim();
    }

    // Safely update .env file if it exists locally
    const fs = require('fs');
    const path = require('path');
    const envPath = path.resolve(__dirname, '../../.env');
    if (fs.existsSync(envPath)) {
      let envContent = fs.readFileSync(envPath, 'utf8');
      const updateEnvVar = (key, val) => {
        const regex = new RegExp(`^${key}=.*$`, 'm');
        if (regex.test(envContent)) {
          envContent = envContent.replace(regex, `${key}=${val}`);
        } else {
          envContent += `\n${key}=${val}`;
        }
      };
      updateEnvVar('GOOGLE_CLIENT_ID', clientId.trim());
      updateEnvVar('GOOGLE_CLIENT_SECRET', clientSecret.trim());
      if (redirectUri && redirectUri.trim()) {
        updateEnvVar('GOOGLE_REDIRECT_URI', redirectUri.trim());
      }
      fs.writeFileSync(envPath, envContent, 'utf8');
    }

    res.json({
      success: true,
      message: 'Google OAuth credentials saved successfully.'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Disconnect Connected Gmail Account
router.post('/gmail/disconnect', async (req, res) => {
  try {
    await runQuery(`DELETE FROM gmail_tokens WHERE user_id = ?`, [req.user.user_id]);
    res.json({
      success: true,
      message: 'Gmail account disconnected successfully.'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GMAIL DIAGNOSTICS ENDPOINT (SAFE SECURE ENVIRONMENT & TOKEN DIAGNOSIS)
router.get('/gmail/diagnostics', async (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID || '';
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5001/api/gmail/oauth/callback';

  let oauthConnectionExists = false;
  let refreshTokenPresent = false;
  let gmailAccount = null;

  try {
    const tokenRow = await getRow(`SELECT * FROM gmail_tokens WHERE user_id = ?`, [req.user.user_id]);
    if (tokenRow) {
      oauthConnectionExists = true;
      gmailAccount = tokenRow.email;
      refreshTokenPresent = !!(tokenRow.refresh_token && tokenRow.refresh_token.trim());
    }
  } catch (e) {}

  res.json({
    clientIdConfigured: !!(clientId && clientId.trim() && !clientId.includes('dummy')),
    clientSecretConfigured: !!(clientSecret && clientSecret.trim() && !clientSecret.includes('dummy')),
    redirectUriConfigured: !!(redirectUri && redirectUri.trim()),
    redirectUri: redirectUri.trim(),
    oauthConnectionExists,
    refreshTokenPresent,
    gmailAccount
  });
});

router.post('/gmail/test-connection', async (req, res) => {
  const targetEmail = 'amautomationtrading@gmail.com';

  try {
    validateOAuthCredentials();
  } catch (configErr) {
    return res.json({
      success: false,
      connected: false,
      reason: 'configuration_error',
      message: configErr.message
    });
  }

  try {
    const tokenRow = await getRow(`SELECT * FROM gmail_tokens WHERE user_id = ?`, [req.user.user_id]);
    if (!tokenRow) {
      return res.json({
        success: false,
        connected: false,
        reason: 'not_connected',
        message: 'No Gmail account connected. Click Connect Gmail to authenticate.'
      });
    }

    const isValidAccount = tokenRow.email.toLowerCase() === targetEmail.toLowerCase();
    if (!isValidAccount) {
      return res.json({
        success: false,
        connected: true,
        email: tokenRow.email,
        reason: 'wrong_account',
        isValidAccount: false,
        message: `Wrong account connected (${tokenRow.email}). Please disconnect and connect ${targetEmail}.`
      });
    }

    res.json({
      success: true,
      connected: true,
      reason: 'connected',
      email: tokenRow.email,
      isValidAccount: true,
      message: `✓ Gmail connection is working! Verified official business account (${tokenRow.email}) is active.`
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// REAL GMAIL API TEST EMAIL SEND
router.post('/gmail/send-test-email', async (req, res) => {
  try {
    const { recipientEmail, subject, body, businessCardImage } = req.body;
    const targetEmail = (recipientEmail || 'amautomationtrading@gmail.com').trim();

    const sendRes = await sendGmailMessage({
      userId: req.user.user_id,
      to: targetEmail,
      subject: subject || 'Prosqora Gmail Connection Test',
      body: body || `This is a test email from Prosqora using AM Automation Trading Gmail (${new Date().toLocaleString()}).`,
      businessCardImage: businessCardImage || '',
      fromName: 'AM Automation Trading',
      isTestMode: false,
      testEmail: targetEmail
    });

    res.json({
      success: true,
      message: `✓ Real Gmail API Test Email Sent Successfully! Message ID: ${sendRes.messageId}`,
      recipient: targetEmail,
      messageId: sendRes.messageId
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
});

router.post('/gmail/disconnect', async (req, res) => {
  try {
    await runQuery(`DELETE FROM gmail_tokens WHERE user_id = ?`, [req.user.user_id]);
    res.json({ success: true, message: 'Gmail disconnected successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. EMAIL TEMPLATES ENDPOINTS
router.get('/email-templates', async (req, res) => {
  try {
    const templates = await getAll(
      `SELECT * FROM email_templates WHERE user_id = ? OR user_id = 'system' ORDER BY is_default DESC, id DESC`,
      [req.user.user_id]
    );
    res.json({ success: true, templates });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/email-templates', async (req, res) => {
  try {
    const { name, subject, body, is_default, business_card_image } = req.body;
    if (!name || !subject || !body) {
      return res.status(400).json({ error: 'Template name, subject, and body are required' });
    }

    if (is_default) {
      await runQuery(`UPDATE email_templates SET is_default = 0 WHERE user_id = ?`, [req.user.user_id]);
    }

    const result = await runQuery(
      `INSERT INTO email_templates (user_id, name, subject, body, is_default, business_card_image) VALUES (?, ?, ?, ?, ?, ?)`,
      [req.user.user_id, name.trim(), subject.trim(), body, is_default ? 1 : 0, business_card_image || '']
    );

    const newTpl = await getRow(`SELECT * FROM email_templates WHERE id = ?`, [result.lastID]);
    res.json({ success: true, template: newTpl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/email-templates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, subject, body, is_default, business_card_image } = req.body;

    if (is_default) {
      await runQuery(`UPDATE email_templates SET is_default = 0 WHERE user_id = ?`, [req.user.user_id]);
    }

    await runQuery(
      `UPDATE email_templates SET name = ?, subject = ?, body = ?, is_default = ?, business_card_image = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND (user_id = ? OR user_id = 'system')`,
      [name, subject, body, is_default ? 1 : 0, business_card_image || '', id, req.user.user_id]
    );

    const updated = await getRow(`SELECT * FROM email_templates WHERE id = ?`, [id]);
    res.json({ success: true, template: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/email-templates/:id', async (req, res) => {
  try {
    await runQuery(`DELETE FROM email_templates WHERE id = ? AND user_id = ? AND is_default = 0`, [req.params.id, req.user.user_id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. CAMPAIGN PRE-FLIGHT AUDIT ENDPOINT
router.post('/email-campaigns/audit', async (req, res) => {
  try {
    const { leadIds, allowPreviouslyContacted, isTestMode, testEmail } = req.body;
    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return res.status(400).json({ error: 'Array of lead IDs is required' });
    }

    const audit = await auditCampaignRecipients({
      userId: req.user.user_id,
      leadIds,
      allowPreviouslyContacted,
      isTestMode,
      testEmail
    });

    res.json({ success: true, audit });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. CREATE EMAIL CAMPAIGN ENDPOINT
router.post('/email-campaigns', async (req, res) => {
  try {
    const { name, subject, body, businessCardImage, leadIds, allowPreviouslyContacted, isTestMode, testEmail, dailyLimit } = req.body;

    if (!subject || !body || !Array.isArray(leadIds) || leadIds.length === 0) {
      return res.status(400).json({ error: 'Subject, body, and selected leads are required' });
    }

    const userId = req.user.user_id;
    const campaignId = `CAMP-${Date.now()}`;
    const campaignName = name || `Outreach Campaign (${new Date().toLocaleDateString()})`;

    const audit = await auditCampaignRecipients({
      userId,
      leadIds,
      allowPreviouslyContacted,
      isTestMode,
      testEmail
    });

    const result = await runQuery(
      `INSERT INTO email_campaigns (
        campaign_id, user_id, name, subject, status, total_count, sent_count, failed_count, skipped_count,
        daily_limit, is_test_mode, test_email, allow_previously_contacted, business_card_image
      ) VALUES (?, ?, ?, ?, 'Created', ?, 0, 0, ?, ?, ?, ?, ?, ?)`,
      [
        campaignId,
        userId,
        campaignName,
        subject,
        audit.totalSelected,
        audit.totalSkipped,
        dailyLimit || 100,
        isTestMode ? 1 : 0,
        testEmail || 'amautomationtrading@gmail.com',
        allowPreviouslyContacted ? 1 : 0,
        businessCardImage || ''
      ]
    );

    // Populate Email Logs Queue for Valid Leads
    for (const lead of audit.validLeads) {
      const personalizedSubject = substituteVariables(subject, lead);
      const personalizedBody = substituteVariables(body, lead);
      const recipient = isTestMode && testEmail ? testEmail : (lead.email || '').trim();

      let contactsList = [];
      try {
        contactsList = typeof lead.contacts === 'string' ? JSON.parse(lead.contacts || '[]') : lead.contacts;
      } catch (e) {}
      const contactName = lead.contact_person || (contactsList[0] ? contactsList[0].name : '') || "Sir/Ma’am";

      await runQuery(
        `INSERT INTO email_logs (
          campaign_id, lead_id, user_id, recipient_email, company_name, contact_name, subject, body, status, is_test_mode, business_card_image
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Pending', ?, ?)`,
        [
          campaignId,
          lead.id,
          userId,
          recipient,
          lead.company_name,
          contactName,
          personalizedSubject,
          personalizedBody,
          isTestMode ? 1 : 0,
          businessCardImage || ''
        ]
      );
    }

    const newCampaign = await getRow(`SELECT * FROM email_campaigns WHERE campaign_id = ?`, [campaignId]);
    res.json({ success: true, campaign: newCampaign, audit });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. CAMPAIGN QUEUE CONTROLS (START, PAUSE, RESUME, STOP)
router.post('/email-campaigns/:id/start', async (req, res) => {
  try {
    const { id } = req.params;
    const campaign = await getRow(`SELECT * FROM email_campaigns WHERE (campaign_id = ? OR id = ?) AND user_id = ?`, [id, id, req.user.user_id]);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    startCampaignQueue(campaign.campaign_id);
    res.json({ success: true, message: 'Campaign started successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/email-campaigns/:id/pause', async (req, res) => {
  try {
    const { id } = req.params;
    const campaign = await getRow(`SELECT * FROM email_campaigns WHERE (campaign_id = ? OR id = ?) AND user_id = ?`, [id, id, req.user.user_id]);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    await pauseCampaignQueue(campaign.campaign_id);
    res.json({ success: true, message: 'Campaign paused' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/email-campaigns/:id/resume', async (req, res) => {
  try {
    const { id } = req.params;
    const campaign = await getRow(`SELECT * FROM email_campaigns WHERE (campaign_id = ? OR id = ?) AND user_id = ?`, [id, id, req.user.user_id]);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    startCampaignQueue(campaign.campaign_id);
    res.json({ success: true, message: 'Campaign resumed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/email-campaigns/:id/stop', async (req, res) => {
  try {
    const { id } = req.params;
    const campaign = await getRow(`SELECT * FROM email_campaigns WHERE (campaign_id = ? OR id = ?) AND user_id = ?`, [id, id, req.user.user_id]);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    await stopCampaignQueue(campaign.campaign_id);
    res.json({ success: true, message: 'Campaign stopped' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. CAMPAIGNS LIST & LOGS ENDPOINTS
router.get('/email-campaigns', async (req, res) => {
  try {
    const campaigns = await getAll(
      `SELECT * FROM email_campaigns WHERE user_id = ? ORDER BY id DESC`,
      [req.user.user_id]
    );
    res.json({ success: true, campaigns });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/email-campaigns/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const campaign = await getRow(
      `SELECT * FROM email_campaigns WHERE (campaign_id = ? OR id = ?) AND user_id = ?`,
      [id, id, req.user.user_id]
    );

    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    const logs = await getAll(
      `SELECT * FROM email_logs WHERE campaign_id = ? AND user_id = ? ORDER BY id ASC`,
      [campaign.campaign_id, req.user.user_id]
    );

    res.json({ success: true, campaign, logs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. LEAD EMAIL HISTORY & SUPPRESSION
router.get('/leads/:id/email-history', async (req, res) => {
  try {
    const { id } = req.params;
    const lead = await getRow(`SELECT * FROM leads WHERE id = ? AND user_id = ?`, [id, req.user.user_id]);
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    const logs = await getAll(
      `SELECT * FROM email_logs WHERE user_id = ? AND (lead_id = ? OR recipient_email = ?) ORDER BY id DESC`,
      [req.user.user_id, id, lead.email]
    );

    res.json({ success: true, lead, logs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/leads/:id/suppress', async (req, res) => {
  try {
    const { id } = req.params;
    const { suppressed } = req.body;

    await runQuery(
      `UPDATE leads SET suppressed = ? WHERE id = ? AND user_id = ?`,
      [suppressed ? 1 : 0, id, req.user.user_id]
    );

    res.json({ success: true, suppressed: !!suppressed });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
