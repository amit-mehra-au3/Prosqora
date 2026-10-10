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
  Sliders
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

  const [documentTitle, setDocumentTitle] = useState(
    'AM Automation Trading — B2B Lead Discovery Report'
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

  // Generate Styled A4 Printable HTML Document & Open Print/Save as PDF Dialog
  const handleGeneratePdf = () => {
    if (targetLeads.length === 0) {
      alert('No leads available to export to PDF.');
      return;
    }

    const printWindow = window.open('', '_blank', 'width=1100,height=850');
    if (!printWindow) {
      alert('Pop-up blocked! Please allow pop-ups for this site to export PDF.');
      return;
    }

    // Build Table Header HTML
    let tableHeadersHtml = '';
    if (includeSerialNo) tableHeadersHtml += '<th style="width: 45px; text-align: center;">#</th>';
    if (includeCompanyName) tableHeadersHtml += '<th>Company Name</th>';
    if (includeCity) tableHeadersHtml += '<th style="width: 110px;">City</th>';
    if (includePhone) tableHeadersHtml += '<th style="width: 140px;">Mobile / Phone</th>';
    if (includeEmail) tableHeadersHtml += '<th style="width: 180px;">Email Address</th>';
    if (includeCategory) tableHeadersHtml += '<th style="width: 140px;">Category</th>';
    if (includeWebsite) tableHeadersHtml += '<th style="width: 140px;">Website</th>';

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

      tableRowsHtml += `<tr style="${idx % 2 === 1 ? 'background-color: #f8fafc;' : ''}">`;
      if (includeSerialNo) tableRowsHtml += `<td style="text-align: center; font-weight: bold; color: #64748b;">${idx + 1}</td>`;
      if (includeCompanyName) tableRowsHtml += `<td style="font-weight: bold; color: #0f172a;">${escapeHtml(lead.company_name || '—')}</td>`;
      if (includeCity) tableRowsHtml += `<td style="color: #334155;">${escapeHtml(lead.city || '—')}</td>`;
      if (includePhone) tableRowsHtml += `<td style="font-family: monospace; font-weight: 600; color: #0284c7;">${escapeHtml(lead.phone || '—')}</td>`;
      if (includeEmail) tableRowsHtml += `<td style="font-family: monospace; color: #0f766e;">${escapeHtml(lead.email || '—')}</td>`;
      if (includeCategory) tableRowsHtml += `<td style="color: #475569; font-size: 11px;">${escapeHtml(catStr || 'Industrial')}</td>`;
      if (includeWebsite) tableRowsHtml += `<td style="font-family: monospace; color: #2563eb; font-size: 11px;">${escapeHtml((lead.website || '').replace(/^https?:\/\//, ''))}</td>`;
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
            size: A4 portrait;
            margin: 12mm;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #1e293b;
            margin: 0;
            padding: 0;
            font-size: 12px;
            background-color: #ffffff;
          }
          .header-container {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #f97316;
            padding-bottom: 12px;
            margin-bottom: 16px;
          }
          .brand-title {
            font-size: 18px;
            font-weight: 900;
            color: #0f172a;
            letter-spacing: -0.5px;
            margin: 0;
          }
          .brand-subtitle {
            font-size: 11px;
            color: #f97316;
            font-weight: 700;
            margin-top: 2px;
          }
          .meta-info {
            text-align: right;
            font-size: 10px;
            color: #64748b;
            font-family: monospace;
          }
          .stats-bar {
            display: flex;
            gap: 16px;
            background-color: #f1f5f9;
            padding: 8px 12px;
            border-radius: 6px;
            margin-bottom: 16px;
            font-size: 11px;
            font-weight: 600;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
          }
          th {
            background-color: #0f172a;
            color: #ffffff;
            font-weight: 700;
            text-transform: uppercase;
            font-size: 10px;
            letter-spacing: 0.5px;
            padding: 8px 10px;
            text-align: left;
            border: 1px solid #0f172a;
          }
          td {
            padding: 7px 10px;
            border: 1px solid #cbd5e1;
            vertical-align: middle;
          }
          tr {
            page-break-inside: avoid;
          }
          .footer {
            margin-top: 20px;
            padding-top: 10px;
            border-top: 1px solid #e2e8f0;
            font-size: 10px;
            color: #94a3b8;
            display: flex;
            justify-content: space-between;
          }
          @media print {
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="position: fixed; top: 12px; right: 12px; z-index: 9999; display: flex; gap: 8px;">
          <button onclick="window.print()" style="background: #f97316; color: white; border: none; padding: 10px 18px; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 13px; shadow: 0 4px 12px rgba(0,0,0,0.15);">
            📄 Save as PDF / Print
          </button>
          <button onclick="window.close()" style="background: #475569; color: white; border: none; padding: 10px 14px; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 13px;">
            Close
          </button>
        </div>

        <div class="header-container">
          <div>
            <h1 class="brand-title">AM AUTOMATION TRADING</h1>
            <div class="brand-subtitle">INDUSTRIAL AUTOMATION & ELECTRICAL COMPONENTS SUPPLIERS</div>
          </div>
          <div class="meta-info">
            <div>Document: B2B Lead Report</div>
            <div>Date: ${new Date().toLocaleDateString()}</div>
            <div>Total Leads: <strong>${targetLeads.length}</strong></div>
          </div>
        </div>

        <div class="stats-bar">
          <div>Report Title: <strong>${escapeHtml(documentTitle)}</strong></div>
          <div>Total Records: <strong>${targetLeads.length} Leads</strong></div>
          <div>Format: <strong>PDF Printable Report</strong></div>
        </div>

        <table>
          <thead>
            <tr>${tableHeadersHtml}</tr>
          </thead>
          <tbody>
            ${tableRowsHtml}
          </tbody>
        </table>

        <div class="footer">
          <div>ProSQORA Lead Discovery & CRM — Confidential B2B Report</div>
          <div>Generated on ${new Date().toLocaleString()}</div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
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
            <div className="w-10 h-10 rounded-xl bg-brand-orange/20 border border-brand-orange/40 flex items-center justify-center text-brand-orange">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-white text-base">Export Leads to PDF</h2>
              <p className="text-xs text-industrial-400 mt-0.5">
                Download company names, cities, and mobile numbers in a formatted PDF report.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-industrial-400 hover:text-white hover:bg-industrial-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. Document Title Input */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-industrial-300">PDF Report Document Title</label>
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
                {filteredLeads.length} Leads
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
              <div className="font-extrabold text-xs">Selected Leads</div>
              <div className="text-[11px] font-mono mt-1 text-emerald-400 font-bold">
                {selectedLeads.length} Leads
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
                Specify Limit
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

        {/* 3. Column Selection Checkboxes */}
        <div className="space-y-2.5 p-4 bg-industrial-950 rounded-xl border border-industrial-800">
          <label className="text-xs font-bold text-industrial-200 block uppercase text-[11px] tracking-wider">
            PDF Table Columns Included:
          </label>

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
              <span>Company Name</span>
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

        {/* 4. Action Summary Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-industrial-800">
          <div className="text-xs font-mono text-industrial-400">
            Ready to download: <strong className="text-brand-orange text-sm font-bold">{targetLeads.length}</strong> leads
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
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-brand-orange hover:bg-orange-600 text-white font-extrabold text-xs shadow-lg shadow-brand-orange/20 transition-all disabled:opacity-50"
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
