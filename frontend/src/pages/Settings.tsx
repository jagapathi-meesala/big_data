import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { toggleTheme } from '../store/slices/themeSlice';
import { Sun, Moon } from 'lucide-react';

export const Settings: React.FC = () => {
  const dispatch = useDispatch();
  const { darkMode } = useSelector((state: RootState) => state.theme);

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">System Settings</h1>
        <p className="text-sm opacity-60">Customize your visual interface, communication alerts, and dev features.</p>
      </div>

      <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-6">
        {/* Theme configuration */}
        <div className="flex items-center justify-between border-b dark:border-slate-800 pb-4">
          <div className="space-y-1">
            <span className="text-sm font-bold block">Visual Appearance</span>
            <span className="text-xs opacity-50 block">Switch between light and dark themes.</span>
          </div>
          <button
            onClick={() => dispatch(toggleTheme())}
            className="flex items-center space-x-2 px-4 py-2 border rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition text-sm font-semibold"
          >
            {darkMode ? (
              <>
                <Sun size={16} />
                <span>Light Mode</span>
              </>
            ) : (
              <>
                <Moon size={16} />
                <span>Dark Mode</span>
              </>
            )}
          </button>
        </div>

        {/* Notifications toggle options */}
        <div className="flex items-center justify-between border-b dark:border-slate-800 pb-4">
          <div className="space-y-1">
            <span className="text-sm font-bold block">SOS Notifications</span>
            <span className="text-xs opacity-50 block">Alert sound on critical incoming incidents.</span>
          </div>
          <input
            type="checkbox"
            defaultChecked
            className="w-4 h-4 rounded text-brand-500 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 cursor-pointer"
          />
        </div>

        {/* API configs info */}
        <div className="flex items-center justify-between pb-2">
          <div className="space-y-1">
            <span className="text-sm font-bold block">Developer Mode</span>
            <span className="text-xs opacity-50 block">Show raw spatial database queries and console metrics.</span>
          </div>
          <input
            type="checkbox"
            className="w-4 h-4 rounded text-brand-500 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
};

export default Settings;
