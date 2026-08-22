import React, { useState } from 'react';
import axios from 'axios';
import { Mail, X, Send, CheckCircle, AlertCircle, RefreshCw, Eye } from 'lucide-react';

export default function SendTestEmailModal({
  subject = '',
  htmlBody = '',
  businessCardImage = '',
  onClose
}) {
  const [testEmail, setTestEmail] = useState('amautomationtrading@gmail.com');
  const [sending, setSending] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Interpolate variables for preview
  const previewSubject = (subject || '')
    .replace(/\{\{\s*contact_name\s*\}\}/gi, 'Rahul Sharma')
    .replace(/\{\{\s*company_name\s*\}\}/gi, 'ABC Robotics & Automation Ltd')
    .replace(/\{\{\s*business_name\s*\}\}/gi, 'AM Automation Trading')
    .replace(/\{\{\s*sender_name\s*\}\}/gi, 'Amit Mehra')
    .replace(/\{\{\s*phone\s*\}\}/gi, '+91 86072 85969')
    .replace(/\{\{\s*email\s*\}\}/gi, 'amautomationtrading@gmail.com');

  const interpolatedBody = (htmlBody || '')
    .replace(/\{\{\s*contact_name\s*\}\}/gi, 'Rahul Sharma')
    .replace(/\{\{\s*company_name\s*\}\}/gi, 'ABC Robotics & Automation Ltd')
    .replace(/\{\{\s*business_name\s*\}\}/gi, 'AM Automation Trading')
    .replace(/\{\{\s*sender_name\s*\}\}/gi, 'Amit Mehra')
    .replace(/\{\{\s*phone\s*\}\}/gi, '+91 86072 85969')
    .replace(/\{\{\s*email\s*\}\}/gi, 'amautomationtrading@gmail.com');

  const handleSendTest = async (e) => {
    e.preventDefault();
    if (!testEmail || !testEmail.includes('@')) {
      setErrorMsg('Please enter a valid recipient email address.');
      return;
    }

    setSending(true);
    setStatusMsg('');
    setErrorMsg('');

    try {
      const res = await axios.post('/api/gmail/send-test-email', {
        recipientEmail: testEmail.trim(),
        subject: previewSubject,
        body: interpolatedBody,
        businessCardImage
      });

      if (res.data.success) {
        setStatusMsg(res.data.message || `Test email sent successfully to ${testEmail}!`);
      } else {
        setErrorMsg(res.data.error || 'Failed to send test email.');
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Failed to send test email via Gmail API.';
      setErrorMsg(msg);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="industrial-card w-full max-w-2xl overflow-hidden shadow-2xl border border-industrial-700 space-y-0">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 bg-industrial-950 border-b border-industrial-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-brand-orange/20 border border-brand-orange/40 text-brand-orange">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base">Send Production Test Email</h3>
              <p className="text-xs text-industrial-400">Sends actual HTML email via connected official Gmail API</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-industrial-400 hover:text-white hover:bg-industrial-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          
          {statusMsg && (
            <div className="p-4 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-400 text-xs font-semibold flex items-center gap-2">
              <CheckCircle className="w-5 h-5 shrink-0" />
              <span>{statusMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-4 bg-red-500/20 border border-red-500/40 rounded-xl text-red-400 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSendTest} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-industrial-300">Recipient Email Address</label>
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="e.g. amautomationtrading@gmail.com"
                className="industrial-input w-full text-xs font-mono font-medium text-white"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-industrial-300">Subject Preview</label>
              <div className="p-3 bg-industrial-950 rounded-xl border border-industrial-800 text-xs font-mono text-industrial-200">
                {previewSubject || 'No Subject Provided'}
              </div>
            </div>

            {/* Live HTML Email Preview Box */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-industrial-300 flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-brand-orange" />
                <span>Rendered HTML Content Preview</span>
              </label>
              <div className="border border-industrial-800 rounded-xl overflow-hidden bg-white max-h-[260px] overflow-y-auto p-4">
                <iframe
                  title="Test Email Render"
                  srcDoc={interpolatedBody}
                  className="w-full min-h-[220px] border-0"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-industrial-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-industrial-800 hover:bg-industrial-700 text-industrial-300 font-bold text-xs border border-industrial-700 transition-all"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={sending}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-brand-orange hover:bg-orange-600 text-white font-bold text-xs shadow-lg shadow-brand-orange/20 transition-all disabled:opacity-50"
              >
                {sending ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Sending via Gmail API...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Send Test Email</span>
                  </>
                )}
              </button>
            </div>
          </form>

        </div>

      </div>
    </div>
  );
}
