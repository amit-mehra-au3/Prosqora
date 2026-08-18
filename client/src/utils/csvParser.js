/**
 * Intelligent CSV Parser & Flexible Column Header Mapper
 */
export function mapColumnHeader(headerStr) {
  if (!headerStr) return 'unmapped';
  const clean = headerStr.toString().toLowerCase().replace(/[^a-z0-9]/g, '');

  if (['company', 'companyname', 'business', 'businessname', 'organization', 'firm', 'title'].includes(clean)) return 'company_name';
  if (['website', 'websiteurl', 'url', 'domain', 'web', 'site', 'link'].includes(clean)) return 'website';
  if (['email', 'emailaddress', 'emailid', 'mail', 'e-mail'].includes(clean)) return 'email';
  if (['phone', 'phonenumber', 'mobile', 'mobilenumber', 'contactnumber', 'tel', 'telephone', 'cell'].includes(clean)) return 'phone';
  if (['contactname', 'contactperson', 'contact', 'name', 'fullname', 'person'].includes(clean)) return 'contact_person';
  if (['industry', 'category', 'sector', 'businesstype'].includes(clean)) return 'category';
  if (['city', 'town'].includes(clean)) return 'city';
  if (['state', 'province'].includes(clean)) return 'state';
  if (['country', 'nation'].includes(clean)) return 'country';
  if (['address', 'location', 'street'].includes(clean)) return 'address';
  if (['description', 'about', 'notes', 'summary'].includes(clean)) return 'notes';
  if (['products', 'product', 'machines', 'services'].includes(clean)) return 'products';
  if (['source', 'leadsource'].includes(clean)) return 'source';

  return 'unmapped';
}

export function parseCSVText(csvText) {
  if (!csvText || typeof csvText !== 'string') return [];

  const lines = [];
  let curLine = [];
  let curVal = '';
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        curVal += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      curLine.push(curVal.trim());
      curVal = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++; // skip \n
      }
      curLine.push(curVal.trim());
      if (curLine.some((cell) => cell.length > 0)) {
        lines.push(curLine);
      }
      curLine = [];
      curVal = '';
    } else {
      curVal += char;
    }
  }

  if (curVal || curLine.length > 0) {
    curLine.push(curVal.trim());
    if (curLine.some((cell) => cell.length > 0)) {
      lines.push(curLine);
    }
  }

  if (lines.length < 2) return [];

  const rawHeaders = lines[0];
  const mappedHeaders = rawHeaders.map(mapColumnHeader);

  const rows = [];
  for (let r = 1; r < lines.length; r++) {
    const line = lines[r];
    if (!line || line.length === 0) continue;

    const rowObj = {
      _raw: {},
      _unmapped: {}
    };

    rawHeaders.forEach((rawH, idx) => {
      const fieldKey = mappedHeaders[idx];
      const val = (line[idx] || '').trim();
      rowObj._raw[rawH] = val;

      if (fieldKey && fieldKey !== 'unmapped') {
        if (!rowObj[fieldKey]) {
          rowObj[fieldKey] = val;
        }
      } else if (rawH && val) {
        rowObj._unmapped[rawH] = val;
      }
    });

    // If company_name is missing but website exists, derive company name from domain
    if (!rowObj.company_name && rowObj.website) {
      const cleanWeb = rowObj.website.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0];
      const namePart = cleanWeb.split('.')[0];
      if (namePart) {
        rowObj.company_name = namePart.charAt(0).toUpperCase() + namePart.slice(1) + ' Corp';
      }
    }

    rows.push(rowObj);
  }

  return rows;
}
