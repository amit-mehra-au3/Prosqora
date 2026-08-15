import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import {
  Users,
  Clock,
  Award,
  ChevronRight,
  Sparkles,
  Flame,
  ShoppingBag,
  Wrench,
  SearchCode,
  Globe,
  PlusCircle,
  FolderOpen,
  PhoneCall
} from 'lucide-react';

export default function DashboardPage({ setActivePage, setSelectedLead }) {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalLeads: 0,
    newLeads: 0,
    contacted: 0,
    followupsDue: 0,
    interested: 0,
    converted: 0,
    highPriority: 0,
    purchaseContacts: 0,
    salesContacts: 0,
    engContacts: 0
  });

  const [recentLeads, setRecentLeads] = useState([]);
  const [followupsDueList, setFollowupsDueList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/leads');
      if (res.data.success) {
        const leads = res.data.leads || [];

        let highPri = 0;
        let purCnt = 0;
        let salCnt = 0;
        let engCnt = 0;
        let newCount = 0;
        let contactedCount = 0;
        let followupsDueCount = 0;
        let interestedCount = 0;
        let convertedCount = 0;

        const todayStr = new Date().toISOString().split('T')[0];

        leads.forEach((l) => {
          if (l.lead_status === 'New') newCount++;
          if (l.lead_status === 'Contacted') contactedCount++;
          if (l.lead_status === 'Interested') interestedCount++;
          if (l.lead_status === 'Converted') convertedCount++;
          if (l.next_followup && l.next_followup <= todayStr) followupsDueCount++;

          if (l.confidence_score === 'HIGH' || (l.automation_opportunity && l.automation_opportunity.length > 20)) {
            highPri++;
          }

          let contactsList = [];
          try {
            contactsList = typeof l.contacts === 'string' ? JSON.parse(l.contacts || '[]') : l.contacts;
          } catch (e) {}
          if (!Array.isArray(contactsList)) contactsList = [];

          if (contactsList.some((c) => (c.department || '').toLowerCase().includes('purchase') || (c.department || '').toLowerCase().includes('procurement'))) purCnt++;
          if (contactsList.some((c) => (c.department || '').toLowerCase().includes('sales'))) salCnt++;
          if (contactsList.some((c) => (c.department || '').toLowerCase().includes('eng') || (c.department || '').toLowerCase().includes('auto'))) engCnt++;
        });

        setStats({
          totalLeads: leads.length,
          newLeads: newCount,
          contacted: contactedCount,
          followupsDue: followupsDueCount,
          interested: interestedCount,
          converted: convertedCount,
          highPriority: highPri,
          purchaseContacts: purCnt,
          salesContacts: salCnt,
          engContacts: engCnt
        });

        setRecentLeads(leads.slice(0, 5));
        setFollowupsDueList(leads.filter((l) => l.next_followup).slice(0, 5));
      }
    } catch (err) {
      console.error('Failed to fetch CRM dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { label: 'Total Leads', value: stats.totalLeads, icon: Users, color: 'from-blue-500/20 to-blue-600/5 text-blue-400 border-blue-500/30' },
    { label: 'High Priority', value: stats.highPriority, icon: Flame, color: 'from-brand-orange/20 to-amber-600/5 text-brand-orange border-brand-orange/30' },
    { label: 'Follow-ups Due', value: stats.followupsDue, icon: Clock, color: 'from-amber-500/20 to-amber-600/5 text-amber-400 border-amber-500/30' },
    { label: 'Purchase Contacts', value: stats.purchaseContacts, icon: ShoppingBag, color: 'from-emerald-500/20 to-emerald-600/5 text-emerald-400 border-emerald-500/30' },
    { label: 'Sales Contacts', value: stats.salesContacts, icon: PhoneCall, color: 'from-sky-500/20 to-sky-600/5 text-sky-400 border-sky-500/30' },
    { label: 'Engineering Contacts', value: stats.engContacts, icon: Wrench, color: 'from-purple-500/20 to-purple-600/5 text-purple-400 border-purple-500/30' },
    { label: 'Interested Leads', value: stats.interested, icon: Sparkles, color: 'from-teal-500/20 to-teal-600/5 text-teal-400 border-teal-500/30' },
    { label: 'Converted Leads', value: stats.converted, icon: Award, color: 'from-green-500/20 to-green-600/5 text-green-400 border-green-500/30' },
  ];

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      
      {/* Welcome Banner */}
      <div className="p-6 rounded-2xl bg-industrial-900 border border-industrial-800 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-brand-orange font-bold text-xs uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            <span>Industrial Sales Intelligence CRM • Welcome back, {user?.full_name || 'User'}</span>
          </div>
          <h2 className="text-xl font-extrabold text-white mt-1">
            Build, organize, and manage your industrial automation client database.
          </h2>
          <p className="text-xs text-industrial-400 mt-0.5">
            Scan company websites directly to extract verified contacts, departments, products, and automation opportunities.
          </p>
        </div>

        <button
          onClick={() => setActivePage('scan-website')}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-brand-orange hover:bg-orange-600 text-xs font-bold text-white shadow-lg shadow-brand-orange/20 transition-all shrink-0"
        >
          <Globe className="w-4 h-4" />
          <span>Scan Website</span>
        </button>
      </div>

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">CRM Dashboard</h1>
          <p className="text-xs text-industrial-400 mt-1">
            Real-time pipeline metrics and lead distribution for {user?.company_name || 'your workspace'}.
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className={`p-5 rounded-xl bg-gradient-to-b border ${card.color} space-y-3 transition-transform hover:-translate-y-0.5`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-industrial-300">{card.label}</span>
                <Icon className="w-4 h-4" />
              </div>
              <p className="text-2xl font-black text-white font-mono">{card.value}</p>
            </div>
          );
        })}
      </div>

      {/* Empty State Banner if No Leads */}
      {!loading && stats.totalLeads === 0 && (
        <div className="p-8 industrial-card text-center space-y-4 border-dashed border-brand-orange/40">
          <Globe className="w-12 h-12 text-brand-orange mx-auto" />
          <div>
            <h3 className="text-lg font-bold text-white">No Leads Yet</h3>
            <p className="text-xs text-industrial-400 max-w-md mx-auto mt-1">
              Scan your first company website to start building your CRM with extracted contacts and automation intelligence.
            </p>
          </div>
          <button
            onClick={() => setActivePage('scan-website')}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-brand-orange hover:bg-orange-600 text-xs font-bold text-white shadow-lg shadow-brand-orange/20 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Scan Website</span>
          </button>
        </div>
      )}

      {/* 2-Column Grid: Recent Leads & Scheduled Follow-ups */}
      {stats.totalLeads > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Recent Leads */}
          <div className="industrial-card p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-industrial-800 pb-3">
              <h3 className="font-bold text-white text-xs uppercase tracking-wider text-industrial-300">
                Recent CRM Leads
              </h3>
              <button
                onClick={() => setActivePage('all-leads')}
                className="text-xs text-brand-orange hover:underline font-semibold flex items-center gap-1"
              >
                <span>View All CRM Leads</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2">
              {recentLeads.map((lead) => (
                <div
                  key={lead.id}
                  onClick={() => setSelectedLead(lead)}
                  className="p-3 bg-industrial-950/70 hover:bg-industrial-800/60 rounded-xl border border-industrial-800 flex items-center justify-between cursor-pointer transition-colors"
                >
                  <div className="space-y-0.5">
                    <span className="font-bold text-white text-xs block">{lead.company_name}</span>
                    <span className="text-[10px] text-industrial-400 font-mono">{lead.location || `${lead.city}, ${lead.state}`}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded font-medium lead-status-${lead.lead_status}`}>
                      {lead.lead_status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Scheduled Follow-ups */}
          <div className="industrial-card p-5 space-y-4 border-amber-500/30">
            <div className="flex items-center justify-between border-b border-industrial-800 pb-3">
              <h3 className="font-bold text-white text-xs uppercase tracking-wider text-amber-400">
                Upcoming Follow-ups
              </h3>
              <button
                onClick={() => setActivePage('follow-ups')}
                className="text-xs text-amber-400 hover:underline font-semibold flex items-center gap-1"
              >
                <span>Follow-ups Page</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2">
              {followupsDueList.length === 0 ? (
                <p className="text-xs text-industrial-400 text-center py-6">
                  No upcoming follow-ups scheduled for today.
                </p>
              ) : (
                followupsDueList.map((lead) => (
                  <div
                    key={lead.id}
                    onClick={() => setSelectedLead(lead)}
                    className="p-3 bg-industrial-950/70 hover:bg-industrial-800/60 rounded-xl border border-industrial-800 flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div className="space-y-0.5">
                      <span className="font-bold text-white text-xs block">{lead.company_name}</span>
                      <span className="text-[10px] text-amber-300 font-mono font-bold">Due: {lead.next_followup}</span>
                    </div>

                    <a href={`tel:${(lead.phone || '').replace(/[^\d+]/g, '')}`} className="px-2.5 py-1 rounded bg-industrial-800 hover:bg-industrial-700 text-[11px] text-industrial-200 font-mono">
                      📞 Call
                    </a>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
