import React, { useState, useEffect } from 'react';
import axios from 'axios';
import CampaignProgressModal from '../components/CampaignProgressModal';
import GmailSendingCapacityCard from '../components/GmailSendingCapacityCard';
import {
  Send,
  Mail,
  Clock,
  CheckCircle,
  AlertCircle,
  Play,
  Pause,
  ChevronRight,
  Sparkles,
  FlaskConical,
  RefreshCw,
  Sliders
} from 'lucide-react';

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [capacity, setCapacity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState(null);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/email-campaigns');
      if (res.data.success) {
        setCampaigns(res.data.campaigns || []);
        if (res.data.capacity) {
          setCapacity(res.data.capacity);
        }
      }
    } catch (e) {
      console.error('Failed to fetch campaigns:', e);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    if (status === 'Running' || status === 'QUEUED') return <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">🟢 Running</span>;
    if (status === 'Paused') return <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">🟡 Paused</span>;
    if (status === 'CAP_REACHED') return <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/30 text-amber-200 border border-amber-500/50">🔴 499 Cap Reached</span>;
    if (status === 'GMAIL_LIMIT_REACHED') return <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/40">⚠️ Gmail Limit</span>;
    if (status === 'Completed') return <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">✓ Completed</span>;
    return <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-industrial-800 text-industrial-400 border border-industrial-700">⏹ {status}</span>;
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto pb-20">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-brand-orange font-bold text-xs uppercase tracking-wider">
            <Mail className="w-4 h-4" />
            <span>Gmail Outreach Engine</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight mt-1">Email Campaigns</h1>
          <p className="text-xs text-industrial-400 mt-0.5">
            Monitor, manage, and review B2B email campaigns with 499/24h rolling safety cap protection.
          </p>
        </div>

        <button
          onClick={fetchCampaigns}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-industrial-800 hover:bg-industrial-700 text-white font-bold text-xs border border-industrial-700 transition-all shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Campaigns</span>
        </button>
      </div>

      {/* Gmail Sending Capacity Card */}
      {capacity && (
        <GmailSendingCapacityCard capacity={capacity} onRefresh={fetchCampaigns} />
      )}

      {/* Campaigns Table Container */}
      <div className="industrial-card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-industrial-400">Loading campaign history...</div>
        ) : campaigns.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Mail className="w-10 h-10 text-industrial-500 mx-auto" />
            <h3 className="text-base font-bold text-white">No Email Campaigns Launched Yet</h3>
            <p className="text-xs text-industrial-400 max-w-md mx-auto">
              Select leads from the All Leads page and click "✉ Send Email" to create your first Gmail outreach campaign.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-industrial-950 border-b border-industrial-800 text-industrial-400 font-mono text-[11px] uppercase tracking-wider">
                  <th className="py-3.5 px-4">Campaign Name</th>
                  <th className="py-3.5 px-4">Subject Line</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4 text-center">Total</th>
                  <th className="py-3.5 px-4 text-center">Sent</th>
                  <th className="py-3.5 px-4 text-center">Failed</th>
                  <th className="py-3.5 px-4 text-center">Skipped</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-industrial-800/60">
                {campaigns.map((c) => (
                  <tr key={c.id} className="hover:bg-industrial-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-white">
                      <div className="flex items-center gap-2">
                        <span>{c.name}</span>
                        {c.is_test_mode ? (
                          <span className="text-[9px] px-1.5 py-0.5 rounded font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            TEST
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-industrial-300 truncate max-w-xs">{c.subject}</td>
                    <td className="py-3.5 px-4 text-industrial-400 font-mono text-[11px]">
                      {new Date(c.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-white">{c.total_count}</td>
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-emerald-400">{c.sent_count}</td>
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-red-400">{c.failed_count}</td>
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-amber-300">{c.skipped_count}</td>
                    <td className="py-3.5 px-4">{getStatusBadge(c.status)}</td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedCampaign(c)}
                        className="px-3 py-1.5 rounded-lg bg-industrial-800 hover:bg-industrial-700 text-white font-bold text-xs border border-industrial-700 flex items-center gap-1 ml-auto"
                      >
                        <span>View Logs</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedCampaign && (
        <CampaignProgressModal
          campaign={selectedCampaign}
          onClose={() => {
            setSelectedCampaign(null);
            fetchCampaigns();
          }}
          onCampaignUpdated={() => fetchCampaigns()}
        />
      )}

    </div>
  );
}
