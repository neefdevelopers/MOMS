'use client';

import React, { useEffect, useState } from 'react';
import { exportToExcel, exportToCSV, exportToPDF, ExportColumn } from '@/utils/exportUtils';
import { fetchApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import {
  BarChart3, TrendingUp, PieChart, Layers, ShieldCheck, Users, Building2, RotateCcw,
  Palette, Tag, Zap, Package, CheckCircle2, Download,
} from 'lucide-react';
import { FavoriteButton } from '@/components/common/FavoriteButton';
import { recordRecentAccess } from '@/lib/recent-access';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const BRAND_COLORS = ['#a78bfa', '#34d399', '#60a5fa', '#fbbf24', '#f87171', '#38bdf8', '#fb923c'];

export default function ReportsPage() {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [scriptAnalytics, setScriptAnalytics] = useState<any>(null);
  const [graphicAnalytics, setGraphicAnalytics] = useState<any>(null);
  const [employeeReports, setEmployeeReports] = useState<any[]>([]);
  const [brandReports, setBrandReports] = useState<any[]>([]);
  const [clientReports, setClientReports] = useState<any[]>([]);
  const [productReports, setProductReports] = useState<any[]>([]);
  const [deptReports, setDeptReports] = useState<any[]>([]);
  const [projectReports, setProjectReports] = useState<any[]>([]);
  const [equipmentReports, setEquipmentReports] = useState<any[]>([]);
  const [approvalReports, setApprovalReports] = useState<any>(null);
  const [capacityReports, setCapacityReports] = useState<any>(null);
  const [revisionReports, setRevisionReports] = useState<any>(null);
  const [timelineReports, setTimelineReports] = useState<any>(null);
  const [attendanceData, setAttendanceData] = useState<any>(null);
  const [globalPeriod, setGlobalPeriod] = useState<'today' | 'yesterday' | 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'custom'>('this_month');
  const [attendancePeriod, setAttendancePeriod] = useState('this_month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [clientId, setClientId] = useState('');
  const [brandId, setBrandId] = useState('');
  const [productId, setProductId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [status, setStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [clients, setClients] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [projectsList, setProjectsList] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'timelines' | 'revisions' | 'capacity' | 'approvals' | 'equipment' | 'attendance' | 'projects' | 'departments' | 'products' | 'clients' | 'brands' | 'employee' | 'scripts' | 'graphics'>('timelines');

  
  const handleExport = (format: 'csv' | 'xlsx' | 'pdf') => {
    let exportData: any[] = [];
    let columns: ExportColumn[] = [];
    let filename = `MOMS_Report_${activeTab}_${globalPeriod}`;

    const metadata = [
      `Report: ${activeTab.toUpperCase()}`,
      `Period: ${globalPeriod}`,
      `Generated: ${new Date().toLocaleString()}`
    ];

    if (clientId) metadata.push(`Client: ${clients.find(c => c.id === clientId)?.name || clientId}`);
    if (brandId) metadata.push(`Brand: ${brands.find(b => b.id === brandId)?.name || brandId}`);
    if (departmentId) metadata.push(`Department: ${departments.find(d => d.id === departmentId)?.name || departmentId}`);

    switch (activeTab) {
      case 'employee':
        exportData = employeeReports.map(emp => ({
          ...emp,
          employeeName: emp.employeeName || emp.name || 'Unknown',
          attendance: emp.attendance || 'NOT MARKED',
          assignedTasks: emp.assignedTasksCount ?? emp.assignedTasks ?? 0,
          completedTasks: emp.completedTasksCount ?? emp.completedTasks ?? 0,
          pendingTasks: emp.pendingTasksCount ?? emp.pendingTasks ?? 0,
        }));
        columns = [
          { header: 'Employee Name', key: 'employeeName' },
          { header: 'Designation', key: 'designation' },
          { header: 'Department', key: 'department' },
          { header: 'Attendance', key: 'attendance' },
          { header: 'Assigned', key: 'assignedTasks' },
          { header: 'Completed', key: 'completedTasks' },
          { header: 'Pending', key: 'pendingTasks' },
          { header: 'Target', key: 'dailyTarget' },
          { header: 'Actual Output', key: 'actualDailyOutput' },
          { header: 'Achievement %', key: 'achievementPercentage' },
          { header: 'Revisions', key: 'revisionCount' },
          { header: 'Completion %', key: 'completionRatePercentage' },
          { header: 'Overall Score', key: 'overallProductivityScore' }
        ];
        break;
        case 'attendance':
          exportData = (attendanceData?.report || []).map((emp: any) => ({
            ...emp,
            employeeName: emp.employeeName || emp.name || 'Unknown',
          }));
          columns = [
          { header: 'Employee Name', key: 'employeeName' },
          { header: 'Department', key: 'department' },
          { header: 'Present Days', key: 'presentDays' },
          { header: 'Absent Days', key: 'absentDays' },
          { header: 'Half Days', key: 'halfDays' },
          { header: 'Late Entries', key: 'lateEntries' },
          { header: 'Tracked Days', key: 'totalTrackedDays' },
          { header: 'Attendance %', key: 'attendancePercentage' }
        ];
        break;
        case 'projects':
          exportData = projectReports.map(p => ({
            ...p,
            projectName: p.projectName || p.name || 'Unknown',
            projectCode: p.projectCode || p.shortCode || 'N/A',
            clientName: p.clientName || p.client?.name || 'N/A',
            brandName: p.brandName || p.brand?.name || 'N/A',
            productName: p.productName || p.product?.name || 'N/A',
          }));
          columns = [
          { header: 'Project Name', key: 'projectName' },
          { header: 'Code', key: 'projectCode' },
          { header: 'Status', key: 'status' },
          { header: 'Client', key: 'clientName' },
          { header: 'Brand', key: 'brandName' },
          { header: 'Product', key: 'productName' },
          { header: 'Assigned Staff', key: 'assignedEmployeesCount' },
          { header: 'Timeline Summary', key: 'timelineSummary' }
        ];
        break;
      case 'departments':
          exportData = deptReports.map(d => ({
            ...d,
            department: d.departmentName || d.name || 'Unknown',
            headcount: d.totalEmployees ?? d.headcount ?? 0,
            avgProductivityPercentage: d.avgProductivityPercentage ?? 0,
            avgAttendancePercentage: d.avgAttendancePercentage ?? 0,
            avgCapacityUtilizationPercentage: d.avgCapacityUtilizationPercentage ?? 0,
          }));
          columns = [
            { header: 'Department', key: 'department' },
            { header: 'Headcount', key: 'headcount' },
            { header: 'Avg Productivity %', key: 'avgProductivityPercentage' },
            { header: 'Avg Attendance %', key: 'avgAttendancePercentage' },
            { header: 'Avg Capacity Utilization %', key: 'avgCapacityUtilizationPercentage' }
          ];
          break;
        case 'clients':
          exportData = clientReports.map(c => ({
            ...c,
            name: c.name || c.clientName || 'Unknown',
            shortCode: c.shortCode || 'N/A',
            projectCount: c.projectCount ?? 0,
            completedCount: c.completedCount ?? 0,
            scriptCount: c.scriptCount ?? 0,
            graphicCount: c.graphicCount ?? 0,
          }));
          columns = [
            { header: 'Client Name', key: 'name' },
            { header: 'Code', key: 'shortCode' },
            { header: 'Total Projects', key: 'projectCount' },
            { header: 'Completed Projects', key: 'completedCount' },
            { header: 'Total Scripts', key: 'scriptCount' },
            { header: 'Graphic Reqs', key: 'graphicCount' }
          ];
          break;
        case 'brands':
          exportData = brandReports.map(b => ({
            ...b,
            name: b.name || b.brandName || 'Unknown',
            clientName: b.clientName || b.client?.name || 'N/A',
            shortCode: b.shortCode || 'N/A',
            projectCount: b.projectCount ?? 0,
            completedCount: b.completedCount ?? 0,
            scriptCount: b.scriptCount ?? 0,
          }));
          columns = [
            { header: 'Brand Name', key: 'name' },
            { header: 'Client', key: 'clientName' },
            { header: 'Code', key: 'shortCode' },
            { header: 'Total Projects', key: 'projectCount' },
            { header: 'Completed Projects', key: 'completedCount' },
            { header: 'Total Scripts', key: 'scriptCount' }
          ];
          break;
        case 'scripts':
          exportData = (scriptAnalytics?.employeeProductivity || []).map((s: any) => ({
            ...s,
            name: s.name || s.employeeName || 'Unknown',
            role: s.role || 'N/A',
            assignedCount: s.assignedCount ?? 0,
            completedCount: s.completedCount ?? 0,
            revisionCount: s.revisionCount ?? 0,
          }));
          columns = [
            { header: 'Name', key: 'name' },
            { header: 'Role', key: 'role' },
            { header: 'Assigned', key: 'assignedCount' },
            { header: 'Completed', key: 'completedCount' },
            { header: 'Revisions', key: 'revisionCount' }
          ];
          break;
        case 'graphics':
          exportData = (graphicAnalytics?.employeeProductivity || []).map((g: any) => ({
            ...g,
            name: g.name || g.employeeName || 'Unknown',
            role: g.role || 'N/A',
            assignedCount: g.assignedCount ?? 0,
            inProgressCount: g.inProgressCount ?? 0,
            completedCount: g.completedCount ?? 0,
            revisionCount: g.revisionCount ?? 0,
          }));
          columns = [
            { header: 'Name', key: 'name' },
            { header: 'Role', key: 'role' },
            { header: 'Assigned', key: 'assignedCount' },
            { header: 'In Progress', key: 'inProgressCount' },
            { header: 'Completed', key: 'completedCount' },
            { header: 'Revisions', key: 'revisionCount' }
          ];
          break;
      default:
        alert('Exporting for this tab is not fully configured yet. Try Employee or Attendance.');
        return;
    }

    if (exportData.length === 0) {
      alert('No data available to export for the current filters.');
      return;
    }

    if (format === 'csv') exportToCSV({ data: exportData, columns, filename, metadata });
    if (format === 'xlsx') exportToExcel({ data: exportData, columns, filename, metadata });
    if (format === 'pdf') exportToPDF({ data: exportData, columns, filename, metadata });
  };

  const fetchAttendance = async (period: string, sDate?: string, eDate?: string) => {
    try {
      let url = `/reports/attendance-analytics?period=${period}`;
      if (period === 'custom' && sDate) {
        url += `&startDate=${sDate}`;
        if (eDate) url += `&endDate=${eDate}`;
      }
      const res = await fetchApi(url);
      setAttendanceData(res);
    } catch (err) {
      console.error('Error fetching attendance analytics:', err);
    }
  };

  useEffect(() => {
    async function loadRefs() {
      try {
        const [c, b, p, d, e, pr] = await Promise.all([
          fetchApi('/clients').catch(() => []),
          fetchApi('/brands').catch(() => []),
          fetchApi('/products').catch(() => []),
          fetchApi('/users/departments').catch(() => []),
          fetchApi('/users').catch(() => []),
          fetchApi('/projects').catch(() => []),
        ]);
        setClients(c);
        setBrands(b);
        setProducts(p);
        setDepartments(d);
        setEmployees(e);
        setProjectsList(pr);
      } catch (err) {
        console.error('Failed to load refs', err);
      }
    }
    loadRefs();
  }, []);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        let query = `?period=${globalPeriod}${globalPeriod === 'custom' && startDate ? `&startDate=${startDate}` : ''}${globalPeriod === 'custom' && endDate ? `&endDate=${endDate}` : ''}`;
        if (clientId) query += `&clientId=${clientId}`;
        if (brandId) query += `&brandId=${brandId}`;
        if (productId) query += `&productId=${productId}`;
        if (departmentId) query += `&departmentId=${departmentId}`;
        if (employeeId) query += `&employeeId=${employeeId}`;
        if (projectId) query += `&projectId=${projectId}`;
        if (status) query += `&status=${status}`;
        if (searchQuery) query += `&search=${encodeURIComponent(searchQuery)}`;
        
        const [resProd, resScript, resGraphic, resEmp, resBrand, resClient, resProduct, resDept, resProjects, resAtt, resEq, resApp, resCap, resRev, resTime] = await Promise.all([
          fetchApi(`/reports/production${query}`),
          fetchApi(`/reports/script-analytics${query}`),
          fetchApi(`/reports/graphic-analytics${query}`),
          fetchApi(`/reports/productivity${query}`),
          fetchApi(`/reports/brands${query}`),
          fetchApi(`/reports/clients${query}`),
          fetchApi(`/reports/products${query}`),
          fetchApi(`/reports/departments${query}`),
          fetchApi(`/reports/projects${query}`),
          fetchApi(`/reports/attendance-analytics${query}`),
          fetchApi(`/reports/equipment${query}`),
          fetchApi(`/reports/approvals${query}`),
          fetchApi(`/reports/capacity${query}`),
          fetchApi(`/reports/revisions${query}`),
          fetchApi(`/reports/timelines${query}`),
        ]);
        setData(resProd);
        setScriptAnalytics(resScript);
        setGraphicAnalytics(resGraphic);
        setEmployeeReports(Array.isArray(resEmp) ? resEmp : []);
        setBrandReports(Array.isArray(resBrand) ? resBrand : []);
        setClientReports(Array.isArray(resClient) ? resClient : []);
        setProductReports(Array.isArray(resProduct) ? resProduct : []);
        setDeptReports(Array.isArray(resDept) ? resDept : []);
        setProjectReports(Array.isArray(resProjects) ? resProjects : []);
        setAttendanceData(resAtt);
        setEquipmentReports(Array.isArray(resEq) ? resEq : []);
        setApprovalReports(resApp);
        setCapacityReports(resCap);
        setRevisionReports(resRev);
        setTimelineReports(resTime);

        recordRecentAccess({
          entityType: 'REPORT',
          entityId: 'operational-reports',
          title: 'Timeline, Revision & Operational Analytics',
          code: 'RPT-ANALYTICS',
          url: '/reports',
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [globalPeriod, startDate, endDate, clientId, brandId, productId, departmentId, employeeId, projectId, status, searchQuery]);

  if (loading && !data) return <div className="p-8 text-center text-gray-400">Loading Operational Reports...</div>;

  const gr = graphicAnalytics;
  const app = approvalReports;
  const cap = capacityReports;
  const rev = revisionReports;
  const time = timelineReports;
  const typeChartData = (gr?.typeReports || []).map((t: any, i: number) => ({
    name: t.type,
    total: t.totalReqs,
    completed: t.completedCount,
    fill: BRAND_COLORS[i % BRAND_COLORS.length],
  }));

  const isMediaManager = user?.role === 'MEDIA_MANAGER' || (user?.role as string) === 'ADMIN';
  const isTechnicalManager = user?.role === 'TECHNICAL_MANAGER';
  const isStaff = user?.role === 'STAFF';

  const isReportTabAllowed = (tabId: string) => {
    if (isMediaManager) return true;
    if (isTechnicalManager) {
      return ['brands', 'equipment', 'employee', 'capacity', 'revisions', 'scripts', 'graphics', 'approvals'].includes(tabId);
    }
    if (isStaff) {
      return ['employee', 'attendance', 'capacity', 'revisions'].includes(tabId);
    }
    return true;
  };

  useEffect(() => {
    if (isTechnicalManager && (activeTab === 'timelines' || activeTab === 'attendance')) {
      setActiveTab('equipment');
    } else if (isStaff && !['employee', 'attendance', 'capacity', 'revisions'].includes(activeTab)) {
      setActiveTab('employee');
    }
  }, [user?.role]);

  return (
    <div className="space-y-6 text-xs">
      {/* Compact Controls Bar */}
      <div className="bg-card border border-border rounded-xl px-4 py-3 flex flex-wrap items-center gap-2">
        {/* Period */}
        <select
          className="bg-gray-900 border border-gray-700 rounded-lg px-2 py-1.5 text-white text-xs"
          value={globalPeriod}
          onChange={(e) => setGlobalPeriod(e.target.value as any)}
        >
          <option value="today">Today</option>
          <option value="yesterday">Yesterday</option>
          <option value="this_week">This Week</option>
          <option value="last_week">Last Week</option>
          <option value="this_month">This Month</option>
          <option value="last_month">Last Month</option>
          <option value="custom">Custom</option>
        </select>
        {globalPeriod === 'custom' && (
          <>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-white text-xs" />
            <span className="text-gray-500 text-xs">→</span>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-white text-xs" />
          </>
        )}

        <div className="w-px h-5 bg-gray-700 mx-1" />

        {/* Filters Dropdown */}
        <div className="relative">
          <button
            onClick={() => setFilterMenuOpen(o => !o)}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 border rounded-lg font-medium transition-colors ${
              (clientId || brandId || departmentId || employeeId || status || searchQuery)
                ? 'bg-indigo-900/50 border-indigo-600 text-indigo-300'
                : 'bg-gray-800 hover:bg-gray-700 border-gray-600 text-white'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 010 2H4a1 1 0 01-1-1zM6 10h12M9 16h6" /></svg>
            Filters
            {(clientId || brandId || departmentId || employeeId || status) && (
              <span className="ml-0.5 bg-indigo-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 leading-none">
                {[clientId, brandId, departmentId, employeeId, status].filter(Boolean).length}
              </span>
            )}
            <span className="text-gray-400 ml-0.5">▾</span>
          </button>
          {filterMenuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setFilterMenuOpen(false)} />
              <div className="absolute left-0 top-full mt-1.5 z-20 bg-gray-900 border border-gray-700 rounded-xl shadow-xl p-4 min-w-[280px] space-y-3">
                <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Filter Reports</p>
                <div className="grid grid-cols-2 gap-2">
                  <select className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-gray-300 text-xs" value={clientId} onChange={e => setClientId(e.target.value)}>
                    <option value="">All Clients</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <select className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-gray-300 text-xs" value={brandId} onChange={e => setBrandId(e.target.value)}>
                    <option value="">All Brands</option>
                    {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                  <select className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-gray-300 text-xs" value={departmentId} onChange={e => setDepartmentId(e.target.value)}>
                    <option value="">All Depts</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                  <select className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-gray-300 text-xs" value={employeeId} onChange={e => setEmployeeId(e.target.value)}>
                    <option value="">All Employees</option>
                    {employees.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                  <select className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-gray-300 text-xs col-span-2" value={status} onChange={e => setStatus(e.target.value)}>
                    <option value="">All Statuses</option>
                    <option value="ACTIVE">Active</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>
                {(clientId || brandId || departmentId || employeeId || status) && (
                  <button
                    onClick={() => { setClientId(''); setBrandId(''); setProductId(''); setProjectId(''); setDepartmentId(''); setEmployeeId(''); setStatus(''); setSearchQuery(''); }}
                    className="w-full text-xs text-rose-400 hover:text-rose-300 py-1 border border-rose-900/50 rounded-lg hover:bg-rose-950/30 transition-colors"
                  >✕ Clear All Filters</button>
                )}
              </div>
            </>
          )}
        </div>

        {/* Search Bar - always visible */}
        <div className="relative flex items-center">
          <svg className="w-3.5 h-3.5 text-gray-500 absolute left-2.5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" /></svg>
          <input
            type="text"
            placeholder="Search reports..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="bg-gray-900 border border-gray-700 rounded-lg pl-8 pr-3 py-1.5 text-gray-300 placeholder-gray-600 text-xs w-44 focus:outline-none focus:border-gray-500"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-2 text-gray-500 hover:text-gray-300 text-xs">✕</button>
          )}
        </div>

        <div className="flex-1" />

        {/* Export Dropdown */}
        <div className="relative border-l border-gray-700 pl-3">
          <button
            onClick={() => setExportMenuOpen(o => !o)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-lg text-white font-medium transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export
            <span className="text-gray-400 ml-0.5">▾</span>
          </button>
          {exportMenuOpen && (
            <>
              {/* Backdrop */}
              <div className="fixed inset-0 z-10" onClick={() => setExportMenuOpen(false)} />
              {/* Menu */}
              <div className="absolute right-0 top-full mt-1.5 z-20 bg-gray-900 border border-gray-700 rounded-xl shadow-xl min-w-[140px] overflow-hidden">
                <button
                  onClick={() => { handleExport('csv'); setExportMenuOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
                >
                  <span className="text-gray-400">📄</span> CSV
                </button>
                <button
                  onClick={() => { handleExport('xlsx'); setExportMenuOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-emerald-400 hover:bg-gray-800 hover:text-emerald-300 transition-colors"
                >
                  <span>📊</span> Excel
                </button>
                <button
                  onClick={() => { handleExport('pdf'); setExportMenuOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-rose-400 hover:bg-gray-800 hover:text-rose-300 transition-colors"
                >
                  <span>📑</span> PDF
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Header */}
      <div className="bg-card border border-border p-6 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <FavoriteButton
              entityType="REPORT"
              entityId="operational-reports"
              title="Timeline, Revision & Operational Analytics"
              code="RPT-ANALYTICS"
              url="/reports"
              size="md"
            />
            <BarChart3 className="w-5 h-5 text-blue-400" /> Operational &amp; Performance Reports
          </h1>
          <p className="text-xs text-gray-400 mt-1">Role-based analytics, status history, approval logs, equipment performance, and employee productivity</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <div className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-2 text-center">
            <div className="text-[10px] text-gray-500 uppercase font-bold">Projects Logged</div>
            <div className="text-lg font-mono font-bold text-blue-400">{time?.totalProjectsLogged || 0}</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-2 text-center">
            <div className="text-[10px] text-gray-500 uppercase font-bold">Status Changes</div>
            <div className="text-lg font-mono font-bold text-purple-400">{time?.totalStatusChangesLogged || 0}</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-2 text-center">
            <div className="text-[10px] text-gray-500 uppercase font-bold">Approvals Logged</div>
            <div className="text-lg font-mono font-bold text-amber-400">{time?.totalApprovalsLogged || 0}</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-2 text-center">
            <div className="text-[10px] text-gray-500 uppercase font-bold">Activities Logged</div>
            <div className="text-lg font-mono font-bold text-emerald-400">{time?.totalActivitiesLogged || 0}</div>
          </div>
        </div>
      </div>

      {/* Report Selector */}
      <div className="bg-card border border-border rounded-xl px-4 py-3 flex flex-wrap items-center gap-x-1 gap-y-2">
        {/* Group: Operations */}
        <span className="text-[10px] text-gray-600 uppercase font-bold tracking-wider pr-1">Operations</span>
        {([
          { id: 'timelines', label: 'Timelines', color: 'blue' },
          { id: 'revisions', label: 'Revisions', color: 'rose' },
          { id: 'capacity', label: 'Capacity', color: 'indigo' },
          { id: 'approvals', label: 'Approvals', color: 'amber' },
          { id: 'attendance', label: 'Attendance', color: 'emerald' },
          { id: 'equipment', label: 'Equipment', color: 'cyan' },
        ] as const).filter(t => isReportTabAllowed(t.id)).map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
              activeTab === t.id
                ? `bg-${t.color}-600/20 text-${t.color}-300 border border-${t.color}-600/50`
                : 'text-gray-500 hover:text-gray-300 border border-transparent'
            }`}
          >{t.label}</button>
        ))}

        {/* Group: Business (Only if allowed tabs exist for role) */}
        {([
          { id: 'projects', label: 'Projects', color: 'blue' },
          { id: 'departments', label: 'Departments', color: 'indigo' },
          { id: 'clients', label: 'Clients', color: 'emerald' },
          { id: 'brands', label: 'Brands', color: 'cyan' },
          { id: 'products', label: 'Products', color: 'rose' },
        ] as const).filter(t => isReportTabAllowed(t.id)).length > 0 && (
          <>
            <div className="w-px h-4 bg-gray-700 mx-2" />
            <span className="text-[10px] text-gray-600 uppercase font-bold tracking-wider pr-1">Business</span>
            {([
              { id: 'projects', label: 'Projects', color: 'blue' },
              { id: 'departments', label: 'Departments', color: 'indigo' },
              { id: 'clients', label: 'Clients', color: 'emerald' },
              { id: 'brands', label: 'Brands', color: 'cyan' },
              { id: 'products', label: 'Products', color: 'rose' },
            ] as const).filter(t => isReportTabAllowed(t.id)).map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  activeTab === t.id
                    ? `bg-${t.color}-600/20 text-${t.color}-300 border border-${t.color}-600/50`
                    : 'text-gray-500 hover:text-gray-300 border border-transparent'
                }`}
              >{t.label}</button>
            ))}
          </>
        )}

        {/* Group: Performance */}
        {([
          { id: 'employee', label: 'Employees', color: 'purple' },
          { id: 'scripts', label: 'Scripts', color: 'blue' },
          { id: 'graphics', label: 'Graphics', color: 'amber' },
        ] as const).filter(t => isReportTabAllowed(t.id)).length > 0 && (
          <>
            <div className="w-px h-4 bg-gray-700 mx-2" />
            <span className="text-[10px] text-gray-600 uppercase font-bold tracking-wider pr-1">Performance</span>
            {([
              { id: 'employee', label: 'Employees', color: 'purple' },
              { id: 'scripts', label: 'Scripts', color: 'blue' },
              { id: 'graphics', label: 'Graphics', color: 'amber' },
            ] as const).filter(t => isReportTabAllowed(t.id)).map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  activeTab === t.id
                    ? `bg-${t.color}-600/20 text-${t.color}-300 border border-${t.color}-600/50`
                    : 'text-gray-500 hover:text-gray-300 border border-transparent'
                }`}
              >{t.label}</button>
            ))}
          </>
        )}
      </div>

      {/* TIMELINE PERFORMANCE REPORTS TAB */}
      {activeTab === 'timelines' && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-6 shadow-md">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-400" /> Operational Timeline &amp; History Analytics Matrix
            </h2>
            <span className="text-[11px] text-blue-300 font-mono font-bold">
              5 Mandatory Timeline Indicators Enforced
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 1. Project History */}
            <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4 space-y-3 max-h-96 overflow-y-auto">
              <h3 className="text-xs font-bold text-white flex items-center gap-2 sticky top-0 bg-gray-900/60 backdrop-blur-md pb-2">
                <Layers className="w-3.5 h-3.5 text-blue-400" /> Project History
              </h3>
              <div className="space-y-2">
                {time?.projectHistory?.length === 0 ? (
                  <p className="text-gray-500 italic text-[10px]">No project history available.</p>
                ) : (
                  time?.projectHistory?.map((p: any) => (
                    <div key={p.projectId} className="bg-gray-900 border border-gray-800 p-2.5 rounded-lg">
                      <div className="flex justify-between items-start mb-1">
                        <div>
                          <span className="text-blue-300 font-bold text-xs">{p.projectName}</span>
                          <span className="text-gray-500 text-[10px] ml-1">[{p.projectCode}]</span>
                        </div>
                        <span className="text-[9px] text-gray-400">{new Date(p.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div className="text-[10px] text-gray-400">Client: <span className="text-emerald-400">{p.clientName}</span> | Brand: <span className="text-cyan-400">{p.brandName}</span></div>
                      <div className="text-[10px] text-gray-400">Status: <span className="text-amber-300">{p.status}</span> | Creator: <span className="text-purple-300">{p.creatorName}</span></div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 2. Status Changes */}
            <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4 space-y-3 max-h-96 overflow-y-auto">
              <h3 className="text-xs font-bold text-white flex items-center gap-2 sticky top-0 bg-gray-900/60 backdrop-blur-md pb-2">
                <TrendingUp className="w-3.5 h-3.5 text-purple-400" /> Status Changes
              </h3>
              <div className="space-y-2">
                {!time?.statusChanges || time?.statusChanges?.length === 0 ? (
                  <p className="text-gray-500 italic text-[10px]">No status changes available.</p>
                ) : (
                  time?.statusChanges?.map((s: any) => (
                    <div key={s.id} className="bg-gray-900 border border-gray-800 p-2.5 rounded-lg border-l-2 border-l-purple-500">
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-white font-bold text-[11px]">{s.title}</span>
                        <span className="text-[9px] text-gray-400">{new Date(s.timestamp).toLocaleString()}</span>
                      </div>
                      <div className="text-[10px] text-gray-400">Event: <span className="text-purple-300 font-mono">{s.event}</span></div>
                      <div className="text-[10px] text-gray-400">Changed by: <span className="text-blue-300">{s.changedByName}</span></div>
                      <p className="text-[10px] text-gray-500 italic mt-1">{s.description}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 3. Approval History */}
            <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4 space-y-3 max-h-96 overflow-y-auto">
              <h3 className="text-xs font-bold text-white flex items-center gap-2 sticky top-0 bg-gray-900/60 backdrop-blur-md pb-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Approval History
              </h3>
              <div className="space-y-2">
                {!time?.approvalHistory || time?.approvalHistory?.length === 0 ? (
                  <p className="text-gray-500 italic text-[10px]">No approval history available.</p>
                ) : (
                  time?.approvalHistory?.map((a: any) => (
                    <div key={a.approvalId} className="bg-gray-900 border border-gray-800 p-2.5 rounded-lg">
                      <div className="flex justify-between items-start mb-1">
                        <div>
                          <span className="text-emerald-300 font-bold text-xs">{a.approvalType}</span>
                          <span className="text-gray-500 text-[10px] ml-1">({a.entityType})</span>
                        </div>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${a.status === 'APPROVED' ? 'bg-emerald-950 text-emerald-400' : a.status === 'REJECTED' ? 'bg-rose-950 text-rose-400' : 'bg-amber-950 text-amber-400'}`}>{a.status}</span>
                      </div>
                      <div className="text-[10px] text-gray-400">Project: <span className="text-white">{a.projectName}</span></div>
                      <div className="flex justify-between text-[10px] mt-1 pt-1 border-t border-gray-800 text-gray-500">
                        <span>Req: {a.requestedByName}</span>
                        <span>Rev: {a.reviewerName}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 4. Equipment History */}
            <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4 space-y-3 max-h-96 overflow-y-auto">
              <h3 className="text-xs font-bold text-white flex items-center gap-2 sticky top-0 bg-gray-900/60 backdrop-blur-md pb-2">
                <Zap className="w-3.5 h-3.5 text-cyan-400" /> Equipment History
              </h3>
              <div className="space-y-2">
                {!time?.equipmentHistory || time?.equipmentHistory?.length === 0 ? (
                  <p className="text-gray-500 italic text-[10px]">No equipment history available.</p>
                ) : (
                  time?.equipmentHistory?.map((e: any) => (
                    <div key={e.movementId} className="bg-gray-900 border border-gray-800 p-2.5 rounded-lg">
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-cyan-300 font-bold text-xs">{e.equipmentName}</span>
                        <span className="text-[9px] text-gray-400">{new Date(e.timestamp).toLocaleDateString()}</span>
                      </div>
                      <div className="text-[10px] text-gray-400">Action: <span className="text-amber-300 font-bold">{e.action}</span> | Handler: <span className="text-blue-300">{e.handlerName}</span></div>
                      <div className="text-[10px] text-gray-500 mt-0.5">Project: {e.projectName}</div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 5. Employee Activities */}
            <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4 space-y-3 max-h-96 overflow-y-auto lg:col-span-2">
              <h3 className="text-xs font-bold text-white flex items-center gap-2 sticky top-0 bg-gray-900/60 backdrop-blur-md pb-2">
                <Users className="w-3.5 h-3.5 text-amber-400" /> Employee Activities
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {!time?.employeeActivities || time?.employeeActivities?.length === 0 ? (
                  <p className="text-gray-500 italic text-[10px]">No employee activities available.</p>
                ) : (
                  time?.employeeActivities?.map((act: any) => (
                    <div key={act.logId} className="bg-gray-900 border border-gray-800 p-2.5 rounded-lg flex gap-2 items-start">
                      <div className="w-1.5 h-full min-h-8 bg-gray-700 rounded-full"></div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <span className="text-amber-300 font-bold text-xs">{act.userName}</span>
                          <span className="text-[9px] text-gray-400">{new Date(act.timestamp).toLocaleString()}</span>
                        </div>
                        <div className="text-[10px] text-white my-0.5">{act.description}</div>
                        <div className="text-[9px] text-gray-500 font-mono">Action: {act.action} | Entity: {act.entity}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REVISION PERFORMANCE REPORTS TAB */}
      {activeTab === 'revisions' && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-6 shadow-md">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-rose-400" /> Operational Rework &amp; Revision Analytics Matrix
            </h2>
            <span className="text-[11px] text-rose-300 font-mono font-bold">
              5 Mandatory Revision Indicators Enforced
            </span>
          </div>

          {/* 5 Mandatory Indicators Summary Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {/* 1. Total Revision Requests */}
            <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl space-y-1">
              <div className="text-[10px] text-gray-500 uppercase font-bold">1. Total Revision Requests</div>
              <div className="text-xl font-mono font-bold text-rose-400">{rev?.totalRevisionRequests || 0}</div>
              <p className="text-[9px] text-gray-400">Total project, script &amp; graphic reworks</p>
            </div>

            {/* 2. Employee Revision Count */}
            <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl space-y-1">
              <div className="text-[10px] text-gray-500 uppercase font-bold">2. Staff Tracked</div>
              <div className="text-xl font-mono font-bold text-purple-400">{rev?.totalEmployees || 0} Staff</div>
              <p className="text-[9px] text-gray-400">Employee revision distribution</p>
            </div>

            {/* 3. Project Revision Count */}
            <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl space-y-1">
              <div className="text-[10px] text-gray-500 uppercase font-bold">3. Projects Reworked</div>
              <div className="text-xl font-mono font-bold text-blue-400">{rev?.totalProjects || 0} Projects</div>
              <p className="text-[9px] text-gray-400">Project revision counts</p>
            </div>

            {/* 4. Brand Revision Count */}
            <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl space-y-1">
              <div className="text-[10px] text-gray-500 uppercase font-bold">4. Brands Tracked</div>
              <div className="text-xl font-mono font-bold text-cyan-400">{rev?.totalBrands || 0} Brands</div>
              <p className="text-[9px] text-gray-400">Brand revision counts</p>
            </div>

            {/* 5. Average Revisions per Project */}
            <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl space-y-1">
              <div className="text-[10px] text-gray-500 uppercase font-bold">5. Avg / Project</div>
              <div className="text-xl font-mono font-bold text-amber-400">{rev?.avgRevisionsPerProject || 0}</div>
              <p className="text-[9px] text-gray-400">Average revisions per project</p>
            </div>
          </div>

          {/* Breakdown Tables Grid: Project Revision Count & Brand Revision Count */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 3. Project Revision Count Table */}
            <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4 space-y-3">
              <h3 className="text-xs font-bold text-white flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-blue-400" /> Project Revision Breakdown
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-900 text-gray-400 uppercase text-[10px] tracking-wider border-b border-gray-800">
                      <th className="p-2">Project</th>
                      <th className="p-2">Brand</th>
                      <th className="p-2 text-center">Total Revisions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/60 font-medium">
                    {!rev?.projectRevisionBreakdown || rev.projectRevisionBreakdown.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="p-4 text-center text-gray-500 italic">No project revision data available.</td>
                      </tr>
                    ) : (
                      rev.projectRevisionBreakdown.slice(0, 10).map((p: any) => (
                        <tr key={p.projectId} className="hover:bg-gray-900/50">
                          <td className="p-2 font-bold text-white">
                            <span className="text-blue-400">{p.projectName}</span>
                            <span className="text-[10px] text-gray-500 ml-1">[{p.projectCode}]</span>
                          </td>
                          <td className="p-2 text-gray-400">{p.brandName}</td>
                          <td className="p-2 text-center font-mono font-bold text-rose-400">{p.totalRevisions}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 4. Brand Revision Count Table */}
            <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4 space-y-3">
              <h3 className="text-xs font-bold text-white flex items-center gap-2">
                <Tag className="w-3.5 h-3.5 text-cyan-400" /> Brand Revision Breakdown
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-900 text-gray-400 uppercase text-[10px] tracking-wider border-b border-gray-800">
                      <th className="p-2">Brand Name</th>
                      <th className="p-2 text-center">Projects</th>
                      <th className="p-2 text-center">Total Revisions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/60 font-medium">
                    {!rev?.brandRevisionBreakdown || rev.brandRevisionBreakdown.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="p-4 text-center text-gray-500 italic">No brand revision data available.</td>
                      </tr>
                    ) : (
                      rev.brandRevisionBreakdown.slice(0, 10).map((b: any) => (
                        <tr key={b.brandId} className="hover:bg-gray-900/50">
                          <td className="p-2 font-bold text-white">
                            <span className="text-cyan-300">{b.brandName}</span>
                            <span className="text-[10px] text-gray-500 ml-1">({b.shortCode})</span>
                          </td>
                          <td className="p-2 text-center font-mono text-gray-300">{b.totalProjects}</td>
                          <td className="p-2 text-center font-mono font-bold text-amber-400">{b.totalRevisions}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CAPACITY PERFORMANCE REPORTS TAB */}
      {activeTab === 'capacity' && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-6 shadow-md">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-400" /> Operational Workload Capacity &amp; Resource Utilization Matrix
            </h2>
            <span className="text-[11px] text-indigo-300 font-mono font-bold">
              5 Mandatory Capacity Indicators Enforced
            </span>
          </div>

          {/* 5 Mandatory Indicators Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {/* 1. Daily Capacity */}
            <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl space-y-1">
              <div className="text-[10px] text-gray-500 uppercase font-bold">1. Daily Capacity</div>
              <div className="text-xl font-mono font-bold text-indigo-400">{cap?.dailyCapacity || 0} pts</div>
              <p className="text-[9px] text-gray-400">Total daily output target</p>
            </div>

            {/* 2. Assigned Capacity */}
            <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl space-y-1">
              <div className="text-[10px] text-gray-500 uppercase font-bold">2. Assigned Capacity</div>
              <div className="text-xl font-mono font-bold text-blue-400">{cap?.assignedCapacity || 0} pts</div>
              <p className="text-[9px] text-gray-400">Allocated active workload</p>
            </div>

            {/* 3. Remaining Capacity */}
            <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl space-y-1">
              <div className="text-[10px] text-gray-500 uppercase font-bold">3. Remaining Capacity</div>
              <div className="text-xl font-mono font-bold text-emerald-400">{cap?.remainingCapacity || 0} pts</div>
              <p className="text-[9px] text-gray-400">Unallocated available capacity</p>
            </div>

            {/* 4. Overloaded Employees */}
            <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl space-y-1">
              <div className="text-[10px] text-gray-500 uppercase font-bold">4. Overloaded Staff</div>
              <div className="text-xl font-mono font-bold text-rose-400">{cap?.overloadedEmployeesCount || 0} Staff</div>
              <p className="text-[9px] text-gray-400">Workload &gt; 100% capacity</p>
            </div>

            {/* 5. Underutilized Employees */}
            <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl space-y-1">
              <div className="text-[10px] text-gray-500 uppercase font-bold">5. Underutilized Staff</div>
              <div className="text-xl font-mono font-bold text-amber-400">{cap?.underutilizedEmployeesCount || 0} Staff</div>
              <p className="text-[9px] text-gray-400">Workload &lt; 60% capacity</p>
            </div>
          </div>

          {/* Employee Capacity Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-900 text-gray-400 uppercase text-[10px] tracking-wider border-b border-gray-800">
                  <th className="p-3">Employee Name</th>
                  <th className="p-3 text-center">Daily Capacity Target</th>
                  <th className="p-3 text-center">Assigned Capacity</th>
                  <th className="p-3 text-center">Remaining Capacity</th>
                  <th className="p-3 text-center">Capacity Utilization %</th>
                  <th className="p-3 text-center">Workload Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60 font-medium">
                {!cap?.employeeDetails || cap.employeeDetails.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-gray-500 italic">No capacity records available.</td>
                  </tr>
                ) : (
                  cap.employeeDetails.map((emp: any) => (
                    <tr key={emp.userId} className="hover:bg-gray-900/50 transition-colors">
                      <td className="p-3 font-bold text-white">
                        <div>{emp.employeeName}</div>
                        <div className="text-[10px] text-gray-400 font-normal">{emp.designation} • {emp.department}</div>
                      </td>

                      {/* 1. Daily Capacity */}
                      <td className="p-3 text-center font-mono font-bold text-indigo-300">{emp.dailyCapacity} pts</td>

                      {/* 2. Assigned Capacity */}
                      <td className="p-3 text-center font-mono font-bold text-blue-400">{emp.assignedCapacity} pts</td>

                      {/* 3. Remaining Capacity */}
                      <td className="p-3 text-center font-mono font-bold text-emerald-400">{emp.remainingCapacity} pts</td>

                      {/* Utilization % */}
                      <td className="p-3 text-center font-mono font-bold">
                        <div className="flex flex-col items-center gap-1">
                          <span>{emp.utilizationRate}%</span>
                          <div className="w-16 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                emp.isOverloaded ? 'bg-rose-500' : emp.isUnderutilized ? 'bg-amber-500' : 'bg-emerald-500'
                              }`}
                              style={{ width: `${Math.min(100, emp.utilizationRate)}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>

                      {/* 4 & 5. Overloaded / Underutilized Status */}
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          emp.isOverloaded
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            : emp.isUnderutilized
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        }`}>
                          {emp.isOverloaded ? 'OVERLOADED' : emp.isUnderutilized ? 'UNDERUTILIZED' : 'BALANCED'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* APPROVAL PERFORMANCE REPORTS TAB */}
      {activeTab === 'approvals' && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-6 shadow-md">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-amber-400" /> Operational Approvals &amp; Quality Governance Matrix
            </h2>
            <span className="text-[11px] text-amber-300 font-mono font-bold">
              6 Mandatory Approval Indicators Enforced
            </span>
          </div>

          {/* 6 Mandatory Indicator Cards Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* 1. Pending Technical Reviews */}
            <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl space-y-1">
              <div className="text-[10px] text-gray-500 uppercase font-bold">Pending Tech Reviews</div>
              <div className="text-xl font-mono font-bold text-amber-400">{app?.pendingTechnicalReviews || 0}</div>
              <p className="text-[9px] text-gray-400">Technical manager queue</p>
            </div>

            {/* 2. Pending Media Reviews */}
            <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl space-y-1">
              <div className="text-[10px] text-gray-500 uppercase font-bold">Pending Media Reviews</div>
              <div className="text-xl font-mono font-bold text-purple-400">{app?.pendingMediaReviews || 0}</div>
              <p className="text-[9px] text-gray-400">Media manager queue</p>
            </div>

            {/* 3. Pending Client Confirmations */}
            <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl space-y-1">
              <div className="text-[10px] text-gray-500 uppercase font-bold">Pending Client Confirm</div>
              <div className="text-xl font-mono font-bold text-emerald-400">{app?.pendingClientConfirmations || 0}</div>
              <p className="text-[9px] text-gray-400">Deliverables awaiting client</p>
            </div>

            {/* 4. Average Approval Time */}
            <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl space-y-1">
              <div className="text-[10px] text-gray-500 uppercase font-bold">Avg Approval Time</div>
              <div className="text-xl font-mono font-bold text-cyan-300">{app?.avgApprovalTimeFormatted || 'N/A'}</div>
              <p className="text-[9px] text-gray-400">Request to decision duration</p>
            </div>

            {/* 5. Approval Success Rate */}
            <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl space-y-1">
              <div className="text-[10px] text-gray-500 uppercase font-bold">Approval Success Rate</div>
              <div className="text-xl font-mono font-bold text-emerald-400">{app?.approvalSuccessRatePercentage || 100}%</div>
              <p className="text-[9px] text-gray-400">Approved vs total decided</p>
            </div>

            {/* 6. Revision Requests */}
            <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl space-y-1">
              <div className="text-[10px] text-gray-500 uppercase font-bold">Revision Requests</div>
              <div className="text-xl font-mono font-bold text-rose-400">{app?.revisionRequests || 0}</div>
              <p className="text-[9px] text-gray-400">Rejections &amp; modifications</p>
            </div>
          </div>
        </div>
      )}

      {/* EQUIPMENT PERFORMANCE REPORTS TAB */}
      {activeTab === 'equipment' && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4 shadow-md">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-400" /> Equipment Asset Performance, History &amp; Utilization Matrix
            </h2>
            <span className="text-[11px] text-cyan-300 font-mono font-bold">
              6 Mandatory Equipment Indicators Enforced
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-900 text-gray-400 uppercase text-[10px] tracking-wider border-b border-gray-800">
                  <th className="p-3">Equipment Name &amp; Category</th>
                  <th className="p-3">Equipment Availability</th>
                  <th className="p-3 text-center">Equipment Utilization</th>
                  <th className="p-3 text-center">Equipment Downtime</th>
                  <th className="p-3 text-center">Checkout History</th>
                  <th className="p-3 text-center">Maintenance History</th>
                  <th className="p-3 text-center">Damage History</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60 font-medium">
                {equipmentReports.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-gray-500 italic">No equipment performance records available.</td>
                  </tr>
                ) : (
                  equipmentReports.map((eq) => (
                    <tr key={eq.equipmentId} className="hover:bg-gray-900/50 transition-colors">
                      {/* Equipment Name & Category */}
                      <td className="p-3 font-bold text-white">
                        <div className="text-cyan-400 font-bold flex items-center gap-1.5">
                          {eq.name}
                          <span className="text-[10px] text-gray-500 font-mono">[{eq.serialNumber}]</span>
                        </div>
                        <div className="text-[10px] text-gray-400 font-normal">{eq.brand} {eq.model} • Category: {eq.category}</div>
                      </td>

                      {/* 1. Equipment Availability */}
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          eq.equipmentAvailabilityStatus === 'AVAILABLE'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : eq.equipmentAvailabilityStatus === 'ISSUED' || eq.equipmentAvailabilityStatus === 'RESERVED'
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                            : eq.equipmentAvailabilityStatus === 'MAINTENANCE' || eq.equipmentAvailabilityStatus === 'DAMAGED'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            : 'bg-gray-800 text-gray-400'
                        }`}>
                          {eq.equipmentAvailabilityStatus}
                        </span>
                      </td>

                      {/* 2. Equipment Utilization */}
                      <td className="p-3 text-center font-mono font-bold">
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-cyan-300">{eq.equipmentUtilizationPercentage}%</span>
                          <div className="w-16 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                            <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${eq.equipmentUtilizationPercentage}%` }}></div>
                          </div>
                        </div>
                      </td>

                      {/* 3. Equipment Downtime */}
                      <td className="p-3 text-center font-mono font-bold text-indigo-300">
                        {eq.equipmentDowntimeFormatted}
                      </td>

                      {/* 4. Checkout History */}
                      <td className="p-3 text-center font-mono font-bold">
                        <span className="px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800 text-[11px]">
                          {eq.checkoutHistoryCount} Checkouts
                        </span>
                      </td>

                      {/* 5. Maintenance History */}
                      <td className="p-3 text-center font-mono font-bold">
                        <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800 text-[11px]">
                          {eq.maintenanceHistoryCount} Records
                        </span>
                      </td>

                      {/* 6. Damage History */}
                      <td className="p-3 text-center font-mono font-bold">
                        <span className={`px-2 py-0.5 rounded text-[11px] ${
                          eq.damageHistoryCount > 0
                            ? 'bg-rose-950 text-rose-300 border border-rose-800'
                            : 'bg-gray-900 text-gray-400 border border-gray-800'
                        }`}>
                          {eq.damageHistoryCount} Reports
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ATTENDANCE PERFORMANCE REPORTS TAB */}
      {activeTab === 'attendance' && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4 shadow-md">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-border pb-3">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" /> Staff Attendance Analytics &amp; Timeframe Matrix
              </h2>
              <p className="text-[11px] text-gray-400 mt-0.5">Filter attendance by Daily, Weekly, Monthly, or Custom Date Range</p>
            </div>

            {/* Timeframe Filter Switcher */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex bg-gray-900 border border-gray-800 rounded-lg p-0.5 text-xs font-medium">
                {(['daily', 'weekly', 'monthly', 'custom'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => {
                      setAttendancePeriod(p);
                      if (p !== 'custom') fetchAttendance(p);
                    }}
                    className={`px-3 py-1 rounded-md capitalize transition-all ${
                      attendancePeriod === p ? 'bg-emerald-600 text-white font-bold' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>

              {/* Custom Date Range Picker */}
              {attendancePeriod === 'custom' && (
                <div className="flex items-center gap-1.5 bg-gray-900 border border-gray-800 p-1 rounded-lg">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-gray-800 text-white text-xs px-2 py-1 rounded border border-gray-700 focus:outline-none"
                  />
                  <span className="text-gray-500">to</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="bg-gray-800 text-white text-xs px-2 py-1 rounded border border-gray-700 focus:outline-none"
                  />
                  <button
                    onClick={() => fetchAttendance('custom', startDate, endDate)}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded text-xs transition-colors"
                  >
                    Apply
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-900 text-gray-400 uppercase text-[10px] tracking-wider border-b border-gray-800">
                  <th className="p-3">Employee Name</th>
                  <th className="p-3 text-center">Present Days</th>
                  <th className="p-3 text-center">Absent Days</th>
                  <th className="p-3 text-center">Half Days</th>
                  <th className="p-3 text-center">Late Entries</th>
                  <th className="p-3 text-center">Attendance %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60 font-medium">
                {!attendanceData?.report || attendanceData.report.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-gray-500 italic">No attendance records found for this timeframe.</td>
                  </tr>
                ) : (
                  attendanceData.report.map((emp: any) => (
                    <tr key={emp.userId} className="hover:bg-gray-900/50 transition-colors">
                      {/* Employee Name */}
                      <td className="p-3 font-bold text-white">
                        <div>{emp.employeeName}</div>
                        <div className="text-[10px] text-gray-400 font-normal">{emp.designation} • {emp.department}</div>
                      </td>

                      {/* 1. Present Days */}
                      <td className="p-3 text-center font-mono font-bold text-emerald-400">{emp.presentDays}</td>

                      {/* 2. Absent Days */}
                      <td className="p-3 text-center font-mono font-bold text-rose-400">{emp.absentDays}</td>

                      {/* 3. Half Days */}
                      <td className="p-3 text-center font-mono font-bold text-cyan-300">{emp.halfDays}</td>

                      {/* 4. Late Entries */}
                      <td className="p-3 text-center font-mono font-bold text-amber-300">{emp.lateEntries}</td>

                      {/* 5. Attendance Percentage */}
                      <td className="p-3 text-center font-mono font-bold">
                        <span className={`px-2 py-0.5 rounded text-[11px] ${
                          emp.attendancePercentage >= 90
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : emp.attendancePercentage >= 75
                            ? 'bg-amber-950 text-amber-300 border border-amber-800'
                            : 'bg-rose-950 text-rose-300 border border-rose-800'
                        }`}>
                          {emp.attendancePercentage}%
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PROJECT PERFORMANCE REPORTS TAB */}
      {activeTab === 'projects' && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4 shadow-md">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-400" /> Project Operational Status &amp; Timeline Matrix
            </h2>
            <span className="text-[11px] text-blue-300 font-mono font-bold">
              8 Mandatory Project Indicators Enforced
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-900 text-gray-400 uppercase text-[10px] tracking-wider border-b border-gray-800">
                  <th className="p-3">Project &amp; Client</th>
                  <th className="p-3">Project Status</th>
                  <th className="p-3 text-center">Completion %</th>
                  <th className="p-3 text-center">Pending Scripts</th>
                  <th className="p-3 text-center">Pending Graphics</th>
                  <th className="p-3 text-center">Pending Reviews</th>
                  <th className="p-3">Equipment Used</th>
                  <th className="p-3">Assigned Employees</th>
                  <th className="p-3">Timeline Summary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60 font-medium">
                {projectReports.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-6 text-center text-gray-500 italic">No project performance records available.</td>
                  </tr>
                ) : (
                  projectReports.map((p) => (
                    <tr key={p.projectId} className="hover:bg-gray-900/50 transition-colors">
                      {/* Project & Client */}
                      <td className="p-3 font-bold text-white">
                        <div className="text-blue-400 font-bold flex items-center gap-1.5">
                          {p.projectName}
                          <span className="text-[10px] text-gray-500 font-mono">[{p.projectCode}]</span>
                        </div>
                        <div className="text-[10px] text-gray-400 font-normal">Brand: {p.brandName} • Client: {p.clientName}</div>
                      </td>

                      {/* 1. Project Status */}
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          p.projectStatus === 'COMPLETED'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : p.projectStatus === 'IN_PROGRESS' || p.projectStatus === 'POST_PRODUCTION'
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                            : p.projectStatus?.includes('WAITING') || p.projectStatus?.includes('REVISION')
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-gray-800 text-gray-400'
                        }`}>
                          {p.projectStatus}
                        </span>
                      </td>

                      {/* 2. Completion Percentage */}
                      <td className="p-3 text-center font-mono font-bold">
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-emerald-400">{p.completionPercentage}%</span>
                          <div className="w-16 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${p.completionPercentage}%` }}></div>
                          </div>
                        </div>
                      </td>

                      {/* 3. Pending Scripts */}
                      <td className="p-3 text-center font-mono font-bold text-purple-300">{p.pendingScripts}</td>

                      {/* 4. Pending Graphics */}
                      <td className="p-3 text-center font-mono font-bold text-amber-300">{p.pendingGraphics}</td>

                      {/* 5. Pending Reviews */}
                      <td className="p-3 text-center font-mono font-bold text-rose-400">{p.pendingReviews}</td>

                      {/* 6. Equipment Used */}
                      <td className="p-3 text-gray-300">
                        <div className="font-semibold text-cyan-300">{p.equipmentUsedCount} Items</div>
                        <div className="text-[10px] text-gray-500 truncate max-w-[120px]">{p.equipmentUsedSummary}</div>
                      </td>

                      {/* 7. Assigned Employees */}
                      <td className="p-3 text-gray-300">
                        <div className="font-semibold text-indigo-300">{p.assignedEmployeesCount} Staff</div>
                        <div className="text-[10px] text-gray-500 truncate max-w-[120px]">{p.assignedEmployeeNames}</div>
                      </td>

                      {/* 8. Timeline Summary */}
                      <td className="p-3 text-gray-300">
                        <div className="text-[10px] font-mono text-gray-300">{p.timelineSummary}</div>
                        <div className="text-[9px] text-gray-500 font-normal">Location: {p.shootLocation} ({p.shootType})</div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* DEPARTMENT PERFORMANCE REPORTS TAB */}
      {activeTab === 'departments' && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4 shadow-md">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-400" /> Department Operational Performance &amp; Capacity Matrix
            </h2>
            <span className="text-[11px] text-indigo-300 font-mono font-bold">
              7 Mandatory Department Indicators Enforced
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-900 text-gray-400 uppercase text-[10px] tracking-wider border-b border-gray-800">
                  <th className="p-3">Department Name</th>
                  <th className="p-3 text-center">Total Employees</th>
                  <th className="p-3 text-center">Active Tasks</th>
                  <th className="p-3 text-center">Completed Tasks</th>
                  <th className="p-3 text-center">Total Outputs</th>
                  <th className="p-3 text-center">Capacity Utilization</th>
                  <th className="p-3 text-center">Productivity</th>
                  <th className="p-3 text-center">Pending Work</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60 font-medium">
                {deptReports.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-gray-500 italic">No department performance records available.</td>
                  </tr>
                ) : (
                  deptReports.map((d) => (
                    <tr key={d.departmentId} className="hover:bg-gray-900/50 transition-colors">
                      {/* Department Name */}
                      <td className="p-3 font-bold text-white">
                        <div className="text-indigo-400 font-bold">{d.departmentName}</div>
                        <div className="text-[10px] text-gray-400 font-normal">{d.description || 'Media Operations Division'}</div>
                      </td>

                      {/* 1. Total Employees */}
                      <td className="p-3 text-center font-mono font-bold text-blue-300">{d.totalEmployees}</td>

                      {/* 2. Active Tasks */}
                      <td className="p-3 text-center font-mono font-bold text-purple-300">{d.activeTasks}</td>

                      {/* 3. Completed Tasks */}
                      <td className="p-3 text-center font-mono font-bold text-emerald-400">{d.completedTasks}</td>

                      {/* 4. Total Outputs */}
                      <td className="p-3 text-center font-mono font-bold text-cyan-300">{d.totalOutputs}</td>

                      {/* 5. Capacity Utilization */}
                      <td className="p-3 text-center font-mono font-bold">
                        <span className={`px-2 py-0.5 rounded text-[11px] ${
                          d.capacityUtilizationPercentage > 100
                            ? 'bg-rose-950 text-rose-300 border border-rose-800'
                            : d.capacityUtilizationPercentage < 50
                            ? 'bg-amber-950 text-amber-300 border border-amber-800'
                            : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        }`}>
                          {d.capacityUtilizationPercentage}%
                        </span>
                      </td>

                      {/* 6. Productivity */}
                      <td className="p-3 text-center font-mono font-bold">
                        <span className={`px-2 py-0.5 rounded text-[11px] ${
                          d.productivityPercentage >= 100
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : 'bg-amber-950 text-amber-300 border border-amber-800'
                        }`}>
                          {d.productivityPercentage}%
                        </span>
                      </td>

                      {/* 7. Pending Work */}
                      <td className="p-3 text-center font-mono font-bold text-amber-300">{d.pendingWork}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PRODUCT PERFORMANCE REPORTS TAB */}
      {activeTab === 'products' && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4 shadow-md">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Package className="w-4 h-4 text-rose-400" /> Product Performance &amp; Media Output Matrix
            </h2>
            <span className="text-[11px] text-rose-300 font-mono font-bold">
              8 Mandatory Product Indicators Enforced
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-900 text-gray-400 uppercase text-[10px] tracking-wider border-b border-gray-800">
                  <th className="p-3">Product Name &amp; Brand</th>
                  <th className="p-3 text-center">Total Productions</th>
                  <th className="p-3 text-center">Videos</th>
                  <th className="p-3 text-center">Posters</th>
                  <th className="p-3 text-center">Carousels</th>
                  <th className="p-3 text-center">Awareness Campaigns</th>
                  <th className="p-3 text-center">Advertisement Campaigns</th>
                  <th className="p-3 text-center">Pending Deliverables</th>
                  <th className="p-3 text-center">Completed Deliverables</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60 font-medium">
                {productReports.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-6 text-center text-gray-500 italic">No product performance records available.</td>
                  </tr>
                ) : (
                  productReports.map((p) => (
                    <tr key={p.productId} className="hover:bg-gray-900/50 transition-colors">
                      {/* Product Name & Brand */}
                      <td className="p-3 font-bold text-white">
                        <div className="text-rose-400 font-bold flex items-center gap-1.5">
                          {p.productName}
                          <span className="text-[10px] text-gray-500 font-mono">[{p.productCode}]</span>
                        </div>
                        <div className="text-[10px] text-gray-400 font-normal">Brand: {p.brandName} • Category: {p.category}</div>
                      </td>

                      {/* 1. Total Productions */}
                      <td className="p-3 text-center font-mono font-bold text-blue-300">{p.totalProductions}</td>

                      {/* 2. Videos */}
                      <td className="p-3 text-center font-mono font-bold text-purple-300">{p.videos}</td>

                      {/* 3. Posters */}
                      <td className="p-3 text-center font-mono font-bold text-amber-300">{p.posters}</td>

                      {/* 4. Carousels */}
                      <td className="p-3 text-center font-mono font-bold text-cyan-300">{p.carousels}</td>

                      {/* 5. Awareness Campaigns */}
                      <td className="p-3 text-center font-mono font-bold text-indigo-300">{p.awarenessCampaigns}</td>

                      {/* 6. Advertisement Campaigns */}
                      <td className="p-3 text-center font-mono font-bold text-rose-300">{p.advertisementCampaigns}</td>

                      {/* 7. Pending Deliverables */}
                      <td className="p-3 text-center font-mono font-bold text-amber-400">{p.pendingDeliverables}</td>

                      {/* 8. Completed Deliverables */}
                      <td className="p-3 text-center font-mono font-bold text-emerald-400">{p.completedDeliverables}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CLIENT PERFORMANCE REPORTS TAB */}
      {activeTab === 'clients' && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4 shadow-md">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-400" /> Client Operational Performance &amp; Production Matrix
            </h2>
            <span className="text-[11px] text-emerald-300 font-mono font-bold">
              7 Mandatory Client Indicators Enforced
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-900 text-gray-400 uppercase text-[10px] tracking-wider border-b border-gray-800">
                  <th className="p-3">Client &amp; Company</th>
                  <th className="p-3 text-center">Total Projects</th>
                  <th className="p-3 text-center">Total Deliverables</th>
                  <th className="p-3 text-center">Pending Approvals</th>
                  <th className="p-3 text-center">Completed Projects</th>
                  <th className="p-3 text-center">Avg Project Duration</th>
                  <th className="p-3 text-center">Revision Requests</th>
                  <th className="p-3">Production Summary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60 font-medium">
                {clientReports.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-gray-500 italic">No client performance records available.</td>
                  </tr>
                ) : (
                  clientReports.map((c) => (
                    <tr key={c.clientId} className="hover:bg-gray-900/50 transition-colors">
                      {/* Client & Company */}
                      <td className="p-3 font-bold text-white">
                        <div className="text-emerald-400 font-bold">{c.clientName}</div>
                        <div className="text-[10px] text-gray-400 font-normal">{c.companyName} • {c.email}</div>
                      </td>

                      {/* 1. Total Projects */}
                      <td className="p-3 text-center font-mono font-bold text-blue-300">{c.totalProjects}</td>

                      {/* 2. Total Deliverables */}
                      <td className="p-3 text-center font-mono font-bold text-purple-300">{c.totalDeliverables}</td>

                      {/* 3. Pending Approvals */}
                      <td className="p-3 text-center font-mono font-bold text-amber-300">{c.pendingApprovals}</td>

                      {/* 4. Completed Projects */}
                      <td className="p-3 text-center font-mono font-bold text-emerald-400">{c.completedProjects}</td>

                      {/* 5. Average Project Duration */}
                      <td className="p-3 text-center font-mono font-bold text-indigo-300">
                        {c.avgProjectDurationFormatted || 'N/A'}
                      </td>

                      {/* 6. Revision Requests */}
                      <td className="p-3 text-center font-mono font-bold text-rose-400">{c.revisionRequests || 0}x</td>

                      {/* 7. Production Summary */}
                      <td className="p-3">
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="px-1.5 py-0.5 bg-blue-950 text-blue-300 border border-blue-800 rounded text-[9px]">
                            Prog: {c.productionSummary?.IN_PROGRESS || 0}
                          </span>
                          <span className="px-1.5 py-0.5 bg-amber-950 text-amber-300 border border-amber-800 rounded text-[9px]">
                            Review: {c.productionSummary?.WAITING_FOR_REVIEW || 0}
                          </span>
                          <span className="px-1.5 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-800 rounded text-[9px]">
                            Done: {c.productionSummary?.COMPLETED || 0}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* BRAND INDEPENDENT PERFORMANCE REPORTS TAB */}
      {activeTab === 'brands' && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4 shadow-md">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Tag className="w-4 h-4 text-cyan-400" /> Independent Brand Performance &amp; Production Matrix
            </h2>
            <span className="text-[11px] text-cyan-300 font-mono font-bold">
              8 Mandatory Brand Indicators Enforced
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-900 text-gray-400 uppercase text-[10px] tracking-wider border-b border-gray-800">
                  <th className="p-3">Brand &amp; Client</th>
                  <th className="p-3 text-center">Total Projects</th>
                  <th className="p-3 text-center">Total Deliverables</th>
                  <th className="p-3 text-center">Total Outputs</th>
                  <th className="p-3">Production Status</th>
                  <th className="p-3 text-center">Pending Deliverables</th>
                  <th className="p-3 text-center">Completion Rate</th>
                  <th className="p-3 text-center">Revision Count</th>
                  <th className="p-3 text-center">Avg Delivery Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60 font-medium">
                {brandReports.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-6 text-center text-gray-500 italic">No brand performance records available.</td>
                  </tr>
                ) : (
                  brandReports.map((b) => (
                    <tr key={b.brandId} className="hover:bg-gray-900/50 transition-colors">
                      {/* Brand & Client */}
                      <td className="p-3 font-bold text-white">
                        <div className="flex items-center gap-1.5">
                          <span className="text-cyan-400 font-bold">{b.brandName}</span>
                          <span className="text-[10px] text-gray-500 font-mono">[{b.shortCode}]</span>
                        </div>
                        <div className="text-[10px] text-gray-400 font-normal">Client: {b.clientName}</div>
                      </td>

                      {/* 1. Total Projects */}
                      <td className="p-3 text-center font-mono font-bold text-blue-300">{b.totalProjects}</td>

                      {/* 2. Total Deliverables */}
                      <td className="p-3 text-center font-mono font-bold text-purple-300">{b.totalDeliverables}</td>

                      {/* 3. Total Outputs */}
                      <td className="p-3 text-center font-mono font-bold text-emerald-400">{b.totalOutputs}</td>

                      {/* 4. Production Status */}
                      <td className="p-3">
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="px-1.5 py-0.5 bg-blue-950 text-blue-300 border border-blue-800 rounded text-[9px]">
                            Prog: {b.productionStatus?.IN_PROGRESS || 0}
                          </span>
                          <span className="px-1.5 py-0.5 bg-amber-950 text-amber-300 border border-amber-800 rounded text-[9px]">
                            Review: {b.productionStatus?.WAITING_FOR_REVIEW || 0}
                          </span>
                          <span className="px-1.5 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-800 rounded text-[9px]">
                            Done: {b.productionStatus?.COMPLETED || 0}
                          </span>
                        </div>
                      </td>

                      {/* 5. Pending Deliverables */}
                      <td className="p-3 text-center font-mono font-bold text-amber-300">{b.pendingDeliverables}</td>

                      {/* 6. Completion Rate */}
                      <td className="p-3 text-center font-mono font-bold">
                        <span className={`px-2 py-0.5 rounded text-[11px] ${
                          b.completionRatePercentage >= 75
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : 'bg-amber-950 text-amber-300 border border-amber-800'
                        }`}>
                          {b.completionRatePercentage}%
                        </span>
                      </td>

                      {/* 7. Revision Count */}
                      <td className="p-3 text-center font-mono font-bold text-rose-400">{b.revisionCount || 0}x</td>

                      {/* 8. Average Delivery Time */}
                      <td className="p-3 text-center font-mono font-bold text-indigo-300">
                        {b.avgDeliveryTimeFormatted || 'N/A'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* EMPLOYEE-WISE PERFORMANCE REPORTS TAB */}
      {activeTab === 'employee' && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4 shadow-md">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-400" /> Employee-Wise Operational Performance Matrix
            </h2>
            <span className="text-[11px] text-purple-300 font-mono font-bold">
              10 Mandatory Operational Indicators Enforced
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-900 text-gray-400 uppercase text-[10px] tracking-wider border-b border-gray-800">
                  <th className="p-3">Employee Name</th>
                  <th className="p-3">Today's Attendance</th>
                  <th className="p-3 text-center">Assigned Tasks</th>
                  <th className="p-3 text-center">Completed Tasks</th>
                  <th className="p-3 text-center">Pending Tasks</th>
                  <th className="p-3 text-center">Daily Target</th>
                  <th className="p-3 text-center">Actual Output</th>
                  <th className="p-3 text-center">Achievement %</th>
                  <th className="p-3 text-center">Revision Count</th>
                  <th className="p-3 text-center">Completion Rate %</th>
                  <th className="p-3 text-center">Overall Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60 font-medium">
                {employeeReports.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-6 text-center text-gray-500 italic">No employee performance data available.</td>
                  </tr>
                ) : (
                  employeeReports.map((emp) => (
                    <tr key={emp.userId} className="hover:bg-gray-900/50 transition-colors">
                      {/* 1. Employee Name */}
                      <td className="p-3 font-bold text-white">
                        <div>{emp.employeeName || emp.name}</div>
                        <div className="text-[10px] text-gray-400 font-normal">{emp.designation} • {emp.department}</div>
                      </td>

                      {/* 2. Attendance */}
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          emp.attendance === 'PRESENT'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : emp.attendance === 'LATE'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : emp.attendance === 'HALF_DAY'
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                            : emp.attendance === 'ABSENT'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            : 'bg-gray-800 text-gray-400'
                        }`}>
                          {emp.attendance || 'NOT MARKED'}
                        </span>
                      </td>

                      {/* 3. Assigned Tasks */}
                      <td className="p-3 text-center font-mono font-bold text-blue-300">{emp.assignedTasksCount ?? emp.assignedTasks}</td>

                      {/* 4. Completed Tasks */}
                      <td className="p-3 text-center font-mono font-bold text-emerald-400">{emp.completedTasksCount ?? emp.completedTasks}</td>

                      {/* 9. Pending Tasks */}
                      <td className="p-3 text-center font-mono font-bold text-amber-300">{emp.pendingTasksCount ?? emp.pendingTasks}</td>

                      {/* 5. Daily Target */}
                      <td className="p-3 text-center font-mono text-gray-300">{emp.dailyTarget}</td>

                      {/* 6. Actual Output */}
                      <td className="p-3 text-center font-mono font-bold text-cyan-300">{emp.actualDailyOutput ?? emp.actualOutput}</td>

                      {/* 7. Target Achievement Percentage */}
                      <td className="p-3 text-center font-mono font-bold">
                        <span className={`px-2 py-0.5 rounded text-[11px] ${
                          (emp.targetAchievementPercentage ?? emp.achievementPercentage) >= 100
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : 'bg-amber-950 text-amber-300 border border-amber-800'
                        }`}>
                          {emp.targetAchievementPercentage ?? emp.achievementPercentage}%
                        </span>
                      </td>

                      {/* 8. Revision Count */}
                      <td className="p-3 text-center font-mono font-bold text-rose-400">{emp.revisionCount || 0}x</td>

                      {/* 10. Completion Rate */}
                      <td className="p-3 text-center font-mono font-bold text-indigo-300 font-mono">
                        {emp.completionRatePercentage || emp.completionRate || 0}%
                      </td>

                      {/* 11. Overall Score */}
                      <td className="p-3 text-center font-mono font-bold">
                        <span className={`px-2 py-0.5 rounded text-[11px] ${
                          emp.overallProductivityScore >= 80 ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                          emp.overallProductivityScore >= 50 ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                          'bg-rose-950 text-rose-400 border border-rose-800'
                        }`}>
                          {emp.overallProductivityScore}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SCRIPT ANALYTICS TAB */}
      {activeTab === 'scripts' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card border border-border p-5 rounded-xl space-y-3">
              <h2 className="font-bold text-white text-sm flex items-center gap-2"><Users className="w-4 h-4 text-blue-400" /> 1. Employee Productivity Reports</h2>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {(scriptAnalytics?.employeeProductivity || []).length === 0 ? (
                  <p className="text-gray-500 italic">No employee assignments recorded yet.</p>
                ) : (
                  (scriptAnalytics?.employeeProductivity || []).map((emp: any) => (
                    <div key={emp.userId} className="flex items-center justify-between bg-gray-900 border border-gray-800 p-2.5 rounded-lg">
                      <div>
                        <strong className="text-white text-xs block">{emp.name}</strong>
                        <span className="text-[10px] text-gray-400">{emp.role}</span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] font-mono">
                        <div><span className="text-gray-500">Assigned:</span> <strong className="text-blue-300">{emp.assignedCount}</strong></div>
                        <div><span className="text-gray-500">Completed:</span> <strong className="text-emerald-400">{emp.completedCount}</strong></div>
                        <div><span className="text-gray-500">Revisions:</span> <strong className="text-amber-300">{emp.revisionCount}</strong></div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="bg-card border border-border p-5 rounded-xl space-y-3">
              <h2 className="font-bold text-white text-sm flex items-center gap-2"><Building2 className="w-4 h-4 text-purple-400" /> 2. Brand Performance Reports</h2>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {(scriptAnalytics?.brandPerformance || []).length === 0 ? (
                  <p className="text-gray-500 italic">No brand script data available.</p>
                ) : (
                  (scriptAnalytics?.brandPerformance || []).map((b: any) => (
                    <div key={b.brandId} className="flex items-center justify-between bg-gray-900 border border-gray-800 p-2.5 rounded-lg">
                      <div>
                        <strong className="text-purple-300 text-xs block">[{b.shortCode}] {b.name}</strong>
                        <span className="text-[10px] text-gray-400">{b.deliverableCount} Deliverables Planned</span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] font-mono">
                        <div><span className="text-gray-500">Scripts:</span> <strong className="text-white">{b.scriptCount}</strong></div>
                        <div><span className="text-gray-500">Completed:</span> <strong className="text-emerald-400">{b.completedCount}</strong></div>
                        <div><span className="text-gray-500">Revisions:</span> <strong className="text-amber-300">{b.totalRevisions}</strong></div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card border border-border p-5 rounded-xl space-y-3">
              <h2 className="font-bold text-white text-sm flex items-center gap-2"><Layers className="w-4 h-4 text-cyan-400" /> 3. Product Performance Reports</h2>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {(scriptAnalytics?.productPerformance || []).length === 0 ? (
                  <p className="text-gray-500 italic">No product script data available.</p>
                ) : (
                  (scriptAnalytics?.productPerformance || []).map((p: any) => (
                    <div key={p.productId} className="flex items-center justify-between bg-gray-900 border border-gray-800 p-2.5 rounded-lg">
                      <div>
                        <strong className="text-cyan-300 text-xs block">{p.name}</strong>
                        <span className="text-[10px] text-gray-400">Code: {p.productCode}</span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] font-mono">
                        <div><span className="text-gray-500">Scripts:</span> <strong className="text-white">{p.scriptCount}</strong></div>
                        <div><span className="text-gray-500">Completed:</span> <strong className="text-emerald-400">{p.completedCount}</strong></div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="bg-card border border-border p-5 rounded-xl space-y-3">
              <h2 className="font-bold text-white text-sm flex items-center gap-2"><TrendingUp className="w-4 h-4 text-emerald-400" /> 4. Language-wise Reports</h2>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                {(scriptAnalytics?.languageWiseReports || []).map((l: any) => (
                  <div key={l.language} className="p-2.5 bg-gray-900 border border-gray-800 rounded-lg space-y-1">
                    <span className="font-bold text-emerald-300 block">{l.language}</span>
                    <div className="text-gray-400 text-[10px]">Total: <strong className="text-white">{l.totalScripts}</strong> | Done: <strong className="text-emerald-400">{l.completedScripts}</strong></div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card border border-border p-5 rounded-xl space-y-3">
              <h2 className="font-bold text-white text-sm flex items-center gap-2"><PieChart className="w-4 h-4 text-amber-400" /> 5. Category-wise Reports</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {(scriptAnalytics?.categoryWiseReports || []).map((c: any) => (
                  <div key={c.category} className="p-2.5 bg-gray-900 border border-gray-800 rounded-lg space-y-1">
                    <span className="font-semibold text-amber-300 block text-[11px]">{c.category}</span>
                    <div className="text-xl font-bold text-white font-mono">{c.totalScripts}</div>
                    <div className="text-[9px] text-gray-400">Completed: {c.completedScripts} | Revisions: {c.totalRevisions}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-card border border-border p-5 rounded-xl space-y-3">
              <h2 className="font-bold text-white text-sm flex items-center gap-2"><BarChart3 className="w-4 h-4 text-blue-400" /> 6. Production Capacity Reports</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-[11px]">
                <div className="p-2.5 bg-gray-900 border border-gray-800 rounded-lg"><span className="text-gray-400 text-[10px] block">In Pipeline</span><strong className="text-lg text-blue-400 font-mono">{scriptAnalytics?.productionCapacity?.totalPipelineScripts || 0}</strong></div>
                <div className="p-2.5 bg-gray-900 border border-gray-800 rounded-lg"><span className="text-gray-400 text-[10px] block">In Production</span><strong className="text-lg text-yellow-400 font-mono">{scriptAnalytics?.productionCapacity?.inProductionCount || 0}</strong></div>
                <div className="p-2.5 bg-gray-900 border border-gray-800 rounded-lg"><span className="text-gray-400 text-[10px] block">Ready</span><strong className="text-lg text-purple-400 font-mono">{scriptAnalytics?.productionCapacity?.readyCount || 0}</strong></div>
                <div className="p-2.5 bg-gray-900 border border-gray-800 rounded-lg"><span className="text-gray-400 text-[10px] block">Deliverables</span><strong className="text-lg text-cyan-400 font-mono">{scriptAnalytics?.productionCapacity?.totalDeliverablesPlanned || 0}</strong></div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card border border-border p-5 rounded-xl space-y-3">
              <h2 className="font-bold text-white text-sm flex items-center gap-2"><RotateCcw className="w-4 h-4 text-red-400" /> 7. Revision Reports</h2>
              <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                <div className="p-2.5 bg-gray-900 border border-gray-800 rounded-lg"><span className="text-gray-400 text-[10px] block">Total Revisions</span><strong className="text-lg text-amber-300 font-mono">{scriptAnalytics?.revisionReports?.totalRevisions || 0}</strong></div>
                <div className="p-2.5 bg-gray-900 border border-gray-800 rounded-lg"><span className="text-gray-400 text-[10px] block">Avg / Script</span><strong className="text-lg text-blue-400 font-mono">{scriptAnalytics?.revisionReports?.avgRevisionsPerScript || 0}</strong></div>
                <div className="p-2.5 bg-gray-900 border border-gray-800 rounded-lg"><span className="text-gray-400 text-[10px] block">Pending Revisions</span><strong className="text-lg text-red-400 font-mono">{scriptAnalytics?.revisionReports?.pendingRevisionRequestCount || 0}</strong></div>
              </div>
            </div>
            <div className="bg-card border border-border p-5 rounded-xl space-y-3">
              <h2 className="font-bold text-white text-sm flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-emerald-400" /> 8. Approval Reports</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-[11px]">
                <div className="p-2 bg-gray-900 border border-gray-800 rounded-lg"><span className="text-gray-400 text-[10px] block">Tech Approved</span><strong className="text-purple-300 font-mono">{scriptAnalytics?.approvalReports?.technicalApprovedCount || 0}</strong></div>
                <div className="p-2 bg-gray-900 border border-gray-800 rounded-lg"><span className="text-gray-400 text-[10px] block">Media Approved</span><strong className="text-indigo-300 font-mono">{scriptAnalytics?.approvalReports?.mediaApprovedCount || 0}</strong></div>
                <div className="p-2 bg-gray-900 border border-gray-800 rounded-lg"><span className="text-gray-400 text-[10px] block">Client Confirmed</span><strong className="text-cyan-300 font-mono">{scriptAnalytics?.approvalReports?.clientConfirmedCount || 0}</strong></div>
                <div className="p-2 bg-gray-900 border border-gray-800 rounded-lg"><span className="text-gray-400 text-[10px] block">Fully Approved</span><strong className="text-emerald-400 font-mono">{scriptAnalytics?.approvalReports?.fullyApprovedCount || 0}</strong></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* GRAPHIC REQUIREMENTS ANALYTICS TAB */}
      {activeTab === 'graphics' && (
        <div className="space-y-6">
          {/* 1. Employee Productivity */}
          <div className="bg-card border border-amber-900/30 p-5 rounded-xl space-y-3">
            <h2 className="font-bold text-white text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-400" /> 1. Employee Productivity Reports
              <span className="ml-1 text-[10px] text-amber-400 bg-amber-950 border border-amber-800 px-2 py-0.5 rounded-full font-semibold">Graphic Reqs</span>
            </h2>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {(gr?.employeeProductivity || []).length === 0 ? (
                <p className="text-gray-500 italic">No employee assignments in graphic requirements yet.</p>
              ) : (
                (gr?.employeeProductivity || []).map((emp: any) => (
                  <div key={emp.userId} className="flex items-center justify-between bg-gray-900 border border-gray-800 p-2.5 rounded-lg">
                    <div>
                      <strong className="text-white text-xs block">{emp.name}</strong>
                      <span className="text-[10px] text-gray-400">{emp.role}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] font-mono">
                      <div><span className="text-gray-500">Reqs:</span> <strong className="text-blue-300">{emp.assignedCount}</strong></div>
                      <div><span className="text-gray-500">In Prog:</span> <strong className="text-yellow-300">{emp.inProgressCount}</strong></div>
                      <div><span className="text-gray-500">Done:</span> <strong className="text-emerald-400">{emp.completedCount}</strong></div>
                      <div><span className="text-gray-500">Rev:</span> <strong className="text-amber-300">{emp.revisionCount}</strong></div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 2 & 3: Brand + Product */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card border border-border p-5 rounded-xl space-y-3">
              <h2 className="font-bold text-white text-sm flex items-center gap-2"><Building2 className="w-4 h-4 text-purple-400" /> 2. Brand Reports</h2>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {(gr?.brandReports || []).length === 0 ? (
                  <p className="text-gray-500 italic">No brand graphic data available.</p>
                ) : (
                  (gr?.brandReports || []).map((b: any) => (
                    <div key={b.brandId} className="bg-gray-900 border border-gray-800 p-2.5 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <strong className="text-purple-300 text-xs">[{b.shortCode}] {b.name}</strong>
                        <span className="text-[10px] text-gray-400 font-mono">{b.totalReqs} reqs</span>
                      </div>
                      <div className="w-full bg-gray-800 rounded-full h-1.5">
                        <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: b.totalReqs > 0 ? `${(b.completedCount / b.totalReqs) * 100}%` : '0%' }} />
                      </div>
                      <div className="flex justify-between text-[10px] mt-1 text-gray-500">
                        <span>Done: <strong className="text-emerald-400">{b.completedCount}</strong></span>
                        <span>In Prog: <strong className="text-yellow-400">{b.inProgressCount}</strong></span>
                        <span>Rev: <strong className="text-amber-300">{b.totalRevisions}</strong></span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="bg-card border border-border p-5 rounded-xl space-y-3">
              <h2 className="font-bold text-white text-sm flex items-center gap-2"><Package className="w-4 h-4 text-cyan-400" /> 3. Product Reports</h2>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {(gr?.productReports || []).length === 0 ? (
                  <p className="text-gray-500 italic">No product graphic data available.</p>
                ) : (
                  (gr?.productReports || []).map((p: any) => (
                    <div key={p.productId} className="bg-gray-900 border border-gray-800 p-2.5 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <strong className="text-cyan-300 text-xs">{p.name}</strong>
                        <span className="text-[10px] text-gray-400 font-mono">{p.totalReqs} reqs</span>
                      </div>
                      <div className="w-full bg-gray-800 rounded-full h-1.5">
                        <div className="bg-cyan-500 h-1.5 rounded-full" style={{ width: p.totalReqs > 0 ? `${(p.completedCount / p.totalReqs) * 100}%` : '0%' }} />
                      </div>
                      <div className="flex justify-between text-[10px] mt-1 text-gray-500">
                        <span>Done: <strong className="text-emerald-400">{p.completedCount}</strong></span>
                        <span>Rev: <strong className="text-amber-300">{p.totalRevisions}</strong></span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* 4. Requirement Type Reports */}
          <div className="bg-card border border-border p-5 rounded-xl space-y-3">
            <h2 className="font-bold text-white text-sm flex items-center gap-2"><Tag className="w-4 h-4 text-amber-400" /> 4. Requirement Type Reports</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {(gr?.typeReports || []).map((t: any, i: number) => (
                  <div key={t.type} className="p-2.5 bg-gray-900 border border-gray-800 rounded-lg">
                    <span className="font-semibold block text-[11px]" style={{ color: BRAND_COLORS[i % BRAND_COLORS.length] }}>{t.type}</span>
                    <div className="text-2xl font-bold text-white font-mono">{t.totalReqs}</div>
                    <div className="text-[9px] text-gray-400">Done: {t.completedCount} | Rev: {t.totalRevisions}</div>
                  </div>
                ))}
              </div>
              {typeChartData.length > 0 && (
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={typeChartData} margin={{ top: 4, right: 8, left: -20, bottom: 4 }}>
                      <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 9 }} />
                      <YAxis tick={{ fill: '#6b7280', fontSize: 9 }} />
                      <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: '8px', fontSize: '11px' }} labelStyle={{ color: '#e5e7eb' }} itemStyle={{ color: '#d1d5db' }} />
                      <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                        {typeChartData.map((entry: any, index: number) => (
                          <Cell key={index} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          {/* 5. Capacity Reports */}
          <div className="bg-card border border-border p-5 rounded-xl space-y-3">
            <h2 className="font-bold text-white text-sm flex items-center gap-2"><Zap className="w-4 h-4 text-yellow-400" /> 5. Capacity Reports</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 text-center text-[11px]">
              {[
                { label: 'Total', value: gr?.capacityReports?.totalRequirements || 0, color: 'text-white' },
                { label: 'Draft', value: gr?.capacityReports?.draftCount || 0, color: 'text-gray-400' },
                { label: 'Ready', value: gr?.capacityReports?.readyCount || 0, color: 'text-blue-400' },
                { label: 'Assigned', value: gr?.capacityReports?.assignedCount || 0, color: 'text-purple-400' },
                { label: 'In Progress', value: gr?.capacityReports?.inProgressCount || 0, color: 'text-yellow-400' },
                { label: 'Tech Review', value: gr?.capacityReports?.waitingTechnicalReview || 0, color: 'text-amber-400' },
                { label: 'Media Review', value: gr?.capacityReports?.waitingMediaReview || 0, color: 'text-cyan-400' },
                { label: 'Client Review', value: gr?.capacityReports?.waitingClientConfirmation || 0, color: 'text-indigo-400' },
                { label: 'Revision Req.', value: gr?.capacityReports?.revisionRequested || 0, color: 'text-orange-400' },
                { label: 'Completed', value: gr?.capacityReports?.completedCount || 0, color: 'text-emerald-400' },
              ].map((stat) => (
                <div key={stat.label} className="p-2.5 bg-gray-900 border border-gray-800 rounded-lg">
                  <span className="text-gray-400 text-[10px] block">{stat.label}</span>
                  <strong className={`text-lg font-mono ${stat.color}`}>{stat.value}</strong>
                </div>
              ))}
            </div>
          </div>

          {/* 6 & 7: Revision + Approval */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card border border-border p-5 rounded-xl space-y-3">
              <h2 className="font-bold text-white text-sm flex items-center gap-2"><RotateCcw className="w-4 h-4 text-red-400" /> 6. Revision Reports</h2>
              <div className="grid grid-cols-2 gap-2 text-center text-[11px]">
                <div className="p-2.5 bg-gray-900 border border-gray-800 rounded-lg"><span className="text-gray-400 text-[10px] block">Total Revisions</span><strong className="text-2xl text-amber-300 font-mono">{gr?.revisionReports?.totalRevisions || 0}</strong></div>
                <div className="p-2.5 bg-gray-900 border border-gray-800 rounded-lg"><span className="text-gray-400 text-[10px] block">Avg / Req</span><strong className="text-2xl text-blue-400 font-mono">{gr?.revisionReports?.avgRevisionsPerReq || '0'}</strong></div>
                <div className="p-2.5 bg-gray-900 border border-gray-800 rounded-lg"><span className="text-gray-400 text-[10px] block">Pending</span><strong className="text-2xl text-red-400 font-mono">{gr?.revisionReports?.pendingRevisions || 0}</strong></div>
                <div className="p-2.5 bg-gray-900 border border-gray-800 rounded-lg text-left px-3">
                  <div className="text-[10px] text-gray-500 font-semibold uppercase">Distribution</div>
                  <div className="text-[10px]">0 rev: <strong className="text-emerald-400">{gr?.revisionReports?.distribution?.zeroRevisions || 0}</strong></div>
                  <div className="text-[10px]">1-2 rev: <strong className="text-amber-400">{gr?.revisionReports?.distribution?.oneToTwoRevisions || 0}</strong></div>
                  <div className="text-[10px]">3+ rev: <strong className="text-red-400">{gr?.revisionReports?.distribution?.threePlusRevisions || 0}</strong></div>
                </div>
              </div>
              {(gr?.revisionReports?.topRevised || []).length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[10px] text-gray-500 font-semibold uppercase">Top Revised Requirements</div>
                  {(gr?.revisionReports?.topRevised || []).map((r: any) => (
                    <div key={r.id} className="flex items-center justify-between bg-gray-900 border border-gray-800 px-3 py-1.5 rounded-lg">
                      <div>
                        <span className="font-mono text-amber-400 text-[10px]">{r.id}</span>
                        <span className="text-white text-[11px] ml-2">{r.name}</span>
                      </div>
                      <span className="text-red-400 font-mono font-bold">{r.revisions}x</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-card border border-border p-5 rounded-xl space-y-3">
              <h2 className="font-bold text-white text-sm flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-emerald-400" /> 7. Approval Reports</h2>
              <div className="space-y-2">
                {[
                  { label: 'Production Completed', value: gr?.approvalReports?.productionCompleted || 0, color: 'bg-blue-500' },
                  { label: 'Technical Approved', value: gr?.approvalReports?.technicalApproved || 0, color: 'bg-purple-500' },
                  { label: 'Media Manager Approved', value: gr?.approvalReports?.mediaManagerApproved || 0, color: 'bg-cyan-500' },
                  { label: 'Client Confirmed', value: gr?.approvalReports?.clientConfirmed || 0, color: 'bg-indigo-500' },
                  { label: 'Fully Approved', value: gr?.approvalReports?.fullyApproved || 0, color: 'bg-emerald-500' },
                ].map((stat) => {
                  const total = gr?.summary?.total || 1;
                  return (
                    <div key={stat.label} className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-gray-300">{stat.label}</span>
                        <span className="font-mono text-white">{stat.value} / {total}</span>
                      </div>
                      <div className="w-full bg-gray-800 rounded-full h-1.5">
                        <div className={`${stat.color} h-1.5 rounded-full transition-all`} style={{ width: total > 0 ? `${Math.min(100, (stat.value / total) * 100)}%` : '0%' }} />
                      </div>
                    </div>
                  );
                })}
                <div className="pt-2 border-t border-gray-800 grid grid-cols-3 gap-2 text-center text-[10px]">
                  <div className="p-2 bg-amber-950/60 border border-amber-800/40 rounded-lg"><span className="text-gray-400 block">Waiting Tech</span><strong className="text-amber-300 font-mono">{gr?.approvalReports?.waitingTechnicalReview || 0}</strong></div>
                  <div className="p-2 bg-cyan-950/60 border border-cyan-800/40 rounded-lg"><span className="text-gray-400 block">Waiting Media</span><strong className="text-cyan-300 font-mono">{gr?.approvalReports?.waitingMediaReview || 0}</strong></div>
                  <div className="p-2 bg-indigo-950/60 border border-indigo-800/40 rounded-lg"><span className="text-gray-400 block">Waiting Client</span><strong className="text-indigo-300 font-mono">{gr?.approvalReports?.waitingClientConfirmation || 0}</strong></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
