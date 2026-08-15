import React from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { Download, FileText } from 'lucide-react';
import api from '../services/api';

export const Reports: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const reports = [
    { timeframe: 'daily', name: 'Daily Disaster Resource Summary', desc: 'Summary metrics and incident logs updated for the past 24 hours.' },
    { timeframe: 'weekly', name: 'Weekly Allocation & Efficiency Log', desc: 'Resource usage distributions, volunteer activity summary, and ER occupancy.' },
    { timeframe: 'monthly', name: 'Monthly Regional Command Audit', desc: 'Extended chronological trend sheets, district charts, and damage valuations.' }
  ];

  const handleDownload = async (timeframe: string) => {
    try {
      const response = await api.get(`/reports/pdf`, {
        params: { timeframe },
        responseType: 'blob'
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `aid_dras_${timeframe}_report.pdf`;
      link.click();
    } catch (err) {
      console.error('Failed to download report:', err);
      alert('Error generating PDF report. Please check server logs.');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Post-Disaster Incident Reports</h1>
        <p className="text-sm opacity-60">Generate and export administrative logs for disaster response periods.</p>
      </div>

      {/* Sub-navigation tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-6 text-sm font-semibold">
        <Link to="/analytics" className="pb-3 text-slate-400 hover:text-slate-650 dark:hover:text-slate-200 transition">
          AI Forecasts
        </Link>
        <Link to="/volunteers" className="pb-3 text-slate-400 hover:text-slate-650 dark:hover:text-slate-200 transition">
          Volunteers List
        </Link>
        <Link to="/reports" className="border-b-2 border-brand-500 pb-3 text-brand-500">
          System Reports
        </Link>
        {user?.role === 'ADMIN' && (
          <Link to="/admin" className="pb-3 text-slate-400 hover:text-slate-650 dark:hover:text-slate-200 transition">
            Admin Panel
          </Link>
        )}
      </div>

      <div className="space-y-4">
        {reports.map((report) => (
          <div key={report.timeframe} className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-brand-500/10 text-brand-500 rounded-xl">
                <FileText size={22} />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-sm leading-tight">{report.name}</h3>
                <p className="text-xs opacity-60 max-w-sm">{report.desc}</p>
              </div>
            </div>

            <button
              onClick={() => handleDownload(report.timeframe)}
              className="p-2.5 bg-slate-50 hover:bg-brand-500 dark:bg-slate-950 hover:text-white border dark:border-slate-800 rounded-xl transition shrink-0"
              title="Download PDF"
            >
              <Download size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Reports;
