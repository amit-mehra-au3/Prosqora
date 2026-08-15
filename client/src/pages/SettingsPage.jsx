import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Settings as SettingsIcon, Save, CheckCircle, AlertTriangle, ShieldCheck, Key, SearchCode, Check, RefreshCw } from 'lucide-react';

export default function SettingsPage({ isDemoMode, setIsDemoMode }) {
  const [searchProvider, setSearchProvider] = useState('duckduckgo');
  const [apiKey, setApiKey] = useState('');
  const [googleCx, setGoogleCx] = useState('');

  const [savedMsg, setSavedMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [testMsg, setTestMsg] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await axios.get('/api/settings');
      if (res.data.success && res.data.settings) {
        const s = res.data.settings;
        if (s.demo_mode) setIsDemoMode(s.demo_mode === 'true');
        if (s.search_provider) setSearchProvider(s.search_provider);
        if (s.search_api_key) setApiKey(s.search_api_key);
        if (s.search_google_cx) setGoogleCx(s.search_google_cx);
      }
    } catch (e) {
      console.error('Failed to load settings:', e);
    }
  };

  const handleSaveSettings = async () => {
    setLoading(true);
    setSavedMsg('');
    try {
      await axios.post('/api/settings', { key: 'demo_mode', value: isDemoMode ? 'true' : 'false' });
      await axios.post('/api/settings', { key: 'search_provider', value: searchProvider });
      await axios.post('/api/settings', { key: 'search_api_key', value: apiKey });
      await axios.post('/api/settings', { key: 'search_google_cx', value: googleCx });

      setSavedMsg('Search Provider configuration saved successfully!');
      setTimeout(() => setSavedMsg(''), 3500);
    } catch (err) {
      alert('Error saving settings');
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setTestMsg('Testing Search Provider connection...');
    try {
      const res = await axios.post('/api/discovery/find-leads', {
        categories: ['CNC Machine Manufacturers'],
        cities: ['Gurgaon'],
        limit: 3
      });
      if (res.data.success) {
        setTestMsg(`✅ Connection successful! Discovered ${res.data.count} live companies using ${searchProvider}.`);
      }
    } catch (e) {
      setTestMsg('❌ Provider test failed. Please verify your API Key or network connection.');
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-4xl mx-auto">
      
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">Application & Search Settings</h1>
        <p className="text-xs text-industrial-400 mt-1">
          Configure search provider APIs, key security, scanning rules, and system modes.
        </p>
      </div>

      {savedMsg && (
        <div className="p-4 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          <span>{savedMsg}</span>
        </div>
      )}

      {/* Search Provider Configuration */}
      <div className="industrial-card p-6 space-y-5 border-brand-orange/40">
        <div className="flex items-center gap-2 text-white font-bold text-base border-b border-industrial-800 pb-3">
          <SearchCode className="w-5 h-5 text-brand-orange" />
          <span>Live Search Provider Configuration</span>
        </div>

        <div className="space-y-4 text-xs">
          <div className="space-y-1">
            <label className="font-semibold text-industrial-300 block">Search Provider API</label>
            <select
              value={searchProvider}
              onChange={(e) => setSearchProvider(e.target.value)}
              className="industrial-input w-full text-xs font-semibold"
            >
              <option value="duckduckgo">DuckDuckGo Live Search Engine (Compliant - No Key Required)</option>
              <option value="google">Google Custom Search JSON API</option>
              <option value="serper">Serper.dev Google Search API</option>
              <option value="serpapi">SerpAPI Google Search API</option>
            </select>
          </div>

          {searchProvider !== 'duckduckgo' && (
            <div className="space-y-3 pt-2 animate-in fade-in duration-150">
              <div className="space-y-1">
                <label className="font-semibold text-industrial-300 block">Provider API Key</label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter Search API Key..."
                  className="industrial-input w-full text-xs font-mono"
                />
              </div>

              {searchProvider === 'google' && (
                <div className="space-y-1">
                  <label className="font-semibold text-industrial-300 block">Google Custom Search Engine ID (CX)</label>
                  <input
                    type="text"
                    value={googleCx}
                    onChange={(e) => setGoogleCx(e.target.value)}
                    placeholder="Enter Search Engine ID (cx)..."
                    className="industrial-input w-full text-xs font-mono"
                  />
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-3 pt-3">
            <button
              type="button"
              onClick={handleSaveSettings}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand-orange hover:bg-orange-600 text-xs font-bold text-white shadow-lg shadow-brand-orange/20 transition-all"
            >
              <Save className="w-4 h-4" />
              <span>Save Configuration</span>
            </button>

            <button
              type="button"
              onClick={handleTestConnection}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-industrial-800 hover:bg-industrial-700 text-xs font-bold text-industrial-200 border border-industrial-700"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Test Connection</span>
            </button>
          </div>

          {testMsg && (
            <div className="p-3 bg-industrial-950 rounded-xl text-industrial-300 text-xs font-mono border border-industrial-800">
              {testMsg}
            </div>
          )}
        </div>
      </div>

      {/* Demo Mode Toggle Section */}
      <div className="industrial-card p-6 space-y-4 border-amber-500/30">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-white font-bold text-base">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <span>Demo Mode Toggle (UI Testing)</span>
            </div>
            <p className="text-xs text-industrial-400">
              When Demo Mode is enabled, the scanner loads pre-populated demo data for testing UI interactions offline.
            </p>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isDemoMode}
              onChange={(e) => setIsDemoMode(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-industrial-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
          </label>
        </div>
      </div>

    </div>
  );
}
