import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Compass, Navigation, RefreshCw, MapPin, ArrowLeftRight, Gauge } from 'lucide-react';
import api from '../services/api';

// Helper to fit map bounds dynamically on route change
const MapController: React.FC<{ origin: [number, number]; dest: [number, number]; activePolyline?: [number, number][] }> = ({ origin, dest, activePolyline }) => {
  const map = useMap();
  useEffect(() => {
    if (activePolyline && activePolyline.length > 0) {
      const bounds = L.latLngBounds(activePolyline);
      map.fitBounds(bounds, { padding: [40, 40] });
    } else if (origin && dest) {
      const bounds = L.latLngBounds([origin, dest]);
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [origin[0], origin[1], dest[0], dest[1], activePolyline, map]);
  return null;
};

// Custom Leaflet Markers
const originIcon = L.divIcon({
  className: 'custom-origin-pin',
  html: `<div style="background-color: #2563eb; width: 22px; height: 22px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(37, 99, 235, 0.6); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 10px;">A</div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11]
});

const destIcon = L.divIcon({
  className: 'custom-dest-pin',
  html: `<div style="background-color: #059669; width: 22px; height: 22px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(5, 150, 105, 0.6); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 10px;">B</div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11]
});

import { CitySelectDropdown, CityOption, CITIES_DATA } from '../components/CitySelectDropdown';

export interface CityLocation {
  name: string;
  state: string;
  lat: number;
  lon: number;
}

export const CITIES: CityLocation[] = CITIES_DATA.map((c) => ({
  name: c.value,
  state: c.state,
  lat: c.lat,
  lon: c.lon
}));

export const EmergencyRoutes: React.FC = () => {
  const location = useLocation();
  const routeParams = useMemo(() => new URLSearchParams(location.search), [location.search]);

  // Initial city selections based on query parameters or defaults
  const [selectedOrigin, setSelectedOrigin] = useState<CityOption>(() => {
    const oLat = Number(routeParams.get('originLat'));
    const oLon = Number(routeParams.get('originLon'));
    if (Number.isFinite(oLat) && Number.isFinite(oLon)) {
      const match = CITIES_DATA.find(c => Math.abs(c.lat - oLat) < 0.1 && Math.abs(c.lon - oLon) < 0.1);
      if (match) return match;
    }
    return CITIES_DATA[0]; // Hyderabad default
  });

  const [selectedDest, setSelectedDest] = useState<CityOption>(() => {
    const dLat = Number(routeParams.get('destLat'));
    const dLon = Number(routeParams.get('destLon'));
    if (Number.isFinite(dLat) && Number.isFinite(dLon)) {
      const match = CITIES_DATA.find(c => Math.abs(c.lat - dLat) < 0.1 && Math.abs(c.lon - dLon) < 0.1);
      if (match) return match;
    }
    return CITIES_DATA[3]; // Warangal default
  });

  const [activeRouteId, setActiveRouteId] = useState<string>('route-1');

  const originCity = {
    name: selectedOrigin.value,
    state: selectedOrigin.state,
    lat: selectedOrigin.lat,
    lon: selectedOrigin.lon
  };

  const destCity = {
    name: selectedDest.value,
    state: selectedDest.state,
    lat: selectedDest.lat,
    lon: selectedDest.lon
  };

  // Query BDA Emergency Escape Route Engine API
  const { data, isLoading, refetch, isError, error } = useQuery({
    queryKey: ['bda-escape-routes', originCity.lat, originCity.lon, destCity.lat, destCity.lon, originCity.name, destCity.name],
    queryFn: async () => {
      const res = await api.get('/public-apis/escape-routes', {
        params: {
          originLat: originCity.lat,
          originLon: originCity.lon,
          destLat: destCity.lat,
          destLon: destCity.lon,
          targetName: destCity.name
        }
      });
      return res.data;
    },
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
  });

  const routes = data?.data?.routes || data?.routes || [];
  const activeRoute = routes.find((r: any) => r.id === activeRouteId) || routes[0];

  useEffect(() => {
    if (routes.length > 0 && !routes.some((route: any) => route.id === activeRouteId)) {
      setActiveRouteId(routes[0].id);
    }
  }, [routes, activeRouteId]);

  // Swap cities handler
  const handleSwapCities = () => {
    const temp = selectedOrigin;
    setSelectedOrigin(selectedDest);
    setSelectedDest(temp);
  };

  return (
    <div className="space-y-6 text-slate-800 dark:text-slate-100">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            Emergency Escape Route Solver
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
              OSRM + BDA Multi-Risk Pipeline
            </span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Compute drivable escape corridors, distances, travel durations, and road risk scores between any two cities.
          </p>
        </div>

        <button
          onClick={() => refetch()}
          className="flex items-center space-x-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition shadow-sm"
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          <span>Re-compute Route</span>
        </button>
      </div>

      {/* Dual City Selector Control Card */}
      <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl text-white shadow-md space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Compass className="text-emerald-400" size={18} />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Select City Corridor ({CITIES_DATA.length} Andhra Pradesh &amp; Telangana Cities)
            </span>
          </div>
          <span className="text-[11px] px-2.5 py-0.5 bg-emerald-500/10 text-emerald-300 rounded-full font-medium border border-emerald-500/20">
            Real OSRM Routing Engine
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Origin Searchable Dropdown */}
          <div className="md:col-span-5 bg-slate-800/80 p-3 rounded-xl border border-slate-700">
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
              Start Location (Origin City)
            </label>
            <CitySelectDropdown
              value={selectedOrigin}
              onChange={(opt) => opt && setSelectedOrigin(opt)}
              placeholder="Search origin city..."
              excludeValue={selectedDest.value}
            />
          </div>

          {/* Swap Button with Parallel Opposing Arrows */}
          <div className="md:col-span-2 flex flex-col items-center justify-center">
            <button
              onClick={handleSwapCities}
              title="Reverse / Swap Origin & Destination Locations (⇄)"
              className="group p-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30 transition-all duration-200 active:scale-95 flex items-center justify-center space-x-1.5 shadow-sm mt-4 md:mt-0"
            >
              <ArrowLeftRight className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-bold uppercase tracking-wider md:hidden text-emerald-300">Swap</span>
            </button>
            <span className="hidden md:block text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">Reverse (⇄)</span>
          </div>

          {/* Destination Searchable Dropdown */}
          <div className="md:col-span-5 bg-slate-800/80 p-3 rounded-xl border border-slate-700">
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
              Destination Target (Safe City / Emergency Hub)
            </label>
            <CitySelectDropdown
              value={selectedDest}
              onChange={(opt) => opt && setSelectedDest(opt)}
              placeholder="Search destination city..."
              excludeValue={selectedOrigin.value}
            />
          </div>
        </div>
      </div>

      {/* Comparative Route Candidates Section */}
      <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-base flex items-center space-x-2">
            <Navigation size={18} className="text-emerald-500" />
            <span>Route Candidates &amp; Risk Metrics ({originCity.name} → {destCity.name})</span>
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Active Selection: <strong className="text-slate-800 dark:text-slate-200">{activeRoute?.name || 'Route 1'}</strong>
          </span>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-xs text-slate-400">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-500" />
            Computing OSRM driving geometry &amp; BDA risk scores...
          </div>
        ) : isError ? (
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-500">
            Failed to fetch escape route: {(error as any)?.message || 'OSRM service temporarily unreachable.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {routes.map((r: any) => {
              const isSelected = r.id === activeRouteId;
              return (
                <div
                  key={r.id}
                  onClick={() => setActiveRouteId(r.id)}
                  className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-emerald-50/40 dark:bg-emerald-500/10 border-emerald-500 ring-2 ring-emerald-500/20 shadow-md'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">{r.name}</span>
                    <span
                      className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase"
                      style={{ backgroundColor: `${r.color}15`, color: r.color }}
                    >
                      {r.badge}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center p-3 bg-slate-50 dark:bg-slate-950 rounded-xl mb-3 border border-slate-100 dark:border-slate-800">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase block font-medium">Distance</span>
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{r.distanceKm} km</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase block font-medium">Est. Time</span>
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{r.durationMins} mins</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase block font-medium">Risk Score</span>
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{r.roadRiskScore}/100</span>
                    </div>
                  </div>

                  {r.steps && r.steps.length > 0 && (
                    <div className="space-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="font-semibold text-slate-700 dark:text-slate-300 block">Key Highway Segments:</span>
                      <ul className="list-disc list-inside space-y-0.5 truncate">
                        {r.steps.slice(0, 3).map((st: string, idx: number) => (
                          <li key={idx} className="truncate">{st}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Map & Turn-by-Turn Directions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Leaflet Route Map */}
        <div className="lg:col-span-2 p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col h-[500px]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-500" />
              <span>Corridor Map View ({originCity.name} → {destCity.name})</span>
            </h3>
            {activeRoute && (
              <span className="text-xs text-slate-500">
                {activeRoute.distanceKm} km • {activeRoute.durationMins} mins
              </span>
            )}
          </div>

          <div className="flex-1 rounded-xl overflow-hidden">
            <MapContainer
              center={[(originCity.lat + destCity.lat) / 2, (originCity.lon + destCity.lon) / 2]}
              zoom={7}
              scrollWheelZoom={true}
              style={{ height: '100%', width: '100%' }}
            >
              <MapController
                origin={[originCity.lat, originCity.lon]}
                dest={[destCity.lat, destCity.lon]}
                activePolyline={activeRoute?.polyline || activeRoute?.geometry}
              />
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {/* Origin Marker */}
              <Marker position={[originCity.lat, originCity.lon]} icon={originIcon}>
                <Popup>
                  <div className="p-1 font-sans">
                    <strong className="text-xs block text-slate-900">Origin: {originCity.name}</strong>
                    <span className="text-[10px] text-slate-500">{originCity.state}</span>
                  </div>
                </Popup>
              </Marker>

              {/* Destination Marker */}
              <Marker position={[destCity.lat, destCity.lon]} icon={destIcon}>
                <Popup>
                  <div className="p-1 font-sans">
                    <strong className="text-xs block text-slate-900">Destination: {destCity.name}</strong>
                    <span className="text-[10px] text-slate-500">{destCity.state}</span>
                  </div>
                </Popup>
              </Marker>

              {/* Draw polylines for candidate routes */}
              {routes.map((r: any) => {
                const isSelected = r.id === activeRouteId;
                const polylineCoords = r.polyline || r.geometry;
                if (!polylineCoords || polylineCoords.length === 0) return null;
                return (
                  <Polyline
                    key={r.id}
                    positions={polylineCoords}
                    pathOptions={{
                      color: r.color || '#10b981',
                      weight: isSelected ? 5 : 3,
                      opacity: isSelected ? 0.95 : 0.45,
                      dashArray: isSelected ? undefined : '6, 6'
                    }}
                  />
                );
              })}
            </MapContainer>
          </div>
        </div>

        {/* Turn-by-Turn Driving Directions Card */}
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
              <Gauge className="w-4 h-4 text-emerald-500" />
              <span>Route Details &amp; Directions</span>
            </h3>

            {activeRoute ? (
              <div className="space-y-3">
                <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Distance:</span>
                    <strong className="text-slate-800 dark:text-slate-100">{activeRoute.distanceKm} km</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Estimated Duration:</span>
                    <strong className="text-slate-800 dark:text-slate-100">{activeRoute.durationMins} mins</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Risk Assessment:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">{activeRoute.badge}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Driving Navigation Steps:</span>
                  <div className="space-y-1.5 max-h-[260px] overflow-y-auto pr-1">
                    {activeRoute.steps && activeRoute.steps.length > 0 ? (
                      activeRoute.steps.map((step: string, idx: number) => (
                        <div key={idx} className="p-2 bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/80 rounded-lg text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2">
                          <span className="w-4 h-4 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold rounded flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <span className="leading-snug">{step}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400 italic">Direct highway route available.</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400">Select a route candidate to view details.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmergencyRoutes;
