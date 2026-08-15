const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'autolead.db');
const db = new sqlite3.Database(dbPath);

const runQuery = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
};

const getRow = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const getAll = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

const normalizeUrl = (rawUrl) => {
  if (!rawUrl) return '';
  let clean = rawUrl.trim().toLowerCase();
  
  // 1. Remove protocol
  clean = clean.replace(/^https?:\/\//, '');
  
  // 2. Remove www.
  clean = clean.replace(/^www\./, '');
  
  // 3. Remove query parameters and URL fragments
  clean = clean.split('?')[0].split('#')[0];
  
  // 4. Remove trailing slashes
  clean = clean.replace(/\/+$/, '');
  
  return clean;
};

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

  // Migration helper for new columns
  const alterColumns = [
    `ALTER TABLE leads ADD COLUMN user_id TEXT DEFAULT 'demo_user'`,
    `ALTER TABLE contacts ADD COLUMN user_id TEXT DEFAULT 'demo_user'`,
    `ALTER TABLE saved_filters ADD COLUMN user_id TEXT DEFAULT 'demo_user'`,
    `ALTER TABLE website_scans ADD COLUMN user_id TEXT DEFAULT 'demo_user'`
  ];

  for (const alterSql of alterColumns) {
    try {
      await runQuery(alterSql);
    } catch (e) {
      // Column already exists, ignore
    }
  }

  const existingDemoMode = await getRow(`SELECT value FROM settings WHERE key = 'demo_mode'`);
  if (!existingDemoMode) {
    await runQuery(`INSERT INTO settings (key, value) VALUES ('demo_mode', 'false')`);
  }
};

const generateLeadId = async () => {
  const row = await getRow(`SELECT MAX(id) as maxId FROM leads`);
  const nextNum = (row && row.maxId ? row.maxId : 0) + 1001;
  return `LEAD-${nextNum}`;
};

module.exports = {
  db,
  initDb,
  runQuery,
  getRow,
  getAll,
  normalizeUrl,
  normalizePhone,
  generateLeadId
};
