import React from 'react';
import { AlertTriangle, RefreshCw, XCircle, ArrowRight } from 'lucide-react';

export default function DuplicateModal({ duplicateData, onUpdateExisting, onSkip }) {
  if (!duplicateData) return null;

  const { existingLead, newLeadData } = duplicateData;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-industrial-900 border border-amber-500/40 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-150">
        
        {/* Header */}
        <div className="p-5 bg-amber-500/10 border-b border-amber-500/30 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base">Duplicate Lead Detected</h3>
            <p className="text-xs text-amber-300 font-medium">Already Exists in CRM</p>
          </div>
        </div>

        {/* Content Comparison */}
        <div className="p-5 space-y-4 text-xs">
          <p className="text-industrial-300">
            A lead with this website or company name is already registered in your database:
          </p>

          <div className="industrial-card p-3 space-y-2 bg-industrial-950/60 border-industrial-800">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-sm">{existingLead.company_name}</span>
              <span className="text-[11px] font-mono text-brand-orange">{existingLead.lead_id}</span>
            </div>
            <p className="text-industrial-400 font-mono text-[11px]">{existingLead.website}</p>
            <div className="grid grid-cols-2 gap-2 text-industrial-300 text-[11px] pt-1 border-t border-industrial-800/80">
              <div>
                <span className="text-industrial-500 block">Status:</span>
                <span className="font-medium text-white">{existingLead.lead_status}</span>
              </div>
              <div>
                <span className="text-industrial-500 block">Location:</span>
                <span className="font-medium text-white">{existingLead.location || 'N/A'}</span>
              </div>
            </div>
          </div>

          {newLeadData && (
            <div className="space-y-1">
              <span className="text-industrial-400 text-[11px] font-semibold uppercase tracking-wider">
                New Scanned Information Found
              </span>
              <div className="p-3 bg-industrial-800/50 rounded-lg border border-industrial-700/50 space-y-1 text-industrial-200">
                <p><strong>Category:</strong> {newLeadData.category || 'N/A'}</p>
                <p><strong>Phone:</strong> {newLeadData.phone || 'N/A'}</p>
                <p><strong>Email:</strong> {newLeadData.email || 'N/A'}</p>
              </div>
            </div>
          )}

          <p className="text-industrial-400 text-[11px]">
            Would you like to update the existing record with new extracted information or skip adding this lead?
          </p>
        </div>

        {/* Action Buttons */}
        <div className="p-4 border-t border-industrial-800 bg-industrial-950 flex items-center justify-end gap-3">
          <button
            onClick={onSkip}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-industrial-800 hover:bg-industrial-700 text-xs font-medium text-industrial-300 transition-colors"
          >
            <XCircle className="w-4 h-4" />
            <span>Skip</span>
          </button>
          
          <button
            onClick={onUpdateExisting}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-orange hover:bg-orange-600 text-xs font-semibold text-white shadow-lg shadow-brand-orange/20 transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Update Existing Lead</span>
          </button>
        </div>

      </div>
    </div>
  );
}
