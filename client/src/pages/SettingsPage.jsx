import React, { useState, useEffect } from 'react';
import axios from 'axios';
import PricingPage from './PricingPage';
import {
  Mail,
  Save,
  CheckCircle,
  AlertTriangle,
  Clock,
  Check,
  RefreshCw,
  LogOut,
  ShieldCheck,
  Send,
  AlertCircle,
  FlaskConical,
  Key,
  Info
} from 'lucide-react';

export default function SettingsPage({ isDemoMode, setIsDemoMode }) {
  const [gmailStatus, setGmailStatus] = useState({
    connected: false,
    reason: 'not_connected',
    email: '',
    targetEmail: 'amautomationtrading@gmail.com',
    isValidAccount: false,
    message: ''
  });

  const [dailyLimit, setDailyLimit] = useState(100);
  const [minDelay, setMinDelay] = useState(7);
  const [maxDelay, setMaxDelay] = useState(12);

  const [savedMsg, setSavedMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [testMsg, setTestMsg] = useState('');
  const [testing, setTesting] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);

  useEffect(() => {
    fetchGmailStatus();
  }, []);

  const fetchGmailStatus = async () => {
    try {
      const res = await axios.get('/api/gmail/status');
      if (res.data.success) {
        setGmailStatus(res.data);
      }
    } catch (e) {}
  };

  const handleConnectGmail = async () => {
    try {
      const res = await axios.get('/api/gmail/auth-url');
      if (res.data.success && res.data.url) {
        const popup = window.open(res.data.url, 'Gmail OAuth 2.0 Authorization', 'width=600,height=720');

        const listener = (event) => {
          if (event.data && event.data.type === 'GMAIL_CONNECTED') {
            fetchGmailStatus();
            window.removeEventListener('message', listener);
            if (popup) popup.close();
          }
        };

        window.addEventListener('message', listener);
      } else if (res.data.error) {
        alert(`OAuth Configuration Error: ${res.data.error}`);
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to obtain Google OAuth URL. Please check GOOGLE_CLIENT_ID in server/.env file.');
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestMsg('');
    try {
      const res = await axios.post('/api/gmail/test-connection');
      if (res.data.success) {
        setTestMsg(`✅ ${res.data.message}`);
      } else {
        setTestMsg(`❌ ${res.data.message}`);
      }
    } catch (e) {
      setTestMsg('❌ Gmail API connection test failed. Please reconnect.');
    } finally {
      setTesting(false);
    }
  };

  const handleSendTestEmail = async () => {
    setSendingTest(true);
    setTestMsg('Sending real test email via Gmail API...');
    try {
      const res = await axios.post('/api/gmail/send-test-email');
      if (res.data.success) {
        setTestMsg(`✅ ${res.data.message}`);
      }
    } catch (err) {
      setTestMsg(`❌ Test Email Failed: ${err.response?.data?.error || err.message}`);
    } finally {
      setSendingTest(false);
    }
  };

  const handleDisconnectGmail = async () => {
    if (!window.confirm('Are you sure you want to disconnect Gmail?')) return;
    try {
      await axios.post('/api/gmail/disconnect');
      setGmailStatus({
        connected: false,
        reason: 'not_connected',
        email: '',
        targetEmail: 'amautomationtrading@gmail.com',
        isValidAccount: false,
        message: ''
      });
      setTestMsg('');
    } catch (e) {
      alert('Disconnect error.');
    }
  };

  const handleSaveSettings = async () => {
    setLoading(true);
    setSavedMsg('');
    try {
      await axios.post('/api/settings', { key: 'daily_email_limit', value: String(dailyLimit) });
      await axios.post('/api/settings', { key: 'min_email_delay', value: String(minDelay) });
      await axios.post('/api/settings', { key: 'max_email_delay', value: String(maxDelay) });

      setSavedMsg('Settings updated successfully!');
      setTimeout(() => setSavedMsg(''), 3500);
    } catch (err) {
      alert('Error saving settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-4xl mx-auto">
      
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">Application & Gmail Settings</h1>
        <p className="text-xs text-industrial-400 mt-1">
          Configure Gmail OAuth 2.0 authentication, daily outreach limits, and rate-limiting rules.
        </p>
      </div>

      {savedMsg && (
        <div className="p-4 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          <span>{savedMsg}</span>
        </div>
      )}

      {/* AM Automation Trading Gmail OAuth 2.0 Integration Card */}
      <div className="industrial-card p-6 space-y-6">
        <div className="flex items-center gap-3 border-b border-industrial-800 pb-4">
          <div className="w-10 h-10 rounded-xl bg-brand-orange/20 border border-brand-orange/40 flex items-center justify-center text-brand-orange">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-white text-base">AM Automation Trading Gmail</h2>
            <p className="text-xs text-industrial-400">
              Official outreach sender account: <span className="font-mono text-brand-orange font-bold">amautomationtrading@gmail.com</span>
            </p>
          </div>
        </div>

        <div className="p-4 bg-industrial-950/80 rounded-xl border border-industrial-800 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-semibold text-industrial-300 block">Connected Sending Account</span>
              
              {gmailStatus.connected && gmailStatus.isValidAccount ? (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-emerald-400 font-extrabold text-sm font-mono">
                    {gmailStatus.email}
                  </span>
                  <span className="text-[10px] px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                    🟢 Connected & Verified
                  </span>
                </div>
              ) : gmailStatus.reason === 'configuration_error' ? (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-red-400 font-bold text-xs">
                    Configuration Required (GOOGLE_CLIENT_ID missing in server/.env)
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-red-500/20 text-red-400 font-bold border border-red-500/30">
                    Config Error
                  </span>
                </div>
              ) : gmailStatus.connected && !gmailStatus.isValidAccount ? (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-red-400 font-extrabold text-sm font-mono">
                    {gmailStatus.email}
                  </span>
                  <span className="text-[10px] px-2.5 py-0.5 rounded bg-red-500/20 text-red-400 font-bold border border-red-500/30">
                    ⚠️ Wrong Account
                  </span>
                </div>
              ) : (
                <span className="text-industrial-400 text-xs font-mono mt-1 block">
                  No Gmail account connected. Click Connect Gmail below.
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testing}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-industrial-800 hover:bg-industrial-700 text-white font-bold text-xs border border-industrial-700 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
                <span>Test Connection</span>
              </button>

              <button
                type="button"
                onClick={handleSendTestEmail}
                disabled={sendingTest || !gmailStatus.connected}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-industrial-800 hover:bg-industrial-700 text-emerald-400 font-bold text-xs border border-industrial-700 transition-colors disabled:opacity-40"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{sendingTest ? 'Sending...' : 'Send Test Email'}</span>
              </button>

              <button
                type="button"
                onClick={handleConnectGmail}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-orange hover:bg-orange-600 text-white font-bold text-xs shadow-lg shadow-brand-orange/20 transition-all"
              >
                <Mail className="w-4 h-4" />
                <span>{gmailStatus.connected ? 'Reconnect Gmail' : 'Connect Gmail'}</span>
              </button>

              {gmailStatus.connected && (
                <button
                  type="button"
                  onClick={handleDisconnectGmail}
                  className="px-3.5 py-2 rounded-xl bg-industrial-800 hover:bg-red-500/20 text-red-400 font-bold text-xs border border-industrial-700 transition-colors"
                >
                  Disconnect
                </button>
              )}
            </div>
          </div>

          {/* Test Connection Output Box */}
          {testMsg && (
            <div className="p-3 bg-industrial-900 rounded-lg border border-industrial-800 text-xs font-mono text-industrial-200">
              {testMsg}
            </div>
          )}

          {/* Configuration Error Guide */}
          {gmailStatus.reason === 'configuration_error' && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs space-y-2 text-amber-300">
              <div className="flex items-center gap-2 font-bold">
                <Key className="w-4 h-4 text-amber-400" />
                <span>Google OAuth Environment Setup Required</span>
              </div>
              <p className="text-industrial-300 text-[11px] leading-relaxed">
                Add your Google Cloud OAuth Client credentials to <code className="text-brand-orange">server/.env</code>:
              </p>
              <pre className="p-2.5 bg-industrial-950 rounded text-[11px] font-mono text-emerald-400 overflow-x-auto">
{`GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:5001/api/gmail/oauth/callback`}
              </pre>
            </div>
          )}

          {/* Wrong Account Warning Banner */}
          {gmailStatus.connected && !gmailStatus.isValidAccount && (
            <div className="p-3.5 bg-red-500/15 border border-red-500/40 rounded-xl text-xs space-y-2">
              <div className="flex items-center gap-2 text-red-400 font-bold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Wrong Gmail Account Connected</span>
              </div>
              <p className="text-industrial-300">
                You connected <strong>{gmailStatus.email}</strong>, but campaigns require the official account <strong>amautomationtrading@gmail.com</strong>.
              </p>
              <button
                type="button"
                onClick={handleConnectGmail}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white font-bold text-xs"
              >
                Reconnect Business Gmail
              </button>
            </div>
          )}

        </div>
      </div>

      {/* Daily Sending Safety Limits & Delay Card */}
      <div className="industrial-card p-6 space-y-6">
        <div className="flex items-center gap-3 border-b border-industrial-800 pb-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-white text-base">Outreach Queue & Daily Sending Safety</h2>
            <p className="text-xs text-industrial-400">
              Configure sending limits and randomized delays to maintain domain reputation.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-industrial-300">Daily Email Limit</label>
            <input
              type="number"
              value={dailyLimit}
              onChange={(e) => setDailyLimit(parseInt(e.target.value, 10) || 100)}
              className="industrial-input w-full text-xs font-mono"
              min={10}
              max={500}
            />
            <span className="text-[10px] text-industrial-400 block">Default: 100 emails / day</span>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-industrial-300">Minimum Delay (sec)</label>
            <input
              type="number"
              value={minDelay}
              onChange={(e) => setMinDelay(parseInt(e.target.value, 10) || 7)}
              className="industrial-input w-full text-xs font-mono"
              min={5}
              max={30}
            />
            <span className="text-[10px] text-industrial-400 block">Default: 7 seconds</span>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-industrial-300">Maximum Delay (sec)</label>
            <input
              type="number"
              value={maxDelay}
              onChange={(e) => setMaxDelay(parseInt(e.target.value, 10) || 12)}
              className="industrial-input w-full text-xs font-mono"
              min={7}
              max={60}
            />
            <span className="text-[10px] text-industrial-400 block">Default: 12 seconds</span>
          </div>
        </div>

        <div className="pt-4 flex justify-end">
          <button
            type="button"
            onClick={handleSaveSettings}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-brand-orange hover:bg-orange-600 font-bold text-white shadow-lg shadow-brand-orange/20 text-xs transition-all"
          >
            <Save className="w-4 h-4" />
            <span>Save Configuration</span>
          </button>
        </div>
      </div>

      {/* INR Subscription & Billing Management */}
      <div className="border-t border-industrial-800/80 pt-8">
        <PricingPage />
      </div>

    </div>
  );
}
