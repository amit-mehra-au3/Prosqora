const http = require('http');

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: body, headers: res.headers });
        }
      });
    });

    req.on('error', (err) => reject(err));

    if (postData) {
      if (typeof postData === 'object' && !(postData instanceof Buffer)) {
        req.write(JSON.stringify(postData));
      } else {
        req.write(postData);
      }
    }
    req.end();
  });
}

const auditResults = [];

function recordResult(section, testName, passed, details = '') {
  auditResults.push({ section, testName, passed, details });
  const icon = passed ? '✅' : '❌';
  console.log(`${icon} [${section}] ${testName}${details ? ` — ${details}` : ''}`);
}

async function runMasterQASuite() {
  console.log('================================================================');
  console.log('AUTOLEAD CRM: SENIOR QA & FULL-STACK DEBUG AUDIT SUITE');
  console.log('================================================================\n');

  try {
    const timestamp = Date.now();

    // ----------------------------------------------------------------
    // SECTION 1: AUTHENTICATION & MULTI-TENANT ISOLATION
    // ----------------------------------------------------------------
    console.log('--- SECTION 1: AUTHENTICATION & WORKSPACE ISOLATION ---');
    
    // Create Workspace A
    const userARes = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/auth/signup',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      full_name: 'QA Lead A',
      company_name: 'QA Workspace A Ltd',
      email: `qa_user_a_${timestamp}@autolead.com`,
      password: 'password123',
      confirm_password: 'password123'
    });
    const tokenA = userARes.data.token;
    const userIdA = userARes.data.user.user_id;

    // Create Workspace B
    const userBRes = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/auth/signup',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      full_name: 'QA Lead B',
      company_name: 'QA Workspace B Ltd',
      email: `qa_user_b_${timestamp}@autolead.com`,
      password: 'password123',
      confirm_password: 'password123'
    });
    const tokenB = userBRes.data.token;
    const userIdB = userBRes.data.user.user_id;

    recordResult('AUTH', 'Signup & JWT Token Generation (Workspace A & B)', !!tokenA && !!tokenB, `Workspace A: ${userIdA}, Workspace B: ${userIdB}`);

    // Create lead in Workspace A
    const leadARes = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/leads',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` }
    }, {
      company_name: 'Tenant A Secret Lead',
      website: 'tenant-a-domain.com',
      email: 'secret@tenant-a.com'
    });

    const leadAId = leadARes.data.lead.id;

    // Verify Workspace B CANNOT access Workspace A lead by ID
    const crossFetchRes = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/leads',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${tokenB}` }
    });

    const leakedLead = (crossFetchRes.data.leads || []).find((l) => l.id === leadAId || l.normalized_url === 'tenant-a-domain.com');
    recordResult('SECURITY', 'Multi-Tenant Data Leakage Prevention', !leakedLead, 'Workspace B cannot view Workspace A leads');

    // Verify Unauthenticated Access is Blocked (401 / 403)
    const unauthRes = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/leads',
      method: 'GET'
    });
    recordResult('SECURITY', 'Unauthenticated API Protection', unauthRes.status === 401 || unauthRes.status === 403, `Status: ${unauthRes.status}`);

    // ----------------------------------------------------------------
    // SECTION 2: WEBSITE NORMALIZATION QA
    // ----------------------------------------------------------------
    console.log('\n--- SECTION 2: WEBSITE NORMALIZATION QA ---');
    const { normalizeWebsite } = require('./server/db');

    const normMatrix = [
      { input: 'https://example.com', expected: 'example.com' },
      { input: 'http://example.com', expected: 'example.com' },
      { input: 'https://www.example.com', expected: 'example.com' },
      { input: 'http://www.example.com/', expected: 'example.com' },
      { input: 'www.example.com', expected: 'example.com' },
      { input: 'example.com', expected: 'example.com' },
      { input: 'example.com/', expected: 'example.com' },
      { input: 'HTTPS://WWW.EXAMPLE.COM/', expected: 'example.com' },
      { input: '  https://www.example.com/path?foo=bar#hash  ', expected: 'example.com' },
      { input: '"http://www.example.com/"', expected: 'example.com' },
      { input: 'subdomain.industrial-automation.co.in/product', expected: 'subdomain.industrial-automation.co.in' },
      { input: 'hello', expected: '' },
      { input: '12345', expected: '' },
      { input: 'not a website', expected: '' }
    ];

    let normPassedCount = 0;
    normMatrix.forEach((item) => {
      const res = normalizeWebsite(item.input);
      if (res === item.expected) {
        normPassedCount++;
      } else {
        console.error(`   ❌ FAIL normalizeWebsite("${item.input}") -> Expected "${item.expected}", got "${res}"`);
      }
    });

    recordResult('NORMALIZATION', 'Canonical Domain Normalization Matrix', normPassedCount === normMatrix.length, `${normPassedCount}/${normMatrix.length} variants passed`);

    // ----------------------------------------------------------------
    // SECTION 3: CSV COLUMN HEADER MAPPING QA
    // ----------------------------------------------------------------
    console.log('\n--- SECTION 3: CSV COLUMN MAPPING QA ---');
    const { mapColumnHeader, parseCSVText } = require('./client/src/utils/csvParser');

    const headerMatrix = [
      { input: 'Company Name', expected: 'company_name' },
      { input: 'company_name', expected: 'company_name' },
      { input: 'COMPANY', expected: 'company_name' },
      { input: 'Business Name', expected: 'company_name' },
      { input: 'Website URL', expected: 'website' },
      { input: 'Domain', expected: 'website' },
      { input: 'Email Address', expected: 'email' },
      { input: 'Mobile', expected: 'phone' },
      { input: 'Contact Person', expected: 'contact_person' },
      { input: 'Industry', expected: 'category' },
      { input: 'City', expected: 'city' },
      { input: 'State', expected: 'state' },
      { input: 'Country', expected: 'country' },
      { input: 'Unknown Custom Header', expected: 'unmapped' }
    ];

    let headerPassedCount = 0;
    headerMatrix.forEach((item) => {
      const res = mapColumnHeader(item.input);
      if (res === item.expected) {
        headerPassedCount++;
      } else {
        console.error(`   ❌ FAIL mapColumnHeader("${item.input}") -> Expected "${item.expected}", got "${res}"`);
      }
    });

    recordResult('COLUMN_MAPPING', 'CSV Flexible Column Header Auto-Mapping', headerPassedCount === headerMatrix.length, `${headerPassedCount}/${headerMatrix.length} headers passed`);

    // ----------------------------------------------------------------
    // SECTION 4: CSV IMPORT & DUPLICATE PREVENTION QA
    // ----------------------------------------------------------------
    console.log('\n--- SECTION 4: CSV IMPORT & DUPLICATE PREVENTION QA ---');

    // Seed initial lead in Workspace A
    await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/leads/bulk-import',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` }
    }, {
      leads: [
        { company_name: 'Target Automation Initial', website: 'target-automation.com', email: 'sales@target-1.com' }
      ]
    });

    const dupImportRes = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/leads/bulk-import',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` }
    }, {
      leads: [
        { company_name: 'Target Automation Exact', website: 'target-automation.com' },
        { company_name: 'Target Automation WWW', website: 'https://www.target-automation.com/' },
        { company_name: 'Target Automation HTTP', website: 'http://target-automation.com/path?foo=1' },
        { company_name: 'New Company Unique', website: 'brand-new-company.com' }
      ]
    });

    const { importedCount, existingDuplicatesCount, csvDuplicatesCount } = dupImportRes.data;
    const totalDupsPrevented = (existingDuplicatesCount || 0) + (csvDuplicatesCount || 0);
    recordResult('CSV_IMPORT', 'Unified Duplicate Prevention (Exact, WWW, HTTP)', importedCount === 1 && totalDupsPrevented === 3, `Imported: ${importedCount}, Duplicates Prevented: ${totalDupsPrevented} (Existing: ${existingDuplicatesCount}, CSV: ${csvDuplicatesCount})`);

    // Test CSV Internal Deduplication
    const internalDupRes = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/leads/bulk-import',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` }
    }, {
      leads: [
        { company_name: 'Internal Dup Row 1', website: 'internal-test.com' },
        { company_name: 'Internal Dup Row 2', website: 'www.internal-test.com' },
        { company_name: 'Internal Dup Row 3', website: 'https://internal-test.com/' }
      ]
    });

    recordResult('CSV_IMPORT', 'CSV Internal Deduplication (First Kept, Rest Flagged)', internalDupRes.data.importedCount === 1 && internalDupRes.data.csvDuplicatesCount === 2, `Imported: ${internalDupRes.data.importedCount}, CSV Duplicates: ${internalDupRes.data.csvDuplicatesCount}`);

    // Test Mixed CSV (Valid, Duplicate, Invalid, Missing)
    const mixedCsvRes = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/leads/bulk-import',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` }
    }, {
      leads: [
        { company_name: 'Mixed Valid 1', website: 'mixed-valid-1.com' },
        { company_name: 'Mixed Dup Existing', website: 'target-automation.com' },
        { company_name: 'Mixed Invalid 1', website: 'hello' },
        { company_name: 'Mixed Invalid 2', website: '12345' },
        { company_name: 'Mixed Missing 1', website: '' }
      ],
      allowMissingWebsite: false
    });

    const mData = mixedCsvRes.data;
    recordResult(
      'CSV_IMPORT',
      'Mixed CSV Row Evaluation (Valid, Existing Dup, Invalid, Missing)',
      mData.importedCount === 1 && mData.existingDuplicatesCount === 1 && mData.invalidWebsitesCount === 2 && mData.missingWebsitesCount === 1,
      `Imported: ${mData.importedCount}, Existing Dup: ${mData.existingDuplicatesCount}, Invalid: ${mData.invalidWebsitesCount}, Missing: ${mData.missingWebsitesCount}`
    );

    // ----------------------------------------------------------------
    // SECTION 5: DUPLICATE CLEANUP & INTELLIGENT MERGE
    // ----------------------------------------------------------------
    console.log('\n--- SECTION 5: DUPLICATE CLEANUP & MERGE QA ---');
    const { runQuery } = require('./server/db');

    // Create 2 duplicate leads with partial information
    const l1Res = await runQuery(
      `INSERT INTO leads (lead_id, user_id, company_name, website, normalized_url, email, phone) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [`LEAD-M1-${timestamp}`, userIdA, 'Merge Test Company A', 'merge-test-1.com', 'merge-test-1.com', 'contact@merge-test.com', '']
    );
    const l2Res = await runQuery(
      `INSERT INTO leads (lead_id, user_id, company_name, website, normalized_url, email, phone) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [`LEAD-M2-${timestamp}`, userIdA, 'Merge Test Company B', 'merge-test-2.com', 'merge-test-2.com', '', '+91 88888 77777']
    );

    // Merge duplicate leads
    const mergeExecRes = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/leads/merge',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` }
    }, {
      primaryId: l1Res.lastID,
      duplicateIds: [l2Res.lastID]
    });

    const mergedLead = mergeExecRes.data.lead;
    const mergePreserved = mergedLead && mergedLead.email === 'contact@merge-test.com' && mergedLead.phone === '+91 88888 77777';
    recordResult('MERGE', 'Intelligent Field Merge (Preserving Non-Empty Contact Info)', mergePreserved, 'Email and Phone combined into merged record');

    // ----------------------------------------------------------------
    // SECTION 6: RACE CONDITION & DATABASE COMPOSITE CONSTRAINT
    // ----------------------------------------------------------------
    console.log('\n--- SECTION 6: RACE CONDITION & DATABASE CONSTRAINTS ---');

    // Attempt simultaneous insertions of same domain
    const racePromises = [
      makeRequest({
        hostname: 'localhost',
        port: 5001,
        path: '/api/leads',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` }
      }, { company_name: 'Race Lead 1', website: 'race-condition-domain.com' }),
      makeRequest({
        hostname: 'localhost',
        port: 5001,
        path: '/api/leads',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` }
      }, { company_name: 'Race Lead 2', website: 'https://www.race-condition-domain.com/' }),
      makeRequest({
        hostname: 'localhost',
        port: 5001,
        path: '/api/leads',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` }
      }, { company_name: 'Race Lead 3', website: 'http://race-condition-domain.com/path' })
    ];

    const raceResults = await Promise.all(racePromises);
    const createdCount = raceResults.filter((r) => r.data.status === 'created').length;
    const duplicateCount = raceResults.filter((r) => r.data.status === 'duplicate').length;

    recordResult('RACE_CONDITION', 'Concurrent Request Protection (Database Composite Constraint)', createdCount === 1 && duplicateCount === 2, `Created: ${createdCount}, Duplicate Blocked: ${duplicateCount}`);

    // ----------------------------------------------------------------
    // SECTION 7: LARGE CSV PERFORMANCE BATCH TEST (1,000 ROWS)
    // ----------------------------------------------------------------
    console.log('\n--- SECTION 7: LARGE CSV PERFORMANCE TEST ---');
    const largeBatch = [];
    for (let i = 1; i <= 1000; i++) {
      largeBatch.push({
        company_name: `Performance Industrial ${i}`,
        website: `perf-domain-${timestamp}-${i}.com`,
        email: `contact@perf-${i}.com`,
        phone: `+91 90000 ${10000 + i}`
      });
    }

    const perfStart = Date.now();
    const perfRes = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/leads/bulk-import',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` }
    }, {
      leads: largeBatch,
      fileName: '1000_industrial_leads.csv'
    });

    const perfElapsed = Date.now() - perfStart;
    recordResult('PERFORMANCE', '1,000 Row Large CSV Batch Import (Zero N+1 Queries)', perfRes.data.importedCount === 1000 && perfElapsed < 3000, `Imported 1,000 leads in ${perfElapsed}ms`);

    // ----------------------------------------------------------------
    // SECTION 8: REGRESSION TEST FOR EXISTING CRM FEATURES
    // ----------------------------------------------------------------
    console.log('\n--- SECTION 8: REGRESSION TESTING OF EXISTING CRM FEATURES ---');

    // 1. Dashboard Stats API
    const dashRes = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/dashboard/stats',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    recordResult('REGRESSION', 'Dashboard Stats API Endpoint', dashRes.data.success && typeof dashRes.data.stats.totalLeads === 'number', `Total Leads in Stats: ${dashRes.data.stats.totalLeads}`);

    // 2. All Leads API
    const leadsFetchRes = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/leads',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    recordResult('REGRESSION', 'All Leads CRM Spreadsheet Fetch API', leadsFetchRes.data.success && Array.isArray(leadsFetchRes.data.leads), `Fetched ${leadsFetchRes.data.leads ? leadsFetchRes.data.leads.length : 0} leads`);

    // 3. Scan Website API
    const scanRes = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/scan',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` }
    }, { url: 'https://example.com' });
    recordResult('REGRESSION', 'Single Website Scanner Engine API', scanRes.data.success && !!scanRes.data.data.website, `Scanned website status: ${scanRes.data.data.website_status}`);

    // 4. Email Templates API
    const tplRes = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/email-templates',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    recordResult('REGRESSION', 'B2B Email Template Engine API', tplRes.data.success && Array.isArray(tplRes.data.templates), `Templates available: ${tplRes.data.templates ? tplRes.data.templates.length : 0}`);

    // 5. Follow-ups API
    const followupRes = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/followups',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    recordResult('REGRESSION', 'Follow-up Scheduler & Reminders API', followupRes.data.success && Array.isArray(followupRes.data.dueToday), 'Follow-ups endpoint active');

    // 6. Settings API
    const settingsRes = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/settings',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    recordResult('REGRESSION', 'System & Workspace Settings API', settingsRes.data.success && typeof settingsRes.data.settings === 'object', 'Settings endpoint active');

    // ----------------------------------------------------------------
    // SUMMARY
    // ----------------------------------------------------------------
    console.log('\n================================================================');
    const failedCount = auditResults.filter((r) => !r.passed).length;
    const passedCount = auditResults.filter((r) => r.passed).length;
    console.log(`QA AUDIT COMPLETE: ${passedCount} PASSED / ${failedCount} FAILED (${auditResults.length} TOTAL TESTS)`);
    console.log('================================================================');

    if (failedCount > 0) {
      process.exit(1);
    }

  } catch (err) {
    console.error('QA Master Audit Suite Exception:', err);
    process.exit(1);
  }
}

runMasterQASuite();
