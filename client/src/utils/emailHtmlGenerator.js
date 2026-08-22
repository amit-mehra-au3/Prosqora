/**
 * ProSQORA CRM — Email HTML Generator & Parser Utility
 * Converts Visual Builder Block Objects into Email-Safe, Table-Based Production HTML
 * Compatible with Gmail, Outlook, Apple Mail, Yahoo Mail & Mobile Clients
 */

// AM Automation Trading Brand Constants
export const AM_BRAND = {
  name: 'AM Automation Trading',
  tagline: 'Industrial Automation & Electrical Components',
  badge: 'B2B SUPPLIER',
  primaryColor: '#f97316', // Orange
  secondaryColor: '#0f172a', // Navy Dark
  accentColor: '#1e293b',
  bgColor: '#f8fafc',
  textColor: '#1e293b',
  lightBg: '#f1f5f9'
};

// Variable Definitions with Tooltips
export const PERSONALIZATION_VARIABLES = [
  { tag: '{{contact_name}}', label: 'Contact Name', description: "Recipient's full name (e.g. Rahul Sharma)" },
  { tag: '{{company_name}}', label: 'Company Name', description: "Recipient's company name (e.g. ABC Robotics Ltd)" },
  { tag: '{{business_name}}', label: 'Business Name', description: "Sender's business name (e.g. AM Automation Trading)" },
  { tag: '{{sender_name}}', label: 'Sender Name', description: "Sender's full name (e.g. Amit Mehra)" },
  { tag: '{{phone}}', label: 'Phone Number', description: "Sender's official phone number (e.g. +91 86072 85969)" },
  { tag: '{{email}}', label: 'Email Address', description: "Sender's official email (e.g. amautomationtrading@gmail.com)" }
];

/**
 * Return default block list for AM Automation Trading B2B Email Template
 */
export function getDefaultAmAutomationBlocks() {
  return [
    {
      id: 'blk_header_1',
      type: 'logo',
      content: {
        title: 'AM AUTOMATION TRADING',
        subtitle: 'Industrial Automation & Electrical Components',
        badge: 'B2B SUPPLIER',
        logoUrl: '',
        linkUrl: 'mailto:amautomationtrading@gmail.com'
      },
      styles: {
        bgColor: '#0f172a',
        textColor: '#ffffff',
        accentColor: '#f97316',
        padding: '24px 20px',
        align: 'center'
      }
    },
    {
      id: 'blk_greeting_1',
      type: 'heading',
      content: {
        text: 'Dear {{contact_name}},',
        level: 'h2'
      },
      styles: {
        color: '#0f172a',
        fontSize: '18px',
        fontWeight: 'bold',
        align: 'left',
        margin: '20px 0 10px 0'
      }
    },
    {
      id: 'blk_intro_1',
      type: 'text',
      content: {
        text: 'Greetings from <strong>AM Automation Trading</strong>.<br/><br/>We supply industrial automation and electrical components to manufacturing companies, machine builders, system integrators and automation professionals across India.'
      },
      styles: {
        color: '#334155',
        fontSize: '14px',
        lineHeight: '1.6',
        align: 'left',
        margin: '0 0 16px 0'
      }
    },
    {
      id: 'blk_product_grid_1',
      type: 'product_grid',
      content: {
        title: 'OUR INDUSTRIAL PRODUCT RANGE',
        categories: [
          { name: 'PLCs & Expansion Modules', desc: 'Siemens, Mitsubishi, Delta, Schneider' },
          { name: 'HMIs & Touch Panels', desc: '7", 10" Color Touchscreens' },
          { name: 'AC Drives / VFDs', desc: '0.75kW to 315kW Inverters' },
          { name: 'Servo Drives & Motors', desc: 'High-precision Servo Systems' },
          { name: 'Sensors & Switches', desc: 'Inductive, Photoelectric, Rotary' },
          { name: 'Switchgear & Contactors', desc: 'Relays, Breakers, Power Supplies' }
        ]
      },
      styles: {
        bgColor: '#f8fafc',
        borderColor: '#e2e8f0',
        titleColor: '#f97316',
        itemBg: '#ffffff',
        itemTextColor: '#0f172a',
        padding: '20px 16px',
        margin: '16px 0'
      }
    },
    {
      id: 'blk_value_prop_1',
      type: 'value_prop',
      content: {
        title: 'WHY CHOOSE AM AUTOMATION TRADING?',
        items: [
          'Competitive Wholesale B2B Pricing',
          '100% Genuine & Authentic Branded Products',
          'Quick Quotations & Fast Response Time',
          'Reliable Stock & Supply Support',
          'Immediate Support for Urgent Breakdown Requirements'
        ]
      },
      styles: {
        bgColor: '#fff7ed',
        borderColor: '#fdba74',
        titleColor: '#c2410c',
        textColor: '#431407',
        margin: '16px 0'
      }
    },
    {
      id: 'blk_cta_1',
      type: 'button',
      content: {
        label: 'SEND YOUR REQUIREMENT',
        url: 'mailto:amautomationtrading@gmail.com?subject=Enquiry%20for%20Industrial%20Automation%20Components'
      },
      styles: {
        bgColor: '#f97316',
        textColor: '#ffffff',
        fontSize: '15px',
        fontWeight: 'bold',
        borderRadius: '8px',
        padding: '14px 28px',
        align: 'center',
        margin: '24px 0'
      }
    },
    {
      id: 'blk_req_box_1',
      type: 'requirement_box',
      content: {
        title: 'HOW TO GET A QUOTATION',
        instruction: 'Simply reply to this email with your required <strong>Brand</strong>, <strong>Part Number</strong>, and <strong>Quantity</strong> to receive pricing and availability.'
      },
      styles: {
        bgColor: '#f1f5f9',
        borderColor: '#cbd5e1',
        titleColor: '#0f172a',
        textColor: '#334155',
        margin: '16px 0'
      }
    },
    {
      id: 'blk_contact_info_1',
      type: 'contact_info',
      content: {
        company: 'AM Automation Trading',
        phone: '{{phone}}',
        email: '{{email}}',
        website: 'www.amautomationtrading.com',
        address: 'Industrial Automation & Electrical Component Suppliers'
      },
      styles: {
        bgColor: '#0f172a',
        textColor: '#e2e8f0',
        accentColor: '#f97316',
        padding: '20px',
        margin: '20px 0 0 0'
      }
    },
    {
      id: 'blk_signature_1',
      type: 'signature',
      content: {
        signOff: 'Best Regards,',
        senderName: '{{sender_name}}',
        businessName: '{{business_name}}',
        cardImageUrl: ''
      },
      styles: {
        textColor: '#1e293b',
        margin: '20px 0 10px 0'
      }
    },
    {
      id: 'blk_footer_1',
      type: 'footer',
      content: {
        text: '© AM Automation Trading. Confidential B2B Procurement Communication. You are receiving this email as an industrial partner or procurement professional.'
      },
      styles: {
        color: '#94a3b8',
        fontSize: '11px',
        align: 'center',
        padding: '16px 0 0 0'
      }
    }
  ];
}

/**
 * Generate Email-Safe HTML from Block Array
 */
export function generateEmailHtml(blocks = [], options = {}) {
  const containerBg = options.containerBg || '#ffffff';
  const outerBg = options.outerBg || '#f8fafc';
  const businessCardImage = options.businessCardImage || '';

  const blockHtmlList = blocks.map(block => renderBlockToHtml(block, businessCardImage)).join('\n');

  return `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>AM Automation Trading - B2B Outreach</title>
  <style type="text/css">
    /* Email Client Resets */
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; max-width: 100%; height: auto; }
    body { margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: ${outerBg}; font-family: 'Segoe UI', Arial, sans-serif; }
    @media screen and (max-width: 620px) {
      .email-container { width: 100% !important; padding: 12px !important; }
      .col-stack { display: block !important; width: 100% !important; box-sizing: border-box !important; }
      .product-grid-item { width: 100% !important; display: block !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: ${outerBg};">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${outerBg};">
    <tr>
      <td align="center" style="padding: 20px 10px;">
        <!--[if mso]>
        <table role="presentation" align="center" border="0" cellspacing="0" cellpadding="0" width="640">
        <tr>
        <td align="center" valign="top" width="640">
        <![endif]-->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" class="email-container" style="max-width: 640px; background-color: ${containerBg}; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
          <tr>
            <td style="padding: 0;">
              ${blockHtmlList}
            </td>
          </tr>
        </table>
        <!--[if mso]>
        </td>
        </tr>
        </table>
        <![endif]-->
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Render individual block to Email-Safe HTML snippet
 */
function renderBlockToHtml(block, businessCardImage = '') {
  const c = block.content || {};
  const s = block.styles || {};

  switch (block.type) {
    case 'logo':
      return `
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${s.bgColor || '#0f172a'}; padding: ${s.padding || '24px 20px'}; text-align: ${s.align || 'center'}; border-bottom: 3px solid ${s.accentColor || '#f97316'};">
          <tr>
            <td align="${s.align || 'center'}">
              ${c.logoUrl ? `<a href="${c.linkUrl || '#'}" target="_blank"><img src="${c.logoUrl}" alt="${c.title || 'Logo'}" style="max-height: 50px; margin-bottom: 8px; border: 0;" /></a><br/>` : ''}
              <div style="font-size: 20px; font-weight: 900; color: ${s.textColor || '#ffffff'}; letter-spacing: 1px; font-family: 'Segoe UI', Arial, sans-serif;">
                ${c.title || 'AM AUTOMATION TRADING'}
              </div>
              <div style="font-size: 11px; color: ${s.accentColor || '#f97316'}; font-weight: 700; text-transform: uppercase; margin-top: 4px; letter-spacing: 0.5px;">
                ${c.subtitle || 'Industrial Automation & Electrical Components'} &nbsp;•&nbsp; <span style="background: ${s.accentColor || '#f97316'}; color: #ffffff; padding: 2px 6px; border-radius: 4px; font-size: 9px;">${c.badge || 'B2B SUPPLIER'}</span>
              </div>
            </td>
          </tr>
        </table>`;

    case 'heading':
      return `
        <div style="padding: 12px 24px; text-align: ${s.align || 'left'}; margin: ${s.margin || '0'};">
          <div style="font-size: ${s.fontSize || '20px'}; font-weight: ${s.fontWeight || 'bold'}; color: ${s.color || '#0f172a'}; font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.3;">
            ${c.text || ''}
          </div>
        </div>`;

    case 'text':
    case 'paragraph':
    case 'rich_text':
      return `
        <div style="padding: 12px 24px; text-align: ${s.align || 'left'}; margin: ${s.margin || '0'}; font-size: ${s.fontSize || '14px'}; color: ${s.color || '#334155'}; line-height: ${s.lineHeight || '1.6'}; font-family: 'Segoe UI', Arial, sans-serif;">
          ${c.text || ''}
        </div>`;

    case 'image':
      return `
        <div style="padding: 12px 24px; text-align: ${s.align || 'center'}; margin: ${s.margin || '0'};">
          ${c.linkUrl ? `<a href="${c.linkUrl}" target="_blank">` : ''}
          <img src="${c.url || 'https://via.placeholder.com/600x200?text=Industrial+Automation'}" alt="${c.alt || 'Image'}" style="width: ${c.width || '100%'}; max-width: 100%; border-radius: ${s.borderRadius || '8px'}; border: 0;" />
          ${c.linkUrl ? `</a>` : ''}
        </div>`;

    case 'button':
      return `
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: ${s.margin || '20px 0'}; text-align: ${s.align || 'center'};">
          <tr>
            <td align="${s.align || 'center'}" style="padding: 0 24px;">
              <!--[if mso]>
              <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${c.url || '#'}" style="height:44px;v-text-anchor:middle;width:240px;" arcsize="18%" stroke="f" fillcolor="${s.bgColor || '#f97316'}">
                <w:anchorlock/>
                <center style="color:${s.textColor || '#ffffff'};font-family:sans-serif;font-size:${s.fontSize || '15px'};font-weight:bold;">${c.label || 'CLICK HERE'}</center>
              </v:roundrect>
              <![endif]-->
              <a href="${c.url || '#'}" target="_blank" style="background-color: ${s.bgColor || '#f97316'}; color: ${s.textColor || '#ffffff'}; font-size: ${s.fontSize || '15px'}; font-weight: ${s.fontWeight || 'bold'}; padding: ${s.padding || '14px 28px'}; text-decoration: none; border-radius: ${s.borderRadius || '8px'}; display: inline-block; font-family: 'Segoe UI', Arial, sans-serif; box-shadow: 0 3px 8px rgba(249,115,22,0.3); border: 0;">
                ${c.label || 'CLICK HERE'}
              </a>
            </td>
          </tr>
        </table>`;

    case 'product_grid':
      const categories = Array.isArray(c.categories) ? c.categories : [];
      const itemsHtml = categories.map(cat => `
        <td class="product-grid-item" width="50%" valign="top" style="padding: 6px;">
          <div style="background: ${s.itemBg || '#ffffff'}; border: 1px solid #e2e8f0; border-left: 3px solid ${s.titleColor || '#f97316'}; border-radius: 6px; padding: 10px 12px;">
            <div style="font-size: 13px; font-weight: bold; color: ${s.itemTextColor || '#0f172a'}; font-family: 'Segoe UI', Arial, sans-serif;">${cat.name}</div>
            <div style="font-size: 11px; color: #64748b; margin-top: 2px;">${cat.desc}</div>
          </div>
        </td>
      `).reduce((acc, curr, idx) => {
        if (idx % 2 === 0) acc.push(`<tr>${curr}`);
        else acc[acc.length - 1] += `${curr}</tr>`;
        return acc;
      }, []).join('\n');

      return `
        <div style="padding: 0 24px; margin: ${s.margin || '16px 0'};">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${s.bgColor || '#f8fafc'}; border: 1px solid ${s.borderColor || '#e2e8f0'}; border-radius: 10px; padding: ${s.padding || '16px'};">
            <tr>
              <td style="padding-bottom: 10px; border-bottom: 2px solid ${s.titleColor || '#f97316'}; margin-bottom: 10px;">
                <div style="font-size: 14px; font-weight: 900; color: ${s.titleColor || '#f97316'}; text-transform: uppercase; letter-spacing: 0.5px;">${c.title || 'PRODUCT RANGE'}</div>
              </td>
            </tr>
            <tr>
              <td style="padding-top: 10px;">
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                  ${itemsHtml}
                </table>
              </td>
            </tr>
          </table>
        </div>`;

    case 'value_prop':
      const vpItems = Array.isArray(c.items) ? c.items : [];
      return `
        <div style="padding: 0 24px; margin: ${s.margin || '16px 0'};">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${s.bgColor || '#fff7ed'}; border: 1px solid ${s.borderColor || '#fdba74'}; border-radius: 10px; padding: 16px;">
            <tr>
              <td>
                <div style="font-size: 13px; font-weight: 900; color: ${s.titleColor || '#c2410c'}; text-transform: uppercase; margin-bottom: 8px;">${c.title || 'WHY CHOOSE US'}</div>
                <ul style="margin: 0; padding-left: 20px; color: ${s.textColor || '#431407'}; font-size: 13px; line-height: 1.7; font-family: 'Segoe UI', Arial, sans-serif;">
                  ${vpItems.map(item => `<li><strong>${item}</strong></li>`).join('')}
                </ul>
              </td>
            </tr>
          </table>
        </div>`;

    case 'requirement_box':
      return `
        <div style="padding: 0 24px; margin: ${s.margin || '16px 0'};">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${s.bgColor || '#f1f5f9'}; border: 1px dashed ${s.borderColor || '#cbd5e1'}; border-radius: 8px; padding: 14px 18px;">
            <tr>
              <td>
                <div style="font-size: 12px; font-weight: 900; color: ${s.titleColor || '#0f172a'}; text-transform: uppercase; margin-bottom: 4px;">${c.title || 'HOW TO REQUEST A QUOTE'}</div>
                <div style="font-size: 13px; color: ${s.textColor || '#334155'}; line-height: 1.5;">${c.instruction || ''}</div>
              </td>
            </tr>
          </table>
        </div>`;

    case 'contact_info':
      return `
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${s.bgColor || '#0f172a'}; color: ${s.textColor || '#ffffff'}; padding: ${s.padding || '20px'}; border-top: 3px solid ${s.accentColor || '#f97316'}; margin: ${s.margin || '20px 0 0 0'};">
          <tr>
            <td style="font-family: 'Segoe UI', Arial, sans-serif; font-size: 13px; line-height: 1.6;">
              <div style="font-size: 15px; font-weight: 900; color: #ffffff; margin-bottom: 6px;">${c.company || 'AM Automation Trading'}</div>
              <div>📞 <strong>Phone:</strong> ${c.phone || '{{phone}}'}</div>
              <div>✉️ <strong>Email:</strong> ${c.email || '{{email}}'}</div>
              ${c.website ? `<div>🌐 <strong>Website:</strong> <a href="https://${c.website.replace('https://', '')}" target="_blank" style="color: ${s.accentColor || '#f97316'}; text-decoration: none;">${c.website}</a></div>` : ''}
              ${c.address ? `<div style="font-size: 11px; color: #94a3b8; margin-top: 6px;">${c.address}</div>` : ''}
            </td>
          </tr>
        </table>`;

    case 'signature':
      const activeCardImage = c.cardImageUrl || businessCardImage;
      return `
        <div style="padding: 12px 24px; margin: ${s.margin || '16px 0'}; font-family: 'Segoe UI', Arial, sans-serif;">
          <div style="font-size: 13px; color: #64748b; margin-bottom: 4px;">${c.signOff || 'Best Regards,'}</div>
          <div style="font-size: 15px; font-weight: bold; color: ${s.textColor || '#0f172a'};">${c.senderName || '{{sender_name}}'}</div>
          <div style="font-size: 13px; font-weight: 600; color: #f97316;">${c.businessName || '{{business_name}}'}</div>
          ${activeCardImage ? `
            <div style="margin-top: 14px; padding-top: 10px;">
              <img src="${activeCardImage}" alt="Business Card Signature" style="max-width: 440px; width: 100%; border-radius: 8px; border: 1px solid #cbd5e1; box-shadow: 0 2px 8px rgba(0,0,0,0.06);" />
            </div>
          ` : ''}
        </div>`;

    case 'columns_2':
      return `
        <div style="padding: 12px 24px;">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td class="col-stack" width="50%" valign="top" style="padding-right: 8px;">
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px;">
                  <div style="font-weight: bold; color: #0f172a; font-size: 13px; margin-bottom: 4px;">${c.leftTitle || 'Column 1'}</div>
                  <div style="font-size: 12px; color: #475569; line-height: 1.5;">${c.leftText || 'Left column details...'}</div>
                </div>
              </td>
              <td class="col-stack" width="50%" valign="top" style="padding-left: 8px;">
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px;">
                  <div style="font-weight: bold; color: #0f172a; font-size: 13px; margin-bottom: 4px;">${c.rightTitle || 'Column 2'}</div>
                  <div style="font-size: 12px; color: #475569; line-height: 1.5;">${c.rightText || 'Right column details...'}</div>
                </div>
              </td>
            </tr>
          </table>
        </div>`;

    case 'divider':
      return `
        <div style="padding: 8px 24px; text-align: center;">
          <hr style="border: 0; border-top: ${s.height || '1px'} ${s.style || 'solid'} ${s.color || '#e2e8f0'}; margin: 10px 0;" />
        </div>`;

    case 'spacer':
      return `
        <div style="height: ${s.height || '20px'}; font-size: 0; line-height: 0;">&nbsp;</div>`;

    case 'social_links':
      return `
        <div style="padding: 12px 24px; text-align: center;">
          <a href="${c.website || 'https://www.amautomationtrading.com'}" target="_blank" style="display: inline-block; margin: 0 8px; color: #f97316; font-size: 12px; font-weight: bold; text-decoration: none;">🌐 Website</a>
          <a href="mailto:${c.email || 'amautomationtrading@gmail.com'}" style="display: inline-block; margin: 0 8px; color: #f97316; font-size: 12px; font-weight: bold; text-decoration: none;">✉️ Email Quote</a>
          <a href="tel:${c.phone || '+918607285969'}" style="display: inline-block; margin: 0 8px; color: #f97316; font-size: 12px; font-weight: bold; text-decoration: none;">📞 Call Now</a>
        </div>`;

    case 'footer':
      return `
        <div style="padding: 16px 24px; background-color: #f1f5f9; border-top: 1px solid #e2e8f0; text-align: ${s.align || 'center'};">
          <div style="font-size: ${s.fontSize || '11px'}; color: ${s.color || '#94a3b8'}; font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.5;">
            ${c.text || ''}
          </div>
        </div>`;

    case 'custom_html':
      return `
        <div style="padding: 8px 24px;">
          ${c.html || ''}
        </div>`;

    default:
      return `<div style="padding: 12px 24px; font-size: 13px; color: #475569;">${c.text || ''}</div>`;
  }
}

/**
 * Convert HTML or Plain Text into Visual Blocks (Backward Compatibility Parser)
 */
export function parseHtmlToBlocks(htmlOrText = '') {
  if (!htmlOrText || !htmlOrText.trim()) {
    return getDefaultAmAutomationBlocks();
  }

  const str = htmlOrText.trim();
  const isHtml = str.toLowerCase().includes('<!doctype') ||
                 str.toLowerCase().includes('<html') ||
                 str.toLowerCase().includes('<table') ||
                 str.toLowerCase().includes('<div') ||
                 str.includes('</td>') ||
                 str.includes('</div>');

  if (!isHtml) {
    // Plain text legacy template: convert into clean default blocks
    const lines = str.split('\n');
    const greeting = lines[0] && lines[0].includes('Dear') ? lines[0] : 'Dear {{contact_name}},';
    const bodyText = str.replace(greeting, '').trim();

    return [
      {
        id: 'blk_legacy_hdr',
        type: 'logo',
        content: {
          title: 'AM AUTOMATION TRADING',
          subtitle: 'Industrial Automation & Electrical Components',
          badge: 'B2B SUPPLIER',
          logoUrl: ''
        },
        styles: { bgColor: '#0f172a', textColor: '#ffffff', accentColor: '#f97316', padding: '24px 20px', align: 'center' }
      },
      {
        id: 'blk_legacy_grt',
        type: 'heading',
        content: { text: greeting, level: 'h2' },
        styles: { color: '#0f172a', fontSize: '18px', fontWeight: 'bold', align: 'left', margin: '20px 0 10px 0' }
      },
      {
        id: 'blk_legacy_txt',
        type: 'text',
        content: { text: bodyText.replace(/\n\n/g, '<br/><br/>').replace(/\n/g, '<br/>') },
        styles: { color: '#334155', fontSize: '14px', lineHeight: '1.6', align: 'left', margin: '0 0 16px 0' }
      },
      {
        id: 'blk_legacy_cta',
        type: 'button',
        content: { label: 'SEND YOUR REQUIREMENT', url: 'mailto:amautomationtrading@gmail.com' },
        styles: { bgColor: '#f97316', textColor: '#ffffff', fontSize: '15px', fontWeight: 'bold', borderRadius: '8px', padding: '14px 28px', align: 'center', margin: '20px 0' }
      },
      {
        id: 'blk_legacy_sgn',
        type: 'signature',
        content: { signOff: 'Best Regards,', senderName: '{{sender_name}}', businessName: '{{business_name}}' },
        styles: { textColor: '#0f172a', margin: '20px 0' }
      }
    ];
  }

  // It is already HTML: Wrap in custom_html block if full structure, or extract
  return [
    {
      id: `blk_html_${Date.now()}`,
      type: 'custom_html',
      content: { html: str },
      styles: {}
    }
  ];
}

/**
 * Validate and Sanitize HTML for Security (Removes scripts, iframes, malicious handlers)
 */
export function validateAndSanitizeEmailHtml(htmlString = '') {
  if (!htmlString) return { isValid: true, sanitizedHtml: '', warnings: [] };

  const warnings = [];
  let sanitized = htmlString;

  // Check for malicious script tags
  if (/<script/i.test(sanitized)) {
    warnings.push('Removed JavaScript <script> tags for email safety.');
    sanitized = sanitized.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  }

  // Check for iframe tags
  if (/<iframe/i.test(sanitized)) {
    warnings.push('Removed <iframe> tags for email client compatibility.');
    sanitized = sanitized.replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '');
  }

  // Check for event handlers like onload, onerror, onclick
  if (/on\w+\s*=/i.test(sanitized)) {
    warnings.push('Removed inline event handlers (onload, onclick, etc.).');
    sanitized = sanitized.replace(/\s+on\w+\s*=\s*(["'])[\s\S]*?\1/gi, '');
  }

  // Check for javascript: protocol
  if (/javascript:/i.test(sanitized)) {
    warnings.push('Removed javascript: protocol links.');
    sanitized = sanitized.replace(/href\s*=\s*(["'])javascript:[\s\S]*?\1/gi, 'href="#"');
  }

  // Check for unclosed tags basic check
  const openDivs = (sanitized.match(/<div/gi) || []).length;
  const closeDivs = (sanitized.match(/<\/div>/gi) || []).length;
  if (Math.abs(openDivs - closeDivs) > 3) {
    warnings.push('Warning: Possible unclosed <div> tags detected in HTML markup.');
  }

  return {
    isValid: warnings.length === 0,
    sanitizedHtml: sanitized,
    warnings
  };
}
