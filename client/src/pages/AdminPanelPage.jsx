import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  ShieldCheck,
  Users,
  UserPlus,
  UserCheck,
  UserX,
  FileText,
  Activity,
  Search,
  Filter,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Globe,
  Upload,
  Database,
  Trash2,
  Edit,
  Eye,
  Key,
  Layers,
  Sparkles,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AdminPanelPage() {
  const { user } = useAuth();
  const userRole = (user?.role || '').toLowerCase();
  const isSuperAdmin = userRole === 'super_admin';

  const [activeTab, setActiveTab] = useState('overview');

  // Overview Stats
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    disabledUsers: 0,
    totalLeads: 0,
    leadsCreatedToday: 0,
    leadsUpdatedToday: 0,
    leadsDeletedToday: 0,
    websiteScansToday: 0,
    csvImportsToday: 0
  });

  // User Management State & Filters
  const [usersList, setUsersList] = useState([]);
  const [userStatusFilter, setUserStatusFilter] = useState('all');
  const [userSearchFilter, setUserSearchFilter] = useState('');

  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [createUserForm, setCreateUserForm] = useState({
    full_name: '',
    email: '',
    password: '',
    confirm_password: '',
    role: 'user'
  });
  const [createUserError, setCreateUserError] = useState('');
  const [creatingUser, setCreatingUser] = useState(false);

  // Permanent Delete User State
  const [deleteTargetUser, setDeleteTargetUser] = useState(null);
  const [confirmUserEmail, setConfirmUserEmail] = useState('');
  const [deletingUser, setDeletingUser] = useState(false);
  const [deleteUserError, setDeleteUserError] = useState('');

  // Audit Log State
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditActionFilter, setAuditActionFilter] = useState('All');
  const [loadingAudit, setLoadingAudit] = useState(false);

  const [toastMessage, setToastMessage] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    fetchAdminOverview();
    fetchUsersList();
    fetchAuditLogs();
  }, []);

  useEffect(() => {
    fetchUsersList();
  }, [userStatusFilter, userSearchFilter]);

  const fetchAdminOverview = async () => {
    setLoadingStats(true);
    try {
      const res = await axios.get('/api/admin/overview');
      if (res.data.success) {
        setStats(res.data.stats || {});
      }
    } catch (e) {
      console.error('Failed to fetch admin overview:', e);
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchUsersList = async () => {
    try {
      const params = {
        status: userStatusFilter,
        search: userSearchFilter
      };
      const res = await axios.get('/api/admin/users', { params });
      if (res.data.success) {
        setUsersList(res.data.users || []);
      }
    } catch (e) {
      console.error('Failed to fetch user list:', e);
    }
  };

  const fetchAuditLogs = async () => {
    setLoadingAudit(true);
    try {
      const params = {};
      if (auditSearch) params.search = auditSearch;
      if (auditActionFilter && auditActionFilter !== 'All') params.action = auditActionFilter;

      const res = await axios.get('/api/admin/audit-logs', { params });
      if (res.data.success) {
        setAuditLogs(res.data.logs || []);
      }
    } catch (e) {
      console.error('Failed to fetch audit logs:', e);
    } finally {
      setLoadingAudit(false);
    }
  };

  const handleOpenCreateModal = () => {
    setCreateUserError('');
    setCreateUserForm({
      full_name: '',
      email: '',
      password: '',
      confirm_password: '',
      role: 'user'
    });
    setShowCreateUserModal(true);
  };

  const handleCreateUserSubmit = async (e) => {
    e.preventDefault();
    setCreateUserError('');

    if (!createUserForm.full_name.trim() || !createUserForm.email.trim() || !createUserForm.password) {
      setCreateUserError('Full Name, Email, and Password are required.');
      return;
    }

    if (createUserForm.password !== createUserForm.confirm_password) {
      setCreateUserError('Passwords do not match.');
      return;
    }

    if (createUserForm.password.length < 6) {
      setCreateUserError('Password must be at least 6 characters long.');
      return;
    }

    setCreatingUser(true);

    try {
      const res = await axios.post('/api/admin/users', createUserForm);
      if (res.data.success) {
        const createdName = createUserForm.full_name.trim();
        setToastMessage(`User ${createdName} created successfully.`);
        setTimeout(() => setToastMessage(null), 3500);

        setShowCreateUserModal(false);
        fetchUsersList();
        fetchAdminOverview();
        fetchAuditLogs();
      }
    } catch (err) {
      setCreateUserError(err.response?.data?.error || 'Failed to create user account.');
    } finally {
      setCreatingUser(false);
    }
  };

  const handleToggleUserStatus = async (targetUser, currentStatus) => {
    const nextStatus = currentStatus === 'disabled' ? 'active' : 'disabled';
    try {
      const res = await axios.put(`/api/admin/users/${targetUser.user_id}/status`, { status: nextStatus });
      if (res.data.success) {
        setToastMessage(`User ${targetUser.full_name} status set to ${nextStatus}.`);
        setTimeout(() => setToastMessage(null), 3000);
        fetchUsersList();
        fetchAdminOverview();
        fetchAuditLogs();
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to change user status.');
    }
  };

  const handleToggleUserRole = async (targetUser, currentRole) => {
    const nextRole = (currentRole || '').toLowerCase() === 'admin' ? 'user' : 'admin';
    try {
      const res = await axios.put(`/api/admin/users/${targetUser.user_id}/role`, { role: nextRole });
      if (res.data.success) {
        setToastMessage(`User ${targetUser.full_name} role updated to ${nextRole === 'admin' ? 'Admin' : 'Normal User'}.`);
        setTimeout(() => setToastMessage(null), 3000);
        fetchUsersList();
        fetchAuditLogs();
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update user role.');
    }
  };

  // Permanent Delete User Action (Super Admin Only)
  const handleOpenDeleteModal = (targetUser) => {
    if (targetUser.email === 'amautomationtrading@gmail.com' || (targetUser.role || '').toLowerCase() === 'super_admin') {
      alert('Primary Super Admin account cannot be permanently deleted.');
      return;
    }
    setDeleteTargetUser(targetUser);
    setConfirmUserEmail('');
    setDeleteUserError('');
  };

  const handleConfirmPermanentDelete = async (e) => {
    e.preventDefault();
    setDeleteUserError('');

    if (confirmUserEmail.trim().toLowerCase() !== deleteTargetUser.email.toLowerCase()) {
      setDeleteUserError(`Please type exact email "${deleteTargetUser.email}" to confirm deletion.`);
      return;
    }

    setDeletingUser(true);
    try {
      const res = await axios.delete(`/api/admin/users/${deleteTargetUser.user_id}/permanent`, {
        data: { email_confirm: confirmUserEmail.trim() }
      });

      if (res.data.success) {
        setToastMessage(`Permanently deleted user account ${deleteTargetUser.email}.`);
        setTimeout(() => setToastMessage(null), 4000);

        setDeleteTargetUser(null);
        fetchUsersList();
        fetchAdminOverview();
        fetchAuditLogs();
      }
    } catch (err) {
      setDeleteUserError(err.response?.data?.error || 'Failed to permanently delete user account.');
    } finally {
      setDeletingUser(false);
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 font-sans selection:bg-brand-orange selection:text-white">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-xl bg-emerald-500 text-slate-950 font-extrabold text-xs shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-brand-orange/20 border border-brand-orange/40 flex items-center justify-center text-brand-orange">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Prosqora Admin Control Panel</h1>
            <p className="text-xs text-industrial-400 mt-1">
              Multi-User Role-Based Access Control, Workspace Management & Immutable Audit History.
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 p-1 bg-industrial-950 rounded-xl border border-industrial-800 text-xs">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-2 ${
              activeTab === 'overview'
                ? 'bg-brand-orange text-white shadow-md shadow-brand-orange/20'
                : 'text-industrial-400 hover:text-white'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Overview</span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-2 ${
              activeTab === 'users'
                ? 'bg-brand-orange text-white shadow-md shadow-brand-orange/20'
                : 'text-industrial-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>User Management ({usersList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-2 ${
              activeTab === 'audit'
                ? 'bg-brand-orange text-white shadow-md shadow-brand-orange/20'
                : 'text-industrial-400 hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Audit Logs</span>
          </button>
        </div>
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-5 bg-industrial-950 border border-industrial-800 rounded-2xl">
              <span className="text-xs font-semibold text-industrial-400 uppercase tracking-wider block">Total Workspace Users</span>
              <span className="text-3xl font-black text-white mt-2 block">{stats.totalUsers}</span>
              <div className="mt-2 text-[11px] text-industrial-400 flex items-center gap-2">
                <span className="text-emerald-400 font-bold">{stats.activeUsers} active</span>
                <span>•</span>
                <span className="text-rose-400 font-bold">{stats.disabledUsers} disabled</span>
              </div>
            </div>

            <div className="p-5 bg-industrial-950 border border-industrial-800 rounded-2xl">
              <span className="text-xs font-semibold text-industrial-400 uppercase tracking-wider block">Total CRM Leads</span>
              <span className="text-3xl font-black text-white mt-2 block">{stats.totalLeads.toLocaleString('en-IN')}</span>
              <div className="mt-2 text-[11px] text-industrial-400">
                <span className="text-emerald-400 font-bold">+{stats.leadsCreatedToday} today</span>
              </div>
            </div>

            <div className="p-5 bg-industrial-950 border border-industrial-800 rounded-2xl">
              <span className="text-xs font-semibold text-industrial-400 uppercase tracking-wider block">Website Scans Today</span>
              <span className="text-3xl font-black text-sky-400 mt-2 block">{stats.websiteScansToday}</span>
              <div className="mt-2 text-[11px] text-industrial-400 font-mono">
                Real-time Data Fetching
              </div>
            </div>

            <div className="p-5 bg-industrial-950 border border-industrial-800 rounded-2xl">
              <span className="text-xs font-semibold text-industrial-400 uppercase tracking-wider block">Leads Updated Today</span>
              <span className="text-3xl font-black text-amber-400 mt-2 block">{stats.leadsUpdatedToday}</span>
              <div className="mt-2 text-[11px] text-industrial-400 font-mono">
                Real-time Audit Tracker
              </div>
            </div>
          </div>
        </div>
      )}

      {/* USER MANAGEMENT TAB */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          
          {/* Header & Filter Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-extrabold text-white">Workspace User Accounts ({usersList.length})</h3>
              <p className="text-xs text-industrial-400">Manage workspace team members, status filters, and permissions.</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              
              {/* Server-Side Status Filter */}
              <div className="inline-flex p-1 bg-industrial-950 border border-industrial-800 rounded-xl text-xs font-semibold">
                <button
                  onClick={() => setUserStatusFilter('all')}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${userStatusFilter === 'all' ? 'bg-industrial-800 text-white font-bold' : 'text-industrial-400 hover:text-white'}`}
                >
                  All
                </button>
                <button
                  onClick={() => setUserStatusFilter('active')}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${userStatusFilter === 'active' ? 'bg-emerald-500/20 text-emerald-400 font-bold' : 'text-industrial-400 hover:text-white'}`}
                >
                  Active
                </button>
                <button
                  onClick={() => setUserStatusFilter('disabled')}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${userStatusFilter === 'disabled' ? 'bg-red-500/20 text-red-400 font-bold' : 'text-industrial-400 hover:text-white'}`}
                >
                  Disabled
                </button>
              </div>

              {/* Search Filter */}
              <div className="relative w-full sm:w-56">
                <Search className="w-4 h-4 text-industrial-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search user or email..."
                  value={userSearchFilter}
                  onChange={(e) => setUserSearchFilter(e.target.value)}
                  className="industrial-input w-full text-xs pl-10 pr-4 py-2 rounded-xl bg-industrial-900 border border-industrial-800 text-white"
                />
              </div>

              <button
                onClick={handleOpenCreateModal}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-orange hover:bg-orange-600 text-white font-bold text-xs shadow-lg shadow-brand-orange/20 transition-all shrink-0"
              >
                <UserPlus className="w-4 h-4" />
                <span>+ Create User</span>
              </button>

            </div>
          </div>

          <div className="industrial-card overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-industrial-950/80 border-b border-industrial-800 text-industrial-400 uppercase tracking-wider text-[11px] font-semibold">
                  <th className="p-3">User</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Last Login</th>
                  <th className="p-3">Created Date</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-industrial-800/60 font-mono text-[11px] bg-industrial-950">
                {usersList.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="p-8 text-center text-industrial-500 font-sans">
                      {userStatusFilter === 'disabled' ? 'No disabled users found.' : userStatusFilter === 'active' ? 'No active users found.' : 'No users found matching filter.'}
                    </td>
                  </tr>
                ) : (
                  usersList.map((u) => {
                    const isAdmin = (u.role || '').toLowerCase() === 'admin' || (u.role || '').toLowerCase() === 'super_admin';
                    const isSuperAdminRole = (u.role || '').toLowerCase() === 'super_admin';
                    const isDisabled = u.status === 'disabled';

                    return (
                      <tr key={u.user_id} className="hover:bg-industrial-900/50">
                        <td className="p-3">
                          <span className="font-bold text-white block">{u.full_name}</span>
                          <span className="text-[10px] text-industrial-500 font-mono">{u.user_id}</span>
                        </td>

                        <td className="p-3 text-industrial-300">
                          {u.email}
                        </td>

                        <td className="p-3">
                          <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold border ${
                            isSuperAdminRole
                              ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                              : isAdmin
                              ? 'bg-brand-orange/20 text-brand-orange border-brand-orange/40'
                              : 'bg-industrial-800 text-industrial-300 border-industrial-700'
                          }`}>
                            {isSuperAdminRole ? 'SUPER ADMIN' : isAdmin ? 'ADMIN' : 'NORMAL USER'}
                          </span>
                        </td>

                        <td className="p-3">
                          <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold border ${
                            isDisabled
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                              : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                          }`}>
                            {isDisabled ? '🔴 Disabled' : '🟢 Active'}
                          </span>
                        </td>

                        <td className="p-3 text-industrial-400">
                          {u.last_login_at ? new Date(u.last_login_at).toLocaleString() : 'Never'}
                        </td>

                        <td className="p-3 text-industrial-400">
                          {new Date(u.created_at).toLocaleDateString()}
                        </td>

                        <td className="p-3 text-right space-x-2">
                          {!isSuperAdminRole && (
                            <button
                              onClick={() => handleToggleUserRole(u, u.role)}
                              className="px-2.5 py-1 rounded bg-industrial-800 hover:bg-industrial-700 text-industrial-300 text-[10px] font-bold border border-industrial-700"
                              title="Change user role"
                            >
                              {isAdmin ? 'Make Normal' : 'Make Admin'}
                            </button>
                          )}

                          {u.email !== 'amautomationtrading@gmail.com' && !isSuperAdminRole && (
                            <button
                              onClick={() => handleToggleUserStatus(u, u.status)}
                              className={`px-2.5 py-1 rounded text-[10px] font-bold border transition-colors ${
                                isDisabled
                                  ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border-emerald-500/40'
                                  : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/40'
                              }`}
                            >
                              {isDisabled ? 'Enable' : 'Disable'}
                            </button>
                          )}

                          {/* PERMANENT DELETE (SUPER ADMIN ONLY) */}
                          {isSuperAdmin && u.email !== 'amautomationtrading@gmail.com' && !isSuperAdminRole && (
                            <button
                              onClick={() => handleOpenDeleteModal(u)}
                              className="px-2.5 py-1 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] font-bold transition-colors"
                              title="Permanently Delete User Account"
                            >
                              Perm Delete
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* AUDIT LOGS TAB */}
      {activeTab === 'audit' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-extrabold text-white">System Audit Log Trail</h3>
              <p className="text-xs text-industrial-400">Immutable trail of user logins, lead mutations, role updates, and system events.</p>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-industrial-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter logs..."
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  className="industrial-input text-xs pl-9 pr-4 py-2 rounded-xl bg-industrial-900 border border-industrial-800 text-white w-56"
                />
              </div>

              <button
                onClick={fetchAuditLogs}
                className="p-2 rounded-xl bg-industrial-900 border border-industrial-800 hover:border-industrial-700 text-industrial-300"
                title="Refresh Logs"
              >
                <RefreshCw className={`w-4 h-4 ${loadingAudit ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          <div className="industrial-card overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-industrial-950/80 border-b border-industrial-800 text-industrial-400 uppercase tracking-wider text-[11px] font-semibold">
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">User</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Action</th>
                  <th className="p-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-industrial-800/60 font-mono text-[11px] bg-industrial-950">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-industrial-900/50">
                    <td className="p-3 text-industrial-400">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="p-3 font-bold text-white">
                      {log.user_name || log.user_email}
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded bg-industrial-800 text-industrial-300 text-[10px]">
                        {(log.user_role || 'user').toUpperCase()}
                      </span>
                    </td>
                    <td className="p-3 font-bold text-brand-orange">
                      {log.action}
                    </td>
                    <td className="p-3 text-industrial-300 max-w-md truncate">
                      {log.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE NEW USER MODAL */}
      {showCreateUserModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-industrial-900 border border-industrial-800 rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl space-y-6 animate-in fade-in zoom-in-95">
            
            <div className="flex items-center justify-between border-b border-industrial-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-orange/20 border border-brand-orange/40 text-brand-orange flex items-center justify-center">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-white">Create New User</h3>
                  <p className="text-xs text-industrial-400">Add a team member to your customer workspace.</p>
                </div>
              </div>
              <button onClick={() => setShowCreateUserModal(false)} className="text-industrial-500 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {createUserError && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{createUserError}</span>
              </div>
            )}

            <form onSubmit={handleCreateUserSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-industrial-300 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={createUserForm.full_name}
                  onChange={(e) => setCreateUserForm({ ...createUserForm, full_name: e.target.value })}
                  className="industrial-input w-full px-3.5 py-2.5 rounded-xl bg-industrial-950 border border-industrial-800 text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-industrial-300 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="rahul@company.com"
                  value={createUserForm.email}
                  onChange={(e) => setCreateUserForm({ ...createUserForm, email: e.target.value })}
                  className="industrial-input w-full px-3.5 py-2.5 rounded-xl bg-industrial-950 border border-industrial-800 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-industrial-300 mb-1">Password *</label>
                  <input
                    type="password"
                    required
                    placeholder="Min 6 chars"
                    value={createUserForm.password}
                    onChange={(e) => setCreateUserForm({ ...createUserForm, password: e.target.value })}
                    className="industrial-input w-full px-3.5 py-2.5 rounded-xl bg-industrial-950 border border-industrial-800 text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-industrial-300 mb-1">Confirm Password *</label>
                  <input
                    type="password"
                    required
                    placeholder="Confirm"
                    value={createUserForm.confirm_password}
                    onChange={(e) => setCreateUserForm({ ...createUserForm, confirm_password: e.target.value })}
                    className="industrial-input w-full px-3.5 py-2.5 rounded-xl bg-industrial-950 border border-industrial-800 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-industrial-300 mb-1">Role</label>
                <select
                  value={createUserForm.role}
                  onChange={(e) => setCreateUserForm({ ...createUserForm, role: e.target.value })}
                  className="industrial-input w-full px-3 py-2.5 rounded-xl bg-industrial-950 border border-industrial-800 text-white"
                >
                  <option value="user">Normal User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="pt-4 border-t border-industrial-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateUserModal(false)}
                  className="px-5 py-2.5 rounded-xl bg-industrial-800 hover:bg-industrial-700 text-industrial-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingUser}
                  className="px-6 py-2.5 rounded-xl bg-brand-orange hover:bg-orange-600 text-white font-extrabold shadow-lg shadow-brand-orange/20"
                >
                  {creatingUser ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* PERMANENT DELETE USER MODAL (SUPER ADMIN ONLY) */}
      {deleteTargetUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-industrial-900 border border-red-500/40 rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl space-y-6 animate-in fade-in zoom-in-95">
            
            <div className="flex items-center gap-3 text-red-400">
              <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-500/40 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Permanently Delete User?</h3>
                <p className="text-xs text-red-400 font-bold">This action CANNOT be undone!</p>
              </div>
            </div>

            <div className="p-4 bg-industrial-950 rounded-2xl border border-industrial-800 space-y-2 text-xs">
              <div className="flex justify-between text-industrial-400">
                <span>User Name:</span>
                <span className="font-bold text-white">{deleteTargetUser.full_name}</span>
              </div>
              <div className="flex justify-between text-industrial-400">
                <span>Email Address:</span>
                <span className="font-mono text-white">{deleteTargetUser.email}</span>
              </div>
              <div className="flex justify-between text-industrial-400">
                <span>Role / Status:</span>
                <span className="font-bold text-amber-400">{deleteTargetUser.role.toUpperCase()} ({deleteTargetUser.status})</span>
              </div>
            </div>

            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs">
              This action will physically remove this user account record from the database permanently.
            </div>

            {deleteUserError && (
              <div className="p-3 bg-red-500/20 text-red-300 rounded-xl text-xs font-bold">
                {deleteUserError}
              </div>
            )}

            <form onSubmit={handleConfirmPermanentDelete} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-industrial-300 mb-1">
                  Type exact email <span className="text-white font-bold font-mono">{deleteTargetUser.email}</span> to confirm:
                </label>
                <input
                  type="text"
                  required
                  placeholder={deleteTargetUser.email}
                  value={confirmUserEmail}
                  onChange={(e) => setConfirmUserEmail(e.target.value)}
                  className="industrial-input w-full px-3.5 py-2.5 rounded-xl bg-industrial-950 border border-red-500/40 text-white font-bold"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteTargetUser(null)}
                  className="px-5 py-2.5 rounded-xl bg-industrial-800 text-industrial-300 hover:text-white font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={deletingUser || confirmUserEmail.trim().toLowerCase() !== deleteTargetUser.email.toLowerCase()}
                  className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-extrabold shadow-lg shadow-red-600/30"
                >
                  {deletingUser ? 'Deleting Account...' : 'Permanently Delete'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
