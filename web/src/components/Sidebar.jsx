import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Award,
  Users,
  Coins,
  History,
  CheckCircle,
  Receipt,
  QrCode,
  AlertTriangle,
  FilePlus,
  RefreshCw,
  BarChart3,
  Landmark,
  Shield,
  HelpCircle,
  MapPin,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Sidebar({ isOpen, onClose }) {
  const { user } = useAuth();
  const role = user?.role_name?.toLowerCase();

  let navItems = [];

  if (role === 'admin') {
    navItems = [
      { to: '/admin', label: 'Admin Dashboard', icon: LayoutDashboard },
      { to: '/admin/applications', label: 'Peddler Applications', icon: FileText },
      { to: '/admin/vendor-map', label: 'Saturday Vendor Map', icon: MapPin },
      { to: '/admin/permits', label: 'Permit Verification Release', icon: Award },
      { to: '/admin/users', label: 'User Management', icon: Users },
      { to: '/admin/fees', label: 'Tax & Fee Schedule', icon: Coins },
      { to: '/admin/reports', label: 'Reports & Export', icon: BarChart3 },
      { to: '/admin/activity-logs', label: 'System Activity Logs', icon: History },
    ];
  } else if (role === 'treasury') {
    navItems = [
      { to: '/treasury', label: 'Treasury Dashboard', icon: LayoutDashboard },
      { to: '/treasury/payments', label: 'Permit Payments', icon: CheckCircle },
      { to: '/treasury/arkabala', label: 'Arkabala Collections', icon: Receipt },
      { to: '/treasury/reports', label: 'Revenue Reports', icon: BarChart3 },
    ];
  } else if (role === 'peddler') {
    navItems = [
      { to: '/peddler', label: 'Peddler Dashboard', icon: LayoutDashboard },
      { to: '/peddler/renew', label: 'Permit Renewal', icon: RefreshCw },
      { to: '/peddler/applications', label: 'My Applications', icon: FileText },
      { to: '/peddler/arkabala', label: 'Arkabala QR & Receipts', icon: QrCode },
      { to: '/peddler/permit', label: 'Permit Proof', icon: Award },
      { to: '/peddler/violations', label: 'Violations & Penalties', icon: AlertTriangle },
    ];
  }

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-emerald-950/70 backdrop-blur-xs md:hidden"
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 w-64 bg-emerald-950 text-emerald-100 flex flex-col border-r border-emerald-900/60 shadow-xl transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Office Seal / Title */}
        <div className="p-6 border-b border-emerald-900/80">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-300">
              City of La Carlota
            </p>
          </div>
          <h2 className="text-sm font-bold text-white mt-1 leading-snug font-serif">
            {role === 'admin' && 'Administration Portal'}
            {role === 'treasury' && 'City Treasury Portal'}
            {role === 'peddler' && 'Peddler Self-Service'}
          </h2>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/admin' || item.to === '/treasury' || item.to === '/peddler'}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-900/40 font-bold border-l-4 border-emerald-300'
                      : 'text-emerald-200/70 hover:text-white hover:bg-emerald-900/60'
                  }`
                }
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom Profile Summary */}
        <div className="p-4 border-t border-emerald-900/80 bg-emerald-950/80">
          <div className="flex items-center justify-between text-[11px] text-emerald-300/80">
            <span>e-Peddlers System</span>
            <span className="font-mono text-emerald-400">v1.0 • 2026</span>
          </div>
          <p className="text-[10px] text-emerald-400/60 mt-1">
            Negros Occidental, Philippines
          </p>
        </div>
      </aside>
    </>
  );
}
