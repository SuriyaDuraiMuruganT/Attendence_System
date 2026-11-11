import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { Clock, ShieldCheck, ShieldAlert, LogOut, User as UserIcon, Building2 } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const [networkStatus, setNetworkStatus] = useState<{
    client_ip: string;
    is_authorized_office_network: boolean;
  } | null>(null);
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    // Check network status
    api.get<{ client_ip: string; is_authorized_office_network: boolean }>('/network/status')
      .then(res => setNetworkStatus(res))
      .catch(() => setNetworkStatus(null));

    // Update live clock
    const updateClock = () => {
      const now = new Date();
      // Format in IST
      const istTime = now.toLocaleTimeString('en-US', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
      setCurrentTime(istTime);
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="bg-white border-b border-cream-300 sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-forest flex items-center justify-center text-white shadow-sm">
            <Building2 className="w-5 h-5 text-cream-100" />
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight text-forest block leading-none">
              PRESENCE<span className="text-sage font-medium">HQ</span>
            </span>
            <span className="text-xs text-slate-500 font-medium tracking-wide">
              Attendance System v1
            </span>
          </div>
        </div>

        {/* Center Clock & Network Badge */}
        <div className="hidden md:flex items-center space-x-4">
          {/* IST Server Time */}
          <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-cream-100 border border-cream-300 rounded-md text-xs font-medium text-slate-700">
            <Clock className="w-3.5 h-3.5 text-forest" />
            <span>IST:</span>
            <span className="font-mono text-slate-900 font-semibold">{currentTime || '--:--:--'}</span>
          </div>

          {/* Network IP Pill */}
          {networkStatus && (
            <div
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium border ${
                networkStatus.is_authorized_office_network
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}
              title={`Detected Client IP: ${networkStatus.client_ip}`}
            >
              {networkStatus.is_authorized_office_network ? (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Office Wi-Fi ({networkStatus.client_ip})</span>
                </>
              ) : (
                <>
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                  <span>External IP ({networkStatus.client_ip})</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* User Profile & Logout */}
        <div className="flex items-center space-x-4">
          {user && (
            <div className="flex items-center space-x-3">
              <div className="hidden sm:block text-right">
                <p className="text-xs font-semibold text-slate-900 leading-tight">
                  {user.full_name || user.employee_id}
                </p>
                <div className="flex items-center justify-end space-x-1">
                  <span className="text-[10px] text-slate-500 font-mono">
                    {user.employee_id}
                  </span>
                  <span className="inline-block w-1 h-1 rounded-full bg-slate-300"></span>
                  <span className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.2 rounded ${
                    user.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-sage-pale text-forest'
                  }`}>
                    {user.role}
                  </span>
                </div>
              </div>

              <div className="w-8 h-8 rounded-full bg-cream-200 border border-cream-300 flex items-center justify-center text-forest">
                <UserIcon className="w-4 h-4" />
              </div>

              <button
                onClick={logout}
                className="p-2 text-slate-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                title="Log out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

