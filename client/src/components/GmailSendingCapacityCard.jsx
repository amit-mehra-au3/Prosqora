import React, { useState, useEffect } from 'react';
import { Mail, Clock, ShieldCheck, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';

export default function GmailSendingCapacityCard({ capacity = {}, onRefresh }) {
  const limit = capacity.limit || 499;
  const used = capacity.used || 0;
  const remaining = capacity.remaining !== undefined ? capacity.remaining : Math.max(0, limit - used);
  const isCapReached = !!capacity.isCapReached || used >= limit;
  const nextAvailableAt = capacity.nextAvailableAt;

  const percent = Math.min(100, Math.round((used / limit) * 100));

  // Live countdown state
  const [countdownStr, setCountdownStr] = useState('');

  useEffect(() => {
    let timer;
    const updateCountdown = () => {
      if (!nextAvailableAt) {
        setCountdownStr('');
        return;
      }

      const now = Date.now();
      const target = new Date(nextAvailableAt).getTime();
      const diffMs = target - now;

      if (diffMs <= 0) {
        setCountdownStr('Capacity Available Now');
        if (onRefresh) onRefresh();
        return;
      }

      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diffMs % (1000 * 60)) / 1000);

      setCountdownStr(`${hours}h ${mins}m ${secs}s`);
    };

    updateCountdown();
    timer = setInterval(updateCountdown, 1000);

    return () => clearInterval(timer);
  }, [nextAvailableAt]);

  const formattedNextDate = nextAvailableAt
    ? new Date(nextAvailableAt).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })
    : null;

  return (
    <div className={`industrial-card p-6 space-y-4 border transition-all ${
      isCapReached
        ? 'border-amber-500/60 bg-amber-950/20 shadow-lg ring-1 ring-amber-500/40'
        : 'border-industrial-800 bg-industrial-950/90'
    }`}>
      
      {/* Top Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-industrial-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className={`p-2 rounded-xl border ${
            isCapReached
              ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
              : 'bg-brand-orange/20 text-brand-orange border-brand-orange/40'
          }`}>
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-white text-sm flex items-center gap-2">
              <span>Gmail Sending Capacity</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-industrial-800 text-brand-orange border border-industrial-700">
                Rolling 24h Window
              </span>
            </h3>
            <p className="text-[11px] text-industrial-400 mt-0.5">
              ProSQORA Application Safety Cap (Max 499 successful sends per 24 hours)
            </p>
          </div>
        </div>

        {onRefresh && (
          <button
            onClick={onRefresh}
            className="p-2 rounded-lg bg-industrial-900 hover:bg-industrial-800 text-industrial-400 hover:text-white border border-industrial-800 text-xs flex items-center gap-1 transition-all self-start sm:self-auto"
            title="Refresh Capacity Stats"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Cap Warning Banner if 499 reached */}
      {isCapReached && (
        <div className="p-4 bg-amber-500/20 border border-amber-500/40 rounded-xl text-amber-300 text-xs font-semibold flex items-start gap-3 animate-pulse">
          <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
          <div className="space-y-1">
            <p className="font-extrabold text-white text-sm">Daily Sending Safety Cap Reached (499 / 499)</p>
            <p className="text-amber-200/90 text-xs leading-relaxed">
              ProSQORA has automatically paused queue sending to protect your connected business Gmail account. Sending will automatically resume as capacity opens up.
            </p>
          </div>
        </div>
      )}

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-mono font-bold">
          <span className="text-industrial-300">
            Sending Usage: <strong className="text-white">{used}</strong> / {limit} emails
          </span>
          <span className={`${isCapReached ? 'text-amber-400' : 'text-brand-orange'} text-sm font-extrabold`}>
            {percent}%
          </span>
        </div>

        <div className="w-full h-3.5 bg-industrial-900 rounded-full overflow-hidden border border-industrial-800 p-0.5">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isCapReached
                ? 'bg-amber-500'
                : 'bg-gradient-to-r from-brand-orange via-orange-500 to-emerald-400'
            }`}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {/* Stats Summary Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
        
        <div className="p-3 bg-industrial-900/90 rounded-xl border border-industrial-800 text-center">
          <span className="text-[10px] text-industrial-400 uppercase font-mono block">24h Sends</span>
          <span className="text-base font-extrabold font-mono text-white">{used} / {limit}</span>
        </div>

        <div className="p-3 bg-industrial-900/90 rounded-xl border border-industrial-800 text-center">
          <span className="text-[10px] text-industrial-400 uppercase font-mono block">Remaining Slots</span>
          <span className={`text-base font-extrabold font-mono ${remaining === 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
            {remaining}
          </span>
        </div>

        <div className="col-span-2 sm:col-span-1 p-3 bg-industrial-900/90 rounded-xl border border-industrial-800 text-center">
          <span className="text-[10px] text-industrial-400 uppercase font-mono block">Next Capacity Slot</span>
          <span className="text-xs font-bold font-mono text-brand-orange truncate block">
            {countdownStr || 'Capacity Available'}
          </span>
        </div>

      </div>

      {/* Next Reset Timestamp Bar */}
      {formattedNextDate && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-industrial-900 rounded-xl border border-industrial-800/80 text-xs font-mono text-industrial-300 gap-2">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-brand-orange shrink-0" />
            <span>Next Capacity Available: <strong>{formattedNextDate}</strong></span>
          </div>

          {countdownStr && (
            <div className="px-2.5 py-1 rounded bg-brand-orange/15 text-brand-orange font-bold border border-brand-orange/30 shrink-0 text-center">
              Available in: {countdownStr}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
