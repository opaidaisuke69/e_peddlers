import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Public & Auth Pages
import LandingPage from '../pages/public/LandingPage';
import OnlineApplication from '../pages/public/OnlineApplication';
import VendorMapPage from '../pages/public/VendorMapPage';
import StaffLogin from '../pages/auth/StaffLogin';
import PeddlerLogin from '../pages/auth/PeddlerLogin';

// Layouts
import AdminLayout from '../layouts/AdminLayout';
import TreasuryLayout from '../layouts/TreasuryLayout';
import PeddlerLayout from '../layouts/PeddlerLayout';

// Admin Pages
import AdminDashboard from '../pages/admin/AdminDashboard';
import ApplicationList from '../pages/admin/ApplicationList';
import ApplicationDetail from '../pages/admin/ApplicationDetail';
import PermitRelease from '../pages/admin/PermitRelease';
import UserManagement from '../pages/admin/UserManagement';
import FeeManagement from '../pages/admin/FeeManagement';
import ActivityLogs from '../pages/admin/ActivityLogs';
import AdminVendorMap from '../pages/admin/AdminVendorMap';
import AdminReports from '../pages/admin/AdminReports';

// Treasury Pages
import TreasuryDashboard from '../pages/treasury/TreasuryDashboard';
import PaymentValidation from '../pages/treasury/PaymentValidation';
import ArkabalaReconciliation from '../pages/treasury/ArkabalaReconciliation';
import TreasuryReports from '../pages/treasury/TreasuryReports';

// Peddler Pages
import PeddlerDashboard from '../pages/peddlers/PeddlerDashboard';
import ApplyPermit from '../pages/peddlers/ApplyPermit';
import RenewalPermit from '../pages/peddlers/RenewalPermit';
import PeddlerApplications from '../pages/peddlers/PeddlerApplications';
import PeddlerArkabala from '../pages/peddlers/PeddlerArkabala';
import PeddlerPermit from '../pages/peddlers/PeddlerPermit';
import PeddlerViolations from '../pages/peddlers/PeddlerViolations';

export default function AppRoutes() {
  return (
    <Routes>
      {/* 1. Public Landing Page & Online Application */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/apply-online" element={<OnlineApplication />} />
      <Route path="/apply" element={<OnlineApplication />} />
      <Route path="/vendor-map" element={<VendorMapPage />} />

      {/* 2. Authentication Routes */}
      <Route path="/peddler-login" element={<PeddlerLogin />} />
      <Route path="/staff-login" element={<StaffLogin />} />
      <Route path="/login" element={<StaffLogin />} />

      {/* 3. Admin Routes (Protected) */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminDashboard />} />
        <Route path="applications" element={<ApplicationList />} />
        <Route path="applications/:id" element={<ApplicationDetail />} />
        <Route path="vendor-map" element={<AdminVendorMap />} />
        <Route path="permits" element={<PermitRelease />} />
        <Route path="users" element={<UserManagement />} />
        <Route path="fees" element={<FeeManagement />} />
        <Route path="reports" element={<AdminReports />} />
        <Route path="activity-logs" element={<ActivityLogs />} />
      </Route>

      {/* 4. Treasury Routes (Protected) */}
      <Route path="/treasury" element={<TreasuryLayout />}>
        <Route index element={<TreasuryDashboard />} />
        <Route path="payments" element={<PaymentValidation />} />
        <Route path="arkabala" element={<ArkabalaReconciliation />} />
        <Route path="reports" element={<TreasuryReports />} />
      </Route>

      {/* 5. Peddler Routes (Protected) */}
      <Route path="/peddler" element={<PeddlerLayout />}>
        <Route index element={<PeddlerDashboard />} />
        <Route path="apply" element={<Navigate to="/peddler/renew" replace />} />
        <Route path="renew" element={<RenewalPermit />} />
        <Route path="applications" element={<PeddlerApplications />} />
        <Route path="arkabala" element={<PeddlerArkabala />} />
        <Route path="permit" element={<PeddlerPermit />} />
        <Route path="violations" element={<PeddlerViolations />} />
      </Route>

      {/* Fallback to Landing Page */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
