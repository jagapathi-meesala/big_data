import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertOctagon, ShieldCheck, MapPin, Radio, Activity } from 'lucide-react';
import api from '../services/api';
import { useSocket } from '../hooks/useSocket';

export const EmergencyRequests: React.FC = () => {
  const queryClient = useQueryClient();
  const [autoVerify, setAutoVerify] = useState(() => {
    return localStorage.getItem('auto-verify-sos') === 'true';
  });

  const { data, isLoading } = useQuery(['sos-requests'], async () => {
    const res = await api.get('/incidents', { params: { severity: 'CRITICAL', limit: 100 } });
    return res.data;
  });

  const verifyMutation = useMutation(
    async (id: string) => {
      return api.patch(`/incidents/${id}/status`, { status: 'VERIFIED' });
    },
    {
      onMutate: async (id: string) => {
        await queryClient.cancelQueries(['sos-requests']);
        const previousData = queryClient.getQueryData(['sos-requests']);
        queryClient.setQueryData(['sos-requests'], (old: any) => {
          if (!old || !old.incidents) return old;
          return {
            ...old,
            incidents: old.incidents.map((inc: any) => 
              inc.id === id ? { ...inc, status: 'VERIFIED' } : inc
            )
          };
        });
        return { previousData };
      },
      onError: (err: any, id: string, context: any) => {
        if (context?.previousData) {
          queryClient.setQueryData(['sos-requests'], context.previousData);
        }
        alert("Failed to verify distress: " + (err.response?.data?.message || err.message));
      },
      onSettled: () => {
        queryClient.invalidateQueries(['sos-requests']);
      }
    }
  );

  const incidents = data?.incidents || [];
  const totalAlerts = incidents.length;
  const unverifiedAlerts = incidents.filter((i: any) => i.status === 'REPORTED').length;
  const verifiedAlerts = totalAlerts - unverifiedAlerts;

  useSocket('incident:created', (newIncident: any) => {
    queryClient.invalidateQueries(['sos-requests']);
    if (autoVerify && newIncident && newIncident.severity === 'CRITICAL' && newIncident.status === 'REPORTED') {
      const incId = newIncident.id || newIncident.getDataValue?.('id');
      if (incId) {
        verifyMutation.mutate(incId);
      }
    }
  });

  const handleToggleAutoVerify = (checked: boolean) => {
    setAutoVerify(checked);
    localStorage.setItem('auto-verify-sos', String(checked));
    if (checked) {
      incidents.forEach((inc: any) => {
        if (inc.status === 'REPORTED') {
          verifyMutation.mutate(inc.id);
        }
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 w-full">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100 flex items-center space-x-2">
            <Radio size={24} className="text-rose-500 animate-pulse" />
            <span>SOS Distress Signals</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">High-priority emergency alerts submitted by citizens or sensors.</p>
        </div>

        <div className="flex items-center space-x-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-2.5 rounded-2xl shadow-sm">
          <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Auto-Verify Incoming Signals</span>
          <label className="relative inline-flex items-center cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoVerify}
              onChange={(e) => handleToggleAutoVerify(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 dark:bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
          </label>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex items-center space-x-3">
          <div className="p-3 bg-rose-500/10 text-rose-500 rounded-xl">
            <AlertOctagon size={20} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total SOS Alerts</span>
            <p className="text-xl font-black text-slate-850 dark:text-slate-100 mt-0.5">{totalAlerts}</p>
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex items-center space-x-3">
          <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl">
            <Radio size={20} className="animate-pulse" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Unverified Calls</span>
            <p className="text-xl font-black text-slate-850 dark:text-slate-100 mt-0.5">{unverifiedAlerts}</p>
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex items-center space-x-3">
          <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
            <ShieldCheck size={20} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Verified Logs</span>
            <p className="text-xl font-black text-slate-850 dark:text-slate-100 mt-0.5">{verifiedAlerts}</p>
          </div>
        </div>
      </div>

      {/* Main workspace */}
      {isLoading ? (
        <div className="text-center py-20 opacity-55 text-sm">Querying distress feeds...</div>
      ) : totalAlerts === 0 ? (
        <div className="text-center py-20 opacity-55 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
          No active critical distress signals reported.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {incidents.map((req: any) => {
            const isUnverified = req.status === 'REPORTED';
            return (
              <div
                key={req.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-4 relative overflow-hidden"
              >
                {/* Left accent strip */}
                <div className="absolute top-0 bottom-0 left-0 w-1.5 bg-rose-500" />

                {/* Top header row inside card */}
                <div className="flex justify-between items-start pl-2">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                      </span>
                      <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-200">{req.title}</h3>
                    </div>
                    <span className="text-[9px] font-bold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-md border border-slate-200/50 dark:border-slate-750 block w-fit">
                      {req.district || 'Unspecified'}, {req.state || 'Unspecified'}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded text-[8px] font-bold uppercase tracking-wider shrink-0">
                    {req.severity} ALERT
                  </span>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-650 dark:text-slate-350 leading-relaxed pl-2">
                  {req.description || 'No additional parameters provided.'}
                </p>

                {/* Details Footer parameters */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-4 pl-2">
                  <div className="flex items-center space-x-1 text-slate-400 font-mono text-[9px]">
                    <MapPin size={12} className="text-slate-400" />
                    <span>GPS: {req.geom.coordinates[1].toFixed(5)}, {req.geom.coordinates[0].toFixed(5)}</span>
                  </div>

                  {isUnverified ? (
                    <button
                      onClick={() => verifyMutation.mutate(req.id)}
                      disabled={verifyMutation.isLoading && verifyMutation.variables === req.id}
                      className="px-3.5 py-2 bg-rose-500 hover:bg-rose-600 disabled:bg-rose-400 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-lg shadow-rose-500/10 shrink-0 cursor-pointer disabled:cursor-not-allowed"
                    >
                      {verifyMutation.isLoading && verifyMutation.variables === req.id ? (
                        <span className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent mr-1" />
                      ) : (
                        <ShieldCheck size={14} />
                      )}
                      <span>{verifyMutation.isLoading && verifyMutation.variables === req.id ? 'Verifying...' : 'Verify Distress'}</span>
                    </button>
                  ) : (
                    <span className="px-3 py-2 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-xl text-[10px] font-bold flex items-center space-x-1 shrink-0">
                      <ShieldCheck size={14} />
                      <span>Distress Verified</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default EmergencyRequests;
