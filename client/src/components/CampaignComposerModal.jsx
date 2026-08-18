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
  UserCheck
} from 'lucide-react';

export default function CampaignComposerModal({
  selectedLeadIds,
  onClose,
  onCampaignCreated,
  gmailStatus = {}
}) {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [campaignName, setCampaignName] = useState('');

  const [subject, setSubject] = useState('Industrial Automation Products & Solutions – AM Automation Trading');
  const [body, setBody] = useState(`Dear {{contact_name}},

Greetings from {{business_name}}.

We are engaged in the supply of Industrial Automation Products & Components for manufacturing industries, machine builders, system integrators, and industrial applications.

Our product range includes:
• PLC & PLC Modules
• HMI & Touch Panels
• AC Drives / VFDs
• Servo Motors & Servo Drives
• Sensors & Switches
• Contactors, Relays & Protection Devices
• Industrial Automation Components
• Other Electrical & Automation Products

We can assist with product selection, model identification, competitive quotations, and sourcing support based on your requirement.

If you have any current or upcoming requirement, please feel free to share your BOM, model numbers, specifications, or enquiry with us. We will be happy to provide a suitable quotation.

Looking forward to the opportunity to work with your organization.

Best Regards,
{{sender_name}}
{{business_name}}
Phone: {{phone}}
Email: {{email}}`);

  const [businessCardImage, setBusinessCardImage] = useState('');
  const [attachBusinessCard, setAttachBusinessCard] = useState(true);

  const [audit, setAudit] = useState(null);
  const [allowPreviouslyContacted, setAllowPreviouslyContacted] = useState(false);
  const [isTestMode, setIsTestMode] = useState(false);
  const [testEmail, setTestEmail] = useState('amautomationtrading@gmail.com');
  const [dailyLimit, setDailyLimit] = useState(100);

  const [creating, setCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Test Email Modal state
  const [showTestModal, setShowTestModal] = useState(false);
  const [testModalEmail, setTestModalEmail] = useState('amautomationtrading@gmail.com');
  const [sendingTestModal, setSendingTestModal] = useState(false);
  const [testResultMsg, setTestResultMsg] = useState('');

  useEffect(() => {
    fetchTemplates();
    fetchAudit();
  }, [selectedLeadIds, allowPreviouslyContacted, isTestMode, testEmail]);

  const fetchTemplates = async () => {
    try {
      const res = await axios.get('/api/email-templates');
      if (res.data.success) {
        setTemplates(res.data.templates);
        const def = res.data.templates.find((t) => t.is_default) || res.data.templates[0];
        if (def) {
          setSelectedTemplateId(def.id);
        }
      }
    } catch (err) {}
  };

  const fetchAudit = async () => {
    try {
      const res = await axios.post('/api/email-campaigns/audit', {
        leadIds: selectedLeadIds,
        allowPreviouslyContacted,
        isTestMode,
        testEmail
      });
      if (res.data.success) {
        setAudit(res.data.audit);
      }
    } catch (err) {}
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

  const handleRemoveImage = () => {
    setBusinessCardImage('');
  };

  const handleStartCampaignSubmit = async (e) => {
    e.preventDefault();
    if (!audit || audit.validCount === 0) return;

    setCreating(true);
    setErrorMessage('');

    try {
      const createRes = await axios.post('/api/email-campaigns', {
        name: campaignName || `AM Automation Trading B2B Outreach (${new Date().toLocaleDateString()})`,
        subject,
        body,
        businessCardImage: attachBusinessCard ? businessCardImage : '',
        leadIds: selectedLeadIds,
        allowPreviouslyContacted,
        isTestMode,
        testEmail,
        dailyLimit
      });

      if (createRes.data.success) {
        const campaign = createRes.data.campaign;
        await axios.post(`/api/email-campaigns/${campaign.campaign_id}/start`);
        onCampaignCreated(campaign);
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
      // Substitute preview variables for test run
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

  const estimatedMinMinutes = audit ? Math.ceil((audit.validCount * 9.5) / 60) : 0;

  // Real-time Preview Text Engine
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
              <h2 className="font-extrabold text-white text-base">Send B2B Email Campaign — AM Automation Trading</h2>
              <p className="text-xs text-industrial-400">
                Compose, personalize, preview, and send Gmail outreach to {selectedLeadIds.length} selected leads.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-industrial-400 hover:text-white hover:bg-industrial-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Main Split Body (Left Editor, Right Live Preview) */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12">
          
          {/* LEFT PANE: CONTROLS & EDITOR (Col 7) */}
          <form onSubmit={handleStartCampaignSubmit} className="lg:col-span-7 overflow-y-auto p-5 space-y-5 border-r border-industrial-800">
            
            {errorMessage && (
              <div className="p-3 bg-red-500/20 border border-red-500/40 rounded-xl text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* From & Checklist Status Bar */}
            <div className="p-3 bg-industrial-950 rounded-xl border border-industrial-800 space-y-2 text-xs">
              <div className="flex items-center justify-between border-b border-industrial-800/80 pb-2">
                <div className="flex items-center gap-2 font-mono">
                  <span className="text-industrial-400 font-semibold uppercase text-[10px]">From:</span>
                  <span className="font-bold text-white">AM Automation Trading</span>
                  <span className="text-brand-orange">&lt;amautomationtrading@gmail.com&gt;</span>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px] font-mono pt-1">
                <div>
                  <span className="text-industrial-400">Gmail: </span>
                  {gmailStatus.connected ? <span className="text-emerald-400 font-bold">✓ Connected</span> : <span className="text-amber-300 font-bold">⏱ Pending</span>}
                </div>
                <div>
                  <span className="text-industrial-400">Account: </span>
                  <span className="text-white font-bold">Authorized</span>
                </div>
                <div>
                  <span className="text-industrial-400">Limits: </span>
                  <span className="text-white font-bold">{dailyLimit}/day</span>
                </div>
                <div>
                  <span className="text-industrial-400">Delay: </span>
                  <span className="text-brand-orange font-bold">7–12s</span>
                </div>
              </div>
            </div>

            {/* Template Dropdown & Subject */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-5 space-y-1">
                <label className="text-xs font-semibold text-industrial-300">Select Template</label>
                <select
                  value={selectedTemplateId}
                  onChange={handleTemplateChange}
                  className="industrial-input w-full text-xs font-medium"
                >
                  {templates.map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>
                      {tpl.name} {tpl.is_default ? '(Default)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-7 space-y-1">
                <label className="text-xs font-semibold text-industrial-300">Subject Line</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="industrial-input w-full text-xs font-medium"
                  placeholder="Subject line..."
                  required
                />
              </div>
            </div>

            {/* Personalization Variable Insert Pills */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-industrial-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-brand-orange" />
                  <span>Insert Personalization Tag</span>
                </label>
                <span className="text-[10px] text-industrial-400">Click to add variable to body</span>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { tag: '{{contact_name}}', label: 'Contact Name' },
                  { tag: '{{company_name}}', label: 'Company Name' },
                  { tag: '{{business_name}}', label: 'Business Name' },
                  { tag: '{{sender_name}}', label: 'Sender Name' },
                  { tag: '{{phone}}', label: 'Phone' },
                  { tag: '{{email}}', label: 'Email' }
                ].map((item) => (
                  <button
                    key={item.tag}
                    type="button"
                    onClick={() => insertVariable(item.tag)}
                    className="px-2.5 py-1 rounded-lg bg-industrial-800 hover:bg-industrial-700 border border-industrial-700 text-[11px] font-mono text-brand-orange font-semibold transition-colors"
                  >
                    + {item.tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Rich Email Content Editor */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-industrial-300">Email Content</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={10}
                className="industrial-input w-full text-xs font-mono leading-relaxed p-3"
                placeholder="Write your email body here..."
                required
              />
            </div>

            {/* Business Card / Signature Image Section */}
            <div className="p-4 bg-industrial-950/80 rounded-xl border border-industrial-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-brand-orange" />
                  <span className="font-bold text-white text-xs">Business Card / Signature Image</span>
                </div>

                {businessCardImage && (
                  <label className="flex items-center gap-1.5 text-[11px] text-industrial-300 font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={attachBusinessCard}
                      onChange={(e) => setAttachBusinessCard(e.target.checked)}
                      className="rounded border-industrial-700 text-brand-orange focus:ring-0"
                    />
                    <span>Include in Email Footer</span>
                  </label>
                )}
              </div>

              {businessCardImage ? (
                <div className="flex items-center gap-4 p-3 bg-industrial-900 rounded-lg border border-industrial-800">
                  <img
                    src={businessCardImage}
                    alt="Uploaded Business Card"
                    className="w-32 h-18 object-cover rounded-lg border border-industrial-700 shadow-md"
                  />
                  <div className="space-y-1.5">
                    <span className="text-xs font-semibold text-emerald-400 block">✓ Business Card Loaded</span>
                    <div className="flex items-center gap-2">
                      <label className="px-3 py-1 rounded bg-industrial-800 hover:bg-industrial-700 text-white font-bold text-[11px] cursor-pointer border border-industrial-700">
                        Replace
                        <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                      </label>
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="px-3 py-1 rounded bg-red-500/20 hover:bg-red-500/30 text-red-400 font-bold text-[11px] border border-red-500/30"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center p-4 bg-industrial-900/60 hover:bg-industrial-900 border border-dashed border-industrial-700 hover:border-brand-orange rounded-xl cursor-pointer transition-colors text-center">
                  <Upload className="w-5 h-5 text-industrial-400 mb-1" />
                  <span className="text-xs font-semibold text-industrial-200">Upload Business Card Image</span>
                  <span className="text-[10px] text-industrial-400 mt-0.5">PNG, JPG, WEBP up to 2MB</span>
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
              )}
            </div>

            {/* Recipient Audit Summary Card */}
            {audit && (
              <div className="p-3 bg-industrial-950/60 rounded-xl border border-industrial-800 space-y-2">
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-2 bg-industrial-900 rounded-lg">
                    <span className="text-[10px] text-industrial-400 block font-semibold">Total</span>
                    <span className="font-extrabold text-white text-sm">{audit.totalSelected}</span>
                  </div>
                  <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                    <span className="text-[10px] text-emerald-400 block font-semibold">Valid</span>
                    <span className="font-extrabold text-emerald-400 text-sm">{audit.validCount}</span>
                  </div>
                  <div className="p-2 bg-amber-500/10 rounded-lg border border-amber-500/20">
                    <span className="text-[10px] text-amber-300 block font-semibold">Skipped</span>
                    <span className="font-extrabold text-amber-300 text-sm">{audit.totalSkipped}</span>
                  </div>
                  <div className="p-2 bg-industrial-900 rounded-lg">
                    <span className="text-[10px] text-industrial-400 block font-semibold">Est. Time</span>
                    <span className="font-extrabold text-brand-orange text-xs">~{estimatedMinMinutes}m</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 text-xs">
                  <label className="flex items-center gap-1.5 text-[11px] text-industrial-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allowPreviouslyContacted}
                      onChange={(e) => setAllowPreviouslyContacted(e.target.checked)}
                      className="rounded border-industrial-700 text-brand-orange"
                    />
                    <span>Allow previously contacted leads (last 14 days)</span>
                  </label>

                  <label className="flex items-center gap-1.5 text-[11px] text-industrial-300 cursor-pointer font-bold">
                    <input
                      type="checkbox"
                      checked={isTestMode}
                      onChange={(e) => setIsTestMode(e.target.checked)}
                      className="rounded border-industrial-700 text-brand-orange"
                    />
                    <span>Enable Test Mode</span>
                  </label>
                </div>
              </div>
            )}

            {/* Form Submit & Test Action Bar */}
            <div className="pt-2 flex items-center justify-between border-t border-industrial-800">
              <button
                type="button"
                onClick={() => setShowTestModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-industrial-800 hover:bg-industrial-700 text-emerald-400 font-bold text-xs border border-industrial-700"
              >
                <FlaskConical className="w-4 h-4" />
                <span>Send Test Email</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-industrial-800 hover:bg-industrial-700 text-industrial-300 font-semibold text-xs"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={creating || !audit || audit.validCount === 0}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-brand-orange hover:bg-orange-600 text-white font-bold text-xs shadow-lg shadow-brand-orange/20 transition-all disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>{creating ? 'Initializing Queue...' : `Start Email Campaign (${audit ? audit.validCount : 0})`}</span>
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
              
              {/* Gmail Window Header Bar */}
              <div className="p-3 bg-slate-100 border-b border-slate-200 space-y-1.5">
                <div className="flex items-center gap-2 font-semibold text-slate-700 text-[11px]">
                  <span className="text-slate-400 uppercase text-[9px] font-bold">To:</span>
                  <span className="font-mono bg-slate-200 px-2 py-0.5 rounded text-slate-800">Rahul Sharma &lt;purchase@abcrobotics.com&gt;</span>
                </div>
                <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                  <span className="text-slate-400 font-normal uppercase text-[9px]">Subject:</span>
                  <span>{previewSubject || 'No Subject'}</span>
                </div>
              </div>

              {/* Gmail Message Body View */}
              <div className="p-5 flex-1 overflow-y-auto space-y-4 leading-relaxed font-sans text-slate-800">
                
                <div className="whitespace-pre-wrap font-sans text-xs text-slate-800 leading-relaxed">
                  {previewBody}
                </div>

                {/* Business Card Image in Preview */}
                {attachBusinessCard && businessCardImage && (
                  <div className="pt-4 border-t border-slate-200">
                    <img
                      src={businessCardImage}
                      alt="Business Card Signature"
                      className="max-w-[400px] w-full h-auto rounded-lg border border-slate-300 shadow-sm"
                    />
                  </div>
                )}

              </div>

              {/* Gmail Footer Bar */}
              <div className="p-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                <span>AM Automation Trading • Gmail API</span>
                <span>Ready to Send</span>
              </div>

            </div>
          </div>

        </div>

      </div>

      {/* TEST EMAIL MODAL */}
      {showTestModal && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="industrial-card w-full max-w-md p-6 space-y-4 shadow-2xl border-industrial-700">
            <div className="flex items-center justify-between border-b border-industrial-800 pb-3">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <FlaskConical className="w-5 h-5 text-emerald-400" />
                <span>Send Test Email</span>
              </div>
              <button onClick={() => setShowTestModal(false)} className="text-industrial-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-industrial-400">
              Send the current HTML email template and business card signature to your test inbox via the real Gmail API.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-industrial-300">Test Recipient Email</label>
              <input
                type="email"
                value={testModalEmail}
                onChange={(e) => setTestModalEmail(e.target.value)}
                className="industrial-input w-full text-xs font-mono"
                placeholder="amautomationtrading@gmail.com"
                required
              />
            </div>

            {testResultMsg && (
              <div className="p-3 bg-industrial-900 rounded-lg border border-industrial-800 text-xs font-mono text-industrial-200">
                {testResultMsg}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowTestModal(false)}
                className="px-4 py-2 rounded-xl bg-industrial-800 text-industrial-300 font-semibold text-xs"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleSendTestEmail}
                disabled={sendingTestModal}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 font-bold text-white text-xs shadow-lg shadow-emerald-500/20"
              >
                <Send className="w-4 h-4" />
                <span>{sendingTestModal ? 'Sending...' : 'Send Test Email'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
