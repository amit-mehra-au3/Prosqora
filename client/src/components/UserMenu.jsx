import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, Settings, LogOut, ChevronDown, ShieldCheck } from 'lucide-react';

export default function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null;

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    navigate('/login', { replace: true });
  };

  const userRole = (user.role || '').toLowerCase();
  const isSuperAdmin = userRole === 'super_admin';
  const isAdmin = userRole === 'admin' || isSuperAdmin;
  const initial = user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U';

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-industrial-900 border border-industrial-800 hover:border-industrial-700 transition-all text-xs font-semibold"
      >
        <div className={`w-7 h-7 rounded-lg font-bold flex items-center justify-center text-xs border ${
          isSuperAdmin
            ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
            : isAdmin
            ? 'bg-brand-orange/20 border-brand-orange/40 text-brand-orange'
            : 'bg-industrial-800 border-industrial-700 text-industrial-300'
        }`}>
          {initial}
        </div>
        <div className="text-left hidden sm:block">
          <div className="flex items-center gap-1.5">
            <span className="text-white block font-bold text-[11px] leading-tight truncate max-w-[8rem]">
              {user.full_name}
            </span>
            <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
              isSuperAdmin
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : isAdmin
                ? 'bg-brand-orange/20 text-brand-orange border border-brand-orange/30'
                : 'bg-industrial-800 text-industrial-400 border border-industrial-700'
            }`}>
              {isSuperAdmin ? 'SUPER ADMIN' : isAdmin ? 'ADMIN' : 'NORMAL USER'}
            </span>
          </div>
          <span className="text-[10px] text-industrial-400 block leading-tight truncate max-w-[8rem]">
            {user.company_name || 'CRM Workspace'}
          </span>
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-industrial-400" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-industrial-900 border border-industrial-700 rounded-xl shadow-2xl py-2 z-50 animate-in fade-in zoom-in duration-100 text-xs">
          
          <div className="px-4 py-2 border-b border-industrial-800 space-y-1">
            <div className="flex items-center justify-between">
              <p className="font-bold text-white truncate">{user.full_name}</p>
              <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                isSuperAdmin
                  ? 'bg-amber-500/20 text-amber-400'
                  : isAdmin
                  ? 'bg-brand-orange/20 text-brand-orange'
                  : 'bg-industrial-800 text-industrial-300'
              }`}>
                {isSuperAdmin ? 'SUPER ADMIN' : isAdmin ? 'ADMIN' : 'NORMAL USER'}
              </span>
            </div>
            <p className="text-[10px] text-industrial-400 truncate">{user.email}</p>
          </div>

          <div className="py-1">
            {isSuperAdmin && (
              <Link
                to="/super-admin"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2 text-amber-400 hover:bg-amber-500/10 font-bold transition-colors"
              >
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span>Super Admin Panel</span>
              </Link>
            )}

            <Link
              to="/profile"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2 text-industrial-300 hover:text-white hover:bg-industrial-800 transition-colors"
            >
              <User className="w-4 h-4 text-brand-orange" />
              <span>User Profile</span>
            </Link>

            <Link
              to="/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2 text-industrial-300 hover:text-white hover:bg-industrial-800 transition-colors"
            >
              <Settings className="w-4 h-4 text-industrial-400" />
              <span>Workspace Settings</span>
            </Link>
          </div>

          <div className="border-t border-industrial-800 pt-1">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-red-400 hover:bg-red-500/10 transition-colors text-left font-semibold"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>

        </div>
      )}
    </div>
  );
}
