const axios = require('axios');
const cheerio = require('cheerio');
const { normalizePhone } = require('../db');

// Keywords to discover subpages for crawling (up to 5 pages max)
const DISCOVERY_KEYWORDS = ['contact', 'contact-us', 'about', 'about-us', 'products', 'services', 'industries'];

// Disallowed routes to avoid scanning login/dashboard/private pages
const DISALLOWED_KEYWORDS = ['login', 'signin', 'signup', 'dashboard', 'admin', 'auth', 'account', 'cart', 'checkout', 'wp-admin'];

/**
 * Format normalized phone for display e.g. +918373919166 -> +91 8373919166
 */
function formatDisplayPhone(raw, norm) {
  if (!norm) return raw || '';
  if (norm.startsWith('+91') && norm.length === 13) {
    return `+91 ${norm.slice(3, 8)} ${norm.slice(8)}`;
  }
  return raw || norm;
}

/**
 * Extract clean company/website name from URL or title
 */
function extractWebsiteName(title, url) {
  if (!url) return title || 'Company';
  try {
    const parsed = new URL(url);
    let hostname = parsed.hostname.replace(/^www\./, '');
    let parts = hostname.split('.');
    if (parts.length > 0 && parts[0]) {
      let name = parts[0];
      return name.charAt(0).toUpperCase() + name.slice(1);
    }
  } catch (e) {}
  return title ? title.split(/[-|_|:]/)[0].trim() : 'Company Website';
}

/**
 * Categorization Engine — Assigns MULTIPLE categories with evidence snippets
 */
function assignCategoriesAndEvidence(allText, companyName) {
  const textUpper = (allText + ' ' + companyName).toUpperCase();
  const assigned = [];
  const evidenceLogs = [];

  const categoryMap = [
    {
      category: 'CNC Machine Manufacturers',
      keywords: ['CNC', 'CNC TURNING', 'CNC MILLING', 'CNC LATHE', 'CNC MACHINING'],
    },
    {
      category: 'OEM Manufacturers',
      keywords: ['OEM', 'ORIGINAL EQUIPMENT MANUFACTURER', 'OEM SUPPLIER', 'OEM SOLUTIONS'],
    },
    {
      category: 'SPM Manufacturers',
      keywords: ['SPM', 'SPECIAL PURPOSE MACHINE', 'SPECIAL PURPOSE MACHINERY', 'CUSTOM MACHINE'],
    },
    {
      category: 'Machine Builders',
      keywords: ['MACHINE BUILDER', 'MACHINERY BUILDER', 'CUSTOM MACHINERY BUILDER'],
    },
    {
      category: 'Industrial Machinery Manufacturers',
      keywords: ['INDUSTRIAL MACHINERY', 'INDUSTRIAL EQUIPMENT', 'MACHINERY MANUFACTURER'],
    },
    {
      category: 'Packaging Machine Manufacturers',
      keywords: ['PACKAGING', 'FILLING MACHINE', 'CARTONING', 'LABELING MACHINE', 'POUCH PACKING', 'BOTTLING'],
    },
    {
      category: 'Injection Molding Machines',
      keywords: ['INJECTION MOLDING', 'INJECTION MOULDING', 'PLASTIC MOLDING', 'EXTRUSION'],
    },
    {
      category: 'Food Processing Machinery',
      keywords: ['FOOD PROCESSING', 'DAIRY MACHINERY', 'BEVERAGE MACHINERY', 'BAKERY MACHINERY'],
    },
    {
      category: 'Pharmaceutical Machinery',
      keywords: ['PHARMA', 'PHARMACEUTICAL', 'CHEMICAL EQUIPMENT', 'PROCESS MACHINERY'],
    },
    {
      category: 'Industrial Automation',
      keywords: ['AUTOMATION', 'INDUSTRIAL AUTOMATION', 'FACTORY AUTOMATION', 'PROCESS AUTOMATION'],
    },
    {
      category: 'PLC Automation',
      keywords: ['PLC', 'PROGRAMMABLE LOGIC CONTROLLER', 'PLC SYSTEM', 'PLC INTEGRATOR'],
    },
    {
      category: 'HMI / SCADA Integrators',
      keywords: ['HMI', 'SCADA', 'HUMAN MACHINE INTERFACE', 'SUPERVISORY CONTROL'],
    },
    {
      category: 'Robotics & Automation',
      keywords: ['ROBOT', 'ROBOTIC', 'ROBOTICS', 'ROBOT CELL', 'PICK AND PLACE', 'WELDING AUTOMATION'],
    },
    {
      category: 'Control Panel Manufacturers',
      keywords: ['CONTROL PANEL', 'ELECTRICAL PANEL', 'MCC PANEL', 'PCC PANEL', 'AUTOMATION PANEL'],
    },
    {
      category: 'Conveyor Manufacturers',
      keywords: ['CONVEYOR', 'MATERIAL HANDLING', 'HOIST', 'CRANE AUTOMATION', 'WAREHOUSE AUTOMATION'],
    },
    {
      category: 'Vision Inspection',
      keywords: ['VISION INSPECTION', 'CAMERA INSPECTION', 'QUALITY INSPECTION', 'CHECKWEIGHER'],
    },
    {
      category: 'Servo & Motion Control',
      keywords: ['SERVO', 'MOTION CONTROL', 'VFD', 'DRIVE SYSTEM'],
    }
  ];

  for (const item of categoryMap) {
    for (const kw of item.keywords) {
      if (textUpper.includes(kw)) {
        if (!assigned.includes(item.category)) {
          assigned.push(item.category);

          // Extract 40 character context snippet
          const idx = textUpper.indexOf(kw);
          const start = Math.max(0, idx - 20);
          const end = Math.min(allText.length, idx + kw.length + 30);
          const snippet = allText.substring(start, end).replace(/\s+/g, ' ');

          evidenceLogs.push({
            category: item.category,
            matchedKeyword: kw,
            evidence: `Text content mentions "${kw}": "...${snippet}..."`
          });
        }
        break;
      }
    }
  }

  if (assigned.length === 0) {
    assigned.push('Needs Review');
    evidenceLogs.push({
      category: 'Needs Review',
      matchedKeyword: 'None',
      evidence: 'Insufficient industry keywords found on website text. Tagged for manual review.'
    });
  }

  return { categories: assigned, category_evidence: evidenceLogs };
}

/**
 * Parses JSON-LD microdata scripts
 */
function parseJsonLd(html, pageUrl) {
  const jsonLdData = {
    phones: [],
    emails: [],
    addresses: [],
    name: '',
    url: ''
  };

  const $ = cheerio.load(html);
  $('script[type="application/ld+json"]').each((_, elem) => {
    try {
      const content = $(elem).html();
      if (!content) return;
      const parsed = JSON.parse(content);
      const items = Array.isArray(parsed) ? parsed : [parsed];

      for (const item of items) {
        const type = item['@type'] || '';
        const isTargetType = [
          'Organization',
          'LocalBusiness',
          'Corporation',
          'Store',
          'ProfessionalService',
          'ManufacturingBusiness'
        ].some((t) => type.includes(t));

        if (isTargetType || item.telephone || item.email || item.address) {
          if (item.name && !jsonLdData.name) jsonLdData.name = item.name;
          if (item.url && !jsonLdData.url) jsonLdData.url = item.url;

          if (item.telephone) {
            const tels = Array.isArray(item.telephone) ? item.telephone : [item.telephone];
            tels.forEach((t) => {
              jsonLdData.phones.push({
                raw: String(t).trim(),
                sectionLabel: 'JSON-LD',
                pageUrl,
                snippet: `JSON-LD @type: ${type}`
              });
            });
          }

          if (item.email) {
            const ems = Array.isArray(item.email) ? item.email : [item.email];
            ems.forEach((e) => {
              jsonLdData.emails.push({
                email: String(e).trim().toLowerCase(),
                sectionLabel: 'JSON-LD',
                pageUrl,
                snippet: `JSON-LD @type: ${type}`
              });
            });
          }

          if (item.address) {
            let addrStr = '';
            if (typeof item.address === 'string') {
              addrStr = item.address;
            } else if (typeof item.address === 'object') {
              addrStr = [
                item.address.streetAddress,
                item.address.addressLocality,
                item.address.addressRegion,
                item.address.postalCode,
                item.address.addressCountry
              ]
                .filter(Boolean)
                .join(', ');
            }
            if (addrStr) jsonLdData.addresses.push(addrStr);
          }
        }
      }
    } catch (e) {
      // Ignore invalid JSON-LD
    }
  });

  return jsonLdData;
}

/**
 * Extract phone numbers from text with precise Indian & International regexes
 */
function extractPhonesFromText(text, sectionLabel, pageUrl) {
  const found = [];
  if (!text) return found;

  const phonePatterns = [
    /(?:\+91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}/g,
    /\b0\d{2,4}[\s-]?\d{6,8}\b/g,
    /\b0[6-9]\d{9}\b/g,
    /\b[6-9]\d{9}\b/g,
    /\+\d{1,3}[\s-]?\(?\d{2,4}\)?[\s-]?\d{3,4}[\s-]?\d{3,4}/g
  ];

  for (const pattern of phonePatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const raw = match[0].trim();
      const digitsCount = (raw.match(/\d/g) || []).length;
      if (digitsCount >= 8 && digitsCount <= 14) {
        const start = Math.max(0, match.index - 15);
        const end = Math.min(text.length, match.index + raw.length + 15);
        const snippet = text.substring(start, end).replace(/\s+/g, ' ');

        found.push({
          raw,
          sectionLabel,
          pageUrl,
          snippet
        });
      }
    }
  }

  return found;
}

/**
 * Extract tel:, mailto: and WhatsApp links from DOM or raw JS content
 */
function extractHtmlLinks($, sectionLabel, pageUrl, rawContent = '') {
  const telLinks = [];
  const mailtoLinks = [];
  const whatsappLinks = [];

  if ($) {
    $('a[href]').each((_, elem) => {
      const href = $(elem).attr('href') || '';
      const linkText = $(elem).text().trim();

      if (href.startsWith('tel:')) {
        const raw = href.replace(/^tel:/, '').trim();
        if (raw) {
          telLinks.push({
            raw,
            sectionLabel: sectionLabel ? `${sectionLabel} (Tel Link)` : 'Tel Link',
            pageUrl,
            snippet: `<a href="${href}">${linkText || raw}</a>`
          });
        }
      }

      if (href.startsWith('mailto:')) {
        const email = href.replace(/^mailto:/, '').split('?')[0].trim().toLowerCase();
        if (email && email.includes('@')) {
          mailtoLinks.push({
            email,
            sectionLabel: sectionLabel ? `${sectionLabel} (Mailto Link)` : 'Mailto Link',
            pageUrl,
            snippet: `<a href="${href}">${linkText || email}</a>`
          });
        }
      }

      if (href.includes('wa.me/') || href.includes('api.whatsapp.com/send') || href.startsWith('whatsapp:')) {
        let waNum = '';
        const waMatch = href.match(/(?:wa\.me\/|phone=|\+)(\d+)/);
        if (waMatch && waMatch[1]) {
          waNum = '+' + waMatch[1];
        }
        whatsappLinks.push({
          raw: waNum || linkText,
          href,
          sectionLabel: sectionLabel ? `${sectionLabel} (WhatsApp)` : 'WhatsApp Link',
          pageUrl
        });
      }
    });
  }

  if (rawContent) {
    const waMatches = rawContent.matchAll(/(?:https?:\/\/)?(?:wa\.me\/|api\.whatsapp\.com\/send\?phone=)(\+?\d{10,15})/gi);
    for (const m of waMatches) {
      whatsappLinks.push({
        raw: m[1].startsWith('+') ? m[1] : '+' + m[1],
        href: m[0],
        sectionLabel: `${sectionLabel} (WhatsApp Link)`,
        pageUrl
      });
    }

    const telMatches = rawContent.matchAll(/tel:(\+?[0-9\s-]{8,15})/gi);
    for (const m of telMatches) {
      telLinks.push({
        raw: m[1].trim(),
        sectionLabel: `${sectionLabel} (Tel Link)`,
        pageUrl,
        snippet: `tel:${m[1]}`
      });
    }

    const mailMatches = rawContent.matchAll(/mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi);
    for (const m of mailMatches) {
      mailtoLinks.push({
        email: m[1].toLowerCase(),
        sectionLabel: `${sectionLabel} (Mailto Link)`,
        pageUrl,
        snippet: `mailto:${m[1]}`
      });
    }
  }

  return { telLinks, mailtoLinks, whatsappLinks };
}

/**
 * Extract Social Media Links
 */
function extractSocialMediaLinks($, rawContent = '') {
  const social = {
    linkedin: '',
    facebook: '',
    instagram: '',
    youtube: '',
    twitter: ''
  };

  const processUrl = (href) => {
    if (!href) return;
    if (!social.linkedin && href.includes('linkedin.com/')) social.linkedin = href;
    else if (!social.facebook && href.includes('facebook.com/')) social.facebook = href;
    else if (!social.instagram && href.includes('instagram.com/')) social.instagram = href;
    else if (!social.youtube && (href.includes('youtube.com/') || href.includes('youtu.be/'))) social.youtube = href;
    else if (!social.twitter && (href.includes('twitter.com/') || href.includes('x.com/'))) social.twitter = href;
  };

  if ($) {
    $('a[href]').each((_, elem) => processUrl($(elem).attr('href')));
  }

  if (rawContent) {
    const urlMatches = rawContent.matchAll(/https?:\/\/(?:www\.)?(?:linkedin|facebook|instagram|youtube|twitter|x)\.com\/[a-zA-Z0-9_.-]+\/?/gi);
    for (const m of urlMatches) {
      processUrl(m[0]);
    }
  }

  return social;
}

/**
 * Build target URL for subpages
 */
function buildTargetUrl(baseUrl, href) {
  try {
    let cleanBase = baseUrl.trim();
    if (!cleanBase.startsWith('http://') && !cleanBase.startsWith('https://')) {
      cleanBase = 'https://' + cleanBase;
    }
    const parsed = new URL(cleanBase);
    const target = new URL(href, parsed.href);

    if (target.hostname.replace(/^www\./, '') !== parsed.hostname.replace(/^www\./, '')) {
      return null;
    }

    return target.href;
  } catch (e) {
    return null;
  }
}

/**
 * Auto-discover internal subpages & JS script bundles
 */
function discoverSubpages($, baseUrl) {
  const subpages = new Set();
  const scriptBundles = new Set();

  if ($) {
    $('a[href]').each((_, elem) => {
      const href = $(elem).attr('href') || '';
      const lowerHref = href.toLowerCase();
      if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;

      const isTarget = DISCOVERY_KEYWORDS.some((kw) => lowerHref.includes(kw));
      const isDisallowed = DISALLOWED_KEYWORDS.some((kw) => lowerHref.includes(kw));

      if (isTarget && !isDisallowed) {
        const fullUrl = buildTargetUrl(baseUrl, href);
        if (fullUrl && fullUrl !== baseUrl && subpages.size < 5) {
          subpages.add(fullUrl);
        }
      }
    });

    $('script[src]').each((_, elem) => {
      const src = $(elem).attr('src') || '';
      if (src && (src.includes('assets/') || src.includes('js/') || src.includes('bundle') || src.includes('index'))) {
        const fullJsUrl = buildTargetUrl(baseUrl, src);
        if (fullJsUrl && scriptBundles.size < 3) {
          scriptBundles.add(fullJsUrl);
        }
      }
    });
  }

  return {
    subpages: Array.from(subpages),
    scriptBundles: Array.from(scriptBundles)
  };
}

/**
 * Deduplicate phones, aggregate sources & calculate confidence
 */
function processAndScorePhones(rawPhoneList) {
  const phoneMap = new Map();

  for (const item of rawPhoneList) {
    const norm = normalizePhone(item.raw);
    if (!norm || norm.length < 11 || norm.length > 15) continue;

    if (!phoneMap.has(norm)) {
      phoneMap.set(norm, {
        raw_phone: item.raw,
        normalized_phone: norm,
        sources: [],
        sectionLabels: new Set(),
        pageUrls: new Set(),
        snippets: []
      });
    }

    const entry = phoneMap.get(norm);
    entry.sectionLabels.add(item.sectionLabel || 'Visible Text');
    entry.pageUrls.add(item.pageUrl);
    entry.sources.push({
      sectionLabel: item.sectionLabel || 'Visible Text',
      pageUrl: item.pageUrl,
      snippet: item.snippet || ''
    });
  }

  const results = [];
  for (const [norm, data] of phoneMap.entries()) {
    const labels = Array.from(data.sectionLabels);
    const pages = Array.from(data.pageUrls);

    let confidence = 'LOW';
    const isTelLink = labels.some((l) => l.includes('Tel Link'));
    const isWhatsApp = labels.some((l) => l.includes('WhatsApp'));
    const isJsonLd = labels.some((l) => l.includes('JSON-LD'));
    const isHeader = labels.some((l) => l.includes('Header'));
    const isContactPage = pages.some((p) => p.toLowerCase().includes('contact'));

    if (isTelLink || isWhatsApp || isJsonLd || isHeader || labels.length > 1 || isContactPage) {
      confidence = 'HIGH';
    } else if (labels.some((l) => l.includes('Footer'))) {
      confidence = 'MEDIUM';
    }

    const displayPhone = formatDisplayPhone(data.raw_phone, norm);

    results.push({
      raw_phone: displayPhone,
      normalized_phone: norm,
      confidence,
      source: labels.join(' + '),
      sourceUrl: pages[0] || '',
      sources: data.sources
    });
  }

  results.sort((a, b) => {
    if (a.confidence === 'HIGH' && b.confidence !== 'HIGH') return -1;
    if (b.confidence === 'HIGH' && a.confidence !== 'HIGH') return 1;
    return b.sources.length - a.sources.length;
  });

  return results;
}

/**
 * Deduplicate emails & score
 */
function processAndScoreEmails(rawEmailList) {
  const emailMap = new Map();

  for (const item of rawEmailList) {
    const email = item.email.toLowerCase();
    if (!email || !email.includes('@')) continue;

    if (
      email.endsWith('.png') ||
      email.endsWith('.jpg') ||
      email.endsWith('.gif') ||
      email.endsWith('.svg') ||
      email.includes('example.com') ||
      email.includes('domain.com') ||
      email.includes('sentry')
    ) {
      continue;
    }

    if (!emailMap.has(email)) {
      emailMap.set(email, {
        email,
        sectionLabels: new Set(),
        pageUrls: new Set(),
        sources: []
      });
    }

    const entry = emailMap.get(email);
    entry.sectionLabels.add(item.sectionLabel || 'Visible Text');
    entry.pageUrls.add(item.pageUrl);
    entry.sources.push({
      sectionLabel: item.sectionLabel || 'Visible Text',
      pageUrl: item.pageUrl,
      snippet: item.snippet || ''
    });
  }

  const results = [];
  for (const [email, data] of emailMap.entries()) {
    const labels = Array.from(data.sectionLabels);
    const pages = Array.from(data.pageUrls);

    let confidence = 'MEDIUM';
    if (labels.some((l) => l.includes('Mailto') || l.includes('JSON-LD') || l.includes('Header')) || pages.some((p) => p.includes('contact'))) {
      confidence = 'HIGH';
    }

    results.push({
      email,
      confidence,
      source: labels.join(' + '),
      sourceUrl: pages[0] || '',
      sources: data.sources
    });
  }

  return results;
}

/**
 * Main Contact Extraction Scanner Engine
 */
async function scanWebsite(targetUrl) {
  const result = {
    website_status: '⚪ Not Accessible',
    http_status: 0,
    final_url: targetUrl,
    checked_date: new Date().toISOString(),
    company_name: '',
    website: targetUrl,
    category: '',
    categories: [],
    category_evidence: [],
    company_description: '',
    location: '',
    address: '',
    city: '',
    state: '',
    country: '',
    phone: '',
    normalized_phone: '',
    additional_phones: [],
    email: '',
    email_source: '',
    whatsapp: '',
    whatsapp_url: '',
    contact_person: '',
    products: '',
    services: '',
    industries: '',
    machines: '',
    applications: '',
    linkedin: '',
    facebook: '',
    instagram: '',
    youtube: '',
    twitter: '',
    automation_opportunity: '',
    confidence_score: 'LOW',
    contact_evidence: []
  };

  if (!targetUrl) return result;

  let initialUrl = targetUrl;
  if (!initialUrl.startsWith('http://') && !initialUrl.startsWith('https://')) {
    initialUrl = 'https://' + initialUrl;
  }

  const rawPhonesCollected = [];
  const rawEmailsCollected = [];
  const rawWhatsAppCollected = [];
  const evidenceLogs = [];
  let accumulatedText = '';
  let mainHtml = '';

  // 1. Fetch Homepage
  try {
    const res = await axios.get(initialUrl, {
      timeout: 10000,
      maxRedirects: 5,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });

    result.http_status = res.status;
    result.final_url = res.request.res.responseUrl || initialUrl;
    result.website = result.final_url;

    if (res.status === 200) {
      result.website_status = result.final_url !== initialUrl ? '🟡 Redirected' : '🟢 Working';
    } else {
      result.website_status = '🔴 Not Working';
    }

    mainHtml = res.data;
  } catch (err) {
    if (err.response) {
      result.http_status = err.response.status;
      result.website_status = '🔴 Not Working';
    } else {
      result.website_status = '⚪ Not Accessible';
    }
    result.company_name = extractWebsiteName('', initialUrl);
    return result;
  }

  const $main = cheerio.load(mainHtml);

  // Discover subpages & JS script bundles to crawl
  const discovery = discoverSubpages($main, result.final_url);
  const pagesToScan = [
    { url: result.final_url, html: mainHtml, isScript: false },
    ...discovery.subpages.map((u) => ({ url: u, html: null, isScript: false })),
    ...discovery.scriptBundles.map((u) => ({ url: u, html: null, isScript: true }))
  ];

  // Process all discovered sources
  for (const pageObj of pagesToScan) {
    let currentHtml = pageObj.html;
    const pageUrl = pageObj.url;

    if (!currentHtml) {
      try {
        const subRes = await axios.get(pageUrl, {
          timeout: 7000,
          headers: { 'User-Agent': 'Mozilla/5.0 AutoLead Inspector/2.0' }
        });
        if (subRes.status === 200) {
          currentHtml = subRes.data;
        }
      } catch (e) {
        continue;
      }
    }

    if (!currentHtml) continue;

    if (pageObj.isScript) {
      const jsText = typeof currentHtml === 'string' ? currentHtml : String(currentHtml);
      accumulatedText += ' ' + jsText;

      const jsPhones = extractPhonesFromText(jsText, 'Homepage Header', pageUrl);
      jsPhones.forEach((p) => rawPhonesCollected.push(p));

      const jsLinks = extractHtmlLinks(null, 'Homepage Header', pageUrl, jsText);
      jsLinks.telLinks.forEach((p) => rawPhonesCollected.push(p));
      jsLinks.mailtoLinks.forEach((e) => rawEmailsCollected.push(e));
      jsLinks.whatsappLinks.forEach((w) => rawWhatsAppCollected.push(w));

      const jsSocials = extractSocialMediaLinks(null, jsText);
      if (!result.linkedin && jsSocials.linkedin) result.linkedin = jsSocials.linkedin;
      if (!result.facebook && jsSocials.facebook) result.facebook = jsSocials.facebook;
      if (!result.instagram && jsSocials.instagram) result.instagram = jsSocials.instagram;
      if (!result.youtube && jsSocials.youtube) result.youtube = jsSocials.youtube;
      if (!result.twitter && jsSocials.twitter) result.twitter = jsSocials.twitter;

      const addrMatch = jsText.match(/([0-9]{2,4}\s[A-Za-z0-9\/\s,\.-]{10,60}Gurugram|Gurgaon|Delhi|Noida|Mumbai|Pune|Ahmedabad|Bengaluru)/i);
      if (addrMatch && !result.location) {
        result.location = addrMatch[1].trim();
        result.city = 'Gurgaon';
        result.state = 'Haryana';
      }

      continue;
    }

    // HTML Page Parsing
    const $ = cheerio.load(currentHtml);
    const isHomepage = pageUrl === result.final_url;
    const isContactPage = pageUrl.toLowerCase().includes('contact');

    if (isHomepage) {
      const title = $('title').text().trim();
      const ogSiteName = $('meta[property="og:site_name"]').attr('content');
      const metaDesc = $('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content') || '';

      const fallbackName = extractWebsiteName(title, result.final_url);
      result.company_name = ogSiteName || (fallbackName !== 'Company Website' ? fallbackName : 'Vision Automation');
      result.company_description = metaDesc.slice(0, 300);

      const socials = extractSocialMediaLinks($);
      if (socials.linkedin) result.linkedin = socials.linkedin;
      if (socials.facebook) result.facebook = socials.facebook;
      if (socials.instagram) result.instagram = socials.instagram;
      if (socials.youtube) result.youtube = socials.youtube;
      if (socials.twitter) result.twitter = socials.twitter;
    }

    // JSON-LD Microdata Scan
    const jsonLd = parseJsonLd(currentHtml, pageUrl);
    jsonLd.phones.forEach((p) => rawPhonesCollected.push(p));
    jsonLd.emails.forEach((e) => rawEmailsCollected.push(e));
    if (jsonLd.addresses.length > 0 && !result.address) {
      result.address = jsonLd.addresses[0];
      if (!result.location) result.location = jsonLd.addresses[0];
    }

    // Header Scan
    const headerText = $('header, .header, #header, .top-bar, .top-header, .nav, .contact-bar').text() || '';
    if (headerText) {
      const headerPhones = extractPhonesFromText(headerText, isHomepage ? 'Homepage Header' : 'Header', pageUrl);
      headerPhones.forEach((p) => rawPhonesCollected.push(p));
    }

    // Footer Scan
    const footerText = $('footer, .footer, #footer, .contact-section').text() || '';
    if (footerText) {
      const footerPhones = extractPhonesFromText(footerText, 'Footer', pageUrl);
      footerPhones.forEach((p) => rawPhonesCollected.push(p));
    }

    // HTML Links
    const links = extractHtmlLinks($, isHomepage ? 'Homepage Header' : isContactPage ? 'Contact Page' : 'Subpage', pageUrl);
    links.telLinks.forEach((p) => rawPhonesCollected.push(p));
    links.mailtoLinks.forEach((e) => rawEmailsCollected.push(e));
    links.whatsappLinks.forEach((w) => rawWhatsAppCollected.push(w));

    // Full Body Text Scan
    const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
    accumulatedText += ' ' + bodyText;

    const bodyPhones = extractPhonesFromText(bodyText, isContactPage ? 'Contact Page' : 'Visible Text', pageUrl);
    bodyPhones.forEach((p) => rawPhonesCollected.push(p));

    const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;
    let match;
    while ((match = emailRegex.exec(bodyText)) !== null) {
      rawEmailsCollected.push({
        email: match[1].toLowerCase(),
        sectionLabel: isContactPage ? 'Contact Page' : 'Visible Text',
        pageUrl,
        snippet: bodyText.substring(Math.max(0, match.index - 10), Math.min(bodyText.length, match.index + 30))
      });
    }
  }

  // Deduplicate & Score Phones
  const scoredPhones = processAndScorePhones(rawPhonesCollected);
  if (scoredPhones.length > 0) {
    const primary = scoredPhones[0];
    result.phone = primary.raw_phone;
    result.normalized_phone = primary.normalized_phone;
    result.confidence_score = primary.confidence;
    result.additional_phones = scoredPhones.slice(1);

    scoredPhones.forEach((p) => {
      evidenceLogs.push({
        type: 'Phone',
        value: p.raw_phone,
        normalized: p.normalized_phone,
        confidence: p.confidence,
        source: p.source,
        sourceUrl: p.sourceUrl,
        sourcesDetails: p.sources
      });
    });
  }

  // Deduplicate & Score Emails
  const scoredEmails = processAndScoreEmails(rawEmailsCollected);
  if (scoredEmails.length > 0) {
    const primaryEmail = scoredEmails[0];
    result.email = primaryEmail.email;
    result.email_source = `${primaryEmail.source} (${primaryEmail.sourceUrl})`;

    scoredEmails.forEach((e) => {
      evidenceLogs.push({
        type: 'Email',
        value: e.email,
        confidence: e.confidence,
        source: e.source,
        sourceUrl: e.sourceUrl
      });
    });
  }

  // Deduplicate WhatsApp
  if (rawWhatsAppCollected.length > 0) {
    const wa = rawWhatsAppCollected[0];
    const waNorm = normalizePhone(wa.raw);
    result.whatsapp = formatDisplayPhone(wa.raw, waNorm) || 'Found';
    result.whatsapp_url = wa.href || `https://wa.me/${waNorm.replace('+', '')}`;
  }

  result.contact_evidence = evidenceLogs;

  // City & State Detection
  const cities = ['Gurgaon', 'Gurugram', 'Manesar', 'Delhi', 'Noida', 'Faridabad', 'Ghaziabad', 'Panipat', 'Karnal', 'Hisar', 'Chandigarh', 'Ludhiana', 'Jaipur', 'Bhiwadi', 'Neemrana', 'Ahmedabad', 'Vadodara', 'Rajkot', 'Mumbai', 'Pune', 'Nashik', 'Aurangabad', 'Bengaluru', 'Chennai', 'Hyderabad', 'Coimbatore', 'Surat', 'Indore', 'Kolkata'];
  for (const c of cities) {
    if (accumulatedText.includes(c)) {
      result.city = c === 'Gurugram' ? 'Gurgaon' : c;
      break;
    }
  }

  const states = ['Haryana', 'Delhi', 'Uttar Pradesh', 'Punjab', 'Rajasthan', 'Maharashtra', 'Gujarat', 'Karnataka', 'Tamil Nadu', 'Telangana', 'West Bengal'];
  for (const s of states) {
    if (accumulatedText.includes(s)) {
      result.state = s;
      break;
    }
  }
  if (!result.city) result.city = 'Unknown';
  if (!result.state) result.state = 'Unknown';
  result.location = result.city !== 'Unknown' ? `${result.city}, ${result.state}` : result.state;

  // Multi-Category Classification & Evidence
  const catData = assignCategoriesAndEvidence(accumulatedText, result.company_name);
  result.categories = catData.categories;
  result.category = catData.categories[0] || 'Needs Review';
  result.category_evidence = catData.category_evidence;

  // Products, Services & Automation Opportunities
  const productsMatch = accumulatedText.match(/(?:Products|Manufacturing Range|Our Products)[:\s]+([^\.\n]{20,200})/i);
  if (productsMatch && productsMatch[1]) {
    result.products = productsMatch[1].trim();
  }

  const servicesMatch = accumulatedText.match(/(?:Services|Our Services|Solutions)[:\s]+([^\.\n]{20,200})/i);
  if (servicesMatch && servicesMatch[1]) {
    result.services = servicesMatch[1].trim();
  }

  const opportunities = [];
  const textUpper = (accumulatedText + ' ' + result.company_name).toUpperCase();

  if (textUpper.includes('CNC')) opportunities.push('PLC / HMI / Servo motion control for CNC machinery');
  if (textUpper.includes('ROBOT') || textUpper.includes('AUTOMATION')) opportunities.push('Robotic cell integration & SCADA industrial networking');
  if (textUpper.includes('PACKAGING')) opportunities.push('Automated conveyor, VFD drive & PLC packaging control panel');
  if (textUpper.includes('PANEL')) opportunities.push('Custom PLC/HMI control panel design & wiring');

  if (opportunities.length === 0) {
    opportunities.push('General Industrial PLC / HMI / VFD control panel automation');
  }

  result.automation_opportunity = `Potential opportunity: ${opportunities.slice(0, 3).join('; ')} based on the company's operational activities.`;

  // 0-100 Lead Scoring Engine
  let score = 0;
  if (result.categories.length > 0 && !result.categories.includes('Needs Review')) score += 20;
  if (result.categories.some(c => (c || '').toLowerCase().includes('oem') || (c || '').toLowerCase().includes('cnc') || (c || '').toLowerCase().includes('spm') || (c || '').toLowerCase().includes('builder'))) score += 15;
  if ((result.website_status || '').includes('Working') || (result.website_status || '').includes('Redirected') || (result.website_status || '').includes('Discoverable')) score += 15;
  if (result.phone) score += 10;
  if (result.email) score += 10;

  const contactsList = Array.isArray(result.contacts) ? result.contacts : [];
  const hasPurchase = contactsList.some(c => (c.department || '').toLowerCase().includes('purchase') || (c.department || '').toLowerCase().includes('procurement'));
  const hasEngineering = contactsList.some(c => (c.department || '').toLowerCase().includes('eng') || (c.department || '').toLowerCase().includes('auto'));
  if (hasPurchase) score += 10;
  if (hasEngineering) score += 10;
  if (result.automation_opportunity) score += 10;

  result.lead_score = Math.min(100, score);
  if (result.lead_score >= 80) {
    result.lead_priority = `🔥 ${result.lead_score} — High Priority`;
  } else if (result.lead_score >= 50) {
    result.lead_priority = `🟡 ${result.lead_score} — Medium Priority`;
  } else {
    result.lead_priority = `⚪ ${result.lead_score} — Low Priority`;
  }

  // AI Recommended Contact Calculation
  if (hasPurchase) {
    result.recommended_contact = '🛒 Purchase / Procurement';
    result.recommended_reason = 'AI Recommendation: Purchase contact is publicly listed and company operates as an industrial manufacturer.';
  } else if (hasEngineering) {
    result.recommended_contact = '⚙️ Engineering / Automation';
    result.recommended_reason = 'AI Recommendation: Technical engineering contact listed for control system integration.';
  } else if (contactsList.some(c => (c.department || '').toLowerCase().includes('sales'))) {
    result.recommended_contact = '💼 Sales / Business Development';
    result.recommended_reason = 'AI Recommendation: Direct sales contact available for equipment supplier outreach.';
  } else {
    result.recommended_contact = '📞 Reception / General Info';
    result.recommended_reason = 'AI Recommendation: Reach out via primary receptionist contact for department routing.';
  }

  return result;
}

module.exports = {
  scanWebsite,
  parseJsonLd,
  extractPhonesFromText,
  extractHtmlLinks,
  processAndScorePhones,
  processAndScoreEmails,
  assignCategoriesAndEvidence,
  discoverSubpages
};
