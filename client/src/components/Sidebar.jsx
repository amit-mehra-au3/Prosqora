import React from 'react';
import {
  LayoutDashboard,
  Globe,
  Database,
  CalendarCheck,
  FileSpreadsheet,
  Settings,
  Mail,
  FileText,
  Cpu,
  ShieldCheck,
  Crown,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Sidebar({ activePage, setActivePage, isDemoMode }) {
  const { user } = useAuth();
  const userRole = (user?.role || '').toLowerCase();
  const isSuperAdmin = userRole === 'super_admin';
  const isAdmin = userRole === 'admin' || isSuperAdmin;

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'scan-website', label: 'Scan Website', icon: Globe },
    { id: 'all-leads', label: 'All Leads', icon: Database },
    { id: 'email-campaigns', label: 'Email Campaigns', icon: Mail },
    { id: 'email-templates', label: 'Email Templates', icon: FileText },
    { id: 'follow-ups', label: 'Follow-ups', icon: CalendarCheck }
  ];

  // Admin-Only Navigation Items
  if (isAdmin) {
    menuItems.push({ id: 'export', label: 'Import / Export', icon: FileSpreadsheet });
    menuItems.push({ id: 'admin', label: 'Admin Panel', icon: ShieldCheck });
  }

  // Super Admin Only Portal Item
  if (isSuperAdmin) {
    menuItems.push({ id: 'super-admin', label: 'Super Admin Portal', icon: Crown });
  }

  menuItems.push({ id: 'settings', label: 'Settings', icon: Settings });

  return (
    <aside className="w-64 bg-industrial-900 border-r border-industrial-800 flex flex-col justify-between shrink-0 h-screen sticky top-0">
      <div>
        {/* Brand Header */}
        <div className="p-6 border-b border-industrial-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-orange to-amber-500 flex items-center justify-center shadow-lg shadow-brand-orange/20 font-black text-white text-xl tracking-tighter">
            P
          </div>
          <div>
            <h1 className="font-extrabold text-lg text-white tracking-wider leading-none">PROSQORA</h1>
            <p className="text-[11px] text-industrial-400 font-mono mt-1">Lead Discovery & CRM</p>
          </div>
        </div>

        {/* Demo Mode Indicator */}
        {isDemoMode && (
          <div className="mx-4 mt-4 p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center gap-2 text-amber-400 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="font-medium">Demo Mode Active</span>
          </div>
        )}

        {/* Navigation Menu */}
        <nav className="p-4 space-y-1.5">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActivePage(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-brand-orange text-white shadow-md shadow-brand-orange/20 font-bold'
                    : 'text-industrial-300 hover:text-white hover:bg-industrial-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-industrial-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-industrial-800 text-xs text-industrial-400 space-y-2">
        <div className="flex items-center gap-2 text-emerald-400 font-mono">
          <ShieldCheck className="w-4 h-4" />
          <span>CRM Active ({isAdmin ? 'ADMIN' : 'NORMAL USER'})</span>
        </div>
        <p className="text-[11px] text-industrial-500">v2.2.0 • Multi-Tenant RBAC CRM</p>
      </div>
    </aside>
  );
}
