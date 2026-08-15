import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  CalendarCheck,
  Clock,
  Calendar,
  AlertTriangle,
  Phone,
  MessageSquare,
  Mail,
  Linkedin,
  PlusCircle,
  CheckCircle,
  ExternalLink,
  Edit,
  Save
} from 'lucide-react';

export default function FollowupsPage({ setSelectedLead }) {
  const [activeTab, setActiveTab] = useState('dueToday'); // 'dueToday', 'upcoming', 'overdue'
  const [data, setData] = useState({
    dueToday: [],
    upcoming: [],
    overdue: []
  });
  const [loading, setLoading] = useState(true);

  // Quick edit modal state
  const [editingLead, setEditingLead] = useState(null);

  useEffect(() => {
    fetchFollowups();
  }, []);

  const fetchFollowups = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/followups');
      if (res.data.success) {
        setData({
          dueToday: res.data.dueToday || [],
          upcoming: res.data.upcoming || [],
          overdue: res.data.overdue || []
        });
      }
    } catch (err) {
      console.error('Failed to fetch followups:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSave = async (updatedLead) => {
    try {
      await axios.put(`/api/leads/${updatedLead.id}`, {
        last_contact: updatedLead.last_contact,
        next_followup: updatedLead.next_followup,
        followup_count: updatedLead.followup_count,
        contact_method: updatedLead.contact_method,
        notes: updatedLead.notes,
        lead_status: updatedLead.lead_status
      });
      setEditingLead(null);
      fetchFollowups();
    } catch (err) {
      alert('Error updating follow-up');
    }
  };

  const currentList = data[activeTab] || [];

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">Follow-up Management</h1>
        <p className="text-xs text-industrial-400 mt-1">
          Track upcoming client calls, meetings, WhatsApp inquiries, and overdue follow-ups.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-3 border-b border-industrial-800 pb-px">
        <button
          onClick={() => setActiveTab('dueToday')}
          className={`flex items-center gap-2 px-4 py-2.5 font-semibold text-xs border-b-2 transition-all ${
            activeTab === 'dueToday'
              ? 'border-brand-orange text-brand-orange bg-brand-orange/5'
              : 'border-transparent text-industrial-400 hover:text-white'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Due Today ({data.dueToday.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('upcoming')}
          className={`flex items-center gap-2 px-4 py-2.5 font-semibold text-xs border-b-2 transition-all ${
            activeTab === 'upcoming'
              ? 'border-brand-orange text-brand-orange bg-brand-orange/5'
              : 'border-transparent text-industrial-400 hover:text-white'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Upcoming ({data.upcoming.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('overdue')}
          className={`flex items-center gap-2 px-4 py-2.5 font-semibold text-xs border-b-2 transition-all ${
            activeTab === 'overdue'
              ? 'border-red-500 text-red-400 bg-red-500/5'
              : 'border-transparent text-industrial-400 hover:text-white'
          }`}
        >
          <AlertTriangle className="w-4 h-4 text-red-400" />
          <span>Overdue ({data.overdue.length})</span>
        </button>
      </div>

      {/* Follow-ups List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {loading ? (
          <div className="col-span-2 text-center p-12 text-industrial-400 text-xs">
            Loading follow-up schedule...
          </div>
        ) : currentList.length === 0 ? (
          <div className="col-span-2 text-center p-12 industrial-card text-industrial-400 text-xs space-y-2">
            <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto" />
            <p className="font-semibold text-white">No follow-ups in this tab</p>
            <p>You're all caught up with your client outreach!</p>
          </div>
        ) : (
          currentList.map((lead) => (
            <div
              key={lead.id}
              className="industrial-card p-6 space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-white text-base">{lead.company_name}</h3>
                    <p className="text-xs text-industrial-400 font-mono mt-0.5">{lead.website}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium lead-status-${lead.lead_status}`}>
                    {lead.lead_status}
                  </span>
                </div>

                <div className="p-3 bg-industrial-950/70 border border-industrial-800 rounded-lg space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-industrial-400">Contact Method:</span>
                    <span className="font-semibold text-brand-orange">{lead.contact_method || 'Call'}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-industrial-400">Phone:</span>
                    <span className="font-mono text-white">{lead.phone || 'N/A'}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-industrial-400">Email:</span>
                    <span className="font-mono text-emerald-400">{lead.email || 'N/A'}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-industrial-400">Next Follow-up:</span>
                    <span className="font-mono text-amber-300 font-bold">{lead.next_followup}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-industrial-400">Follow-up Count:</span>
                    <span className="font-mono text-white">{lead.followup_count || 0}</span>
                  </div>

                  {lead.notes && (
                    <div className="pt-2 border-t border-industrial-800/80">
                      <span className="text-industrial-400 text-[10px] uppercase font-semibold block">Notes:</span>
                      <p className="text-industrial-300 text-xs italic mt-0.5">{lead.notes}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-industrial-800 flex items-center justify-between">
                <button
                  onClick={() => setSelectedLead(lead)}
                  className="text-xs text-brand-blue hover:underline font-medium flex items-center gap-1"
                >
                  <span>Full Profile</span>
                  <ExternalLink className="w-3 h-3" />
                </button>

                <button
                  onClick={() => setEditingLead({ ...lead })}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-brand-orange hover:bg-orange-600 text-xs font-semibold text-white transition-colors"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Update Follow-up</span>
                </button>
              </div>

            </div>
          ))
        )}
      </div>

      {/* Quick Edit Follow-up Modal */}
      {editingLead && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-industrial-900 border border-industrial-700 rounded-xl w-full max-w-md p-6 space-y-4">
            <h3 className="font-bold text-white text-base">Update Follow-up — {editingLead.company_name}</h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-industrial-400 block mb-1">Lead Status</label>
                <select
                  value={editingLead.lead_status}
                  onChange={(e) => setEditingLead({ ...editingLead, lead_status: e.target.value })}
                  className="industrial-input w-full"
                >
                  <option value="New">New</option>
                  <option value="Contacted">Contacted</option>
                  <option value="Follow-up">Follow-up</option>
                  <option value="Interested">Interested</option>
                  <option value="Meeting">Meeting</option>
                  <option value="Proposal Sent">Proposal Sent</option>
                  <option value="Converted">Converted</option>
                  <option value="Not Interested">Not Interested</option>
                </select>
              </div>

              <div>
                <label className="text-industrial-400 block mb-1">Contact Method</label>
                <select
                  value={editingLead.contact_method}
                  onChange={(e) => setEditingLead({ ...editingLead, contact_method: e.target.value })}
                  className="industrial-input w-full"
                >
                  <option value="Call">Call</option>
                  <option value="WhatsApp">WhatsApp</option>
                  <option value="Email">Email</option>
                  <option value="LinkedIn">LinkedIn</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-industrial-400 block mb-1">Last Contact Date</label>
                  <input
                    type="date"
                    value={editingLead.last_contact || ''}
                    onChange={(e) => setEditingLead({ ...editingLead, last_contact: e.target.value })}
                    className="industrial-input w-full text-xs"
                  />
                </div>

                <div>
                  <label className="text-industrial-400 block mb-1">Next Follow-up Date</label>
                  <input
                    type="date"
                    value={editingLead.next_followup || ''}
                    onChange={(e) => setEditingLead({ ...editingLead, next_followup: e.target.value })}
                    className="industrial-input w-full text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-industrial-400 block mb-1">Follow-up Count</label>
                <input
                  type="number"
                  value={editingLead.followup_count || 0}
                  onChange={(e) => setEditingLead({ ...editingLead, followup_count: parseInt(e.target.value, 10) || 0 })}
                  className="industrial-input w-full text-xs"
                />
              </div>

              <div>
                <label className="text-industrial-400 block mb-1">Interaction Notes</label>
                <textarea
                  rows="3"
                  value={editingLead.notes || ''}
                  onChange={(e) => setEditingLead({ ...editingLead, notes: e.target.value })}
                  placeholder="Record outcome of phone call or email..."
                  className="industrial-input w-full text-xs resize-none"
                ></textarea>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setEditingLead(null)}
                className="px-4 py-2 rounded-lg bg-industrial-800 text-industrial-300 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => handleQuickSave(editingLead)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-orange hover:bg-orange-600 text-white text-xs font-bold"
              >
                <Save className="w-4 h-4" />
                <span>Save Follow-up</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
