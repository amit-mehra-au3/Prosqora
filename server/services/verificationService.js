const { scanWebsite } = require('./scannerService');
const { normalizeUrl, getRow, getAll, runQuery } = require('../db');

/**
 * Compare two company names to detect mismatch
 */
function isCompanyNameMismatch(csvName, verifiedName) {
  if (!csvName || !verifiedName) return false;

  const clean = (str) =>
    str
      .toLowerCase()
      .replace(/pvt\.?\s*ltd\.?/g, '')
      .replace(/private\s*limited/g, '')
      .replace(/ltd\.?/g, '')
      .replace(/inc\.?/g, '')
      .replace(/llc/g, '')
      .replace(/corp(oration)?/g, '')
      .replace(/co\.?/g, '')
      .replace(/[^a-z0-9]/g, ' ')
      .trim();

  const c1 = clean(csvName);
  const c2 = clean(verifiedName);

  if (!c1 || !c2) return false;
  if (c1 === c2) return false;

  // Check if one contains the other
  if (c1.includes(c2) || c2.includes(c1)) return false;

  // Compare main brand word (first significant word > 3 chars)
  const words1 = c1.split(/\s+/).filter((w) => w.length > 3);
  const words2 = c2.split(/\s+/).filter((w) => w.length > 3);

  if (words1.length > 0 && words2.length > 0) {
    const hasCommonWord = words1.some((w1) => words2.some((w2) => w1 === w2 || w1.includes(w2) || w2.includes(w1)));
    if (hasCommonWord) return false;
  }

  return true;
}

/**
 * Run website verification pipeline for CSV import queue
 */
async function verifyCsvQueue({ userId, rows, allowMissingWebsite = false, concurrency = 5 }) {
  if (!Array.isArray(rows)) return { success: false, error: 'Rows array required' };

  const totalRows = rows.length;
  const verifiedResults = [];

  let verifiedCount = 0;
  let needsReviewCount = 0;
  let duplicatesCount = 0;
  let unreachableCount = 0;
  let invalidCount = 0;
  let missingCount = 0;

  const domainVerificationMap = new Map();
  const rowEvaluations = [];

  // Batch query database for existing workspace normalized_urls
  const uniqueNormUrls = new Set();
  rows.forEach((r) => {
    const rawWeb = (r.website || '').trim();
    if (rawWeb) {
      const norm = normalizeUrl(rawWeb);
      if (norm && norm.includes('.') && norm.length >= 3) {
        uniqueNormUrls.add(norm);
      }
    }
  });

  const existingNormUrlsSet = new Set();
  if (uniqueNormUrls.size > 0) {
    const normArray = Array.from(uniqueNormUrls);
    const chunkSize = 500;
    for (let i = 0; i < normArray.length; i += chunkSize) {
      const chunk = normArray.slice(i, i + chunkSize);
      const placeholders = chunk.map(() => '?').join(',');
      const existingRows = await getAll(
        `SELECT normalized_url FROM leads WHERE user_id = ? AND normalized_url IN (${placeholders})`,
        [userId, ...chunk]
      );
      existingRows.forEach((ex) => existingNormUrlsSet.add(ex.normalized_url));
    }
  }

  // Phase 2: Process rows and group unique domains for scanning
  const domainsToScan = new Set();

  for (let idx = 0; idx < rows.length; idx++) {
    const row = rows[idx];
    const rawWeb = (row.website || '').trim();
    const csvCompany = (row.company_name || '').trim();

    if (!rawWeb) {
      if (allowMissingWebsite) {
        rowEvaluations.push({
          rowIdx: idx,
          rawWeb: '',
          normUrl: '',
          csvCompany,
          status: 'Needs Review',
          statusBadge: 'Needs Review — Missing Website',
          reason: 'Row has no website URL (duplicate check unavailable)',
          verifiedCompany: csvCompany || 'Unnamed Lead',
          leadCandidate: {
            company_name: csvCompany || 'Unnamed Lead',
            website: '',
            normalized_url: '',
            email: row.email || '',
            phone: row.phone || '',
            contact_person: row.contact_person || '',
            location: row.address || row.city || '',
            city: row.city || 'Unknown',
            state: row.state || 'Unknown',
            country: row.country || 'India',
            category: row.category || '',
            notes: row.notes || '',
            source: row.source || 'CSV Import'
          }
        });
        needsReviewCount++;
      } else {
        rowEvaluations.push({
          rowIdx: idx,
          rawWeb: '',
          normUrl: '',
          csvCompany,
          status: 'Missing Website',
          statusBadge: 'Missing Website',
          reason: 'Row has no website URL',
          leadCandidate: null
        });
        missingCount++;
      }
      continue;
    }

    const normUrl = normalizeUrl(rawWeb);
    if (!normUrl || !normUrl.includes('.') || normUrl.length < 3) {
      rowEvaluations.push({
        rowIdx: idx,
        rawWeb,
        normUrl: '',
        csvCompany,
        status: 'Invalid Website',
        statusBadge: 'Invalid Website',
        reason: 'URL is invalid or missing domain extension',
        leadCandidate: null
      });
      invalidCount++;
      continue;
    }

    if (existingNormUrlsSet.has(normUrl)) {
      rowEvaluations.push({
        rowIdx: idx,
        rawWeb,
        normUrl,
        csvCompany,
        status: 'Duplicate',
        statusBadge: 'Duplicate — Existing Lead',
        reason: 'Website already exists in your workspace CRM',
        leadCandidate: null
      });
      duplicatesCount++;
      continue;
    }

    if (domainVerificationMap.has(normUrl)) {
      rowEvaluations.push({
        rowIdx: idx,
        rawWeb,
        normUrl,
        csvCompany,
        status: 'Duplicate',
        statusBadge: 'Duplicate in CSV',
        reason: 'Website appears multiple times in uploaded CSV',
        leadCandidate: null
      });
      duplicatesCount++;
      continue;
    }

    domainVerificationMap.set(normUrl, null);
    domainsToScan.add({ normUrl, rawWeb, csvCompany, rowIdx: idx });
  }

  // Phase 3: Execute Controlled Concurrent Scanner Execution
  const scanArray = Array.from(domainsToScan);
  const scanResultsMap = new Map();

  for (let i = 0; i < scanArray.length; i += concurrency) {
    const chunk = scanArray.slice(i, i + concurrency);
    await Promise.all(
      chunk.map(async (item) => {
        try {
          const scanRes = await scanWebsite(item.rawWeb || item.normUrl);
          scanResultsMap.set(item.normUrl, { success: true, scanData: scanRes });
        } catch (err) {
          scanResultsMap.set(item.normUrl, { success: false, error: err.message });
        }
      })
    );
  }

  // Phase 4: Finalize Status & Data Candidate for Scanned Rows
  for (let idx = 0; idx < rows.length; idx++) {
    const existingEval = rowEvaluations.find((e) => e.rowIdx === idx);
    if (existingEval) {
      verifiedResults.push(existingEval);
      continue;
    }

    const row = rows[idx];
    const rawWeb = (row.website || '').trim();
    const csvCompany = (row.company_name || '').trim();
    const normUrl = normalizeUrl(rawWeb);

    const scanOutcome = scanResultsMap.get(normUrl);

    if (!scanOutcome || !scanOutcome.success || !scanOutcome.scanData) {
      verifiedResults.push({
        rowIdx: idx,
        rawWeb,
        normUrl,
        csvCompany,
        status: 'Website Unreachable',
        statusBadge: 'Website Unreachable',
        reason: scanOutcome?.error || 'Website returned 404/500 error or connection timed out',
        leadCandidate: null
      });
      unreachableCount++;
      continue;
    }

    const sData = scanOutcome.scanData;
    const isUnreachable =
      !sData ||
      (sData.website_status || '').includes('Unreachable') ||
      (sData.website_status || '').includes('Not Accessible') ||
      sData.http_status === 404 ||
      sData.http_status === 500 ||
      sData.http_status === 0;

    if (isUnreachable) {
      verifiedResults.push({
        rowIdx: idx,
        rawWeb,
        normUrl,
        csvCompany,
        status: 'Website Unreachable',
        statusBadge: 'Website Unreachable',
        reason: `HTTP ${sData.http_status || 'Error'} — Website could not be reached`,
        leadCandidate: null
      });
      unreachableCount++;
      continue;
    }

    const verifiedCompany = (sData.company_name || '').trim() || csvCompany;
    const isMismatch = isCompanyNameMismatch(csvCompany, sData.company_name);

    const leadCandidate = {
      company_name: verifiedCompany || csvCompany || 'Company',
      csv_company_name: csvCompany,
      verified_company_name: sData.company_name || '',
      website: sData.website || rawWeb,
      normalized_url: normUrl,
      email: sData.email || row.email || '',
      phone: sData.phone || row.phone || '',
      contact_person: sData.contact_person || row.contact_person || '',
      city: sData.city || row.city || 'Unknown',
      state: sData.state || row.state || 'Unknown',
      country: sData.country || row.country || 'India',
      location: sData.location || row.address || '',
      address: sData.address || row.address || '',
      category: sData.category || row.category || '',
      categories: JSON.stringify(sData.categories || []),
      products: sData.products || row.products || '',
      services: sData.services || row.services || '',
      notes: row.notes || '',
      confidence_score: sData.confidence_score || 'MEDIUM',
      source: row.source || 'CSV Import'
    };

    if (isMismatch) {
      verifiedResults.push({
        rowIdx: idx,
        rawWeb,
        normUrl,
        csvCompany,
        verifiedCompany: sData.company_name,
        status: 'Needs Review',
        statusBadge: 'Company Mismatch',
        reason: `CSV company name ("${csvCompany}") mismatches verified website company ("${sData.company_name}")`,
        mismatch: true,
        leadCandidate
      });
      needsReviewCount++;
    } else if (sData.confidence_score === 'LOW' && !sData.email && !sData.phone) {
      verifiedResults.push({
        rowIdx: idx,
        rawWeb,
        normUrl,
        csvCompany,
        verifiedCompany,
        status: 'Needs Review',
        statusBadge: 'Low Confidence Data',
        reason: 'Website reached but limited company contact information was extracted',
        mismatch: false,
        leadCandidate
      });
      needsReviewCount++;
    } else {
      verifiedResults.push({
        rowIdx: idx,
        rawWeb,
        normUrl,
        csvCompany,
        verifiedCompany,
        status: 'Verified',
        statusBadge: 'Verified Company',
        reason: 'Website reachable and company details successfully verified',
        mismatch: false,
        leadCandidate
      });
      verifiedCount++;
    }
  }

  verifiedResults.sort((a, b) => a.rowIdx - b.rowIdx);

  return {
    success: true,
    totalRows,
    verifiedCount,
    needsReviewCount,
    duplicatesCount,
    unreachableCount,
    invalidCount,
    missingCount,
    verifiedResults
  };
}

/**
 * Run verification for a single batch chunk (e.g. 5-10 rows) for live progress streaming
 */
async function verifyCsvBatchChunk({ userId, rowsChunk, allowMissingWebsite = false, existingDomainsSet = new Set(), concurrency = 3 }) {
  if (!Array.isArray(rowsChunk)) return { success: false, error: 'rowsChunk must be an array' };

  const verifiedResults = [];
  let verifiedCount = 0;
  let needsReviewCount = 0;
  let duplicatesCount = 0;
  let unreachableCount = 0;
  let invalidCount = 0;
  let missingCount = 0;

  // Phase 1: Local normalization & URL deduplication
  const uniqueNormUrls = new Set();
  rowsChunk.forEach((r) => {
    const rawWeb = (r.website || '').trim();
    if (rawWeb) {
      const norm = normalizeUrl(rawWeb);
      if (norm && norm.includes('.') && norm.length >= 3) {
        uniqueNormUrls.add(norm);
      }
    }
  });

  const dbExistingNormUrlsSet = new Set();
  if (uniqueNormUrls.size > 0) {
    const normArray = Array.from(uniqueNormUrls);
    const placeholders = normArray.map(() => '?').join(',');
    const existingRows = await getAll(
      `SELECT normalized_url FROM leads WHERE user_id = ? AND normalized_url IN (${placeholders})`,
      [userId, ...normArray]
    );
    existingRows.forEach((ex) => dbExistingNormUrlsSet.add(ex.normalized_url));
  }

  const chunkSeenSet = new Set();
  const domainsToScan = [];

  for (let i = 0; i < rowsChunk.length; i++) {
    const item = rowsChunk[i];
    const rowIdx = item.rowIdx !== undefined ? item.rowIdx : i;
    const rawWeb = (item.website || '').trim();
    const csvCompany = (item.company_name || '').trim();

    if (!rawWeb) {
      if (allowMissingWebsite) {
        verifiedResults.push({
          rowIdx,
          rawWeb: '',
          normUrl: '',
          csvCompany,
          status: 'Needs Review',
          statusBadge: 'Needs Review — Missing Website',
          reason: 'Row has no website URL',
          verifiedCompany: csvCompany || 'Unnamed Lead',
          leadCandidate: {
            company_name: csvCompany || 'Unnamed Lead',
            website: '',
            normalized_url: '',
            email: item.email || '',
            phone: item.phone || '',
            contact_person: item.contact_person || '',
            location: item.address || item.city || '',
            city: item.city || 'Unknown',
            state: item.state || 'Unknown',
            country: item.country || 'India',
            category: item.category || '',
            notes: item.notes || '',
            source: item.source || 'CSV Import'
          }
        });
        needsReviewCount++;
      } else {
        verifiedResults.push({
          rowIdx,
          rawWeb: '',
          normUrl: '',
          csvCompany,
          status: 'Missing Website',
          statusBadge: 'Missing Website',
          reason: 'Row has no website URL',
          leadCandidate: null
        });
        missingCount++;
      }
      continue;
    }

    const normUrl = normalizeUrl(rawWeb);
    if (!normUrl || !normUrl.includes('.') || normUrl.length < 3) {
      verifiedResults.push({
        rowIdx,
        rawWeb,
        normUrl: '',
        csvCompany,
        status: 'Invalid Website',
        statusBadge: 'Invalid Website',
        reason: 'URL is invalid or missing domain extension',
        leadCandidate: null
      });
      invalidCount++;
      continue;
    }

    if (dbExistingNormUrlsSet.has(normUrl) || existingDomainsSet.has(normUrl)) {
      verifiedResults.push({
        rowIdx,
        rawWeb,
        normUrl,
        csvCompany,
        status: 'Duplicate',
        statusBadge: 'Duplicate — Existing Lead',
        reason: 'Website already exists in your workspace CRM',
        leadCandidate: null
      });
      duplicatesCount++;
      continue;
    }

    if (chunkSeenSet.has(normUrl)) {
      verifiedResults.push({
        rowIdx,
        rawWeb,
        normUrl,
        csvCompany,
        status: 'Duplicate',
        statusBadge: 'Duplicate in CSV',
        reason: 'Website appears multiple times in CSV',
        leadCandidate: null
      });
      duplicatesCount++;
      continue;
    }

    chunkSeenSet.add(normUrl);
    domainsToScan.push({ rowIdx, rawWeb, csvCompany, normUrl, originalItem: item });
  }

  // Scan unique domains with timeout
  const scanResultsMap = new Map();
  for (let i = 0; i < domainsToScan.length; i += concurrency) {
    const chunk = domainsToScan.slice(i, i + concurrency);
    await Promise.all(
      chunk.map(async (item) => {
        try {
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Website timeout')), 6000)
          );
          const scanRes = await Promise.race([scanWebsite(item.rawWeb || item.normUrl), timeoutPromise]);
          scanResultsMap.set(item.normUrl, { success: true, scanData: scanRes });
        } catch (err) {
          scanResultsMap.set(item.normUrl, { success: false, error: err.message || 'Website Timeout' });
        }
      })
    );
  }

  // Finalize evaluation
  domainsToScan.forEach((item) => {
    const scanOutcome = scanResultsMap.get(item.normUrl);
    const sData = scanOutcome?.scanData;
    const isUnreachable =
      !scanOutcome ||
      !scanOutcome.success ||
      !sData ||
      (sData.website_status || '').includes('Unreachable') ||
      (sData.website_status || '').includes('Not Accessible') ||
      sData.http_status === 404 ||
      sData.http_status === 500 ||
      sData.http_status === 0;

    if (isUnreachable) {
      verifiedResults.push({
        rowIdx: item.rowIdx,
        rawWeb: item.rawWeb,
        normUrl: item.normUrl,
        csvCompany: item.csvCompany,
        status: 'Website Unreachable',
        statusBadge: scanOutcome?.error === 'Website timeout' ? 'Website Timeout' : 'Website Unreachable',
        reason: scanOutcome?.error || 'Website returned HTTP error or timed out',
        leadCandidate: null
      });
      unreachableCount++;
      return;
    }

    const verifiedCompany = (sData.company_name || '').trim() || item.csvCompany;
    const isMismatch = isCompanyNameMismatch(item.csvCompany, sData.company_name);

    const leadCandidate = {
      company_name: verifiedCompany || item.csvCompany || 'Company',
      csv_company_name: item.csvCompany,
      verified_company_name: sData.company_name || '',
      website: sData.website || item.rawWeb,
      normalized_url: item.normUrl,
      email: sData.email || item.originalItem.email || '',
      phone: sData.phone || item.originalItem.phone || '',
      contact_person: sData.contact_person || item.originalItem.contact_person || '',
      city: sData.city || item.originalItem.city || 'Unknown',
      state: sData.state || item.originalItem.state || 'Unknown',
      country: sData.country || item.originalItem.country || 'India',
      location: sData.location || item.originalItem.address || '',
      address: sData.address || item.originalItem.address || '',
      category: sData.category || item.originalItem.category || '',
      categories: JSON.stringify(sData.categories || []),
      products: sData.products || item.originalItem.products || '',
      services: sData.services || item.originalItem.services || '',
      notes: item.originalItem.notes || '',
      confidence_score: sData.confidence_score || 'MEDIUM',
      source: item.originalItem.source || 'CSV Import'
    };

    if (isMismatch) {
      verifiedResults.push({
        rowIdx: item.rowIdx,
        rawWeb: item.rawWeb,
        normUrl: item.normUrl,
        csvCompany: item.csvCompany,
        verifiedCompany: sData.company_name,
        status: 'Needs Review',
        statusBadge: 'Company Mismatch',
        reason: `CSV name ("${item.csvCompany}") mismatches website name ("${sData.company_name}")`,
        mismatch: true,
        leadCandidate
      });
      needsReviewCount++;
    } else if (sData.confidence_score === 'LOW' && !sData.email && !sData.phone) {
      verifiedResults.push({
        rowIdx: item.rowIdx,
        rawWeb: item.rawWeb,
        normUrl: item.normUrl,
        csvCompany: item.csvCompany,
        verifiedCompany,
        status: 'Needs Review',
        statusBadge: 'Low Confidence Data',
        reason: 'Website reached but limited contact details extracted',
        mismatch: false,
        leadCandidate
      });
      needsReviewCount++;
    } else {
      verifiedResults.push({
        rowIdx: item.rowIdx,
        rawWeb: item.rawWeb,
        normUrl: item.normUrl,
        csvCompany: item.csvCompany,
        verifiedCompany,
        status: 'Verified',
        statusBadge: 'Verified Company',
        reason: 'Website reachable and details verified',
        mismatch: false,
        leadCandidate
      });
      verifiedCount++;
    }
  });

  return {
    success: true,
    verifiedResults,
    verifiedCount,
    needsReviewCount,
    duplicatesCount,
    unreachableCount,
    invalidCount,
    missingCount
  };
}

/**
 * Rescan Existing Leads Batch Chunk Service
 * Re-scans websites for EXISTING leads ONLY.
 * NEVER creates new leads or alters total lead count.
 * Updates website_status, verification_status, verified_at, last_website_check_at, and non-empty company details.
 */
async function rescanLeadsBatchChunk({ userId, leadsChunk, concurrency = 3 }) {
  if (!Array.isArray(leadsChunk) || leadsChunk.length === 0) {
    return {
      success: true,
      rescannedCount: 0,
      updatedCount: 0,
      needsReviewCount: 0,
      notAccessibleCount: 0,
      failedCount: 0,
      updatedResults: []
    };
  }

  // Group leads by normalized URL to avoid scanning duplicate URLs twice
  const urlToLeadsMap = new Map();
  const uniqueUrlsToScan = [];

  for (const lead of leadsChunk) {
    const normUrl = normalizeUrl(lead.website || lead.normalized_url || '');
    if (!normUrl) continue;

    if (!urlToLeadsMap.has(normUrl)) {
      urlToLeadsMap.set(normUrl, []);
      uniqueUrlsToScan.push({ normUrl, sampleUrl: lead.website || normUrl });
    }
    urlToLeadsMap.get(normUrl).push(lead);
  }

  // Concurrency controlled scanner map
  const scanResultsMap = new Map();

  for (let i = 0; i < uniqueUrlsToScan.length; i += concurrency) {
    const batch = uniqueUrlsToScan.slice(i, i + concurrency);
    const promises = batch.map(async (item) => {
      try {
        const timeoutPromise = new Promise((resolve) => {
          setTimeout(() => resolve({ success: false, error: 'Website timeout' }), 6000);
        });

        const scanPromise = scanWebsite(item.sampleUrl).then((data) => ({
          success: true,
          scanData: data
        }));

        const outcome = await Promise.race([scanPromise, timeoutPromise]);
        scanResultsMap.set(item.normUrl, outcome);
      } catch (err) {
        scanResultsMap.set(item.normUrl, { success: false, error: err.message });
      }
    });

    await Promise.all(promises);
  }

  let rescannedCount = 0;
  let updatedCount = 0;
  let needsReviewCount = 0;
  let notAccessibleCount = 0;
  let failedCount = 0;
  const updatedResults = [];

  for (const lead of leadsChunk) {
    const normUrl = normalizeUrl(lead.website || lead.normalized_url || '');
    const scanOutcome = normUrl ? scanResultsMap.get(normUrl) : null;
    const nowIso = new Date().toISOString();

    let newWebStatus = '🔴 Not Accessible';
    let newVerStatus = 'Needs Review';
    let newVerAt = lead.verified_at || null;
    let newLastCheckAt = nowIso;
    let updatedFields = {};

    if (scanOutcome && scanOutcome.success && scanOutcome.scanData) {
      const sData = scanOutcome.scanData;
      const isAccessible =
        (sData.website_status || '').includes('Reachable') ||
        (sData.website_status || '').includes('Redirected') ||
        (sData.website_status || '').includes('Working') ||
        (sData.website_status || '').includes('Accessible') ||
        sData.http_status === 200;

      if (isAccessible) {
        newWebStatus = (sData.website_status || '').includes('Redirected') ? '🟡 Redirected' : '🟢 Accessible';
        
        // Mismatch or Low Confidence check
        const isMismatch = isCompanyNameMismatch(lead.company_name, sData.company_name);
        if (isMismatch || (sData.confidence_score === 'LOW' && !sData.email && !sData.phone)) {
          newVerStatus = 'Needs Review';
        } else {
          newVerStatus = 'Verified';
          newVerAt = nowIso;
        }

        // Only update non-empty extracted values (DO NOT overwrite existing CRM info with empty strings)
        if (sData.company_name && sData.company_name !== 'Unknown' && sData.company_name !== lead.company_name && !isMismatch) {
          updatedFields.company_name = sData.company_name;
        }
        if (sData.email && !lead.email) {
          updatedFields.email = sData.email;
        }
        if (sData.phone && !lead.phone) {
          updatedFields.phone = sData.phone;
        }
        if (sData.contact_person && !lead.contact_person) {
          updatedFields.contact_person = sData.contact_person;
        }
        if (sData.city && sData.city !== 'Unknown' && (!lead.city || lead.city === 'Unknown')) {
          updatedFields.city = sData.city;
        }
        if (sData.state && sData.state !== 'Unknown' && (!lead.state || lead.state === 'Unknown')) {
          updatedFields.state = sData.state;
        }
        if (sData.location && (!lead.location || lead.location === 'Unknown')) {
          updatedFields.location = sData.location;
        }
        if (sData.products && !lead.products) {
          updatedFields.products = sData.products;
        }
        if (sData.services && !lead.services) {
          updatedFields.services = sData.services;
        }
        if (Array.isArray(sData.categories) && sData.categories.length > 0 && (!lead.categories || lead.categories === '[]')) {
          updatedFields.categories = JSON.stringify(sData.categories);
          updatedFields.category = sData.categories[0];
        }

        updatedCount++;
        if (newVerStatus === 'Needs Review') needsReviewCount++;
      } else {
        newWebStatus = '🔴 Not Accessible';
        newVerStatus = 'Needs Review';
        notAccessibleCount++;
      }
    } else {
      newWebStatus = scanOutcome?.error === 'Website timeout' ? '🟡 Timeout' : '🔴 Not Accessible';
      newVerStatus = 'Needs Review';
      if (scanOutcome?.error === 'Website timeout') {
        notAccessibleCount++;
      } else {
        failedCount++;
      }
    }

    // UPDATE EXISTING LEAD IN DATABASE SAFELY (WHERE id = lead.id AND user_id = userId)
    const updateCols = [
      'website_status = ?',
      'verification_status = ?',
      'verified_at = ?',
      'last_website_check_at = ?'
    ];
    const updateParams = [newWebStatus, newVerStatus, newVerAt, newLastCheckAt];

    for (const [key, val] of Object.entries(updatedFields)) {
      updateCols.push(`${key} = ?`);
      updateParams.push(val);
    }

    updateParams.push(lead.id, userId);

    await runQuery(
      `UPDATE leads SET ${updateCols.join(', ')} WHERE id = ? AND user_id = ?`,
      updateParams
    );

    rescannedCount++;
    updatedResults.push({
      leadId: lead.id,
      companyName: lead.company_name,
      website: lead.website,
      websiteStatus: newWebStatus,
      verificationStatus: newVerStatus,
      updatedFields
    });
  }

  return {
    success: true,
    rescannedCount,
    updatedCount,
    needsReviewCount,
    notAccessibleCount,
    failedCount,
    updatedResults
  };
}

module.exports = {
  verifyCsvQueue,
  verifyCsvBatchChunk,
  rescanLeadsBatchChunk,
  isCompanyNameMismatch
};
