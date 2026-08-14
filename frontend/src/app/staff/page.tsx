'use client';

import React, { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import {
  Users,
  ShieldCheck,
  Lock,
  Plus,
  UserCheck,
  UserX,
  Archive,
  Edit,
  Search,
  Building2,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  SlidersHorizontal,
  X,
  BadgeCheck,
  UserPlus,
  Calendar,
  Phone,
  Mail,
  FileText,
  Briefcase,
  Layers,
  Award,
  Clock,
  Target,
  Eye,
  EyeOff,
} from 'lucide-react';

export default function StaffPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPrivatePhones, setShowPrivatePhones] = useState<Record<string, boolean>>({});

  // 6 Mandatory Filter Controls
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [designationFilter, setDesignationFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [skillFilter, setSkillFilter] = useState('ALL');
  const [attendanceFilter, setAttendanceFilter] = useState('ALL');
  const [availabilityFilter, setAvailabilityFilter] = useState('ALL');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [showArchived, setShowArchived] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Capabilities
  const [capabilitiesList, setCapabilitiesList] = useState<any[]>([]);
  const [newCapabilityName, setNewCapabilityName] = useState('');

  // Register Modal
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [registerForm, setRegisterForm] = useState({
    name: '',
    email: '',
    password: '',
    employeeCode: '',
    role: 'STAFF',
    designation: 'Operations Staff',
    departmentId: '',
    additionalDepartments: '',
    joiningDate: new Date().toISOString().split('T')[0],
    employmentStatus: 'ACTIVE',
    phone: '',
    avatarUrl: '',
    dailyCapacityHours: '8.0',
    dailyTarget: '1.0',
    weeklyTarget: '5.0',
    monthlyTarget: '20.0',
    internalNotes: '',
    skills: [] as string[],
  });
  const [submittingRegister, setSubmittingRegister] = useState(false);

  // Edit Modal
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    employeeCode: '',
    role: 'STAFF',
    designation: '',
    departmentId: '',
    additionalDepartments: '',
    joiningDate: '',
    employmentStatus: 'ACTIVE',
    phone: '',
    avatarUrl: '',
    dailyCapacityHours: '8.0',
    dailyTarget: '1.0',
    weeklyTarget: '5.0',
    monthlyTarget: '20.0',
    internalNotes: '',
    skills: [] as string[],
  });
  const [submittingEdit, setSubmittingEdit] = useState(false);

  const isMediaManager = user?.role === 'MEDIA_MANAGER';

  const loadData = async () => {
    try {
      let url = '/users?includeArchived=true';
      const [userData, deptData, capData] = await Promise.all([
        fetchApi(url),
        fetchApi('/users/departments').catch(() => []),
        fetchApi('/users/capabilities').catch(() => []),
      ]);
      setUsers(Array.isArray(userData) ? userData : []);
      setDepartments(Array.isArray(deptData) ? deptData : []);
      setCapabilitiesList(Array.isArray(capData) ? capData : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const togglePhoneVisibility = (id: string) => {
    setShowPrivatePhones((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleRegisterEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerForm.name || !registerForm.email || !registerForm.password) {
      alert('Full Name, Email Address, and Password are required.');
      return;
    }
    setSubmittingRegister(true);
    try {
      await fetchApi('/users', {
        method: 'POST',
        body: JSON.stringify(registerForm),
      });
      alert(`Employee record for "${registerForm.name}" created successfully!`);
      setShowRegisterModal(false);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to register employee');
    } finally {
      setSubmittingRegister(false);
    }
  };

  const handleEditEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setSubmittingEdit(true);
    try {
      await fetchApi(`/users/${editingUser.id}`, {
        method: 'PATCH',
        body: JSON.stringify(editForm),
      });
      alert(`Employee record for "${editForm.name}" updated successfully!`);
      setEditingUser(null);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update employee record');
    } finally {
      setSubmittingEdit(false);
    }
  };

  const handleActivate = async (id: string, name: string) => {
    try {
      await fetchApi(`/users/${id}/activate`, { method: 'POST' });
      alert(`Employee record for "${name}" has been activated.`);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to activate employee');
    }
  };

  const handleDeactivate = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to deactivate account for ${name}? The employee will be unable to log in or receive task assignments.`)) return;
    try {
      await fetchApi(`/users/${id}/deactivate`, { method: 'POST' });
      alert(`Employee record for "${name}" has been deactivated.`);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to deactivate employee');
    }
  };

  const handleSuspend = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to suspend ${name}? Suspended employees cannot receive task assignments.`)) return;
    try {
      await fetchApi(`/users/${id}/suspend`, { method: 'POST' });
      alert(`Employee record for "${name}" has been suspended.`);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to suspend employee');
    }
  };

  const handleArchive = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to archive record for ${name}? The record will be permanently retained in history.`)) return;
    try {
      await fetchApi(`/users/${id}/archive`, { method: 'POST' });
      alert(`Employee record for "${name}" has been archived.`);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to archive employee record');
    }
  };

  const openEditModal = (targetUser: any) => {
    setEditingUser(targetUser);
    const prof = targetUser.employeeProfile;
    const currentSkills = prof?.skills?.map((s: any) => s.skill?.name || s.name).filter(Boolean) || [];

    setEditForm({
      name: targetUser.name || '',
      email: targetUser.email || '',
      employeeCode: prof?.employeeCode || '',
      role: targetUser.role || 'STAFF',
      designation: prof?.designation || '',
      departmentId: prof?.departmentId || '',
      additionalDepartments: prof?.additionalDepartments || '',
      joiningDate: prof?.joiningDate ? new Date(prof.joiningDate).toISOString().split('T')[0] : '',
      employmentStatus: prof?.employmentStatus || targetUser.status || 'ACTIVE',
      phone: prof?.phone || '',
      avatarUrl: targetUser.avatarUrl || '',
      dailyCapacityHours: prof?.dailyCapacityHours?.toString() || '8.0',
      dailyTarget: prof?.dailyTarget?.toString() || '1.0',
      weeklyTarget: prof?.weeklyTarget?.toString() || '5.0',
      monthlyTarget: prof?.monthlyTarget?.toString() || '20.0',
      internalNotes: prof?.internalNotes || '',
      skills: currentSkills,
    });
  };

  const filteredUsers = users.filter((u) => {
    if (!showArchived && u.isArchived) return false;
    if (showArchived && !u.isArchived) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const nameMatch = u.name?.toLowerCase().includes(q);
      const idMatch = u.id?.toLowerCase().includes(q);
      const emailMatch = u.email?.toLowerCase().includes(q);
      const codeMatch = u.employeeProfile?.employeeCode?.toLowerCase().includes(q);
      const desigMatch = u.employeeProfile?.designation?.toLowerCase().includes(q);
      const primaryDeptMatch = u.employeeProfile?.department?.name?.toLowerCase().includes(q);
      const addDeptsMatch = u.employeeProfile?.additionalDepartments?.toLowerCase().includes(q);
      const skillsMatch = (u.employeeProfile?.skills || []).some((s: any) =>
        (s.skill?.name || s.name || '').toLowerCase().includes(q),
      );
      const statusMatch =
        (u.status || '').toLowerCase().includes(q) ||
        (u.employeeProfile?.employmentStatus || '').toLowerCase().includes(q) ||
        (u.currentAvailability || '').toLowerCase().includes(q);

      if (
        !nameMatch &&
        !idMatch &&
        !emailMatch &&
        !codeMatch &&
        !desigMatch &&
        !primaryDeptMatch &&
        !addDeptsMatch &&
        !skillsMatch &&
        !statusMatch
      )
        return false;
    }

    // 1. Department filter
    if (deptFilter !== 'ALL') {
      const primary = u.employeeProfile?.department?.name;
      const additional = u.employeeProfile?.additionalDepartments || '';
      if (primary !== deptFilter && !additional.includes(deptFilter)) return false;
    }

    // 2. Designation filter
    if (designationFilter !== 'ALL') {
      if (u.employeeProfile?.designation !== designationFilter) return false;
    }

    // 3. Status filter
    if (statusFilter !== 'ALL') {
      if (u.status !== statusFilter && u.employeeProfile?.employmentStatus !== statusFilter) return false;
    }

    // 4. Skills filter
    if (skillFilter !== 'ALL') {
      const userSkills = (u.employeeProfile?.skills || []).map((s: any) => s.skill?.name || s.name);
      if (!userSkills.includes(skillFilter)) return false;
    }

    // 5. Attendance filter
    if (attendanceFilter !== 'ALL') {
      if (u.todayAttendance !== attendanceFilter) return false;
    }

    // 6. Availability filter
    if (availabilityFilter !== 'ALL') {
      if (u.currentAvailability !== availabilityFilter) return false;
    }

    if (roleFilter !== 'ALL' && u.role !== roleFilter) return false;

    return true;
  });

  return (
    <div className="space-y-6 text-xs max-w-7xl mx-auto">

      {/* Header Banner */}
      <div className="bg-card border border-border p-6 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-400" /> Employee Directory &amp; Governance
          </h1>
          <p className="text-xs text-gray-400">
            Official staff roster, roles, designations, capacity targets, and record lifecycle management.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {isMediaManager ? (
            <button
              onClick={() => {
                const autoCode = `EMP-${(users.length + 1).toString().padStart(6, '0')}`;
                setRegisterForm((prev) => ({ ...prev, employeeCode: autoCode }));
                setShowRegisterModal(true);
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg flex items-center gap-2 transition-colors shadow-lg shadow-blue-600/30"
            >
              <UserPlus className="w-4 h-4" /> Register Employee
            </button>
          ) : (
            <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-300 px-3 py-2 rounded-lg text-xs font-medium">
              <Lock className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Official Profile Management Reserved for Media Manager</span>
            </div>
          )}
        </div>
      </div>

      {/* ===== Project-Style Filtration Control Panel ===== */}
      <div className="bg-card border border-border p-5 rounded-xl space-y-4 text-xs shadow-md">
        {/* Top Search & Controls Row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Keyword Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search employee records by Name, Code (e.g. EMP-000001), Email, Designation, Dept, Skill, Status..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 focus:border-blue-500 rounded-xl pl-9 pr-8 py-2.5 text-white font-medium focus:outline-none transition-all placeholder:text-gray-500"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-2.5 text-gray-400 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Controls: Advanced Toggle & Reset */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`px-3.5 py-2 rounded-lg font-semibold flex items-center gap-1.5 transition-colors border ${
                showAdvancedFilters || (deptFilter !== 'ALL' || designationFilter !== 'ALL' || skillFilter !== 'ALL' || attendanceFilter !== 'ALL' || availabilityFilter !== 'ALL' || roleFilter !== 'ALL')
                  ? 'bg-purple-600/20 text-purple-300 border-purple-500/50'
                  : 'bg-gray-900 border-gray-700 text-gray-300 hover:border-gray-600'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-purple-400" />
              <span>Advanced Filters</span>
              {([deptFilter, designationFilter, skillFilter, attendanceFilter, availabilityFilter, roleFilter].filter((v) => v !== 'ALL').length > 0) && (
                <span className="w-4 h-4 rounded-full bg-purple-500 text-white font-bold text-[10px] flex items-center justify-center">
                  {[deptFilter, designationFilter, skillFilter, attendanceFilter, availabilityFilter, roleFilter].filter((v) => v !== 'ALL').length}
                </span>
              )}
            </button>

            {(searchQuery || statusFilter !== 'ALL' || deptFilter !== 'ALL' || designationFilter !== 'ALL' || skillFilter !== 'ALL' || attendanceFilter !== 'ALL' || availabilityFilter !== 'ALL' || roleFilter !== 'ALL') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setDeptFilter('ALL');
                  setDesignationFilter('ALL');
                  setStatusFilter('ALL');
                  setSkillFilter('ALL');
                  setAttendanceFilter('ALL');
                  setAvailabilityFilter('ALL');
                  setRoleFilter('ALL');
                }}
                className="px-3 py-2 bg-red-950/40 hover:bg-red-900/60 border border-red-800/40 text-red-300 rounded-lg font-semibold flex items-center gap-1.5 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset Filters
              </button>
            )}

            <button
              onClick={() => setShowArchived(!showArchived)}
              className={`px-3 py-2 rounded-lg font-semibold flex items-center gap-1.5 transition-colors border ${
                showArchived
                  ? 'bg-purple-600/20 text-purple-300 border-purple-500/50'
                  : 'bg-gray-900 border-gray-700 text-gray-300 hover:border-gray-600'
              }`}
            >
              <Archive className="w-3.5 h-3.5 text-purple-400" /> {showArchived ? 'Active Roster' : 'Archived Records'}
            </button>
          </div>
        </div>

        {/* Quick Status Filter Tabs (Project-Style) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 border-t border-gray-800">
          <span className="text-gray-400 font-bold text-[10px] uppercase mr-1">Status Filter:</span>
          {['ALL', 'ACTIVE', 'PROBATION', 'INACTIVE', 'SUSPENDED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-600/30'
                  : 'bg-gray-900 border-gray-800 text-gray-400 hover:border-gray-700'
              }`}
            >
              {st === 'ALL' ? 'ALL STATUSES' : st}
            </button>
          ))}
        </div>

        {/* Expandable Advanced Filters Grid */}
        {showAdvancedFilters && (
          <div className="pt-3 border-t border-gray-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 animate-in fade-in duration-150">
            {/* 1. Department Filter */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-purple-400 uppercase flex items-center gap-1">
                <Building2 className="w-3 h-3" /> Department
              </label>
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2 text-white font-medium focus:border-purple-500 focus:outline-none text-xs"
              >
                <option value="ALL">All Departments</option>
                <option value="Video Production">Video Production</option>
                <option value="Graphic Design">Graphic Design</option>
                <option value="Photography">Photography</option>
                <option value="Motion Graphics">Motion Graphics</option>
                <option value="Administration">Administration</option>
              </select>
            </div>

            {/* 2. Designation Filter */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-blue-400 uppercase flex items-center gap-1">
                <Briefcase className="w-3 h-3" /> Designation
              </label>
              <select
                value={designationFilter}
                onChange={(e) => setDesignationFilter(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2 text-white font-medium focus:border-blue-500 focus:outline-none text-xs"
              >
                <option value="ALL">All Designations</option>
                <option value="Video Editor">Video Editor</option>
                <option value="Graphic Designer">Graphic Designer</option>
                <option value="Photographer">Photographer</option>
                <option value="Videographer">Videographer</option>
                <option value="Motion Designer">Motion Designer</option>
                <option value="Operations Staff">Operations Staff</option>
                <option value="Media Manager">Media Manager</option>
              </select>
            </div>

            {/* 3. Skills Filter */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-pink-400 uppercase flex items-center gap-1">
                <Award className="w-3 h-3" /> Skills &amp; Capabilities
              </label>
              <select
                value={skillFilter}
                onChange={(e) => setSkillFilter(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2 text-white font-medium focus:border-pink-500 focus:outline-none text-xs"
              >
                <option value="ALL">All Skills &amp; Capabilities</option>
                <option value="Video Editing">Video Editing</option>
                <option value="Photography">Photography</option>
                <option value="Videography">Videography</option>
                <option value="Motion Graphics">Motion Graphics</option>
                <option value="Color Grading">Color Grading</option>
                <option value="Drone Operation">Drone Operation</option>
                <option value="Graphic Design">Graphic Design</option>
                <option value="Illustration">Illustration</option>
                <option value="Copywriting">Copywriting</option>
              </select>
            </div>

            {/* 4. Attendance Filter */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-cyan-400 uppercase flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Today's Attendance
              </label>
              <select
                value={attendanceFilter}
                onChange={(e) => setAttendanceFilter(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2 text-white font-medium focus:border-cyan-500 focus:outline-none text-xs"
              >
                <option value="ALL">All Attendance Statuses</option>
                <option value="PRESENT">PRESENT</option>
                <option value="LATE">LATE</option>
                <option value="HALF_DAY">HALF DAY</option>
                <option value="ABSENT">ABSENT</option>
                <option value="NOT_MARKED">NOT MARKED</option>
              </select>
            </div>

            {/* 5. Availability Filter */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-emerald-400 uppercase flex items-center gap-1">
                <Clock className="w-3 h-3" /> Workload Availability
              </label>
              <select
                value={availabilityFilter}
                onChange={(e) => setAvailabilityFilter(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2 text-white font-medium focus:border-emerald-500 focus:outline-none text-xs"
              >
                <option value="ALL">All Availability States</option>
                <option value="Available">Available</option>
                <option value="Busy">Busy</option>
                <option value="Overloaded">Overloaded</option>
                <option value="Offline">Offline</option>
              </select>
            </div>

            {/* 6. System Role Filter */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-amber-400 uppercase flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> System Role
              </label>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2 text-white font-medium focus:border-amber-500 focus:outline-none text-xs"
              >
                <option value="ALL">All System Roles</option>
                <option value="MEDIA_MANAGER">Media Manager</option>
                <option value="TECHNICAL_MANAGER">Technical Manager</option>
                <option value="STAFF">Staff / Employee</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Employee Cards Grid */}
      {loading ? (
        <div className="p-12 text-center text-gray-400 bg-card border border-border rounded-xl flex items-center justify-center gap-2">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          Loading Employee Directory...
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="p-8 text-center bg-card border border-border rounded-xl text-gray-400">
          No employee records found matching selected filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredUsers.map((u) => {
            const prof = u.employeeProfile;
            const empCode = prof?.employeeCode || `EMP-${u.id.slice(0, 6).toUpperCase()}`;
            const joining = prof?.joiningDate ? new Date(prof.joiningDate).toLocaleDateString() : 'N/A';
            const empStatus = prof?.employmentStatus || u.status || 'ACTIVE';

            return (
              <div
                key={u.id}
                className={`bg-card border p-5 rounded-xl space-y-3 transition-all shadow-md relative ${
                  u.isArchived
                    ? 'border-zinc-800 opacity-75'
                    : empStatus === 'INACTIVE'
                    ? 'border-amber-500/30'
                    : 'border-border hover:border-blue-500/40'
                }`}
              >
                {/* Employee Header: Code, Avatar, Name & Status */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={u.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                      alt={u.name}
                      className="w-12 h-12 rounded-full object-cover border border-zinc-700 shrink-0 shadow-sm"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[10px] font-bold text-cyan-400 px-1.5 py-0.5 bg-cyan-500/10 border border-cyan-500/30 rounded">
                          {empCode}
                        </span>
                        <span className="text-[10px] text-gray-400 uppercase font-semibold font-mono">
                          ID: {u.id.slice(0, 8)}
                        </span>
                      </div>
                      <h3 className="font-bold text-white text-sm mt-0.5">{u.name}</h3>
                      <p className="text-[11px] text-gray-400 flex items-center gap-1 font-mono">
                        <Mail className="w-3 h-3 text-gray-500" />{' '}
                        {u.email === '[CONFIDENTIAL]' ? (
                          <span className="text-gray-500 italic">[CONFIDENTIAL — Protected]</span>
                        ) : (
                          u.email
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase border shrink-0 ${
                        u.isArchived
                          ? 'bg-zinc-800 text-zinc-400 border-zinc-700'
                          : empStatus === 'ACTIVE'
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                          : empStatus === 'SUSPENDED'
                          ? 'bg-red-500/20 text-red-400 border-red-500/30'
                          : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                      }`}
                    >
                      {u.isArchived ? 'ARCHIVED' : empStatus}
                    </span>

                    {/* Current Availability (Available, Busy, Overloaded, Offline) */}
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase border shrink-0 font-mono ${
                        u.currentAvailability === 'Overloaded'
                          ? 'bg-red-950 text-red-300 border-red-800'
                          : u.currentAvailability === 'Busy'
                          ? 'bg-amber-950 text-amber-300 border-amber-800'
                          : u.currentAvailability === 'Offline'
                          ? 'bg-zinc-800 text-zinc-400 border-zinc-700'
                          : 'bg-emerald-950 text-emerald-300 border-emerald-800'
                      }`}
                    >
                      ● {u.currentAvailability || 'Available'}
                    </span>
                  </div>
                </div>

                {/* Organizational Specs */}
                <div className="space-y-1.5 pt-2 border-t border-border text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 font-semibold flex items-center gap-1">
                      <Briefcase className="w-3 h-3 text-blue-400" /> Designation:
                    </span>
                    <strong className="text-white font-medium">{prof?.designation || 'Operations Staff'}</strong>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 font-semibold flex items-center gap-1">
                      <Building2 className="w-3 h-3 text-purple-400" /> Primary Dept:
                    </span>
                    <span className="text-purple-300 font-bold">{prof?.department?.name || 'General Operations'}</span>
                  </div>

                  {prof?.additionalDepartments && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 font-semibold flex items-center gap-1">
                        <Layers className="w-3 h-3 text-indigo-400" /> Additional Depts:
                      </span>
                      <span className="text-indigo-300 text-[11px] truncate max-w-[160px]" title={prof.additionalDepartments}>
                        {prof.additionalDepartments}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 font-semibold flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-amber-400" /> Joining Date:
                    </span>
                    <span className="text-gray-300 font-mono">{joining}</span>
                  </div>
                </div>

                {/* Skills / Capabilities Badges */}
                <div className="pt-2 border-t border-gray-800/60 space-y-1">
                  <span className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1">
                    <Award className="w-3 h-3 text-amber-400" /> Skills &amp; Capabilities
                  </span>
                  <div className="flex items-center gap-1 flex-wrap">
                    {prof?.skills?.length > 0 ? (
                      prof.skills.map((s: any) => (
                        <span key={s.id} className="text-[9px] font-semibold px-2 py-0.5 bg-gray-800 text-gray-300 rounded border border-gray-700">
                          {s.skill?.name || 'Skill'}
                        </span>
                      ))
                    ) : (
                      <span className="text-[9px] font-semibold px-2 py-0.5 bg-gray-900 text-gray-400 rounded border border-gray-800">
                        {prof?.designation?.includes('Editor') ? 'Video Editing • Color Grading' : 'Media Ops • Camera &amp; Sound'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Private Mobile Number Section */}
                <div className="p-2 bg-gray-950 rounded border border-gray-800 flex items-center justify-between text-[11px]">
                  <span className="text-gray-400 font-semibold flex items-center gap-1">
                    <Phone className="w-3 h-3 text-emerald-400" /> Mobile (Private):
                  </span>
                  {prof?.phone && prof.phone !== null ? (
                    <span className="font-mono text-emerald-400 font-bold">{prof.phone}</span>
                  ) : (
                    <span className="text-gray-500 italic text-[10px]">[CONFIDENTIAL — Protected]</span>
                  )}
                </div>

                {/* Daily Capacity & Target */}
                <div className="p-2.5 bg-gray-950/80 border border-gray-800 rounded-lg grid grid-cols-2 gap-2 text-center text-xs">
                  <div className="bg-gray-900 p-1.5 rounded border border-gray-800">
                    <span className="text-gray-400 text-[9px] uppercase font-bold block flex items-center justify-center gap-1">
                      <Clock className="w-3 h-3 text-cyan-400" /> Daily Capacity
                    </span>
                    <strong className="text-cyan-300 font-mono text-xs">{prof?.dailyCapacityHours || 8.0} Hours</strong>
                  </div>
                  <div className="bg-gray-900 p-1.5 rounded border border-gray-800">
                    <span className="text-gray-400 text-[9px] uppercase font-bold block flex items-center justify-center gap-1">
                      <Target className="w-3 h-3 text-emerald-400" /> Daily Target
                    </span>
                    <strong className="text-emerald-300 font-mono text-xs">{prof?.dailyTarget || 1.0} Deliverables</strong>
                  </div>
                </div>

                {/* Internal Administrative Notes */}
                {prof?.internalNotes && (
                  <div className="p-2 bg-amber-950/20 border border-amber-800/40 rounded text-[10px] text-amber-300/90 italic flex items-start gap-1.5">
                    <FileText className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
                    <span>"{prof.internalNotes}"</span>
                  </div>
                )}

                {/* Media Manager Action Controls */}
                {isMediaManager ? (
                  <div className="pt-2 border-t border-border flex items-center gap-1.5 flex-wrap">
                    <button
                      onClick={() => openEditModal(u)}
                      className="flex-1 py-1.5 px-2 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded font-semibold text-[11px] flex items-center justify-center gap-1 transition-colors"
                    >
                      <Edit className="w-3 h-3 text-blue-400" /> Edit Record
                    </button>

                    {empStatus !== 'ACTIVE' ? (
                      <button
                        onClick={() => handleActivate(u.id, u.name)}
                        className="py-1.5 px-2.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 rounded font-bold text-[11px] flex items-center gap-1 transition-colors"
                      >
                        <UserCheck className="w-3 h-3" /> Activate
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => handleDeactivate(u.id, u.name)}
                          className="py-1.5 px-2.5 bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-amber-300 rounded font-bold text-[11px] flex items-center gap-1 transition-colors"
                        >
                          <UserX className="w-3 h-3" /> Deactivate
                        </button>
                        <button
                          onClick={() => handleSuspend(u.id, u.name)}
                          className="py-1.5 px-2.5 bg-red-600/20 hover:bg-red-600/30 border border-red-500/40 text-red-300 rounded font-bold text-[11px] flex items-center gap-1 transition-colors"
                        >
                          <AlertTriangle className="w-3 h-3" /> Suspend
                        </button>
                      </>
                    )}

                    {!u.isArchived && (
                      <button
                        onClick={() => handleArchive(u.id, u.name)}
                        className="py-1.5 px-2.5 bg-zinc-800 hover:bg-red-950/40 border border-zinc-700 text-zinc-400 hover:text-red-300 rounded font-bold text-[11px] flex items-center gap-1 transition-colors"
                      >
                        <Archive className="w-3 h-3" /> Archive
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="pt-2 border-t border-border flex items-center justify-between text-[10px] text-gray-500">
                    <span className="flex items-center gap-1"><Lock className="w-3 h-3 text-emerald-400" /> Profile Locked</span>
                    <span>Self-modification forbidden</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Register Employee Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-blue-400" /> Register Employee Record
              </h2>
              <button onClick={() => setShowRegisterModal(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleRegisterEmployee} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 block mb-1 font-semibold uppercase text-[10px]">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={registerForm.name}
                    onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                    placeholder="e.g. Sara Ahmed"
                    className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-gray-400 block mb-1 font-semibold uppercase text-[10px]">Employee Code *</label>
                  <input
                    type="text"
                    required
                    value={registerForm.employeeCode}
                    onChange={(e) => setRegisterForm({ ...registerForm, employeeCode: e.target.value })}
                    placeholder="e.g. EMP-000001"
                    className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="text-gray-400 block mb-1 font-semibold uppercase text-[10px]">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={registerForm.email}
                    onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                    placeholder="e.g. sara@mediaops.com"
                    className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-gray-400 block mb-1 font-semibold uppercase text-[10px]">Initial Password *</label>
                  <input
                    type="password"
                    required
                    value={registerForm.password}
                    onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                    placeholder="Account login password"
                    className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white"
                  />
                </div>

                <div>
                  <label className="text-gray-400 block mb-1 font-semibold uppercase text-[10px]">Designation *</label>
                  <input
                    type="text"
                    required
                    value={registerForm.designation}
                    onChange={(e) => setRegisterForm({ ...registerForm, designation: e.target.value })}
                    placeholder="e.g. Senior Video Editor &amp; Colorist"
                    className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-gray-400 block mb-1 font-semibold uppercase text-[10px]">System Role *</label>
                  <select
                    value={registerForm.role}
                    onChange={(e) => setRegisterForm({ ...registerForm, role: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white font-semibold"
                  >
                    <option value="STAFF">Staff / Employee</option>
                    <option value="TECHNICAL_MANAGER">Technical Manager</option>
                    <option value="MEDIA_MANAGER">Media Manager</option>
                  </select>
                </div>

                <div>
                  <label className="text-gray-400 block mb-1 font-semibold uppercase text-[10px]">Primary Department *</label>
                  <select
                    value={registerForm.departmentId}
                    onChange={(e) => setRegisterForm({ ...registerForm, departmentId: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white font-semibold"
                  >
                    <option value="">Select Primary Department...</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-gray-400 block mb-1 font-semibold uppercase text-[10px]">Additional Departments (Multiple Allowed)</label>
                  <input
                    type="text"
                    value={registerForm.additionalDepartments}
                    onChange={(e) => setRegisterForm({ ...registerForm, additionalDepartments: e.target.value })}
                    placeholder="e.g. Photography, Motion Graphics"
                    className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white mb-1.5"
                  />
                  <div className="flex items-center gap-1 flex-wrap">
                    {['Photography', 'Motion Graphics', 'Graphic Design', 'Video Production', 'Administration'].map((dept) => {
                      const selectedList = registerForm.additionalDepartments
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean);
                      const isSelected = selectedList.includes(dept);

                      return (
                        <button
                          key={dept}
                          type="button"
                          onClick={() => {
                            let newList;
                            if (isSelected) {
                              newList = selectedList.filter((d) => d !== dept);
                            } else {
                              newList = [...selectedList, dept];
                            }
                            setRegisterForm({ ...registerForm, additionalDepartments: newList.join(', ') });
                          }}
                          className={`text-[9px] font-bold px-2 py-0.5 rounded border transition-colors ${
                            isSelected
                              ? 'bg-blue-600/30 text-blue-300 border-blue-500'
                              : 'bg-gray-900 text-gray-400 border-gray-800 hover:border-gray-700'
                          }`}
                        >
                          {isSelected ? '✓ ' : '+ '}{dept}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="text-gray-400 block mb-1 font-semibold uppercase text-[10px]">Joining Date *</label>
                  <input
                    type="date"
                    required
                    value={registerForm.joiningDate}
                    onChange={(e) => setRegisterForm({ ...registerForm, joiningDate: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white font-semibold"
                  />
                </div>
                <div>
                  <label className="text-gray-400 block mb-1 font-semibold uppercase text-[10px]">Mobile Number (Private)</label>
                  <input
                    type="text"
                    value={registerForm.phone}
                    onChange={(e) => setRegisterForm({ ...registerForm, phone: e.target.value })}
                    placeholder="e.g. +92 300 1234567"
                    className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-gray-400 block mb-1 font-semibold uppercase text-[10px]">Employment Status *</label>
                  <select
                    value={registerForm.employmentStatus}
                    onChange={(e) => setRegisterForm({ ...registerForm, employmentStatus: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white font-semibold"
                  >
                    <option value="ACTIVE">ACTIVE — Full operational status</option>
                    <option value="PROBATION">PROBATION — Initial review period</option>
                    <option value="INACTIVE">INACTIVE — Temporary deactivation</option>
                  </select>
                </div>
                <div>
                  <label className="text-gray-400 block mb-1 font-semibold uppercase text-[10px]">Profile Photo URL (Optional)</label>
                  <input
                    type="url"
                    value={registerForm.avatarUrl}
                    onChange={(e) => setRegisterForm({ ...registerForm, avatarUrl: e.target.value })}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white"
                  />
                </div>

                <div className="col-span-2 border-t border-gray-800 pt-3">
                  <label className="text-gray-300 block mb-1.5 font-bold uppercase text-[10px]">
                    Configurable Employee Capabilities / Skills (Task Assignment Based On Capabilities)
                  </label>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[
                      'Video Editing',
                      'Photography',
                      'Videography',
                      'Motion Graphics',
                      'Color Grading',
                      'Drone Operation',
                      'Graphic Design',
                      'Illustration',
                      'Copywriting',
                    ].map((cap) => {
                      const isSelected = registerForm.skills.includes(cap);
                      return (
                        <button
                          key={cap}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setRegisterForm({ ...registerForm, skills: registerForm.skills.filter((s) => s !== cap) });
                            } else {
                              setRegisterForm({ ...registerForm, skills: [...registerForm.skills, cap] });
                            }
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors ${
                            isSelected
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                              : 'bg-gray-900 text-gray-400 border-gray-800 hover:border-gray-700'
                          }`}
                        >
                          {isSelected ? '★ ' : '+ '}{cap}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-800 pt-3 grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 block mb-1 font-semibold uppercase text-[10px]">Daily Capacity (Hours)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={registerForm.dailyCapacityHours}
                    onChange={(e) => setRegisterForm({ ...registerForm, dailyCapacityHours: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white font-mono text-center"
                  />
                </div>
                <div>
                  <label className="text-gray-400 block mb-1 font-semibold uppercase text-[10px]">Daily Output Target (Deliverables)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={registerForm.dailyTarget}
                    onChange={(e) => setRegisterForm({ ...registerForm, dailyTarget: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white font-mono text-center"
                  />
                </div>
              </div>

              <div>
                <label className="text-gray-400 block mb-1 font-semibold uppercase text-[10px]">Internal Administrative Notes</label>
                <textarea
                  rows={2}
                  value={registerForm.internalNotes}
                  onChange={(e) => setRegisterForm({ ...registerForm, internalNotes: e.target.value })}
                  placeholder="Administrative notes, hardware allocations, internal comments..."
                  className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-border">
                <button type="button" onClick={() => setShowRegisterModal(false)} className="px-4 py-2 bg-gray-800 text-gray-300 rounded font-semibold">Cancel</button>
                <button type="submit" disabled={submittingRegister} className="px-4 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-500 shadow-lg shadow-blue-600/30 disabled:opacity-50">
                  {submittingRegister ? 'Registering...' : 'Register Employee Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Employee Record Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Edit className="w-4 h-4 text-blue-400" /> Edit Employee Record
              </h2>
              <button onClick={() => setEditingUser(null)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleEditEmployee} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 block mb-1 font-semibold uppercase text-[10px]">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-gray-400 block mb-1 font-semibold uppercase text-[10px]">Employee Code *</label>
                  <input
                    type="text"
                    required
                    value={editForm.employeeCode}
                    onChange={(e) => setEditForm({ ...editForm, employeeCode: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="text-gray-400 block mb-1 font-semibold uppercase text-[10px]">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-gray-400 block mb-1 font-semibold uppercase text-[10px]">Designation *</label>
                  <input
                    type="text"
                    required
                    value={editForm.designation}
                    onChange={(e) => setEditForm({ ...editForm, designation: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white"
                  />
                </div>

                <div>
                  <label className="text-gray-400 block mb-1 font-semibold uppercase text-[10px]">Primary Department</label>
                  <select
                    value={editForm.departmentId}
                    onChange={(e) => setEditForm({ ...editForm, departmentId: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white font-semibold"
                  >
                    <option value="">Select Primary Department...</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-gray-400 block mb-1 font-semibold uppercase text-[10px]">Additional Departments (Multiple Allowed)</label>
                  <input
                    type="text"
                    value={editForm.additionalDepartments}
                    onChange={(e) => setEditForm({ ...editForm, additionalDepartments: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white mb-1.5"
                  />
                  <div className="flex items-center gap-1 flex-wrap">
                    {['Photography', 'Motion Graphics', 'Graphic Design', 'Video Production', 'Administration'].map((dept) => {
                      const selectedList = editForm.additionalDepartments
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean);
                      const isSelected = selectedList.includes(dept);

                      return (
                        <button
                          key={dept}
                          type="button"
                          onClick={() => {
                            let newList;
                            if (isSelected) {
                              newList = selectedList.filter((d) => d !== dept);
                            } else {
                              newList = [...selectedList, dept];
                            }
                            setEditForm({ ...editForm, additionalDepartments: newList.join(', ') });
                          }}
                          className={`text-[9px] font-bold px-2 py-0.5 rounded border transition-colors ${
                            isSelected
                              ? 'bg-blue-600/30 text-blue-300 border-blue-500'
                              : 'bg-gray-900 text-gray-400 border-gray-800 hover:border-gray-700'
                          }`}
                        >
                          {isSelected ? '✓ ' : '+ '}{dept}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="text-gray-400 block mb-1 font-semibold uppercase text-[10px]">Joining Date</label>
                  <input
                    type="date"
                    value={editForm.joiningDate}
                    onChange={(e) => setEditForm({ ...editForm, joiningDate: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white font-semibold"
                  />
                </div>
                <div>
                  <label className="text-gray-400 block mb-1 font-semibold uppercase text-[10px]">Mobile Number (Private)</label>
                  <input
                    type="text"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-gray-400 block mb-1 font-semibold uppercase text-[10px]">Employment Status</label>
                  <select
                    value={editForm.employmentStatus}
                    onChange={(e) => setEditForm({ ...editForm, employmentStatus: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white font-semibold"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="PROBATION">PROBATION</option>
                    <option value="INACTIVE">INACTIVE</option>
                    <option value="ARCHIVED">ARCHIVED</option>
                  </select>
                </div>
                <div>
                  <label className="text-gray-400 block mb-1 font-semibold uppercase text-[10px]">System Role</label>
                  <select
                    value={editForm.role}
                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white font-semibold"
                  >
                    <option value="STAFF">Staff / Employee</option>
                    <option value="TECHNICAL_MANAGER">Technical Manager</option>
                    <option value="MEDIA_MANAGER">Media Manager</option>
                  </select>
                </div>

                <div className="col-span-2 border-t border-gray-800 pt-3">
                  <label className="text-gray-300 block mb-1.5 font-bold uppercase text-[10px]">
                    Configurable Employee Capabilities / Skills (Task Assignment Based On Capabilities)
                  </label>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[
                      'Video Editing',
                      'Photography',
                      'Videography',
                      'Motion Graphics',
                      'Color Grading',
                      'Drone Operation',
                      'Graphic Design',
                      'Illustration',
                      'Copywriting',
                    ].map((cap) => {
                      const isSelected = editForm.skills.includes(cap);
                      return (
                        <button
                          key={cap}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setEditForm({ ...editForm, skills: editForm.skills.filter((s) => s !== cap) });
                            } else {
                              setEditForm({ ...editForm, skills: [...editForm.skills, cap] });
                            }
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors ${
                            isSelected
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                              : 'bg-gray-900 text-gray-400 border-gray-800 hover:border-gray-700'
                          }`}
                        >
                          {isSelected ? '★ ' : '+ '}{cap}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-800 pt-3 grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 block mb-1 font-semibold uppercase text-[10px]">Daily Capacity (Hours)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={editForm.dailyCapacityHours}
                    onChange={(e) => setEditForm({ ...editForm, dailyCapacityHours: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white font-mono text-center"
                  />
                </div>
                <div>
                  <label className="text-gray-400 block mb-1 font-semibold uppercase text-[10px]">Daily Output Target</label>
                  <input
                    type="number"
                    step="0.5"
                    value={editForm.dailyTarget}
                    onChange={(e) => setEditForm({ ...editForm, dailyTarget: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white font-mono text-center"
                  />
                </div>
              </div>

              <div>
                <label className="text-gray-400 block mb-1 font-semibold uppercase text-[10px]">Internal Administrative Notes</label>
                <textarea
                  rows={2}
                  value={editForm.internalNotes}
                  onChange={(e) => setEditForm({ ...editForm, internalNotes: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-border">
                <button type="button" onClick={() => setEditingUser(null)} className="px-4 py-2 bg-gray-800 text-gray-300 rounded font-semibold">Cancel</button>
                <button type="submit" disabled={submittingEdit} className="px-4 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-500 shadow-lg shadow-blue-600/30 disabled:opacity-50">
                  {submittingEdit ? 'Saving...' : 'Save Employee Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
