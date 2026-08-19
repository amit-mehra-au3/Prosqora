import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import PricingPage from './pages/PricingPage';
import SignupPage from './pages/SignupPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ProfilePage from './pages/ProfilePage';
import Sidebar from './components/Sidebar';
import UserMenu from './components/UserMenu';
import DashboardPage from './pages/DashboardPage';
import AllLeadsPage from './pages/AllLeadsPage';
import FollowupsPage from './pages/FollowupsPage';
import ManualScanPage from './pages/ManualScanPage';
import ExportPage from './pages/ExportPage';
import SettingsPage from './pages/SettingsPage';
import CampaignsPage from './pages/CampaignsPage';
import EmailTemplatesPage from './pages/EmailTemplatesPage';
import PriceLookupPage from './pages/PriceLookupPage';
import AdminPanelPage from './pages/AdminPanelPage';
import SuperAdminPanelPage from './pages/SuperAdminPanelPage';
import LeadDetailModal from './components/LeadDetailModal';
import DuplicateModal from './components/DuplicateModal';
import { CheckCircle, AlertCircle, Bell } from 'lucide-react';

function AuthenticatedCrmLayout({ initialPage = 'dashboard' }) {
  const { user } = useAuth();
  const userRole = (user?.role || '').toLowerCase();
  const isAdmin = userRole === 'admin' || userRole === 'super_admin';
  const isSuperAdmin = userRole === 'super_admin';

  const [activePage, setActivePage] = useState(initialPage);
  const [selectedLead, setSelectedLead] = useState(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Role Protection Redirect for Normal Users
  // Role Protection Redirects
  useEffect(() => {
    if (activePage === 'super-admin' && !isSuperAdmin) {
      setActivePage('dashboard');
    } else if (!isAdmin && (activePage === 'admin' || activePage === 'export')) {
      setActivePage('dashboard');
    }
  }, [activePage, isAdmin, isSuperAdmin]);

  // Duplicate Modal State
  const [duplicateData, setDuplicateData] = useState(null);
  const [pendingLeadData, setPendingLeadData] = useState(null);

  // Toast Notification State
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Check Settings on Mount
  useEffect(() => {
    axios.get('/api/settings').then((res) => {
      if (res.data.success && res.data.settings?.demo_mode) {
        setIsDemoMode(res.data.settings.demo_mode === 'true');
      }
    }).catch(() => {});
  }, []);

  // Save lead with Structured Duplicate Check
  const handleSaveLead = async (leadData) => {
    try {
      const saveRes = await axios.post('/api/leads', leadData);
      if (saveRes.data.success) {
        if (saveRes.data.status === 'duplicate') {
          showToast(`Already in your CRM (Saved on ${saveRes.data.savedDate ? new Date(saveRes.data.savedDate).toLocaleDateString() : 'earlier'})`);
        } else if (saveRes.data.status === 'updated') {
          showToast(`Existing Lead updated with latest scanned information!`);
        } else {
          showToast(`Lead "${leadData.company_name}" saved to CRM!`);
        }
        setRefreshTrigger((prev) => prev + 1);
        return saveRes.data;
      }
    } catch (err) {
      showToast('Error saving lead: ' + (err.response?.data?.error || err.message), 'error');
    }
  };

  const handleUpdateExistingLead = async () => {
    if (!pendingLeadData || !duplicateData) return;
    try {
      const res = await axios.post('/api/leads', {
        ...pendingLeadData,
        allowUpdate: true
      });
      if (res.data.success) {
        showToast(`Existing Lead updated with new information!`);
        setDuplicateData(null);
        setPendingLeadData(null);
        setRefreshTrigger((prev) => prev + 1);
      }
    } catch (err) {
      showToast('Failed to update existing lead', 'error');
    }
  };

  const handleSkipDuplicate = () => {
    setDuplicateData(null);
    setPendingLeadData(null);
  };

  const handleUpdateLead = async (leadId, updateData) => {
    try {
      const res = await axios.put(`/api/leads/${leadId}`, updateData);
      if (res.data.success) {
        showToast('Lead follow-up updated successfully!');
        if (selectedLead && selectedLead.id === leadId) {
          setSelectedLead(res.data.lead);
        }
        setRefreshTrigger((prev) => prev + 1);
        return res.data.lead;
      }
    } catch (err) {
      showToast('Failed to update lead details', 'error');
      throw err;
    }
  };

  return (
    <div className="flex min-h-screen bg-industrial-950 text-slate-100 font-sans selection:bg-brand-orange selection:text-white">
      
      {/* Navigation Sidebar */}
      <Sidebar activePage={activePage} setActivePage={setActivePage} isDemoMode={isDemoMode} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top Header Bar with Workspace Info & User Profile Dropdown */}
        <header className="h-16 bg-industrial-900 border-b border-industrial-800 px-8 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-industrial-400">
              Workspace:
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-industrial-950 border border-industrial-800 font-bold text-xs text-white">
              🏢 {user?.company_name || `${user?.full_name}'s CRM`}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <UserMenu />
          </div>
        </header>

        {/* Dynamic CRM Page View */}
        <main className="flex-1 overflow-y-auto">
          {activePage === 'dashboard' && (
            <DashboardPage
              setActivePage={setActivePage}
              setSelectedLead={setSelectedLead}
              refreshTrigger={refreshTrigger}
            />
          )}

          {activePage === 'find-leads' && (
            <ManualScanPage
              onSaveLead={handleSaveLead}
              setSelectedLead={setSelectedLead}
            />
          )}

          {activePage === 'all-leads' && (
            <AllLeadsPage
              setSelectedLead={setSelectedLead}
              refreshTrigger={refreshTrigger}
            />
          )}

          {activePage === 'email-campaigns' && (
            <CampaignsPage />
          )}

          {activePage === 'email-templates' && (
            <EmailTemplatesPage />
          )}

          {activePage === 'price-lookup' && (
            <PriceLookupPage />
          )}

          {activePage === 'follow-ups' && (
            <FollowupsPage
              setSelectedLead={setSelectedLead}
              refreshTrigger={refreshTrigger}
            />
          )}

          {activePage === 'scan-website' && (
            <ManualScanPage
              onSaveLead={handleSaveLead}
              setSelectedLead={setSelectedLead}
            />
          )}

          {activePage === 'export' && isAdmin && (
            <ExportPage />
          )}

          {activePage === 'admin' && isAdmin && (
            <AdminPanelPage />
          )}

          {activePage === 'super-admin' && isSuperAdmin && (
            <SuperAdminPanelPage />
          )}

          {activePage === 'settings' && (
            <SettingsPage
              isDemoMode={isDemoMode}
              setIsDemoMode={setIsDemoMode}
            />
          )}

          {activePage === 'profile' && (
            <ProfilePage />
          )}
        </main>
      </div>

      {/* Lead Detail Modal */}
      {selectedLead && (
        <LeadDetailModal
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onUpdateLead={handleUpdateLead}
        />
      )}

      {/* Duplicate Lead Confirmation Modal */}
      {duplicateData && (
        <DuplicateModal
          existingLead={duplicateData.existingLead}
          newLeadData={duplicateData.newLeadData}
          onUpdateExisting={handleUpdateExistingLead}
          onSkip={handleSkipDuplicate}
          onClose={() => setDuplicateData(null)}
        />
      )}

      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 text-xs font-semibold border animate-in fade-in slide-in-from-bottom-5 duration-200 ${
            toast.type === 'error'
              ? 'bg-red-500/20 border-red-500/40 text-red-300'
              : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
          }`}
        >
          {toast.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
          <span>{toast.message}</span>
        </div>
      )}

    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />

          {/* Protected CRM Application Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <AuthenticatedCrmLayout initialPage="dashboard" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/leads"
            element={
              <ProtectedRoute>
                <AuthenticatedCrmLayout initialPage="all-leads" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AuthenticatedCrmLayout initialPage="admin" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/super-admin"
            element={
              <ProtectedRoute>
                <AuthenticatedCrmLayout initialPage="super-admin" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/scan"
            element={
              <ProtectedRoute>
                <AuthenticatedCrmLayout initialPage="scan-website" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/campaigns"
            element={
              <ProtectedRoute>
                <AuthenticatedCrmLayout initialPage="email-campaigns" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/templates"
            element={
              <ProtectedRoute>
                <AuthenticatedCrmLayout initialPage="email-templates" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/followups"
            element={
              <ProtectedRoute>
                <AuthenticatedCrmLayout initialPage="follow-ups" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/export"
            element={
              <ProtectedRoute>
                <AuthenticatedCrmLayout initialPage="export" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <AuthenticatedCrmLayout initialPage="settings" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <AuthenticatedCrmLayout initialPage="profile" />
              </ProtectedRoute>
            }
          />

          {/* Fallback for any unmatched protected route */}
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <AuthenticatedCrmLayout initialPage="dashboard" />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
