import React, { useState } from 'react';
import axios from 'axios';
import {
  SearchCode,
  Globe,
  Loader2,
  CheckCircle,
  Building2,
  Phone,
  Mail,
  Package,
  Sparkles,
  PlusCircle,
  AlertCircle,
  ExternalLink,
  Terminal,
  ChevronDown,
  ChevronUp,
  BookmarkCheck,
  RefreshCw,
  FolderOpen
} from 'lucide-react';

export default function ManualScanPage({ onSaveLead, setSelectedLead }) {
  const [url, setUrl] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scannedResult, setScannedResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [showEvidenceDebug, setShowEvidenceDebug] = useState(true);
  const [savingState, setSavingState] = useState(false);

  const handleScanSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!url.trim()) return;

    setScanning(true);
    setErrorMessage('');
    setScannedResult(null);

    try {
      const res = await axios.post('/api/scan', { url: url.trim() });
      if (res.data.success) {
        setScannedResult(res.data.data);
      }
    } catch (err) {
      setErrorMessage('Website could not be scanned. Please check the URL or internet connection.');
    } finally {
      setScanning(false);
    }
  };

  const handleSaveToCRM = async (allowUpdate = false) => {
    if (!scannedResult) return;
    setSavingState(true);
    try {
      const res = await onSaveLead({ ...scannedResult, allowUpdate });
      if (res && (res.status === 'created' || res.status === 'updated' || res.status === 'duplicate')) {
        setScannedResult((prev) => ({
          ...prev,
          isAlreadyInCrm: true,
          existingLead: res.lead || prev.existingLead
        }));
      }
    } catch (err) {
      // error handled in parent toast
    } finally {
      setSavingState(false);
    }
  };

  let evidenceList = [];
  try {
    if (scannedResult) {
      evidenceList = Array.isArray(scannedResult.contact_evidence)
        ? scannedResult.contact_evidence
        : JSON.parse(scannedResult.contact_evidence || '[]');
    }
  } catch (e) {
    evidenceList = [];
  }

  const cleanTel = (scannedResult?.phone || '').replace(/[^\d+]/g, '');
  const cleanWa = (scannedResult?.whatsapp || scannedResult?.phone || '').replace(/[^\d]/g, '');

  return (
    <div className="p-8 space-y-8 max-w-5xl mx-auto">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">Manual Website Scanner</h1>
        <p className="text-xs text-industrial-400 mt-1">
          Scan any public industrial company website directly by URL without conducting a search.
        </p>
      </div>

      {/* Input Form */}
      <form onSubmit={handleScanSubmit} className="industrial-card p-6">
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Enter website"
            className="industrial-input flex-1 text-xs font-mono"
            required
          />

          <button
            type="submit"
            disabled={scanning}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-brand-orange hover:bg-orange-600 text-xs font-bold text-white shadow-lg shadow-brand-orange/20 transition-all disabled:opacity-50 shrink-0"
          >
            {scanning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Scanning Website...</span>
              </>
            ) : (
              <>
                <SearchCode className="w-4 h-4" />
                <span>Scan Website</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Error Notice */}
      {errorMessage && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p>{errorMessage}</p>
        </div>
      )}

      {/* Extracted Results View */}
      {scannedResult && (
        <div className="industrial-card p-6 space-y-6 animate-in fade-in duration-200">
          
          {/* Header Action Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-industrial-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-industrial-800 flex items-center justify-center text-brand-orange font-bold text-base">
                {scannedResult.company_name ? scannedResult.company_name.charAt(0) : 'C'}
              </div>
              <div>
                <h2 className="font-bold text-white text-lg">{scannedResult.company_name}</h2>
                <a
                  href={scannedResult.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-brand-blue font-mono hover:underline flex items-center gap-1"
                >
                  <span>{scannedResult.website}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            {/* Save Buttons & Already in CRM Notice */}
            <div className="flex items-center gap-2">
              {scannedResult.isAlreadyInCrm ? (
                <>
                  <button
                    disabled
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-industrial-800 text-industrial-400 text-xs font-bold border border-industrial-700 cursor-not-allowed"
                  >
                    <BookmarkCheck className="w-4 h-4 text-emerald-400" />
                    <span>Already in CRM</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSaveToCRM(true)}
                    disabled={savingState}
                    className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg bg-industrial-800 hover:bg-industrial-700 text-xs font-bold text-amber-300 border border-amber-500/30 transition-all"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Update Lead</span>
                  </button>

                  {scannedResult.existingLead && (
                    <button
                      type="button"
                      onClick={() => setSelectedLead(scannedResult.existingLead)}
                      className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg bg-brand-blue hover:bg-sky-600 text-xs font-bold text-white transition-all shadow-md"
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                      <span>Open Lead</span>
                    </button>
                  )}
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => handleSaveToCRM(false)}
                  disabled={savingState}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-xs font-bold text-white shadow-lg shadow-emerald-500/20 transition-all"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>{savingState ? 'Saving...' : 'Save to CRM'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Friendly Duplicate Notice Banner */}
          {scannedResult.isAlreadyInCrm && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <BookmarkCheck className="w-4 h-4" />
                <span>Already in your CRM (Lead: {scannedResult.existingLead?.lead_id || 'Saved'})</span>
              </div>
              <span className="text-industrial-400 text-[11px] font-mono">
                Saved on: {scannedResult.existingLead?.created_at ? new Date(scannedResult.existingLead.created_at).toLocaleDateString() : 'Previous session'}
              </span>
            </div>
          )}

          {/* AI Opportunity Suggestion */}
          <div className="p-4 bg-brand-orange/10 border border-brand-orange/30 rounded-xl space-y-1">
            <div className="flex items-center gap-2 text-brand-orange font-semibold text-xs uppercase tracking-wider">
              <Sparkles className="w-4 h-4" />
              <span>Potential Automation Opportunities</span>
            </div>
            <p className="text-white text-xs italic">"{scannedResult.automation_opportunity}"</p>
          </div>

          {/* Extracted Contact Details Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            
            {/* Contact Details Card */}
            <div className="space-y-3 p-4 bg-industrial-950/80 rounded-xl border border-brand-orange/30">
              <div className="flex items-center justify-between border-b border-industrial-800 pb-2">
                <h3 className="font-bold text-white uppercase text-[11px] text-industrial-300 flex items-center gap-2">
                  <Phone className="w-4 h-4 text-brand-orange" />
                  <span>Contact Details</span>
                </h3>

                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30">
                  🟢 Verified Extraction
                </span>
              </div>

              {/* Primary Phone */}
              <div className="p-3 bg-industrial-900 rounded-lg space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-industrial-400 font-semibold text-[11px]">Primary Phone</span>
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                    🟢 Verified ({scannedResult.confidence_score || 'HIGH'})
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <a href={`tel:${cleanTel}`} className="font-bold text-white font-mono text-base hover:text-brand-orange">
                    📞 {scannedResult.phone || 'Not Found'}
                  </a>
                  <a href={`tel:${cleanTel}`} className="px-2 py-1 bg-industrial-800 hover:bg-industrial-700 text-white rounded text-[11px]">
                    Call
                  </a>
                </div>
              </div>

              {/* Email */}
              <div className="p-3 bg-industrial-900 rounded-lg space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-industrial-400 font-semibold text-[11px]">Email</span>
                  {scannedResult.email && (
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                      🟢 Verified
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between pt-1">
                  <a href={`mailto:${scannedResult.email}`} className="font-bold text-emerald-400 font-mono hover:underline truncate">
                    ✉️ {scannedResult.email || 'Not Found'}
                  </a>
                </div>
              </div>

              {/* WhatsApp */}
              <div className="p-3 bg-industrial-900 rounded-lg space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-industrial-400 font-semibold text-[11px]">WhatsApp</span>
                  {scannedResult.whatsapp && (
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                      🟢 Found
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="font-bold text-white font-mono">{scannedResult.whatsapp || 'Not Found'}</span>
                  {cleanWa && (
                    <a
                      href={scannedResult.whatsapp_url || `https://wa.me/${cleanWa}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded text-[11px]"
                    >
                      💬 Open WhatsApp
                    </a>
                  )}
                </div>
              </div>

            </div>

            {/* Company Info */}
            <div className="space-y-3 p-4 bg-industrial-950/60 rounded-xl border border-industrial-800">
              <h3 className="font-bold text-white uppercase text-[11px] text-industrial-400 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-brand-orange" />
                <span>Company Overview & Location</span>
              </h3>
              <p><strong>Category:</strong> {scannedResult.category || 'Not Found'}</p>
              <p><strong>Location:</strong> {scannedResult.location || scannedResult.address || 'Not Found'}</p>
              <p className="text-industrial-300"><strong>Description:</strong> {scannedResult.company_description || 'Not Found'}</p>
            </div>

          </div>

          {/* Extraction Evidence Debug Section */}
          <div className="industrial-card p-4 bg-industrial-950/80 border-industrial-800 space-y-3">
            <button
              onClick={() => setShowEvidenceDebug(!showEvidenceDebug)}
              className="w-full flex items-center justify-between text-xs font-semibold text-industrial-300 hover:text-white"
            >
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-brand-orange" />
                <span>Extraction Evidence & Audit Logs ({evidenceList.length} items)</span>
              </div>
              {showEvidenceDebug ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showEvidenceDebug && (
              <div className="space-y-2 font-mono text-[11px] pt-2 border-t border-industrial-800">
                {evidenceList.map((item, idx) => (
                  <div key={idx} className="p-3 bg-industrial-900 rounded-lg border border-industrial-800 space-y-1">
                    <div className="flex items-center justify-between text-brand-orange font-bold">
                      <span>[{item.type}] {item.value}</span>
                      <span className="text-[10px] text-emerald-400">Confidence: {item.confidence}</span>
                    </div>
                    <p className="text-industrial-300">Source: <strong>{item.source}</strong></p>
                    <p className="text-industrial-400 text-[10px] truncate">URL: {item.sourceUrl}</p>
                    {item.sourcesDetails && (
                      <div className="pl-2 border-l border-industrial-800 text-[10px] text-industrial-400 space-y-0.5">
                        {item.sourcesDetails.map((sd, i) => (
                          <div key={i}>HTML Snippet: <code>{sd.snippet}</code></div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
}
