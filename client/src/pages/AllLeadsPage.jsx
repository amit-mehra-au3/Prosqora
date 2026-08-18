import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import CrmFilterBar from '../components/CrmFilterBar';
import CampaignComposerModal from '../components/CampaignComposerModal';
import CampaignProgressModal from '../components/CampaignProgressModal';
import CsvImportModal from '../components/CsvImportModal';
import DuplicateModal from '../components/DuplicateModal';
import RefreshWebsitesModal from '../components/RefreshWebsitesModal';
import {
  Database,
  Download,
  FileSpreadsheet,
  Trash2,
  ExternalLink,
  Eye,
  CheckSquare,
  Square,
  MinusSquare,
  Sparkles,
  Phone,
  Mail,
  MessageSquare,
  Send,
  Copy,
  Upload,
  AlertTriangle,
  X,
  CheckCircle2,
  RefreshCw,
  Layers
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AllLeadsPage({ setSelectedLead, refreshTrigger }) {
  const { user } = useAuth();
  const isAdmin = (user?.role || '').toLowerCase() === 'admin';

  const [allLeads, setAllLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);

  // Smart Range Selection State
  const [selectionAnchor, setSelectionAnchor] = useState(null);
  const [rangeMode, setRangeMode] = useState(false);

  // Modals state
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [showRefreshModal, setShowRefreshModal] = useState(false);

  // Bulk Delete Confirmation Modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Complex Filter State
  const [filters, setFilters] = useState({
    search: '',
    cities: [],
    states: [],
    categories: [],
    categoryMatchMode: 'ANY',
    leadStatus: 'All',
    websiteStatus: 'All',
    hasPhone: false,
    hasEmail: false,
    hasWhatsApp: false,
    hasContactPerson: false,
    opportunities: []
  });

  useEffect(() => {
    fetchLeads();
  }, [refreshTrigger]);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/leads');
      if (res.data.success) {
        setAllLeads(res.data.leads || []);
      }
    } catch (err) {
      console.error('Failed to fetch leads:', err);
    } finally {
      setLoading(false);
    }
  };

  // Instant Local Client-Side Filter Evaluation
  const filteredLeads = useMemo(() => {
    return allLeads.filter((lead) => {
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const searchableText = `${lead.company_name} ${lead.website} ${lead.phone} ${lead.email} ${lead.location} ${lead.city} ${lead.state} ${lead.products} ${lead.services} ${lead.notes}`.toLowerCase();
        if (!searchableText.includes(q)) return false;
      }

      if (filters.leadStatus && filters.leadStatus !== 'All') {
        if (lead.lead_status !== filters.leadStatus) return false;
      }

      if (filters.websiteStatus && filters.websiteStatus !== 'All') {
        if (!lead.website_status.includes(filters.websiteStatus)) return false;
      }

      if (filters.cities && filters.cities.length > 0) {
        const leadCity = (lead.city || '').toLowerCase();
        const leadLoc = (lead.location || '').toLowerCase();
        const matchCity = filters.cities.some((c) => leadCity.includes(c.toLowerCase()) || leadLoc.includes(c.toLowerCase()));
        if (!matchCity) return false;
      }

      if (filters.states && filters.states.length > 0) {
        const leadState = (lead.state || '').toLowerCase();
        const matchState = filters.states.some((s) => leadState.includes(s.toLowerCase()));
        if (!matchState) return false;
      }

      if (filters.hasPhone && !lead.phone) return false;
      if (filters.hasEmail && !lead.email) return false;
      if (filters.hasContactPerson && !lead.contact_person) return false;

      if (filters.opportunities && filters.opportunities.length > 0) {
        const oppText = `${lead.products} ${lead.services} ${lead.notes} ${lead.category}`.toUpperCase();
        const matchOpp = filters.opportunities.some((o) => oppText.includes(o.toUpperCase()));
        if (!matchOpp) return false;
      }

      return true;
    });
  }, [allLeads, filters]);

  // Derived Selection State for Current Filtered Leads
  const filteredLeadIds = useMemo(() => filteredLeads.map((l) => l.id), [filteredLeads]);
  const selectedFilteredCount = useMemo(
    () => selectedIds.filter((id) => filteredLeadIds.includes(id)).length,
    [selectedIds, filteredLeadIds]
  );

  const isAllSelected = filteredLeadIds.length > 0 && selectedFilteredCount === filteredLeadIds.length;
  const isIndeterminate = selectedFilteredCount > 0 && selectedFilteredCount < filteredLeadIds.length;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      // Deselect all visible
      setSelectedIds((prev) => prev.filter((id) => !filteredLeadIds.includes(id)));
    } else {
      // Select all visible
      const newSet = new Set([...selectedIds, ...filteredLeadIds]);
      setSelectedIds(Array.from(newSet));
    }
  };

  // Smart Range Selection Handler with Shift+Click & Range Mode Support
  const toggleSelectRow = (id, event = null) => {
    const clickedIndex = filteredLeads.findIndex((l) => l.id === id);
    if (clickedIndex === -1) return;

    const isShift = event && event.shiftKey;

    if ((isShift || rangeMode) && selectionAnchor !== null) {
      const anchorIndex = filteredLeads.findIndex((l) => l.id === selectionAnchor);
      if (anchorIndex !== -1) {
        const start = Math.min(anchorIndex, clickedIndex);
        const end = Math.max(anchorIndex, clickedIndex);
        const rangeIds = filteredLeads.slice(start, end + 1).map((l) => l.id);

        const newSet = new Set(selectedIds);
        rangeIds.forEach((rId) => newSet.add(rId));
        setSelectedIds(Array.from(newSet));
        setSelectionAnchor(id);
        return;
      }
    }

    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
      setSelectionAnchor(id);
    } else {
      setSelectedIds([...selectedIds, id]);
      setSelectionAnchor(id);
    }
  };

  const handleStatusChange = async (leadId, newStatus) => {
    try {
      await axios.put(`/api/leads/${leadId}`, { lead_status: newStatus });
      setAllLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, lead_status: newStatus } : l))
      );
    } catch (err) {
      alert('Failed to update lead status');
    }
  };

  // Perform Bulk Lead Deletion
  const handleConfirmBulkDelete = async () => {
    if (selectedIds.length === 0 || deleting) return;

    setDeleting(true);
    try {
      const res = await axios.post('/api/leads/bulk-delete', {
        leadIds: selectedIds
      });

      if (res.data.success) {
        const deletedCount = res.data.deletedCount;
        setToastMessage(`${deletedCount} lead${deletedCount === 1 ? '' : 's'} deleted successfully.`);
        setTimeout(() => setToastMessage(null), 4000);

        // Remove deleted leads from state & clear selection
        const deletedSet = new Set(selectedIds);
        setAllLeads((prev) => prev.filter((l) => !deletedSet.has(l.id)));
        setSelectedIds([]);
        setShowDeleteModal(false);
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete selected leads.');
    } finally {
      setDeleting(false);
    }
  };

  const handleExportSelected = (type) => {
    if (selectedIds.length === 0) {
      window.location.href = `/api/export/${type}`;
    } else {
      window.location.href = `/api/export/${type}?ids=${selectedIds.join(',')}`;
    }
  };

  const [showComposerModal, setShowComposerModal] = useState(false);
  const [activeCampaignProgress, setActiveCampaignProgress] = useState(null);

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      
      {/* Toast Feedback Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 text-slate-900 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">All CRM Leads</h1>
          <p className="text-xs text-industrial-400 mt-1">
            Spreadsheet CRM database for industrial automation prospects.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Refresh Websites Action Button */}
          <button
            onClick={() => setShowRefreshModal(true)}
            disabled={allLeads.length === 0}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-industrial-800 hover:bg-industrial-700 text-brand-orange font-bold text-xs border border-industrial-700 transition-colors disabled:opacity-40"
          >
            <RefreshCw className="w-4 h-4 text-brand-orange" />
            <span>Refresh Websites</span>
          </button>

          {isAdmin && (
            <button
              onClick={() => setShowDuplicateModal(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-industrial-800 hover:bg-industrial-700 text-amber-400 font-bold text-xs border border-industrial-700 transition-colors"
            >
              <Copy className="w-4 h-4 text-amber-400" />
              <span>Find Duplicates</span>
            </button>
          )}

          <button
            onClick={() => setShowCsvModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-industrial-800 hover:bg-industrial-700 text-white font-bold text-xs border border-industrial-700 transition-colors"
          >
            <Upload className="w-4 h-4 text-brand-orange" />
            <span>Import CSV</span>
          </button>

          <button
            onClick={() => setShowComposerModal(true)}
            disabled={selectedIds.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-orange hover:bg-orange-600 disabled:opacity-40 disabled:hover:bg-brand-orange text-xs font-bold text-white shadow-lg shadow-brand-orange/20 transition-all"
          >
            <Send className="w-4 h-4" />
            <span>✉ Send Email ({selectedIds.length})</span>
          </button>

          {isAdmin && (
            <>
              <button
                onClick={() => handleExportSelected('csv')}
                className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-industrial-800 hover:bg-industrial-700 text-xs font-semibold text-white transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-brand-orange" />
                <span>Export CSV</span>
              </button>
              
              <button
                onClick={() => handleExportSelected('excel')}
                className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-industrial-800 hover:bg-industrial-700 text-xs font-semibold text-white transition-colors"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>Export Excel</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Advanced Filter Bar Component */}
      <CrmFilterBar
        filters={filters}
        setFilters={setFilters}
        totalCount={allLeads.length}
        filteredCount={filteredLeads.length}
      />

      {/* BULK ACTION & RANGE SELECTION TOOLBAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-industrial-950/80 p-3 rounded-xl border border-industrial-800 text-xs">
        <div className="flex items-center gap-3">
          {/* Smart Range Select Toggle */}
          <button
            onClick={() => setRangeMode(!rangeMode)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors flex items-center gap-2 ${
              rangeMode
                ? 'bg-brand-orange text-white border-brand-orange shadow-md shadow-brand-orange/20'
                : 'bg-industrial-900 hover:bg-industrial-800 text-industrial-300 border-industrial-700'
            }`}
            title="Toggle Range Selection mode (Click Start lead, then End lead)"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Range Select:</span>
            <span className="font-mono uppercase text-[10px] font-extrabold">{rangeMode ? 'ON' : 'OFF'}</span>
          </button>

          <span className="text-industrial-400 font-mono text-[11px]">
            Tip: Hold <kbd className="px-1.5 py-0.5 rounded bg-industrial-900 border border-industrial-700 text-white font-sans text-[10px]">Shift</kbd> + click to select range between start & end leads.
          </span>
        </div>

        {selectedIds.length > 0 && (
          <div className="flex items-center gap-3">
            <span className="font-extrabold text-white font-mono text-xs">
              {selectedIds.length} lead{selectedIds.length === 1 ? '' : 's'} selected
            </span>

            <button
              onClick={() => setSelectedIds([])}
              className="px-3 py-1 rounded bg-industrial-800 hover:bg-industrial-700 text-industrial-300 font-semibold text-[11px] border border-industrial-700"
            >
              Clear Selection
            </button>

            {isAdmin && (
              <button
                onClick={() => setShowDeleteModal(true)}
                className="flex items-center gap-1.5 px-3 py-1 rounded bg-red-500/20 hover:bg-red-500/30 text-red-300 font-bold text-[11px] border border-red-500/40"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-400" />
                <span>Delete ({selectedIds.length})</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* CRM Spreadsheet Table */}
      <div className="industrial-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-industrial-950/80 border-b border-industrial-800 text-industrial-400 uppercase tracking-wider text-[11px] font-semibold">
                <th className="p-3 w-10 text-center">
                  <button
                    onClick={toggleSelectAll}
                    title={isAllSelected ? 'Deselect all visible' : 'Select all visible'}
                    className="text-industrial-400 hover:text-white"
                  >
                    {isAllSelected ? (
                      <CheckSquare className="w-4 h-4 text-brand-orange" />
                    ) : isIndeterminate ? (
                      <MinusSquare className="w-4 h-4 text-brand-orange" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="p-3">Company</th>
                <th className="p-3">City</th>
                <th className="p-3">State</th>
                <th className="p-3">Categories</th>
                <th className="p-3">Website</th>
                <th className="p-3">Phone</th>
                <th className="p-3">Email</th>
                <th className="p-3">Website Status</th>
                <th className="p-3">Verification</th>
                <th className="p-3">Lead Status</th>
                <th className="p-3">Automation Opportunities</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-industrial-800/60 font-mono text-[11px]">
              {loading ? (
                <tr>
                  <td colSpan="13" className="p-8 text-center text-industrial-400">
                    <Database className="w-6 h-6 text-brand-orange animate-spin mx-auto mb-2" />
                    Loading spreadsheet leads...
                  </td>
                </tr>
              ) : filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan="13" className="p-8 text-center text-industrial-400">
                    No leads match your current filter parameters.
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => {
                  const isSelected = selectedIds.includes(lead.id);
                  const isAnchor = selectionAnchor === lead.id;

                  let categoryList = [];
                  try {
                    categoryList = typeof lead.categories === 'string' ? JSON.parse(lead.categories || '[]') : lead.categories;
                  } catch (e) {}
                  if (!categoryList || categoryList.length === 0) {
                    categoryList = [lead.category || 'Needs Review'];
                  }

                  const cleanTel = (lead.phone || '').replace(/[^\d+]/g, '');

                  return (
                    <tr
                      key={lead.id}
                      onClick={(e) => toggleSelectRow(lead.id, e)}
                      className={`hover:bg-industrial-800/40 cursor-pointer transition-colors ${
                        isSelected ? 'bg-brand-orange/15' : ''
                      } ${isAnchor ? 'ring-1 ring-brand-orange/50' : ''}`}
                    >
                      <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={(e) => toggleSelectRow(lead.id, e)}
                          className="text-industrial-400 hover:text-white"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-brand-orange" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      {/* Company Name */}
                      <td className="p-3 font-bold text-white max-w-xs truncate" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setSelectedLead(lead)}
                          className="hover:text-brand-orange text-left transition-colors font-bold text-xs"
                        >
                          {lead.company_name}
                        </button>
                        <span className="block text-[10px] font-mono text-industrial-400">{lead.lead_id}</span>
                      </td>

                      {/* City */}
                      <td className="p-3 text-industrial-300 font-medium max-w-[7rem] truncate">
                        {lead.city || 'Unknown'}
                      </td>

                      {/* State */}
                      <td className="p-3 text-industrial-300 font-medium max-w-[7rem] truncate">
                        {lead.state || 'Unknown'}
                      </td>

                      {/* Categories Badges */}
                      <td className="p-3 max-w-[14rem]">
                        <div className="flex flex-wrap gap-1">
                          {categoryList.slice(0, 3).map((cat, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded text-[10px] bg-industrial-800 text-industrial-300 border border-industrial-700 font-sans"
                            >
                              {cat}
                            </span>
                          ))}
                          {categoryList.length > 3 && (
                            <span className="text-[10px] text-industrial-400 font-bold">
                              +{categoryList.length - 3}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Website */}
                      <td className="p-3 max-w-[10rem] truncate" onClick={(e) => e.stopPropagation()}>
                        {lead.website ? (
                          <a
                            href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-brand-orange hover:underline font-mono text-[11px] flex items-center gap-1"
                          >
                            <span className="truncate">{lead.website.replace(/^https?:\/\//, '')}</span>
                            <ExternalLink className="w-3 h-3 shrink-0 opacity-70" />
                          </a>
                        ) : (
                          <span className="text-industrial-500 italic">No website</span>
                        )}
                      </td>

                      {/* Phone */}
                      <td className="p-3 text-industrial-300 font-mono text-[11px] whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        {lead.phone ? (
                          <a href={`tel:${cleanTel}`} className="hover:text-brand-orange flex items-center gap-1">
                            <Phone className="w-3 h-3 text-industrial-400" />
                            <span>{lead.phone}</span>
                          </a>
                        ) : (
                          <span className="text-industrial-500 italic">—</span>
                        )}
                      </td>

                      {/* Email */}
                      <td className="p-3 text-industrial-300 font-mono text-[11px] max-w-[10rem] truncate" onClick={(e) => e.stopPropagation()}>
                        {lead.email ? (
                          <a href={`mailto:${lead.email}`} className="hover:text-brand-orange flex items-center gap-1">
                            <Mail className="w-3 h-3 text-industrial-400 shrink-0" />
                            <span className="truncate">{lead.email}</span>
                          </a>
                        ) : (
                          <span className="text-industrial-500 italic">—</span>
                        )}
                      </td>

                      {/* Website Status */}
                      <td className="p-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            (lead.website_status || '').includes('Reachable') || (lead.website_status || '').includes('Working') || (lead.website_status || '').includes('Accessible')
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : (lead.website_status || '').includes('Redirected')
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          }`}
                        >
                          {lead.website_status || '🔴 Not Accessible'}
                        </span>
                      </td>

                      {/* Verification Status */}
                      <td className="p-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            lead.verification_status === 'Verified'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {lead.verification_status || 'Needs Review'}
                        </span>
                      </td>

                      {/* Lead Status Dropdown */}
                      <td className="p-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={lead.lead_status || 'New'}
                          onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                          className="bg-industrial-900 border border-industrial-700 text-white rounded px-2 py-1 text-[11px] focus:outline-none focus:border-brand-orange font-sans"
                        >
                          <option value="New">New</option>
                          <option value="Contacted">Contacted</option>
                          <option value="Qualified">Qualified</option>
                          <option value="Proposal Sent">Proposal Sent</option>
                          <option value="Converted">Converted</option>
                          <option value="Unresponsive">Unresponsive</option>
                        </select>
                      </td>

                      {/* Automation Opportunities */}
                      <td className="p-3 text-industrial-300 max-w-xs truncate text-[11px]">
                        {lead.automation_opportunity || 'General Industrial Automation'}
                      </td>

                      {/* Actions */}
                      <td className="p-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setSelectedLead(lead)}
                          className="p-1.5 rounded bg-industrial-800 hover:bg-industrial-700 text-industrial-300 hover:text-white transition-colors"
                          title="View Lead Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CSV IMPORT MODAL */}
      {showCsvModal && (
        <CsvImportModal
          onClose={() => setShowCsvModal(false)}
          onImportCompleted={() => {
            fetchLeads();
            setToastMessage('CSV leads verified and imported cleanly.');
            setTimeout(() => setToastMessage(null), 4000);
          }}
        />
      )}

      {/* DUPLICATE CLEANUP MODAL */}
      {showDuplicateModal && (
        <DuplicateModal
          onClose={() => setShowDuplicateModal(false)}
          onCleanupCompleted={() => {
            fetchLeads();
            setToastMessage('Duplicates merged and cleaned up.');
            setTimeout(() => setToastMessage(null), 4000);
          }}
        />
      )}

      {/* REFRESH WEBSITES MODAL */}
      {showRefreshModal && (
        <RefreshWebsitesModal
          leads={allLeads}
          onClose={() => setShowRefreshModal(false)}
          onRefreshCompleted={() => {
            fetchLeads();
            setToastMessage('Existing lead websites refreshed and updated successfully.');
            setTimeout(() => setToastMessage(null), 4000);
          }}
        />
      )}

      {/* B2B EMAIL CAMPAIGN COMPOSER MODAL */}
      {showComposerModal && (
        <CampaignComposerModal
          selectedLeads={allLeads.filter((l) => selectedIds.includes(l.id))}
          onClose={() => setShowComposerModal(false)}
          onStartCampaign={(campaign) => {
            setShowComposerModal(false);
            setActiveCampaignProgress(campaign);
          }}
        />
      )}

      {/* CAMPAIGN PROGRESS MODAL */}
      {activeCampaignProgress && (
        <CampaignProgressModal
          campaign={activeCampaignProgress}
          onClose={() => {
            setActiveCampaignProgress(null);
            fetchLeads();
          }}
        />
      )}

      {/* BULK DELETE CONFIRMATION MODAL */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="industrial-card max-w-md w-full p-6 space-y-6 shadow-2xl border-industrial-700 animate-in fade-in duration-150">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-white text-base">Delete {selectedIds.length} Leads?</h3>
                <p className="text-xs text-industrial-400">This action cannot be undone.</p>
              </div>
            </div>

            <div className="p-4 bg-industrial-950 border border-industrial-800 rounded-xl text-xs text-industrial-300 space-y-2">
              <p>
                You are about to permanently delete <strong className="text-white">{selectedIds.length}</strong> selected lead records and associated contact details from your CRM workspace.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 rounded-xl bg-industrial-800 text-industrial-300 font-semibold text-xs hover:bg-industrial-700"
              >
                Cancel
              </button>

              <button
                onClick={handleConfirmBulkDelete}
                disabled={deleting}
                className="px-5 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-xs shadow-lg shadow-red-500/20 disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : `Yes, Delete ${selectedIds.length} Leads`}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
