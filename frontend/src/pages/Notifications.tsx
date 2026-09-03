import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Info, ShieldAlert, CheckCircle } from 'lucide-react';
import api from '../services/api';

export const Notifications: React.FC = () => {
  const { data, isLoading } = useQuery(['system-notifications'], async () => {
    const res = await api.get('/notifications');
    return res.data;
  });

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">System Notifications</h1>
        <p className="text-sm opacity-60">Historical alerts feed for dispatch assignments.</p>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-10 opacity-55 text-sm animate-pulse">Loading notification alerts...</div>
        ) : data?.notifications?.length === 0 ? (
          <div className="text-center py-20 opacity-55 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
            No notification alerts logged yet.
          </div>
        ) : (
          data?.notifications?.map((alert: any) => {
            let Icon = Info;
            let color = 'bg-blue-500/10 text-blue-500';
            if (alert.type === 'ALERT') {
              Icon = ShieldAlert;
              color = 'bg-red-500/10 text-red-500';
            } else if (alert.type === 'SUCCESS') {
              Icon = CheckCircle;
              color = 'bg-emerald-500/10 text-emerald-500';
            }
            return (
              <div key={alert.id} className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex items-start space-x-4">
                <div className={`p-2.5 rounded-xl ${color}`}>
                  <Icon size={20} />
                </div>
                <div className="space-y-1 flex-1">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-sm">{alert.title}</h3>
                    <span className="text-[10px] opacity-40">
                      {new Date(alert.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs opacity-75 leading-relaxed">{alert.message}</p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Notifications;
