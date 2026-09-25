import React, { useState, useEffect, useRef } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useQuery } from '@tanstack/react-query';
import { RootState } from '../store';
import { logout } from '../store/slices/authSlice';
import { toggleTheme, initializeTheme } from '../store/slices/themeSlice';
import {
  Menu, Sun, Moon, LogOut, LayoutDashboard, MapPin, Shield,
  Activity, Bell, Compass, AlertOctagon, Info, ShieldAlert, CheckCircle, X
} from 'lucide-react';
import api from '../services/api';

export const DashboardLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [notifOpen, setNotifOpen] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const notifRef = useRef<HTMLDivElement>(null);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  
  const { user } = useSelector((state: RootState) => state.auth);
  const { darkMode } = useSelector((state: RootState) => state.theme);

  useEffect(() => {
    dispatch(initializeTheme());
  }, [dispatch]);

  // Close notification dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    if (notifOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [notifOpen]);

  // Close dropdown on route change
  useEffect(() => {
    setNotifOpen(false);
  }, [location.pathname]);

  // Fetch notifications for header bell dropdown
  const { data: notifData } = useQuery({
    queryKey: ['header-notifications'],
    queryFn: async () => {
      const res = await api.get('/notifications');
      return res.data;
    },
    refetchInterval: 30000, // Refresh every 30s
    staleTime: 15000,
  });

  const allNotifications = notifData?.notifications || [];
  const visibleNotifications = allNotifications.filter((n: any) => !dismissedIds.has(n.id));
  const unreadCount = visibleNotifications.filter((n: any) => !n.isRead).length;

  const handleDismiss = (id: string) => {
    setDismissedIds(prev => new Set(prev).add(id));
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const navigationItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Disaster Map', path: '/live-map', icon: MapPin },
    { name: 'Escape Routes', path: '/escape-routes', icon: Compass },
    { name: 'SOS Requests', path: '/sos-requests', icon: AlertOctagon },
    { name: 'Resources', path: '/resources', icon: Shield },
    { name: 'Analytics', path: '/analytics', icon: Activity },
  ];

  const getNotifIcon = (type: string) => {
    if (type === 'ALERT') return { Icon: ShieldAlert, color: 'text-red-500 bg-red-500/10' };
    if (type === 'SUCCESS') return { Icon: CheckCircle, color: 'text-emerald-500 bg-emerald-500/10' };
    return { Icon: Info, color: 'text-blue-500 bg-blue-500/10' };
  };

  return (
    <div className={`min-h-screen flex ${darkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-55 text-slate-800'}`}>
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-20 flex flex-col w-64 border-r transition-transform duration-200 ease-in-out ${
        darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      } ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0`}>
        <div className="h-16 flex items-center justify-between px-6 border-b border-inherit">
          <Link to="/dashboard" className="flex items-center space-x-2">
            <span className="font-extrabold text-xl text-emerald-600 dark:text-emerald-400">AID-DRAS</span>
          </Link>
        </div>
        
        <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-1">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || (
              item.name === 'Resources' && ['/hospitals', '/shelters', '/allocations'].includes(location.pathname)
            ) || (
              item.name === 'SOS Requests' && ['/incidents', '/weather'].includes(location.pathname)
            ) || (
              item.name === 'Analytics' && ['/volunteers', '/reports', '/admin'].includes(location.pathname)
            );
            
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center space-x-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : darkMode
                    ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon size={18} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-inherit">
          <button
            onClick={handleLogout}
            className="flex items-center space-x-3 w-full px-4 py-2.5 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50/10 hover:text-red-600 transition"
          >
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header/Navbar */}
        <header className={`h-16 flex items-center justify-between px-6 border-b shadow-sm ${
          darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 md:hidden"
          >
            <Menu size={20} />
          </button>
          
          <div className="hidden md:block">
            <span className="text-sm font-semibold opacity-75">
              Welcome, {user?.firstName} ({user?.role})
            </span>
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={() => dispatch(toggleTheme())}
              className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* Notification Bell with Dropdown */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 relative transition"
                aria-label="Notifications"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[9px] font-bold rounded-full px-1 border-2 border-white dark:border-slate-900 shadow-sm">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Dropdown Panel */}
              {notifOpen && (
                <div className={`absolute right-0 top-full mt-2 w-[380px] max-h-[480px] rounded-2xl shadow-2xl border z-50 flex flex-col overflow-hidden ${
                  darkMode
                    ? 'bg-slate-900 border-slate-700 shadow-black/40'
                    : 'bg-white border-slate-200 shadow-slate-300/50'
                }`}>
                  {/* Header */}
                  <div className={`flex items-center justify-between px-5 py-3 border-b ${
                    darkMode ? 'border-slate-700' : 'border-slate-100'
                  }`}>
                    <div className="flex items-center space-x-2">
                      <Bell size={15} className="text-emerald-500" />
                      <span className="text-sm font-bold">Notifications</span>
                      {unreadCount > 0 && (
                        <span className="px-1.5 py-0.5 bg-red-500/10 text-red-500 text-[10px] font-bold rounded-full">
                          {unreadCount} new
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => setNotifOpen(false)}
                      className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    >
                      <X size={14} className="opacity-50" />
                    </button>
                  </div>

                  {/* Notification Items */}
                  <div className="flex-1 overflow-y-auto max-h-[340px] divide-y divide-slate-100 dark:divide-slate-800">
                    {visibleNotifications.length === 0 ? (
                      <div className="text-center py-12 text-xs opacity-50">
                        No new notifications
                      </div>
                    ) : (
                      visibleNotifications.slice(0, 8).map((notif: any) => {
                        const { Icon, color } = getNotifIcon(notif.type);
                        return (
                          <div
                            key={notif.id}
                            className={`flex items-start gap-3 px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition cursor-pointer group`}
                          >
                            <div className={`p-1.5 rounded-lg mt-0.5 ${color}`}>
                              <Icon size={14} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold truncate">{notif.title}</p>
                              <p className="text-[11px] opacity-60 leading-snug line-clamp-2 mt-0.5">{notif.message}</p>
                              <span className="text-[10px] opacity-40 mt-1 block">
                                {notif.createdAt
                                  ? new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                  : 'Just now'}
                              </span>
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDismiss(notif.id); }}
                              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                              title="Dismiss"
                            >
                              <X size={12} className="opacity-50" />
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Footer */}
                  <div className={`px-5 py-2.5 border-t text-center ${
                    darkMode ? 'border-slate-700' : 'border-slate-100'
                  }`}>
                    <Link
                      to="/notifications"
                      onClick={() => setNotifOpen(false)}
                      className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                    >
                      View All Notifications →
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <Link to="/profile" className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-white font-bold">
                {user?.firstName ? user.firstName[0] : 'U'}
              </div>
            </Link>
          </div>
        </header>

        {/* Dynamic View */}
        <main className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-slate-950">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
