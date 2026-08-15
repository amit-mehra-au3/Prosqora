import React from 'react';
import { Download, FileSpreadsheet, FileText, CheckCircle, Database } from 'lucide-react';

export default function ExportPage() {
  const handleExportCSV = () => {
    window.location.href = '/api/export/csv';
  };

  const handleExportExcel = () => {
    window.location.href = '/api/export/excel';
  };

  return (
    <div className="p-8 space-y-8 max-w-4xl mx-auto">
      
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">Import & Export CRM Data</h1>
        <p className="text-xs text-industrial-400 mt-1">
          Export your complete lead database including client follow-up histories and contact details.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* CSV Export Card */}
        <div className="industrial-card p-6 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-xl bg-brand-orange/10 border border-brand-orange/30 flex items-center justify-center text-brand-orange">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-white text-lg">Export to CSV</h3>
            <p className="text-xs text-industrial-300 leading-relaxed">
              Download standard Comma-Separated Values file compatible with Salesforce, HubSpot, Excel, and custom databases.
            </p>
            <ul className="text-xs text-industrial-400 space-y-1 pt-2">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span>Includes all company contact details</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span>Includes email source URLs</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span>Includes follow-up logs & notes</span>
              </li>
            </ul>
          </div>

          <button
            onClick={handleExportCSV}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-brand-orange hover:bg-orange-600 font-bold text-xs text-white shadow-lg shadow-brand-orange/20 transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Download CSV Export</span>
          </button>
        </div>

        {/* Excel Export Card */}
        <div className="industrial-card p-6 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-white text-lg">Export to Excel (.xlsx)</h3>
            <p className="text-xs text-industrial-300 leading-relaxed">
              Download styled Microsoft Excel workbook formatted with auto-column widths and header filters.
            </p>
            <ul className="text-xs text-industrial-400 space-y-1 pt-2">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span>Pre-formatted Excel sheet structure</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span>Automation opportunity breakdown</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span>Formatted lead status color tags</span>
              </li>
            </ul>
          </div>

          <button
            onClick={handleExportExcel}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 font-bold text-xs text-white shadow-lg shadow-emerald-500/20 transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Download Excel Export</span>
          </button>
        </div>

      </div>

    </div>
  );
}
