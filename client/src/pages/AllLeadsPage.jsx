import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import CrmFilterBar from '../components/CrmFilterBar';
import {
  Database,
  Download,
  FileSpreadsheet,
  Trash2,
  ExternalLink,
  Eye,
  CheckSquare,
  Square,
  Sparkles,
  Phone,
  Mail,
  MessageSquare
} from 'lucide-react';

export default function AllLeadsPage({ setSelectedLead, refreshTrigger }) {
  const [allLeads, setAllLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);

  // Complex Filter State
  const [filters, setFilters] = useState({
    search: '',
    cities: [],
    states: [],
    categories: [],
    categoryMatchMode: 'ANY', // 'ANY' or 'ALL'
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
      // 1. Search text filter
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const searchableText = `${lead.company_name} ${lead.website} ${lead.phone} ${lead.email} ${lead.location} ${lead.city} ${lead.state} ${lead.products} ${lead.services} ${lead.notes}`.toLowerCase();
        if (!searchableText.includes(q)) return false;
      }

      // 2. Lead Status filter
      if (filters.leadStatus && filters.leadStatus !== 'All') {
        if (lead.lead_status !== filters.leadStatus) return false;
      }

      // 3. Website Status filter
      if (filters.websiteStatus && filters.websiteStatus !== 'All') {
        if (!lead.website_status.includes(filters.websiteStatus)) return false;
      }

      // 4. City filter
      if (filters.cities && filters.cities.length > 0) {
        const leadCity = (lead.city || '').toLowerCase();
        const leadLoc = (lead.location || '').toLowerCase();
        const matchCity = filters.cities.some((c) => leadCity.includes(c.toLowerCase()) || leadLoc.includes(c.toLowerCase()));
        if (!matchCity) return false;
      }

      // 5. State filter
      if (filters.states && filters.states.length > 0) {
        const leadState = (lead.state || '').toLowerCase();
        const matchState = filters.states.some((s) => leadState.includes(s.toLowerCase()));
        if (!matchState) return false;
      }

      // 6. Contact Availability checkboxes
      if (filters.hasPhone && !lead.phone) return false;
      if (filters.hasEmail && !lead.email) return false;
      if (filters.hasWhatsApp && !lead.whatsapp) return false;
      if (filters.hasContactPerson && !lead.contact_person) return false;

      // 7. Categories multi-select filter (Match Any vs Match All)
      if (filters.categories && filters.categories.length > 0) {
        let leadCats = [];
        try {
          leadCats = typeof lead.categories === 'string' ? JSON.parse(lead.categories || '[]') : lead.categories;
        } catch (e) {
          leadCats = [lead.category];
        }
        if (!leadCats || leadCats.length === 0) leadCats = [lead.category || 'Needs Review'];

        if (filters.categoryMatchMode === 'ALL') {
          const matchAll = filters.categories.every((c) => leadCats.includes(c));
          if (!matchAll) return false;
        } else {
          const matchAny = filters.categories.some((c) => leadCats.includes(c));
          if (!matchAny) return false;
        }
      }

      // 8. Automation Opportunity filter
      if (filters.opportunities && filters.opportunities.length > 0) {
        const oppText = (lead.automation_opportunity || '').toUpperCase();
        const matchOpp = filters.opportunities.some((o) => oppText.includes(o.toUpperCase()));
        if (!matchOpp) return false;
      }

      return true;
    });
  }, [allLeads, filters]);

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

  const handleDeleteLead = async (leadId) => {
    if (!window.confirm('Are you sure you want to delete this lead?')) return;
    try {
      await axios.delete(`/api/leads/${leadId}`);
      setAllLeads((prev) => prev.filter((l) => l.id !== leadId));
      setSelectedIds((prev) => prev.filter((id) => id !== leadId));
    } catch (err) {
      alert('Failed to delete lead');
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredLeads.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredLeads.map((l) => l.id));
    }
  };

  const toggleSelectRow = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleExportSelected = (type) => {
    if (selectedIds.length === 0) {
      window.location.href = `/api/export/${type}`;
    } else {
      window.location.href = `/api/export/${type}?ids=${selectedIds.join(',')}`;
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-[100rem] mx-auto">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">All CRM Leads</h1>
          <p className="text-xs text-industrial-400 mt-1">
            Spreadsheet CRM database for industrial automation prospects.
          </p>
        </div>

        <div className="flex items-center gap-3">
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
        </div>
      </div>

      {/* Advanced Filter Bar Component */}
      <CrmFilterBar
        filters={filters}
        setFilters={setFilters}
        totalCount={allLeads.length}
        filteredCount={filteredLeads.length}
      />

      {/* CRM Spreadsheet Table */}
      <div className="industrial-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-industrial-950/80 border-b border-industrial-800 text-industrial-400 uppercase tracking-wider text-[11px] font-semibold">
                <th className="p-3 w-10 text-center">
                  <button onClick={toggleSelectAll} className="text-industrial-400 hover:text-white">
                    {selectedIds.length === filteredLeads.length && filteredLeads.length > 0 ? (
                      <CheckSquare className="w-4 h-4 text-brand-orange" />
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
                <th className="p-3">Lead Status</th>
                <th className="p-3">Automation Opportunities</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-industrial-800/60">
              {loading ? (
                <tr>
                  <td colSpan="12" className="p-8 text-center text-industrial-400">
                    Loading CRM database...
                  </td>
                </tr>
              ) : filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan="12" className="p-8 text-center text-industrial-400 space-y-2">
                    <p className="font-semibold text-white">No leads found matching your criteria</p>
                    <p className="text-[11px]">Try clearing or broadening your filters.</p>
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => {
                  const isSelected = selectedIds.includes(lead.id);

                  // Parse category badges
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
                      className={`hover:bg-industrial-800/40 transition-colors ${
                        isSelected ? 'bg-brand-orange/5' : ''
                      }`}
                    >
                      <td className="p-3 text-center">
                        <button onClick={() => toggleSelectRow(lead.id)} className="text-industrial-400 hover:text-white">
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-brand-orange" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      {/* Company Name */}
                      <td className="p-3 font-bold text-white max-w-xs truncate">
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
                              className="text-[10px] px-2 py-0.5 rounded font-medium bg-industrial-800 text-amber-300 border border-industrial-700 truncate max-w-[11rem]"
                            >
                              {cat}
                            </span>
                          ))}
                          {categoryList.length > 3 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-industrial-800 text-industrial-400 font-mono">
                              +{categoryList.length - 3}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Website */}
                      <td className="p-3 font-mono text-[11px]">
                        <a
                          href={lead.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-brand-blue hover:underline flex items-center gap-1 max-w-[10rem] truncate"
                        >
                          <span className="truncate">{lead.website.replace(/^https?:\/\//, '')}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      </td>

                      {/* Phone */}
                      <td className="p-3 font-mono text-xs max-w-[9rem] truncate">
                        {lead.phone ? (
                          <a href={`tel:${cleanTel}`} className="text-white hover:text-brand-orange">
                            📞 {lead.phone}
                          </a>
                        ) : (
                          <span className="text-industrial-500">—</span>
                        )}
                      </td>

                      {/* Email */}
                      <td className="p-3 font-mono text-xs max-w-[10rem] truncate">
                        {lead.email ? (
                          <a href={`mailto:${lead.email}`} className="text-emerald-400 hover:underline">
                            ✉️ {lead.email}
                          </a>
                        ) : (
                          <span className="text-industrial-500">—</span>
                        )}
                      </td>

                      {/* Website Status */}
                      <td className="p-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded font-medium badge-${lead.website_status.replace(/[^a-zA-Z]/g, '').toLowerCase()}`}>
                          {lead.website_status}
                        </span>
                      </td>

                      {/* Lead Status Dropdown */}
                      <td className="p-3">
                        <select
                          value={lead.lead_status}
                          onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                          className={`text-xs px-2 py-1 rounded font-medium border cursor-pointer focus:outline-none lead-status-${lead.lead_status}`}
                        >
                          <option value="New">New</option>
                          <option value="Contacted">Contacted</option>
                          <option value="Follow-up">Follow-up</option>
                          <option value="Interested">Interested</option>
                          <option value="Meeting">Meeting</option>
                          <option value="Proposal Sent">Proposal Sent</option>
                          <option value="Converted">Converted</option>
                          <option value="Not Interested">Not Interested</option>
                          <option value="No Response">No Response</option>
                        </select>
                      </td>

                      {/* Automation Opportunities */}
                      <td className="p-3 text-industrial-300 text-[11px] max-w-[14rem] truncate">
                        {lead.automation_opportunity ? (
                          <span title={lead.automation_opportunity} className="italic">
                            {lead.automation_opportunity.replace('Potential opportunity: ', '')}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedLead(lead)}
                            className="p-1.5 rounded bg-industrial-800 hover:bg-industrial-700 text-industrial-300 hover:text-white"
                            title="View Full Profile"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteLead(lead.id)}
                            className="p-1.5 rounded bg-industrial-800 hover:bg-red-500/20 text-industrial-400 hover:text-red-400"
                            title="Delete Lead"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
