const { google } = require('googleapis');
const { getRow, runQuery } = require('../db');

/**
 * Derive Dynamic Environment-Aware Redirect URI
 */
function getDynamicRedirectUri(req = null, customRedirectUri = '') {
  if (customRedirectUri && customRedirectUri.trim()) {
    return customRedirectUri.trim();
  }
  if (process.env.GOOGLE_REDIRECT_URI && process.env.GOOGLE_REDIRECT_URI.trim()) {
    return process.env.GOOGLE_REDIRECT_URI.trim();
  }
  if (process.env.APP_URL && process.env.APP_URL.trim()) {
    const cleanAppUrl = process.env.APP_URL.trim().replace(/\/+$/, '');
    return `${cleanAppUrl}/api/gmail/oauth/callback`;
  }
  if (req) {
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || (process.env.NODE_ENV === 'production' ? 'https' : 'http');
    const host = req.headers['x-forwarded-host'] || req.get('host') || 'localhost:5001';
    return `${protocol}://${host}/api/gmail/oauth/callback`;
  }
  if (process.env.NODE_ENV === 'production' || process.env.RENDER) {
    return 'https://prosqora-1.onrender.com/api/gmail/oauth/callback';
  }
  return 'http://localhost:5001/api/gmail/oauth/callback';
}

/**
 * Validate Google OAuth Credentials in Environment
 */
function validateOAuthCredentials(req = null, customRedirectUri = '') {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = getDynamicRedirectUri(req, customRedirectUri);

  const isConfigured = Boolean(
    clientId && clientId.trim() && !clientId.includes('dummy') &&
    clientSecret && clientSecret.trim() && !clientSecret.includes('dummy')
  );

  if (!isConfigured) {
    throw new Error('Google OAuth credentials (GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET) are missing or not configured.');
  }

  return {
    isConfigured: true,
    clientId: clientId.trim(),
    clientSecret: clientSecret.trim(),
    redirectUri: redirectUri.trim()
  };
}

/**
 * Initialize Google OAuth 2.0 Client
 */
function getOAuth2Client(req = null, customRedirectUri = '') {
  const { clientId, clientSecret, redirectUri } = validateOAuthCredentials(req, customRedirectUri);
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

/**
 * Generate Google OAuth 2.0 Authorization URL with Account Chooser
 */
function getAuthUrl(state = '', req = null, customRedirectUri = '') {
  const oauth2Client = getOAuth2Client(req, customRedirectUri);
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'select_account consent',
    scope: [
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile'
    ],
    state
  });
}

/**
 * Exchange Authorization Code for Access & Refresh Tokens
 */
async function getTokensFromCode(code, req = null, customRedirectUri = '') {
  const oauth2Client = getOAuth2Client(req, customRedirectUri);
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);

  // Fetch connected Gmail user email address
  const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
  const userInfo = await oauth2.userinfo.get();
  const connectedEmail = userInfo.data.email || '';

  return {
    email: connectedEmail,
    tokens
  };
}

/**
 * Build RFC 2822 Base64URL encoded HTML & Text MIME message
 */
function makeMimeMessage(to, from, subject, messageText, businessCardImage = '') {
  // Convert line breaks and bullet points into clean B2B HTML
  let formattedHtml = messageText
    .split('\n\n')
    .map(paragraph => {
      if (paragraph.includes('•') || paragraph.includes('* ')) {
        const items = paragraph.split('\n').map(line => line.replace(/^[\•\*\-]\s*/, '').trim()).filter(Boolean);
        return `<ul style="margin: 8px 0; padding-left: 20px; color: #334155;">` +
          items.map(item => `<li style="margin-bottom: 4px; line-height: 1.5;">${item}</li>`).join('') +
          `</ul>`;
      }
      return `<p style="margin: 0 0 12px 0; line-height: 1.6; color: #1e293b;">${paragraph.replace(/\n/g, '<br/>')}</p>`;
    })
    .join('');

  let businessCardHtml = '';
  if (businessCardImage && businessCardImage.trim()) {
    businessCardHtml = `
      <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0;">
        <img src="${businessCardImage}" alt="AM Automation Trading Business Card" style="max-width: 460px; width: 100%; height: auto; border-radius: 8px; border: 1px solid #cbd5e1; box-shadow: 0 2px 8px rgba(0,0,0,0.06);" />
      </div>
    `;
  }

  const fullHtmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 14px; color: #1e293b; background-color: #f8fafc; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; padding: 28px; border-radius: 12px; border: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="container">
    ${formattedHtml}
    ${businessCardHtml}
  </div>
</body>
</html>
  `.trim();

  const boundary = `----=_Part_${Date.now()}`;
  const str = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: =?utf-8?B?${Buffer.from(subject).toString('base64')}?=`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=utf-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    messageText,
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=utf-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    fullHtmlBody,
    '',
    `--${boundary}--`
  ].join('\r\n');

  return Buffer.from(str)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Send Email using official Gmail API users.messages.send
 */
async function sendGmailMessage({ userId, to, subject, body, businessCardImage = '', fromName = 'AM Automation Trading', isTestMode = false, testEmail = '' }) {
  const targetRecipient = isTestMode && testEmail ? testEmail : to;
  const targetSenderEmail = 'amautomationtrading@gmail.com';

  // 1. Check OAuth Credentials Configuration
  validateOAuthCredentials();

  // 2. Retrieve user's stored Gmail OAuth tokens
  const tokenRow = await getRow(`SELECT * FROM gmail_tokens WHERE user_id = ?`, [userId]);

  if (!tokenRow) {
    throw new Error('Gmail connection expired or not connected. Please connect your Gmail account in Settings.');
  }

  if (tokenRow.email.toLowerCase() !== targetSenderEmail.toLowerCase()) {
    throw new Error(`Wrong Gmail account connected (${tokenRow.email}). Please connect ${targetSenderEmail} in Settings.`);
  }

  const fromFormatted = `${fromName} <${targetSenderEmail}>`;
  const oauth2Client = getOAuth2Client();

  oauth2Client.setCredentials({
    access_token: tokenRow.access_token,
    refresh_token: tokenRow.refresh_token,
    expiry_date: tokenRow.expiry_date
  });

  // Handle Token Refresh automatically & save to DB
  oauth2Client.on('tokens', async (newTokens) => {
    try {
      await runQuery(
        `UPDATE gmail_tokens SET access_token = ?, expiry_date = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`,
        [newTokens.access_token, newTokens.expiry_date || (Date.now() + 3600 * 1000), userId]
      );
    } catch (e) {}
  });

  // If token is expired or close to expiry, trigger proactive refresh
  if (tokenRow.expiry_date && tokenRow.expiry_date < (Date.now() + 60000) && tokenRow.refresh_token) {
    try {
      const refreshed = await oauth2Client.refreshAccessToken();
      const newTokens = refreshed.credentials;
      await runQuery(
        `UPDATE gmail_tokens SET access_token = ?, expiry_date = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`,
        [newTokens.access_token, newTokens.expiry_date || (Date.now() + 3600 * 1000), userId]
      );
    } catch (refreshErr) {
      if (refreshErr.message.includes('invalid_grant') || refreshErr.code === '400') {
        await runQuery(`DELETE FROM gmail_tokens WHERE user_id = ?`, [userId]);
        throw new Error('invalid_grant: Gmail authorization expired. Please reconnect amautomationtrading@gmail.com.');
      }
    }
  }

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  const rawMime = makeMimeMessage(targetRecipient, fromFormatted, subject, body, businessCardImage);

  try {
    const response = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: rawMime
      }
    });

    return {
      success: true,
      messageId: response.data.id,
      recipient: targetRecipient,
      from: fromFormatted
    };
  } catch (err) {
    const errMsg = err.message || '';
    if (errMsg.includes('invalid_grant') || err.status === 401 || err.code === 401) {
      await runQuery(`DELETE FROM gmail_tokens WHERE user_id = ?`, [userId]);
      throw new Error('invalid_grant: Gmail authorization expired. Please reconnect amautomationtrading@gmail.com.');
    }
    if (err.status === 429 || err.code === 429 || errMsg.includes('quotaExceeded')) {
      throw new Error('quotaExceeded: Gmail temporarily limited sending. Campaign paused automatically.');
    }
    throw new Error(`Gmail API send error: ${errMsg}`);
  }
}

module.exports = {
  getDynamicRedirectUri,
  validateOAuthCredentials,
  getOAuth2Client,
  getAuthUrl,
  getTokensFromCode,
  sendGmailMessage
};
