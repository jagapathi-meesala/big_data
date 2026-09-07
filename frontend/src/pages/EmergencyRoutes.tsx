import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { Link } from 'react-router-dom';
import { Navigation, ShieldAlert, CheckCircle2, AlertTriangle, XCircle, ArrowRight, Activity, MapPin, Clock, Compass, Layers, RefreshCw } from 'lucide-react';
import api from '../services/api';

// Custom Leaflet Icons
const userIcon = L.divIcon({
  className: 'custom-user-pin',
  html: `<div style="background-color: #3b82f6; width: 18px; height: 18px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(59, 130, 246, 0.8);"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9]
});

const hospitalIcon = L.divIcon({
  className: 'custom-hosp-pin',
  html: `<div style="background-color: #10b981; width: 22px; height: 22px; border-radius: 6px; border: 2px solid white; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 11px; box-shadow: 0 2px 8px rgba(16, 185, 129, 0.6);">H</div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11]
});

const DESTINATIONS = [
  { name: 'Apollo ER Hospital (Hyderabad)', lat: 17.3882, lon: 78.4610, district: 'Hyderabad' },
  { name: 'Warangal General Hospital', lat: 17.9689, lon: 79.5941, district: 'Warangal' },
  { name: 'Vijayawada Emergency Trauma Center', lat: 16.5062, lon: 80.6480, district: 'Vijayawada' },
  { name: 'Visakhapatnam Super Speciality ER', lat: 17.6868, lon: 83.2185, district: 'Visakhapatnam' },
  { name: 'Tirupati Relief & Medical Hub', lat: 13.6284, lon: 79.4192, district: 'Tirupati' }
];

export const EmergencyRoutes: React.FC = () => {
  const [selectedDestIndex, setSelectedDestIndex] = useState(0);
  const [activeRouteId, setActiveRouteId] = useState<string>('route-1');
  const userLat = 17.3850;
  const userLon = 78.4867;

  const target = DESTINATIONS[selectedDestIndex];

  // Query BDA Emergency Escape Route Engine API
  const { data, isLoading, refetch } = useQuery(
    ['bda-escape-routes', selectedDestIndex],
    async () => {
      const res = await api.get('/public-apis/escape-routes', {
        params: {
          originLat: userLat,
          originLon: userLon,
          destLat: target.lat,
          destLon: target.lon,
          targetName: target.name
        }
      });
      return res.data;
    },
    { refetchOnWindowFocus: false }
  );

  const routes = data?.data?.routes || [];
  const activeRoute = routes.find((r: any) => r.id === activeRouteId) || routes[0];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
              Emergency Escape Route Recommendation Engine
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20 text-[10px] font-bold uppercase tracking-wider">
              OSRM + BDA Multi-Risk Solver
            </span>
          </div>
          <p className="text-sm opacity-60">
            Real-time OSRM alternative route generation combined with BDA flood/storm/traffic risk analysis.
          </p>
        </div>

        <button
          onClick={() => refetch()}
          className="flex items-center space-x-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-bold transition shadow-sm"
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          <span>Re-compute Escape Routes</span>
        </button>
      </div>

      {/* Sub-navigation tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-6 text-sm font-semibold">
        <Link to="/hospitals" className="pb-3 text-slate-400 hover:text-slate-650 dark:hover:text-slate-200 transition">
          Hospitals &amp; Resources
        </Link>
        <Link to="/escape-routes" className="border-b-2 border-brand-500 pb-3 text-brand-500">
          Escape Route Engine
        </Link>
        <Link to="/shelters" className="pb-3 text-slate-400 hover:text-slate-650 dark:hover:text-slate-200 transition">
          Refuge Shelters
        </Link>
      </div>

      {/* BDA Architecture Card */}
      <div className="p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/20 rounded-2xl text-white shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Compass className="text-indigo-400" size={18} />
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">
              BDA Route Scoring Engine: Score = (0.35 × Distance) + (0.35 × Time) + (0.30 × Road Risk)
            </span>
          </div>
          <span className="text-[10px] px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full font-bold border border-emerald-500/30">
            Active Multi-Route GeoJSON Solver
          </span>
        </div>
        <p className="text-xs opacity-80">
          User Location <span className="text-indigo-400 font-bold">→</span> OpenStreetMap Road Network <span className="text-indigo-400 font-bold">→</span> OSRM Engine <span className="text-indigo-400 font-bold">→</span> Candidate Routes (A, B, C) <span className="text-indigo-400 font-bold">→</span> BDA Risk Solver <span className="text-indigo-400 font-bold">→</span> <span className="text-emerald-400 font-extrabold">RECOMMENDED ROUTE</span>
        </p>

        <div className="flex items-center space-x-3 pt-2">
          <span className="text-xs font-bold opacity-80">Select Destination Target:</span>
          <select
            value={selectedDestIndex}
            onChange={(e) => setSelectedDestIndex(parseInt(e.target.value, 10))}
            className="px-3 py-1.5 bg-slate-800 border border-indigo-500/30 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-indigo-400"
          >
            {DESTINATIONS.map((d, idx) => (
              <option key={d.name} value={idx}>{d.name} ({d.district})</option>
            ))}
          </select>
        </div>
      </div>

      {/* Comparative BDA Risk Analysis Table */}
      <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-base flex items-center space-x-2">
            <ShieldAlert size={18} className="text-indigo-500" />
            <span>Comparative Candidate Route Risk Analysis</span>
          </h2>
          <span className="text-xs text-slate-400">Target: <strong className="text-slate-700 dark:text-slate-200">{target.name}</strong></span>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-xs opacity-60">Computing OSRM multi-route geometry &amp; BDA risk scores...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {routes.map((r: any) => {
              const isSelected = r.id === activeRouteId;
              return (
                <div
                  key={r.id}
                  onClick={() => setActiveRouteId(r.id)}
                  className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-indigo-50/50 dark:bg-indigo-500/10 border-indigo-500 ring-2 ring-indigo-500/30 shadow-md'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-extrabold">{r.name}</span>
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase"
                      style={{ backgroundColor: `${r.color}20`, color: r.color }}
                    >
                      {r.badge}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center p-3 bg-slate-50 dark:bg-slate-950 rounded-xl mb-3 border border-slate-100 dark:border-slate-800">
                    <div>
                      <span className="text-[9px] opacity-60 uppercase block font-semibold">Distance</span>
                      <span className="text-sm font-extrabold">{r.distanceKm} km</span>
                    </div>
                    <div>
                      <span className="text-[9px] opacity-60 uppercase block font-semibold">Est. Time</span>
                      <span className="text-sm font-extrabold">{r.durationMins} min</span>
                    </div>
                    <div>
                      <span className="text-[9px] opacity-60 uppercase block font-semibold">Road Risk</span>
                      <span className={`text-sm font-extrabold ${r.roadRiskScore > 50 ? 'text-red-500' : r.roadRiskScore > 25 ? 'text-amber-500' : 'text-emerald-500'}`}>
                        {r.roadRiskScore}/100
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="opacity-70 text-[10px]">Composite Score:</span>
                    <span className="font-extrabold text-indigo-500">{r.compositeScore}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Map & Turn-by-Turn Steps Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Leaflet Map Polyline Display */}
        <div className="lg:col-span-2 p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col h-[500px]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold flex items-center space-x-2">
              <Layers size={18} className="text-brand-500" />
              <span>Multi-Route GeoJSON Map Visualization</span>
            </h2>
            <div className="flex items-center space-x-3 text-[10px] font-bold">
              <span className="flex items-center space-x-1"><span className="w-3 h-1 bg-emerald-500 rounded inline-block"></span><span>Best Route</span></span>
              <span className="flex items-center space-x-1"><span className="w-3 h-1 bg-amber-500 rounded inline-block"></span><span>Caution Route</span></span>
              <span className="flex items-center space-x-1"><span className="w-3 h-1 bg-red-500 rounded inline-block"></span><span>High Hazard</span></span>
            </div>
          </div>

          <div className="flex-1 rounded-xl overflow-hidden border dark:border-slate-800">
            {isLoading ? (
              <div className="h-full w-full bg-slate-100 dark:bg-slate-950 animate-pulse flex items-center justify-center text-xs opacity-50">
                Loading escape polylines...
              </div>
            ) : (
              <MapContainer
                center={[userLat, userLon]}
                zoom={9}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <Marker position={[userLat, userLon]} icon={userIcon}>
                  <Popup><strong>User Location (Start)</strong></Popup>
                </Marker>

                <Marker position={[target.lat, target.lon]} icon={hospitalIcon}>
                  <Popup><strong>{target.name}</strong></Popup>
                </Marker>

                {routes.map((r: any) => (
                  <Polyline
                    key={r.id}
                    positions={r.polyline}
                    pathOptions={{
                      color: r.color,
                      weight: r.id === activeRouteId ? 6 : 3,
                      opacity: r.id === activeRouteId ? 0.9 : 0.4,
                      dashArray: r.id === activeRouteId ? undefined : '6, 6'
                    }}
                  />
                ))}
              </MapContainer>
            )}
          </div>
        </div>

        {/* Turn-by-Turn Steps Accordion */}
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-4 flex flex-col h-[500px]">
          <div className="flex items-center justify-between pb-2 border-b dark:border-slate-800">
            <div>
              <h2 className="font-bold text-sm">Turn-by-Turn Navigation</h2>
              <p className="text-[10px] opacity-60">Active: {activeRoute?.name}</p>
            </div>
            <span
              className="px-2 py-0.5 rounded text-[9px] font-black uppercase"
              style={{ backgroundColor: `${activeRoute?.color}20`, color: activeRoute?.color }}
            >
              {activeRoute?.badge}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-2">
            {activeRoute?.steps?.map((step: string, idx: number) => (
              <div key={idx} className="flex items-start space-x-3 p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800 text-xs">
                <div className="w-5 h-5 rounded-full bg-brand-500/10 text-brand-500 flex items-center justify-center font-bold text-[10px] shrink-0">
                  {idx + 1}
                </div>
                <span className="font-semibold text-slate-700 dark:text-slate-300">{step}</span>
              </div>
            ))}
          </div>

          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold text-center">
            OSRM Live GeoJSON Polyline Loaded Successfully
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmergencyRoutes;
