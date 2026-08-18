/**
 * Canonical Reusable Website Normalization Function
 * Trims whitespace, converts to lowercase, strips protocols, www., paths, query params, hash fragments, and trailing slashes.
 * Validates domain structure and letter top-level domain (TLD).
 */
export function normalizeWebsite(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  let clean = rawUrl.trim().toLowerCase();
  if (!clean) return '';

  // Strip leading and trailing quotes if any
  clean = clean.replace(/^['"]+|['"]+$/g, '');

  // Temporarily add http:// if no protocol exists to parse correctly with URL constructor
  if (!/^[a-z0-9+-.]+:\/\//i.test(clean)) {
    clean = 'http://' + clean;
  }

  try {
    const parsed = new URL(clean);
    let host = parsed.hostname || parsed.host || '';
    host = host.replace(/^www\./i, '').trim();

    // Reject pure IPs or hostnames without valid letter TLDs
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
}
