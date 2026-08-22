import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Play,
  Pause,
  Square,
  CheckCircle,
  AlertCircle,
  Clock,
  Loader2,
  X,
  Send,
  Terminal,
  FileCheck,
  Ban,
  Trash2,
  Settings,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import GmailSendingCapacityCard from './GmailSendingCapacityCard';

export default function CampaignProgressModal({ campaign, onClose, onCampaignUpdated }) {
  const [currentCampaign, setCurrentCampaign] = useState(campaign);
  const [logs, setLogs] = useState([]);
  const [capacity, setCapacity] = useState(null);
  const [nextEmailInSec, setNextEmailInSec] = useState(null);

  // Settings & Confirmation Modal States
  const [showStopConfirm, setShowStopConfirm] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Delay settings state
  const [minDelay, setMinDelay] = useState(2);
  const [maxDelay, setMaxDelay] = useState(5);
  const [autoResume, setAutoResume] = useState(true);
  const [settingsMsg, setSettingsMsg] = useState('');

  useEffect(() => {
    let interval;
    fetchCampaignDetails();
    fetchEmailSettings();

    interval = setInterval(() => {
      fetchCampaignDetails();
    }, 1500);

    return () => clearInterval(interval);
  }, [campaign.campaign_id]);

  // Next Email Countdown Ticker
  useEffect(() => {
    if (nextEmailInSec === null || nextEmailInSec <= 0) return;
    const ticker = setInterval(() => {
      setNextEmailInSec(prev => (prev && prev > 0.1 ? Math.round((prev - 0.1) * 10) / 10 : 0));
    }, 100);
    return () => clearInterval(ticker);
  }, [nextEmailInSec]);

  const fetchCampaignDetails = async () => {
    try {
      const res = await axios.get(`/api/email-campaigns/${campaign.campaign_id}`);
      if (res.data.success) {
        setCurrentCampaign(res.data.campaign);
        setLogs(res.data.logs || []);
        if (res.data.capacity) setCapacity(res.data.capacity);
        if (res.data.countdown?.nextEmailInSec) {
          setNextEmailInSec(res.data.countdown.nextEmailInSec);
        }
        if (onCampaignUpdated) onCampaignUpdated(res.data.campaign);
      }
    } catch (e) {}
  };

  const fetchEmailSettings = async () => {
    try {
      const res = await axios.get('/api/email-settings');
      if (res.data.success && res.data.settings) {
        setMinDelay(res.data.settings.min_delay_sec || 2);
        setMaxDelay(res.data.settings.max_delay_sec || 5);
        setAutoResume(res.data.settings.auto_resume !== false);
      }
    } catch (e) {}
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await axios.post('/api/email-settings', {
        min_delay_sec: minDelay,
        max_delay_sec: maxDelay,
        auto_resume: autoResume,
        pause_on_quota_error: true
      });
      if (res.data.success) {
        setSettingsMsg('Sending settings updated successfully!');
        setTimeout(() => {
          setSettingsMsg('');
          setShowSettingsModal(false);
        }, 1500);
      }
    } catch (e) {
      alert('Failed to save email sending settings.');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePause = async () => {
    setActionLoading(true);
    try {
      await axios.post(`/api/email-campaigns/${campaign.campaign_id}/pause`);
      fetchCampaignDetails();
    } catch (e) {
      alert('Failed to pause campaign.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResume = async () => {
    setActionLoading(true);
    try {
      await axios.post(`/api/email-campaigns/${campaign.campaign_id}/resume`);
      fetchCampaignDetails();
    } catch (e) {
      alert('Failed to resume campaign.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmStop = async () => {
    setActionLoading(true);
    try {
      await axios.post(`/api/email-campaigns/${campaign.campaign_id}/stop`);
      setShowStopConfirm(false);
      fetchCampaignDetails();
    } catch (e) {
      alert('Failed to stop campaign.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleClearQueue = async () => {
    setActionLoading(true);
    try {
      await axios.post(`/api/email-campaigns/${campaign.campaign_id}/clear-queue`);
      setShowClearConfirm(false);
      fetchCampaignDetails();
    } catch (e) {
      alert('Failed to clear pending queue.');
    } finally {
      setActionLoading(false);
    }
  };

  const total = currentCampaign.total_count || 0;
  const sent = currentCampaign.sent_count || 0;
  const failed = currentCampaign.failed_count || 0;
  const skipped = currentCampaign.skipped_count || 0;
  const remaining = Math.max(0, total - (sent + failed + skipped));
  const percent = total > 0 ? Math.min(100, Math.round(((sent + failed + skipped) / total) * 100)) : 0;

  const sendingLog = logs.find((l) => l.status === 'Sending');

  const getStatusBadgeClass = (st) => {
    if (st === 'Running' || st === 'QUEUED') return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    if (st === 'Paused') return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
    if (st === 'CAP_REACHED') return 'bg-amber-500/30 text-amber-200 border-amber-500/50 animate-pulse';
    if (st === 'GMAIL_LIMIT_REACHED') return 'bg-red-500/20 text-red-300 border-red-500/40';
    if (st === 'Completed') return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    return 'bg-industrial-800 text-industrial-400 border-industrial-700';
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="industrial-card w-full max-w-4xl overflow-hidden shadow-2xl border-industrial-700 animate-in fade-in duration-200 my-8">
        
        {/* Modal Header */}
        <div className="p-5 bg-industrial-950 border-b border-industrial-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-orange/20 border border-brand-orange/40 flex items-center justify-center text-brand-orange">
              {currentCampaign.status === 'Running' ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-white text-base">{currentCampaign.name}</h2>
                <span className={`text-[10px] px-2.5 py-0.5 rounded font-bold font-mono border ${getStatusBadgeClass(currentCampaign.status)}`}>
                  {currentCampaign.status}
                </span>
                {currentCampaign.is_test_mode ? (
                  <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    🧪 Test Mode
                  </span>
                ) : null}
              </div>
              <p className="text-xs text-industrial-400 mt-0.5">Subject: {currentCampaign.subject}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettingsModal(true)}
              className="p-2 rounded-lg text-industrial-400 hover:text-white hover:bg-industrial-800 border border-industrial-800 transition-colors"
              title="Sending Settings"
            >
              <Settings className="w-4 h-4" />
            </button>

            <button onClick={onClose} className="p-2 rounded-lg text-industrial-400 hover:text-white hover:bg-industrial-800 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          
          {/* Reusable Gmail Sending Capacity Card */}
          {capacity && (
            <GmailSendingCapacityCard capacity={capacity} onRefresh={fetchCampaignDetails} />
          )}

          {/* Progress Bar & Percentage */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono font-bold">
              <span className="text-white">
                Campaign Progress: {sent + failed + skipped} / {total} recipients processed
              </span>
              <span className="text-brand-orange text-sm font-extrabold">{percent}%</span>
            </div>

            <div className="w-full h-3 bg-industrial-950 rounded-full overflow-hidden border border-industrial-800 p-0.5">
              <div
                className="h-full bg-gradient-to-r from-brand-orange to-emerald-400 rounded-full transition-all duration-300"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>

          {/* Next Email Countdown & Current Status Banner */}
          <div className="p-4 bg-industrial-950 rounded-xl border border-industrial-800 text-xs font-mono flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-brand-orange animate-pulse shrink-0" />
              <span>
                Status: <strong className="text-white">{sendingLog ? `Sending to ${sendingLog.recipient_email}...` : currentCampaign.status}</strong>
              </span>
            </div>

            {currentCampaign.status === 'Running' && (
              <div className="flex items-center gap-2 bg-brand-orange/20 px-3 py-1.5 rounded-lg border border-brand-orange/40 text-brand-orange font-bold text-xs">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Next email in: {nextEmailInSec !== null && nextEmailInSec > 0 ? `${nextEmailInSec}s` : 'Sending...'}</span>
              </div>
            )}
          </div>

          {/* Statistics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center">
            <div className="p-3 bg-industrial-950/80 rounded-xl border border-industrial-800">
              <span className="text-[10px] text-industrial-400 uppercase font-mono block">Total Queue</span>
              <strong className="text-white text-lg font-mono">{total}</strong>
            </div>

            <div className="p-3 bg-industrial-950/80 rounded-xl border border-industrial-800">
              <span className="text-[10px] text-emerald-400 uppercase font-mono block">Sent</span>
              <strong className="text-emerald-400 text-lg font-mono">{sent}</strong>
            </div>

            <div className="p-3 bg-industrial-950/80 rounded-xl border border-industrial-800">
              <span className="text-[10px] text-red-400 uppercase font-mono block">Failed</span>
              <strong className="text-red-400 text-lg font-mono">{failed}</strong>
            </div>

            <div className="p-3 bg-industrial-950/80 rounded-xl border border-industrial-800">
              <span className="text-[10px] text-amber-300 uppercase font-mono block">Skipped</span>
              <strong className="text-amber-300 text-lg font-mono">{skipped}</strong>
            </div>

            <div className="p-3 bg-industrial-950/80 rounded-xl border border-industrial-800">
              <span className="text-[10px] text-industrial-400 uppercase font-mono block">Pending</span>
              <strong className="text-industrial-200 text-lg font-mono">{remaining}</strong>
            </div>
          </div>

          {/* Activity Log Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-industrial-300 uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <Terminal className="w-4 h-4 text-brand-orange" />
                <span>Live Send Logs</span>
              </span>
              <span className="text-[11px] text-industrial-500 font-mono">{logs.length} Log Entries</span>
            </div>

            <div className="bg-industrial-950 border border-industrial-800 rounded-xl overflow-hidden max-h-[220px] overflow-y-auto">
              <table className="w-full text-left text-xs font-mono border-collapse">
                <thead className="sticky top-0 bg-industrial-900 border-b border-industrial-800 text-[10px] uppercase text-industrial-400">
                  <tr>
                    <th className="p-2.5">Recipient</th>
                    <th className="p-2.5">Company</th>
                    <th className="p-2.5">Status</th>
                    <th className="p-2.5 text-right">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-industrial-800/50 text-[11px]">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-industrial-900/40">
                      <td className="p-2.5 text-white font-bold">{log.recipient_email}</td>
                      <td className="p-2.5 text-industrial-300 truncate max-w-[140px]">{log.company_name}</td>
                      <td className="p-2.5">
                        {log.status === 'Sent' ? (
                          <span className="text-emerald-400 font-bold">✓ Sent</span>
                        ) : log.status === 'Sending' ? (
                          <span className="text-brand-orange font-bold animate-pulse">⏳ Sending...</span>
                        ) : log.status === 'Failed' ? (
                          <span className="text-red-400 font-bold">⚠️ {log.error_message || 'Failed'}</span>
                        ) : (
                          <span className="text-industrial-500">{log.status}</span>
                        )}
                      </td>
                      <td className="p-2.5 text-right text-industrial-500">
                        {log.sent_at ? new Date(log.sent_at).toLocaleTimeString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Action Control Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-industrial-800">
            <div className="flex items-center gap-2">
              {remaining > 0 && (
                <button
                  onClick={() => setShowClearConfirm(true)}
                  disabled={actionLoading}
                  className="px-3.5 py-2 rounded-xl bg-industrial-900 hover:bg-industrial-800 text-industrial-400 hover:text-red-400 text-xs font-bold border border-industrial-800 transition-all flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear Queue</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              {(currentCampaign.status === 'Running' || currentCampaign.status === 'QUEUED') && (
                <button
                  onClick={handlePause}
                  disabled={actionLoading}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-xs border border-amber-500/40 transition-all"
                >
                  <Pause className="w-4 h-4" />
                  <span>Pause Campaign</span>
                </button>
              )}

              {(currentCampaign.status === 'Paused' || currentCampaign.status === 'CAP_REACHED' || currentCampaign.status === 'GMAIL_LIMIT_REACHED') && (
                <button
                  onClick={handleResume}
                  disabled={actionLoading}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-orange hover:bg-orange-600 text-white font-bold text-xs shadow-lg shadow-brand-orange/20 transition-all"
                >
                  <Play className="w-4 h-4" />
                  <span>Resume Campaign</span>
                </button>
              )}

              {(currentCampaign.status === 'Running' || currentCampaign.status === 'Paused' || currentCampaign.status === 'CAP_REACHED') && (
                <button
                  onClick={() => setShowStopConfirm(true)}
                  disabled={actionLoading}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 font-bold text-xs border border-red-500/40 transition-all"
                >
                  <Square className="w-4 h-4" />
                  <span>Stop Campaign</span>
                </button>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* Stop Confirmation Modal */}
      {showStopConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="industrial-card max-w-md w-full p-6 space-y-4 border border-red-500/40">
            <h3 className="font-extrabold text-white text-base flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <span>Stop Email Campaign?</span>
            </h3>
            <p className="text-xs text-industrial-300 leading-relaxed">
              Are you sure you want to stop <strong>{currentCampaign.name}</strong>? This will permanently cancel all remaining pending queue jobs.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowStopConfirm(false)}
                className="px-4 py-2 rounded-xl bg-industrial-800 text-industrial-300 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmStop}
                className="px-4 py-2 rounded-xl bg-red-600 text-white font-bold text-xs shadow-lg"
              >
                Yes, Stop Campaign
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear Queue Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="industrial-card max-w-md w-full p-6 space-y-4 border border-amber-500/40">
            <h3 className="font-extrabold text-white text-base flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-amber-400" />
              <span>Clear Pending Queue Jobs?</span>
            </h3>
            <p className="text-xs text-industrial-300 leading-relaxed">
              This will remove all remaining pending email jobs for this campaign. Sent history will be preserved.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 rounded-xl bg-industrial-800 text-industrial-300 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleClearQueue}
                className="px-4 py-2 rounded-xl bg-amber-600 text-white font-bold text-xs shadow-lg"
              >
                Yes, Clear Pending Queue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="industrial-card max-w-lg w-full p-6 space-y-5 border border-industrial-700">
            <div className="flex items-center justify-between border-b border-industrial-800 pb-3">
              <h3 className="font-extrabold text-white text-base flex items-center gap-2">
                <Settings className="w-5 h-5 text-brand-orange" />
                <span>Sending Interval & Queue Settings</span>
              </h3>
              <button onClick={() => setShowSettingsModal(false)} className="p-1 rounded text-industrial-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {settingsMsg && (
              <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-400 text-xs font-semibold">
                {settingsMsg}
              </div>
            )}

            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-industrial-300">Min Delay (Seconds)</label>
                  <input
                    type="number"
                    min="1"
                    value={minDelay}
                    onChange={(e) => setMinDelay(parseInt(e.target.value) || 1)}
                    className="industrial-input w-full text-xs font-mono font-bold"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-industrial-300">Max Delay (Seconds)</label>
                  <input
                    type="number"
                    min={minDelay}
                    value={maxDelay}
                    onChange={(e) => setMaxDelay(parseInt(e.target.value) || minDelay)}
                    className="industrial-input w-full text-xs font-mono font-bold"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-industrial-800">
                <label className="flex items-center gap-3 cursor-pointer text-xs font-bold text-industrial-200">
                  <input
                    type="checkbox"
                    checked={autoResume}
                    onChange={(e) => setAutoResume(e.target.checked)}
                    className="rounded border-industrial-700 text-brand-orange focus:ring-0 w-4 h-4"
                  />
                  <span>Auto-Resume Queue when 24h Capacity opens up</span>
                </label>
              </div>

              <div className="p-3 bg-industrial-950 rounded-xl border border-industrial-800 text-[11px] text-industrial-400 leading-relaxed">
                ℹ️ <strong>ProSQORA Safety Cap:</strong> Fixed at 499 sends per rolling 24 hours to protect connected Gmail accounts.
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-industrial-800">
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className="px-4 py-2 rounded-xl bg-industrial-800 text-industrial-300 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl bg-brand-orange hover:bg-orange-600 text-white font-bold text-xs shadow-lg shadow-brand-orange/20"
                >
                  Save Settings
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
