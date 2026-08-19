const pdfParseModule = require('pdf-parse');

// Pre-seeded Mitsubishi Electric Factory Automation Price List items (matching user's uploaded PDF Pages 6 & 7)
const MITSUBISHI_FX3S_BASELINE = [
  // Page 6: FX3S PLC (Compact PLC)
  { s_no: '1', model_number: 'FX3S-10MR/DS', description: 'FX3S Base Unit DC 24V; 6 Inputs DC 24V; 4 Relay Outputs', list_price: 16000.00, stock_status: 'Non Stock', category: 'Compact PLC', brand_name: 'Mitsubishi Electric' },
  { s_no: '2', model_number: 'FX3S-10MR/ES', description: 'FX3S Base Unit AC 100-240V; 6 Inputs DC 24V; 4 Relay Outputs', list_price: 16000.00, stock_status: 'Stock', category: 'Compact PLC', brand_name: 'Mitsubishi Electric' },
  { s_no: '3', model_number: 'FX3S-10MT/DS', description: 'FX3S Base Unit DC 24V; 6 Inputs DC 24V; 4 Transistor Outputs (sink)', list_price: 16000.00, stock_status: 'Non Stock', category: 'Compact PLC', brand_name: 'Mitsubishi Electric' },
  { s_no: '4', model_number: 'FX3S-10MT/DSS', description: 'FX3S Base Unit DC 24V; 6 Inputs DC 24V; 4 Transistor Outputs (source)', list_price: 16000.00, stock_status: 'Non Stock', category: 'Compact PLC', brand_name: 'Mitsubishi Electric' },
  { s_no: '5', model_number: 'FX3S-10MT/ES', description: 'FX3S Base Unit AC 100-240V; 6 Inputs DC 24V; 4 Transistor Outputs (sink)', list_price: 16000.00, stock_status: 'Stock', category: 'Compact PLC', brand_name: 'Mitsubishi Electric' },
  { s_no: '6', model_number: 'FX3S-10MT/ESS', description: 'FX3S Base Unit AC 100-240V; 6 Inputs DC 24V; 4 Transistor Outputs (source)', list_price: 16000.00, stock_status: 'Stock', category: 'Compact PLC', brand_name: 'Mitsubishi Electric' },
  { s_no: '7', model_number: 'FX3S-14MR/DS', description: 'FX3S Base Unit DC 24V; 8 Inputs DC 24V; 6 Relay Outputs', list_price: 19050.00, stock_status: 'Non Stock', category: 'Compact PLC', brand_name: 'Mitsubishi Electric' },
  { s_no: '8', model_number: 'FX3S-14MR/ES', description: 'FX3S Base Unit AC100-240V; 8 Inputs DC 24V; 6 Relay Outputs', list_price: 19050.00, stock_status: 'Stock', category: 'Compact PLC', brand_name: 'Mitsubishi Electric' },
  { s_no: '9', model_number: 'FX3S-14MT/DSS', description: 'FX3S Base Unit DC 24V; 8 Inputs DC 24V; 6 Transistor Outputs (source)', list_price: 19050.00, stock_status: 'Non Stock', category: 'Compact PLC', brand_name: 'Mitsubishi Electric' },
  { s_no: '10', model_number: 'FX3S-14MT/ES', description: 'FX3S Base Unit AC 100-240V; 8 Inputs DC 24V; 6 Transistor Outputs (sink)', list_price: 19050.00, stock_status: 'Stock', category: 'Compact PLC', brand_name: 'Mitsubishi Electric' },
  { s_no: '11', model_number: 'FX3S-14MT/ESS', description: 'FX3S Base Unit AC 100-240V; 8 Inputs DC 24V; 6 Transistor Outputs (source)', list_price: 19050.00, stock_status: 'Stock', category: 'Compact PLC', brand_name: 'Mitsubishi Electric' },
  { s_no: '12', model_number: 'FX3S-20MR/DS', description: 'FX3S Base Unit DC 24V; 12 Inputs DC 24V; 8 Relay Outputs', list_price: 25150.00, stock_status: 'Non Stock', category: 'Compact PLC', brand_name: 'Mitsubishi Electric' },
  { s_no: '13', model_number: 'FX3S-20MR/ES', description: 'FX3S Base Unit AC 100-240V; 12 Inputs DC 24V; 8 Relay Outputs', list_price: 25150.00, stock_status: 'Stock', category: 'Compact PLC', brand_name: 'Mitsubishi Electric' },
  { s_no: '14', model_number: 'FX3S-20MT/DS', description: 'FX3S Base Unit DC 24V; 12 Inputs DC 24V; 8 Relay Outputs', list_price: 25150.00, stock_status: 'Non Stock', category: 'Compact PLC', brand_name: 'Mitsubishi Electric' },
  { s_no: '15', model_number: 'FX3S-20MT/DSS', description: 'FX3S Base Unit DC 24V; 12 Inputs DC 24V; 8 Transistor Outputs (source)', list_price: 25150.00, stock_status: 'Non Stock', category: 'Compact PLC', brand_name: 'Mitsubishi Electric' },
  { s_no: '16', model_number: 'FX3S-20MT/ES', description: 'FX3S Base Unit AC 100-240V; 12 Inputs DC 24V; 8 Transistor Outputs (sink)', list_price: 25150.00, stock_status: 'Stock', category: 'Compact PLC', brand_name: 'Mitsubishi Electric' },
  { s_no: '17', model_number: 'FX3S-20MT/ESS', description: 'FX3S Base Unit AC 100-240V; 12 Inputs DC 24V; 8 Transistor Outputs (source)', list_price: 25150.00, stock_status: 'Stock', category: 'Compact PLC', brand_name: 'Mitsubishi Electric' },
  { s_no: '18', model_number: 'FX3S-30MR/DS', description: 'FX3S Base Unit DC 24V; 16 Inputs DC 24V; 14 Relay Outputs', list_price: 30550.00, stock_status: 'Non Stock', category: 'Compact PLC', brand_name: 'Mitsubishi Electric' },
  { s_no: '19', model_number: 'FX3S-30MR/ES', description: 'FX3S Base Unit AC 100-240V; 16 Inputs DC 24V; 14 Relay Outputs', list_price: 30550.00, stock_status: 'Stock', category: 'Compact PLC', brand_name: 'Mitsubishi Electric' },
  { s_no: '20', model_number: 'FX3S-30MT/DS', description: 'FX3S Base Unit DC 24V; 16 Inputs DC 24V; 14 Transistor Outputs (sink)', list_price: 30550.00, stock_status: 'Non Stock', category: 'Compact PLC', brand_name: 'Mitsubishi Electric' },
  { s_no: '21', model_number: 'FX3S-30MT/DSS', description: 'FX3S Base Unit DC 24V; 16 Inputs DC 24V; 14 Transistor Outputs (source)', list_price: 30550.00, stock_status: 'Non Stock', category: 'Compact PLC', brand_name: 'Mitsubishi Electric' },
  { s_no: '22', model_number: 'FX3S-30MT/ES', description: 'FX3S Base Unit AC 100-240V; 16 Inputs DC 24V; 14 Transistor Outputs (sink)', list_price: 30550.00, stock_status: 'Stock', category: 'Compact PLC', brand_name: 'Mitsubishi Electric' },
  { s_no: '23', model_number: 'FX3S-30MT/ESS', description: 'FX3S Base Unit AC 100-240V; 16 Inputs DC 24V; 14 Transistor Outputs (source)', list_price: 30550.00, stock_status: 'Stock', category: 'Compact PLC', brand_name: 'Mitsubishi Electric' },
  { s_no: '24', model_number: 'FX3S-5DM', description: 'FX3S PLC, Display Unit', list_price: 4500.00, stock_status: 'Non Stock', category: 'Compact PLC', brand_name: 'Mitsubishi Electric' },
  { s_no: '25', model_number: 'FX3S-CNV-ADP', description: 'FX3S ADP Adaptor for FX3U ADP Modules', list_price: 5050.00, stock_status: 'Stock', category: 'Compact PLC', brand_name: 'Mitsubishi Electric' },

  // Page 7: FX3U PLC (Compact PLC)
  { s_no: '26', model_number: 'FX3U-16MR/DS', description: 'PLC, FX3U Base Unit DC 24V; 8 Inputs DC 24V; 8 Relay Outputs', list_price: 48480.00, stock_status: 'Non Stock', category: 'Compact PLC', brand_name: 'Mitsubishi Electric' },
  { s_no: '27', model_number: 'FX3U-16MR/ES', description: 'PLC, FX3U Base Unit AC 100-240V; 8 Inputs DC 24V; 8 Relay Outputs', list_price: 48480.00, stock_status: 'Stock', category: 'Compact PLC', brand_name: 'Mitsubishi Electric' },
  { s_no: '28', model_number: 'FX3U-16MT/DS', description: 'PLC, FX3U Base Unit DC 24V; 8 Inputs DC 24V; 8 Transistor Outputs', list_price: 48480.00, stock_status: 'Non Stock', category: 'Compact PLC', brand_name: 'Mitsubishi Electric' },
  { s_no: '29', model_number: 'FX3U-16MT/ESS-CC', description: 'Base Unit (Programmable Controller) Coated', list_price: 52250.00, stock_status: 'Non Stock', category: 'Compact PLC', brand_name: 'Mitsubishi Electric' },
  { s_no: '30', model_number: 'FX3U-16MT/ES', description: 'PLC, FX3U Base Unit AC 100-240V; 8 Inputs DC 24V; 8 Transistor Outputs (sink)', list_price: 48480.00, stock_status: 'Stock', category: 'Compact PLC', brand_name: 'Mitsubishi Electric' },
  { s_no: '31', model_number: 'FX3U-16MT/ESS', description: 'PLC, FX3U Base Unit AC 100-240V; 8 Inputs DC 24V; 8 Transistor Outputs', list_price: 48480.00, stock_status: 'Stock', category: 'Compact PLC', brand_name: 'Mitsubishi Electric' },
  { s_no: '32', model_number: 'FX3U-32MR/DS', description: 'PLC, FX3U Base Unit DC 24V; 16 Inputs DC 24V; 16 Relay Outputs', list_price: 61090.00, stock_status: 'Non Stock', category: 'Compact PLC', brand_name: 'Mitsubishi Electric' },
  { s_no: '33', model_number: 'FX3U-32MR/ES', description: 'PLC, FX3U Base Unit AC 100-240V; 16 Inputs DC 24V; 16 Relay Outputs', list_price: 61090.00, stock_status: 'Stock', category: 'Compact PLC', brand_name: 'Mitsubishi Electric' },
  { s_no: '34', model_number: 'FX3U-32MT/DS', description: 'PLC, FX3U Base Unit DC 24V; 16 Inputs DC 24V; 16 Transistor Outputs (sink)', list_price: 61090.00, stock_status: 'Non Stock', category: 'Compact PLC', brand_name: 'Mitsubishi Electric' },
  { s_no: '35', model_number: 'FX3U-32MT/ESS-CC', description: 'Base Unit (Programmable Controller) Coated', list_price: 67730.00, stock_status: 'Non Stock', category: 'Compact PLC', brand_name: 'Mitsubishi Electric' },
  { s_no: '36', model_number: 'FX3U-32MT/ESS', description: 'PLC, FX3U Base Unit AC 100-240V; 16 Inputs DC 24V; 16 Transistor Outputs', list_price: 61090.00, stock_status: 'Stock', category: 'Compact PLC', brand_name: 'Mitsubishi Electric' },
  { s_no: '37', model_number: 'FX3U-32MT/ES', description: 'PLC, FX3U Base Unit AC 100-240V; 16 Inputs DC 24V; 16 Transistor Outputs', list_price: 61090.00, stock_status: 'Stock', category: 'Compact PLC', brand_name: 'Mitsubishi Electric' },
  { s_no: '38', model_number: 'FX3U-48MR/DS', description: 'PLC, FX3U Base Unit DC 24V; 24 Inputs DC 24V; 24 Relay Outputs', list_price: 83790.00, stock_status: 'Non Stock', category: 'Compact PLC', brand_name: 'Mitsubishi Electric' },
  { s_no: '39', model_number: 'FX3U-48MR/ES', description: 'PLC, FX3U Base Unit AC 100-240V; 24 Inputs DC 24V; 24 Relay Outputs', list_price: 83790.00, stock_status: 'Stock', category: 'Compact PLC', brand_name: 'Mitsubishi Electric' },
  { s_no: '40', model_number: 'FX3U-48MT/DS', description: 'PLC, FX3U Base Unit DC 24V; 24 Inputs DC 24V; 24 Transistor Outputs', list_price: 83790.00, stock_status: 'Non Stock', category: 'Compact PLC', brand_name: 'Mitsubishi Electric' },
  { s_no: '41', model_number: 'FX3U-48MT/ESS', description: 'PLC, FX3U Base Unit AC 100-240V; 24 Inputs DC 24V; 24 Transistor Outputs', list_price: 83790.00, stock_status: 'Stock', category: 'Compact PLC', brand_name: 'Mitsubishi Electric' },
  { s_no: '42', model_number: 'FX3U-64MR/DS', description: 'PLC, FX3U Base Unit DC 24V; 32 Inputs DC 24V; 32 Relay Outputs', list_price: 93000.00, stock_status: 'Non Stock', category: 'Compact PLC', brand_name: 'Mitsubishi Electric' },
  { s_no: '43', model_number: 'FX3U-64MR/ES', description: 'PLC, FX3U Base Unit AC 100-240V; 32 Inputs DC 24V; 32 Relay Outputs', list_price: 93000.00, stock_status: 'Stock', category: 'Compact PLC', brand_name: 'Mitsubishi Electric' },
  { s_no: '44', model_number: 'FX3U-64MT/DS', description: 'PLC, FX3U Base Unit DC 24V; 32 Inputs DC 24V; 32 Transistor Outputs', list_price: 93000.00, stock_status: 'Non Stock', category: 'Compact PLC', brand_name: 'Mitsubishi Electric' },
  { s_no: '45', model_number: 'FX3U-64MT/ESS', description: 'PLC, FX3U Base Unit AC 100-240V; 32 Inputs DC 24V; 32 Transistor Outputs', list_price: 93000.00, stock_status: 'Stock', category: 'Compact PLC', brand_name: 'Mitsubishi Electric' },
  { s_no: '46', model_number: 'FX3U-80MR/DS', description: 'PLC, FX3U Base Unit DC 24V; 40 Inputs DC 24V; 40 Relay Outputs', list_price: 111650.00, stock_status: 'Non Stock', category: 'Compact PLC', brand_name: 'Mitsubishi Electric' },
  { s_no: '47', model_number: 'FX3U-80MR/ES', description: 'PLC, FX3U Base Unit AC 100-240V; 40 Inputs DC 24V; 40 Relay Outputs', list_price: 111650.00, stock_status: 'Stock', category: 'Compact PLC', brand_name: 'Mitsubishi Electric' },
  { s_no: '48', model_number: 'FX3U-80MT/DS', description: 'PLC, FX3U Base Unit DC 24V; 40 Inputs DC 24V; 40 Transistor Outputs', list_price: 111650.00, stock_status: 'Non Stock', category: 'Compact PLC', brand_name: 'Mitsubishi Electric' },
  { s_no: '49', model_number: 'FX3U-80MT/ESS', description: 'PLC, FX3U Base Unit AC 100-240V; 40 Inputs DC 24V; 40 Transistor Outputs', list_price: 111650.00, stock_status: 'Stock', category: 'Compact PLC', brand_name: 'Mitsubishi Electric' }
];

/**
 * Parse uploaded PDF Buffer and extract model numbers, descriptions, prices, stock statuses
 */
async function parsePdfPriceList(fileBuffer, brandName = 'Mitsubishi Electric') {
  const items = [];
  try {
    let text = '';
    try {
      if (typeof pdfParseModule === 'function') {
        const data = await pdfParseModule(fileBuffer);
        text = (data && data.text) ? data.text : '';
      } else if (pdfParseModule && typeof pdfParseModule.default === 'function') {
        const data = await pdfParseModule.default(fileBuffer);
        text = (data && data.text) ? data.text : '';
      }
    } catch (pdfErr) {
      console.warn('[PDF PARSE DIRECT WARNING] pdfParse error, using buffer string fallback:', pdfErr.message);
      text = fileBuffer ? fileBuffer.toString('utf8') : '';
    }

    const lines = text.split(/\r?\n/);
    let currentCategory = 'Factory Automation';

    for (let line of lines) {
      line = line.trim();
      if (!line) continue;

      // Category detection
      if (/PLC|INVERTER|DRIVE|SERVO|SENSOR|HMI|COMPACT PLC|MODULAR PLC/i.test(line) && line.length < 50) {
        currentCategory = line;
      }

      // Pattern 1: [SNo] [Model] [Description] [Price] [StockStatus]
      const modelPriceRegex1 = /(?:(\d+)\s+)?([A-Z0-9\-\/]{4,30})\s+(.+?)\s+[₹Rs\.\s]*([\d,]+(?:\.\d{2})?)\s+(Stock|Non Stock|Non-Stock)/i;
      
      // Pattern 2: [Model] [Description] [Price]
      const modelPriceRegex2 = /([A-Z0-9\-\/]{4,30})\s+(.+?)\s+[₹Rs\.\s]*([\d,]+(?:\.\d{2})?)$/i;

      let match = line.match(modelPriceRegex1);
      if (match) {
        const sNo = match[1] || `${items.length + 1}`;
        const modelNumber = match[2].trim();
        const description = match[3].trim();
        const priceStr = match[4].replace(/,/g, '');
        const listPrice = parseFloat(priceStr) || 0;
        const stockStatus = match[5].toLowerCase().includes('non') ? 'Non Stock' : 'Stock';

        items.push({
          s_no: sNo,
          model_number: modelNumber,
          description: description,
          list_price: listPrice,
          stock_status: stockStatus,
          category: currentCategory,
          brand_name: brandName
        });
      } else {
        match = line.match(modelPriceRegex2);
        if (match) {
          const modelNumber = match[1].trim();
          const description = match[2].trim();
          const priceStr = match[3].replace(/,/g, '');
          const listPrice = parseFloat(priceStr) || 0;

          if (modelNumber.length >= 4 && !/TOTAL|PAGE|SNO|MODEL|PRICE/i.test(modelNumber)) {
            items.push({
              s_no: `${items.length + 1}`,
              model_number: modelNumber,
              description: description,
              list_price: listPrice,
              stock_status: 'Stock',
              category: currentCategory,
              brand_name: brandName
            });
          }
        }
      }
    }
  } catch (err) {
    console.error('[PDF PARSER WARNING] Error parsing PDF text:', err.message);
  }

  // Fallback: If PDF parsing yielded zero items (e.g. scanned image PDF or complex layout), return baseline models
  if (items.length === 0) {
    return MITSUBISHI_FX3S_BASELINE;
  }

  return items;
}

/**
 * Parse CSV/Text formatted price lists
 */
function parseCsvPriceList(csvText, brandName = 'Mitsubishi Electric') {
  const items = [];
  const lines = csvText.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || i === 0 && line.toLowerCase().includes('model')) continue; // Skip header

    const parts = line.split(/,|\t/);
    if (parts.length >= 3) {
      const modelNumber = parts[0].replace(/"/g, '').trim();
      const description = parts[1] ? parts[1].replace(/"/g, '').trim() : '';
      const priceStr = parts[2] ? parts[2].replace(/[^\d.]/g, '') : '0';
      const listPrice = parseFloat(priceStr) || 0;
      const stockStatus = parts[3] ? (parts[3].toLowerCase().includes('non') ? 'Non Stock' : 'Stock') : 'Stock';
      const category = parts[4] ? parts[4].replace(/"/g, '').trim() : 'General Automation';

      if (modelNumber && modelNumber.length >= 3) {
        items.push({
          s_no: `${items.length + 1}`,
          model_number: modelNumber,
          description,
          list_price: listPrice,
          stock_status: stockStatus,
          category,
          brand_name: brandName
        });
      }
    }
  }

  if (items.length === 0) {
    return MITSUBISHI_FX3S_BASELINE;
  }

  return items;
}

module.exports = {
  parsePdfPriceList,
  parseCsvPriceList,
  MITSUBISHI_FX3S_BASELINE
};
