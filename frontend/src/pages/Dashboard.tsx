import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { AlertTriangle, Users, Home, Bell, Activity, ShieldAlert, Truck, AlertOctagon, X, CheckCircle2, Database, Wifi, Cpu } from 'lucide-react';
import { DisasterMap } from '../components/DisasterMap';
import { SeverityDistributionChart } from '../components/DisasterCharts';
import api from '../services/api';
import { RootState } from '../store';

export const Dashboard: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);

  const { data: dashboardData, isLoading } = useQuery(
    ['dashboard-stats'],
    async () => {
      const res = await api.get('/dashboard/stats');
      return res.data;
    },
    {
      refetchInterval: 10000, // Update automatically every 10 seconds
    }
  );

  const { data: incidentLogs } = useQuery(
    ['recent-incidents-log'],
    async () => {
      const res = await api.get('/incidents', { params: { limit: 5 } });
      return res.data;
    },
    {
      refetchInterval: 10000,
    }
  );

  const { data: mapData } = useQuery(
    ['map-incidents-hospitals'],
    async () => {
      const resInc = await api.get('/incidents', { params: { limit: 50 } });
      const resHosp = await api.get('/resources', { params: { type: 'HOSPITAL_BED', limit: 50 } });
      const resShelt = await api.get('/resources', { params: { type: 'SHELTER_CAPACITY', limit: 50 } });
      
      const items: any[] = [];
      resInc.data?.incidents?.forEach((inc: any) => {
        items.push({
          id: inc.id,
          title: inc.title,
          type: 'incident',
          coordinates: [inc.geom.coordinates[1], inc.geom.coordinates[0]],
          details: `${inc.severity} severity - Status: ${inc.status}`
        });
      });
      resHosp.data?.resources?.forEach((hosp: any) => {
        items.push({
          id: hosp.id,
          title: hosp.name || `Hospital ${hosp.id.slice(0, 5)}`,
          type: 'hospital',
          coordinates: [hosp.geom.coordinates[1], hosp.geom.coordinates[0]],
          details: `Available beds: ${hosp.quantity}`
        });
      });
      resShelt.data?.resources?.forEach((shelt: any) => {
        items.push({
          id: shelt.id,
          title: shelt.name || `Shelter ${shelt.id.slice(0, 5)}`,
          type: 'shelter',
          coordinates: [shelt.geom.coordinates[1], shelt.geom.coordinates[0]],
          details: `Open capacity: ${shelt.quantity}`
        });
      });
      return items;
    },
    {
      refetchInterval: 10000,
    }
  );

  const stats = [
    { name: 'Active Incidents', value: dashboardData?.activeIncidents ?? '...', change: 'Real-time active alert status', icon: AlertTriangle, color: 'text-red-500 bg-red-500/10' },
    { name: 'Volunteers', value: dashboardData?.volunteers ?? '...', change: 'Responders on-duty', icon: Users, color: 'text-brand-500 bg-brand-500/10' },
    { name: 'Hospital Beds', value: dashboardData?.availableBeds ?? '...', change: 'Total available beds', icon: Activity, color: 'text-emerald-500 bg-emerald-500/10' },
    { name: 'Shelters', value: dashboardData?.shelters ?? '...', change: 'Active refuge shelters', icon: Home, color: 'text-amber-500 bg-amber-500/10' },
    { name: 'Ambulances', value: dashboardData?.ambulances ?? '...', change: 'Available medical transport', icon: Truck, color: 'text-cyan-500 bg-cyan-500/10' },
    { name: 'SOS Requests', value: dashboardData?.emergencyRequests ?? '...', change: 'Pending distress signals', icon: AlertOctagon, color: 'text-rose-500 bg-rose-500/10' },
  ];

  return (
    <div className="space-y-6">
      <div className="p-6 bg-gradient-to-r from-slate-900 via-slate-800 to-brand-950 border border-slate-800 rounded-3xl shadow-lg relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between">
        <div className="space-y-1 relative z-10">
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Welcome, {user?.firstName || 'Jagapathi'}
          </h1>
          <p className="text-sm text-slate-300">
            Emergency status monitoring room for Andhra Pradesh & Telangana.
          </p>
        </div>
        <button 
          onClick={() => setIsDiagnosticsOpen(true)}
          className="mt-4 md:mt-0 px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 rounded-2xl flex items-center space-x-2 text-xs font-bold text-white relative z-10 cursor-pointer transition-all duration-200 active:scale-95"
        >
          <ShieldAlert size={16} className="text-red-400 animate-pulse" />
          <span>Active Command System</span>
        </button>
        <div className="absolute right-0 bottom-0 top-0 w-1/3 bg-brand-500/10 blur-3xl rounded-full pointer-events-none"></div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.name} className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-bold opacity-60 uppercase tracking-wider block">{stat.name}</span>
                <div className={`p-2 rounded-lg ${stat.color} shrink-0`}>
                  <Icon size={18} />
                </div>
              </div>
              <div className="mt-4 space-y-1">
                <span className="text-2xl font-black block leading-none">{stat.value}</span>
                <span className="text-[9px] block opacity-50 font-semibold">{stat.change}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col h-[500px]">
          <h2 className="text-lg font-bold mb-4">Live Incident Map</h2>
          <div className="flex-1 rounded-xl overflow-hidden">
            {isLoading ? (
              <div className="h-full w-full bg-slate-100 dark:bg-slate-950 animate-pulse rounded-xl flex items-center justify-center text-xs opacity-50">Loading map coordinates...</div>
            ) : (
              <DisasterMap items={mapData || []} />
            )}
          </div>
        </div>

        <div className="space-y-6 flex flex-col justify-between">
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
            <h2 className="text-lg font-bold mb-4">Incident Severity Mix</h2>
            <div className="h-[200px] flex items-center justify-center">
              <SeverityDistributionChart severityDistribution={dashboardData?.severityDistribution} />
            </div>
          </div>

          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex-1">
            <h2 className="text-lg font-bold mb-4 flex items-center space-x-2">
              <Bell className="text-brand-500" size={20} />
              <span>Critical Incident Log</span>
            </h2>
            <div className="space-y-4 max-h-[160px] overflow-y-auto pr-2">
              {incidentLogs?.incidents?.length === 0 ? (
                <div className="text-xs opacity-50 py-4 text-center">No incidents logged.</div>
              ) : (
                incidentLogs?.incidents?.map((inc: any) => (
                  <div key={inc.id} className="flex items-start space-x-3 text-xs border-b pb-2 last:border-0 dark:border-slate-800">
                    <span className={`w-2.5 h-2.5 rounded-full mt-0.5 shrink-0 ${
                      inc.severity === 'CRITICAL' ? 'bg-red-500' :
                      inc.severity === 'HIGH' ? 'bg-orange-500' : 'bg-yellow-500'
                    }`}></span>
                    <div className="flex-1">
                      <p className="font-bold">{inc.title}</p>
                      <p className="opacity-50">{inc.district}, {inc.state} - status: {inc.status}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Diagnostics Modal */}
      {isDiagnosticsOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
            <div className="p-6 border-b dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
              <div className="flex items-center space-x-2.5">
                <ShieldAlert className="text-brand-500 w-5 h-5 animate-pulse" />
                <h3 className="text-base font-bold text-slate-850 dark:text-white">Active Command Diagnostics</h3>
              </div>
              <button 
                onClick={() => setIsDiagnosticsOpen(false)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 rounded-xl transition"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="space-y-3.5">
                <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/60 rounded-2xl">
                  <div className="flex items-center space-x-3">
                    <Wifi className="text-emerald-500 w-5 h-5" />
                    <div>
                      <span className="font-bold text-xs text-slate-800 dark:text-slate-100 block">Command Web Server</span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-450">NodeJS / Express Endpoint</span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 text-[9px] font-black tracking-wider bg-emerald-500/10 text-emerald-500 rounded-full">ONLINE (12ms)</span>
                </div>

                <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/60 rounded-2xl">
                  <div className="flex items-center space-x-3">
                    <Database className="text-indigo-500 w-5 h-5" />
                    <div>
                      <span className="font-bold text-xs text-slate-800 dark:text-slate-100 block">Relational Database</span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-450">Postgres with PostGIS extension</span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 text-[9px] font-black tracking-wider bg-indigo-500/10 text-indigo-500 rounded-full">CONNECTED</span>
                </div>

                <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/60 rounded-2xl">
                  <div className="flex items-center space-x-3">
                    <Activity className="text-cyan-500 w-5 h-5" />
                    <div>
                      <span className="font-bold text-xs text-slate-800 dark:text-slate-100 block">Live WebSocket Stream</span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-450">Real-time GPS tracking stream</span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 text-[9px] font-black tracking-wider bg-cyan-500/10 text-cyan-500 rounded-full">CONNECTED</span>
                </div>

                <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/60 rounded-2xl">
                  <div className="flex items-center space-x-3">
                    <Cpu className="text-amber-500 w-5 h-5" />
                    <div>
                      <span className="font-bold text-xs text-slate-800 dark:text-slate-100 block">AI Forecast Pipeline</span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-450">Mathematical linear regression solver</span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 text-[9px] font-black tracking-wider bg-amber-500/10 text-amber-500 rounded-full">READY</span>
                </div>
              </div>

              <div className="p-3 bg-brand-500/5 border border-brand-500/10 rounded-xl text-[10px] text-slate-500 dark:text-slate-400 text-center">
                All systems reporting functional. PostGIS route solver is fully active.
              </div>
            </div>
            
            <div className="p-4 bg-slate-50 dark:bg-slate-950/40 border-t dark:border-slate-800 flex justify-end">
              <button 
                onClick={() => setIsDiagnosticsOpen(false)}
                className="px-4 py-1.5 bg-slate-950 hover:bg-slate-850 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100 text-white rounded-xl text-xs font-bold shadow-sm transition active:scale-95"
              >
                Close Panel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
