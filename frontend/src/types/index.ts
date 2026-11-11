export type UserRole = 'EMPLOYEE' | 'ADMIN';

export interface User {
  id: number;
  employee_id: string;
  role: UserRole;
  is_active: boolean;
  full_name?: string;
  email?: string;
  department?: string;
  designation?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface AttendanceRecord {
  id: number;
  employee_id: number;
  employee_code?: string;
  employee_name?: string;
  department?: string;
  attendance_date: string;
  in_time: string | null;
  out_time: string | null;
  in_status: 'ON_TIME' | 'LATE' | 'MISSED' | 'CORRECTED';
  out_status: 'ON_TIME' | 'EARLY' | 'PENDING' | 'CORRECTED';
  late_reason?: string | null;
  early_departure_reason?: string | null;
  total_hours: number;
  client_ip?: string | null;
  is_correction: boolean;
  created_at: string;
}

export interface TodayAttendanceStatus {
  status: 'NOT_CHECKED_IN' | 'WORKING' | 'COMPLETED';
  server_time: string;
  server_date: string;
  server_day: string;
  is_after_late_threshold: boolean;
  is_before_standard_out: boolean;
  record: AttendanceRecord | null;
  client_ip: string;
  is_office_network: boolean;
}

export interface MissedDateOption {
  attendance_date: string;
  day_name: string;
  is_eligible: boolean;
  status_label: string;
  days_ago: number;
  has_pending_request: boolean;
}

export interface CorrectionRequest {
  id: number;
  employee_id: number;
  employee_code?: string;
  employee_name?: string;
  department?: string;
  attendance_id?: number | null;
  request_date: string;
  claimed_in_time: string;
  claimed_out_time?: string | null;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  admin_id?: number | null;
  admin_remarks?: string | null;
  reviewed_at?: string | null;
  created_at: string;
}

export interface AdminStats {
  total_employees: int_number;
  present_today: int_number;
  absent_missing_today: int_number;
  currently_working: int_number;
  incomplete_attendance: int_number;
  pending_corrections: int_number;
}

type int_number = number;

export interface TodaySummaryItem {
  employee_id: string;
  full_name: string;
  department: string;
  attendance_date: string;
  status: 'WORKING' | 'COMPLETED' | 'ABSENT';
  in_time: string | null;
  out_time: string | null;
  in_status: string;
  out_status: string;
  late_reason: string | null;
  early_departure_reason: string | null;
  total_hours: number;
  client_ip: string | null;
  is_correction: boolean;
}

export interface EmployeeProfile {
  id: number;
  user_id: number;
  employee_id: string;
  full_name: string;
  email: string;
  department: string;
  designation: string;
  joining_date: string;
  is_active: boolean;
  created_at: string;
}

export interface NetworkSetting {
  id: number;
  name: string;
  ip_or_cidr: string;
  description?: string | null;
  is_active: boolean;
  created_at: string;
}

export interface AuditLog {
  id: number;
  admin_id: number;
  admin_employee_id?: string | null;
  action: string;
  target_type: string;
  target_id: number;
  details?: string | null;
  ip_address?: string | null;
  created_at: string;
}

