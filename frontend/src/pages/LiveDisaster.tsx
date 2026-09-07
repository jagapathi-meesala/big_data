import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { DisasterMap } from '../components/DisasterMap';
import api from '../services/api';
import { useSocket } from '../hooks/useSocket';
import { Route, Navigation } from 'lucide-react';

// ─── Key rescue corridors (incident zone → nearest hospital/shelter) ──────────
const RESCUE_CORRIDORS = [
  { id: 'r1', label: 'Hyderabad → Warangal Corridor', from: [17.3850, 78.4867] as [number,number], to: [17.9689, 79.5941] as [number,number] },
  { id: 'r2', label: 'Vijayawada → Guntur Flood Corridor', from: [16.5062, 80.6480] as [number,number], to: [16.3067, 80.4365] as [number,number] },
  { id: 'r3', label: 'Karimnagar → Nalgonda Emergency Line', from: [18.4386, 79.1288] as [number,number], to: [17.0575, 79.2684] as [number,number] },
  { id: 'r4', label: 'Visakhapatnam → Kakinada Cyclone Route', from: [17.6868, 83.2185] as [number,number], to: [16.9891, 82.2475] as [number,number] },
  { id: 'r5', label: 'Kurnool → Tirupati Medical Expressway', from: [15.8281, 78.0373] as [number,number], to: [13.6284, 79.4192] as [number,number] },
];

async function fetchOSRMRoute(from: [number,number], to: [number,number]): Promise<[number,number][]> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.code !== 'Ok' || !data.routes?.[0]) return [from, to];
    return data.routes[0].geometry.coordinates.map(([lng, lat]: [number,number]) => [lat, lng]);
  } catch {
    return [from, to];
  }
}

export const LiveDisaster: React.FC = () => {
  const [filter, setFilter] = useState<'all' | 'incident' | 'hospital' | 'shelter' | 'resource' | 'volunteer'>('all');
  const [showRescueRoutes, setShowRescueRoutes] = useState(true);
  const [rescuePaths, setRescuePaths] = useState<[number,number][][]>([]);
  const [loadingRoutes, setLoadingRoutes] = useState(true);
  const queryClient = useQueryClient();

  // Load live OSRM rescue route geometries
  useEffect(() => {
    let isMounted = true;
    (async () => {
      const paths: [number,number][][] = [];
      for (const corridor of RESCUE_CORRIDORS) {
        const routeCoords = await fetchOSRMRoute(corridor.from, corridor.to);
        if (isMounted) paths.push(routeCoords);
      }
      if (isMounted) {
        setRescuePaths(paths);
        setLoadingRoutes(false);
      }
    })();
    return () => { isMounted = false; };
  }, []);

  const { data: mapItems, isLoading } = useQuery(['live-disaster-map-items'], async () => {
    const resInc  = await api.get('/incidents', { params: { limit: 1000 } });
    const resHosp = await api.get('/resources', { params: { type: 'HOSPITAL_BED', limit: 1000 } });
    const resShelt= await api.get('/resources', { params: { type: 'SHELTER_CAPACITY', limit: 1000 } });
    const resAmbs = await api.get('/resources', { params: { type: 'AMBULANCE', limit: 1000 } });
    const resVols = await api.get('/users', { params: { role: 'VOLUNTEER', limit: 1000 } });

    const items: any[] = [];
    
    resInc.data?.incidents?.forEach((inc: any) => {
      items.push({
        id: inc.id,
        title: inc.title,
        type: 'incident',
        coordinates: [inc.geom.coordinates[1], inc.geom.coordinates[0]],
        severity: inc.severity,
        affectedPeople: inc.estimatedDamage ? Math.ceil(inc.estimatedDamage / 5000) : 45,
        timeReported: inc.createdAt,
        assignedResources: inc.assignedHospital ? `${inc.assignedHospital}, ${inc.assignedVolunteer || 'Volunteer Assigned'}` : 'None'
      });
    });

    resHosp.data?.resources?.forEach((hosp: any) => {
      if (hosp.geom?.coordinates && hosp.geom.coordinates.length >= 2) {
        let cleanTitle = hosp.name || `Hospital ${hosp.id.slice(0, 5)}`;
        if (cleanTitle.startsWith('-')) {
          cleanTitle = cleanTitle.replace(/^-\s*/, '');
        }

        items.push({
          id: hosp.id,
          title: cleanTitle,
          type: 'hospital',
          coordinates: [hosp.geom.coordinates[1], hosp.geom.coordinates[0]],
          details: `Available beds: ${hosp.quantity}. Status: ${hosp.status}`,
          quantity: hosp.quantity,
          occupancy: hosp.occupancy,
          icuBeds: hosp.icuBeds,
          doctorsCount: hosp.doctorsCount,
          ambulancesCount: hosp.ambulancesCount
        });

        // Scatter hospital-affiliated ambulances deterministically around hospital location
        const ambCount = hosp.ambulancesCount || 0;
        for (let i = 0; i < ambCount; i++) {
          const angle = (i * 2 * Math.PI) / (ambCount || 1);
          const offsetLat = Math.sin(angle) * 0.008;
          const offsetLng = Math.cos(angle) * 0.008;
          items.push({
            id: `amb-hosp-${hosp.id}-${i}`,
            title: `${cleanTitle} Ambulance Unit #${i + 1}`,
            type: 'resource',
            coordinates: [hosp.geom.coordinates[1] + offsetLat, hosp.geom.coordinates[0] + offsetLng],
            details: `Affiliated with: ${cleanTitle}. Status: AVAILABLE. Emergency dispatch ready.`
          });
        }
      }
    });

    resShelt.data?.resources?.forEach((shelt: any) => {
      let cleanTitle = shelt.name || `Shelter ${shelt.id.slice(0, 5)}`;
      if (cleanTitle.startsWith('-')) {
        cleanTitle = cleanTitle.replace(/^-\s*/, '');
      }

      items.push({
        id: shelt.id,
        title: cleanTitle,
        type: 'shelter',
        coordinates: [shelt.geom.coordinates[1], shelt.geom.coordinates[0]],
        details: `Occupancy: ${shelt.occupancy}/${shelt.quantity}. Power: ${shelt.electricityStatus}`,
        quantity: shelt.quantity,
        occupancy: shelt.occupancy
      });
    });

    resAmbs.data?.resources?.forEach((amb: any) => {
      let cleanTitle = amb.name || `Ambulance Unit ${amb.id.slice(0, 5)}`;
      if (cleanTitle.startsWith('-')) {
        cleanTitle = cleanTitle.replace(/^-\s*/, '');
      }
      items.push({
        id: amb.id,
        title: cleanTitle,
        type: 'resource',
        coordinates: [amb.geom.coordinates[1], amb.geom.coordinates[0]],
        details: `Status: ${amb.status}. Owner ID: ${amb.ownerId}`
      });
    });

    resVols.data?.users?.forEach((vol: any) => {
      items.push({
        id: vol.id,
        title: `${vol.firstName} ${vol.lastName}`,
        type: 'volunteer',
        coordinates: vol.district === 'Hyderabad' ? [17.3850, 78.4867] : [17.9689, 79.5941],
        details: `Volunteer. Status: ${vol.status}. Contact: ${vol.phoneNumber}`
      });
    });

    return items;
  });

  const { data: allocationsData } = useQuery(['active-allocations'], async () => {
    const res = await api.get('/allocations/active');
    return res.data;
  });

  const forceShowIds = new Set<string>();
  const activeRoutes: [number, number][][] = [];

  allocationsData?.forEach((alloc: any) => {
    const incId = alloc.incidentId || alloc.incident_id;
    const resId = alloc.resourceId || alloc.resource_id;

    let showRoute = false;
    if (filter === 'all' || filter === 'incident') {
      showRoute = true;
    } else {
      const resItem = mapItems?.find(item => item.id === resId);
      if (resItem && (resItem.type === filter || (filter === 'shelter' && resItem.type === 'shelter') || (filter === 'volunteer' && resItem.type === 'volunteer'))) {
        showRoute = true;
      }
    }

    if (showRoute) {
      if (incId) forceShowIds.add(incId);
      if (resId) forceShowIds.add(resId);

      const geom = alloc.optimizedRouteGeom || alloc.optimized_route_geom;
      if (geom && geom.coordinates && geom.coordinates.length >= 2) {
        const routePoints = geom.coordinates.map((coord: [number, number]) => [coord[1], coord[0]] as [number, number]);
        activeRoutes.push(routePoints);
      }
    }
  });

  useSocket('incident:created', () => {
    queryClient.invalidateQueries(['live-disaster-map-items']);
    queryClient.invalidateQueries(['active-allocations']);
  });
  useSocket('incident:updated', () => {
    queryClient.invalidateQueries(['live-disaster-map-items']);
    queryClient.invalidateQueries(['active-allocations']);
  });
  useSocket('resource_location_update', () => {
    queryClient.invalidateQueries(['live-disaster-map-items']);
    queryClient.invalidateQueries(['active-allocations']);
  });

  const filteredItems = !mapItems ? [] : filter === 'all' ? mapItems : mapItems.filter(item => item.type === filter || forceShowIds.has(item.id));

  // Combine allocation routes with live OSRM rescue corridor routes
  const combinedRoutePaths = [...activeRoutes, ...(showRescueRoutes ? rescuePaths : [])];

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Live Disaster Map Console</h1>
        <p className="text-sm opacity-60">High-precision geolocated spatial coordination with real-time OSRM rescue corridors.</p>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-[500px]">
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col justify-between">
          <div className="space-y-6">
            <h3 className="font-bold text-sm uppercase tracking-wide opacity-75">Map Layer Controls</h3>
            
            <div className="space-y-2">
              <button
                onClick={() => setFilter('all')}
                className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition ${
                  filter === 'all' ? 'bg-brand-500/10 text-brand-500 border border-brand-500/20' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                🌍 Show All Layers
              </button>
              <button
                onClick={() => setFilter('incident')}
                className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition ${
                  filter === 'incident' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                🚨 Active Incidents
              </button>
              <button
                onClick={() => setFilter('hospital')}
                className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition ${
                  filter === 'hospital' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                🏥 Hospitals &amp; ERs
              </button>
              <button
                onClick={() => setFilter('shelter')}
                className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition ${
                  filter === 'shelter' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                🏠 Shelters &amp; Camps
              </button>
              <button
                onClick={() => setFilter('resource')}
                className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition ${
                  filter === 'resource' ? 'bg-blue-500/10 text-blue-500 border border-brand-500/20' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                🚚 Dispatch Trucks
              </button>
              <button
                onClick={() => setFilter('volunteer')}
                className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition ${
                  filter === 'volunteer' ? 'bg-pink-500/10 text-pink-500 border border-pink-500/20' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                👤 Volunteers On-Duty
              </button>
            </div>

            {/* Rescue Corridor Toggle Button */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <button
                onClick={() => setShowRescueRoutes(!showRescueRoutes)}
                className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-between ${
                  showRescueRoutes
                    ? 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Navigation size={14} className={loadingRoutes ? 'animate-spin' : ''} />
                  <span>OSRM Rescue Corridors</span>
                </div>
                <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-indigo-500/20">
                  {showRescueRoutes ? 'ON' : 'OFF'}
                </span>
              </button>
            </div>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs opacity-75">
            <strong>Geo Sync Active:</strong> OSRM routing engine loaded. Listening for WebSocket events on channels <code>incident:created</code> and <code>resource_location_update</code>.
          </div>
        </div>

        <div className="lg:col-span-3 rounded-2xl overflow-hidden shadow-sm">
          {isLoading ? (
            <div className="h-full w-full bg-slate-100 dark:bg-slate-950 animate-pulse flex items-center justify-center text-xs opacity-50">Loading live markers...</div>
          ) : (
            <DisasterMap items={filteredItems} center={[17.3850, 78.4867]} zoom={8} routePaths={combinedRoutePaths} />
          )}
        </div>
      </div>
    </div>
  );
};

export default LiveDisaster;
