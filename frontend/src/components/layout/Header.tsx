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
} from 'lucide-react';
import { AdvancedSearchModal } from './AdvancedSearchModal';
import { FavoritesQuickMenu } from './FavoritesQuickMenu';
import { PermissionsMatrixModal } from '../common/PermissionsMatrixModal';
import { useKeyboardShortcuts } from '@/lib/keyboard-shortcuts-context';
import {
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_PRIORITIES,
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
  const [showNotifMenu, setShowNotifMenu] = useState(false);

  // Search Bar
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Custom Keyboard Shortcut Listeners
  useEffect(() => {
    const handleToggleNotifications = () => {
      setShowNotifMenu((prev) => !prev);
    };
    const handleOpenAdvSearch = () => {
      setShowAdvancedSearch(true);
    };
    const handleCancel = () => {
      setSearchResults(null);
      setShowNotifMenu(false);
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

  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UNREAD' | 'READ' | 'ARCHIVED'>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [moduleFilter, setModuleFilter] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);

  const loadNotifications = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (priorityFilter !== 'ALL') params.append('priority', priorityFilter);
      if (typeFilter !== 'ALL') params.append('category', typeFilter);
      if (moduleFilter !== 'ALL') params.append('entityType', moduleFilter);
      if (dateFilter) params.append('date', dateFilter);

      const res = await fetchApi(`/notifications?${params.toString()}`);
      setNotifications(res || []);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  };

  useEffect(() => {
    if (user) {
      loadNotifications();
    }
  }, [user, statusFilter, priorityFilter, typeFilter, moduleFilter, dateFilter]);

  const handleResetNotifFilters = () => {
    setStatusFilter('ALL');
    setPriorityFilter('ALL');
    setTypeFilter('ALL');
    setModuleFilter('ALL');
    setDateFilter('');
  };

  const hasActiveFilters =
    statusFilter !== 'ALL' ||
    priorityFilter !== 'ALL' ||
    typeFilter !== 'ALL' ||
    moduleFilter !== 'ALL' ||
    dateFilter !== '';

  const unreadCount = notifications.filter((n) => n.status === 'UNREAD' || !n.isRead).length;

  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((item) => ({ ...item, status: 'READ', isRead: true })));
    try {
      await fetchApi('/notifications/read-all', { method: 'PATCH' });
      loadNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const handleArchiveAllRead = async () => {
    try {
      await fetchApi('/notifications/archive-all', { method: 'PATCH' });
      loadNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const handleNotificationItemClick = async (n: any) => {
    setShowNotifMenu(false);
    if (n.status === 'UNREAD' || !n.isRead) {
      setNotifications((prev) =>
        prev.map((item) => (item.id === n.id ? { ...item, status: 'READ', isRead: true } : item))
      );
      try {
        await fetchApi(`/notifications/${n.id}/read`, { method: 'PATCH' });
      } catch (err) {
        console.error('Failed to mark notification as read:', err);
      }
    }
  };

  const handleMarkSingleRead = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setNotifications((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: 'READ', isRead: true } : item))
    );
    try {
      await fetchApi(`/notifications/${id}/read`, { method: 'PATCH' });
      loadNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const handleArchiveSingle = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await fetchApi(`/notifications/${id}/archive`, { method: 'PATCH' });
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
      {/* Left: Global Search Input + Advanced Search Button */}
      <div className="flex items-center gap-2">
        <div className="relative w-64 md:w-80" ref={searchRef}>
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
            <input
              id="global-search-input"
              type="text"
              placeholder="Global Search (Projects, Scripts, Tasks, Equipment)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-900 border border-gray-800 rounded-lg pl-9 pr-16 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
            {isSearching ? (
              <div className="absolute right-3 top-3 w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            ) : searchQuery ? (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSearchResults(null);
                }}
                className="absolute right-2.5 top-2.5 p-0.5 text-gray-400 hover:text-white rounded transition-colors"
                title="Clear search (Esc)"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <div className="absolute right-2.5 top-2.5 pointer-events-none hidden sm:flex items-center">
                <kbd className="px-1.5 py-0.5 text-[9px] font-mono bg-gray-800 border border-gray-700 text-gray-400 rounded">
                  Ctrl+K
                </kbd>
              </div>
            )}
          </div>

          {/* Global Search Results Dropdown */}
          {(searchResults || isSearching) && (
            <div className="absolute top-11 left-0 w-[480px] md:w-[600px] bg-card border border-border rounded-xl shadow-2xl p-3.5 z-50 max-h-[480px] overflow-y-auto text-xs space-y-4">
            {isSearching ? (
              <div className="p-6 text-center text-gray-400">
                <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <span className="text-xs">Searching across authorized modules & records...</span>
              </div>
            ) : !searchResults || Object.keys(searchResults).every((key) => searchResults[key]?.length === 0) ? (
              <div className="text-gray-400 p-6 text-center space-y-1">
                <p className="font-semibold text-gray-200">No authorized records match "{searchQuery}"</p>
                <p className="text-[10px] text-gray-500">Only records permitted for your active role are displayed.</p>
              </div>
            ) : (
              Object.keys(searchResults).map((category) => {
                const items = searchResults[category];
                if (!items || items.length === 0) return null;
                return (
                  <div key={category} className="space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-bold text-gray-400 uppercase px-2 pb-1 border-b border-border/50">
                      <span className="flex items-center gap-1.5">
                        <Layers className="w-3 h-3 text-blue-400" />
                        {category}
                      </span>
                      <span className="text-gray-500 font-mono bg-gray-900 px-1.5 py-0.2 rounded border border-gray-800">
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
                            className="block p-2.5 bg-gray-900/60 hover:bg-gray-900 border border-gray-800/80 hover:border-blue-500/40 rounded-lg text-gray-200 transition-all group"
                          >
                            {/* Top Row: Entity Type, Name & Status */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
                                  {item.entityType || category}
                                </span>
                                <span className="font-semibold text-white text-xs truncate group-hover:text-blue-400 transition-colors">
                                  {item.name || item.title}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                {item.status && (
                                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-gray-800 border border-gray-700 text-gray-300">
                                    {item.status}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Middle & Bottom Meta Row: Internal ID, Related Client, Related Brand, Last Updated */}
                            <div className="mt-1.5 pt-1 border-t border-gray-800/40 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-gray-400">
                              {/* Internal ID */}
                              <div className="flex items-center gap-1">
                                <span className="text-gray-500">ID:</span>
                                <span className="font-mono text-gray-300 font-medium">
                                  {item.internalId || item.code || item.id}
                                </span>
                              </div>

                              {/* Related Client */}
                              {item.relatedClient && item.relatedClient !== '—' && (
                                <div className="flex items-center gap-1">
                                  <span className="text-gray-500">Client:</span>
                                  <span className="text-gray-300">{item.relatedClient}</span>
                                </div>
                              )}

                              {/* Related Brand */}
                              {item.relatedBrand && item.relatedBrand !== '—' && (
                                <div className="flex items-center gap-1">
                                  <span className="text-gray-500">Brand:</span>
                                  <span className="text-gray-300">{item.relatedBrand}</span>
                                </div>
                              )}

                              {/* Last Updated Date */}
                              <div className="flex items-center gap-1 ml-auto text-[9px] text-gray-500">
                                <span>Updated:</span>
                                <span className="font-mono text-gray-400">{updatedStr}</span>
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

        {/* Advanced Multi-Condition Search Button */}
        <button
          onClick={() => setShowAdvancedSearch(true)}
          className="p-2 bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-blue-500/40 rounded-lg text-gray-400 hover:text-blue-400 transition-colors flex items-center gap-1.5 text-xs shadow-sm"
          title="Open Advanced Multi-Condition Search"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-blue-400" />
          <span className="hidden lg:inline text-[11px] font-medium text-gray-300">Advanced Search</span>
        </button>
      </div>

      {/* Advanced Multi-Condition Search Modal */}
      <AdvancedSearchModal
        isOpen={showAdvancedSearch}
        onClose={() => setShowAdvancedSearch(false)}
      />

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

              <div className="pt-1.5 border-t border-border mt-1">
                <button
                  onClick={() => {
                    setShowPermissionsMatrix(true);
                    setShowRoleMenu(false);
                  }}
                  className="w-full text-left p-2 hover:bg-purple-950/60 rounded font-semibold text-purple-300 flex items-center gap-1.5"
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>View Permissions Matrix (9 Types)</span>
                </button>
              </div>
            </div>
          )}
        </div>

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
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors border border-transparent hover:border-gray-700"
          title="Keyboard Shortcuts Cheat Sheet (?)"
        >
          <Keyboard className="w-4 h-4" />
        </button>

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
            <div className="absolute right-0 mt-2 w-96 bg-card border border-border rounded-2xl shadow-2xl p-4 z-50 text-xs space-y-3">
              {/* Header with Title & Bulk Actions */}
              <div className="flex items-center justify-between border-b border-border pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-sm">Notifications</span>
                  <span className="text-[10px] font-mono bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full font-bold">
                    {unreadCount} Unread
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-[10px] text-blue-400 hover:text-blue-300 font-bold hover:underline"
                      title="Mark all unread as read"
                    >
                      Read All
                    </button>
                  )}
                  {statusFilter !== 'ARCHIVED' && (
                    <button
                      onClick={handleArchiveAllRead}
                      className="text-[10px] text-gray-400 hover:text-gray-200 font-bold hover:underline"
                      title="Archive all read notifications"
                    >
                      Archive Read
                    </button>
                  )}
                </div>
              </div>

              {/* Status Tabs: Unread, Read, All, Archived & Filter Drawer Toggle */}
              <div className="space-y-2">
                <div className="flex items-center gap-1 p-1 bg-gray-950/80 rounded-lg border border-gray-800 text-[11px]">
                  <button
                    onClick={() => setStatusFilter('ALL')}
                    className={`flex-1 py-1 px-1.5 rounded-md font-bold transition-all text-center ${
                      statusFilter === 'ALL'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setStatusFilter('UNREAD')}
                    className={`flex-1 py-1 px-1.5 rounded-md font-bold transition-all text-center ${
                      statusFilter === 'UNREAD'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    Unread ({unreadCount})
                  </button>
                  <button
                    onClick={() => setStatusFilter('READ')}
                    className={`flex-1 py-1 px-1.5 rounded-md font-bold transition-all text-center ${
                      statusFilter === 'READ'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    Read
                  </button>
                  <button
                    onClick={() => setStatusFilter('ARCHIVED')}
                    className={`flex-1 py-1 px-1.5 rounded-md font-bold transition-all text-center ${
                      statusFilter === 'ARCHIVED'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    Archived
                  </button>
                  <button
                    onClick={() => setShowFilterDrawer(!showFilterDrawer)}
                    className={`p-1 rounded-md transition-colors ${
                      showFilterDrawer || hasActiveFilters
                        ? 'bg-purple-600 text-white'
                        : 'text-gray-400 hover:text-white bg-gray-900'
                    }`}
                    title="Toggle Advanced Filters"
                  >
                    <Filter className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Collapsible 6-Dimensional Filter Controls */}
                {showFilterDrawer && (
                  <div className="p-2.5 bg-gray-950 rounded-xl border border-gray-800 space-y-2 text-[10px]">
                    <div className="grid grid-cols-2 gap-2">
                      {/* Priority Filter */}
                      <div className="space-y-0.5">
                        <span className="text-gray-400 font-semibold uppercase">Priority:</span>
                        <select
                          value={priorityFilter}
                          onChange={(e) => setPriorityFilter(e.target.value)}
                          className="w-full bg-gray-900 border border-gray-800 rounded px-1.5 py-1 text-gray-200 focus:outline-none focus:border-blue-500"
                        >
                          <option value="ALL">All Priorities</option>
                          <option value="CRITICAL">Critical</option>
                          <option value="HIGH">High</option>
                          <option value="MEDIUM">Medium</option>
                          <option value="LOW">Low</option>
                        </select>
                      </div>

                      {/* Related Module Filter */}
                      <div className="space-y-0.5">
                        <span className="text-gray-400 font-semibold uppercase">Related Module:</span>
                        <select
                          value={moduleFilter}
                          onChange={(e) => setModuleFilter(e.target.value)}
                          className="w-full bg-gray-900 border border-gray-800 rounded px-1.5 py-1 text-gray-200 focus:outline-none focus:border-blue-500"
                        >
                          <option value="ALL">All Modules</option>
                          <option value="PROJECT">Projects</option>
                          <option value="TASK">Tasks</option>
                          <option value="SCRIPT">Scripts</option>
                          <option value="GRAPHIC_REQUIREMENT">Graphic Reqs</option>
                          <option value="EQUIPMENT">Equipment</option>
                          <option value="CALENDAR_EVENT">Media Calendar</option>
                          <option value="APPROVAL">Approvals</option>
                          <option value="COMMUNICATION">Communication</option>
                          <option value="SYSTEM">System Alerts</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {/* Notification Type Filter */}
                      <div className="space-y-0.5">
                        <span className="text-gray-400 font-semibold uppercase">Notification Type:</span>
                        <select
                          value={typeFilter}
                          onChange={(e) => setTypeFilter(e.target.value)}
                          className="w-full bg-gray-900 border border-gray-800 rounded px-1.5 py-1 text-gray-200 focus:outline-none focus:border-blue-500"
                        >
                          <option value="ALL">All Types</option>
                          <option value="INFORMATION">Information</option>
                          <option value="TASK_ASSIGNMENT">Task Assignment</option>
                          <option value="REMINDER">Reminder</option>
                          <option value="APPROVAL_REQUEST">Approval Request</option>
                          <option value="APPROVAL_COMPLETED">Approval Completed</option>
                          <option value="REVISION_REQUEST">Revision Request</option>
                          <option value="DEADLINE_REMINDER">Deadline Reminder</option>
                          <option value="EQUIPMENT_REQUEST">Equipment Request</option>
                          <option value="EQUIPMENT_APPROVAL">Equipment Approval</option>
                          <option value="EQUIPMENT_RETURN_REMINDER">Equipment Return Due</option>
                          <option value="ATTENDANCE_REMINDER">Attendance Reminder</option>
                          <option value="ANNOUNCEMENT">Announcement</option>
                          <option value="WARNING">Warning</option>
                          <option value="SYSTEM_NOTIFICATION">System Notification</option>
                        </select>
                      </div>

                      {/* Date Filter */}
                      <div className="space-y-0.5">
                        <span className="text-gray-400 font-semibold uppercase">Date:</span>
                        <input
                          type="date"
                          value={dateFilter}
                          onChange={(e) => setDateFilter(e.target.value)}
                          className="w-full bg-gray-900 border border-gray-800 rounded px-1.5 py-1 text-gray-200 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>

                    {hasActiveFilters && (
                      <div className="flex justify-end pt-1">
                        <button
                          onClick={handleResetNotifFilters}
                          className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 font-semibold"
                        >
                          <RotateCcw className="w-3 h-3" /> Reset Filters
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Notifications Feed */}
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {notifications.length === 0 ? (
                  <div className="text-gray-500 text-center py-6 italic">
                    {hasActiveFilters
                      ? 'No notifications match the active filter criteria.'
                      : (statusFilter as string) === 'ARCHIVED'
                      ? 'No archived notifications.'
                      : (statusFilter as string) === 'UNREAD'
                      ? 'All caught up! No unread notifications.'
                      : (statusFilter as string) === 'READ'
                      ? 'No read notifications.'
                      : 'No notifications.'}
                  </div>
                ) : (
                  notifications.map((n) => {
                    const catCode = (n.category || 'INFORMATION') as keyof typeof NOTIFICATION_CATEGORIES;
                    const catMeta = NOTIFICATION_CATEGORIES[catCode] || NOTIFICATION_CATEGORIES.INFORMATION;

                    const priorityCode = (n.priority || 'MEDIUM').toUpperCase() as keyof typeof NOTIFICATION_PRIORITIES;
                    const prioMeta = NOTIFICATION_PRIORITIES[priorityCode] || NOTIFICATION_PRIORITIES.MEDIUM;

                    const isCritical = priorityCode === 'CRITICAL';
                    const isHigh = priorityCode === 'HIGH';
                    const isArchived = n.status === 'ARCHIVED';
                    const isUnread = n.status === 'UNREAD' || !n.isRead;

                    return (
                      <div
                        key={n.id}
                        className={`p-3 rounded-xl border transition-all space-y-1.5 ${
                          isArchived
                            ? 'bg-gray-950/40 border-gray-850 opacity-75'
                            : !isUnread
                            ? 'bg-gray-950/60 border-gray-800 text-gray-400'
                            : isCritical
                            ? 'bg-red-950/30 border-red-600/80 shadow-lg shadow-red-950/40 ring-1 ring-red-500/40'
                            : isHigh
                            ? 'bg-amber-950/20 border-amber-500/50 text-gray-200'
                            : 'bg-gray-900 border-gray-700 text-gray-200 shadow-sm'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1.5 flex-wrap">
                          <Link
                            href={getNotificationNavigationUrl(n.linkUrl, n.entityType, n.entityId, n.eventType)}
                            onClick={() => handleNotificationItemClick(n)}
                            className="font-bold text-white text-xs truncate flex items-center gap-1.5 hover:underline flex-1 min-w-[150px]"
                          >
                            {isUnread && (
                              <span
                                className={`w-2 h-2 rounded-full shrink-0 animate-pulse ${
                                  isCritical ? 'bg-red-500 ring-2 ring-red-400' : isHigh ? 'bg-amber-400' : 'bg-blue-400'
                                }`}
                              />
                            )}
                            <span className={`truncate ${isCritical ? 'text-red-200 font-black' : isHigh ? 'text-amber-200 font-bold' : ''}`}>
                              {n.title}
                            </span>
                          </Link>

                          <div className="flex items-center gap-1 shrink-0">
                            {/* Priority Badge */}
                            <span className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded border ${prioMeta.badgeClass}`}>
                              {isCritical && '🚨 '}{isHigh && '⚡ '}{prioMeta.label}
                            </span>

                            {/* Category Badge */}
                            <span
                              className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${catMeta.badgeClass}`}
                            >
                              {catMeta.label}
                            </span>

                            {/* Originating Entity Code */}
                            {n.entityCode && (
                              <span className="text-[9px] font-mono font-bold bg-gray-800 text-gray-300 border border-gray-700 px-1.5 py-0.5 rounded">
                                {n.entityCode}
                              </span>
                            )}
                          </div>
                        </div>

                        <p className={`text-[11px] line-clamp-2 leading-relaxed ${isCritical ? 'text-red-100 font-medium' : isHigh ? 'text-amber-100/90' : 'text-gray-300'}`}>
                          {n.message}
                        </p>

                        {/* Direct Operational Shortcut Button */}
                        <div className="pt-0.5">
                          <Link
                            href={getNotificationNavigationUrl(n.linkUrl, n.entityType, n.entityId, n.eventType)}
                            onClick={() => handleNotificationItemClick(n)}
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 px-2 py-0.5 rounded transition-colors group"
                          >
                            <span>{getNotificationActionLabel(n.entityType, n.eventType, n.category)}</span>
                            <ExternalLink className="w-2.5 h-2.5 group-hover:translate-x-0.5 transition-transform" />
                          </Link>
                        </div>

                        {/* Audit Trail & Action Footer */}
                        <div className="flex items-center justify-between text-[9px] text-gray-500 pt-1.5 border-t border-gray-800/80">
                          <div className="flex items-center gap-2 text-gray-400 flex-wrap">
                            <span title={`Delivered: ${new Date(n.deliveredAt || n.createdAt).toLocaleString()}`}>
                              Delivered: {new Date(n.deliveredAt || n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {n.readAt && (
                              <span className="text-blue-400/90" title={`Read at: ${new Date(n.readAt).toLocaleString()}`}>
                                • Read by {n.readBy?.name || 'You'}
                              </span>
                            )}
                            {isArchived && (
                              <span className="text-purple-400 font-bold">
                                • Archived
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1">
                            {isUnread && (
                              <button
                                onClick={(e) => handleMarkSingleRead(n.id, e)}
                                className="p-1 text-gray-400 hover:text-blue-400 rounded hover:bg-gray-800 transition-colors"
                                title="Mark as Read"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                            )}
                            {!isArchived && (
                              <button
                                onClick={(e) => handleArchiveSingle(n.id, e)}
                                className="p-1 text-gray-400 hover:text-purple-400 rounded hover:bg-gray-800 transition-colors"
                                title="Archive (Permanent Retention)"
                              >
                                <Archive className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Drawer Footer Link to Activity Center */}
              <div className="pt-2 border-t border-border flex items-center justify-between text-[11px]">
                <Link
                  href="/activity"
                  onClick={() => setShowNotifMenu(false)}
                  className="text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
                >
                  <span>Open Full Activity Center</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
                <span className="text-[10px] text-gray-500 font-mono">Permanent Retention</span>
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
