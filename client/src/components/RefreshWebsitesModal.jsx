import React, { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import {
  RefreshCw,
  X,
  CheckCircle2,
  AlertTriangle,
  Info,
  Clock,
  Zap,
  StopCircle,
  Globe,
  Check,
  PauseCircle,
  ShieldCheck,
  Building2
} from 'lucide-react';
import { normalizeWebsite } from '../utils/normalizeWebsite';

export default function RefreshWebsitesModal({ leads, onClose, onRefreshCompleted }) {
  // Step 1: Confirmation, Step 2: Live Scanning, Step 3: Completed
  const [step, setStep] = useState(1);

  // Extract unique websites count for confirmation screen
  const uniqueWebsitesSummary = useMemo(() => {
    const set = new Set();
    (leads || []).forEach((l) => {
      const norm = normalizeWebsite(l.website || l.normalized_url || '');
      if (norm) set.add(norm);
    });
    return {
      totalLeads: (leads || []).length,
      uniqueCount: set.size
    };
  }, [leads]);

  // Live Refresh Progress State
  const [scanning, setScanning] = useState(false);
  const [cancelRequested, setCancelRequested] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const cancelRequestedRef = useRef(false);

  const [processedCount, setProcessedCount] = useState(0);
  const [scannedCount, setScannedCount] = useState(0);
  const [updatedCount, setUpdatedCount] = useState(0);
  const [needsReviewCount, setNeedsReviewCount] = useState(0);
  const [notAccessibleCount, setNotAccessibleCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);

  const [currentWebsite, setCurrentWebsite] = useState('');
  const [currentStage, setCurrentStage] = useState('Preparing queue...');
  const [upcomingQueue, setUpcomingQueue] = useState([]);

  // Live Elapsed Timer & Dynamic Speed & ETA
  const [startTime, setStartTime] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');

  // Live Timer Interval
  useEffect(() => {
    let timer = null;
    if (step === 2 && startTime && scanning) {
      timer = setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [step, startTime, scanning]);

  // Start Real-Time Batch Rescan Loop
  const handleStartRefresh = async () => {
    if (!leads || leads.length === 0) return;

    setScanning(true);
    setCancelRequested(false);
    cancelRequestedRef.current = false;
    setStep(2);
    setErrorMessage('');

    setProcessedCount(0);
    setScannedCount(0);
    setUpdatedCount(0);
    setNeedsReviewCount(0);
    setNotAccessibleCount(0);
    setFailedCount(0);

    const now = Date.now();
    setStartTime(now);
    setElapsedSeconds(0);

    const totalLeads = leads.length;
    const chunkSize = 5; // Process in chunks of 5 leads

    try {
      for (let i = 0; i < totalLeads; i += chunkSize) {
        if (cancelRequestedRef.current) {
          break;
        }

        const chunkLeads = leads.slice(i, i + chunkSize);
        const leadIdsChunk = chunkLeads.map((l) => l.id);

        const firstUrl = (chunkLeads[0].website || '').trim();
        setCurrentWebsite(firstUrl || 'Scanning website chunk...');
        setCurrentStage('Checking website availability & extracting updated company info...');

        // Upcoming preview
        const nextLeads = leads.slice(i + chunkSize, i + chunkSize + 3);
        setUpcomingQueue(nextLeads.map((l) => l.website || l.company_name || 'Lead'));

        const res = await axios.post('/api/leads/rescan-chunk', {
          leadIdsChunk,
          concurrency: 3
        });

        if (cancelRequestedRef.current) {
          break;
        }

        if (res.data && res.data.success) {
          const chunkRes = res.data;
          setProcessedCount((prev) => prev + chunkLeads.length);
          setScannedCount((prev) => prev + (chunkRes.rescannedCount || 0));
          setUpdatedCount((prev) => prev + (chunkRes.updatedCount || 0));
          setNeedsReviewCount((prev) => prev + (chunkRes.needsReviewCount || 0));
          setNotAccessibleCount((prev) => prev + (chunkRes.notAccessibleCount || 0));
          setFailedCount((prev) => prev + (chunkRes.failedCount || 0));
        }
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.error || 'Website refresh loop encountered an error.');
    } finally {
      setScanning(false);
      setStep(3);
    }
  };

  const handleConfirmCancel = () => {
    cancelRequestedRef.current = true;
    setCancelRequested(true);
    setShowCancelModal(false);
    setScanning(false);
    setStep(3);
  };

  // Speed and Dynamic ETA Calculations
  const processingSpeed = useMemo(() => {
    if (elapsedSeconds <= 0 || processedCount <= 0) return 0;
    return (processedCount / elapsedSeconds).toFixed(1);
  }, [processedCount, elapsedSeconds]);

  const estimatedRemainingSeconds = useMemo(() => {
    const total = (leads || []).length;
    if (total <= 0 || processedCount <= 0 || elapsedSeconds <= 0) return null;
    const remaining = total - processedCount;
    if (remaining <= 0) return 0;
    const speed = processedCount / elapsedSeconds;
    if (speed <= 0) return null;
    return Math.ceil(remaining / speed);
  }, [leads, processedCount, elapsedSeconds]);

  const formatSeconds = (sec) => {
    if (sec === null || sec === undefined || isNaN(sec)) return '--:--';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const formatEtaText = (sec) => {
    if (sec === null || isNaN(sec)) return 'Calculating...';
    if (sec <= 0) return 'Almost finished...';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    if (m > 0) return `~${m} min ${s} sec`;
    return `~${s} sec`;
  };

  const progressPercentage = useMemo(() => {
    const total = (leads || []).length;
    if (total === 0) return 0;
    return Math.min(100, Math.round((processedCount / total) * 100));
  }, [processedCount, leads]);

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="industrial-card w-full max-w-3xl flex flex-col overflow-hidden shadow-2xl border-industrial-700 animate-in fade-in duration-200">
        
        {/* Header */}
        <div className="p-5 bg-industrial-900 border-b border-industrial-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-orange/20 border border-brand-orange/40 flex items-center justify-center text-brand-orange">
              <RefreshCw className={`w-5 h-5 ${scanning ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <h2 className="font-extrabold text-white text-base">Refresh / Re-scan All Websites</h2>
              <p className="text-xs text-industrial-400">
                Re-scans websites for existing CRM leads without altering total lead count.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-industrial-400 hover:text-white hover:bg-industrial-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 flex-1 overflow-y-auto">
          
          {errorMessage && (
            <div className="p-4 bg-red-500/20 border border-red-500/40 rounded-xl text-red-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* STEP 1: CONFIRMATION & INITIAL ESTIMATE */}
          {step === 1 && (
            <div className="space-y-6 py-2">
              <div className="flex items-center gap-4 p-5 bg-industrial-950 rounded-2xl border border-industrial-800">
                <div className="w-12 h-12 rounded-2xl bg-brand-orange/20 border border-brand-orange/40 flex items-center justify-center text-brand-orange shrink-0">
                  <Globe className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">Refresh All Existing Lead Websites?</h3>
                  <p className="text-xs text-industrial-400 mt-1">
                    This will re-verify website availability and update company details using the AutoLead Website Scanner Engine.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                <div className="p-4 bg-industrial-950 rounded-xl border border-industrial-800">
                  <span className="text-[10px] text-industrial-400 block font-sans uppercase tracking-wider font-semibold">Total Existing Leads</span>
                  <span className="text-2xl font-black text-white mt-1 block">{uniqueWebsitesSummary.totalLeads} leads</span>
                </div>

                <div className="p-4 bg-industrial-950 rounded-xl border border-industrial-800">
                  <span className="text-[10px] text-industrial-400 block font-sans uppercase tracking-wider font-semibold">Unique Websites to Scan</span>
                  <span className="text-2xl font-black text-brand-orange mt-1 block">{uniqueWebsitesSummary.uniqueCount} websites</span>
                </div>
              </div>

              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 text-xs flex items-start gap-3">
                <Info className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
                <div>
                  <span className="font-bold block text-white">Estimated Processing Duration</span>
                  <p className="mt-0.5 text-industrial-300 text-[11px]">
                    Checking {uniqueWebsitesSummary.uniqueCount} unique websites will take approximately ~{Math.ceil((uniqueWebsitesSummary.uniqueCount * 0.8) / 60)} minutes depending on site response times.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-industrial-950 rounded-xl border border-industrial-800 text-xs text-industrial-300 space-y-1">
                <div className="flex items-center gap-2 font-bold text-white mb-1">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>CRM Data Protection Guarantee:</span>
                </div>
                <p className="text-[11px] text-industrial-400">
                  • <strong>Zero Lead Creation:</strong> Lead count will remain exactly {uniqueWebsitesSummary.totalLeads}.
                </p>
                <p className="text-[11px] text-industrial-400">
                  • <strong>Data Preservation:</strong> Existing non-empty CRM contact data, notes, and activity history will NOT be overwritten.
                </p>
              </div>
            </div>
          )}

          {/* STEP 2: LIVE REFRESH PROGRESS DASHBOARD */}
          {step === 2 && (
            <div className="py-2 space-y-6">
              
              {/* Progress Header & Counter */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-industrial-950 rounded-2xl border border-industrial-800">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-5 h-5 text-brand-orange animate-spin" />
                    <h3 className="text-base font-extrabold text-white">Refreshing Websites</h3>
                  </div>
                  <p className="text-xs text-industrial-400 font-mono">
                    <strong className="text-brand-orange text-sm font-extrabold">{processedCount}</strong> / {leads.length} leads rescanned
                  </p>
                </div>

                <div className="flex items-center gap-4 text-xs font-mono">
                  <div className="px-3 py-1.5 rounded-lg bg-industrial-900 border border-industrial-800 text-industrial-300 flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-industrial-400" />
                    <span>Elapsed: {formatSeconds(elapsedSeconds)}</span>
                  </div>

                  <div className="px-3 py-1.5 rounded-lg bg-industrial-900 border border-industrial-800 text-industrial-300 flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>{processingSpeed > 0 ? `${processingSpeed} sites/sec` : 'Measuring...'}</span>
                  </div>

                  <div className="px-3.5 py-1.5 rounded-lg bg-brand-orange/10 border border-brand-orange/30 text-brand-orange font-bold">
                    ETA: {formatEtaText(estimatedRemainingSeconds)}
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-mono font-bold">
                  <span className="text-industrial-300">Rescan Progress</span>
                  <span className="text-brand-orange">{progressPercentage}%</span>
                </div>
                <div className="w-full bg-industrial-950 rounded-full h-3.5 border border-industrial-800 overflow-hidden p-0.5">
                  <div
                    className="bg-gradient-to-r from-orange-500 to-amber-400 h-full rounded-full transition-all duration-300 shadow-md shadow-brand-orange/30"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
              </div>

              {/* Currently Scanning Card */}
              <div className="p-4 bg-industrial-950 rounded-xl border border-industrial-800 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-industrial-400 font-semibold uppercase text-[10px] tracking-wider">Currently Scanning</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-brand-orange/20 text-brand-orange border border-brand-orange/30 font-bold text-[10px]">
                    ● {currentStage}
                  </span>
                </div>

                <div className="flex items-center gap-3 bg-industrial-900 p-3 rounded-lg border border-industrial-800">
                  <Globe className="w-5 h-5 text-brand-orange shrink-0 animate-pulse" />
                  <span className="font-mono text-sm font-bold text-white truncate">
                    {currentWebsite || 'Preparing rescan batch...'}
                  </span>
                </div>
              </div>

              {/* Live Status Counter Grid */}
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-center">
                <div className="p-3 bg-industrial-900 border border-industrial-800 rounded-xl">
                  <span className="text-[10px] text-industrial-400 block font-semibold">Scanned</span>
                  <span className="font-extrabold text-white text-lg">{scannedCount}</span>
                </div>

                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                  <span className="text-[10px] text-emerald-400 block font-semibold">Updated</span>
                  <span className="font-extrabold text-emerald-400 text-lg">{updatedCount}</span>
                </div>

                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                  <span className="text-[10px] text-amber-400 block font-semibold">Needs Review</span>
                  <span className="font-extrabold text-amber-400 text-lg">{needsReviewCount}</span>
                </div>

                <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                  <span className="text-[10px] text-purple-300 block font-semibold">Not Accessible</span>
                  <span className="font-extrabold text-purple-300 text-lg">{notAccessibleCount}</span>
                </div>

                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                  <span className="text-[10px] text-rose-300 block font-semibold">Failed</span>
                  <span className="font-extrabold text-rose-300 text-lg">{failedCount}</span>
                </div>

                <div className="p-3 bg-industrial-900 border border-industrial-800 rounded-xl">
                  <span className="text-[10px] text-industrial-400 block font-semibold">Remaining</span>
                  <span className="font-extrabold text-white text-lg">{leads.length - processedCount}</span>
                </div>
              </div>

            </div>
          )}

          {/* STEP 3: RESCAN COMPLETED */}
          {step === 3 && (
            <div className="space-y-6 py-4">
              <div className="flex flex-col items-center justify-center text-center space-y-2">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-extrabold text-white">Website Refresh Complete!</h3>
                <p className="text-xs text-industrial-400">
                  {scannedCount} existing lead websites rescanned and updated in real time. Total lead count remains exactly {leads.length}.
                </p>
              </div>

              {cancelRequested && (
                <div className="p-3 bg-amber-500/15 border border-amber-500/30 rounded-xl text-amber-300 text-xs flex items-center gap-2">
                  <PauseCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Rescan stopped early. Completed website updates are saved in your CRM.</span>
                </div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 max-w-2xl mx-auto text-center font-mono">
                <div className="p-4 bg-industrial-900 border border-industrial-800 rounded-xl">
                  <span className="text-xs font-semibold text-industrial-400 block">Scanned</span>
                  <span className="text-2xl font-black text-white">{scannedCount}</span>
                </div>

                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                  <span className="text-xs font-semibold text-emerald-400 block">Updated</span>
                  <span className="text-2xl font-black text-emerald-400">{updatedCount}</span>
                </div>

                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                  <span className="text-xs font-semibold text-amber-400 block">Needs Review</span>
                  <span className="text-2xl font-black text-amber-400">{needsReviewCount}</span>
                </div>

                <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                  <span className="text-xs font-semibold text-purple-300 block">Not Accessible</span>
                  <span className="text-2xl font-black text-purple-300">{notAccessibleCount}</span>
                </div>

                <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                  <span className="text-xs font-semibold text-rose-300 block">Failed</span>
                  <span className="text-2xl font-black text-rose-300">{failedCount}</span>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-industrial-900 border-t border-industrial-800 flex items-center justify-between">
          {step === 1 ? (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-industrial-800 text-industrial-300 font-semibold text-xs hover:bg-industrial-700"
              >
                Cancel
              </button>

              <button
                onClick={handleStartRefresh}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-brand-orange hover:bg-orange-600 text-white font-bold text-xs shadow-lg shadow-brand-orange/20"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Start Website Refresh ({uniqueWebsitesSummary.uniqueCount})</span>
              </button>
            </>
          ) : step === 2 ? (
            <div className="w-full flex items-center justify-between">
              <span className="text-xs text-industrial-400 font-mono">
                Refresh in progress... ({processedCount} / {leads.length})
              </span>

              <button
                onClick={() => setShowCancelModal(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 font-bold text-xs border border-red-500/40 transition-colors"
              >
                <StopCircle className="w-4 h-4 text-red-400" />
                <span>Cancel Refresh</span>
              </button>
            </div>
          ) : (
            <div className="w-full flex items-center justify-end">
              <button
                onClick={() => {
                  onClose();
                  if (onRefreshCompleted) onRefreshCompleted();
                }}
                className="px-6 py-2.5 rounded-xl bg-brand-orange hover:bg-orange-600 text-white font-bold text-xs shadow-lg shadow-brand-orange/20"
              >
                Done
              </button>
            </div>
          )}
        </div>

      </div>

      {/* CANCEL CONFIRMATION MODAL */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="industrial-card max-w-md w-full p-6 space-y-6 shadow-2xl border-industrial-700 animate-in fade-in duration-150">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-white text-base">Stop Website Refresh?</h3>
                <p className="text-xs text-industrial-400">Stop ongoing website rescan loop.</p>
              </div>
            </div>

            <div className="p-4 bg-industrial-950 border border-industrial-800 rounded-xl text-xs text-industrial-300 space-y-2">
              <p>
                Website scanning is currently in progress ({processedCount} of {leads.length} completed).
              </p>
              <p className="text-amber-300 text-[11px]">
                Completed website updates will remain saved in your CRM. Remaining websites will not be rescanned.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2 rounded-xl bg-industrial-800 text-industrial-300 font-semibold text-xs hover:bg-industrial-700"
              >
                Continue Scanning
              </button>

              <button
                onClick={handleConfirmCancel}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20"
              >
                Stop Refresh
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
