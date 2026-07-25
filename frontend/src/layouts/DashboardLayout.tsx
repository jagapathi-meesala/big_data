import React, { useState, useEffect } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { logout } from '../store/slices/authSlice';
import { toggleTheme, initializeTheme } from '../store/slices/themeSlice';
import {
  Menu, Sun, Moon, LogOut, LayoutDashboard, MapPin, AlertTriangle, Shield,
  Workflow, Activity, CloudRain, Bell, User as UserIcon, Settings, FileText,
Users, Home, Building2, AlertOctagon, ShieldCheck
} from 'lucide-react';

export const DashboardLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  
  const { user } = useSelector((state: RootState) => state.auth);
  const { darkMode } = useSelector((state: RootState) => state.theme);

  useEffect(() => {
    dispatch(initializeTheme());
  }, [dispatch]);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const navigationItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Live Map', path: '/live-map', icon: MapPin },
    { name: 'Incidents', path: '/incidents', icon: AlertTriangle },
    { name: 'Resources', path: '/resources', icon: Shield },
    { name: 'Allocations', path: '/allocations', icon: Workflow },

    { name: 'Hospitals', path: '/hospitals', icon: Building2 },
    { name: 'Shelters', path: '/shelters', icon: Home },
    { name: 'Volunteers', path: '/volunteers', icon: Users },
    { name: 'SOS Requests', path: '/sos-requests', icon: AlertOctagon },
    { name: 'Weather Alerts', path: '/weather', icon: CloudRain },
    { name: 'Analytics', path: '/analytics', icon: Activity },
    { name: 'Reports', path: '/reports', icon: FileText },
    { name: 'Notifications', path: '/notifications', icon: Bell },
    { name: 'Profile', path: '/profile', icon: UserIcon },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  if (user?.role === 'ADMIN') {
    navigationItems.push({ name: 'Admin Panel', path: '/admin', icon: ShieldCheck });
  }

  return (
    <div className={`min-h-screen flex ${darkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-55 text-slate-800'}`}>
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-20 flex flex-col w-64 border-r transition-transform duration-200 ease-in-out ${
        darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      } ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0`}>
        <div className="h-16 flex items-center justify-between px-6 border-b border-inherit">
          <Link to="/dashboard" className="flex items-center space-x-2">
            <span className="font-extrabold text-xl text-brand-500">AID-DRAS</span>
          </Link>
        </div>
        
        <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-1">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center space-x-3 px-4 py-2.5 rounded-lg text-sm font-medium transition ${
                  isActive
                    ? 'bg-brand-500 text-white shadow-md'
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

            <Link
              to="/notifications"
              className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 relative transition"
            >
              <Bell size={18} />
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-inherit"></span>
            </Link>

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
