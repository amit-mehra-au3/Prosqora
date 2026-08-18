import React, { useState } from 'react';
import axios from 'axios';
import {
  X,
  Building,
  MapPin,
  Globe,
  Phone,
  Mail,
  Calendar,
  Clock,
  User,
  Tag,
  CheckCircle,
  AlertCircle,
  Save,
  MessageSquare,
  Sparkles,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Terminal,
  ShieldCheck,
  Activity
} from 'lucide-react';

export default function LeadDetailModal({ lead, onClose, onUpdateLead }) {
  if (!lead) return null;

  const [formData, setFormData] = useState({
    lead_status: lead.lead_status || 'New',
    last_contact: lead.last_contact || '',
    next_followup: lead.next_followup || '',
    followup_count: lead.followup_count || 0,
    contact_method: lead.contact_method || 'Call',
    notes: lead.notes || '',
    contact_person: lead.contact_person || '',
    phone: lead.phone || '',
    email: lead.email || ''
  });

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [showEvidenceDebug, setShowEvidenceDebug] = useState(false);

  // Email Activity & Suppression State
  const [emailLogs, setEmailLogs] = useState([]);
  const [suppressed, setSuppressed] = useState(!!lead.suppressed);

  const [leadActivity, setLeadActivity] = useState([]);

  React.useEffect(() => {
    if (lead && lead.id) {
      fetchEmailHistory();
      fetchLeadActivityHistory();
    }
  }, [lead.id]);

  const fetchEmailHistory = async () => {
    try {
      const res = await axios.get(`/api/leads/${lead.id}/email-history`);
      if (res.data.success) {
        setEmailLogs(res.data.logs || []);
      }
    } catch (e) {}
  };

  const fetchLeadActivityHistory = async () => {
    try {
      const res = await axios.get(`/api/leads/${lead.id}/activity`);
      if (res.data.success) {
        setLeadActivity(res.data.activity || []);
      }
    } catch (e) {}
  };

  const handleToggleSuppression = async (val) => {
    setSuppressed(val);
    try {
      await axios.post(`/api/leads/${lead.id}/suppress`, { suppressed: val });
    } catch (e) {}
  };

  // Parse category list & evidence if string
  let categoryList = [];
  try {
    if (typeof lead.categories === 'string') {
      categoryList = JSON.parse(lead.categories || '[]');
    } else if (Array.isArray(lead.categories)) {
      categoryList = lead.categories;
    }
  } catch (e) {
    categoryList = [];
  }
  if (categoryList.length === 0) categoryList = [lead.category || 'Needs Review'];

  let categoryEvidenceList = [];
  try {
    if (typeof lead.category_evidence === 'string') {
      categoryEvidenceList = JSON.parse(lead.category_evidence || '[]');
    } else if (Array.isArray(lead.category_evidence)) {
      categoryEvidenceList = lead.category_evidence;
    }
  } catch (e) {
    categoryEvidenceList = [];
  }

  // Parse evidence if string
  let evidenceList = [];
  try {
    if (typeof lead.contact_evidence === 'string') {
      evidenceList = JSON.parse(lead.contact_evidence || '[]');
    } else if (Array.isArray(lead.contact_evidence)) {
      evidenceList = lead.contact_evidence;
    }
  } catch (e) {
    evidenceList = [];
  }

  // Parse additional phones if string
  let additionalPhones = [];
  try {
    if (typeof lead.additional_phones === 'string') {
      additionalPhones = JSON.parse(lead.additional_phones || '[]');
    } else if (Array.isArray(lead.additional_phones)) {
      additionalPhones = lead.additional_phones;
    }
  } catch (e) {
    additionalPhones = [];
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');
    try {
      await onUpdateLead(lead.id, formData);
      setSuccessMsg('Lead details updated successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      alert('Failed to update lead details');
    } finally {
      setSaving(false);
    }
  };

  const handleSelectPrimaryPhone = async (phoneObj) => {
    try {
      await onUpdateLead(lead.id, {
        phone: phoneObj.raw_phone,
        normalized_phone: phoneObj.normalized_phone,
        confidence_score: phoneObj.confidence
      });
      setFormData((prev) => ({ ...prev, phone: phoneObj.raw_phone }));
      setSuccessMsg(`Primary phone updated to ${phoneObj.raw_phone}`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (e) {
      alert('Failed to set primary phone');
    }
  };

  const contactMethods = ['Call', 'WhatsApp', 'Email', 'LinkedIn', 'Other'];

  const cleanTel = (formData.phone || '').replace(/[^\d+]/g, '');
  const cleanWa = (lead.whatsapp || formData.phone || '').replace(/[^\d]/g, '');

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-industrial-900 border border-industrial-700 rounded-xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-150">
        
        {/* Modal Header */}
        <div className="p-6 border-b border-industrial-800 flex items-center justify-between bg-industrial-950/80">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-industrial-800 border border-industrial-700 flex items-center justify-center text-brand-orange font-bold text-lg">
              {lead.company_name ? lead.company_name.charAt(0) : 'C'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white tracking-tight">{lead.company_name || 'Lead Details'}</h2>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-industrial-800 text-industrial-300">
                  {lead.lead_id}
                </span>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium lead-status-${lead.lead_status}`}>
                  {lead.lead_status}
                </span>
              </div>
              <p className="text-xs text-industrial-400 mt-1 flex items-center gap-2">
                <Globe className="w-3.5 h-3.5 text-industrial-400" />
                <a href={lead.website} target="_blank" rel="noopener noreferrer" className="hover:underline text-brand-blue font-mono">
                  {lead.website}
                </a>
              </p>

              {/* Category Badges */}
              <div className="flex flex-wrap gap-1 mt-1.5">
                {categoryList.map((cat, idx) => (
                  <span key={idx} className="text-[10px] px-2 py-0.5 rounded font-semibold bg-brand-orange/20 text-brand-orange border border-brand-orange/40">
                    🏷️ {cat}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={lead.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-blue hover:bg-sky-600 text-xs font-semibold text-white shadow-md transition-colors"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Open Website</span>
            </a>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-industrial-400 hover:text-white hover:bg-industrial-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {successMsg && (
            <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Website Verification & Single Source of Truth Status Section */}
          <div className="p-4 bg-industrial-950 rounded-xl border border-industrial-800 space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-brand-orange" />
              <span>Website Verification & Single-Source Status</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs font-mono">
              <div className="p-3 bg-industrial-900 rounded-lg border border-industrial-800">
                <span className="text-[10px] text-industrial-400 block font-sans">Website Status</span>
                <span className={`font-bold mt-1 inline-block px-2 py-0.5 rounded text-[11px] ${
                  (lead.website_status || '').includes('Accessible') || (lead.website_status || '').includes('Reachable') || (lead.website_status || '').includes('Working')
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : (lead.website_status || '').includes('Redirected')
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                }`}>
                  {lead.website_status || '🔴 Not Accessible'}
                </span>
              </div>

              <div className="p-3 bg-industrial-900 rounded-lg border border-industrial-800">
                <span className="text-[10px] text-industrial-400 block font-sans">Verification Status</span>
                <span className={`font-bold mt-1 inline-block px-2 py-0.5 rounded text-[11px] ${
                  lead.verification_status === 'Verified'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}>
                  {lead.verification_status || 'Needs Review'}
                </span>
              </div>

              <div className="p-3 bg-industrial-900 rounded-lg border border-industrial-800">
                <span className="text-[10px] text-industrial-400 block font-sans">Verified At</span>
                <span className="text-white font-bold block mt-1">
                  {lead.verified_at ? new Date(lead.verified_at).toLocaleString() : 'Not Verified'}
                </span>
              </div>

              <div className="p-3 bg-industrial-900 rounded-lg border border-industrial-800">
                <span className="text-[10px] text-industrial-400 block font-sans">Last Website Check</span>
                <span className="text-white font-bold block mt-1">
                  {lead.last_website_check_at ? new Date(lead.last_website_check_at).toLocaleString() : (lead.created_at ? new Date(lead.created_at).toLocaleString() : 'Recently')}
                </span>
              </div>
            </div>
          </div>

          {/* Lead Activity & Audit History Trail Section */}
          <div className="p-4 bg-industrial-950 rounded-xl border border-industrial-800 space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-brand-orange" />
              <span>Lead Activity & Audit Traceability</span>
            </h3>

            {leadActivity.length === 0 ? (
              <p className="text-xs text-industrial-400 font-mono italic p-1">No recorded audit history for this lead yet.</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {leadActivity.map((act) => (
                  <div key={act.id} className="p-2.5 bg-industrial-900 rounded-lg border border-industrial-800 text-xs font-mono flex flex-col md:flex-row md:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{act.user_name || 'User'}</span>
                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                          act.user_role === 'admin' ? 'bg-brand-orange/20 text-brand-orange border border-brand-orange/30' : 'bg-industrial-800 text-industrial-300'
                        }`}>
                          {act.user_role === 'admin' ? 'ADMIN' : 'USER'}
                        </span>
                        <span className="text-emerald-400 font-bold">{act.action}</span>
                      </div>
                      <p className="text-[11px] text-industrial-300 mt-0.5">{act.details}</p>
                    </div>
                    <span className="text-[10px] text-industrial-500 shrink-0">
                      {new Date(act.created_at).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* AI Automation Opportunities Banner */}
          <div className="p-4 bg-gradient-to-r from-brand-orange/10 via-industrial-900 to-amber-500/10 border border-brand-orange/30 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-brand-orange font-semibold text-xs tracking-wider uppercase">
              <Sparkles className="w-4 h-4" />
              <span>Potential Automation Opportunity (AI Suggestions)</span>
            </div>
            <p className="text-slate-200 text-xs leading-relaxed italic">
              "{lead.automation_opportunity || 'General PLC / HMI / VFD control system integration based on company operational profile.'}"
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Left Column: Contact Details */}
            <div className="space-y-4">
              
              {/* Contact Details Card */}
              <div className="industrial-card p-5 space-y-4 border-brand-orange/30">
                <div className="flex items-center justify-between border-b border-industrial-800 pb-2">
                  <h3 className="font-bold text-white text-xs uppercase tracking-wider text-industrial-300 flex items-center gap-2">
                    <Phone className="w-4 h-4 text-brand-orange" />
                    <span>Contact Details</span>
                  </h3>

                  <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    🟢 Verified Extraction
                  </span>
                </div>

                <div className="space-y-4 text-xs">
                  
                  {/* Primary Phone */}
                  <div className="p-3 bg-industrial-950/80 rounded-xl border border-industrial-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-industrial-400 font-semibold text-[11px]">Primary Phone</span>
                      <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        🟢 Verified ({lead.confidence_score || 'HIGH'})
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1">
                      <a
                        href={`tel:${cleanTel}`}
                        className="text-base font-bold text-white font-mono hover:text-brand-orange flex items-center gap-2 transition-colors"
                      >
                        <Phone className="w-4 h-4 text-brand-orange" />
                        <span>{formData.phone || 'Not Found'}</span>
                      </a>

                      <a
                        href={`tel:${cleanTel}`}
                        className="px-2.5 py-1 rounded bg-industrial-800 hover:bg-industrial-700 text-[11px] text-industrial-200 font-mono"
                      >
                        📞 Call
                      </a>
                    </div>

                    {lead.email_source && (
                      <p className="text-[10px] text-industrial-400 pt-1">
                        Source: <span className="text-industrial-200 font-medium">{lead.email_source.split('(')[0] || 'Homepage Header'}</span>
                      </p>
                    )}
                  </div>

                  {/* Additional Phones */}
                  {additionalPhones.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-industrial-400 text-[11px] font-semibold block">Additional Phones Found:</span>
                      <div className="space-y-1">
                        {additionalPhones.map((p, idx) => (
                          <div
                            key={idx}
                            className="p-2 bg-industrial-950/50 rounded-lg border border-industrial-800 flex items-center justify-between"
                          >
                            <a href={`tel:${(p.raw_phone || '').replace(/[^\d+]/g, '')}`} className="font-mono text-industrial-200 hover:text-white">
                              📞 {p.raw_phone}
                            </a>
                            <button
                              type="button"
                              onClick={() => handleSelectPrimaryPhone(p)}
                              className="text-[10px] px-2 py-0.5 rounded bg-industrial-800 hover:bg-brand-orange hover:text-white text-industrial-400"
                            >
                              Set Primary
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Email */}
                  <div className="p-3 bg-industrial-950/80 rounded-xl border border-industrial-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-industrial-400 font-semibold text-[11px]">Email Address</span>
                      {formData.email && (
                        <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          🟢 Verified
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1">
                      <a
                        href={`mailto:${formData.email}`}
                        className="font-bold text-emerald-400 font-mono hover:underline flex items-center gap-2 truncate"
                      >
                        <Mail className="w-4 h-4 shrink-0 text-emerald-400" />
                        <span className="truncate">{formData.email || 'Not Found'}</span>
                      </a>

                      {formData.email && (
                        <a
                          href={`mailto:${formData.email}`}
                          className="px-2.5 py-1 rounded bg-industrial-800 hover:bg-industrial-700 text-[11px] text-emerald-300 font-mono shrink-0"
                        >
                          ✉️ Mail
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Do Not Contact Suppression Option */}
                  <div className="p-2.5 bg-industrial-950/80 rounded-xl border border-industrial-800 flex items-center justify-between">
                    <label className="flex items-center gap-2 text-xs font-semibold text-industrial-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={suppressed}
                        onChange={(e) => handleToggleSuppression(e.target.checked)}
                        className="rounded border-industrial-700 text-red-500 focus:ring-red-500 bg-industrial-900"
                      />
                      <span>Mark as Do Not Contact (Suppress from campaigns)</span>
                    </label>
                    {suppressed && (
                      <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                        🚫 Suppressed
                      </span>
                    )}
                  </div>

                  {/* Email Activity History Log */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-industrial-400 font-bold text-xs uppercase tracking-wider block">
                      Email Activity History ({emailLogs.length})
                    </span>

                    <div className="max-h-36 overflow-y-auto p-2.5 bg-industrial-950/80 rounded-xl border border-industrial-800 space-y-1.5 text-xs font-mono">
                      {emailLogs.length === 0 ? (
                        <p className="text-industrial-500 text-[11px]">No emails sent to this company yet.</p>
                      ) : (
                        emailLogs.map((log) => (
                          <div key={log.id} className="p-2 bg-industrial-900 rounded border border-industrial-800 space-y-0.5">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-white text-[11px] truncate max-w-xs">{log.subject}</span>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                                log.status === 'Sent' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                              }`}>
                                {log.status}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-industrial-400">
                              <span>To: {log.recipient_email}</span>
                              <span>{new Date(log.sent_at || Date.now()).toLocaleDateString()}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* WhatsApp */}
                  {lead.whatsapp && (
                    <div className="p-3 bg-emerald-500/5 border border-emerald-500/30 rounded-xl flex items-center justify-between">
                      <div>
                        <span className="text-[11px] text-industrial-400 font-semibold block">WhatsApp Business</span>
                        <span className="text-xs font-bold text-emerald-400 font-mono">{lead.whatsapp}</span>
                      </div>

                      <a
                        href={lead.whatsapp_url || `https://wa.me/${cleanWa}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-colors"
                      >
                        💬 Chat
                      </a>
                    </div>
                  )}

                </div>
              </div>

              {/* Company Info */}
              <div className="industrial-card p-5 space-y-3">
                <h3 className="font-bold text-white text-xs uppercase tracking-wider text-industrial-300 flex items-center gap-2 border-b border-industrial-800 pb-2">
                  <Building className="w-4 h-4 text-brand-orange" />
                  <span>Company Location & Profile</span>
                </h3>

                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-industrial-400 block text-[11px]">City / Location</span>
                    <span className="text-white font-semibold">{lead.location || `${lead.city}, ${lead.state}`}</span>
                  </div>

                  <div>
                    <span className="text-industrial-400 block text-[11px]">Address</span>
                    <span className="text-industrial-200">{lead.address || 'Address not explicitly listed on homepage.'}</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Right Column: CRM Controls */}
            <form onSubmit={handleSave} className="space-y-4">
              
              <div className="industrial-card p-5 space-y-4 border-amber-500/30">
                <h3 className="font-bold text-white text-xs uppercase tracking-wider text-amber-400 flex items-center gap-2 border-b border-industrial-800 pb-2">
                  <Calendar className="w-4 h-4" />
                  <span>CRM Pipeline & Follow-up Scheduler</span>
                </h3>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="text-industrial-400 block text-[11px] mb-1">Contact Person Name</label>
                    <input
                      type="text"
                      name="contact_person"
                      value={formData.contact_person}
                      onChange={handleChange}
                      placeholder="e.g. Sales Manager, General Manager"
                      className="industrial-input w-full text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-industrial-400 block text-[11px] mb-1">Lead Pipeline Status</label>
                      <select
                        name="lead_status"
                        value={formData.lead_status}
                        onChange={handleChange}
                        className="industrial-input w-full text-xs font-semibold"
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
                    </div>

                    <div>
                      <label className="text-industrial-400 block text-[11px] mb-1">Preferred Contact Method</label>
                      <select
                        name="contact_method"
                        value={formData.contact_method}
                        onChange={handleChange}
                        className="industrial-input w-full text-xs"
                      >
                        {contactMethods.map((method) => (
                          <option key={method} value={method}>
                            {method}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-industrial-400 block text-[11px] mb-1">Last Contact Date</label>
                      <input
                        type="date"
                        name="last_contact"
                        value={formData.last_contact}
                        onChange={handleChange}
                        className="industrial-input w-full text-xs"
                      />
                    </div>

                    <div>
                      <label className="text-industrial-400 block text-[11px] mb-1">Next Follow-up Date</label>
                      <input
                        type="date"
                        name="next_followup"
                        value={formData.next_followup}
                        onChange={handleChange}
                        className="industrial-input w-full text-xs font-bold text-amber-300"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-industrial-400 block text-[11px] mb-1">Notes & Interactions</label>
                    <textarea
                      name="notes"
                      rows="3"
                      value={formData.notes}
                      onChange={handleChange}
                      placeholder="Add follow-up notes, phone call log..."
                      className="industrial-input w-full text-xs resize-none"
                    ></textarea>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand-orange hover:bg-orange-600 text-white font-bold text-xs shadow-lg shadow-brand-orange/20 transition-all"
                    >
                      <Save className="w-4 h-4" />
                      <span>{saving ? 'Saving...' : 'Save Follow-up Details'}</span>
                    </button>
                  </div>
                </div>
              </div>

            </form>

          </div>

          {/* Extraction Evidence Debug Section */}
          <div className="industrial-card p-4 bg-industrial-950/80 border-industrial-800 space-y-4">
            <button
              onClick={() => setShowEvidenceDebug(!showEvidenceDebug)}
              className="w-full flex items-center justify-between text-xs font-semibold text-industrial-300 hover:text-white"
            >
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-brand-orange" />
                <span>Extraction & Category Evidence Audit ({categoryEvidenceList.length + evidenceList.length} items)</span>
              </div>
              {showEvidenceDebug ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showEvidenceDebug && (
              <div className="mt-3 pt-3 border-t border-industrial-800 space-y-4 font-mono text-[11px]">
                
                {/* Category Classification Reasons */}
                {categoryEvidenceList.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                      🏷️ Industry Category Classification Reasons:
                    </span>
                    {categoryEvidenceList.map((ce, idx) => (
                      <div key={idx} className="p-2.5 bg-industrial-900 rounded border border-amber-500/30 space-y-1">
                        <div className="text-amber-300 font-bold">Category: {ce.category}</div>
                        <p className="text-industrial-300 text-[11px]">{ce.evidence}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Contact Extraction Logs */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-brand-orange uppercase tracking-wider block">
                    📞 Contact Details Ground-Truth Evidence:
                  </span>
                  {evidenceList.length === 0 ? (
                    <p className="text-industrial-400">No raw contact evidence logs attached.</p>
                  ) : (
                    evidenceList.map((item, idx) => (
                      <div key={idx} className="p-2.5 bg-industrial-900 rounded border border-industrial-800 space-y-1">
                        <div className="flex items-center justify-between text-brand-orange font-bold">
                          <span>[{item.type}] {item.value}</span>
                          <span className="text-[10px] text-emerald-400">Confidence: {item.confidence}</span>
                        </div>
                        <p className="text-industrial-300">Source Section: <strong>{item.source}</strong></p>
                        <p className="text-industrial-400 text-[10px] truncate">URL: {item.sourceUrl}</p>
                      </div>
                    ))
                  )}
                </div>

              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
