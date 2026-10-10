import React, { useState } from 'react';
import {
  FileText,
  X,
  Download,
  Printer,
  CheckSquare,
  Square,
  Building2,
  MapPin,
  Phone,
  Mail,
  Layers,
  Sparkles,
  Eye,
  Sliders,
  Maximize2,
  Type
} from 'lucide-react';

export default function PdfExportModal({
  allLeads = [],
  filteredLeads = [],
  selectedIds = [],
  onClose
}) {
  // Export Scope: 'filtered' | 'selected' | 'custom'
  const selectedLeads = allLeads.filter((l) => selectedIds.includes(l.id));
  const [exportScope, setExportScope] = useState(
    selectedIds.length > 0 ? 'selected' : 'filtered'
  );
  const [customLimit, setCustomLimit] = useState(100);

  // Column Selection Checkboxes
  const [includeSerialNo, setIncludeSerialNo] = useState(true);
  const [includeCompanyName, setIncludeCompanyName] = useState(true);
  const [includeCity, setIncludeCity] = useState(true);
  const [includePhone, setIncludePhone] = useState(true);
  const [includeEmail, setIncludeEmail] = useState(true);
  const [includeCategory, setIncludeCategory] = useState(true);
  const [includeWebsite, setIncludeWebsite] = useState(false);

  // Layout & Formatting Controls
  const [pdfOrientation, setPdfOrientation] = useState('portrait'); // 'portrait' | 'landscape'
  const [fontSizeMode, setFontSizeMode] = useState('standard'); // 'compact' | 'standard' | 'large'
  const [includeCompanyHeader, setIncludeCompanyHeader] = useState(true);

  const [documentTitle, setDocumentTitle] = useState(
    'AM Automation Trading — Industrial Leads Directory'
  );

  // Calculate leads to export based on selected scope
  const getTargetLeads = () => {
    let source = [];
    if (exportScope === 'selected') {
      source = selectedLeads.length > 0 ? selectedLeads : filteredLeads;
    } else if (exportScope === 'custom') {
      const limit = Math.max(1, parseInt(customLimit) || 100);
      source = filteredLeads.slice(0, limit);
    } else {
      source = filteredLeads;
    }
    return source;
  };

  const targetLeads = getTargetLeads();

  // Get unique cities count
  const uniqueCitiesCount = new Set(
    targetLeads.map((l) => (l.city || '').trim()).filter(Boolean)
  ).size;

  // Font Size Settings Map
  const fontSizeMap = {
    compact: { body: '10px', table: '10px', header: '9.5px', padding: '5px 8px' },
    standard: { body: '11px', table: '11px', header: '10px', padding: '7px 10px' },
    large: { body: '12px', table: '12px', header: '11px', padding: '9px 12px' }
  };

  const currentFontSize = fontSizeMap[fontSizeMode] || fontSizeMap.standard;

  // Generate Styled A4 Printable HTML Document & Open Print/Save as PDF Dialog
  const handleGeneratePdf = () => {
    if (targetLeads.length === 0) {
      alert('No leads available to export to PDF.');
      return;
    }

    const printWindow = window.open('', '_blank', 'width=1150,height=900');
    if (!printWindow) {
      alert('Pop-up blocked! Please allow pop-ups for this site to export PDF.');
      return;
    }

    // Build Table Header HTML
    let tableHeadersHtml = '';
    if (includeSerialNo) tableHeadersHtml += '<th style="width: 42px; text-align: center;">#</th>';
    if (includeCompanyName) tableHeadersHtml += '<th>Company Name</th>';
    if (includeCity) tableHeadersHtml += '<th style="width: 120px;">City</th>';
    if (includePhone) tableHeadersHtml += '<th style="width: 145px;">Mobile / Phone</th>';
    if (includeEmail) tableHeadersHtml += '<th style="width: 185px;">Email Address</th>';
    if (includeCategory) tableHeadersHtml += '<th style="width: 150px;">Category</th>';
    if (includeWebsite) tableHeadersHtml += '<th style="width: 150px;">Website</th>';

    // Build Table Rows HTML
    let tableRowsHtml = '';
    targetLeads.forEach((lead, idx) => {
      let catStr = '';
      try {
        const catArr = typeof lead.categories === 'string' ? JSON.parse(lead.categories || '[]') : lead.categories;
        catStr = Array.isArray(catArr) && catArr.length > 0 ? catArr[0] : lead.category || '';
      } catch (e) {
        catStr = lead.category || '';
      }

      const cleanCity = (lead.city || 'Other').trim();
      const cleanPhone = (lead.phone || '—').trim();
      const cleanEmail = (lead.email || '—').trim();
      const cleanComp = (lead.company_name || '—').trim();
      const cleanWeb = (lead.website || '').replace(/^https?:\/\//, '').replace(/\/$/, '');

      tableRowsHtml += `<tr style="${idx % 2 === 1 ? 'background-color: #f8fafc;' : ''}">`;
      
      if (includeSerialNo) {
        tableRowsHtml += `<td class="sr-no" style="padding: ${currentFontSize.padding};">${idx + 1}</td>`;
      }
      if (includeCompanyName) {
        tableRowsHtml += `<td class="company-cell" style="padding: ${currentFontSize.padding};">
          <div>${escapeHtml(cleanComp)}</div>
          ${lead.lead_id ? `<div style="font-size: 9px; color: #94a3b8; font-weight: 500; font-family: monospace; margin-top: 1px;">ID: ${escapeHtml(lead.lead_id)}</div>` : ''}
        </td>`;
      }
      if (includeCity) {
        tableRowsHtml += `<td style="padding: ${currentFontSize.padding};"><span class="city-badge">${escapeHtml(cleanCity)}</span></td>`;
      }
      if (includePhone) {
        tableRowsHtml += `<td class="phone-cell" style="padding: ${currentFontSize.padding};">${escapeHtml(cleanPhone)}</td>`;
      }
      if (includeEmail) {
        tableRowsHtml += `<td class="email-cell" style="padding: ${currentFontSize.padding};">${escapeHtml(cleanEmail)}</td>`;
      }
      if (includeCategory) {
        tableRowsHtml += `<td class="category-cell" style="padding: ${currentFontSize.padding};">${escapeHtml(catStr || 'Industrial Automation')}</td>`;
      }
      if (includeWebsite) {
        tableRowsHtml += `<td class="website-cell" style="padding: ${currentFontSize.padding};">${escapeHtml(cleanWeb || '—')}</td>`;
      }

      tableRowsHtml += '</tr>';
    });

    const fullDocHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${escapeHtml(documentTitle)}</title>
        <style>
          @page {
            size: A4 ${pdfOrientation};
            margin: 10mm 12mm 12mm 12mm;
          }
          thead { display: table-header-group; }
          tfoot { display: table-footer-group; }
          tr { page-break-inside: avoid; }

          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #0f172a;
            margin: 0;
            padding: 0;
            font-size: ${currentFontSize.body};
            background-color: #ffffff;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .top-accent-bar {
            height: 5px;
            background: linear-gradient(90deg, #0b1329 0%, #f97316 65%, #fb923c 100%);
            margin-bottom: 12px;
            border-radius: 3px;
          }

          .header-container {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 10px;
            margin-bottom: 12px;
          }

          .brand-section {
            display: flex;
            align-items: center;
            gap: 12px;
          }

          .logo-badge {
            width: 42px;
            height: 42px;
            background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
            color: #ffffff;
            border-radius: 9px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 900;
            font-size: 20px;
            letter-spacing: -1px;
            box-shadow: 0 4px 10px rgba(249, 115, 22, 0.25);
          }

          .brand-title {
            font-size: 18px;
            font-weight: 900;
            color: #0b1329;
            letter-spacing: -0.3px;
            margin: 0;
            line-height: 1.1;
          }

          .brand-subtitle {
            font-size: 10.5px;
            color: #f97316;
            font-weight: 800;
            letter-spacing: 0.5px;
            text-transform: uppercase;
            margin-top: 2px;
          }

          .company-contact-line {
            font-size: 9.5px;
            color: #475569;
            margin-top: 3px;
            font-weight: 500;
          }

          .doc-meta {
            text-align: right;
          }

          .doc-type-badge {
            display: inline-block;
            background-color: #0b1329;
            color: #ffffff;
            font-size: 9.5px;
            font-weight: 800;
            text-transform: uppercase;
            padding: 3px 8px;
            border-radius: 4px;
            letter-spacing: 0.5px;
            margin-bottom: 4px;
          }

          .doc-meta-text {
            font-size: 9.5px;
            color: #64748b;
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            line-height: 1.45;
          }

          .summary-card {
            background: #f8fafc;
            border: 1px solid #cbd5e1;
            border-left: 4px solid #f97316;
            border-radius: 6px;
            padding: 8px 14px;
            margin-bottom: 14px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 11px;
          }

          .summary-title {
            font-weight: 800;
            color: #0f172a;
            font-size: 11.5px;
          }

          .summary-metrics {
            display: flex;
            gap: 18px;
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          }

          .metric-item {
            display: flex;
            align-items: center;
            gap: 5px;
            font-size: 10.5px;
          }

          .metric-value {
            font-weight: 800;
            color: #ea580c;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            font-size: ${currentFontSize.table};
            margin-top: 4px;
          }

          th {
            background-color: #0b1329 !important;
            color: #ffffff !important;
            font-weight: 800;
            text-transform: uppercase;
            font-size: ${currentFontSize.header};
            letter-spacing: 0.5px;
            padding: 8px 10px;
            text-align: left;
            border: 1px solid #0b1329;
          }

          td {
            border: 1px solid #cbd5e1;
            vertical-align: middle;
            line-height: 1.35;
          }

          tr:nth-child(even) {
            background-color: #f8fafc !important;
          }

          .sr-no {
            text-align: center;
            font-weight: 800;
            color: #64748b;
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          }

          .company-cell {
            font-weight: 800;
            color: #0f172a;
          }

          .city-badge {
            display: inline-block;
            background-color: #f1f5f9;
            color: #1e293b;
            font-weight: 700;
            font-size: 9.5px;
            padding: 2px 6px;
            border-radius: 4px;
            border: 1px solid #cbd5e1;
          }

          .phone-cell {
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            font-weight: 700;
            color: #0284c7;
            white-space: nowrap;
          }

          .email-cell {
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            color: #0d9488;
            font-weight: 600;
          }

          .category-cell {
            color: #475569;
            font-weight: 600;
          }

          .website-cell {
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            color: #2563eb;
          }

          .report-footer {
            margin-top: 18px;
            padding-top: 10px;
            border-top: 1px solid #cbd5e1;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 9.5px;
            color: #64748b;
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          }

          @media print {
            .no-print { display: none !important; }
          }
        </style>
      </head>
      <body>

        {/* Top Fixed Floating Control Toolbar */}
        <div class="no-print" style="position: fixed; top: 14px; right: 14px; z-index: 9999; display: flex; gap: 10px; background: rgba(15, 23, 42, 0.92); padding: 8px 14px; border-radius: 12px; backdrop-filter: blur(8px); box-shadow: 0 10px 25px -5px rgba(0,0,0,0.3);">
          <button onclick="window.print()" style="background: linear-gradient(135deg, #f97316, #ea580c); color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 800; cursor: pointer; font-size: 13px; display: flex; align-items: center; gap: 6px; box-shadow: 0 4px 12px rgba(249, 115, 22, 0.3);">
            📄 SAVE AS PDF / PRINT
          </button>
          <button onclick="window.close()" style="background: #334155; color: white; border: none; padding: 10px 14px; border-radius: 8px; font-weight: 700; cursor: pointer; font-size: 13px;">
            Close
          </button>
        </div>

        <div class="top-accent-bar"></div>

        {/* Company B2B Header */}
        ${
          includeCompanyHeader
            ? `
        <div class="header-container">
          <div class="brand-section">
            <div class="logo-badge">AM</div>
            <div>
              <h1 class="brand-title">AM AUTOMATION TRADING</h1>
              <div class="brand-subtitle">INDUSTRIAL AUTOMATION & ELECTRICAL COMPONENTS SUPPLIERS</div>
              <div class="company-contact-line">Phone: +91 86072 85969 | Email: amautomationtrading@gmail.com | GSTIN: 06BJUPA2334N1ZA</div>
            </div>
          </div>
          <div class="doc-meta">
            <div class="doc-type-badge">CONFIDENTIAL B2B DIRECTORY</div>
            <div class="doc-meta-text">
              <div>Date: <strong>${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</strong></div>
              <div>Time: ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
          </div>
        </div>
        `
            : ''
        }

        {/* Executive Summary Bar */}
        <div class="summary-card">
          <div class="summary-title">${escapeHtml(documentTitle)}</div>
          <div class="summary-metrics">
            <div class="metric-item">Total Leads: <span class="metric-value">${targetLeads.length}</span></div>
            <div class="metric-item">Cities Covered: <span class="metric-value">${uniqueCitiesCount}</span></div>
            <div class="metric-item">Layout: <span class="metric-value">${pdfOrientation.toUpperCase()}</span></div>
          </div>
        </div>

        {/* Formatted Data Table */}
        <table>
          <thead>
            <tr>${tableHeadersHtml}</tr>
          </thead>
          <tbody>
            ${tableRowsHtml}
          </tbody>
        </table>

        {/* Report Footer */}
        <div class="report-footer">
          <div>ProSQORA Lead Discovery & CRM — AM Automation Trading Confidential</div>
          <div>Page 1 • Total Records: ${targetLeads.length}</div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 350);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(fullDocHtml);
    printWindow.document.close();
  };

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="industrial-card max-w-2xl w-full p-6 space-y-6 border border-industrial-700 shadow-2xl animate-in fade-in duration-200">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-industrial-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-orange to-amber-500 border border-brand-orange/40 flex items-center justify-center text-white shadow-lg shadow-brand-orange/20">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-white text-base">Export Leads to PDF</h2>
              <p className="text-xs text-industrial-400 mt-0.5">
                Download formatted B2B leads report with Company Name, City, and Phone Numbers.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-industrial-400 hover:text-white hover:bg-industrial-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. Document Title Input */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-industrial-300">PDF Report Title Header</label>
          <input
            type="text"
            value={documentTitle}
            onChange={(e) => setDocumentTitle(e.target.value)}
            className="industrial-input w-full text-xs font-semibold"
          />
        </div>

        {/* 2. Quantity / Scope Selection */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-industrial-300 flex items-center gap-1.5 uppercase text-[11px] tracking-wider">
            <Sliders className="w-3.5 h-3.5 text-brand-orange" />
            <span>Select Lead Quantity to Export</span>
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            
            <button
              type="button"
              onClick={() => setExportScope('filtered')}
              className={`p-3 rounded-xl border text-left transition-all ${
                exportScope === 'filtered'
                  ? 'bg-brand-orange/20 border-brand-orange text-white ring-1 ring-brand-orange/50'
                  : 'bg-industrial-950 border-industrial-800 text-industrial-400 hover:text-white'
              }`}
            >
              <div className="font-extrabold text-xs">All Filtered Leads</div>
              <div className="text-[11px] font-mono mt-1 text-brand-orange font-bold">
                {filteredLeads.length} Leads Available
              </div>
            </button>

            <button
              type="button"
              onClick={() => setExportScope('selected')}
              disabled={selectedLeads.length === 0}
              className={`p-3 rounded-xl border text-left transition-all disabled:opacity-40 ${
                exportScope === 'selected'
                  ? 'bg-brand-orange/20 border-brand-orange text-white ring-1 ring-brand-orange/50'
                  : 'bg-industrial-950 border-industrial-800 text-industrial-400 hover:text-white'
              }`}
            >
              <div className="font-extrabold text-xs">Selected Leads Only</div>
              <div className="text-[11px] font-mono mt-1 text-emerald-400 font-bold">
                {selectedLeads.length} Selected
              </div>
            </button>

            <button
              type="button"
              onClick={() => setExportScope('custom')}
              className={`p-3 rounded-xl border text-left transition-all ${
                exportScope === 'custom'
                  ? 'bg-brand-orange/20 border-brand-orange text-white ring-1 ring-brand-orange/50'
                  : 'bg-industrial-950 border-industrial-800 text-industrial-400 hover:text-white'
              }`}
            >
              <div className="font-extrabold text-xs">Custom Quantity</div>
              <div className="text-[11px] font-mono mt-1 text-sky-400 font-bold">
                Set Exact Count
              </div>
            </button>

          </div>

          {exportScope === 'custom' && (
            <div className="p-3 bg-industrial-950 rounded-xl border border-industrial-800 flex items-center justify-between gap-4 mt-2">
              <label className="text-xs font-bold text-industrial-300">Enter Number of Leads to Download:</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max={filteredLeads.length || 5000}
                  value={customLimit}
                  onChange={(e) => setCustomLimit(parseInt(e.target.value) || 1)}
                  className="industrial-input w-28 text-xs font-mono font-bold text-center"
                />
                <span className="text-xs text-industrial-400 font-mono">/ {filteredLeads.length} max</span>
              </div>
            </div>
          )}
        </div>

        {/* 3. Page Layout & Typography Settings */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          {/* Orientation Selector */}
          <div className="space-y-1.5 p-3 bg-industrial-950 rounded-xl border border-industrial-800">
            <label className="text-xs font-bold text-industrial-300 flex items-center gap-1">
              <Maximize2 className="w-3.5 h-3.5 text-brand-orange" />
              <span>Page Layout & Orientation</span>
            </label>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setPdfOrientation('portrait')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                  pdfOrientation === 'portrait'
                    ? 'bg-brand-orange text-white border-brand-orange'
                    : 'bg-industrial-900 border-industrial-800 text-industrial-400 hover:text-white'
                }`}
              >
                📄 Portrait (Standard)
              </button>
              <button
                type="button"
                onClick={() => setPdfOrientation('landscape')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                  pdfOrientation === 'landscape'
                    ? 'bg-brand-orange text-white border-brand-orange'
                    : 'bg-industrial-900 border-industrial-800 text-industrial-400 hover:text-white'
                }`}
              >
                🖼️ Landscape (Wide)
              </button>
            </div>
          </div>

          {/* Font Size Selector */}
          <div className="space-y-1.5 p-3 bg-industrial-950 rounded-xl border border-industrial-800">
            <label className="text-xs font-bold text-industrial-300 flex items-center gap-1">
              <Type className="w-3.5 h-3.5 text-brand-orange" />
              <span>Table Font Size / Row Density</span>
            </label>
            <div className="grid grid-cols-3 gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => setFontSizeMode('compact')}
                className={`px-2 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
                  fontSizeMode === 'compact'
                    ? 'bg-brand-orange text-white border-brand-orange'
                    : 'bg-industrial-900 border-industrial-800 text-industrial-400 hover:text-white'
                }`}
              >
                Compact (9px)
              </button>
              <button
                type="button"
                onClick={() => setFontSizeMode('standard')}
                className={`px-2 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
                  fontSizeMode === 'standard'
                    ? 'bg-brand-orange text-white border-brand-orange'
                    : 'bg-industrial-900 border-industrial-800 text-industrial-400 hover:text-white'
                }`}
              >
                Standard (11px)
              </button>
              <button
                type="button"
                onClick={() => setFontSizeMode('large')}
                className={`px-2 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
                  fontSizeMode === 'large'
                    ? 'bg-brand-orange text-white border-brand-orange'
                    : 'bg-industrial-900 border-industrial-800 text-industrial-400 hover:text-white'
                }`}
              >
                Large (12px)
              </button>
            </div>
          </div>

        </div>

        {/* 4. Column Selection Checkboxes */}
        <div className="space-y-2.5 p-4 bg-industrial-950 rounded-xl border border-industrial-800">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-industrial-200 block uppercase text-[11px] tracking-wider">
              PDF Table Columns Included:
            </label>
            <label className="flex items-center gap-1.5 text-[11px] text-industrial-400 cursor-pointer">
              <input
                type="checkbox"
                checked={includeCompanyHeader}
                onChange={(e) => setIncludeCompanyHeader(e.target.checked)}
                className="rounded border-industrial-700 bg-industrial-900 text-brand-orange"
              />
              <span>Include AM Automation Header</span>
            </label>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            
            <label className="flex items-center gap-2 cursor-pointer text-industrial-300">
              <input
                type="checkbox"
                checked={includeSerialNo}
                onChange={(e) => setIncludeSerialNo(e.target.checked)}
                className="rounded border-industrial-700 bg-industrial-900 text-brand-orange"
              />
              <span># Serial No.</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-white font-bold">
              <input
                type="checkbox"
                checked={includeCompanyName}
                disabled
                className="rounded border-industrial-700 bg-industrial-900 text-brand-orange"
              />
              <span>Company Name (Required)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-white font-bold">
              <input
                type="checkbox"
                checked={includeCity}
                onChange={(e) => setIncludeCity(e.target.checked)}
                className="rounded border-industrial-700 bg-industrial-900 text-brand-orange"
              />
              <span>City</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-white font-bold">
              <input
                type="checkbox"
                checked={includePhone}
                onChange={(e) => setIncludePhone(e.target.checked)}
                className="rounded border-industrial-700 bg-industrial-900 text-brand-orange"
              />
              <span>Mobile / Phone</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-industrial-300">
              <input
                type="checkbox"
                checked={includeEmail}
                onChange={(e) => setIncludeEmail(e.target.checked)}
                className="rounded border-industrial-700 bg-industrial-900 text-brand-orange"
              />
              <span>Email Address</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-industrial-300">
              <input
                type="checkbox"
                checked={includeCategory}
                onChange={(e) => setIncludeCategory(e.target.checked)}
                className="rounded border-industrial-700 bg-industrial-900 text-brand-orange"
              />
              <span>Category</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-industrial-300">
              <input
                type="checkbox"
                checked={includeWebsite}
                onChange={(e) => setIncludeWebsite(e.target.checked)}
                className="rounded border-industrial-700 bg-industrial-900 text-brand-orange"
              />
              <span>Website</span>
            </label>

          </div>
        </div>

        {/* 5. Action Summary Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-industrial-800">
          <div className="text-xs font-mono text-industrial-400">
            Export Target: <strong className="text-brand-orange text-sm font-bold">{targetLeads.length}</strong> leads • <span className="text-emerald-400 font-bold">{uniqueCitiesCount} Cities</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-industrial-800 hover:bg-industrial-700 text-industrial-300 font-bold text-xs"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleGeneratePdf}
              disabled={targetLeads.length === 0}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-brand-orange to-orange-600 hover:from-orange-600 hover:to-brand-orange text-white font-extrabold text-xs shadow-lg shadow-brand-orange/25 transition-all disabled:opacity-50 hover:scale-[1.02]"
            >
              <FileText className="w-4 h-4" />
              <span>EXPORT & DOWNLOAD PDF ({targetLeads.length})</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
