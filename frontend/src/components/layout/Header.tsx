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
  Archive,
  Check,
  CheckCheck,
  ExternalLink,
  Filter,
  RotateCcw,
  Layers,
  Calendar,
  X,
  SlidersHorizontal,
  Keyboard,
  ArrowRight,
  Clock,
  CheckSquare,
  CheckCircle2,
  Camera,
  UserCheck,
  Megaphone,
  AlertTriangle,
  Settings,
  Info,
} from 'lucide-react';
import { AdvancedSearchModal } from './AdvancedSearchModal';
import { FavoritesQuickMenu } from './FavoritesQuickMenu';
import { PermissionsMatrixModal } from '../common/PermissionsMatrixModal';
import { NotificationDetailModal } from '../notifications/NotificationDetailModal';
import { useKeyboardShortcuts } from '@/lib/keyboard-shortcuts-context';
import {
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_PRIORITIES,
  NotificationCategoryCode,
  formatRelativeTime,
  getNotificationActionLabel,
  getNotificationNavigationUrl,
} from '@/utils/notificationCategories';

export function Header() {
  const { user, quickSwitchUser, logout } = useAuth();
  const { setShowHelpModal } = useKeyboardShortcuts();
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showPermissionsMatrix, setShowPermissionsMatrix] = useState(false);

  // Notifications
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showHoverPreview, setShowHoverPreview] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<any | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Search Bar
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Custom Keyboard Shortcut Listeners
  useEffect(() => {
    const handleToggleNotifications = () => {
      setShowHoverPreview((prev) => !prev);
    };
    const handleOpenAdvSearch = () => {
      setShowAdvancedSearch(true);
    };
    const handleCancel = () => {
      setSearchResults(null);
      setShowHoverPreview(false);
      setShowRoleMenu(false);
      setShowAdvancedSearch(false);
    };

    window.addEventListener('moms:toggle-notifications', handleToggleNotifications);
    window.addEventListener('moms:open-advanced-search', handleOpenAdvSearch);
    window.addEventListener('moms:cancel', handleCancel);

    return () => {
      window.removeEventListener('moms:toggle-notifications', handleToggleNotifications);
      window.removeEventListener('moms:open-advanced-search', handleOpenAdvSearch);
      window.removeEventListener('moms:cancel', handleCancel);
    };
  }, []);

  // Global Search Debounced Query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetchApi(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
        setSearchResults(res?.results || null);
      } catch (err) {
        console.error('Global search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Click Outside to Dismiss Search Popover
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSearchResults(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadNotifications = async () => {
    try {
      const res = await fetchApi('/notifications?take=20');
      setNotifications(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  };

  useEffect(() => {
    if (user) {
      loadNotifications();
    }
  }, [user]);

  // Global update sync
  useEffect(() => {
    const handleUpdate = () => {
      loadNotifications();
    };
    window.addEventListener('moms:notifications-updated', handleUpdate);
    return () => window.removeEventListener('moms:notifications-updated', handleUpdate);
  }, []);

  const unreadCount = notifications.filter((n) => n.status === 'UNREAD' || !n.isRead).length;

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setShowHoverPreview(true);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setShowHoverPreview(false);
    }, 180);
  };

  const handleMarkSingleRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: 'READ', isRead: true } : item))
    );
    try {
      await fetchApi(`/notifications/${id}/read`, { method: 'PATCH' });
      window.dispatchEvent(new CustomEvent('moms:notifications-updated'));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    setNotifications((prev) =>
      prev.map((item) => ({ ...item, status: 'READ', isRead: true }))
    );
    try {
      await fetchApi('/notifications/read-all', { method: 'PATCH' });
      window.dispatchEvent(new CustomEvent('moms:notifications-updated'));
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const getCategoryIcon = (catCode: string) => {
    switch (catCode) {
      case 'TASK_ASSIGNMENT':
        return <CheckSquare className="w-3.5 h-3.5 text-cyan-600" />;
      case 'APPROVAL_REQUEST':
      case 'APPROVAL_COMPLETED':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />;
      case 'REVISION_REQUEST':
        return <RotateCcw className="w-3.5 h-3.5 text-amber-600" />;
      case 'DEADLINE_REMINDER':
        return <Calendar className="w-3.5 h-3.5 text-rose-600" />;
      case 'EQUIPMENT_REQUEST':
      case 'EQUIPMENT_APPROVAL':
      case 'EQUIPMENT_RETURN_REMINDER':
        return <Camera className="w-3.5 h-3.5 text-teal-600" />;
      case 'ATTENDANCE_REMINDER':
        return <UserCheck className="w-3.5 h-3.5 text-amber-600" />;
      case 'ANNOUNCEMENT':
        return <Megaphone className="w-3.5 h-3.5 text-purple-600" />;
      case 'WARNING':
        return <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />;
      case 'SYSTEM_NOTIFICATION':
        return <Settings className="w-3.5 h-3.5 text-slate-600" />;
      default:
        return <Info className="w-3.5 h-3.5 text-blue-600" />;
    }
  };

  const roleLabel = user?.role === 'MEDIA_MANAGER'
    ? 'Media Manager'
    : user?.role === 'TECHNICAL_MANAGER'
    ? 'Tech Manager'
    : user?.role === 'SOCIAL_MEDIA_MANAGER'
    ? 'Social Media Manager'
    : user?.role === 'MARKETING_MANAGER'
    ? 'Marketing Manager'
    : user?.role === 'ADMINISTRATOR'
    ? 'Administrator'
    : user?.role ? user.role.replace(/_/g, ' ') : 'Staff Member';

  const roleBadgeColor = user?.role === 'MEDIA_MANAGER'
    ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
    : user?.role === 'TECHNICAL_MANAGER'
    ? 'bg-purple-500/20 text-purple-400 border-purple-500/30'
    : user?.role === 'SOCIAL_MEDIA_MANAGER'
    ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
    : user?.role === 'MARKETING_MANAGER'
    ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
    : user?.role === 'ADMINISTRATOR'
    ? 'bg-red-500/20 text-red-400 border-red-500/30'
    : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-40">
      {/* Left: Global Search Input + Advanced Search Button */}
      <div className="flex items-center gap-2">
        <div className="relative w-64 md:w-80" ref={searchRef}>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              id="global-search-input"
              type="text"
              placeholder="Global Search (Projects, Scripts, Tasks, Equipment)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-100 border border-slate-200 rounded-lg pl-9 pr-16 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 transition-colors"
            />
            {isSearching ? (
              <div className="absolute right-3 top-3 w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            ) : searchQuery ? (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSearchResults(null);
                }}
                className="absolute right-2.5 top-2.5 p-0.5 text-slate-400 hover:text-slate-700 rounded transition-colors"
                title="Clear search (Esc)"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <div className="absolute right-2.5 top-2.5 pointer-events-none hidden sm:flex items-center">
                <kbd className="px-1.5 py-0.5 text-[9px] font-mono bg-slate-200 border border-slate-300 text-slate-600 rounded">
                  Ctrl+K
                </kbd>
              </div>
            )}
          </div>

          {/* Global Search Results Dropdown */}
          {(searchResults || isSearching) && (
            <div className="absolute top-11 left-0 w-[480px] md:w-[600px] bg-white border border-slate-200 rounded-xl shadow-2xl p-3.5 z-50 max-h-[480px] overflow-y-auto text-xs space-y-4">
            {isSearching ? (
              <div className="p-6 text-center text-slate-500">
                <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <span className="text-xs">Searching across authorized modules & records...</span>
              </div>
            ) : !searchResults || Object.keys(searchResults).every((key) => searchResults[key]?.length === 0) ? (
              <div className="text-slate-500 p-6 text-center space-y-1">
                <p className="font-semibold text-slate-700">No authorized records match "{searchQuery}"</p>
                <p className="text-[10px] text-slate-400">Only records permitted for your active role are displayed.</p>
              </div>
            ) : (
              Object.keys(searchResults).map((category) => {
                const items = searchResults[category];
                if (!items || items.length === 0) return null;
                return (
                  <div key={category} className="space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase px-2 pb-1 border-b border-slate-100">
                      <span className="flex items-center gap-1.5">
                        <Layers className="w-3 h-3 text-blue-600" />
                        {category}
                      </span>
                      <span className="text-slate-600 font-mono bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                        {items.length} {items.length === 1 ? 'match' : 'matches'}
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {items.map((item: any) => {
                        const updatedStr = item.lastUpdatedDate
                          ? new Date(item.lastUpdatedDate).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          : 'Recent';

                        return (
                          <Link
                            key={item.id}
                            href={item.url}
                            onClick={() => setSearchResults(null)}
                            className="block p-2.5 bg-slate-50 hover:bg-blue-50/60 border border-slate-200 hover:border-blue-300 rounded-lg text-slate-800 transition-all group"
                          >
                            {/* Top Row: Entity Type, Name & Status */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                                  {item.entityType || category}
                                </span>
                                <span className="font-semibold text-slate-900 text-xs truncate group-hover:text-blue-600 transition-colors">
                                  {item.name || item.title}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                {item.status && (
                                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700">
                                    {item.status}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Middle & Bottom Meta Row: Internal ID, Related Client, Related Brand, Last Updated */}
                            <div className="mt-1.5 pt-1 border-t border-slate-200/60 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-500">
                              {/* Internal ID */}
                              <div className="flex items-center gap-1">
                                <span className="text-slate-400">ID:</span>
                                <span className="font-mono text-slate-700 font-medium">
                                  {item.internalId || item.code || item.id}
                                </span>
                              </div>

                              {/* Related Client */}
                              {item.relatedClient && item.relatedClient !== '—' && (
                                <div className="flex items-center gap-1">
                                  <span className="text-slate-400">Client:</span>
                                  <span className="text-slate-700">{item.relatedClient}</span>
                                </div>
                              )}

                              {/* Related Brand */}
                              {item.relatedBrand && item.relatedBrand !== '—' && (
                                <div className="flex items-center gap-1">
                                  <span className="text-slate-400">Brand:</span>
                                  <span className="text-slate-700">{item.relatedBrand}</span>
                                </div>
                              )}

                              {/* Last Updated Date */}
                              <div className="flex items-center gap-1 ml-auto text-[9px] text-slate-400">
                                <span>Updated:</span>
                                <span className="font-mono text-slate-600">{updatedStr}</span>
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
        </div>

        {/* Advanced Multi-Condition Search Button (Icon Only) */}
        <button
          onClick={() => setShowAdvancedSearch(true)}
          className="p-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 hover:border-blue-300 rounded-lg text-slate-600 hover:text-blue-600 transition-colors flex items-center justify-center shadow-xs"
          title="Advanced Search"
        >
          <SlidersHorizontal className="w-4 h-4 text-blue-600" />
        </button>
      </div>

      {/* Advanced Multi-Condition Search Modal */}
      <AdvancedSearchModal
        isOpen={showAdvancedSearch}
        onClose={() => setShowAdvancedSearch(false)}
      />

      {/* Right: Notifications & Profile */}
      <div className="flex items-center gap-3">

        {/* Permissions Matrix Modal */}
        <PermissionsMatrixModal
          isOpen={showPermissionsMatrix}
          onClose={() => setShowPermissionsMatrix(false)}
        />

        {/* User-Specific Favorites Quick Access Menu */}
        <FavoritesQuickMenu />

        {/* Keyboard Shortcuts Cheat Sheet Button */}
        <button
          type="button"
          onClick={() => setShowHelpModal(true)}
          className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-transparent hover:border-slate-200"
          title="Keyboard Shortcuts Cheat Sheet (?)"
        >
          <Keyboard className="w-4 h-4" />
        </button>

        {/* Notifications Icon with Hover Preview Popover */}
        <div
          className="relative"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <Link
            href="/notifications"
            onClick={() => setShowHoverPreview(false)}
            className="p-2 text-slate-500 hover:text-slate-900 relative rounded-xl hover:bg-slate-100 transition-colors flex items-center justify-center"
            aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 bg-blue-600 text-white font-black text-[9px] rounded-full flex items-center justify-center shadow-xs animate-pulse">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Link>

          {/* Hover Notification Preview Dropdown */}
          {showHoverPreview && (
            <div
              className="absolute right-0 top-full mt-1 w-80 sm:w-96 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 text-xs overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150"
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              {/* Header */}
              <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-slate-900 text-sm">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">
                      {unreadCount} Unread
                    </span>
                  )}
                </div>

                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    className="text-[11px] text-blue-600 hover:text-blue-700 font-bold hover:underline"
                  >
                    Mark all as read
                  </button>
                )}
              </div>

              {/* Recent Notifications List (Top 6) */}
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 space-y-1">
                    <p className="font-semibold text-slate-700 text-xs">No notifications</p>
                    <p className="text-[11px]">You're all caught up!</p>
                  </div>
                ) : (
                  notifications.slice(0, 6).map((n) => {
                    const catCode = (n.category || 'INFORMATION') as NotificationCategoryCode;
                    const isUnread = n.status === 'UNREAD' || !n.isRead;
                    const relativeTime = formatRelativeTime(n.createdAt);

                    return (
                      <div
                        key={n.id}
                        onClick={() => {
                          setSelectedNotification(n);
                          if (isUnread) {
                            handleMarkSingleRead(n.id);
                          }
                          setShowHoverPreview(false);
                        }}
                        className={`p-3 transition-colors cursor-pointer flex items-start gap-3 hover:bg-slate-50 ${
                          isUnread ? 'bg-blue-50/40' : 'bg-white'
                        }`}
                      >
                        <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 shrink-0 mt-0.5">
                          {getCategoryIcon(catCode)}
                        </div>

                        <div className="space-y-0.5 min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <h5 className={`text-xs truncate ${isUnread ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
                              {n.title}
                            </h5>
                            {isUnread && (
                              <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                            )}
                          </div>

                          <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                            {n.message}
                          </p>

                          <div className="flex items-center gap-2 pt-0.5 text-[10px] text-slate-400">
                            <span className="flex items-center gap-1 font-medium">
                              <Clock className="w-2.5 h-2.5" />
                              {relativeTime}
                            </span>
                            {n.entityCode && (
                              <span className="font-mono text-[9px] bg-slate-100 text-slate-600 px-1 rounded border border-slate-200">
                                {n.entityCode}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Dropdown Footer Link to /notifications */}
              <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <Link
                  href="/notifications"
                  onClick={() => setShowHoverPreview(false)}
                  className="text-xs text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1 group w-full justify-between"
                >
                  <span>View all notifications</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Detailed Notification Modal */}
        <NotificationDetailModal
          notification={selectedNotification}
          isOpen={Boolean(selectedNotification)}
          onClose={() => setSelectedNotification(null)}
          onMarkRead={handleMarkSingleRead}
        />

        {/* User Info Avatar & Logout */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          <img
            src={user?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
            alt={user?.name || 'User'}
            className="w-8 h-8 rounded-full object-cover border border-slate-200"
          />
          <div className="hidden sm:block text-left">
            <div className="text-xs font-bold text-slate-900 leading-tight">{user?.name}</div>
            <div className="text-[10px] text-blue-600 font-mono font-semibold">{user?.role?.replace('_', ' ')}</div>
          </div>
          <button
            onClick={logout}
            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors ml-1"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
