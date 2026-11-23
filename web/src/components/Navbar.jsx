import React, { useState, useEffect } from 'react';
import { Bell, LogOut, Shield, User, CheckCheck, ExternalLink, Menu, Landmark } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { notificationApi } from '../services/api';
import { formatDateTime } from '../utils/formatters';
import logo from '../assets/logo.png';

export default function Navbar({ onToggleSidebar }) {
  const { user, logout } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  const fetchNotifications = async () => {
    try {
      const res = await notificationApi.list();
      if (res.success && res.data) {
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.unread_count || 0);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await notificationApi.markAllRead();
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
    } catch {
      // ignore
    }
  };

  const handleMarkOneRead = async (id) => {
    try {
      await notificationApi.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: 1 } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      // ignore
    }
  };

  return (
    <header className="h-16 bg-white/95 backdrop-blur-md border-b border-emerald-100/80 sticky top-0 z-30 px-6 flex items-center justify-between">
      {/* Left branding */}
      <div className="flex items-center gap-3">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="md:hidden p-2 text-slate-600 hover:text-emerald-800 rounded-lg hover:bg-emerald-50 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <div className="flex items-center gap-2.5">
          <img
            src={logo}
            alt="City of La Carlota Official Seal"
            className="w-10 h-10 rounded-full object-contain shadow-xs"
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-extrabold text-emerald-950 leading-tight font-serif">e-Peddlers</h1>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 uppercase tracking-wider">
                Official
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-none">City Government of La Carlota</p>
          </div>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-4">
        {/* Notification Bell Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 text-slate-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-xl relative transition-colors"
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-emerald-100 overflow-hidden z-50 animate-scale-in">
              <div className="px-4 py-3 bg-emerald-50/70 border-b border-emerald-100 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                    Official Notifications
                  </h3>
                  <p className="text-[11px] text-slate-500">{unreadCount} unread updates</p>
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Mark all read</span>
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">
                    No notifications yet.
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => handleMarkOneRead(n.id)}
                      className={`p-3.5 hover:bg-emerald-50/40 cursor-pointer transition-colors ${
                        !n.is_read ? 'bg-emerald-50/20' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-xs font-bold text-slate-800">{n.title}</h4>
                        {!n.is_read && (
                          <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0 mt-1" />
                        )}
                      </div>
                      <p className="text-xs text-slate-600 mt-1 line-clamp-2">{n.message}</p>
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        {formatDateTime(n.created_at)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Identity Chip */}
        <div className="flex items-center gap-3 pl-2 border-l border-emerald-100">
          <div className="hidden sm:block text-right">
            <p className="text-xs font-bold text-slate-900 leading-tight">
              {user?.first_name} {user?.last_name}
            </p>
            <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 uppercase tracking-wider mt-0.5">
              {user?.role_name || user?.role || 'User'}
            </span>
          </div>

          <div className="w-9 h-9 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-bold text-sm shadow-sm">
            {user?.first_name ? user.first_name.charAt(0).toUpperCase() : 'U'}
          </div>

          {/* Logout Button */}
          <button
            onClick={logout}
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
