import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import {
  TodayAttendanceStatus,
  AttendanceRecord,
  MissedDateOption,
  CorrectionRequest
} from '../types';
import {
  Clock,
  LogIn,
  LogOut,
  CheckCircle,
  AlertTriangle,
  History,
  Calendar,
  ShieldAlert,
  Info,
  Send
} from 'lucide-react';

export const EmployeeDashboard: React.FC = () => {
  const { user } = useAuth();
  const [todayStatus, setTodayStatus] = useState<TodayAttendanceStatus | null>(null);
  const [historyRecords, setHistoryRecords] = useState<AttendanceRecord[]>([]);
  const [eligibleMissedDates, setEligibleMissedDates] = useState<MissedDateOption[]>([]);
  const [myCorrections, setMyCorrections] = useState<CorrectionRequest[]>([]);
  
  // Loading & Error States
  const [_loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Modals
  const [showLateModal, setShowLateModal] = useState<boolean>(false);
  const [lateReason, setLateReason] = useState<string>('');
  
  const [showEarlyModal, setShowEarlyModal] = useState<boolean>(false);
  const [earlyReason, setEarlyReason] = useState<string>('');

  // Correction form
  const [showCorrectionForm, setShowCorrectionForm] = useState<boolean>(false);
  const [selectedMissedDate, setSelectedMissedDate] = useState<string>('');
  const [claimedInTime, setClaimedInTime] = useState<string>('10:00');
  const [claimedOutTime, setClaimedOutTime] = useState<string>('17:30');
  const [correctionReason, setCorrectionReason] = useState<string>('');
  const [correctionSubmitting, setCorrectionSubmitting] = useState<boolean>(false);

  // Filter for history
  const [filterMonth, setFilterMonth] = useState<number>(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState<number>(new Date().getFullYear());

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setErrorBanner(null);

      const [statusRes, historyRes, missedDatesRes, correctionsRes] = await Promise.all([
        api.get<TodayAttendanceStatus>('/attendance/today'),
        api.get<AttendanceRecord[]>(`/attendance/history?month=${filterMonth}&year=${filterYear}`),
        api.get<MissedDateOption[]>('/corrections/eligible-dates'),
        api.get<CorrectionRequest[]>('/corrections/my-requests'),
      ]);

      setTodayStatus(statusRes);
      setHistoryRecords(historyRes);
      setEligibleMissedDates(missedDatesRes);
      setMyCorrections(correctionsRes);
    } catch (err: any) {
      setErrorBanner(err.message || 'Failed to load dashboard details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [filterMonth, filterYear]);

  // Handle Mark In Click
  const handleMarkInClick = () => {
    setErrorBanner(null);
    setSuccessBanner(null);

    // If server time is after 10:30 AM, require reason
    if (todayStatus?.is_after_late_threshold) {
      setLateReason('');
      setShowLateModal(true);
    } else {
      executeMarkIn(null);
    }
  };

  const executeMarkIn = async (reason: string | null) => {
    setActionLoading(true);
    setErrorBanner(null);
    try {
      await api.post('/attendance/in', { late_reason: reason });
      setSuccessBanner('Attendance Marked IN successfully!');
      setShowLateModal(false);
      await fetchDashboardData();
    } catch (err: any) {
      setErrorBanner(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Mark Out Click
  const handleMarkOutClick = () => {
    setErrorBanner(null);
    setSuccessBanner(null);

    // If server time is before 5:30 PM, require reason
    if (todayStatus?.is_before_standard_out) {
      setEarlyReason('');
      setShowEarlyModal(true);
    } else {
      executeMarkOut(null);
    }
  };

  const executeMarkOut = async (reason: string | null) => {
    setActionLoading(true);
    setErrorBanner(null);
    try {
      await api.post('/attendance/out', { early_departure_reason: reason });
      setSuccessBanner('Attendance Marked OUT successfully! Day completed.');
      setShowEarlyModal(false);
      await fetchDashboardData();
    } catch (err: any) {
      setErrorBanner(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Submit Correction Request
  const handleSubmitCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMissedDate || !correctionReason.trim()) {
      setErrorBanner('Please select a date and enter the reason for missed attendance.');
      return;
    }

    setCorrectionSubmitting(true);
    setErrorBanner(null);

    try {
      // Build ISO strings with IST timezone offset (+05:30)
      const inIso = `${selectedMissedDate}T${claimedInTime}:00+05:30`;
      const outIso = claimedOutTime ? `${selectedMissedDate}T${claimedOutTime}:00+05:30` : undefined;

      await api.post('/corrections/request', {
        request_date: selectedMissedDate,
        claimed_in_time: inIso,
        claimed_out_time: outIso,
        reason: correctionReason.trim(),
      });

      setSuccessBanner(`Correction request for ${selectedMissedDate} submitted successfully! Awaiting admin approval.`);
      setShowCorrectionForm(false);
      setSelectedMissedDate('');
      setCorrectionReason('');
      await fetchDashboardData();
    } catch (err: any) {
      setErrorBanner(err.message);
    } finally {
      setCorrectionSubmitting(false);
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
      {/* Top Banner / Alerts */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {errorBanner && (
          <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-600 rounded-r-lg flex items-start space-x-3 text-red-800 shadow-sm">
            <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-600" />
            <div>
              <p className="font-semibold text-sm">Action Blocked</p>
              <p className="text-xs mt-0.5">{errorBanner}</p>
            </div>
          </div>
        )}

        {successBanner && (
          <div className="mb-4 p-4 bg-emerald-50 border-l-4 border-forest rounded-r-lg flex items-start space-x-3 text-forest-dark shadow-sm">
            <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-forest" />
            <div>
              <p className="font-semibold text-sm">Success</p>
              <p className="text-xs mt-0.5">{successBanner}</p>
            </div>
          </div>
        )}

        {/* Network Warning when not in office */}
        {todayStatus && !todayStatus.is_office_network && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-300 rounded-xl flex items-start space-x-3 text-amber-900 shadow-sm">
            <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-600" />
            <div>
              <p className="font-semibold text-sm">Unauthorized Network Connection</p>
              <p className="text-xs mt-1 text-amber-800 leading-relaxed">
                Attendance can only be marked from the authorized office network. Please connect to the office Wi-Fi or contact your administrator.
              </p>
              <p className="text-[11px] text-amber-700 font-mono mt-1">
                Your current public IP: {todayStatus.client_ip}
              </p>
            </div>
          </div>
        )}

        {/* Header Profile & Date Card */}
        <div className="bg-white rounded-xl border border-cream-300 p-6 shadow-sm mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <span className="text-xs uppercase tracking-wider text-sage font-bold">
                Employee Self-Service Portal
              </span>
              <h1 className="text-2xl font-bold text-slate-900 mt-0.5">
                Welcome back, {user?.full_name || user?.employee_id}
              </h1>
              <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-600">
                <span className="font-mono bg-cream-100 px-2 py-0.5 rounded border border-cream-200">
                  ID: {user?.employee_id}
                </span>
                <span>•</span>
                <span>Department: <strong>{user?.department || 'General'}</strong></span>
                <span>•</span>
                <span>Designation: <strong>{user?.designation || 'Staff'}</strong></span>
              </div>
            </div>

            {/* Server Time & Date Badge */}
            <div className="bg-cream-100 border border-cream-300 rounded-lg p-3 text-right">
              <div className="text-xs font-semibold text-forest flex items-center justify-end space-x-1">
                <Clock className="w-3.5 h-3.5" />
                <span>SERVER TIME (IST)</span>
              </div>
              <div className="text-xl font-bold font-mono text-slate-900 mt-0.5">
                {todayStatus?.server_time || '--:--:--'}
              </div>
              <div className="text-xs text-slate-500 font-medium mt-0.5">
                {todayStatus?.server_day}, {todayStatus?.server_date}
              </div>
            </div>
          </div>
        </div>

        {/* Main Status & Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Card 1: Today's Status */}
          <div className="bg-white rounded-xl border border-cream-300 p-6 shadow-sm flex flex-col justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Today's Status
              </span>
              <div className="mt-3">
                {todayStatus?.status === 'NOT_CHECKED_IN' && (
                  <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 text-sm font-semibold">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
                    <span>Not Checked In</span>
                  </div>
                )}
                {todayStatus?.status === 'WORKING' && (
                  <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-emerald-100 text-forest text-sm font-semibold animate-pulse">
                    <span className="w-2.5 h-2.5 rounded-full bg-forest"></span>
                    <span>Currently Working</span>
                  </div>
                )}
                {todayStatus?.status === 'COMPLETED' && (
                  <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-blue-100 text-blue-800 text-sm font-semibold">
                    <CheckCircle className="w-4 h-4 text-blue-600" />
                    <span>Completed for Today</span>
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Standard shift: 10:00 AM – 05:30 PM IST
              </p>
            </div>

            <div className="pt-4 border-t border-cream-200 mt-4 text-xs text-slate-600">
              {todayStatus?.record?.is_correction ? (
                <span className="text-purple-700 font-medium">Record updated via approved correction</span>
              ) : (
                <span>Recorded via Server Timestamp</span>
              )}
            </div>
          </div>

          {/* Card 2: IN & OUT Times */}
          <div className="bg-white rounded-xl border border-cream-300 p-6 shadow-sm flex flex-col justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Shift Timings
            </span>
            <div className="grid grid-cols-2 gap-4 mt-2">
              <div>
                <span className="text-xs text-slate-400 block font-medium">IN TIME</span>
                <span className="text-lg font-bold font-mono text-slate-800">
                  {formatTime(todayStatus?.record?.in_time)}
                </span>
                {todayStatus?.record?.in_status && (
                  <span className={`block text-[11px] font-semibold mt-0.5 ${
                    todayStatus.record.in_status === 'LATE' ? 'text-amber-600' : 'text-emerald-700'
                  }`}>
                    {todayStatus.record.in_status === 'LATE' ? 'Late Arrival' : 'On Time'}
                  </span>
                )}
              </div>

              <div>
                <span className="text-xs text-slate-400 block font-medium">OUT TIME</span>
                <span className="text-lg font-bold font-mono text-slate-800">
                  {formatTime(todayStatus?.record?.out_time)}
                </span>
                {todayStatus?.record?.out_status && todayStatus.record.out_status !== 'PENDING' && (
                  <span className={`block text-[11px] font-semibold mt-0.5 ${
                    todayStatus.record.out_status === 'EARLY' ? 'text-pink-600' : 'text-emerald-700'
                  }`}>
                    {todayStatus.record.out_status === 'EARLY' ? 'Early Departure' : 'On Time'}
                  </span>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-cream-200 mt-4 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Total Working Hours:</span>
              <span className="font-mono font-bold text-slate-900 text-sm">
                {todayStatus?.record?.total_hours ? `${todayStatus.record.total_hours} hrs` : '--'}
              </span>
            </div>
          </div>

          {/* Card 3: Mark IN / OUT Action Controls */}
          <div className="bg-white rounded-xl border border-cream-300 p-6 shadow-sm flex flex-col justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Mark Attendance
              </span>
              <p className="text-xs text-slate-500 mt-1">
                Authorized office network verification required.
              </p>
            </div>

            <div className="space-y-3 my-4">
              {todayStatus?.status === 'NOT_CHECKED_IN' && (
                <button
                  onClick={handleMarkInClick}
                  disabled={actionLoading}
                  className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-forest hover:bg-forest-dark text-white rounded-lg font-semibold text-sm shadow-sm transition-all disabled:opacity-50"
                >
                  <LogIn className="w-4 h-4" />
                  <span>{actionLoading ? 'Recording IN...' : 'MARK IN'}</span>
                </button>
              )}

              {todayStatus?.status === 'WORKING' && (
                <button
                  onClick={handleMarkOutClick}
                  disabled={actionLoading}
                  className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-amber-700 hover:bg-amber-800 text-white rounded-lg font-semibold text-sm shadow-sm transition-all disabled:opacity-50"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{actionLoading ? 'Recording OUT...' : 'MARK OUT'}</span>
                </button>
              )}

              {todayStatus?.status === 'COMPLETED' && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-center text-xs font-semibold text-forest flex items-center justify-center space-x-1.5">
                  <CheckCircle className="w-4 h-4" />
                  <span>Attendance completed for today</span>
                </div>
              )}
            </div>

            <div className="text-[11px] text-slate-500 text-center font-medium">
              Late threshold: 10:30 AM • Standard out: 5:30 PM
            </div>
          </div>
        </div>

        {/* 3-Day Correction Window Section */}
        <div className="bg-white rounded-xl border border-cream-300 p-6 shadow-sm mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-cream-200 gap-3">
            <div>
              <div className="flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-forest" />
                <h2 className="text-lg font-bold text-slate-900">
                  Three-Day Missed Attendance Correction Window
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Forgot to mark attendance? Submit claimed times within 3 calendar days for admin approval.
              </p>
            </div>

            <button
              onClick={() => setShowCorrectionForm(!showCorrectionForm)}
              className="inline-flex items-center px-3.5 py-2 border border-forest text-forest hover:bg-forest hover:text-white rounded-lg text-xs font-semibold transition-colors shadow-sm"
            >
              <Send className="w-3.5 h-3.5 mr-1.5" />
              <span>{showCorrectionForm ? 'Close Form' : 'Submit Correction Request'}</span>
            </button>
          </div>

          {/* Form when open */}
          {showCorrectionForm && (
            <div className="mt-5 p-5 bg-cream-50 border border-cream-300 rounded-xl">
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start space-x-2">
                <Info className="w-4 h-4 flex-shrink-0 text-amber-700 mt-0.5" />
                <span>
                  <strong>Important Notice:</strong> Claimed times are recorded as historical claims and will be reviewed by company administration before updating your records.
                </span>
              </div>

              <form onSubmit={handleSubmitCorrection} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Select Eligible Date */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Select Eligible Missed Date
                    </label>
                    <select
                      value={selectedMissedDate}
                      onChange={(e) => setSelectedMissedDate(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-forest focus:outline-none bg-white"
                    >
                      <option value="">-- Choose past date (within 3 days) --</option>
                      {eligibleMissedDates
                        .filter(d => d.is_eligible)
                        .map((opt) => (
                          <option key={opt.attendance_date} value={opt.attendance_date}>
                            {opt.attendance_date} ({opt.day_name} • {opt.days_ago} day{opt.days_ago > 1 ? 's' : ''} ago) - {opt.status_label}
                          </option>
                        ))}
                    </select>
                    {eligibleMissedDates.filter(d => d.is_eligible).length === 0 && (
                      <span className="text-[11px] text-slate-500 mt-1 block">
                        No missed working dates eligible within the 3-day window.
                      </span>
                    )}
                  </div>

                  {/* Claimed IN Time */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Historical Claimed IN Time
                    </label>
                    <input
                      type="time"
                      value={claimedInTime}
                      onChange={(e) => setClaimedInTime(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-forest focus:outline-none bg-white font-mono"
                    />
                  </div>

                  {/* Claimed OUT Time */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Historical Claimed OUT Time
                    </label>
                    <input
                      type="time"
                      value={claimedOutTime}
                      onChange={(e) => setClaimedOutTime(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-forest focus:outline-none bg-white font-mono"
                    />
                  </div>
                </div>

                {/* Reason */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Reason for Missed Attendance & Details <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    value={correctionReason}
                    onChange={(e) => setCorrectionReason(e.target.value)}
                    required
                    placeholder="Provide specific reason why attendance was not marked at the office (e.g. forgot badge, network glitch, client site visit)..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-forest focus:outline-none bg-white"
                  ></textarea>
                </div>

                <div className="flex justify-end space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCorrectionForm(false)}
                    className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={correctionSubmitting || !selectedMissedDate}
                    className="px-4 py-2 bg-forest text-white rounded-lg text-xs font-semibold hover:bg-forest-dark transition-colors disabled:opacity-50 shadow-sm"
                  >
                    {correctionSubmitting ? 'Submitting Request...' : 'Submit Request for Approval'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Pending and Previous Requests Table */}
          {myCorrections.length > 0 && (
            <div className="mt-5">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
                Your Correction Requests
              </span>
              <div className="overflow-x-auto border border-cream-300 rounded-lg">
                <table className="min-w-full divide-y divide-cream-300 text-xs">
                  <thead className="bg-cream-100 text-slate-600 font-semibold">
                    <tr>
                      <th className="px-4 py-2.5 text-left">Request Date</th>
                      <th className="px-4 py-2.5 text-left">Claimed Shift</th>
                      <th className="px-4 py-2.5 text-left">Reason</th>
                      <th className="px-4 py-2.5 text-left">Status</th>
                      <th className="px-4 py-2.5 text-left">Admin Remarks</th>
                      <th className="px-4 py-2.5 text-left">Submitted On</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cream-200 bg-white">
                    {myCorrections.map((req) => (
                      <tr key={req.id} className="hover:bg-cream-50">
                        <td className="px-4 py-2.5 font-medium text-slate-900">{req.request_date}</td>
                        <td className="px-4 py-2.5 font-mono text-slate-700">
                          {formatTime(req.claimed_in_time)} – {formatTime(req.claimed_out_time)}
                        </td>
                        <td className="px-4 py-2.5 text-slate-600 max-w-xs truncate" title={req.reason}>
                          {req.reason}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            req.status === 'APPROVED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : req.status === 'REJECTED'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {req.status}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-slate-500 italic">
                          {req.admin_remarks || '--'}
                        </td>
                        <td className="px-4 py-2.5 text-slate-400">
                          {new Date(req.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Monthly Attendance History */}
        <div className="bg-white rounded-xl border border-cream-300 p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-cream-200 gap-3">
            <div className="flex items-center space-x-2">
              <History className="w-5 h-5 text-forest" />
              <h2 className="text-lg font-bold text-slate-900">Monthly Attendance History</h2>
            </div>

            {/* Month & Year Selectors */}
            <div className="flex items-center space-x-3">
              <select
                value={filterMonth}
                onChange={(e) => setFilterMonth(Number(e.target.value))}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-forest"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    {new Date(2026, m - 1).toLocaleString('default', { month: 'long' })}
                  </option>
                ))}
              </select>

              <select
                value={filterYear}
                onChange={(e) => setFilterYear(Number(e.target.value))}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-forest"
              >
                {[2024, 2025, 2026, 2027].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-cream-300 text-xs">
              <thead className="bg-cream-100 text-slate-600 font-semibold">
                <tr>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">IN Time</th>
                  <th className="px-4 py-3 text-left">OUT Time</th>
                  <th className="px-4 py-3 text-left">Working Hours</th>
                  <th className="px-4 py-3 text-left">IN Status</th>
                  <th className="px-4 py-3 text-left">OUT Status</th>
                  <th className="px-4 py-3 text-left">Remarks / Reasons</th>
                  <th className="px-4 py-3 text-left">Type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-200 bg-white">
                {historyRecords.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-slate-400 italic">
                      No attendance records found for this month.
                    </td>
                  </tr>
                ) : (
                  historyRecords.map((r) => (
                    <tr key={r.id} className="hover:bg-cream-50 transition-colors">
                      <td className="px-4 py-3 font-semibold text-slate-900">{r.attendance_date}</td>
                      <td className="px-4 py-3 font-mono font-medium text-slate-700">{formatTime(r.in_time)}</td>
                      <td className="px-4 py-3 font-mono font-medium text-slate-700">{formatTime(r.out_time)}</td>
                      <td className="px-4 py-3 font-mono font-bold text-slate-800">
                        {r.total_hours ? `${r.total_hours} hrs` : '--'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                          r.in_status === 'LATE' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {r.in_status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                          r.out_status === 'EARLY' ? 'bg-pink-100 text-pink-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {r.out_status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 max-w-xs truncate" title={r.late_reason || r.early_departure_reason || ''}>
                        {r.late_reason && <span className="block text-amber-700">Late: {r.late_reason}</span>}
                        {r.early_departure_reason && <span className="block text-pink-700">Early: {r.early_departure_reason}</span>}
                        {!r.late_reason && !r.early_departure_reason && <span className="text-slate-400">--</span>}
                      </td>
                      <td className="px-4 py-3">
                        {r.is_correction ? (
                          <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-[10px] font-bold">
                            Corrected
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Regular</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal: Mandatory Late Arrival Reason */}
      {showLateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-cream-300 animate-in fade-in zoom-in-95">
            <div className="flex items-start space-x-3 mb-4">
              <div className="p-2 rounded-lg bg-amber-100 text-amber-700 flex-shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Late Arrival Reason Required</h3>
                <p className="text-xs text-slate-600 mt-1">
                  You are marking IN after 10:30 AM IST. Company policy requires a reason for late check-in.
                </p>
              </div>
            </div>

            <textarea
              rows={3}
              value={lateReason}
              onChange={(e) => setLateReason(e.target.value)}
              placeholder="e.g. Traffic delay, doctor visit, transit disturbance..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-forest focus:outline-none mb-4"
              required
            ></textarea>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowLateModal(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!lateReason.trim() || actionLoading}
                onClick={() => executeMarkIn(lateReason)}
                className="px-4 py-2 bg-forest text-white rounded-lg text-xs font-semibold hover:bg-forest-dark transition-colors disabled:opacity-50"
              >
                {actionLoading ? 'Submitting...' : 'Confirm & Mark IN'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Mandatory Early Departure Reason */}
      {showEarlyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-cream-300 animate-in fade-in zoom-in-95">
            <div className="flex items-start space-x-3 mb-4">
              <div className="p-2 rounded-lg bg-pink-100 text-pink-700 flex-shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Early Departure Reason Required</h3>
                <p className="text-xs text-slate-600 mt-1">
                  You are marking OUT before 5:30 PM IST. Company policy requires an early departure reason.
                </p>
              </div>
            </div>

            <textarea
              rows={3}
              value={earlyReason}
              onChange={(e) => setEarlyReason(e.target.value)}
              placeholder="e.g. Personal emergency, family function, health unwell..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-forest focus:outline-none mb-4"
              required
            ></textarea>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowEarlyModal(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!earlyReason.trim() || actionLoading}
                onClick={() => executeMarkOut(earlyReason)}
                className="px-4 py-2 bg-amber-700 text-white rounded-lg text-xs font-semibold hover:bg-amber-800 transition-colors disabled:opacity-50"
              >
                {actionLoading ? 'Submitting...' : 'Confirm & Mark OUT'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
