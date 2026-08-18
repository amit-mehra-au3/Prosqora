import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  ShieldCheck,
  Users,
  Building,
  CreditCard,
  Crown,
  UserPlus,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Plus,
  X,
  FileText,
  Activity,
  Zap,
  Check,
  Ban,
  Eye,
  Edit,
  Trash2,
  RotateCcw,
  KeyRound,
  Sliders,
  Mail,
  PhoneCall,
  Calendar,
  Layers
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function SuperAdminPanelPage() {
  const { user } = useAuth();

  const [stats, setStats] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [recentLogs, setRecentLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Create Customer Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [planId, setPlanId] = useState('growth');
  const [subscriptionType, setSubscriptionType] = useState('EXEMPT');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');

  // View Customer Details Modal State
  const [viewCustomer, setViewCustomer] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);

  // Edit Customer Modal State
  const [editCustomer, setEditCustomer] = useState(null);
  const [editForm, setEditForm] = useState({
    full_name: '',
    email: '',
    company_name: '',
    phone: '',
    plan_id: 'growth',
    subscription_type: 'EXEMPT',
    status: 'active',
    lead_limit: '',
    scan_limit: '',
    user_limit: '',
    new_password: ''
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  // Delete Customer Confirmation Modal State
  const [deleteCustomer, setDeleteCustomer] = useState(null);
  const [confirmCompanyName, setConfirmCompanyName] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const [toastMessage, setToastMessage] = useState(null);

  useEffect(() => {
    fetchSuperAdminData();
  }, [statusFilter]);

  const fetchSuperAdminData = async () => {
    setLoading(true);
    try {
      const [dashRes, custRes] = await Promise.all([
        axios.get('/api/super-admin/dashboard'),
        axios.get(`/api/super-admin/customers?statusFilter=${statusFilter}`)
      ]);

      if (dashRes.data.success) {
        setStats(dashRes.data.stats);
        setRecentLogs(dashRes.data.recentLogs || []);
      }
      if (custRes.data.success) {
        setCustomers(custRes.data.customers || []);
      }
    } catch (err) {
      console.error('Failed to load Super Admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  // 1. CREATE CUSTOMER ADMIN
  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    setCreateError('');

    if (!fullName.trim() || !companyName.trim() || !email.trim() || !password) {
      setCreateError('Please fill in all required fields.');
      return;
    }

    if (password !== confirmPassword) {
      setCreateError('Passwords do not match.');
      return;
    }

    setCreateLoading(true);
    try {
      const res = await axios.post('/api/super-admin/customers', {
        full_name: fullName.trim(),
        company_name: companyName.trim(),
        email: email.trim(),
        password,
        confirm_password: confirmPassword,
        phone: phone.trim(),
        plan_id: planId,
        subscription_type: subscriptionType
      });

      if (res.data.success) {
        setToastMessage(`🎉 ${res.data.message}`);
        setTimeout(() => setToastMessage(null), 4000);

        setShowCreateModal(false);
        setFullName('');
        setCompanyName('');
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setPhone('');

        fetchSuperAdminData();
      }
    } catch (err) {
      setCreateError(err.response?.data?.error || 'Failed to create Customer Admin.');
    } finally {
      setCreateLoading(false);
    }
  };

  // 2. OPEN VIEW CUSTOMER DETAILS
  const handleOpenViewCustomer = async (cust) => {
    setViewLoading(true);
    setViewCustomer(null);
    try {
      const res = await axios.get(`/api/super-admin/customers/${cust.user_id}`);
      if (res.data.success) {
        setViewCustomer(res.data.customer);
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to fetch customer details.');
    } finally {
      setViewLoading(false);
    }
  };

  // 3. OPEN EDIT CUSTOMER MODAL
  const handleOpenEditCustomer = (cust) => {
    setEditCustomer(cust);
    setEditError('');
    setEditForm({
      full_name: cust.full_name || '',
      email: cust.email || '',
      company_name: cust.company_name || '',
      phone: cust.phone || '',
      plan_id: cust.plan?.plan_id || 'growth',
      subscription_type: cust.subscription_exempt ? 'EXEMPT' : 'PAID',
      status: cust.status || 'active',
      lead_limit: cust.plan?.lead_limit || '',
      scan_limit: cust.plan?.scan_limit || '',
      user_limit: cust.plan?.user_limit || '',
      new_password: ''
    });
  };

  // SAVE EDIT CUSTOMER
  const handleSaveEditCustomer = async (e) => {
    e.preventDefault();
    setEditError('');

    if (!editForm.full_name.trim() || !editForm.company_name.trim() || !editForm.email.trim()) {
      setEditError('Full Name, Company Name, and Email are required.');
      return;
    }

    setEditLoading(true);
    try {
      const res = await axios.put(`/api/super-admin/customers/${editCustomer.user_id}`, editForm);
      if (res.data.success) {
        setToastMessage(`Updated customer "${editForm.company_name}".`);
        setTimeout(() => setToastMessage(null), 4000);
        setEditCustomer(null);
        fetchSuperAdminData();
      }
    } catch (err) {
      setEditError(err.response?.data?.error || 'Failed to update customer workspace.');
    } finally {
      setEditLoading(false);
    }
  };

  // 4. TOGGLE DISABLE / ENABLE STATUS
  const handleToggleCustomerStatus = async (cust) => {
    if (cust.email === 'amautomationtrading@gmail.com') return;

    const newStatus = cust.status === 'active' ? 'disabled' : 'active';
    if (!window.confirm(`Are you sure you want to ${newStatus === 'disabled' ? 'DISABLE' : 'ENABLE'} account for "${cust.company_name}"?`)) return;

    try {
      const res = await axios.put(`/api/super-admin/customers/${cust.user_id}/status`, { status: newStatus });
      if (res.data.success) {
        setToastMessage(`Updated ${cust.company_name} status to ${newStatus}.`);
        setTimeout(() => setToastMessage(null), 4000);
        fetchSuperAdminData();
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update status.');
    }
  };

  // 5. OPEN DELETE CONFIRMATION MODAL
  const handleOpenDeleteCustomer = (cust) => {
    if (cust.email === 'amautomationtrading@gmail.com') {
      alert('Primary Super Admin workspace cannot be deleted.');
      return;
    }
    setDeleteCustomer(cust);
    setConfirmCompanyName('');
    setDeleteError('');
  };

  // CONFIRM SOFT DELETE CUSTOMER WORKSPACE
  const handleConfirmDeleteCustomer = async (e) => {
    e.preventDefault();
    setDeleteError('');

    if (confirmCompanyName.trim() !== deleteCustomer.company_name.trim()) {
      setDeleteError(`Please type "${deleteCustomer.company_name}" exactly to confirm deletion.`);
      return;
    }

    setDeleteLoading(true);
    try {
      const res = await axios.delete(`/api/super-admin/customers/${deleteCustomer.user_id}`, {
        data: { company_name_confirm: confirmCompanyName.trim() }
      });

      if (res.data.success) {
        setToastMessage(`Soft-deleted Customer Workspace "${deleteCustomer.company_name}". Access revoked.`);
        setTimeout(() => setToastMessage(null), 4000);
        setDeleteCustomer(null);
        fetchSuperAdminData();
      }
    } catch (err) {
      setDeleteError(err.response?.data?.error || 'Failed to delete customer workspace.');
    } finally {
      setDeleteLoading(false);
    }
  };

  // 6. RESTORE SOFT-DELETED CUSTOMER WORKSPACE
  const handleRestoreCustomer = async (cust) => {
    if (!window.confirm(`Are you sure you want to RESTORE workspace access for "${cust.company_name}"?`)) return;

    try {
      const res = await axios.post(`/api/super-admin/customers/${cust.user_id}/restore`);
      if (res.data.success) {
        setToastMessage(`Restored Customer Workspace "${cust.company_name}". Access re-activated!`);
        setTimeout(() => setToastMessage(null), 4000);
        fetchSuperAdminData();
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to restore customer workspace.');
    }
  };

  const filteredCustomers = customers.filter(
    (c) =>
      c.company_name.toLowerCase().includes(search.toLowerCase()) ||
      c.full_name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase())
  );

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-industrial-800 pb-6">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-extrabold">
            <Crown className="w-4 h-4 text-amber-400" />
            <span>Prosqora Platform Owner Administration</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">Prosqora Super Admin Portal</h1>
          <p className="text-xs text-industrial-400">
            Customer Workspace Management: View details, Edit limits, Change plans, Grant exemptions, Soft-delete workspaces, and Restore accounts.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-brand-orange hover:bg-orange-600 text-white font-extrabold text-xs shadow-xl shadow-brand-orange/20 transition-all shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>+ Create Customer Admin (Exempt / Paid)</span>
        </button>
      </div>

      {/* Metric Cards Grid */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          
          <div className="p-5 bg-industrial-900 border border-industrial-800 rounded-2xl space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-industrial-400 uppercase">Total Customers</span>
              <Building className="w-4 h-4 text-brand-orange" />
            </div>
            <span className="text-2xl font-black text-white block">{stats.totalCustomers}</span>
            <span className="text-[10px] text-industrial-500 font-mono block">Workspaces Registered</span>
          </div>

          <div className="p-5 bg-industrial-900 border border-industrial-800 rounded-2xl space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-industrial-400 uppercase">Exempt Subscriptions</span>
              <ShieldCheck className="w-4 h-4 text-amber-400" />
            </div>
            <span className="text-2xl font-black text-amber-400 block">{stats.exemptSubscriptions}</span>
            <span className="text-[10px] text-industrial-500 font-mono block">No Payment Required</span>
          </div>

          <div className="p-5 bg-industrial-900 border border-industrial-800 rounded-2xl space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-industrial-400 uppercase">Total Leads</span>
              <Zap className="w-4 h-4 text-sky-400" />
            </div>
            <span className="text-2xl font-black text-white block">{stats.totalLeads.toLocaleString('en-IN')}</span>
            <span className="text-[10px] text-industrial-500 font-mono block">Across All Workspaces</span>
          </div>

          <div className="p-5 bg-industrial-900 border border-industrial-800 rounded-2xl space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-industrial-400 uppercase">Monthly Revenue</span>
              <CreditCard className="w-4 h-4 text-emerald-400" />
            </div>
            <span className="text-2xl font-black text-emerald-400 block">{stats.monthlyRevenue}</span>
            <span className="text-[10px] text-industrial-500 font-mono block">Active Paid Plans</span>
          </div>

        </div>
      )}

      {/* Customer Workspaces Management Table Header & Filters */}
      <div className="space-y-4">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-extrabold text-white">Customer Workspaces ({filteredCustomers.length})</h2>
            <p className="text-xs text-industrial-400">View, edit, disable, soft-delete, or restore customer accounts.</p>
          </div>

          {/* Status Filter Buttons & Search */}
          <div className="flex flex-wrap items-center gap-3">
            
            <div className="inline-flex p-1 bg-industrial-950 border border-industrial-800 rounded-xl text-xs font-semibold">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${statusFilter === 'all' ? 'bg-industrial-800 text-white font-bold' : 'text-industrial-400 hover:text-white'}`}
              >
                All
              </button>
              <button
                onClick={() => setStatusFilter('active')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${statusFilter === 'active' ? 'bg-emerald-500/20 text-emerald-400 font-bold' : 'text-industrial-400 hover:text-white'}`}
              >
                Active
              </button>
              <button
                onClick={() => setStatusFilter('exempt')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${statusFilter === 'exempt' ? 'bg-amber-500/20 text-amber-400 font-bold' : 'text-industrial-400 hover:text-white'}`}
              >
                Exempt
              </button>
              <button
                onClick={() => setStatusFilter('disabled')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${statusFilter === 'disabled' ? 'bg-red-500/20 text-red-400 font-bold' : 'text-industrial-400 hover:text-white'}`}
              >
                Disabled
              </button>
              <button
                onClick={() => setStatusFilter('deleted')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${statusFilter === 'deleted' ? 'bg-industrial-700 text-industrial-300 font-bold' : 'text-industrial-400 hover:text-white'}`}
              >
                Deleted
              </button>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-industrial-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search company or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="industrial-input w-full text-xs pl-10 pr-4 py-2 rounded-xl bg-industrial-900 border border-industrial-800 text-white"
              />
            </div>

          </div>
        </div>

        {/* Customer Table */}
        <div className="bg-industrial-900 border border-industrial-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-industrial-300">
              <thead className="bg-industrial-950 text-industrial-400 font-bold uppercase text-[10px] border-b border-industrial-800">
                <tr>
                  <th className="px-5 py-3.5">Company Workspace</th>
                  <th className="px-5 py-3.5">Customer Admin</th>
                  <th className="px-5 py-3.5">Assigned Plan</th>
                  <th className="px-5 py-3.5">Subscription</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Users / Leads</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-industrial-800/80">
                {filteredCustomers.map((cust) => (
                  <tr key={cust.id} className="hover:bg-industrial-950/50 transition-colors">
                    
                    <td className="px-5 py-4 font-bold text-white">
                      <div className="flex items-center gap-2.5">
                        <Building className="w-4 h-4 text-brand-orange shrink-0" />
                        <div>
                          <span>{cust.company_name}</span>
                          <span className="text-[10px] text-industrial-500 block font-mono">ID: {cust.workspace_id}</span>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="font-semibold text-white">{cust.full_name}</div>
                      <div className="text-[11px] text-industrial-400 font-mono">{cust.email}</div>
                    </td>

                    <td className="px-5 py-4">
                      <span className="font-extrabold text-white">{cust.plan.name}</span>
                      <span className="text-[10px] text-industrial-400 block font-mono">
                        {cust.plan.formatted_price}/mo
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      {cust.subscription_exempt ? (
                        <span className="px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-black text-[10px] inline-flex items-center gap-1">
                          <Crown className="w-3 h-3" />
                          <span>EXEMPT</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-extrabold text-[10px] inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>PAID</span>
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      {cust.status === 'active' ? (
                        <span className="text-emerald-400 font-extrabold text-xs">Active</span>
                      ) : cust.status === 'deleted' ? (
                        <span className="text-industrial-500 font-extrabold text-xs">Deleted</span>
                      ) : (
                        <span className="text-red-400 font-extrabold text-xs">Disabled</span>
                      )}
                    </td>

                    <td className="px-5 py-4 font-mono text-[11px]">
                      <div>{cust.users_count} Users</div>
                      <div className="text-industrial-400">{cust.leads_count.toLocaleString('en-IN')} Leads</div>
                    </td>

                    <td className="px-5 py-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        
                        {/* View Button */}
                        <button
                          onClick={() => handleOpenViewCustomer(cust)}
                          title="View Customer Details"
                          className="p-1.5 rounded-lg bg-industrial-800 hover:bg-industrial-700 text-industrial-300 hover:text-white transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {/* Edit Button */}
                        <button
                          onClick={() => handleOpenEditCustomer(cust)}
                          title="Edit Customer Workspace"
                          className="p-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 transition-colors"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>

                        {/* Disable / Enable Button */}
                        {cust.email !== 'amautomationtrading@gmail.com' && cust.status !== 'deleted' && (
                          <button
                            onClick={() => handleToggleCustomerStatus(cust)}
                            title={cust.status === 'active' ? 'Disable Customer Account' : 'Enable Customer Account'}
                            className={`p-1.5 rounded-lg text-[11px] font-extrabold transition-colors ${
                              cust.status === 'active'
                                ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            }`}
                          >
                            {cust.status === 'active' ? <Ban className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                          </button>
                        )}

                        {/* Delete or Restore Button */}
                        {cust.email !== 'amautomationtrading@gmail.com' && (
                          cust.status === 'deleted' ? (
                            <button
                              onClick={() => handleRestoreCustomer(cust)}
                              title="Restore Workspace"
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold inline-flex items-center gap-1"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Restore</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleOpenDeleteCustomer(cust)}
                              title="Soft-Delete Customer Workspace"
                              className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )
                        )}

                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 1. CREATE EXEMPT CUSTOMER ADMIN MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-industrial-900 border border-industrial-800 rounded-3xl p-6 sm:p-8 w-full max-w-xl shadow-2xl space-y-6 animate-in fade-in zoom-in-95">
            
            <div className="flex items-center justify-between border-b border-industrial-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-white">Create Customer Admin</h3>
                  <p className="text-xs text-industrial-400">Add a new customer workspace account (Exempt or Paid).</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-industrial-500 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createError && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateCustomer} className="space-y-4">
              
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-industrial-300 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rahul Sharma"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="industrial-input w-full text-xs px-3.5 py-2.5 rounded-xl bg-industrial-950 border border-industrial-800 text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-industrial-300 mb-1">Company Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ABC Automation Pvt Ltd"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="industrial-input w-full text-xs px-3.5 py-2.5 rounded-xl bg-industrial-950 border border-industrial-800 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-industrial-300 mb-1">Admin Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="admin@abcautomation.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="industrial-input w-full text-xs px-3.5 py-2.5 rounded-xl bg-industrial-950 border border-industrial-800 text-white"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-industrial-300 mb-1">Password *</label>
                  <input
                    type="password"
                    required
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="industrial-input w-full text-xs px-3.5 py-2.5 rounded-xl bg-industrial-950 border border-industrial-800 text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-industrial-300 mb-1">Confirm Password *</label>
                  <input
                    type="password"
                    required
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="industrial-input w-full text-xs px-3.5 py-2.5 rounded-xl bg-industrial-950 border border-industrial-800 text-white"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-industrial-300 mb-1">Assign SaaS Plan</label>
                  <select
                    value={planId}
                    onChange={(e) => setPlanId(e.target.value)}
                    className="industrial-input w-full text-xs px-3 py-2.5 rounded-xl bg-industrial-950 border border-industrial-800 text-white"
                  >
                    <option value="starter">Starter Plan (1k leads / ₹999)</option>
                    <option value="growth">Growth Plan (5k leads / ₹2,499)</option>
                    <option value="business">Business Plan (25k leads / ₹4,999)</option>
                    <option value="enterprise">Enterprise Plan (Custom)</option>
                    <option value="unlimited">Custom Unlimited Plan</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-industrial-300 mb-1">Subscription Exemption</label>
                  <select
                    value={subscriptionType}
                    onChange={(e) => setSubscriptionType(e.target.value)}
                    className="industrial-input w-full text-xs px-3 py-2.5 rounded-xl bg-industrial-950 border border-industrial-800 text-amber-400 font-bold"
                  >
                    <option value="EXEMPT">EXEMPT — No Payment Required (Friends/Family)</option>
                    <option value="PAID">PAID — Standard Payment Subscription</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-industrial-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-5 py-2.5 rounded-xl bg-industrial-800 hover:bg-industrial-700 text-industrial-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-6 py-2.5 rounded-xl bg-brand-orange hover:bg-orange-600 text-white font-extrabold text-xs shadow-lg shadow-brand-orange/20"
                >
                  {createLoading ? 'Creating Account...' : 'Create Customer Admin'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* 2. VIEW CUSTOMER DETAILS MODAL */}
      {viewCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-industrial-900 border border-industrial-800 rounded-3xl p-6 sm:p-8 w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl space-y-6 animate-in fade-in zoom-in-95">
            
            <div className="flex items-center justify-between border-b border-industrial-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-500/40 text-sky-400 flex items-center justify-center">
                  <Building className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-white">{viewCustomer.company_name}</h3>
                  <p className="text-xs text-industrial-400 font-mono">Workspace ID: {viewCustomer.workspace_id}</p>
                </div>
              </div>
              <button onClick={() => setViewCustomer(null)} className="text-industrial-500 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="p-4 bg-industrial-950 rounded-2xl border border-industrial-800 space-y-2 text-xs">
                <span className="font-bold text-industrial-400 uppercase tracking-wider block text-[10px]">Customer Admin</span>
                <div className="font-extrabold text-white text-sm">{viewCustomer.full_name}</div>
                <div className="text-industrial-300 font-mono">{viewCustomer.email}</div>
                <div className="text-industrial-400">{viewCustomer.phone || 'No phone set'}</div>
              </div>

              <div className="p-4 bg-industrial-950 rounded-2xl border border-industrial-800 space-y-2 text-xs">
                <span className="font-bold text-industrial-400 uppercase tracking-wider block text-[10px]">Plan & Limits</span>
                <div className="font-black text-amber-400 text-sm flex items-center gap-2">
                  <span>{viewCustomer.plan.name} Plan</span>
                  {viewCustomer.subscription_exempt && <span className="px-2 py-0.5 rounded bg-amber-500/20 text-[10px]">EXEMPT</span>}
                </div>
                <div className="font-mono text-industrial-300">
                  Leads: {viewCustomer.plan.lead_limit.toLocaleString()} | Scans: {viewCustomer.plan.scan_limit.toLocaleString()} | Users: {viewCustomer.plan.user_limit}
                </div>
              </div>
            </div>

            {/* Workspace Users List */}
            <div className="space-y-3">
              <h4 className="font-extrabold text-white text-xs uppercase tracking-wider">Workspace Users ({viewCustomer.users.length})</h4>
              <div className="bg-industrial-950 rounded-2xl border border-industrial-800 overflow-hidden divide-y divide-industrial-800 text-xs">
                {viewCustomer.users.map((u) => (
                  <div key={u.id} className="p-3.5 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-white">{u.full_name}</div>
                      <div className="text-[11px] text-industrial-400 font-mono">{u.email}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-industrial-800 text-industrial-300 font-mono text-[10px]">
                        {u.role.toUpperCase()}
                      </span>
                      <span className={`text-[10px] font-bold ${u.status === 'active' ? 'text-emerald-400' : 'text-red-400'}`}>
                        {u.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-industrial-800">
              <button
                onClick={() => setViewCustomer(null)}
                className="px-5 py-2 rounded-xl bg-industrial-800 text-industrial-300 hover:text-white font-bold text-xs"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 3. EDIT CUSTOMER WORKSPACE MODAL */}
      {editCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-industrial-900 border border-industrial-800 rounded-3xl p-6 sm:p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl space-y-6 animate-in fade-in zoom-in-95">
            
            <div className="flex items-center justify-between border-b border-industrial-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-500/40 text-sky-400 flex items-center justify-center">
                  <Edit className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-white">Edit Customer Workspace</h3>
                  <p className="text-xs text-industrial-400 font-mono">Workspace ID: {editCustomer.workspace_id}</p>
                </div>
              </div>
              <button onClick={() => setEditCustomer(null)} className="text-industrial-500 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {editError && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleSaveEditCustomer} className="space-y-4 text-xs">
              
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-industrial-300 mb-1">Customer Admin Name *</label>
                  <input
                    type="text"
                    required
                    value={editForm.full_name}
                    onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                    className="industrial-input w-full px-3.5 py-2.5 rounded-xl bg-industrial-950 border border-industrial-800 text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-industrial-300 mb-1">Company Name *</label>
                  <input
                    type="text"
                    required
                    value={editForm.company_name}
                    onChange={(e) => setEditForm({ ...editForm, company_name: e.target.value })}
                    className="industrial-input w-full px-3.5 py-2.5 rounded-xl bg-industrial-950 border border-industrial-800 text-white"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-industrial-300 mb-1">Admin Work Email *</label>
                  <input
                    type="email"
                    required
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="industrial-input w-full px-3.5 py-2.5 rounded-xl bg-industrial-950 border border-industrial-800 text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-industrial-300 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="industrial-input w-full px-3.5 py-2.5 rounded-xl bg-industrial-950 border border-industrial-800 text-white"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-industrial-300 mb-1">SaaS Plan</label>
                  <select
                    value={editForm.plan_id}
                    onChange={(e) => setEditForm({ ...editForm, plan_id: e.target.value })}
                    className="industrial-input w-full px-3 py-2.5 rounded-xl bg-industrial-950 border border-industrial-800 text-white"
                  >
                    <option value="starter">Starter Plan (1k leads)</option>
                    <option value="growth">Growth Plan (5k leads)</option>
                    <option value="business">Business Plan (25k leads)</option>
                    <option value="enterprise">Enterprise Plan (Custom)</option>
                    <option value="unlimited">Custom Unlimited Plan</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-industrial-300 mb-1">Subscription Type</label>
                  <select
                    value={editForm.subscription_type}
                    onChange={(e) => setEditForm({ ...editForm, subscription_type: e.target.value })}
                    className="industrial-input w-full px-3 py-2.5 rounded-xl bg-industrial-950 border border-industrial-800 text-amber-400 font-bold"
                  >
                    <option value="EXEMPT">EXEMPT (No Payment)</option>
                    <option value="PAID">PAID (Standard Payment)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-industrial-300 mb-1">Account Status</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="industrial-input w-full px-3 py-2.5 rounded-xl bg-industrial-950 border border-industrial-800 text-white font-bold"
                  >
                    <option value="active">ACTIVE</option>
                    <option value="disabled">DISABLED</option>
                  </select>
                </div>
              </div>

              {/* Custom Limits Overrides */}
              <div className="p-4 bg-industrial-950 border border-industrial-800 rounded-2xl space-y-3">
                <span className="font-extrabold text-industrial-300 uppercase tracking-wider block text-[10px]">Custom Limits Overrides (Optional)</span>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] text-industrial-400 mb-1">Lead Limit</label>
                    <input
                      type="number"
                      placeholder="Default"
                      value={editForm.lead_limit}
                      onChange={(e) => setEditForm({ ...editForm, lead_limit: e.target.value })}
                      className="industrial-input w-full px-3 py-2 rounded-xl bg-industrial-900 border border-industrial-800 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-industrial-400 mb-1">Scan Limit</label>
                    <input
                      type="number"
                      placeholder="Default"
                      value={editForm.scan_limit}
                      onChange={(e) => setEditForm({ ...editForm, scan_limit: e.target.value })}
                      className="industrial-input w-full px-3 py-2 rounded-xl bg-industrial-900 border border-industrial-800 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-industrial-400 mb-1">User Limit</label>
                    <input
                      type="number"
                      placeholder="Default"
                      value={editForm.user_limit}
                      onChange={(e) => setEditForm({ ...editForm, user_limit: e.target.value })}
                      className="industrial-input w-full px-3 py-2 rounded-xl bg-industrial-900 border border-industrial-800 text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Password Reset Optional */}
              <div>
                <label className="block font-semibold text-industrial-300 mb-1">Reset Password (Optional)</label>
                <input
                  type="password"
                  placeholder="Leave blank to keep existing password"
                  value={editForm.new_password}
                  onChange={(e) => setEditForm({ ...editForm, new_password: e.target.value })}
                  className="industrial-input w-full px-3.5 py-2.5 rounded-xl bg-industrial-950 border border-industrial-800 text-white"
                />
              </div>

              <div className="pt-4 border-t border-industrial-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditCustomer(null)}
                  className="px-5 py-2.5 rounded-xl bg-industrial-800 text-industrial-300 hover:text-white font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="px-6 py-2.5 rounded-xl bg-brand-orange hover:bg-orange-600 text-white font-extrabold shadow-lg shadow-brand-orange/20"
                >
                  {editLoading ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* 4. DELETE CUSTOMER CONFIRMATION MODAL */}
      {deleteCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-industrial-900 border border-red-500/40 rounded-3xl p-6 sm:p-8 w-full max-w-lg shadow-2xl space-y-6 animate-in fade-in zoom-in-95">
            
            <div className="flex items-center gap-3 text-red-400">
              <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-500/40 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Delete Customer Workspace?</h3>
                <p className="text-xs text-red-400 font-bold">This is a high-risk destructive action!</p>
              </div>
            </div>

            <div className="p-4 bg-industrial-950 rounded-2xl border border-industrial-800 space-y-2 text-xs">
              <div className="flex justify-between text-industrial-400">
                <span>Company Workspace:</span>
                <span className="font-bold text-white">{deleteCustomer.company_name}</span>
              </div>
              <div className="flex justify-between text-industrial-400">
                <span>Customer Admin:</span>
                <span className="font-bold text-white">{deleteCustomer.full_name} ({deleteCustomer.email})</span>
              </div>
              <div className="flex justify-between text-industrial-400">
                <span>Users / Leads:</span>
                <span className="font-mono text-white">{deleteCustomer.users_count} Users | {deleteCustomer.leads_count} Leads</span>
              </div>
            </div>

            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs">
              This action will soft-delete this customer workspace and revoke CRM access for all associated users.
            </div>

            {deleteError && (
              <div className="p-3 bg-red-500/20 text-red-300 rounded-xl text-xs font-bold">
                {deleteError}
              </div>
            )}

            <form onSubmit={handleConfirmDeleteCustomer} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-industrial-300 mb-1">
                  To confirm deletion, please enter exact company name: <span className="text-white font-bold font-mono">{deleteCustomer.company_name}</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder={deleteCustomer.company_name}
                  value={confirmCompanyName}
                  onChange={(e) => setConfirmCompanyName(e.target.value)}
                  className="industrial-input w-full px-3.5 py-2.5 rounded-xl bg-industrial-950 border border-red-500/40 text-white font-bold"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteCustomer(null)}
                  className="px-5 py-2.5 rounded-xl bg-industrial-800 text-industrial-300 hover:text-white font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={deleteLoading || confirmCompanyName.trim() !== deleteCustomer.company_name.trim()}
                  className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-extrabold shadow-lg shadow-red-600/30"
                >
                  {deleteLoading ? 'Deleting Workspace...' : 'Permanently Delete'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
