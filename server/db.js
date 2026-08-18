const path = require('path');
require('dotenv').config();

const isPostgres = process.env.DATABASE_URL && (process.env.DATABASE_URL.startsWith('postgres://') || process.env.DATABASE_URL.startsWith('postgresql://'));

let pgPool = null;
let sqliteDb = null;

if (isPostgres) {
  const { Pool } = require('pg');
  pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
  console.log('[DATABASE] Connected to PostgreSQL database via DATABASE_URL');
} else {
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = path.join(__dirname, 'autolead.db');
  sqliteDb = new sqlite3.Database(dbPath);
  console.log('[DATABASE] Connected to SQLite database:', dbPath);
}

// Convert SQLite '?' placeholders to PostgreSQL '$1, $2' format when using Postgres
const convertSqlForPostgres = (sql) => {
  let index = 1;
  return sql.replace(/\?/g, () => `$${index++}`);
};

const runQuery = async (sql, params = []) => {
  if (isPostgres) {
    const pgSql = convertSqlForPostgres(sql);
    const res = await pgPool.query(pgSql, params);
    return { changes: res.rowCount, lastID: res.rows[0]?.id };
  } else {
    return new Promise((resolve, reject) => {
      sqliteDb.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve(this);
      });
    });
  }
};

const getRow = async (sql, params = []) => {
  if (isPostgres) {
    const pgSql = convertSqlForPostgres(sql);
    const res = await pgPool.query(pgSql, params);
    return res.rows[0];
  } else {
    return new Promise((resolve, reject) => {
      sqliteDb.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }
};

const getAll = async (sql, params = []) => {
  if (isPostgres) {
    const pgSql = convertSqlForPostgres(sql);
    const res = await pgPool.query(pgSql, params);
    return res.rows;
  } else {
    return new Promise((resolve, reject) => {
      sqliteDb.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
};

const normalizeUrl = (rawUrl) => {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  let clean = rawUrl.trim().toLowerCase();
  if (!clean) return '';

  // Strip leading and trailing quotes if any
  clean = clean.replace(/^['"]+|['"]+$/g, '');

  // Temporarily add http:// if no protocol exists to parse correctly
  if (!/^[a-z0-9+-.]+:\/\//i.test(clean)) {
    clean = 'http://' + clean;
  }

  try {
    const parsed = new URL(clean);
    let host = parsed.hostname || parsed.host || '';
    host = host.replace(/^www\./i, '').trim();

    // Reject pure IPs or domains without valid letter TLDs
    if (!/[a-z]/i.test(host) || !/^[a-z0-9-]+\.[a-z0-9-.]*[a-z]{2,}$/i.test(host)) {
      return '';
    }

    if (parsed.port && (parsed.port === '80' || parsed.port === '443')) {
      host = host.split(':')[0];
    }
    return host.replace(/\/+$/, '');
  } catch (e) {
    clean = clean.replace(/^[a-z0-9+-.]+:\/\//i, '');
    clean = clean.replace(/^www\./i, '');
    clean = clean.split('/')[0].split('?')[0].split('#')[0].split(':')[0].trim();
    if (!/^[a-z0-9-]+\.[a-z0-9-.]*[a-z]{2,}$/i.test(clean)) return '';
    return clean.replace(/\/+$/, '');
  }
};

const normalizeWebsite = normalizeUrl;

const normalizePhone = (rawPhone) => {
  if (!rawPhone) return '';
  let cleaned = rawPhone.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = '+91' + cleaned.slice(1);
  } else if (!cleaned.startsWith('+') && cleaned.length === 10) {
    cleaned = '+91' + cleaned;
  } else if (!cleaned.startsWith('+') && cleaned.length === 12 && cleaned.startsWith('91')) {
    cleaned = '+' + cleaned;
  }
  return cleaned;
};

const initDb = async () => {
  // 1. USERS TABLE
  await runQuery(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      company_name TEXT DEFAULT '',
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      phone TEXT DEFAULT '',
      avatar_url TEXT DEFAULT '',
      role TEXT DEFAULT 'user',
      reset_token TEXT DEFAULT '',
      reset_token_expires DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login_at DATETIME
    )
  `);

  // 2. LEADS TABLE WITH COMPOSITE UNIQUE(user_id, normalized_url)
  await runQuery(`
    CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id TEXT UNIQUE,
      user_id TEXT NOT NULL,
      company_name TEXT NOT NULL,
      website TEXT NOT NULL,
      normalized_url TEXT NOT NULL,
      category TEXT DEFAULT '',
      categories TEXT DEFAULT '[]',
      category_evidence TEXT DEFAULT '[]',
      location TEXT DEFAULT '',
      address TEXT DEFAULT '',
      city TEXT DEFAULT '',
      state TEXT DEFAULT '',
      country TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      normalized_phone TEXT DEFAULT '',
      additional_phones TEXT DEFAULT '[]',
      email TEXT DEFAULT '',
      email_source TEXT DEFAULT '',
      whatsapp TEXT DEFAULT '',
      whatsapp_url TEXT DEFAULT '',
      contact_person TEXT DEFAULT '',
      contacts TEXT DEFAULT '[]',
      products TEXT DEFAULT '',
      services TEXT DEFAULT '',
      industries TEXT DEFAULT '',
      machines TEXT DEFAULT '',
      applications TEXT DEFAULT '',
      linkedin TEXT DEFAULT '',
      facebook TEXT DEFAULT '',
      instagram TEXT DEFAULT '',
      youtube TEXT DEFAULT '',
      twitter TEXT DEFAULT '',
      automation_opportunity TEXT DEFAULT '',
      website_status TEXT DEFAULT '⚪ Not Accessible',
      http_status INTEGER DEFAULT 0,
      final_url TEXT DEFAULT '',
      checked_date TEXT DEFAULT '',
      lead_status TEXT DEFAULT 'New',
      last_contact TEXT DEFAULT '',
      next_followup TEXT DEFAULT '',
      followup_count INTEGER DEFAULT 0,
      contact_method TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      search_query TEXT DEFAULT '',
      search_location TEXT DEFAULT '',
      confidence_score TEXT DEFAULT 'LOW',
      contact_evidence TEXT DEFAULT '[]',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
    )
  `);

  // 3. CONTACTS TABLE WITH user_id
  await runQuery(`
    CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      name TEXT DEFAULT '',
      designation TEXT DEFAULT '',
      department TEXT DEFAULT 'Unknown',
      phone TEXT DEFAULT '',
      normalized_phone TEXT DEFAULT '',
      email TEXT DEFAULT '',
      contact_type TEXT DEFAULT 'General',
      source_page TEXT DEFAULT '',
      source_text TEXT DEFAULT '',
      confidence TEXT DEFAULT 'UNKNOWN',
      verified INTEGER DEFAULT 0,
      preferred_contact INTEGER DEFAULT 0,
      last_contact TEXT DEFAULT '',
      next_followup TEXT DEFAULT '',
      contact_status TEXT DEFAULT 'New',
      contact_method TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
    )
  `);

  // 4. WEBSITE SCANS HISTORY WITH user_id
  await runQuery(`
    CREATE TABLE IF NOT EXISTS website_scans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      website_url TEXT NOT NULL,
      scan_status TEXT DEFAULT 'Completed',
      scanned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      results TEXT DEFAULT '{}',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
    )
  `);

  // 5. SAVED FILTERS WITH user_id
  await runQuery(`
    CREATE TABLE IF NOT EXISTS saved_filters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      filter_config TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
    )
  `);

  // 6. SETTINGS TABLE
  await runQuery(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `);

  // 7. IMPORT HISTORY TABLE
  await runQuery(`
    CREATE TABLE IF NOT EXISTS import_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      file_name TEXT NOT NULL,
      total_rows INTEGER DEFAULT 0,
      imported_count INTEGER DEFAULT 0,
      existing_duplicates_count INTEGER DEFAULT 0,
      csv_duplicates_count INTEGER DEFAULT 0,
      invalid_websites_count INTEGER DEFAULT 0,
      missing_websites_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
    )
  `);

  // 8. PLANS TABLE (INR BILLING CONFIGURATION)
  await runQuery(`
    CREATE TABLE IF NOT EXISTS plans (
      plan_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      price INTEGER NOT NULL,
      currency TEXT DEFAULT 'INR',
      currency_symbol TEXT DEFAULT '₹',
      billing_cycle TEXT DEFAULT 'month',
      lead_limit INTEGER DEFAULT 1000,
      scan_limit INTEGER DEFAULT 1000,
      user_limit INTEGER DEFAULT 2,
      features TEXT NOT NULL,
      is_popular INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 9. SUBSCRIPTIONS TABLE
  await runQuery(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workspace_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      plan_id TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      current_period_start DATETIME DEFAULT CURRENT_TIMESTAMP,
      current_period_end DATETIME,
      razorpay_order_id TEXT DEFAULT '',
      razorpay_payment_id TEXT DEFAULT '',
      razorpay_signature TEXT DEFAULT '',
      amount_paid INTEGER DEFAULT 0,
      currency TEXT DEFAULT 'INR',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
    )
  `);

  try {
    await runQuery(`ALTER TABLE subscriptions ADD COLUMN lead_limit_override INTEGER`);
  } catch (e) {}
  try {
    await runQuery(`ALTER TABLE subscriptions ADD COLUMN scan_limit_override INTEGER`);
  } catch (e) {}
  try {
    await runQuery(`ALTER TABLE subscriptions ADD COLUMN user_limit_override INTEGER`);
  } catch (e) {}

  // SAFE COMPOSITE MIGRATION: Replace any global UNIQUE(normalized_url) constraint with UNIQUE(user_id, normalized_url)
  try {
    // Check if table contains global unique constraint by checking table_info or pragma index_list
    const indexList = await getAll(`PRAGMA index_list('leads')`);
    const hasGlobalUnique = indexList.some((idx) => idx.unique && !idx.name.includes('user_normalized'));

    if (hasGlobalUnique) {
      console.log('[MIGRATION] Migrating leads table schema to composite UNIQUE(user_id, normalized_url)...');
      
      // Step A: Create temporary table with composite unique constraint
      await runQuery(`
        CREATE TABLE leads_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          lead_id TEXT UNIQUE,
          user_id TEXT NOT NULL DEFAULT 'demo_user',
          company_name TEXT NOT NULL,
          website TEXT NOT NULL,
          normalized_url TEXT NOT NULL,
          category TEXT DEFAULT '',
          categories TEXT DEFAULT '[]',
          category_evidence TEXT DEFAULT '[]',
          location TEXT DEFAULT '',
          address TEXT DEFAULT '',
          city TEXT DEFAULT '',
          state TEXT DEFAULT '',
          country TEXT DEFAULT '',
          phone TEXT DEFAULT '',
          normalized_phone TEXT DEFAULT '',
          additional_phones TEXT DEFAULT '[]',
          email TEXT DEFAULT '',
          email_source TEXT DEFAULT '',
          whatsapp TEXT DEFAULT '',
          whatsapp_url TEXT DEFAULT '',
          contact_person TEXT DEFAULT '',
          contacts TEXT DEFAULT '[]',
          products TEXT DEFAULT '',
          services TEXT DEFAULT '',
          industries TEXT DEFAULT '',
          machines TEXT DEFAULT '',
          applications TEXT DEFAULT '',
          linkedin TEXT DEFAULT '',
          facebook TEXT DEFAULT '',
          instagram TEXT DEFAULT '',
          youtube TEXT DEFAULT '',
          twitter TEXT DEFAULT '',
          automation_opportunity TEXT DEFAULT '',
          website_status TEXT DEFAULT '⚪ Not Accessible',
          http_status INTEGER DEFAULT 0,
          final_url TEXT DEFAULT '',
          checked_date TEXT DEFAULT '',
          lead_status TEXT DEFAULT 'New',
          last_contact TEXT DEFAULT '',
          next_followup TEXT DEFAULT '',
          followup_count INTEGER DEFAULT 0,
          contact_method TEXT DEFAULT '',
          notes TEXT DEFAULT '',
          search_query TEXT DEFAULT '',
          search_location TEXT DEFAULT '',
          confidence_score TEXT DEFAULT 'LOW',
          contact_evidence TEXT DEFAULT '[]',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, normalized_url)
        )
      `);

      // Step B: Copy existing data safely into leads_new
      await runQuery(`
        INSERT OR IGNORE INTO leads_new SELECT 
          id, lead_id, COALESCE(user_id, 'demo_user'), company_name, website, COALESCE(normalized_url, ''),
          category, categories, category_evidence, location, address, city, state, country,
          phone, normalized_phone, additional_phones, email, email_source, whatsapp, whatsapp_url,
          contact_person, contacts, products, services, industries, machines, applications,
          linkedin, facebook, instagram, youtube, twitter, automation_opportunity,
          website_status, http_status, final_url, checked_date, lead_status, last_contact,
          next_followup, followup_count, contact_method, notes, search_query, search_location,
          confidence_score, contact_evidence, created_at, updated_at
        FROM leads
      `);

      // Step C: Swap table
      await runQuery(`DROP TABLE leads`);
      await runQuery(`ALTER TABLE leads_new RENAME TO leads`);
      console.log('[MIGRATION] Leads table successfully migrated to composite UNIQUE(user_id, normalized_url)!');
    }
  } catch (err) {
    console.error('[MIGRATION WARNING] Non-fatal migration check error:', err.message);
  }

  // Create composite index for instant tenant URL queries
  try {
    await runQuery(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_user_normalized_url ON leads(user_id, normalized_url)
    `);
  } catch (e) {
    // ignore if index exists
  }

  // 7. GMAIL TOKENS TABLE
  await runQuery(`
    CREATE TABLE IF NOT EXISTS gmail_tokens (
      user_id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      access_token TEXT NOT NULL,
      refresh_token TEXT,
      scope TEXT,
      token_type TEXT,
      expiry_date INTEGER,
      connected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
    )
  `);

  // 8. EMAIL TEMPLATES TABLE
  await runQuery(`
    CREATE TABLE IF NOT EXISTS email_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      is_default INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
    )
  `);

  // 9. EMAIL CAMPAIGNS TABLE
  await runQuery(`
    CREATE TABLE IF NOT EXISTS email_campaigns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campaign_id TEXT UNIQUE NOT NULL,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      subject TEXT NOT NULL,
      template_id INTEGER,
      status TEXT DEFAULT 'Created',
      total_count INTEGER DEFAULT 0,
      sent_count INTEGER DEFAULT 0,
      failed_count INTEGER DEFAULT 0,
      skipped_count INTEGER DEFAULT 0,
      daily_limit INTEGER DEFAULT 100,
      is_test_mode INTEGER DEFAULT 0,
      test_email TEXT DEFAULT 'amautomationtrading@gmail.com',
      allow_previously_contacted INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
    )
  `);

  // 10. EMAIL LOGS TABLE
  await runQuery(`
    CREATE TABLE IF NOT EXISTS email_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campaign_id TEXT NOT NULL,
      lead_id TEXT DEFAULT '',
      user_id TEXT NOT NULL,
      recipient_email TEXT NOT NULL,
      company_name TEXT DEFAULT '',
      contact_name TEXT DEFAULT '',
      subject TEXT DEFAULT '',
      body TEXT DEFAULT '',
      status TEXT DEFAULT 'Pending',
      error_message TEXT DEFAULT '',
      is_test_mode INTEGER DEFAULT 0,
      sent_at DATETIME,
      FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
    )
  `);

  // 11. AUDIT LOGS TABLE
  await runQuery(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      user_name TEXT DEFAULT '',
      user_email TEXT DEFAULT '',
      user_role TEXT DEFAULT 'user',
      workspace_id TEXT NOT NULL,
      action TEXT NOT NULL,
      target_type TEXT DEFAULT '',
      target_id TEXT DEFAULT '',
      details TEXT DEFAULT '',
      changes TEXT DEFAULT '{}',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Column migrations
  const alterColumns = [
    `ALTER TABLE leads ADD COLUMN user_id TEXT DEFAULT 'demo_user'`,
    `ALTER TABLE contacts ADD COLUMN user_id TEXT DEFAULT 'demo_user'`,
    `ALTER TABLE saved_filters ADD COLUMN user_id TEXT DEFAULT 'demo_user'`,
    `ALTER TABLE website_scans ADD COLUMN user_id TEXT DEFAULT 'demo_user'`,
    `ALTER TABLE leads ADD COLUMN suppressed INTEGER DEFAULT 0`,
    `ALTER TABLE leads ADD COLUMN last_email_sent_at DATETIME`,
    `ALTER TABLE leads ADD COLUMN verification_status TEXT DEFAULT 'Needs Review'`,
    `ALTER TABLE leads ADD COLUMN verified_at DATETIME`,
    `ALTER TABLE leads ADD COLUMN last_website_check_at DATETIME`,
    `ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active'`,
    `ALTER TABLE users ADD COLUMN created_by TEXT DEFAULT ''`,
    `ALTER TABLE users ADD COLUMN workspace_id TEXT DEFAULT ''`,
    `ALTER TABLE users ADD COLUMN gstin TEXT DEFAULT ''`,
    `ALTER TABLE users ADD COLUMN subscription_exempt INTEGER DEFAULT 0`,
    `ALTER TABLE leads ADD COLUMN workspace_id TEXT DEFAULT ''`,
    `ALTER TABLE leads ADD COLUMN created_by TEXT DEFAULT ''`,
    `ALTER TABLE leads ADD COLUMN updated_by TEXT DEFAULT ''`,
    `ALTER TABLE email_templates ADD COLUMN business_card_image TEXT DEFAULT ''`,
    `ALTER TABLE email_campaigns ADD COLUMN business_card_image TEXT DEFAULT ''`,
    `ALTER TABLE email_logs ADD COLUMN business_card_image TEXT DEFAULT ''`
  ];

  for (const alterSql of alterColumns) {
    try {
      await runQuery(alterSql);
    } catch (e) {
      // Column already exists, ignore
    }
  }

  // Backfill workspace_id for users & leads to enforce workspace-level multi-tenancy
  try {
    await runQuery(`UPDATE users SET workspace_id = user_id WHERE (workspace_id IS NULL OR workspace_id = '') AND (created_by IS NULL OR created_by = '')`);
    await runQuery(`UPDATE users SET workspace_id = created_by WHERE (workspace_id IS NULL OR workspace_id = '') AND created_by != ''`);
    await runQuery(`UPDATE leads SET workspace_id = user_id WHERE workspace_id IS NULL OR workspace_id = ''`);
  } catch (e) {}

  // Reconciliation Migration for Existing Inconsistent Records
  try {
    const unassignedLeads = await getAll(`SELECT id, website_status, verification_status, created_at FROM leads`);
    let reconciledCount = 0;

    for (const lead of unassignedLeads) {
      const wStatus = lead.website_status || '';
      const isAccessible = wStatus.includes('Reachable') || wStatus.includes('Redirected') || wStatus.includes('Working') || wStatus.includes('Accessible');
      const isNotAccessible = wStatus.includes('Not Accessible') || wStatus.includes('Unreachable') || wStatus.includes('404') || wStatus.includes('500') || wStatus.includes('Timeout');

      let targetVerStatus = lead.verification_status;
      let targetVerAt = lead.created_at;
      let targetCheckAt = lead.created_at;

      if (isNotAccessible) {
        targetVerStatus = 'Needs Review';
        targetVerAt = null;
      } else if (isAccessible && (!lead.verification_status || lead.verification_status === 'Needs Review')) {
        targetVerStatus = 'Verified';
      }

      if (targetVerStatus !== lead.verification_status) {
        await runQuery(
          `UPDATE leads SET verification_status = ?, verified_at = ?, last_website_check_at = ? WHERE id = ?`,
          [targetVerStatus, targetVerAt, targetCheckAt, lead.id]
        );
        reconciledCount++;
      }
    }

    if (reconciledCount > 0) {
      console.log(`[RECONCILIATION] Successfully reconciled ${reconciledCount} existing lead record(s) with single-source-of-truth verification status.`);
    }
  } catch (e) {
    console.error('[RECONCILIATION MIGRATION LOG]', e.message);
  }

  const existingDemoMode = await getRow(`SELECT value FROM settings WHERE key = 'demo_mode'`);
  if (!existingDemoMode) {
    await runQuery(`INSERT INTO settings (key, value) VALUES ('demo_mode', 'false')`);
  }

  // Seed Default INR Billing Plans if missing
  const existingPlans = await getAll(`SELECT * FROM plans`);
  if (!existingPlans || existingPlans.length === 0) {
    const inrPlans = [
      {
        plan_id: 'starter',
        name: 'Starter',
        price: 999,
        currency: 'INR',
        currency_symbol: '₹',
        billing_cycle: 'month',
        lead_limit: 1000,
        scan_limit: 1000,
        user_limit: 2,
        features: JSON.stringify([
          '1,000 Leads',
          '1,000 Website Scans / month',
          '2 Users',
          'CSV Import',
          'Website Verification',
          'CRM',
          'Search & Filters',
          'Basic Follow-ups'
        ]),
        is_popular: 0
      },
      {
        plan_id: 'growth',
        name: 'Growth',
        price: 2499,
        currency: 'INR',
        currency_symbol: '₹',
        billing_cycle: 'month',
        lead_limit: 5000,
        scan_limit: 5000,
        user_limit: 5,
        features: JSON.stringify([
          '5,000 Leads',
          '5,000 Website Scans / month',
          '5 Users',
          'CSV Import',
          'Website Verification',
          'CRM',
          'Advanced Filters',
          'Website Refresh',
          'Follow-ups',
          'Audit History'
        ]),
        is_popular: 1
      },
      {
        plan_id: 'business',
        name: 'Business',
        price: 4999,
        currency: 'INR',
        currency_symbol: '₹',
        billing_cycle: 'month',
        lead_limit: 25000,
        scan_limit: 25000,
        user_limit: 15,
        features: JSON.stringify([
          '25,000 Leads',
          '25,000 Website Scans / month',
          '15 Users',
          'All Growth Features',
          'Priority Processing',
          'Advanced CRM',
          'Advanced Automation',
          'Detailed Audit Logs'
        ]),
        is_popular: 0
      },
      {
        plan_id: 'enterprise',
        name: 'Enterprise',
        price: 0,
        currency: 'INR',
        currency_symbol: '₹',
        billing_cycle: 'month',
        lead_limit: 999999,
        scan_limit: 999999,
        user_limit: 999,
        features: JSON.stringify([
          'Custom Leads',
          'Custom Scans',
          'Custom Users',
          'Custom limits',
          'Priority support',
          'Custom requirements'
        ]),
        is_popular: 0
      }
    ];

    for (const plan of inrPlans) {
      await runQuery(
        `INSERT INTO plans (plan_id, name, price, currency, currency_symbol, billing_cycle, lead_limit, scan_limit, user_limit, features, is_popular)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          plan.plan_id,
          plan.name,
          plan.price,
          plan.currency,
          plan.currency_symbol,
          plan.billing_cycle,
          plan.lead_limit,
          plan.scan_limit,
          plan.user_limit,
          plan.features,
          plan.is_popular
        ]
      );
    }
  }

  // Seed Default AM Automation Trading Templates if missing
  const defaultTemplate = await getRow(`SELECT * FROM email_templates WHERE name = 'AM Automation Trading B2B Default'`);
  if (!defaultTemplate) {
    const b2bTemplates = [
      {
        name: 'AM Automation Trading B2B Default',
        subject: 'Industrial Automation Products & Solutions – AM Automation Trading',
        is_default: 1,
        body: `Dear {{contact_name}},

Greetings from {{business_name}}.

We are engaged in the supply of Industrial Automation Products & Components for manufacturing industries, machine builders, system integrators, and industrial applications.

Our product range includes:
• PLC & PLC Modules
• HMI & Touch Panels
• AC Drives / VFDs
• Servo Motors & Servo Drives
• Sensors & Switches
• Contactors, Relays & Protection Devices
• Industrial Automation Components
• Other Electrical & Automation Products

We can assist with product selection, model identification, competitive quotations, and sourcing support based on your requirement.

If you have any current or upcoming requirement, please feel free to share your BOM, model numbers, specifications, or enquiry with us. We will be happy to provide a suitable quotation.

Looking forward to the opportunity to work with your organization.

Best Regards,
{{sender_name}}
{{business_name}}
Phone: {{phone}}
Email: {{email}}`
      },
      {
        name: 'Product Enquiry & BOM Quotation',
        subject: 'BOM Quotation & Industrial Component Sourcing Support – AM Automation Trading',
        is_default: 0,
        body: `Dear {{contact_name}},

Greetings from {{business_name}}.

We specialize in sourcing and supplying Industrial Automation Components for plant maintenance, machine building, and panel fabrication projects at {{company_name}}.

If you have an active Bill of Materials (BOM), part numbers, or component enquiries, please share them with us. We offer fast turnaround times and competitive B2B pricing.

Products We Supply:
• PLCs, I/O Modules & HMIs
• VFDs, AC Drives & Servo Systems
• Switchgear, Contactors & Relays
• Industrial Sensors & Instrumentation

We look forward to receiving your enquiries.

Best Regards,
{{sender_name}}
{{business_name}}
Phone: {{phone}}
Email: {{email}}`
      },
      {
        name: 'PLC & HMI Supply Enquiry',
        subject: 'PLC & HMI Touch Panel Supply Requirement – AM Automation Trading',
        is_default: 0,
        body: `Dear {{contact_name}},

Greetings from {{business_name}}.

Are you currently sourcing PLCs, CPU modules, extension blocks, or HMI touch panels for your automation projects at {{company_name}}?

We maintain ready stock and reliable supply lines for major industrial PLC & HMI brands used across manufacturing and process industries.

Please share your specific part numbers or system specifications, and we will provide availability and competitive pricing promptly.

Best Regards,
{{sender_name}}
{{business_name}}
Phone: {{phone}}
Email: {{email}}`
      },
      {
        name: 'VFD & AC Drives Supply',
        subject: 'VFD / AC Drives & Servo Drives Sourcing – AM Automation Trading',
        is_default: 0,
        body: `Dear {{contact_name}},

Greetings from {{business_name}}.

We supply high-performance Variable Frequency Drives (VFDs / AC Drives), Soft Starters, Servo Drives, and Servo Motors tailored for industrial applications.

Whether you need replacement drives for machine maintenance or new VFD panels for process control at {{company_name}}, we can provide optimal technical selection and pricing.

Feel free to reply with your power rating (kW/HP) or drive part numbers for an immediate quote.

Best Regards,
{{sender_name}}
{{business_name}}
Phone: {{phone}}
Email: {{email}}`
      },
      {
        name: 'Quotation Follow-up',
        subject: 'Follow-up: Industrial Automation Components Enquiry – {{company_name}}',
        is_default: 0,
        body: `Dear {{contact_name}},

Greetings from {{business_name}}.

I am following up regarding your ongoing industrial automation requirements and component sourcing at {{company_name}}.

Please let us know if you have any updated BOMs, spare parts lists, or upcoming control panel projects where we can assist with quotations.

We remain at your service.

Best Regards,
{{sender_name}}
{{business_name}}
Phone: {{phone}}
Email: {{email}}`
      },
      {
        name: 'General Industrial Automation Requirement',
        subject: 'Industrial Electrical & Automation Components Supplier – AM Automation Trading',
        is_default: 0,
        body: `Dear {{contact_name}},

Greetings from {{business_name}}.

We would like to introduce AM Automation Trading as a trusted partner for industrial electrical and automation component supply.

We support plant maintenance teams, machine manufacturers, and panel builders with high-quality components, quick delivery, and technical assistance.

Please keep our contact information on file for your future component needs.

Best Regards,
{{sender_name}}
{{business_name}}
Phone: {{phone}}
Email: {{email}}`
      }
    ];

    for (const tpl of b2bTemplates) {
      await runQuery(`
        INSERT INTO email_templates (user_id, name, subject, body, is_default, business_card_image)
        VALUES ('system', ?, ?, ?, ?, '/am_automation_business_card.jpg')
      `, [tpl.name, tpl.subject, tpl.body, tpl.is_default]);
    }
  }

  // Fix historical campaign status where sent_count is 0 and failed_count > 0
  try {
    await runQuery(`UPDATE email_campaigns SET status = 'Failed' WHERE sent_count = 0 AND failed_count > 0 AND status = 'Completed'`);
  } catch (e) {}

  // Migrate user identity from personal email (amitmehra720640@gmail.com) to business email (amautomationtrading@gmail.com)
  try {
    const personalUser = await getRow(`SELECT * FROM users WHERE email = 'amitmehra720640@gmail.com'`);
    const businessUser = await getRow(`SELECT * FROM users WHERE email = 'amautomationtrading@gmail.com'`);

    if (personalUser && !businessUser) {
      await runQuery(`UPDATE users SET email = 'amautomationtrading@gmail.com' WHERE email = 'amitmehra720640@gmail.com'`);
      console.log('[IDENTITY MIGRATION] User email updated from amitmehra720640@gmail.com to amautomationtrading@gmail.com');
    } else if (personalUser && businessUser) {
      // Consolidate duplicate records onto businessUser
      await runQuery(`UPDATE leads SET user_id = ? WHERE user_id = ?`, [businessUser.user_id, personalUser.user_id]);
      await runQuery(`UPDATE contacts SET user_id = ? WHERE user_id = ?`, [businessUser.user_id, personalUser.user_id]);
      await runQuery(`UPDATE email_campaigns SET user_id = ? WHERE user_id = ?`, [businessUser.user_id, personalUser.user_id]);
      await runQuery(`UPDATE email_logs SET user_id = ? WHERE user_id = ?`, [businessUser.user_id, personalUser.user_id]);
      await runQuery(`UPDATE email_templates SET user_id = ? WHERE user_id = ?`, [businessUser.user_id, personalUser.user_id]);
      await runQuery(`DELETE FROM users WHERE email = 'amitmehra720640@gmail.com'`);
      console.log('[IDENTITY MIGRATION] Consolidated duplicate user record onto amautomationtrading@gmail.com');
    }

    // Purge any legacy token rows tied to personal email
    await runQuery(`DELETE FROM gmail_tokens WHERE email = 'amitmehra720640@gmail.com'`);
  } catch (e) {
    console.error('[IDENTITY MIGRATION WARNING]:', e.message);
  }

  // Enforce Primary Super Admin Account Role & Exemption (amautomationtrading@gmail.com)
  try {
    const superAdminUser = await getRow(`SELECT * FROM users WHERE email = 'amautomationtrading@gmail.com'`);
    if (superAdminUser) {
      await runQuery(
        `UPDATE users SET role = 'super_admin', status = 'active', subscription_exempt = 1 WHERE email = 'amautomationtrading@gmail.com'`
      );
    } else {
      const bcrypt = require('bcryptjs');
      const crypto = require('crypto');
      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash('password123', salt);
      const user_id = 'usr_superadmin_master';
      await runQuery(
        `INSERT INTO users (user_id, workspace_id, full_name, company_name, email, password_hash, role, status, subscription_exempt)
         VALUES (?, ?, 'AM Automation Trading', 'AM Automation Trading', 'amautomationtrading@gmail.com', ?, 'super_admin', 'active', 1)`,
        [user_id, user_id, password_hash]
      );
    }
  } catch (e) {
    console.error('[SUPER ADMIN INIT WARNING]:', e.message);
  }
};

const generateLeadId = async () => {
  const row = await getRow(`SELECT MAX(id) as maxId FROM leads`);
  const nextNum = (row && row.maxId ? row.maxId : 0) + 1001;
  return `LEAD-${nextNum}`;
};

module.exports = {
  db: sqliteDb,
  sqliteDb,
  pgPool,
  initDb,
  runQuery,
  getRow,
  getAll,
  normalizeUrl,
  normalizeWebsite,
  normalizePhone,
  generateLeadId
};
