import { OFFICIAL_AM_BUSINESS_CARD } from '../utils/emailHtmlGenerator';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Mail,
  X,
  Send,
  Sparkles,
  AlertCircle,
  CheckCircle,
  Clock,
  Info,
  Upload,
  Image as ImageIcon,
  Trash2,
  Eye,
  RefreshCw,
  FlaskConical,
  FileText,
  UserCheck,
  CheckSquare,
  Square,
  Users
} from 'lucide-react';

export default function CampaignComposerModal({
  selectedLeadIds = [],
  onClose,
  onCampaignCreated,
  gmailStatus = {}
}) {
  const [allLeadsList, setAllLeadsList] = useState([]);
  const [activeLeadIds, setActiveLeadIds] = useState(selectedLeadIds || []);

  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [campaignName, setCampaignName] = useState('');

  const [subject, setSubject] = useState('Industrial Automation Products & Solutions – AM Automation Trading');
  const [body, setBody] = useState(`Dear {{contact_name}},

Greetings from {{business_name}}.

We deal in Industrial Automation Products & Components for manufacturing industries, machine builders, system integrators, and industrial applications.

Our product range includes:
• PLC & PLC Modules
• HMI & Touch Panels
• AC Drives / VFDs
• Servo Motors & Servo Drives
• Sensors & Switches
• Contactors, Relays & Switchgear

We can assist with product selection, model identification, competitive quotations, and sourcing support based on your requirement.

If you have any current or upcoming requirement, please reply with your Brand, Part Number, and Quantity. We will be happy to provide a suitable quotation.

Best Regards,
{{sender_name}}
{{business_name}}
Phone: {{phone}}
Email: {{email}}`);

  const [businessCardImage, setBusinessCardImage] = useState(OFFICIAL_AM_BUSINESS_CARD);
  const [attachBusinessCard, setAttachBusinessCard] = useState(true);

  const [audit, setAudit] = useState(null);
  const [allowPreviouslyContacted, setAllowPreviouslyContacted] = useState(false);
  const [isTestMode, setIsTestMode] = useState(false);
  const [testEmail, setTestEmail] = useState('amautomationtrading@gmail.com');
  const [dailyLimit, setDailyLimit] = useState(499);

  const [creating, setCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Test Email Modal state
  const [showTestModal, setShowTestModal] = useState(false);
  const [testModalEmail, setTestModalEmail] = useState('amautomationtrading@gmail.com');
  const [sendingTestModal, setSendingTestModal] = useState(false);
  const [testResultMsg, setTestResultMsg] = useState('');

  useEffect(() => {
    fetchLeadsAndTemplates();
  }, []);

  useEffect(() => {
    if (activeLeadIds.length > 0) {
      fetchAudit(activeLeadIds);
    } else {
      setAudit(null);
    }
  }, [activeLeadIds, allowPreviouslyContacted, isTestMode, testEmail]);

  const fetchLeadsAndTemplates = async () => {
    try {
      const [leadsRes, tplRes] = await Promise.all([
        axios.get('/api/leads?limit=3000'),
        axios.get('/api/email-templates')
      ]);

      if (leadsRes.data.success || Array.isArray(leadsRes.data.leads)) {
        const leads = leadsRes.data.leads || [];
        setAllLeadsList(leads);

        // If no lead IDs were selected prior, auto-select all leads with valid email
        if (!selectedLeadIds || selectedLeadIds.length === 0) {
          const emailLeadIds = leads
            .filter((l) => l.email && l.email.trim() && l.email.includes('@'))
            .map((l) => l.id);
          setActiveLeadIds(emailLeadIds);
        } else {
          setActiveLeadIds(selectedLeadIds);
        }
      }

      if (tplRes.data.success) {
        setTemplates(tplRes.data.templates);
        const def = tplRes.data.templates.find((t) => t.is_default) || tplRes.data.templates[0];
        if (def) {
          setSelectedTemplateId(def.id);
          if (def.subject) setSubject(def.subject);
          if (def.body) setBody(def.body);
          if (def.business_card_image) setBusinessCardImage(def.business_card_image);
        }
      }
    } catch (err) {}
  };

  const fetchAudit = async (leadIdsToAudit = activeLeadIds) => {
    if (!leadIdsToAudit || leadIdsToAudit.length === 0) {
      setAudit(null);
      return;
    }
    try {
      const res = await axios.post('/api/email-campaigns/audit', {
        leadIds: leadIdsToAudit,
        allowPreviouslyContacted,
        isTestMode,
        testEmail
      });
      if (res.data.success) {
        setAudit(res.data.audit);
      }
    } catch (err) {}
  };

  const selectAllEmailLeads = () => {
    const emailLeadIds = allLeadsList
      .filter((l) => l.email && l.email.trim() && l.email.includes('@'))
      .map((l) => l.id);
    setActiveLeadIds(emailLeadIds);
  };

  const selectAllLeads = () => {
    const allIds = allLeadsList.map((l) => l.id);
    setActiveLeadIds(allIds);
  };

  const clearSelection = () => {
    setActiveLeadIds([]);
  };

  const handleTemplateChange = (e) => {
    const tplId = e.target.value;
    setSelectedTemplateId(tplId);
    const tpl = templates.find((t) => String(t.id) === String(tplId));
    if (tpl) {
      setSubject(tpl.subject);
      setBody(tpl.body);
      if (tpl.business_card_image) {
        setBusinessCardImage(tpl.business_card_image);
      }
    }
  };

  const insertVariable = (varTag) => {
    setBody((prev) => prev + ` ${varTag} `);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('Business card image must be smaller than 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      setBusinessCardImage(evt.target.result);
      setAttachBusinessCard(true);
    };
    reader.readAsDataURL(file);
  };

  const handleStartCampaignSubmit = async (e) => {
    e.preventDefault();
    if (activeLeadIds.length === 0) {
      alert('Please select at least one recipient lead to start the email campaign.');
      return;
    }

    setCreating(true);
    setErrorMessage('');

    try {
      const createRes = await axios.post('/api/email-campaigns', {
        name: campaignName || `AM Automation Trading B2B Outreach (${new Date().toLocaleDateString()})`,
        subject,
        body,
        businessCardImage: attachBusinessCard ? businessCardImage : '',
        leadIds: activeLeadIds,
        allowPreviouslyContacted,
        isTestMode,
        testEmail,
        dailyLimit
      });

      if (createRes.data.success) {
        const campaign = createRes.data.campaign;
        await axios.post(`/api/email-campaigns/${campaign.campaign_id}/start`);
        if (onCampaignCreated) onCampaignCreated(campaign);
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.error || 'Failed to start email campaign.');
    } finally {
      setCreating(false);
    }
  };

  const handleSendTestEmail = async () => {
    setSendingTestModal(true);
    setTestResultMsg('');
    try {
      const dummyLead = {
        company_name: 'Sample Industrial Client',
        contact_person: 'Rahul Sharma',
        email: testModalEmail,
        phone: '+91 98765 43210',
        city: 'Gurgaon'
      };

      const testSubject = subject.replace(/\{\{\s*company_name\s*\}\}/gi, dummyLead.company_name);
      let testBody = body
        .replace(/\{\{\s*contact_name\s*\}\}/gi, dummyLead.contact_person)
        .replace(/\{\{\s*company_name\s*\}\}/gi, dummyLead.company_name)
        .replace(/\{\{\s*business_name\s*\}\}/gi, 'AM Automation Trading')
        .replace(/\{\{\s*sender_name\s*\}\}/gi, 'Amit Mehra')
        .replace(/\{\{\s*phone\s*\}\}/gi, '+91 86072 85969')
        .replace(/\{\{\s*email\s*\}\}/gi, 'amautomationtrading@gmail.com');

      const res = await axios.post('/api/gmail/send-test-email', {
        recipientEmail: testModalEmail,
        subject: testSubject,
        body: testBody,
        businessCardImage: attachBusinessCard ? businessCardImage : ''
      });

      if (res.data.success) {
        setTestResultMsg(`✅ ${res.data.message}`);
      }
    } catch (err) {
      setTestResultMsg(`❌ ${err.response?.data?.error || 'Failed to send test email.'}`);
    } finally {
      setSendingTestModal(false);
    }
  };

  const totalWithEmail = allLeadsList.filter((l) => l.email && l.email.trim() && l.email.includes('@')).length;

  const previewBody = body
    .replace(/\{\{\s*contact_name\s*\}\}/gi, 'Rahul Sharma')
    .replace(/\{\{\s*company_name\s*\}\}/gi, 'ABC Robotics & Automation Ltd')
    .replace(/\{\{\s*business_name\s*\}\}/gi, 'AM Automation Trading')
    .replace(/\{\{\s*sender_name\s*\}\}/gi, 'Amit Mehra')
    .replace(/\{\{\s*phone\s*\}\}/gi, '+91 86072 85969')
    .replace(/\{\{\s*email\s*\}\}/gi, 'amautomationtrading@gmail.com')
    .replace(/\{\{\s*city\s*\}\}/gi, 'Gurgaon');

  const previewSubject = subject.replace(/\{\{\s*company_name\s*\}\}/gi, 'ABC Robotics & Automation Ltd');

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 overflow-y-auto">
      <div className="industrial-card w-full max-w-7xl max-h-[95vh] flex flex-col overflow-hidden shadow-2xl border-industrial-700 animate-in fade-in duration-200">
        
        {/* Modal Header */}
        <div className="p-4 bg-industrial-900 border-b border-industrial-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-orange/20 border border-brand-orange/40 flex items-center justify-center text-brand-orange">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-white text-base">Launch B2B Email Campaign — AM Automation Trading</h2>
              <p className="text-xs text-industrial-400">
                Compose, select leads, preview, and start bulk outreach through connected official Gmail API.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-industrial-400 hover:text-white hover:bg-industrial-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Lead Selection Quick Bar */}
        <div className="p-3.5 bg-industrial-950 border-b border-industrial-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2 text-industrial-300">
            <Users className="w-4 h-4 text-brand-orange" />
            <span>
              Recipients Selected: <strong className="text-white font-bold">{activeLeadIds.length}</strong> / {allLeadsList.length} total leads
            </span>
          </div>

          {/* Quick Lead Selection Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={selectAllEmailLeads}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-orange/20 hover:bg-brand-orange/30 text-brand-orange font-bold border border-brand-orange/40 transition-all"
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>Select All With Email ({totalWithEmail})</span>
            </button>

            <button
              type="button"
              onClick={selectAllLeads}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-industrial-800 hover:bg-industrial-700 text-industrial-300 font-bold border border-industrial-700 transition-all"
            >
              <span>Select All ({allLeadsList.length})</span>
            </button>

            {activeLeadIds.length > 0 && (
              <button
                type="button"
                onClick={clearSelection}
                className="px-3 py-1.5 rounded-lg bg-industrial-900 hover:bg-industrial-800 text-industrial-400 font-bold border border-industrial-800 transition-all"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Modal Main Split Body */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12">
          
          {/* LEFT PANE: CONTROLS & EDITOR (Col 7) */}
          <form onSubmit={handleStartCampaignSubmit} className="lg:col-span-7 overflow-y-auto p-5 space-y-5 border-r border-industrial-800">
            
            {errorMessage && (
              <div className="p-3 bg-red-500/20 border border-red-500/40 rounded-xl text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Campaign Name & Template Selector */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-industrial-300">Campaign Name</label>
                <input
                  type="text"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder={`AM Automation Trading Outreach (${new Date().toLocaleDateString()})`}
                  className="industrial-input w-full text-xs font-semibold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-industrial-300">Load Email Template</label>
                <select
                  value={selectedTemplateId}
                  onChange={handleTemplateChange}
                  className="industrial-input w-full text-xs font-semibold"
                >
                  <option value="">-- Select Saved Template --</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} {t.is_default ? '(Default)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Subject Line Input */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-industrial-300">Subject Line</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="industrial-input w-full text-xs font-mono font-medium text-white"
                required
              />
            </div>

            {/* Variable Chips */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-industrial-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-brand-orange" />
                <span>Personalization Variables</span>
              </label>
              <div className="flex flex-wrap items-center gap-1.5">
                {['{{contact_name}}', '{{company_name}}', '{{business_name}}', '{{sender_name}}', '{{phone}}', '{{email}}'].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => insertVariable(tag)}
                    className="px-2.5 py-1 rounded-lg bg-industrial-900 hover:bg-industrial-800 border border-industrial-800 text-[11px] font-mono text-brand-orange font-bold"
                  >
                    + {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Email Body Text Area */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-industrial-300">Email Body HTML / Content</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={9}
                className="industrial-input w-full text-xs font-mono p-3 leading-relaxed"
                required
              />
            </div>

            {/* Business Card Upload */}
            <div className="p-4 bg-industrial-950 rounded-xl border border-industrial-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-xs">Attach Business Card Signature</span>
                <label className="flex items-center gap-2 text-xs text-industrial-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={attachBusinessCard}
                    onChange={(e) => setAttachBusinessCard(e.target.checked)}
                    className="rounded border-industrial-700 text-brand-orange focus:ring-0"
                  />
                  <span>Attach to email</span>
                </label>
              </div>

              {attachBusinessCard && (
                <div>
                  {businessCardImage ? (
                    <div className="flex items-center gap-4">
                      <img src={businessCardImage} alt="Card" className="w-32 h-18 object-cover rounded border border-industrial-700" />
                      <button
                        type="button"
                        onClick={() => setBusinessCardImage('')}
                        className="px-3 py-1 rounded bg-red-500/20 text-red-400 font-bold text-xs"
                      >
                        Remove Image
                      </button>
                    </div>
                  ) : (
                    <label className="flex items-center gap-2 p-3 bg-industrial-900 rounded-lg border border-dashed border-industrial-700 cursor-pointer text-xs font-semibold text-industrial-300 hover:text-white">
                      <Upload className="w-4 h-4 text-brand-orange" />
                      <span>Upload Business Card Image (PNG, JPG)</span>
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                    </label>
                  )}
                </div>
              )}
            </div>

            {/* Pre-Flight Audit Summary */}
            {audit && (
              <div className="p-4 bg-industrial-950 rounded-xl border border-industrial-800 space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between text-white font-bold">
                  <span>Pre-Flight Recipient Audit</span>
                  <span className="text-emerald-400 font-extrabold">{audit.validCount} Valid Leads Ready</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center pt-1 text-[11px]">
                  <div className="p-2 bg-industrial-900 rounded border border-industrial-800">
                    <span className="text-industrial-400 block">Selected</span>
                    <strong className="text-white">{audit.totalSelected}</strong>
                  </div>
                  <div className="p-2 bg-industrial-900 rounded border border-industrial-800">
                    <span className="text-emerald-400 block">Valid</span>
                    <strong className="text-emerald-400">{audit.validCount}</strong>
                  </div>
                  <div className="p-2 bg-industrial-900 rounded border border-industrial-800">
                    <span className="text-amber-300 block">Skipped</span>
                    <strong className="text-amber-300">{audit.totalSkipped}</strong>
                  </div>
                </div>
              </div>
            )}

            {/* Submit Action Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-industrial-800">
              <button
                type="button"
                onClick={() => setShowTestModal(true)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-industrial-800 hover:bg-industrial-700 text-industrial-200 font-bold text-xs border border-industrial-700"
              >
                <FlaskConical className="w-4 h-4 text-brand-orange" />
                <span>Send Test Email</span>
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl bg-industrial-800 hover:bg-industrial-700 text-industrial-300 font-bold text-xs"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={creating || activeLeadIds.length === 0}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-orange hover:bg-orange-600 text-white font-extrabold text-xs shadow-lg shadow-brand-orange/20 transition-all disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>{creating ? 'Initializing Queue...' : `START EMAIL CAMPAIGN (${audit ? audit.validCount : activeLeadIds.length})`}</span>
                </button>
              </div>
            </div>

          </form>

          {/* RIGHT PANE: REAL-TIME GMAIL LIVE PREVIEW (Col 5) */}
          <div className="lg:col-span-5 bg-industrial-950 p-5 overflow-y-auto space-y-4 flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-industrial-800">
              <div className="flex items-center gap-2 text-white font-bold text-xs">
                <Eye className="w-4 h-4 text-brand-orange" />
                <span>Real-Time Gmail Email Preview</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-brand-orange/20 text-brand-orange font-mono font-bold border border-brand-orange/30">
                Live Gmail Render
              </span>
            </div>

            {/* Gmail Client Mock Window */}
            <div className="flex-1 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden flex flex-col text-slate-800 font-sans text-xs">
              <div className="bg-slate-100 p-3 border-b border-slate-200 space-y-1">
                <div className="font-bold text-slate-900 truncate">Subject: {previewSubject}</div>
                <div className="text-slate-500 text-[11px]">From: AM Automation Trading &lt;amautomationtrading@gmail.com&gt;</div>
              </div>

              <div className="flex-1 p-4 overflow-y-auto leading-relaxed whitespace-pre-wrap text-slate-800">
                <iframe
                  title="Gmail Preview"
                  srcDoc={previewBody}
                  className="w-full min-h-[360px] border-0"
                />
              </div>

              {attachBusinessCard && businessCardImage && (
                <div className="p-3 bg-slate-50 border-t border-slate-200 text-center">
                  <img src={businessCardImage} alt="Card" className="max-w-[320px] w-full rounded border border-slate-300 mx-auto" />
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* Test Email Modal */}
      {showTestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="industrial-card max-w-md w-full p-6 space-y-4 border border-industrial-700">
            <div className="flex items-center justify-between border-b border-industrial-800 pb-3">
              <h3 className="font-bold text-white text-sm">Send Gmail API Test Email</h3>
              <button onClick={() => setShowTestModal(false)} className="p-1 rounded text-industrial-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {testResultMsg && (
              <div className="p-3 bg-industrial-950 rounded-lg text-xs font-mono">
                {testResultMsg}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-bold text-industrial-300">Recipient Email</label>
              <input
                type="email"
                value={testModalEmail}
                onChange={(e) => setTestModalEmail(e.target.value)}
                className="industrial-input w-full text-xs font-mono"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowTestModal(false)} className="px-4 py-2 rounded-xl bg-industrial-800 text-xs font-bold text-industrial-300">
                Close
              </button>
              <button
                type="button"
                onClick={handleSendTestEmail}
                disabled={sendingTestModal}
                className="px-5 py-2 rounded-xl bg-brand-orange hover:bg-orange-600 text-white font-bold text-xs"
              >
                {sendingTestModal ? 'Sending...' : 'Send Test'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
