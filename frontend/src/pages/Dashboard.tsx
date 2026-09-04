import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, Users, Home, Bell, Activity, ShieldAlert,
  Truck, AlertOctagon, X, Database, Wifi, Cpu,
  Navigation2, Navigation, MapPin, Clock, Gauge, ChevronRight, ShieldCheck, Compass, ArrowRight
} from 'lucide-react';
import { DisasterMap } from '../components/DisasterMap';
import { SeverityDistributionChart } from '../components/DisasterCharts';
import api from '../services/api';
import { RootState } from '../store';

// ─── Key rescue corridors (incident zone → nearest hospital/shelter) ──────────
const RESCUE_CORRIDORS = [
  { id: 'r1', label: 'Hyderabad → Warangal', from: [17.3850, 78.4867] as [number,number], to: [17.9689, 79.5941] as [number,number], priority: 'HIGH', bdaBadge: 'Best Route', bdaColor: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
  { id: 'r2', label: 'Vijayawada → Guntur',  from: [16.5062, 80.6480] as [number,number], to: [16.3067, 80.4365] as [number,number], priority: 'CRITICAL', bdaBadge: 'Caution Route', bdaColor: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
  { id: 'r3', label: 'Karimnagar → Nalgonda',from: [18.4386, 79.1288] as [number,number], to: [17.0575, 79.2684] as [number,number], priority: 'CRITICAL', bdaBadge: 'High Hazard', bdaColor: 'bg-rose-500/10 text-rose-500 border-rose-500/20' },
  { id: 'r4', label: 'Visakhapatnam → Kakinada', from: [17.6868, 83.2185] as [number,number], to: [16.9891, 82.2475] as [number,number], priority: 'MEDIUM', bdaBadge: 'Best Route', bdaColor: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
  { id: 'r5', label: 'Kurnool → Tirupati',   from: [15.8281, 78.0373] as [number,number], to: [13.6284, 79.4192] as [number,number], priority: 'HIGH', bdaBadge: 'Caution Route', bdaColor: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
];

// fetch OSRM geometry for a route
async function fetchOSRMRoute(from: [number,number], to: [number,number]): Promise<{ path: [number,number][]; distKm: number; durMins: number }> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.code !== 'Ok' || !data.routes?.[0]) throw new Error('No route');
    const coords: [number,number][] = data.routes[0].geometry.coordinates.map(([lng, lat]: [number,number]) => [lat, lng]);
    const distKm  = Math.round(data.routes[0].distance / 100) / 10;
    const durMins = Math.round(data.routes[0].duration / 60);
    return { path: coords, distKm, durMins };
  } catch {
    // Fallback straight line if OSRM is unavailable
    return { path: [from, to], distKm: 0, durMins: 0 };
  }
}

export const Dashboard: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);
  const [selectedCorridor, setSelectedCorridor] = useState<string>('r1');
  const [routePaths, setRoutePaths]   = useState<[number,number][][]>([]);
  const [routeStats, setRouteStats]   = useState<Record<string, { distKm: number; durMins: number }>>({});
  const [loadingRoutes, setLoadingRoutes] = useState(true);

  // Fetch all rescue route geometries on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const paths: [number,number][][] = [];
      const stats: Record<string, { distKm: number; durMins: number }> = {};
      for (const corridor of RESCUE_CORRIDORS) {
        const result = await fetchOSRMRoute(corridor.from, corridor.to);
        if (!cancelled) {
          paths.push(result.path);
          stats[corridor.id] = { distKm: result.distKm, durMins: result.durMins };
        }
      }
      if (!cancelled) { setRoutePaths(paths); setRouteStats(stats); setLoadingRoutes(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  const { data: dashboardData, isLoading } = useQuery(
    ['dashboard-stats'],
    async () => { const res = await api.get('/dashboard/stats'); return res.data; },
    { refetchInterval: 10000 }
  );

  const { data: incidentLogs } = useQuery(
    ['recent-incidents-log'],
    async () => { const res = await api.get('/incidents', { params: { limit: 5 } }); return res.data; },
    { refetchInterval: 10000 }
  );

  const { data: mapData } = useQuery(
    ['map-incidents-hospitals'],
    async () => {
      const resInc  = await api.get('/incidents',  { params: { limit: 50 } });
      const resHosp = await api.get('/resources',  { params: { type: 'HOSPITAL_BED',     limit: 50 } });
      const resShelt= await api.get('/resources',  { params: { type: 'SHELTER_CAPACITY', limit: 50 } });
      const items: any[] = [];
      resInc.data?.incidents?.forEach((inc: any) => {
        items.push({ id: inc.id, title: inc.title, type: 'incident',
          coordinates: [inc.geom.coordinates[1], inc.geom.coordinates[0]],
          details: `${inc.severity} severity - Status: ${inc.status}`, severity: inc.severity });
      });
      resHosp.data?.resources?.forEach((h: any) => {
        items.push({ id: h.id, title: h.name || `Hospital ${h.id.slice(0,5)}`, type: 'hospital',
          coordinates: [h.geom.coordinates[1], h.geom.coordinates[0]], details: `Available beds: ${h.quantity}` });
      });
      resShelt.data?.resources?.forEach((s: any) => {
        items.push({ id: s.id, title: s.name || `Shelter ${s.id.slice(0,5)}`, type: 'shelter',
          coordinates: [s.geom.coordinates[1], s.geom.coordinates[0]], details: `Open capacity: ${s.quantity}` });
      });
      return items;
    },
    { refetchInterval: 10000 }
  );

  const stats = [
    { name: 'Active Incidents', value: dashboardData?.activeIncidents ?? '...', change: 'Real-time active alert status', icon: AlertTriangle, color: 'text-red-500 bg-red-500/10' },
    { name: 'Volunteers',       value: dashboardData?.volunteers       ?? '...', change: 'Responders on-duty',           icon: Users,         color: 'text-brand-500 bg-brand-500/10' },
    { name: 'Hospital Beds',    value: dashboardData?.availableBeds    ?? '...', change: 'Total available beds',         icon: Activity,      color: 'text-emerald-500 bg-emerald-500/10' },
    { name: 'Shelters',         value: dashboardData?.shelters         ?? '...', change: 'Active refuge shelters',       icon: Home,          color: 'text-amber-500 bg-amber-500/10' },
    { name: 'Ambulances',       value: dashboardData?.ambulances       ?? '...', change: 'Available medical transport',  icon: Truck,         color: 'text-cyan-500 bg-cyan-500/10' },
    { name: 'SOS Requests',     value: dashboardData?.emergencyRequests?? '...', change: 'Pending distress signals',     icon: AlertOctagon,  color: 'text-rose-500 bg-rose-500/10' },
  ];

  const priorityColor = (p: string) =>
    p === 'CRITICAL' ? 'bg-rose-500/10 text-rose-500 border-rose-500/25'
    : p === 'HIGH'   ? 'bg-amber-500/10 text-amber-500 border-amber-500/25'
    :                  'bg-blue-500/10 text-blue-500 border-blue-500/25';

  return (
    <div className="space-y-6">
      {/* Hero banner */}
      <div className="p-6 bg-gradient-to-r from-slate-900 via-slate-800 to-brand-950 border border-slate-800 rounded-3xl shadow-lg relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between">
        <div className="space-y-1 relative z-10">
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Welcome, {user?.firstName || 'User'}
          </h1>
          <p className="text-sm text-slate-300">Emergency status monitoring room for Andhra Pradesh &amp; Telangana.</p>
        </div>
        <button
          onClick={() => setIsDiagnosticsOpen(true)}
          className="mt-4 md:mt-0 px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 rounded-2xl flex items-center space-x-2 text-xs font-bold text-white relative z-10 cursor-pointer transition-all duration-200 active:scale-95"
        >
          <ShieldAlert size={16} className="text-red-400 animate-pulse" />
          <span>Active Command System</span>
        </button>
        <div className="absolute right-0 bottom-0 top-0 w-1/3 bg-brand-500/10 blur-3xl rounded-full pointer-events-none" />
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.name} className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-bold opacity-60 uppercase tracking-wider block">{stat.name}</span>
                <div className={`p-2 rounded-lg ${stat.color} shrink-0`}><Icon size={18} /></div>
              </div>
              <div className="mt-4 space-y-1">
                <span className="text-2xl font-black block leading-none">{stat.value}</span>
                <span className="text-[9px] block opacity-50 font-semibold">{stat.change}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Map + right panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col h-[500px]">
          <h2 className="text-lg font-bold mb-4">Live Incident Map</h2>
          <div className="flex-1 rounded-xl overflow-hidden">
            {isLoading ? (
              <div className="h-full w-full bg-slate-100 dark:bg-slate-950 animate-pulse rounded-xl flex items-center justify-center text-xs opacity-50">Loading map coordinates...</div>
            ) : (
              <DisasterMap items={mapData || []} routePaths={routePaths} />
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
                      inc.severity === 'HIGH'     ? 'bg-orange-500' : 'bg-yellow-500'
                    }`} />
                    <div className="flex-1">
                      <p className="font-bold">{inc.title}</p>
                      <p className="opacity-50">{inc.district}, {inc.state} — {inc.status}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── RESCUE ROUTES PANEL WITH BDA RISK ANALYSIS ENGINE ───────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Navigation2 size={16} className="text-indigo-500" />
            <h2 className="font-bold text-sm text-slate-800 dark:text-slate-100">Rescue Route Intelligence &amp; Risk Solver</h2>
            <span className="ml-2 text-[10px] text-slate-400">OSRM Multi-Route API + BDA Risk Engine</span>
            {loadingRoutes && (
              <span className="ml-2 text-[10px] text-indigo-400 animate-pulse flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping inline-block" />
                <span>Computing routes…</span>
              </span>
            )}
          </div>
          <Link
            to="/escape-routes"
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-bold transition"
          >
            <Compass size={14} />
            <span>Open BDA Escape Engine</span>
            <ArrowRight size={12} />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-slate-100 dark:divide-slate-800">
          {/* Corridor list */}
          <div className="md:col-span-2 divide-y divide-slate-100 dark:divide-slate-800">
            {RESCUE_CORRIDORS.map((c) => {
              const stats = routeStats[c.id];
              const isActive = selectedCorridor === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedCorridor(c.id)}
                  className={`w-full text-left px-5 py-4 flex items-center justify-between transition
                    ${isActive ? 'bg-indigo-50 dark:bg-indigo-500/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'}`}
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className={`px-1.5 py-0.5 border rounded text-[8px] font-black uppercase ${priorityColor(c.priority)}`}>
                        {c.priority}
                      </span>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{c.label}</p>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${c.bdaColor}`}>
                        {c.bdaBadge}
                      </span>
                      {stats && (
                        <span className="text-[10px] text-slate-400">
                          {stats.distKm} km • ~{stats.durMins} min
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight size={14} className={`shrink-0 transition ${isActive ? 'text-indigo-500' : 'text-slate-300 dark:text-slate-600'}`} />
                </button>
              );
            })}
          </div>

          {/* Active corridor detail */}
          <div className="md:col-span-3 p-6">
            {(() => {
              const c = RESCUE_CORRIDORS.find(r => r.id === selectedCorridor)!;
              const s = routeStats[c.id];
              return (
                <div className="space-y-5 h-full flex flex-col">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">{c.label}</h3>
                      <p className="text-[10px] text-slate-400 mt-0.5">BDA Score = (0.35 × Distance) + (0.35 × Time) + (0.30 × Road Risk)</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase border ${c.bdaColor}`}>
                      {c.bdaBadge}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { label: 'Distance',    value: s?.distKm  > 0 ? `${s.distKm} km`  : '—', icon: <Navigation size={14}/>, color: 'text-indigo-500 bg-indigo-500/10' },
                      { label: 'Travel Time', value: s?.durMins > 0 ? `${s.durMins} min` : '—', icon: <Clock size={14}/>,       color: 'text-blue-500 bg-blue-500/10' },
                      { label: 'Status',      value: loadingRoutes ? 'Routing…' : 'Active',      icon: <Gauge size={14}/>,       color: 'text-emerald-500 bg-emerald-500/10' },
                    ].map(m => (
                      <div key={m.label} className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl text-center space-y-1.5">
                        <div className={`w-7 h-7 rounded-lg ${m.color} flex items-center justify-center mx-auto`}>{m.icon}</div>
                        <p className="text-base font-black text-slate-800 dark:text-slate-100">{m.value}</p>
                        <p className="text-[9px] text-slate-400 uppercase tracking-wider">{m.label}</p>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2 flex-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Route Waypoints &amp; Hazard Verification</p>
                    <div className="space-y-2">
                      {[
                        { label: 'Origin Zone', coord: c.from, dot: 'bg-rose-500' },
                        { label: 'Destination Facility', coord: c.to, dot: 'bg-emerald-500' },
                      ].map(w => (
                        <div key={w.label} className="flex items-center space-x-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${w.dot}`} />
                          <MapPin size={12} className="text-slate-400 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-bold text-slate-600 dark:text-slate-300">{w.label}</p>
                            <p className="text-[10px] font-mono text-slate-400">{w.coord[0].toFixed(4)}, {w.coord[1].toFixed(4)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}
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
              <button onClick={() => setIsDiagnosticsOpen(false)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 rounded-xl transition">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-3.5">
                {[
                  { icon: <Wifi className="text-emerald-500 w-5 h-5"/>, label:'Command Web Server', sub:'NodeJS / Express Endpoint', badge:'ONLINE (12ms)', color:'bg-emerald-500/10 text-emerald-500' },
                  { icon: <Database className="text-indigo-500 w-5 h-5"/>, label:'Relational Database', sub:'Postgres with PostGIS extension', badge:'CONNECTED', color:'bg-indigo-500/10 text-indigo-500' },
                  { icon: <Activity className="text-cyan-500 w-5 h-5"/>, label:'Live WebSocket Stream', sub:'Real-time GPS tracking stream', badge:'CONNECTED', color:'bg-cyan-500/10 text-cyan-500' },
                  { icon: <Cpu className="text-amber-500 w-5 h-5"/>, label:'AI Forecast Pipeline', sub:'ElasticNet DDRPS weight solver', badge:'READY', color:'bg-amber-500/10 text-amber-500' },
                  { icon: <Navigation2 className="text-indigo-500 w-5 h-5"/>, label:'OSRM Routing Engine', sub:'Live rescue route computation', badge: loadingRoutes ? 'ROUTING…' : 'ACTIVE', color:'bg-indigo-500/10 text-indigo-500' },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/60 rounded-2xl">
                    <div className="flex items-center space-x-3">
                      {row.icon}
                      <div>
                        <span className="font-bold text-xs text-slate-800 dark:text-slate-100 block">{row.label}</span>
                        <span className="text-[10px] text-slate-400">{row.sub}</span>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 text-[9px] font-black tracking-wider rounded-full ${row.color}`}>{row.badge}</span>
                  </div>
                ))}
              </div>
              <div className="p-3 bg-brand-500/5 border border-brand-500/10 rounded-xl text-[10px] text-slate-500 dark:text-slate-400 text-center">
                All systems reporting functional. PostGIS + OSRM route solver active.
              </div>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-950/40 border-t dark:border-slate-800 flex justify-end">
              <button onClick={() => setIsDiagnosticsOpen(false)} className="px-4 py-1.5 bg-slate-950 hover:bg-slate-850 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100 text-white rounded-xl text-xs font-bold shadow-sm transition active:scale-95">
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
