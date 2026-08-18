import React, { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import {
  Upload,
  FileSpreadsheet,
  X,
  CheckCircle,
  AlertTriangle,
  Info,
  CheckCircle2,
  XCircle,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  FileText,
  Search,
  Eye,
  AlertCircle,
  Building2,
  Globe,
  Mail,
  Phone,
  MapPin,
  Check,
  Clock,
  Zap,
  StopCircle,
  PauseCircle
} from 'lucide-react';
import { parseCSVText } from '../utils/csvParser';

export default function CsvImportModal({ onClose, onImportCompleted }) {
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [parsedRows, setParsedRows] = useState([]);

  // Pipeline Steps: 1 = File Select, 2 = Live Verifying Queue, 3 = Verification Results, 4 = Final Imported
  const [step, setStep] = useState(1);
  const [allowMissingWebsite, setAllowMissingWebsite] = useState(false);

  // Live Verification Real-Time Progress State
  const [verifying, setVerifying] = useState(false);
  const [cancelRequested, setCancelRequested] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const cancelRequestedRef = useRef(false);

  const [processedCount, setProcessedCount] = useState(0);
  const [verifiedCount, setVerifiedCount] = useState(0);
  const [needsReviewCount, setNeedsReviewCount] = useState(0);
  const [duplicatesCount, setDuplicatesCount] = useState(0);
  const [unreachableCount, setUnreachableCount] = useState(0);
  const [invalidCount, setInvalidCount] = useState(0);
  const [missingCount, setMissingCount] = useState(0);

  const [currentWebsite, setCurrentWebsite] = useState('');
  const [currentStage, setCurrentStage] = useState('Preparing queue...');
  const [upcomingQueue, setUpcomingQueue] = useState([]);

  // Live Elapsed Timer & Speed & ETA Calculations
  const [startTime, setStartTime] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [verifiedResults, setVerifiedResults] = useState([]);

  const [activeTab, setActiveTab] = useState('ALL');
  const [userApprovals, setUserApprovals] = useState({});

  const [importing, setImporting] = useState(false);
  const [finalImportResult, setFinalImportResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Live Elapsed Timer Interval
  useEffect(() => {
    let timer = null;
    if (step === 2 && startTime && verifying) {
      timer = setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [step, startTime, verifying]);

  const handleFileSelect = (selectedFile) => {
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv')) {
      setErrorMessage('Please select a valid .csv file.');
      return;
    }

    setFile(selectedFile);
    setFileName(selectedFile.name);
    setErrorMessage('');

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const rows = parseCSVText(text);
      if (rows.length === 0) {
        setErrorMessage('CSV file appears empty or unparseable.');
        return;
      }
      setParsedRows(rows);
    };
    reader.readAsText(selectedFile);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  // Real-Time Batch Streaming Loop Execution
  const handleStartVerification = async () => {
    if (parsedRows.length === 0) return;

    setVerifying(true);
    setCancelRequested(false);
    cancelRequestedRef.current = false;
    setStep(2);
    setErrorMessage('');

    setProcessedCount(0);
    setVerifiedCount(0);
    setNeedsReviewCount(0);
    setDuplicatesCount(0);
    setUnreachableCount(0);
    setInvalidCount(0);
    setMissingCount(0);
    setVerifiedResults([]);

    const now = Date.now();
    setStartTime(now);
    setElapsedSeconds(0);

    const totalRows = parsedRows.length;
    const chunkSize = 5; // Process in chunks of 5 rows for real-time responsiveness
    const accumulatedResults = [];
    const processedNormDomains = new Set();

    try {
      for (let i = 0; i < totalRows; i += chunkSize) {
        if (cancelRequestedRef.current) {
          break;
        }

        const chunkRows = parsedRows.slice(i, i + chunkSize).map((row, idx) => ({
          ...row,
          rowIdx: i + idx
        }));

        const firstUrl = (chunkRows[0].website || '').trim();
        setCurrentWebsite(firstUrl || 'Checking row batch...');
        setCurrentStage('Checking website availability & CRM duplicates...');

        // Update upcoming queue preview
        const nextRows = parsedRows.slice(i + chunkSize, i + chunkSize + 3);
        setUpcomingQueue(nextRows.map((r) => r.website || r.company_name || 'Item'));

        const res = await axios.post('/api/leads/verify-chunk', {
          rowsChunk: chunkRows,
          allowMissingWebsite,
          existingDomains: Array.from(processedNormDomains),
          concurrency: 3
        });

        if (cancelRequestedRef.current) {
          break;
        }

        if (res.data && res.data.success) {
          const chunkRes = res.data;

          (chunkRes.verifiedResults || []).forEach((item) => {
            accumulatedResults.push(item);
            if (item.normUrl) {
              processedNormDomains.add(item.normUrl);
            }
          });

          setProcessedCount((prev) => prev + chunkRows.length);
          setVerifiedCount((prev) => prev + (chunkRes.verifiedCount || 0));
          setNeedsReviewCount((prev) => prev + (chunkRes.needsReviewCount || 0));
          setDuplicatesCount((prev) => prev + (chunkRes.duplicatesCount || 0));
          setUnreachableCount((prev) => prev + (chunkRes.unreachableCount || 0));
          setInvalidCount((prev) => prev + (chunkRes.invalidCount || 0));
          setMissingCount((prev) => prev + (chunkRes.missingCount || 0));
          setVerifiedResults([...accumulatedResults]);
        }
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.error || 'Verification pipeline encountered an error.');
    } finally {
      setVerifying(false);
      setStep(3);
    }
  };

  const handleConfirmCancel = () => {
    cancelRequestedRef.current = true;
    setCancelRequested(true);
    setShowCancelModal(false);
    setVerifying(false);
    setStep(3);
  };

  // Real-Time Speed and Dynamic ETA Calculations
  const processingSpeed = useMemo(() => {
    if (elapsedSeconds <= 0 || processedCount <= 0) return 0;
    return (processedCount / elapsedSeconds).toFixed(1);
  }, [processedCount, elapsedSeconds]);

  const estimatedRemainingSeconds = useMemo(() => {
    const total = parsedRows.length;
    if (total <= 0 || processedCount <= 0 || elapsedSeconds <= 0) return null;
    const remaining = total - processedCount;
    if (remaining <= 0) return 0;
    const speed = processedCount / elapsedSeconds;
    if (speed <= 0) return null;
    return Math.ceil(remaining / speed);
  }, [parsedRows.length, processedCount, elapsedSeconds]);

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

  const toggleApproval = (rowIdx, choice = 'verified') => {
    setUserApprovals((prev) => {
      const current = prev[rowIdx];
      if (current && current.choice === choice) {
        const next = { ...prev };
        delete next[rowIdx];
        return next;
      }
      return {
        ...prev,
        [rowIdx]: { approved: true, choice }
      };
    });
  };

  const eligibleLeadsToImport = useMemo(() => {
    if (!verifiedResults || verifiedResults.length === 0) return [];
    const approvedLeads = [];

    verifiedResults.forEach((item) => {
      const isAutoVerified = item.status === 'Verified' && item.leadCandidate;
      const userOverride = userApprovals[item.rowIdx];

      if (isAutoVerified) {
        approvedLeads.push(item.leadCandidate);
      } else if (userOverride && userOverride.approved && item.leadCandidate) {
        const customCandidate = { ...item.leadCandidate };
        if (userOverride.choice === 'csv' && item.csvCompany) {
          customCandidate.company_name = item.csvCompany;
        }
        approvedLeads.push(customCandidate);
      }
    });

    return approvedLeads;
  }, [verifiedResults, userApprovals]);

  const handleImportVerifiedLeads = async () => {
    if (eligibleLeadsToImport.length === 0) {
      alert('No verified or approved leads selected for import.');
      return;
    }

    setImporting(true);
    setErrorMessage('');

    try {
      const res = await axios.post('/api/leads/import-verified', {
        verifiedLeads: eligibleLeadsToImport,
        fileName
      });

      if (res.data.success) {
        setFinalImportResult(res.data);
        setStep(4);
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.error || 'Failed to insert verified leads into CRM database.');
    } finally {
      setImporting(false);
    }
  };

  const filteredResultsList = useMemo(() => {
    if (!verifiedResults) return [];
    if (activeTab === 'ALL') return verifiedResults;
    return verifiedResults.filter((r) => r.status === activeTab);
  }, [verifiedResults, activeTab]);

  const progressPercentage = useMemo(() => {
    const total = parsedRows.length;
    if (total === 0) return 0;
    return Math.min(100, Math.round((processedCount / total) * 100));
  }, [processedCount, parsedRows.length]);

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="industrial-card w-full max-w-6xl max-h-[94vh] flex flex-col overflow-hidden shadow-2xl border-industrial-700 animate-in fade-in duration-200">
        
        {/* Modal Header */}
        <div className="p-5 bg-industrial-900 border-b border-industrial-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-orange/20 border border-brand-orange/40 flex items-center justify-center text-brand-orange">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-white text-base">CSV Import — Website Verification Engine</h2>
              <p className="text-xs text-industrial-400">
                Real-time website scanner verification & company data extraction pipeline.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-industrial-400 hover:text-white hover:bg-industrial-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Main Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {errorMessage && (
            <div className="p-4 bg-red-500/20 border border-red-500/40 rounded-xl text-red-300 text-xs flex items-center gap-2">
              <XCircle className="w-5 h-5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* STEP 1: UPLOAD CSV & OPTIONS */}
          {step === 1 && (
            <div className="space-y-6 py-2">
              {!file ? (
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  className="border-2 border-dashed border-industrial-700 hover:border-brand-orange rounded-2xl p-10 flex flex-col items-center justify-center text-center bg-industrial-950/60 hover:bg-industrial-950 transition-all cursor-pointer group"
                >
                  <div className="w-14 h-14 rounded-2xl bg-industrial-800 group-hover:bg-brand-orange/20 border border-industrial-700 group-hover:border-brand-orange/50 flex items-center justify-center text-industrial-300 group-hover:text-brand-orange mb-4 transition-colors">
                    <Upload className="w-7 h-7" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-1">Drag and drop your CSV file here</h3>
                  <p className="text-xs text-industrial-400 mb-6">Supports standard .csv file format up to 50,000 rows</p>
                  
                  <label className="px-6 py-3 rounded-xl bg-brand-orange hover:bg-orange-600 text-white font-bold text-xs shadow-lg shadow-brand-orange/20 cursor-pointer transition-all">
                    Browse CSV File
                    <input
                      type="file"
                      accept=".csv"
                      onChange={(e) => handleFileSelect(e.target.files[0])}
                      className="hidden"
                    />
                  </label>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-industrial-950 rounded-xl border border-industrial-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="w-6 h-6 text-brand-orange" />
                      <div>
                        <span className="font-bold text-white text-sm block">{fileName}</span>
                        <span className="text-xs text-industrial-400 font-mono">{parsedRows.length} total rows parsed</span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setFile(null);
                        setParsedRows([]);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-industrial-800 hover:bg-industrial-700 text-industrial-300 font-semibold text-xs border border-industrial-700"
                    >
                      Change File
                    </button>
                  </div>

                  {/* Initial Estimate & Large CSV Informational Warning */}
                  {parsedRows.length > 100 && (
                    <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 text-xs flex items-start gap-3">
                      <Info className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
                      <div>
                        <span className="font-bold block text-white">Large CSV Import Detected ({parsedRows.length} websites)</span>
                        <p className="mt-0.5 text-industrial-300 text-[11px]">
                          This file contains {parsedRows.length} websites. Verification will run in real-time batches. Estimated time: ~{Math.ceil((parsedRows.length * 0.8) / 60)} minutes.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="p-4 bg-industrial-950 rounded-xl border border-industrial-800 space-y-3 text-xs">
                    <label className="flex items-center gap-2.5 cursor-pointer font-medium text-white">
                      <input
                        type="checkbox"
                        checked={allowMissingWebsite}
                        onChange={(e) => setAllowMissingWebsite(e.target.checked)}
                        className="rounded border-industrial-700 text-brand-orange focus:ring-0"
                      />
                      <span>Allow rows without website URL (Flagged as Needs Review)</span>
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: LIVE REAL-TIME VERIFICATION PROGRESS DASHBOARD */}
          {step === 2 && (
            <div className="py-6 space-y-6">
              
              {/* Progress Header & Counter */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-industrial-950 rounded-2xl border border-industrial-800">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-5 h-5 text-brand-orange animate-spin" />
                    <h3 className="text-base font-extrabold text-white">Verifying Websites</h3>
                  </div>
                  <p className="text-xs text-industrial-400 font-mono">
                    <strong className="text-brand-orange text-sm font-extrabold">{processedCount}</strong> / {parsedRows.length} websites processed
                  </p>
                </div>

                <div className="flex items-center gap-4 text-xs font-mono">
                  <div className="px-3 py-1.5 rounded-lg bg-industrial-900 border border-industrial-800 text-industrial-300 flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-industrial-400" />
                    <span>Elapsed: {formatSeconds(elapsedSeconds)}</span>
                  </div>

                  <div className="px-3 py-1.5 rounded-lg bg-industrial-900 border border-industrial-800 text-industrial-300 flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>{processingSpeed > 0 ? `${processingSpeed} sites/sec` : 'Measuring speed...'}</span>
                  </div>

                  <div className="px-3.5 py-1.5 rounded-lg bg-brand-orange/10 border border-brand-orange/30 text-brand-orange font-bold">
                    ETA: {formatEtaText(estimatedRemainingSeconds)}
                  </div>
                </div>
              </div>

              {/* Animated Progress Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-mono font-bold">
                  <span className="text-industrial-300">Overall Verification Progress</span>
                  <span className="text-brand-orange">{progressPercentage}%</span>
                </div>
                <div className="w-full bg-industrial-950 rounded-full h-3.5 border border-industrial-800 overflow-hidden p-0.5">
                  <div
                    className="bg-gradient-to-r from-orange-500 to-amber-400 h-full rounded-full transition-all duration-300 shadow-md shadow-brand-orange/30"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-industrial-400 font-mono">
                  <span>{processedCount} completed</span>
                  <span>{parsedRows.length - processedCount} remaining</span>
                </div>
              </div>

              {/* Currently Verifying Card */}
              <div className="p-4 bg-industrial-950 rounded-xl border border-industrial-800 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-industrial-400 font-semibold uppercase text-[10px] tracking-wider">Currently Verifying</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-brand-orange/20 text-brand-orange border border-brand-orange/30 font-bold text-[10px]">
                    ● {currentStage}
                  </span>
                </div>

                <div className="flex items-center gap-3 bg-industrial-900 p-3 rounded-lg border border-industrial-800">
                  <Globe className="w-5 h-5 text-brand-orange shrink-0 animate-pulse" />
                  <span className="font-mono text-sm font-bold text-white truncate">
                    {currentWebsite || 'Preparing verification queue...'}
                  </span>
                </div>
              </div>

              {/* Real-time Status Counters */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center">
                  <span className="text-[10px] text-emerald-400 block font-semibold">Verified</span>
                  <span className="font-extrabold text-emerald-400 text-lg">{verifiedCount}</span>
                </div>

                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-center">
                  <span className="text-[10px] text-amber-400 block font-semibold">Needs Review</span>
                  <span className="font-extrabold text-amber-400 text-lg">{needsReviewCount}</span>
                </div>

                <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl text-center">
                  <span className="text-[10px] text-purple-300 block font-semibold">Duplicates</span>
                  <span className="font-extrabold text-purple-300 text-lg">{duplicatesCount}</span>
                </div>

                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-center">
                  <span className="text-[10px] text-rose-300 block font-semibold">Unreachable / Timeout</span>
                  <span className="font-extrabold text-rose-300 text-lg">{unreachableCount + invalidCount}</span>
                </div>

                <div className="p-3 bg-industrial-900 border border-industrial-800 rounded-xl text-center">
                  <span className="text-[10px] text-industrial-400 block font-semibold">Remaining</span>
                  <span className="font-extrabold text-white text-lg">{parsedRows.length - processedCount}</span>
                </div>
              </div>

              {/* Upcoming Queue Preview */}
              {upcomingQueue.length > 0 && (
                <div className="p-3 bg-industrial-950/60 rounded-xl border border-industrial-800/80 text-xs">
                  <span className="text-[10px] font-semibold text-industrial-400 uppercase tracking-wider block mb-1.5">Next in queue</span>
                  <div className="flex flex-wrap gap-2 text-industrial-300 font-mono text-[11px]">
                    {upcomingQueue.map((q, i) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-industrial-900 border border-industrial-800 truncate max-w-[160px]">
                        • {q}
                      </span>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}

          {/* STEP 3: VERIFICATION RESULTS DASHBOARD & NEEDS REVIEW INSPECTOR */}
          {step === 3 && (
            <div className="space-y-6">
              
              {/* Cancellation or Paused Banner */}
              {cancelRequested && (
                <div className="p-4 bg-amber-500/15 border border-amber-500/30 rounded-xl text-amber-300 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <PauseCircle className="w-5 h-5 text-amber-400 shrink-0" />
                    <span>
                      <strong>Verification Paused / Cancelled:</strong> Processed {processedCount} of {parsedRows.length} websites. Results already processed are preserved below.
                    </span>
                  </div>
                </div>
              )}

              {/* Summary Stats Badges */}
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                <div
                  onClick={() => setActiveTab('ALL')}
                  className={`p-3 rounded-xl border cursor-pointer transition-all text-center ${
                    activeTab === 'ALL' ? 'bg-industrial-800 border-brand-orange' : 'bg-industrial-950 border-industrial-800'
                  }`}
                >
                  <span className="text-[10px] text-industrial-400 block font-semibold">Total Processed</span>
                  <span className="font-extrabold text-white text-lg">{verifiedResults.length}</span>
                </div>

                <div
                  onClick={() => setActiveTab('Verified')}
                  className={`p-3 rounded-xl border cursor-pointer transition-all text-center ${
                    activeTab === 'Verified' ? 'bg-emerald-500/20 border-emerald-500' : 'bg-emerald-500/10 border-emerald-500/20'
                  }`}
                >
                  <span className="text-[10px] text-emerald-400 block font-semibold">Verified</span>
                  <span className="font-extrabold text-emerald-400 text-lg">{verifiedCount}</span>
                </div>

                <div
                  onClick={() => setActiveTab('Needs Review')}
                  className={`p-3 rounded-xl border cursor-pointer transition-all text-center ${
                    activeTab === 'Needs Review' ? 'bg-amber-500/20 border-amber-500' : 'bg-amber-500/10 border-amber-500/20'
                  }`}
                >
                  <span className="text-[10px] text-amber-400 block font-semibold">Needs Review</span>
                  <span className="font-extrabold text-amber-400 text-lg">{needsReviewCount}</span>
                </div>

                <div
                  onClick={() => setActiveTab('Duplicate')}
                  className={`p-3 rounded-xl border cursor-pointer transition-all text-center ${
                    activeTab === 'Duplicate' ? 'bg-purple-500/20 border-purple-500' : 'bg-purple-500/10 border-purple-500/20'
                  }`}
                >
                  <span className="text-[10px] text-purple-300 block font-semibold">Duplicates</span>
                  <span className="font-extrabold text-purple-300 text-lg">{duplicatesCount}</span>
                </div>

                <div
                  onClick={() => setActiveTab('Website Unreachable')}
                  className={`p-3 rounded-xl border cursor-pointer transition-all text-center ${
                    activeTab === 'Website Unreachable' ? 'bg-rose-500/20 border-rose-500' : 'bg-rose-500/10 border-rose-500/20'
                  }`}
                >
                  <span className="text-[10px] text-rose-300 block font-semibold">Unreachable</span>
                  <span className="font-extrabold text-rose-300 text-lg">{unreachableCount}</span>
                </div>

                <div
                  onClick={() => setActiveTab('Invalid Website')}
                  className={`p-3 rounded-xl border cursor-pointer transition-all text-center ${
                    activeTab === 'Invalid Website' ? 'bg-industrial-800 border-industrial-600' : 'bg-industrial-950 border-industrial-800'
                  }`}
                >
                  <span className="text-[10px] text-industrial-400 block font-semibold">Invalid / Missing</span>
                  <span className="font-extrabold text-industrial-300 text-lg">{invalidCount + missingCount}</span>
                </div>
              </div>

              {/* Action Banner */}
              <div className="p-3 bg-industrial-950 rounded-xl border border-industrial-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 font-mono text-industrial-300">
                  <span>Eligible for CRM Insertion:</span>
                  <span className="text-emerald-400 font-extrabold text-sm">{eligibleLeadsToImport.length} verified leads</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-industrial-400">Filter View: </span>
                  <span className="px-2.5 py-1 rounded bg-industrial-800 text-white font-bold font-mono">{activeTab}</span>
                </div>
              </div>

              {/* Results Table */}
              <div className="border border-industrial-800 rounded-xl overflow-hidden max-h-[360px] overflow-y-auto">
                <table className="w-full text-left text-xs text-industrial-300">
                  <thead className="bg-industrial-900 text-white font-bold sticky top-0 border-b border-industrial-800 text-[11px] uppercase">
                    <tr>
                      <th className="p-3">CSV Input</th>
                      <th className="p-3">Website</th>
                      <th className="p-3">Verified Company Data</th>
                      <th className="p-3">Verification Status</th>
                      <th className="p-3 text-right">Review Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-industrial-800/60 bg-industrial-950 font-mono text-[11px]">
                    {filteredResultsList.map((item) => {
                      const userApproval = userApprovals[item.rowIdx];
                      const isApproved = (item.status === 'Verified') || (userApproval && userApproval.approved);

                      return (
                        <tr key={item.rowIdx} className={isApproved ? 'bg-emerald-500/5' : 'hover:bg-industrial-900/50'}>
                          <td className="p-3">
                            <span className="font-semibold text-white block">{item.csvCompany || '—'}</span>
                            <span className="text-[10px] text-industrial-500">Row #{item.rowIdx + 1}</span>
                          </td>

                          <td className="p-3 text-brand-orange truncate max-w-[160px]">
                            {item.rawWeb || '—'}
                          </td>

                          <td className="p-3">
                            {item.leadCandidate ? (
                              <div className="space-y-0.5">
                                <span className="font-bold text-white block truncate max-w-[180px]">
                                  {item.verifiedCompany || item.leadCandidate.company_name}
                                </span>
                                <div className="text-[10px] text-industrial-400 flex items-center gap-2">
                                  <span>{item.leadCandidate.email || 'No email'}</span>
                                  <span>•</span>
                                  <span>{item.leadCandidate.phone || 'No phone'}</span>
                                </div>
                              </div>
                            ) : (
                              <span className="text-industrial-500 italic">—</span>
                            )}
                          </td>

                          <td className="p-3">
                            <span className={`px-2.5 py-1 rounded text-[10px] font-bold border ${
                              item.status === 'Verified'
                                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                : item.status === 'Needs Review'
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                : item.status === 'Duplicate'
                                ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                                : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                            }`}>
                              {item.statusBadge || item.status}
                            </span>
                          </td>

                          <td className="p-3 text-right">
                            {item.status === 'Needs Review' && (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => toggleApproval(item.rowIdx, 'verified')}
                                  className={`px-2.5 py-1 rounded text-[10px] font-bold border transition-colors ${
                                    userApproval?.choice === 'verified'
                                      ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                                      : 'bg-industrial-800 hover:bg-industrial-700 text-emerald-400 border-industrial-700'
                                  }`}
                                >
                                  {userApproval?.choice === 'verified' ? '✓ Approved' : 'Approve'}
                                </button>
                              </div>
                            )}

                            {item.status === 'Verified' && (
                              <span className="text-emerald-400 text-[10px] font-bold">✓ Ready to Import</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* STEP 4: IMPORT COMPLETED */}
          {step === 4 && finalImportResult && (
            <div className="space-y-6 py-4">
              <div className="flex flex-col items-center justify-center text-center space-y-2">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-extrabold text-white">Verified Leads Imported!</h3>
                <p className="text-xs text-industrial-400">
                  {finalImportResult.insertedCount} clean, verified lead records have been added to your CRM workspace.
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-xl mx-auto">
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center">
                  <span className="text-xs font-semibold text-emerald-400 block">Verified & Imported</span>
                  <span className="text-3xl font-black text-emerald-400">{finalImportResult.insertedCount}</span>
                </div>
                <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl text-center">
                  <span className="text-xs font-semibold text-purple-300 block">Skipped Duplicates</span>
                  <span className="text-3xl font-black text-purple-300">{finalImportResult.duplicateAlreadyImportedCount}</span>
                </div>
                <div className="p-4 bg-industrial-900 border border-industrial-800 rounded-xl text-center">
                  <span className="text-xs font-semibold text-industrial-400 block">Total Submitted</span>
                  <span className="text-3xl font-black text-white">{finalImportResult.totalSubmitted}</span>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
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
                onClick={handleStartVerification}
                disabled={parsedRows.length === 0}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-brand-orange hover:bg-orange-600 text-white font-bold text-xs shadow-lg shadow-brand-orange/20 disabled:opacity-50"
              >
                <span>Start Website Verification Pipeline ({parsedRows.length})</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </>
          ) : step === 2 ? (
            <div className="w-full flex items-center justify-between">
              <span className="text-xs text-industrial-400 font-mono">
                Verification in progress... ({processedCount} / {parsedRows.length})
              </span>
              <button
                onClick={() => setShowCancelModal(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 font-bold text-xs border border-red-500/40 transition-colors"
              >
                <StopCircle className="w-4 h-4 text-red-400" />
                <span>Cancel Verification</span>
              </button>
            </div>
          ) : step === 3 ? (
            <>
              <button
                onClick={() => setStep(1)}
                className="px-4 py-2 rounded-xl bg-industrial-800 text-industrial-300 font-semibold text-xs hover:bg-industrial-700"
              >
                Back to File Select
              </button>

              <button
                onClick={handleImportVerifiedLeads}
                disabled={importing || eligibleLeadsToImport.length === 0}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-brand-orange hover:bg-orange-600 text-white font-bold text-xs shadow-lg shadow-brand-orange/20 disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>{importing ? 'Inserting Verified Leads...' : `Import Verified Leads Only (${eligibleLeadsToImport.length})`}</span>
              </button>
            </>
          ) : step === 4 ? (
            <div className="w-full flex items-center justify-end">
              <button
                onClick={() => {
                  onClose();
                  if (onImportCompleted) onImportCompleted();
                }}
                className="px-6 py-2.5 rounded-xl bg-brand-orange hover:bg-orange-600 text-white font-bold text-xs shadow-lg shadow-brand-orange/20"
              >
                View Imported Leads
              </button>
            </div>
          ) : (
            <div className="w-full flex items-center justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-industrial-800 text-industrial-300 font-semibold text-xs hover:bg-industrial-700"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

      </div>

      {/* CANCEL VERIFICATION CONFIRMATION MODAL */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="industrial-card max-w-md w-full p-6 space-y-6 shadow-2xl border-industrial-700 animate-in fade-in duration-150">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-white text-base">Cancel Verification?</h3>
                <p className="text-xs text-industrial-400">Stop verification pipeline loop.</p>
              </div>
            </div>

            <div className="p-4 bg-industrial-950 border border-industrial-800 rounded-xl text-xs text-industrial-300 space-y-2">
              <p>
                Website verification is currently in progress ({processedCount} of {parsedRows.length} completed).
              </p>
              <p className="text-amber-300 text-[11px]">
                Websites already processed will be preserved in your review session, but remaining websites will not be checked.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2 rounded-xl bg-industrial-800 text-industrial-300 font-semibold text-xs hover:bg-industrial-700"
              >
                Continue Verification
              </button>

              <button
                onClick={handleConfirmCancel}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20"
              >
                Cancel Process
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
