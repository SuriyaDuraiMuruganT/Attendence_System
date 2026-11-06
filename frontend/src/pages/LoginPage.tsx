import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { Building2, Lock, User, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId || !password) {
      setError('Please provide both Employee ID and password.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const data = await api.post<{
        access_token: string;
        role: 'EMPLOYEE' | 'ADMIN';
        employee_id: string;
        full_name: string;
        department?: string;
        designation?: string;
      }>('/auth/login', {
        employee_id: employeeId.trim(),
        password: password,
      });

      login(data.access_token, {
        id: 0,
        employee_id: data.employee_id,
        role: data.role,
        is_active: true,
        full_name: data.full_name,
        department: data.department,
        designation: data.designation,
      });

      if (data.role === 'ADMIN') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const setCredentials = (id: string, pass: string) => {
    setEmployeeId(id);
    setPassword(pass);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-cream-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-2xl bg-forest flex items-center justify-center text-white shadow-md">
            <Building2 className="w-8 h-8 text-cream-100" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl font-bold tracking-tight text-slate-900">
          Sign In to Attendance Portal
        </h2>
        <p className="mt-1 text-center text-xs text-slate-600 font-medium">
          Company Employee Attendance & Time Tracking • Version 1
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-sm border border-cream-300 rounded-xl sm:px-10">
          {error && (
            <div className="mb-6 p-3.5 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3 text-red-700 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Employee ID
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  placeholder="e.g. EMP101 or ADMIN001"
                  required
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest focus:border-forest text-sm bg-slate-50/50"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest focus:border-forest text-sm bg-slate-50/50"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-forest hover:bg-forest-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-forest disabled:opacity-50 transition-colors"
              >
                {loading ? 'Authenticating...' : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Quick Demo Credentials */}
          <div className="mt-8 pt-6 border-t border-cream-200">
            <p className="text-xs font-medium text-slate-500 mb-3 text-center">
              Quick Fill Demo Credentials
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setCredentials('EMP101', 'Employee@123')}
                className="px-3 py-2 border border-cream-300 bg-cream-50 hover:bg-cream-200 rounded-lg text-left transition-colors"
              >
                <div className="flex items-center space-x-1.5 text-xs font-bold text-forest">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Employee</span>
                </div>
                <div className="text-[11px] text-slate-500 font-mono mt-0.5">EMP101</div>
              </button>

              <button
                type="button"
                onClick={() => setCredentials('ADMIN001', 'AdminPassword@123')}
                className="px-3 py-2 border border-cream-300 bg-cream-50 hover:bg-cream-200 rounded-lg text-left transition-colors"
              >
                <div className="flex items-center space-x-1.5 text-xs font-bold text-purple-700">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Admin</span>
                </div>
                <div className="text-[11px] text-slate-500 font-mono mt-0.5">ADMIN001</div>
              </button>
            </div>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-slate-500">
          Attendance can only be marked from authorized company networks.
        </p>
      </div>
    </div>
  );
};
