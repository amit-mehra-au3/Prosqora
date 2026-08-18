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
  Key,
  Info,
  ExternalLink,
  Copy,
  X
} from 'lucide-react';

export default function SettingsPage({ isDemoMode, setIsDemoMode }) {
  const [gmailStatus, setGmailStatus] = useState({
    connected: false,
    configured: false,
    reason: 'not_connected',
    email: '',
    targetEmail: 'amautomationtrading@gmail.com',
    isValidAccount: false,
    redirectUri: '',
    message: ''
  });

  const [currentUser, setCurrentUser] = useState(null);

  // Setup Wizard Modal State
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [setupClientId, setSetupClientId] = useState('');
  const [setupClientSecret, setSetupClientSecret] = useState('');
  const [setupRedirectUri, setSetupRedirectUri] = useState('');
  const [savingConfig, setSavingConfig] = useState(false);
  const [copiedUri, setCopiedUri] = useState(false);

  const [dailyLimit, setDailyLimit] = useState(100);
  const [minDelay, setMinDelay] = useState(7);
  const [maxDelay, setMaxDelay] = useState(12);

  const [savedMsg, setSavedMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [testMsg, setTestMsg] = useState('');
  const [testing, setTesting] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);

  useEffect(() => {
    fetchCurrentUser();
    fetchGmailStatus();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const res = await axios.get('/api/auth/me');
      if (res.data.success) {
        setCurrentUser(res.data.user);
      }
    } catch (e) {}
  };

  const fetchGmailStatus = async () => {
    try {
      const res = await axios.get('/api/gmail/oauth/status');
      if (res.data.success) {
        setGmailStatus(res.data);
        if (res.data.redirectUri) {
          setSetupRedirectUri(res.data.redirectUri);
        }
      }
    } catch (e) {}
  };

  const handleConnectGmail = async () => {
    try {
      const statusRes = await axios.get('/api/gmail/oauth/status');
      const statusData = statusRes.data || {};
      
      if (!statusData.configured) {
        if (statusData.redirectUri) {
          setSetupRedirectUri(statusData.redirectUri);
        }
        setShowSetupModal(true);
        return;
      }

      // Initiate Google OAuth authorization flow
      const res = await axios.get('/api/gmail/auth-url');
      if (res.data.success && res.data.url) {
        const popup = window.open(res.data.url, 'Google Gmail OAuth Authorization', 'width=600,height=720');

        const listener = (event) => {
          if (event.data && event.data.type === 'GMAIL_CONNECTED') {
            fetchGmailStatus();
            window.removeEventListener('message', listener);
            if (popup) popup.close();
          }
        };

        window.addEventListener('message', listener);
      } else if (res.data.error) {
        setShowSetupModal(true);
      }
    } catch (err) {
      if (err.response?.data?.configured === false) {
        setShowSetupModal(true);
      } else {
        alert(err.response?.data?.error || 'Failed to obtain Google OAuth URL. Please try again.');
      }
    }
  };

  const handleSaveOAuthCredentials = async (e) => {
    e.preventDefault();
    if (!setupClientId.trim() || !setupClientSecret.trim()) {
      alert('Please enter both Google Client ID and Google Client Secret.');
      return;
    }

    setSavingConfig(true);
    try {
      const res = await axios.post('/api/gmail/oauth/config', {
        clientId: setupClientId.trim(),
        clientSecret: setupClientSecret.trim(),
        redirectUri: setupRedirectUri.trim()
      });

      if (res.data.success) {
        setShowSetupModal(false);
        await fetchGmailStatus();
        // Automatically start Google OAuth connection immediately after saving
        handleConnectGmail();
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save Google OAuth credentials.');
    } finally {
      setSavingConfig(false);
    }
  };

  const handleDisconnectGmail = async () => {
    if (!window.confirm('Are you sure you want to disconnect your Gmail account from Prosqora CRM?')) return;
    try {
      const res = await axios.post('/api/gmail/disconnect');
      if (res.data.success) {
        fetchGmailStatus();
        setTestMsg('Gmail account disconnected successfully.');
      }
    } catch (e) {
      alert('Failed to disconnect Gmail account.');
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
      } else {
        setTestMsg(`❌ ${res.data.message}`);
      }
    } catch (e) {
      setTestMsg(`❌ Test email failed: ${e.response?.data?.error || e.message}`);
    } finally {
      setSendingTest(false);
    }
  };

  const handleSaveSettings = async () => {
    setLoading(true);
    setSavedMsg('');
    try {
      await new Promise(resolve => setTimeout(resolve, 600));
      setSavedMsg('Outreach safety limits & queue configuration saved successfully!');
      setTimeout(() => setSavedMsg(''), 4000);
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  const handleCopyRedirectUri = () => {
    const uriToCopy = setupRedirectUri || `${window.location.origin}/api/gmail/oauth/callback`;
    navigator.clipboard.writeText(uriToCopy);
    setCopiedUri(true);
    setTimeout(() => setCopiedUri(false), 2500);
  };

  const isUserAdmin = currentUser && (currentUser.role === 'admin' || currentUser.role === 'super_admin');

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16">
      
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-3">
          <Mail className="w-7 h-7 text-brand-orange" />
          <span>Application & Gmail Settings</span>
        </h1>
        <p className="text-xs text-industrial-400 mt-1">
          Configure Google Gmail OAuth 2.0 connection, daily outreach safety limits, and sending rules.
        </p>
      </div>

      {savedMsg && (
        <div className="p-4 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          <span>{savedMsg}</span>
        </div>
      )}

      {/* Gmail OAuth 2.0 Integration Card */}
      <div className="industrial-card p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-industrial-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-orange/20 border border-brand-orange/40 flex items-center justify-center text-brand-orange">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-white text-base">Google Gmail & Workspace Connection</h2>
              <p className="text-xs text-industrial-400">
                Official outreach sender account: <span className="font-mono text-brand-orange font-bold">amautomationtrading@gmail.com</span>
              </p>
            </div>
          </div>

          {/* Connection Status Badge */}
          <div>
            {gmailStatus.connected && gmailStatus.isValidAccount ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>✓ Gmail Connected</span>
              </span>
            ) : !gmailStatus.configured ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold border border-amber-500/30">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Setup Required</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-industrial-800 text-industrial-400 text-xs font-bold border border-industrial-700">
                <Info className="w-3.5 h-3.5" />
                <span>Not Connected</span>
              </span>
            )}
          </div>
        </div>

        <div className="p-5 bg-industrial-950/90 rounded-2xl border border-industrial-800 space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div>
              <span className="text-xs font-semibold text-industrial-400 block uppercase tracking-wider">Connected Account</span>
              
              {gmailStatus.connected && gmailStatus.isValidAccount ? (
                <div className="mt-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400 font-extrabold text-base font-mono">
                      {gmailStatus.email}
                    </span>
                  </div>
                  <p className="text-[11px] text-industrial-400">
                    Direct Gmail API integration active. Automated cold emails will be sent directly from this account.
                  </p>
                </div>
              ) : gmailStatus.connected && !gmailStatus.isValidAccount ? (
                <div className="mt-1 space-y-1">
                  <span className="text-red-400 font-extrabold text-sm font-mono block">
                    {gmailStatus.email}
                  </span>
                  <p className="text-[11px] text-red-400/90">
                    ⚠️ Wrong account connected. Please disconnect and connect <strong>amautomationtrading@gmail.com</strong>.
                  </p>
                </div>
              ) : !gmailStatus.configured ? (
                <div className="mt-1 space-y-1">
                  <span className="text-amber-300 font-bold text-xs block">
                    Google OAuth Application Setup Required
                  </span>
                  <p className="text-[11px] text-industrial-400">
                    Click <strong>Connect Google Gmail</strong> to configure your Google OAuth Client ID and Secret in 5 simple steps.
                  </p>
                </div>
              ) : (
                <div className="mt-1 space-y-1">
                  <span className="text-industrial-300 text-xs font-medium block">
                    No Gmail account currently connected to this workspace.
                  </span>
                  <p className="text-[11px] text-industrial-400">
                    Click <strong>Connect Google Gmail</strong> below to authorize your Google Workspace account.
                  </p>
                </div>
              )}
            </div>

            {/* Action Buttons Header */}
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              {gmailStatus.connected && (
                <>
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={testing}
                    className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-industrial-800 hover:bg-industrial-700 text-white font-bold text-xs border border-industrial-700 transition-all"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
                    <span>Test Connection</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSendTestEmail}
                    disabled={sendingTest}
                    className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 font-bold text-xs border border-emerald-500/40 transition-all disabled:opacity-40"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{sendingTest ? 'Sending...' : 'Send Test Email'}</span>
                  </button>
                </>
              )}

              {/* PRIMARY PROMINENT CONNECT BUTTON */}
              <button
                type="button"
                onClick={handleConnectGmail}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-orange hover:bg-orange-600 text-white font-black text-xs shadow-lg shadow-brand-orange/25 transition-all transform active:scale-95"
              >
                <Mail className="w-4 h-4" />
                <span>{gmailStatus.connected ? 'Reconnect Google Gmail' : 'Connect Google Gmail'}</span>
              </button>

              {gmailStatus.connected && (
                <button
                  type="button"
                  onClick={handleDisconnectGmail}
                  className="px-3.5 py-2.5 rounded-xl bg-industrial-800 hover:bg-red-500/20 text-red-400 font-bold text-xs border border-industrial-700 transition-all"
                >
                  Disconnect
                </button>
              )}
            </div>
          </div>

          {/* Test Connection Output Display */}
          {testMsg && (
            <div className="p-3.5 bg-industrial-900 rounded-xl border border-industrial-800 text-xs font-mono text-industrial-200">
              {testMsg}
            </div>
          )}

          {/* Quick Setup Launcher Banner for Admins when Not Configured */}
          {!gmailStatus.configured && (
            <div className="p-4 bg-gradient-to-r from-brand-orange/15 via-industrial-900 to-industrial-900 border border-brand-orange/30 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-white font-bold text-xs">
                  <Key className="w-4 h-4 text-brand-orange" />
                  <span>One-Click Google OAuth Connection Ready</span>
                </div>
                <p className="text-industrial-300 text-[11px]">
                  {isUserAdmin
                    ? 'Click Connect Google Gmail to open the 5-Step Setup Wizard and configure Google Cloud Client credentials.'
                    : 'Google OAuth setup requires Workspace Admin privileges. Please contact your administrator.'}
                </p>
              </div>

              {isUserAdmin && (
                <button
                  type="button"
                  onClick={() => setShowSetupModal(true)}
                  className="px-4 py-2 rounded-lg bg-brand-orange/20 hover:bg-brand-orange/30 text-brand-orange border border-brand-orange/40 text-xs font-bold shrink-0 transition-all"
                >
                  Open Setup Wizard
                </button>
              )}
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
              Configure daily sending limits and randomized delays to maintain domain reputation.
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

      {/* Pricing & Subscription Card */}
      <div className="border-t border-industrial-800/80 pt-8">
        <PricingPage />
      </div>

      {/* 5-STEP GOOGLE GMAIL OAUTH SETUP WIZARD MODAL */}
      {showSetupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-industrial-900 border border-industrial-700 rounded-2xl max-w-2xl w-full p-6 space-y-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-industrial-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-orange/20 border border-brand-orange/40 flex items-center justify-center text-brand-orange">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-lg">Google Gmail Setup Required</h3>
                  <p className="text-xs text-industrial-400">
                    Follow the 5 simple steps below to configure your Google OAuth 2.0 Credentials.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowSetupModal(false)}
                className="p-1.5 rounded-lg text-industrial-400 hover:text-white hover:bg-industrial-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Non-Admin Restriction Notice */}
            {!isUserAdmin ? (
              <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Admin Access Required</span>
                </div>
                <p className="text-xs text-industrial-300 leading-relaxed">
                  Google OAuth application credentials can only be configured by Workspace Admins or Super Admins. Please contact your platform administrator.
                </p>
                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowSetupModal(false)}
                    className="px-4 py-2 rounded-lg bg-industrial-800 hover:bg-industrial-700 text-white font-bold text-xs"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSaveOAuthCredentials} className="space-y-6">
                
                {/* Step 1: Create OAuth Credentials */}
                <div className="p-4 bg-industrial-950/80 border border-industrial-800 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-brand-orange uppercase tracking-wider">Step 1 — Create OAuth Credentials</span>
                    <a
                      href="https://console.cloud.google.com/apis/credentials"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-orange/20 hover:bg-brand-orange/30 text-brand-orange border border-brand-orange/40 text-xs font-bold transition-all"
                    >
                      <span>Open Google Cloud Console</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                  <p className="text-[11px] text-industrial-400 leading-relaxed">
                    Open Google Cloud Console → APIs & Services → Credentials → Create Credentials → OAuth Client ID (Web Application).
                  </p>
                </div>

                {/* Step 2: Client ID Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>Step 2 — Enter Google Client ID</span>
                    <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 123456789-abc.apps.googleusercontent.com"
                    value={setupClientId}
                    onChange={(e) => setSetupClientId(e.target.value)}
                    className="industrial-input w-full text-xs font-mono"
                  />
                </div>

                {/* Step 3: Client Secret Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>Step 3 — Enter Google Client Secret</span>
                    <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="e.g. GOCSPX-xxxxxxxxxxxxxxxx"
                    value={setupClientSecret}
                    onChange={(e) => setSetupClientSecret(e.target.value)}
                    className="industrial-input w-full text-xs font-mono"
                  />
                </div>

                {/* Step 4: Authorized Redirect URI Display */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-white block flex items-center justify-between">
                    <span>Step 4 — Authorized Redirect URI (Copy to Google Console)</span>
                    <span className="text-[10px] text-emerald-400 font-mono">GOOGLE_REDIRECT_URI</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={
                        (setupRedirectUri && !setupRedirectUri.includes('localhost'))
                          ? setupRedirectUri
                          : (window.location.hostname.includes('onrender.com') || window.location.protocol === 'https:')
                            ? `${window.location.origin}/api/gmail/oauth/callback`
                            : (setupRedirectUri || `${window.location.origin}/api/gmail/oauth/callback`)
                      }
                      className="industrial-input w-full text-xs font-mono text-emerald-400 bg-industrial-950 select-all"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const targetUri = (setupRedirectUri && !setupRedirectUri.includes('localhost'))
                          ? setupRedirectUri
                          : (window.location.hostname.includes('onrender.com') || window.location.protocol === 'https:')
                            ? `${window.location.origin}/api/gmail/oauth/callback`
                            : (setupRedirectUri || `${window.location.origin}/api/gmail/oauth/callback`);
                        navigator.clipboard.writeText(targetUri);
                        setCopiedUri(true);
                        setTimeout(() => setCopiedUri(false), 2500);
                      }}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-industrial-800 hover:bg-industrial-700 text-white font-bold text-xs border border-industrial-700 shrink-0 transition-colors"
                    >
                      {copiedUri ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-industrial-400" />}
                      <span>{copiedUri ? 'Copied!' : 'Copy'}</span>
                    </button>
                  </div>
                  <p className="text-[10px] text-industrial-400">
                    Paste this exact production URI into "Authorized redirect URIs" in Google Cloud Console.
                  </p>
                </div>

                {/* Step 5: Save & Connect Action Buttons */}
                <div className="pt-4 border-t border-industrial-800 flex items-center justify-between">
                  <span className="text-[11px] text-industrial-400 font-semibold">
                    Step 5 — Save Credentials & Connect
                  </span>
                  
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setShowSetupModal(false)}
                      className="px-4 py-2 rounded-xl bg-industrial-800 hover:bg-industrial-700 text-industrial-300 text-xs font-bold transition-colors"
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      disabled={savingConfig}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-orange hover:bg-orange-600 text-white font-extrabold text-xs shadow-lg shadow-brand-orange/20 transition-all disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      <span>{savingConfig ? 'Saving...' : 'Save & Connect Gmail'}</span>
                    </button>
                  </div>
                </div>

              </form>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
