import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Copy,
  Trash2,
  GitMerge,
  Sparkles,
  X,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Star,
  RefreshCw,
  ExternalLink
} from 'lucide-react';

export default function DuplicateModal({ onClose, onCleanCompleted }) {
  const [duplicateGroups, setDuplicateGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalDuplicateLeads, setTotalDuplicateLeads] = useState(0);

  const [cleaning, setCleaning] = useState(false);
  const [confirmBulkClean, setConfirmBulkClean] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    fetchDuplicates();
  }, []);

  const fetchDuplicates = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/leads/duplicates');
      if (res.data.success) {
        setDuplicateGroups(res.data.duplicateGroups || []);
        setTotalDuplicateLeads(res.data.totalDuplicateLeads || 0);
      }
    } catch (err) {
      console.error('Failed to fetch duplicates:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMergeGroup = async (group, customPrimaryId = null) => {
    const primaryId = customPrimaryId || group.recommendedId;
    const duplicateIds = group.leads.filter((l) => l.id !== primaryId).map((l) => l.id);

    try {
      const res = await axios.post('/api/leads/merge', {
        primaryId,
        duplicateIds
      });

      if (res.data.success) {
        setStatusMsg(`Merged ${duplicateIds.length} duplicate leads into Primary Lead.`);
        fetchDuplicates();
        if (onCleanCompleted) onCleanCompleted();
      }
    } catch (err) {
      alert('Failed to merge duplicate leads.');
    }
  };

  const handleDeleteSingle = async (leadId) => {
    if (!window.confirm('Are you sure you want to delete this duplicate lead record?')) return;
    try {
      await axios.delete(`/api/leads/${leadId}`);
      fetchDuplicates();
      if (onCleanCompleted) onCleanCompleted();
    } catch (err) {
      alert('Failed to delete lead.');
    }
  };

  const handleBulkCleanAll = async () => {
    setCleaning(true);
    try {
      const res = await axios.post('/api/leads/bulk-clean-duplicates');
      if (res.data.success) {
        setStatusMsg(`Cleaned ${res.data.cleanedGroupsCount} duplicate groups and removed ${res.data.removedLeadsCount} duplicate records.`);
        setConfirmBulkClean(false);
        fetchDuplicates();
        if (onCleanCompleted) onCleanCompleted();
      }
    } catch (err) {
      alert('Failed to perform bulk duplicate cleanup.');
    } finally {
      setCleaning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="industrial-card w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl border-industrial-700 animate-in fade-in duration-200">
        
        {/* Modal Header */}
        <div className="p-5 bg-industrial-900 border-b border-industrial-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Copy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-white text-base">Find & Clean Existing Duplicate Leads</h2>
              <p className="text-xs text-industrial-400">
                Identified duplicate companies in your workspace based on canonical website matching (`normalizeWebsite`).
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-industrial-400 hover:text-white hover:bg-industrial-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action & Stats Banner */}
        <div className="p-4 bg-industrial-950 border-b border-industrial-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-industrial-400 font-medium">Duplicate Website Groups: </span>
              <span className="font-extrabold text-white text-sm ml-1">{duplicateGroups.length}</span>
            </div>
            <div className="border-l border-industrial-800 pl-4">
              <span className="text-industrial-400 font-medium">Total Duplicate Leads: </span>
              <span className="font-extrabold text-amber-400 text-sm ml-1">{totalDuplicateLeads}</span>
            </div>
          </div>

          {duplicateGroups.length > 0 && (
            <button
              onClick={() => setConfirmBulkClean(true)}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs shadow-lg shadow-amber-500/20 transition-all"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Clean Duplicate Websites</span>
            </button>
          )}
        </div>

        {statusMsg && (
          <div className="mx-6 mt-4 p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{statusMsg}</span>
          </div>
        )}

        {/* Modal Main Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-brand-orange animate-spin" />
              <p className="text-xs text-industrial-400">Scanning CRM workspace for website duplicates...</p>
            </div>
          ) : duplicateGroups.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">No Duplicate Websites Found</h3>
              <p className="text-xs text-industrial-400 max-w-md">
                Every lead in your workspace has a unique normalized website domain (`ONE WORKSPACE + ONE WEBSITE = ONE LEAD`).
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {duplicateGroups.map((group, groupIdx) => (
                <div key={group.normalizedUrl} className="industrial-card p-5 border border-industrial-800 space-y-4">
                  
                  {/* Group Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-industrial-800">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-industrial-800 text-industrial-300 font-mono text-xs flex items-center justify-center font-bold">
                        {groupIdx + 1}
                      </span>
                      <div>
                        <h4 className="font-extrabold text-white text-sm flex items-center gap-2">
                          <span>Duplicate Website:</span>
                          <span className="text-brand-orange font-mono">{group.normalizedUrl}</span>
                        </h4>
                        <span className="text-[11px] text-industrial-400">{group.count} lead records found</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleMergeGroup(group)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-industrial-800 hover:bg-industrial-700 text-brand-orange font-bold text-xs border border-industrial-700"
                    >
                      <GitMerge className="w-3.5 h-3.5" />
                      <span>Merge Group</span>
                    </button>
                  </div>

                  {/* Duplicate Leads Table */}
                  <div className="border border-industrial-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs text-industrial-300">
                      <thead className="bg-industrial-900 text-white font-bold border-b border-industrial-800 text-[11px] uppercase">
                        <tr>
                          <th className="p-3">Recommendation</th>
                          <th className="p-3">Company Name</th>
                          <th className="p-3">Website</th>
                          <th className="p-3">Email</th>
                          <th className="p-3">Phone</th>
                          <th className="p-3">Created</th>
                          <th className="p-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-industrial-800/60 bg-industrial-950 font-mono text-[11px]">
                        {group.leads.map((lead) => {
                          const isRecommended = lead.id === group.recommendedId;
                          return (
                            <tr key={lead.id} className={isRecommended ? 'bg-emerald-500/10' : 'hover:bg-industrial-900/50'}>
                              <td className="p-3">
                                {isRecommended ? (
                                  <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 font-extrabold text-[10px] border border-emerald-500/40 flex items-center gap-1 w-fit">
                                    <Star className="w-3 h-3 fill-emerald-400" />
                                    <span>Recommended</span>
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => handleMergeGroup(group, lead.id)}
                                    className="text-[10px] text-industrial-400 hover:text-white underline"
                                  >
                                    Set as Keep Lead
                                  </button>
                                )}
                              </td>
                              <td className="p-3 font-semibold text-white truncate max-w-[160px]">
                                {lead.company_name}
                              </td>
                              <td className="p-3 text-brand-orange truncate max-w-[160px]">
                                {lead.website}
                              </td>
                              <td className="p-3 text-industrial-300 truncate max-w-[140px]">
                                {lead.email || '—'}
                              </td>
                              <td className="p-3 text-industrial-300">
                                {lead.phone || '—'}
                              </td>
                              <td className="p-3 text-industrial-500 text-[10px]">
                                {new Date(lead.created_at).toLocaleDateString()}
                              </td>
                              <td className="p-3 text-right">
                                {!isRecommended && (
                                  <button
                                    onClick={() => handleDeleteSingle(lead.id)}
                                    className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 text-xs"
                                    title="Delete Duplicate Lead"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-industrial-900 border-t border-industrial-800 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-industrial-800 text-industrial-300 font-semibold text-xs hover:bg-industrial-700"
          >
            Close
          </button>
        </div>

      </div>

      {/* CONFIRMATION POPUP MODAL FOR BULK CLEAN */}
      {confirmBulkClean && (
        <div className="fixed inset-0 z-60 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="industrial-card w-full max-w-md p-6 space-y-4 shadow-2xl border-amber-500/50">
            <div className="flex items-center gap-3 text-amber-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="font-extrabold text-white text-base">Confirm Bulk Duplicate Cleanup</h3>
            </div>

            <p className="text-xs text-industrial-300 leading-relaxed">
              This will remove duplicate lead records while keeping one lead per unique website and preserving all useful contact information. Please confirm before continuing.
            </p>

            <div className="p-3 bg-industrial-950 rounded-xl border border-industrial-800 text-xs font-mono text-industrial-300">
              Will clean <span className="text-white font-bold">{duplicateGroups.length}</span> duplicate website groups.
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setConfirmBulkClean(false)}
                className="px-4 py-2 rounded-xl bg-industrial-800 text-industrial-300 font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkCleanAll}
                disabled={cleaning}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs shadow-lg shadow-amber-500/20"
              >
                {cleaning ? 'Cleaning...' : 'Continue & Clean Duplicates'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
