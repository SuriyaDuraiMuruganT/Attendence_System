import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import {
  AdminStats,
  TodaySummaryItem,
  EmployeeProfile,
  CorrectionRequest,
  NetworkSetting,
  AuditLog,
  AttendanceRecord
} from '../types';
import {
  Users,
  UserCheck,
  AlertCircle,
  FileCheck2,
  PlusCircle,
  Check,
  X,
  Shield,
  Trash2,
  History,
  FileText
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'today' | 'corrections' | 'employees' | 'history' | 'network' | 'audit'>('today');
  
  // Data States
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [todayAttendance, setTodayAttendance] = useState<TodaySummaryItem[]>([]);
  const [corrections, setCorrections] = useState<CorrectionRequest[]>([]);
  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [networkSettings, setNetworkSettings] = useState<NetworkSetting[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  
  // History Filter
  const [historyList, setHistoryList] = useState<AttendanceRecord[]>([]);
  const [histMonth, setHistMonth] = useState<number>(new Date().getMonth() + 1);
  const [histYear, setHistYear] = useState<number>(new Date().getFullYear());
  const [histEmpId, setHistEmpId] = useState<string>('');

  // UI state
  const [_loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // New Employee Modal
  const [showCreateEmpModal, setShowCreateEmpModal] = useState<boolean>(false);
  const [newEmpId, setNewEmpId] = useState<string>('');
  const [newEmpName, setNewEmpName] = useState<string>('');
  const [newEmpEmail, setNewEmpEmail] = useState<string>('');
  const [newEmpDept, setNewEmpDept] = useState<string>('Engineering');
  const [newEmpDesig, setNewEmpDesig] = useState<string>('Software Engineer');
  const [newEmpJoining, setNewEmpJoining] = useState<string>(new Date().toISOString().split('T')[0]);
  const [newEmpPassword, setNewEmpPassword] = useState<string>('Employee@123');
  const [empSubmitting, setEmpSubmitting] = useState<boolean>(false);

  // Review Correction Modal
  const [reviewingReq, setReviewingReq] = useState<CorrectionRequest | null>(null);
  const [reviewAction, setReviewAction] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [adminRemarks, setAdminRemarks] = useState<string>('');
  const [reviewSubmitting, setReviewSubmitting] = useState<boolean>(false);

  // New Network Rule
  const [newRuleName, setNewRuleName] = useState<string>('');
  const [newRuleCidr, setNewRuleCidr] = useState<string>('');
  const [newRuleDesc, setNewRuleDesc] = useState<string>('');

  const loadData = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);

      const [statsRes, todayRes, corrRes, empRes, netRes, auditRes] = await Promise.all([
        api.get<AdminStats>('/admin/stats'),
        api.get<TodaySummaryItem[]>('/admin/today'),
        api.get<CorrectionRequest[]>('/admin/corrections'),
        api.get<EmployeeProfile[]>('/admin/employees'),
        api.get<NetworkSetting[]>('/network/settings'),
        api.get<AuditLog[]>('/admin/audit-logs'),
      ]);

      setStats(statsRes);
      setTodayAttendance(todayRes);
      setCorrections(corrRes);
      setEmployees(empRes);
      setNetworkSettings(netRes);
      setAuditLogs(auditRes);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to fetch admin dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      let query = `/admin/history?month=${histMonth}&year=${histYear}`;
      if (histEmpId) query += `&employee_id=${histEmpId}`;
      const data = await api.get<AttendanceRecord[]>(query);
      setHistoryList(data);
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory();
    }
  }, [activeTab, histMonth, histYear, histEmpId]);

  // Create Employee
  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmpSubmitting(true);
    setErrorMsg(null);
    try {
      await api.post('/admin/employees', {
        employee_id: newEmpId.trim(),
        full_name: newEmpName.trim(),
        email: newEmpEmail.trim(),
        department: newEmpDept.trim(),
        designation: newEmpDesig.trim(),
        joining_date: newEmpJoining,
        password: newEmpPassword,
      });

      setSuccessMsg(`Employee account ${newEmpId} created successfully.`);
      setShowCreateEmpModal(false);
      // Reset form
      setNewEmpId('');
      setNewEmpName('');
      setNewEmpEmail('');
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setEmpSubmitting(false);
    }
  };

  // Toggle Employee Status
  const handleToggleStatus = async (emp: EmployeeProfile) => {
    try {
      setErrorMsg(null);
      await api.patch(`/admin/employees/${emp.id}/status`, { is_active: !emp.is_active });
      setSuccessMsg(`Employee ${emp.employee_id} status updated to ${!emp.is_active ? 'Active' : 'Inactive'}.`);
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  // Review Correction
  const handleReviewCorrection = async () => {
    if (!reviewingReq) return;
    setReviewSubmitting(true);
    setErrorMsg(null);
    try {
      await api.post(`/admin/corrections/${reviewingReq.id}/review`, {
        status: reviewAction,
        admin_remarks: adminRemarks.trim() || undefined,
      });

      setSuccessMsg(`Correction request #${reviewingReq.id} marked as ${reviewAction}.`);
      setReviewingReq(null);
      setAdminRemarks('');
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setReviewSubmitting(false);
    }
  };

  // Add Network Rule
  const handleAddNetworkRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleName.trim() || !newRuleCidr.trim()) return;
    try {
      await api.post('/network/settings', {
        name: newRuleName.trim(),
        ip_or_cidr: newRuleCidr.trim(),
        description: newRuleDesc.trim() || undefined,
      });
      setSuccessMsg(`Office network rule ${newRuleCidr} added.`);
      setNewRuleName('');
      setNewRuleCidr('');
      setNewRuleDesc('');
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  // Delete Network Rule
  const handleDeleteNetworkRule = async (id: number) => {
    if (!confirm('Are you sure you want to remove this office network rule?')) return;
    try {
      await api.delete(`/network/settings/${id}`);
      setSuccessMsg('Office network rule deleted.');
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const formatTime = (isoString?: string | null) => {
    if (!isoString) return '--:--';
    return new Date(isoString).toLocaleTimeString('en-US', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <div className="min-h-screen bg-cream-100 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* Alerts */}
        {errorMsg && (
          <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-600 rounded-r-lg flex items-start space-x-3 text-red-800 shadow-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-600" />
            <div>
              <p className="font-semibold text-sm">Error</p>
              <p className="text-xs mt-0.5">{errorMsg}</p>
            </div>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-4 bg-emerald-50 border-l-4 border-forest rounded-r-lg flex items-start space-x-3 text-forest-dark shadow-sm">
            <Check className="w-5 h-5 flex-shrink-0 mt-0.5 text-forest" />
            <div>
              <p className="font-semibold text-sm">Action Complete</p>
              <p className="text-xs mt-0.5">{successMsg}</p>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="bg-white rounded-xl border border-cream-300 p-6 shadow-sm mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <span className="text-xs uppercase tracking-wider text-purple-700 font-bold">
              Administrator Console
            </span>
            <h1 className="text-2xl font-bold text-slate-900 mt-0.5">
              Attendance & Workforce Administration
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Company Attendance Rules: IN: 10:00 AM (Late after 10:30 AM) • OUT: 05:30 PM
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowCreateEmpModal(true)}
              className="inline-flex items-center px-4 py-2.5 bg-forest hover:bg-forest-dark text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
            >
              <PlusCircle className="w-4 h-4 mr-2" />
              <span>Create Employee Account</span>
            </button>
          </div>
        </div>

        {/* Top 6 Summary Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
          <div className="bg-white p-4 rounded-xl border border-cream-300 shadow-sm">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Total Staff
            </span>
            <span className="text-2xl font-bold font-mono text-slate-900 mt-1 block">
              {stats?.total_employees ?? '--'}
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5 block">Active accounts</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-cream-300 shadow-sm">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Present Today
            </span>
            <span className="text-2xl font-bold font-mono text-forest mt-1 block">
              {stats?.present_today ?? '--'}
            </span>
            <span className="text-[10px] text-emerald-600 mt-0.5 block">Checked In</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-cream-300 shadow-sm">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Absent / Missing
            </span>
            <span className="text-2xl font-bold font-mono text-red-600 mt-1 block">
              {stats?.absent_missing_today ?? '--'}
            </span>
            <span className="text-[10px] text-red-500 mt-0.5 block">Not marked yet</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-cream-300 shadow-sm">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Currently Working
            </span>
            <span className="text-2xl font-bold font-mono text-blue-600 mt-1 block">
              {stats?.currently_working ?? '--'}
            </span>
            <span className="text-[10px] text-blue-500 mt-0.5 block">In office now</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-cream-300 shadow-sm">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Incomplete Shift
            </span>
            <span className="text-2xl font-bold font-mono text-amber-600 mt-1 block">
              {stats?.incomplete_attendance ?? '--'}
            </span>
            <span className="text-[10px] text-amber-500 mt-0.5 block">Missing OUT in past</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-cream-300 shadow-sm">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Pending Claims
            </span>
            <span className="text-2xl font-bold font-mono text-purple-600 mt-1 block">
              {stats?.pending_corrections ?? '--'}
            </span>
            <span className="text-[10px] text-purple-500 mt-0.5 block">Corrections to review</span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-cream-300 mb-6 flex space-x-2 overflow-x-auto">
          {[
            { id: 'today', label: "Today's Attendance", icon: UserCheck },
            { id: 'corrections', label: `Pending Corrections (${stats?.pending_corrections || 0})`, icon: FileCheck2 },
            { id: 'employees', label: `Employees (${employees.length})`, icon: Users },
            { id: 'history', label: 'Attendance History', icon: History },
            { id: 'network', label: 'Office Network Settings', icon: Shield },
            { id: 'audit', label: 'Admin Audit Logs', icon: FileText },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 py-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 whitespace-nowrap transition-colors ${
                  isActive
                    ? 'border-forest text-forest bg-white/60 rounded-t-lg'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: Today's Attendance Overview */}
        {activeTab === 'today' && (
          <div className="bg-white rounded-xl border border-cream-300 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-cream-200 bg-cream-50/50 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Today's Employee Attendance Overview</h3>
                <p className="text-xs text-slate-500 mt-0.5">Real-time status for all registered staff</p>
              </div>
              <button
                onClick={loadData}
                className="px-3 py-1.5 border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold rounded-lg text-slate-700"
              >
                Refresh
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-cream-200 text-xs">
                <thead className="bg-cream-100 text-slate-600 font-semibold">
                  <tr>
                    <th className="px-4 py-3 text-left">Employee</th>
                    <th className="px-4 py-3 text-left">Department</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">IN Time</th>
                    <th className="px-4 py-3 text-left">OUT Time</th>
                    <th className="px-4 py-3 text-left">Working Hours</th>
                    <th className="px-4 py-3 text-left">Late / Early Reason</th>
                    <th className="px-4 py-3 text-left">Client IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cream-200 bg-white">
                  {todayAttendance.map((emp) => (
                    <tr key={emp.employee_id} className="hover:bg-cream-50">
                      <td className="px-4 py-3">
                        <span className="font-bold text-slate-900 block">{emp.full_name}</span>
                        <span className="text-[11px] text-slate-500 font-mono">{emp.employee_id}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{emp.department}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          emp.status === 'COMPLETED'
                            ? 'bg-blue-100 text-blue-800'
                            : emp.status === 'WORKING'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {emp.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono font-medium text-slate-700">
                        {formatTime(emp.in_time)}
                        {emp.in_status === 'LATE' && (
                          <span className="block text-[10px] font-semibold text-amber-600">LATE</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono font-medium text-slate-700">
                        {formatTime(emp.out_time)}
                        {emp.out_status === 'EARLY' && (
                          <span className="block text-[10px] font-semibold text-pink-600">EARLY</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-slate-800">
                        {emp.total_hours ? `${emp.total_hours} hrs` : '--'}
                      </td>
                      <td className="px-4 py-3 max-w-xs text-slate-600">
                        {emp.late_reason && (
                          <div className="text-amber-700">
                            <strong>Late:</strong> {emp.late_reason}
                          </div>
                        )}
                        {emp.early_departure_reason && (
                          <div className="text-pink-700">
                            <strong>Early:</strong> {emp.early_departure_reason}
                          </div>
                        )}
                        {!emp.late_reason && !emp.early_departure_reason && '--'}
                      </td>
                      <td className="px-4 py-3 text-slate-400 font-mono text-[11px]">
                        {emp.client_ip || '--'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: Attendance Corrections Review */}
        {activeTab === 'corrections' && (
          <div className="bg-white rounded-xl border border-cream-300 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-cream-200 bg-cream-50/50">
              <h3 className="text-sm font-bold text-slate-900">Attendance Correction Requests</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Staff requests submitted within the 3-day window for missed attendance.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-cream-200 text-xs">
                <thead className="bg-cream-100 text-slate-600 font-semibold">
                  <tr>
                    <th className="px-4 py-3 text-left">Employee</th>
                    <th className="px-4 py-3 text-left">Missed Date</th>
                    <th className="px-4 py-3 text-left">Historical Claimed Shift</th>
                    <th className="px-4 py-3 text-left">Reason Given</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Admin Remarks</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cream-200 bg-white">
                  {corrections.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-400 italic">
                        No correction requests found.
                      </td>
                    </tr>
                  ) : (
                    corrections.map((req) => (
                      <tr key={req.id} className="hover:bg-cream-50">
                        <td className="px-4 py-3">
                          <span className="font-bold text-slate-900 block">{req.employee_name}</span>
                          <span className="text-[11px] text-slate-500 font-mono">{req.employee_code}</span>
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-900">{req.request_date}</td>
                        <td className="px-4 py-3 font-mono text-slate-700">
                          {formatTime(req.claimed_in_time)} – {formatTime(req.claimed_out_time)}
                        </td>
                        <td className="px-4 py-3 text-slate-600 max-w-xs">{req.reason}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            req.status === 'APPROVED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : req.status === 'REJECTED'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {req.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500 italic">{req.admin_remarks || '--'}</td>
                        <td className="px-4 py-3 text-right">
                          {req.status === 'PENDING' ? (
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                onClick={() => {
                                  setReviewingReq(req);
                                  setReviewAction('APPROVED');
                                  setAdminRemarks('');
                                }}
                                className="px-2.5 py-1 bg-forest text-white rounded text-xs font-semibold hover:bg-forest-dark transition-colors"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => {
                                  setReviewingReq(req);
                                  setReviewAction('REJECTED');
                                  setAdminRemarks('');
                                }}
                                className="px-2.5 py-1 bg-red-600 text-white rounded text-xs font-semibold hover:bg-red-700 transition-colors"
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px]">Reviewed</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: Employee Management */}
        {activeTab === 'employees' && (
          <div className="bg-white rounded-xl border border-cream-300 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-cream-200 bg-cream-50/50 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Employee Accounts Directory</h3>
                <p className="text-xs text-slate-500 mt-0.5">Manage accounts, activation status and credentials</p>
              </div>
              <button
                onClick={() => setShowCreateEmpModal(true)}
                className="px-3 py-1.5 bg-forest text-white rounded-lg text-xs font-semibold hover:bg-forest-dark"
              >
                + New Employee
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-cream-200 text-xs">
                <thead className="bg-cream-100 text-slate-600 font-semibold">
                  <tr>
                    <th className="px-4 py-3 text-left">Employee ID</th>
                    <th className="px-4 py-3 text-left">Name</th>
                    <th className="px-4 py-3 text-left">Email</th>
                    <th className="px-4 py-3 text-left">Department</th>
                    <th className="px-4 py-3 text-left">Designation</th>
                    <th className="px-4 py-3 text-left">Joining Date</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-right">Toggle Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cream-200 bg-white">
                  {employees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-cream-50">
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">{emp.employee_id}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">{emp.full_name}</td>
                      <td className="px-4 py-3 text-slate-600">{emp.email}</td>
                      <td className="px-4 py-3 text-slate-600">{emp.department}</td>
                      <td className="px-4 py-3 text-slate-600">{emp.designation}</td>
                      <td className="px-4 py-3 text-slate-500">{emp.joining_date}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          emp.is_active ? 'bg-emerald-100 text-forest' : 'bg-red-100 text-red-700'
                        }`}>
                          {emp.is_active ? 'Active' : 'Deactivated'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleToggleStatus(emp)}
                          className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                            emp.is_active
                              ? 'border border-red-300 text-red-600 hover:bg-red-50'
                              : 'border border-forest text-forest hover:bg-emerald-50'
                          }`}
                        >
                          {emp.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: History */}
        {activeTab === 'history' && (
          <div className="bg-white rounded-xl border border-cream-300 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-cream-200 bg-cream-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Attendance Records Archive</h3>
                <p className="text-xs text-slate-500 mt-0.5">Filter by employee, month and year</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={histEmpId}
                  onChange={(e) => setHistEmpId(e.target.value)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-700"
                >
                  <option value="">All Employees</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.employee_id} - {e.full_name}
                    </option>
                  ))}
                </select>

                <select
                  value={histMonth}
                  onChange={(e) => setHistMonth(Number(e.target.value))}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-700"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>
                      {new Date(2026, m - 1).toLocaleString('default', { month: 'long' })}
                    </option>
                  ))}
                </select>

                <select
                  value={histYear}
                  onChange={(e) => setHistYear(Number(e.target.value))}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-700"
                >
                  {[2024, 2025, 2026, 2027].map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-cream-200 text-xs">
                <thead className="bg-cream-100 text-slate-600 font-semibold">
                  <tr>
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-left">Employee</th>
                    <th className="px-4 py-3 text-left">Department</th>
                    <th className="px-4 py-3 text-left">IN Time</th>
                    <th className="px-4 py-3 text-left">OUT Time</th>
                    <th className="px-4 py-3 text-left">Working Hours</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cream-200 bg-white">
                  {historyList.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-400 italic">
                        No records found matching filters.
                      </td>
                    </tr>
                  ) : (
                    historyList.map((r) => (
                      <tr key={r.id} className="hover:bg-cream-50">
                        <td className="px-4 py-3 font-bold text-slate-900">{r.attendance_date}</td>
                        <td className="px-4 py-3">
                          <span className="font-semibold text-slate-900 block">{r.employee_name}</span>
                          <span className="text-[11px] font-mono text-slate-500">{r.employee_code}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{r.department}</td>
                        <td className="px-4 py-3 font-mono text-slate-700">{formatTime(r.in_time)}</td>
                        <td className="px-4 py-3 font-mono text-slate-700">{formatTime(r.out_time)}</td>
                        <td className="px-4 py-3 font-mono font-bold text-slate-800">
                          {r.total_hours ? `${r.total_hours} hrs` : '--'}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[11px] block text-slate-700">IN: {r.in_status}</span>
                          <span className="text-[11px] block text-slate-500">OUT: {r.out_status}</span>
                        </td>
                        <td className="px-4 py-3">
                          {r.is_correction ? (
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-[10px] font-bold">
                              Corrected
                            </span>
                          ) : (
                            <span className="text-slate-400">Regular</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: Office Network Settings */}
        {activeTab === 'network' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 bg-white rounded-xl border border-cream-300 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-cream-200 bg-cream-50/50">
                <h3 className="text-sm font-bold text-slate-900">Approved Office IP Addresses & CIDR Ranges</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Attendance can only be marked by clients originating within these approved subnets.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-cream-200 text-xs">
                  <thead className="bg-cream-100 text-slate-600 font-semibold">
                    <tr>
                      <th className="px-4 py-3 text-left">Rule Name</th>
                      <th className="px-4 py-3 text-left">IP / CIDR Block</th>
                      <th className="px-4 py-3 text-left">Description</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cream-200 bg-white">
                    {networkSettings.map((rule) => (
                      <tr key={rule.id} className="hover:bg-cream-50">
                        <td className="px-4 py-3 font-semibold text-slate-900">{rule.name}</td>
                        <td className="px-4 py-3 font-mono text-forest font-bold">{rule.ip_or_cidr}</td>
                        <td className="px-4 py-3 text-slate-500">{rule.description || '--'}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleDeleteNetworkRule(rule.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                            title="Delete Rule"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Add Network Rule Form */}
            <div className="bg-white rounded-xl border border-cream-300 p-5 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 mb-3">Add Office Network Rule</h3>
              <form onSubmit={handleAddNetworkRule} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Rule Name</label>
                  <input
                    type="text"
                    value={newRuleName}
                    onChange={(e) => setNewRuleName(e.target.value)}
                    placeholder="e.g. Headquarters Wi-Fi"
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    IP Address or CIDR Block
                  </label>
                  <input
                    type="text"
                    value={newRuleCidr}
                    onChange={(e) => setNewRuleCidr(e.target.value)}
                    placeholder="e.g. 103.21.244.0/24 or 122.161.45.22"
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    Supports single IP (1.2.3.4) or subnet CIDR notation.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Description (Optional)</label>
                  <textarea
                    rows={2}
                    value={newRuleDesc}
                    onChange={(e) => setNewRuleDesc(e.target.value)}
                    placeholder="Notes about location or gateway..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  ></textarea>
                </div>

                <button
                  type="submit"
                  className="w-full py-2 bg-forest text-white rounded-lg text-xs font-semibold hover:bg-forest-dark transition-colors shadow-sm"
                >
                  Save Network Rule
                </button>
              </form>
            </div>
          </div>
        )}

        {/* TAB 6: Admin Audit Logs */}
        {activeTab === 'audit' && (
          <div className="bg-white rounded-xl border border-cream-300 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-cream-200 bg-cream-50/50">
              <h3 className="text-sm font-bold text-slate-900">Administrative Action Audit Trail</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Immutable records of administrative corrections, approvals, employee account changes
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-cream-200 text-xs">
                <thead className="bg-cream-100 text-slate-600 font-semibold">
                  <tr>
                    <th className="px-4 py-3 text-left">Timestamp (IST)</th>
                    <th className="px-4 py-3 text-left">Admin User</th>
                    <th className="px-4 py-3 text-left">Action</th>
                    <th className="px-4 py-3 text-left">Target</th>
                    <th className="px-4 py-3 text-left">Action Details</th>
                    <th className="px-4 py-3 text-left">Admin IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cream-200 bg-white">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-cream-50">
                      <td className="px-4 py-3 font-mono text-slate-500">
                        {new Date(log.created_at).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}
                      </td>
                      <td className="px-4 py-3 font-bold text-purple-700 font-mono">
                        {log.admin_employee_id || `ID: ${log.admin_id}`}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded font-semibold text-[11px]">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{log.target_type} #{log.target_id}</td>
                      <td className="px-4 py-3 text-slate-800 max-w-sm">{log.details}</td>
                      <td className="px-4 py-3 font-mono text-slate-400">{log.ip_address || '--'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* MODAL: Create Employee Account */}
      {showCreateEmpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl border border-cream-300 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-cream-200">
              <h3 className="text-base font-bold text-slate-900">Create New Employee Account</h3>
              <button
                onClick={() => setShowCreateEmpModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEmployee} className="mt-4 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Employee ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newEmpId}
                    onChange={(e) => setNewEmpId(e.target.value)}
                    placeholder="e.g. EMP103"
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newEmpName}
                    onChange={(e) => setNewEmpName(e.target.value)}
                    placeholder="e.g. Ananya Roy"
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Company Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={newEmpEmail}
                  onChange={(e) => setNewEmpEmail(e.target.value)}
                  placeholder="ananya.roy@company.com"
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
                  <input
                    type="text"
                    value={newEmpDept}
                    onChange={(e) => setNewEmpDept(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Designation</label>
                  <input
                    type="text"
                    value={newEmpDesig}
                    onChange={(e) => setNewEmpDesig(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Joining Date</label>
                  <input
                    type="date"
                    value={newEmpJoining}
                    onChange={(e) => setNewEmpJoining(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Initial Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={newEmpPassword}
                    onChange={(e) => setNewEmpPassword(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-cream-200">
                <button
                  type="button"
                  onClick={() => setShowCreateEmpModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={empSubmitting}
                  className="px-4 py-2 bg-forest text-white rounded-lg text-xs font-semibold hover:bg-forest-dark shadow-sm disabled:opacity-50"
                >
                  {empSubmitting ? 'Creating...' : 'Create Employee Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Review Correction */}
      {reviewingReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-cream-300 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900 mb-2">
              Review Attendance Correction
            </h3>
            <div className="p-3 bg-cream-50 rounded-lg text-xs mb-4 space-y-1">
              <div><strong>Employee:</strong> {reviewingReq.employee_name} ({reviewingReq.employee_code})</div>
              <div><strong>Target Date:</strong> {reviewingReq.request_date}</div>
              <div>
                <strong>Claimed Shift:</strong> {formatTime(reviewingReq.claimed_in_time)} – {formatTime(reviewingReq.claimed_out_time)}
              </div>
              <div><strong>Staff Reason:</strong> {reviewingReq.reason}</div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Decision</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setReviewAction('APPROVED')}
                  className={`py-2 text-xs font-semibold rounded-lg border ${
                    reviewAction === 'APPROVED'
                      ? 'bg-emerald-50 border-forest text-forest ring-1 ring-forest'
                      : 'border-slate-300 text-slate-700'
                  }`}
                >
                  Approve Correction
                </button>
                <button
                  type="button"
                  onClick={() => setReviewAction('REJECTED')}
                  className={`py-2 text-xs font-semibold rounded-lg border ${
                    reviewAction === 'REJECTED'
                      ? 'bg-red-50 border-red-600 text-red-700 ring-1 ring-red-600'
                      : 'border-slate-300 text-slate-700'
                  }`}
                >
                  Reject Correction
                </button>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Admin Remarks (Optional)
              </label>
              <textarea
                rows={2}
                value={adminRemarks}
                onChange={(e) => setAdminRemarks(e.target.value)}
                placeholder="Reason or notes regarding decision..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              ></textarea>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setReviewingReq(null)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={reviewSubmitting}
                onClick={handleReviewCorrection}
                className={`px-4 py-2 text-white rounded-lg text-xs font-semibold shadow-sm ${
                  reviewAction === 'APPROVED' ? 'bg-forest hover:bg-forest-dark' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {reviewSubmitting ? 'Submitting...' : `Confirm ${reviewAction}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
