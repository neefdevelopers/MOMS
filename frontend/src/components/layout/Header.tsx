'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { fetchApi } from '@/lib/api';
import Link from 'next/link';
import {
  Bell,
  Search,
  LogOut,
  Shield,
} from 'lucide-react';

export function Header() {
  const { user, quickSwitchUser, logout } = useAuth();
  const [showRoleMenu, setShowRoleMenu] = useState(false);

  // Notifications
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifMenu, setShowNotifMenu] = useState(false);

  // Search Bar
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const loadNotifications = async () => {
    try {
      const res = await fetchApi('/notifications');
      setNotifications(res || []);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  };

  useEffect(() => {
    if (user) {
      loadNotifications();
    }
  }, [user]);

  // Global search API call
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetchApi(`/reports/search?q=${encodeURIComponent(searchQuery)}`);
        setSearchResults(res);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Close search dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSearchResults(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkAllRead = async () => {
    try {
      for (const n of notifications.filter((x) => !x.isRead)) {
        await fetchApi(`/notifications/${n.id}/read`, { method: 'PATCH' });
      }
      loadNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const roleLabel = user?.role === 'MEDIA_MANAGER'
    ? 'Media Manager'
    : user?.role === 'TECHNICAL_MANAGER'
    ? 'Tech Manager'
    : 'Staff Member';

  const roleBadgeColor = user?.role === 'MEDIA_MANAGER'
    ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
    : user?.role === 'TECHNICAL_MANAGER'
    ? 'bg-purple-500/20 text-purple-400 border-purple-500/30'
    : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';

  return (
    <header className="h-16 bg-card border-b border-border px-6 flex items-center justify-between sticky top-0 z-40">
      {/* Left: Global Search Input */}
      <div className="relative w-72 md:w-96" ref={searchRef}>
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Global Search (Projects, Scripts, Tasks, Clients, Equipment)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-900 border border-gray-800 rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        {/* Global Search Results Dropdown */}
        {searchResults && (
          <div className="absolute top-11 left-0 right-0 bg-card border border-border rounded-xl shadow-2xl p-3 z-50 max-h-96 overflow-y-auto text-xs space-y-3">
            {Object.keys(searchResults).every((key) => searchResults[key]?.length === 0) ? (
              <div className="text-gray-400 p-2 text-center">No matching entities found.</div>
            ) : (
              Object.keys(searchResults).map((category) => {
                const items = searchResults[category];
                if (!items || items.length === 0) return null;
                return (
                  <div key={category} className="space-y-1">
                    <span className="text-[10px] font-bold text-gray-500 uppercase px-2">{category}</span>
                    <div className="space-y-0.5">
                      {items.map((item: any) => (
                        <Link
                          key={item.id}
                          href={item.url}
                          onClick={() => setSearchResults(null)}
                          className="flex items-center justify-between p-2 hover:bg-gray-900 rounded-lg text-gray-200 transition-colors"
                        >
                          <span className="font-semibold text-white">{item.title}</span>
                          <span className="text-[10px] font-mono text-gray-400">{item.subtitle}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Right: Quick Demo Role Switcher, Notifications & Profile */}
      <div className="flex items-center gap-4">
        {/* Quick Role Switcher Pill */}
        <div className="relative">
          <button
            onClick={() => setShowRoleMenu(!showRoleMenu)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors ${roleBadgeColor}`}
            title="Click to Switch Demo Role"
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Role: {roleLabel}</span>
          </button>

          {showRoleMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-card border border-border rounded-xl shadow-xl p-2 z-50 text-xs space-y-1">
              <div className="text-[10px] text-gray-400 font-semibold px-2 py-1 uppercase border-b border-border">
                Quick Switch Demo Role
              </div>
              <button
                onClick={() => {
                  quickSwitchUser('media.manager@example.com');
                  setShowRoleMenu(false);
                }}
                className="w-full text-left p-2 hover:bg-gray-800 rounded font-medium text-blue-400"
              >
                Media Manager (Full Admin)
              </button>
              <button
                onClick={() => {
                  quickSwitchUser('technical.manager@example.com');
                  setShowRoleMenu(false);
                }}
                className="w-full text-left p-2 hover:bg-gray-800 rounded font-medium text-purple-400"
              >
                Tech Manager (Review & Equipment)
              </button>
              <button
                onClick={() => {
                  quickSwitchUser('staff1@example.com');
                  setShowRoleMenu(false);
                }}
                className="w-full text-left p-2 hover:bg-gray-800 rounded font-medium text-emerald-400"
              >
                Staff (Video Editor / Designer)
              </button>
            </div>
          )}
        </div>

        {/* Notifications Icon & Drawer */}
        <div className="relative">
          <button
            onClick={() => setShowNotifMenu(!showNotifMenu)}
            className="p-2 text-gray-400 hover:text-white relative rounded-lg hover:bg-gray-900 transition-colors"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-blue-600 text-white font-bold text-[9px] rounded-full flex items-center justify-center animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifMenu && (
            <div className="absolute right-0 mt-2 w-80 bg-card border border-border rounded-xl shadow-xl p-4 z-50 text-xs space-y-3">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <span className="font-bold text-white">System Notifications</span>
                {unreadCount > 0 && (
                  <button onClick={handleMarkAllRead} className="text-[10px] text-blue-400 hover:underline">
                    Mark All as Read
                  </button>
                )}
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="text-gray-500 text-center py-3">No notifications.</div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`p-2.5 rounded-lg border transition-colors ${
                        n.isRead ? 'bg-gray-950 border-gray-900 text-gray-400' : 'bg-blue-950/20 border-blue-800/40 text-gray-200'
                      }`}
                    >
                      <div className="font-bold text-white mb-0.5">{n.title}</div>
                      <p className="text-[11px] text-gray-300">{n.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Info Avatar & Logout */}
        <div className="flex items-center gap-2 pl-2 border-l border-border">
          <img
            src={user?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
            alt={user?.name || 'User'}
            className="w-8 h-8 rounded-full object-cover border border-gray-700"
          />
          <div className="hidden sm:block text-left">
            <div className="text-xs font-bold text-white leading-tight">{user?.name}</div>
            <div className="text-[10px] text-blue-400 font-mono font-semibold">{user?.role?.replace('_', ' ')}</div>
          </div>
          <button
            onClick={logout}
            className="p-1.5 text-gray-400 hover:text-red-400 rounded-lg hover:bg-gray-900 transition-colors ml-1"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
