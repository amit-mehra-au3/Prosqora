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
  Ban
} from 'lucide-react';

export default function CampaignProgressModal({ campaign, onClose, onCampaignUpdated }) {
  const [currentCampaign, setCurrentCampaign] = useState(campaign);
  const [logs, setLogs] = useState([]);
  const [showStopConfirm, setShowStopConfirm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    let interval;
    fetchCampaignDetails();

    interval = setInterval(() => {
      fetchCampaignDetails();
    }, 2000);

    return () => clearInterval(interval);
  }, [campaign.campaign_id]);

  const fetchCampaignDetails = async () => {
    try {
      const res = await axios.get(`/api/email-campaigns/${campaign.campaign_id}`);
      if (res.data.success) {
        setCurrentCampaign(res.data.campaign);
        setLogs(res.data.logs || []);
        if (onCampaignUpdated) onCampaignUpdated(res.data.campaign);
      }
    } catch (e) {}
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

  const total = currentCampaign.total_count || 0;
  const sent = currentCampaign.sent_count || 0;
  const failed = currentCampaign.failed_count || 0;
  const skipped = currentCampaign.skipped_count || 0;
  const remaining = Math.max(0, total - (sent + failed + skipped));

  const percent = total > 0 ? Math.min(100, Math.round(((sent + failed + skipped) / total) * 100)) : 0;

  const sendingLog = logs.find((l) => l.status === 'Sending');

  const statusColor =
    currentCampaign.status === 'Running'
      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
      : currentCampaign.status === 'Paused'
      ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
      : currentCampaign.status === 'Completed'
      ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      : 'bg-red-500/20 text-red-400 border-red-500/30';

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="industrial-card w-full max-w-3xl overflow-hidden shadow-2xl border-industrial-700 animate-in fade-in duration-200">
        
        {/* Header */}
        <div className="p-5 bg-industrial-900 border-b border-industrial-800 flex items-center justify-between">
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
                <span className={`text-[10px] px-2.5 py-0.5 rounded font-bold font-mono border ${statusColor}`}>
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

          <button onClick={onClose} className="p-2 rounded-lg text-industrial-400 hover:text-white hover:bg-industrial-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          
          {/* Progress Bar & Percentage */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono font-bold">
              <span className="text-white">
                Progress: {sent + failed + skipped} / {total} emails processed
              </span>
              <span className="text-brand-orange text-sm">{percent}%</span>
            </div>

            <div className="w-full h-3 bg-industrial-950 rounded-full overflow-hidden border border-industrial-800 p-0.5">
              <div
                className="h-full bg-gradient-to-r from-brand-orange to-emerald-400 rounded-full transition-all duration-300"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>

          {/* Current Status Indicator */}
          <div className="p-3 bg-industrial-950 rounded-xl border border-industrial-800 text-xs font-mono flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-brand-orange animate-pulse" />
              <span>
                Status: {sendingLog ? `Sending to ${sendingLog.recipient_email}...` : currentCampaign.status}
              </span>
            </div>
            <span className="text-industrial-400 text-[11px]">Delay: 7–12s</span>
          </div>

          {/* Statistics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center">
            <div className="p-3 bg-industrial-950/80 rounded-xl border border-industrial-800">
              <span className="text-[10px] text-industrial-400 uppercase font-mono block">Total</span>
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
              <span className="text-[10px] text-industrial-400 uppercase font-mono block">Remaining</span>
              <strong className="text-industrial-200 text-lg font-mono">{remaining}</strong>
            </div>
          </div>

          {/* Real-Time Activity Log Scrollbox */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-industrial-300 uppercase tracking-wider">
              <Terminal className="w-4 h-4 text-brand-orange" />
              <span>Real-Time Activity Log</span>
            </div>

            <div className="h-44 overflow-y-auto p-3 bg-industrial-950 rounded-xl border border-industrial-800 font-mono text-xs space-y-1.5">
              {logs.length === 0 ? (
                <p className="text-industrial-500 text-[11px]">Waiting for queue execution...</p>
              ) : (
                logs.map((log) => {
                  if (log.status === 'Sent') {
                    return (
                      <div key={log.id} className="text-emerald-400 flex items-center justify-between text-[11px]">
                        <span>✓ Email sent to {log.company_name ? `${log.company_name} <${log.recipient_email}>` : log.recipient_email}</span>
                        <span className="text-industrial-500">{new Date(log.sent_at || Date.now()).toLocaleTimeString()}</span>
                      </div>
                    );
                  }
                  if (log.status === 'Failed') {
                    return (
                      <div key={log.id} className="text-red-400 flex items-center justify-between text-[11px]">
                        <span>✕ Failed: {log.recipient_email} ({log.error_message})</span>
                        <span className="text-industrial-500">{new Date(log.sent_at || Date.now()).toLocaleTimeString()}</span>
                      </div>
                    );
                  }
                  if (log.status === 'Sending') {
                    return (
                      <div key={log.id} className="text-brand-orange animate-pulse flex items-center justify-between text-[11px]">
                        <span>➔ Sending email to {log.recipient_email}...</span>
                      </div>
                    );
                  }
                  return (
                    <div key={log.id} className="text-industrial-400 flex items-center justify-between text-[11px]">
                      <span>⏱ Pending: {log.recipient_email}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Confirmation Overlay for Stop */}
          {showStopConfirm && (
            <div className="p-4 bg-red-500/20 border border-red-500/40 rounded-xl space-y-3">
              <div className="flex items-center gap-2 text-red-300 font-bold text-xs">
                <AlertCircle className="w-4 h-4" />
                <span>Are you sure you want to stop this campaign? Remaining emails will not be sent.</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleConfirmStop}
                  disabled={actionLoading}
                  className="px-4 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white font-bold text-xs"
                >
                  Yes, Stop Campaign
                </button>
                <button
                  type="button"
                  onClick={() => setShowStopConfirm(false)}
                  className="px-4 py-1.5 rounded-lg bg-industrial-800 text-industrial-300 hover:text-white font-semibold text-xs"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Controls Footer */}
          <div className="pt-2 flex items-center justify-between border-t border-industrial-800">
            <div className="flex items-center gap-2">
              {currentCampaign.status === 'Running' && (
                <button
                  type="button"
                  onClick={handlePause}
                  disabled={actionLoading}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-md"
                >
                  <Pause className="w-4 h-4" />
                  <span>Pause Campaign</span>
                </button>
              )}

              {currentCampaign.status === 'Paused' && (
                <button
                  type="button"
                  onClick={handleResume}
                  disabled={actionLoading}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-md"
                >
                  <Play className="w-4 h-4" />
                  <span>Resume Campaign</span>
                </button>
              )}

              {(currentCampaign.status === 'Running' || currentCampaign.status === 'Paused') && (
                <button
                  type="button"
                  onClick={() => setShowStopConfirm(true)}
                  disabled={actionLoading}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-industrial-800 hover:bg-red-500/20 text-red-400 font-bold text-xs border border-industrial-700"
                >
                  <Square className="w-4 h-4" />
                  <span>Stop Campaign</span>
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-industrial-800 hover:bg-industrial-700 text-white font-bold text-xs"
            >
              Close Window
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
