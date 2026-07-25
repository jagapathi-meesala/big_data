import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

interface MapItem {
  id: string;
  title: string;
  type: 'incident' | 'hospital' | 'shelter' | 'resource' | 'volunteer';
  coordinates: [number, number];
  details?: string;
  severity?: string;
  affectedPeople?: number;
  timeReported?: string;
  assignedResources?: string;
}

interface DisasterMapProps {
  items: MapItem[];
  center?: [number, number];
  zoom?: number;
  routePath?: [number, number][];
  routePaths?: [number, number][][];
}

const getMarkerIcon = (type: string, severity?: string) => {
  let color = '#3b82f6';
  if (type === 'incident') {
    if (severity === 'CRITICAL') color = '#ef4444';
    else if (severity === 'HIGH') color = '#f97316';
    else if (severity === 'MEDIUM') color = '#eab308';
    else color = '#3b82f6';
  } else if (type === 'hospital') {
    color = '#10b981';
  } else if (type === 'shelter') {
    color = '#a855f7';
  } else if (type === 'resource') {
    color = '#06b6d4';
  } else if (type === 'volunteer') {
    color = '#ec4899';
  }

  return L.divIcon({
    html: `<div style="background-color: ${color}; width: 1.25rem; height: 1.25rem; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
    className: 'custom-leaflet-icon',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
};

const getClusterIcon = (count: number) => {
  return L.divIcon({
    html: `<div style="background-color: #4f46e5; color: white; font-weight: bold; font-size: 11px; width: 1.75rem; height: 1.75rem; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.4);">${count}</div>`,
    className: 'custom-cluster-icon',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
};

const renderPopupContent = (item: MapItem) => {
  const isInc = item.type === 'incident';
  
  const totalBeds = item.quantity ?? 100;
  const occupancy = item.occupancy ?? 35;
  const icuBeds = item.icuBeds ?? 15;
  const doctorsCount = item.doctorsCount ?? 20;
  const ambulancesCount = item.ambulancesCount ?? 3;

  return (
    <div className="p-1 border-0 rounded-lg space-y-1.5 text-slate-800 dark:text-slate-100 font-sans">
      <div className="flex items-center justify-between border-b pb-1.5 mb-1.5 dark:border-slate-800">
        <h4 className="font-bold text-xs">{item.title}</h4>
        <span className="text-[8px] uppercase font-extrabold px-1.5 py-0.5 bg-slate-200 dark:bg-slate-800 rounded">
          {item.type}
        </span>
      </div>

      {isInc && (
        <div className="space-y-1 text-[11px]">
          <p>
            <strong>Severity:</strong>{' '}
            <span className={`px-1.5 py-0.5 rounded font-bold uppercase text-[9px] ${
              item.severity === 'CRITICAL' ? 'bg-red-500/10 text-red-500' :
              item.severity === 'HIGH' ? 'bg-orange-500/10 text-orange-500' :
              item.severity === 'MEDIUM' ? 'bg-yellow-500/10 text-yellow-500' :
              'bg-blue-500/10 text-blue-500'
            }`}>
              {item.severity}
            </span>
          </p>
          <p><strong>Affected Scale:</strong> {item.affectedPeople ?? 45} Displaced</p>
          <p><strong>Time Reported:</strong> {item.timeReported ? new Date(item.timeReported).toLocaleString() : 'Just Now'}</p>
          <p><strong>Assigned Units:</strong> {item.assignedResources || 'Emergency responders'}</p>

          <div className="mt-2.5 p-2 bg-indigo-500/10 border border-indigo-500/25 rounded-xl space-y-1.5 text-[10px] text-slate-700 dark:text-slate-300">
            <span className="text-[9px] uppercase font-bold text-indigo-600 dark:text-indigo-400 block tracking-wider">AI Predicted Resource Needs</span>
            <div className="grid grid-cols-2 gap-1 text-[10px]">
              <div>🏥 <strong>Hospitals:</strong> {item.severity === 'CRITICAL' ? 2 : item.severity === 'HIGH' ? 1 : item.severity === 'MEDIUM' ? 1 : 0}</div>
              <div>🛏️ <strong>Beds:</strong> {item.severity === 'CRITICAL' ? 50 : item.severity === 'HIGH' ? 25 : item.severity === 'MEDIUM' ? 10 : 2}</div>
              <div>🚑 <strong>Ambulances:</strong> {item.severity === 'CRITICAL' ? 5 : item.severity === 'HIGH' ? 3 : item.severity === 'MEDIUM' ? 2 : 1}</div>
              <div>🙋 <strong>Volunteers:</strong> {item.severity === 'CRITICAL' ? 15 : item.severity === 'HIGH' ? 10 : item.severity === 'MEDIUM' ? 5 : 2}</div>
              <div className="col-span-2">⛺ <strong>Shelters:</strong> {item.severity === 'CRITICAL' || item.severity === 'HIGH' ? 1 : 0}</div>
            </div>
          </div>
        </div>
      )}

      {item.type === 'hospital' && (
        <div className="space-y-1.5 text-[11px]">
          <p><strong>Available Beds:</strong> {totalBeds - occupancy} / {totalBeds}</p>
          <p><strong>Status:</strong> <span className="px-1 py-0.2 bg-emerald-500/10 text-emerald-500 rounded font-bold">ACTIVE</span></p>

          <div className="mt-2.5 p-2 bg-emerald-500/10 border border-emerald-500/25 rounded-xl space-y-1.5 text-[10px] text-slate-700 dark:text-slate-300 shadow-sm">
            <span className="text-[9px] uppercase font-bold text-emerald-600 dark:text-emerald-400 block tracking-wider font-sans">AI Resource Capacity</span>
            <div className="grid grid-cols-2 gap-1 text-[10px]">
              <div>🏥 <strong>Total Beds:</strong> {totalBeds}</div>
              <div>🏥 <strong>ICU Beds:</strong> {icuBeds}</div>
              <div>🚑 <strong>Ambulances:</strong> {ambulancesCount}</div>
              <div>👨‍⚕️ <strong>Doctors:</strong> {doctorsCount}</div>
            </div>
          </div>
        </div>
      )}

      {item.type === 'shelter' && (
        <div className="space-y-1.5 text-[11px]">
          <p><strong>Status:</strong> <span className="px-1 py-0.2 bg-purple-500/10 text-purple-500 rounded font-bold">OPERATIONAL</span></p>

          <div className="mt-2.5 p-2 bg-purple-500/10 border border-purple-500/25 rounded-xl space-y-1.5 text-[10px] text-slate-700 dark:text-slate-300 shadow-sm">
            <span className="text-[9px] uppercase font-bold text-purple-600 dark:text-purple-400 block tracking-wider font-sans">AI Shelter Capacity</span>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px]">
              <div className="whitespace-nowrap">⛺ <strong>Capacity:</strong> {totalBeds} beds</div>
              <div className="whitespace-nowrap">📈 <strong>Occupancy:</strong> {occupancy} ({Math.round((occupancy / totalBeds) * 100)}%)</div>
              <div className="col-span-2">📦 <strong>Supplies:</strong> Food, Water & Power (100%)</div>
            </div>
          </div>
        </div>
      )}

      {item.type === 'resource' && (
        <div className="space-y-1.5 text-[11px]">
          <p><strong>Affiliated with:</strong> {item.details?.match(/Affiliated with:\s*([^\.]+)/i)?.[1] || 'Emergency Center'}</p>
          <p>
            <strong>Status:</strong>{' '}
            <span className={`px-1 py-0.2 rounded font-bold ${
              item.details?.includes('AVAILABLE') ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'
            }`}>
              {item.details?.match(/Status:\s*([A-Z_]+)/i)?.[1] || 'AVAILABLE'}
            </span>
          </p>

          <div className="mt-2.5 p-2 bg-slate-500/10 border border-slate-500/25 rounded-xl space-y-1 text-[10px] text-slate-700 dark:text-slate-300 shadow-sm">
            <span className="text-[9px] uppercase font-bold text-slate-550 dark:text-slate-400 block tracking-wider font-sans">AI Resource Spec</span>
            <div className="grid grid-cols-2 gap-1 text-[10px]">
              <div>🚑 <strong>Unit:</strong> Dispatch Ready</div>
              <div>📈 <strong>Response:</strong> Real-time GPS</div>
              <div className="col-span-2">📡 <strong>Telemetry:</strong> Online & connected</div>
            </div>
          </div>
        </div>
      )}

      {item.type === 'volunteer' && (
        <div className="space-y-1.5 text-[11px]">
          <p><strong>District:</strong> {item.details?.match(/District:\s*([^\.]+)/i)?.[1] || 'Hyderabad'}</p>
          <p>
            <strong>Status:</strong>{' '}
            <span className="px-1 py-0.2 bg-indigo-500/10 text-indigo-500 rounded font-bold">
              ACTIVE
            </span>
          </p>

          <div className="mt-2.5 p-2 bg-indigo-500/10 border border-indigo-500/25 rounded-xl space-y-1 text-[10px] text-slate-700 dark:text-slate-300 shadow-sm">
            <span className="text-[9px] uppercase font-bold text-indigo-650 dark:text-indigo-400 block tracking-wider font-sans">AI Responder Spec</span>
            <div className="grid grid-cols-2 gap-1 text-[10px]">
              <div>🙋 <strong>Role:</strong> Volunteer Rescuer</div>
              <div>📡 <strong>Contact:</strong> Dispatch Radio</div>
              <div className="col-span-2">⚡ <strong>Availability:</strong> Standby ready for dispatch</div>
            </div>
          </div>
        </div>
      )}

      {item.type !== 'incident' && item.type !== 'hospital' && item.type !== 'shelter' && item.type !== 'resource' && item.type !== 'volunteer' && (
        <p className="text-xs opacity-75">{item.details}</p>
      )}

      <p className="text-[9px] font-mono mt-1 opacity-50 border-t pt-1 dark:border-slate-800 text-right">
        GPS: {item.coordinates[0].toFixed(5)}, {item.coordinates[1].toFixed(5)}
      </p>
    </div>
  );
};

const MapEventsHandler = ({ onZoomChange }: { onZoomChange: (zoom: number) => void }) => {
  useMapEvents({
    zoomend: (e) => {
      onZoomChange(e.target.getZoom());
    }
  });
  return null;
};

const clusterMarkers = (items: MapItem[], zoom: number) => {
  const clusters: { center: [number, number]; items: MapItem[] }[] = [];
  const threshold = zoom > 14 ? 0.002 : zoom > 11 ? 0.01 : zoom > 8 ? 0.04 : 0.15;

  items.forEach(item => {
    let added = false;
    for (const cluster of clusters) {
      const latDiff = Math.abs(cluster.center[0] - item.coordinates[0]);
      const lngDiff = Math.abs(cluster.center[1] - item.coordinates[1]);
      if (latDiff < threshold && lngDiff < threshold) {
        cluster.items.push(item);
        const total = cluster.items.length;
        cluster.center = [
          cluster.items.reduce((sum, i) => sum + i.coordinates[0], 0) / total,
          cluster.items.reduce((sum, i) => sum + i.coordinates[1], 0) / total
        ];
        added = true;
        break;
      }
    }
    if (!added) {
      clusters.push({ center: [...item.coordinates], items: [item] });
    }
  });

  return clusters;
};

export const DisasterMap: React.FC<DisasterMapProps> = ({
  items,
  center = [17.3850, 78.4867],
  zoom = 8,
  routePath,
  routePaths,
}) => {
  const [showAIZones, setShowAIZones] = useState(true);
  const [showRoutes, setShowRoutes] = useState(true);
  const [currentZoom, setCurrentZoom] = useState(zoom);

  const clusters = clusterMarkers(items, currentZoom);
  const incidents = items.filter(item => item.type === 'incident');

  return (
    <div className="w-full h-full min-h-[400px] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-inner relative flex flex-col">
      <div className="absolute top-4 right-4 z-[1000] p-4 bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg flex flex-col space-y-2 text-xs backdrop-blur-sm">
        <span className="font-bold border-b pb-1 dark:border-slate-800">Map Layers</span>
        <label className="flex items-center space-x-2 cursor-pointer font-semibold text-slate-800 dark:text-slate-200">
          <input
            type="checkbox"
            checked={showAIZones}
            onChange={(e) => setShowAIZones(e.target.checked)}
            className="rounded text-brand-500 cursor-pointer"
          />
          <span>AI Risk Buffers</span>
        </label>
        <label className="flex items-center space-x-2 cursor-pointer font-semibold text-slate-800 dark:text-slate-200">
          <input
            type="checkbox"
            checked={showRoutes}
            onChange={(e) => setShowRoutes(e.target.checked)}
            className="rounded text-brand-500 cursor-pointer"
          />
          <span>Rescue Routes</span>
        </label>
      </div>

      <div className="flex-1 text-slate-800">
        <MapContainer center={center} zoom={zoom} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapEventsHandler onZoomChange={setCurrentZoom} />

          {items.map((item) => (
            <Marker
              key={item.id}
              position={item.coordinates}
              icon={getMarkerIcon(item.type, item.severity)}
            >
              <Popup>
                <div className="min-w-[260px] max-w-[320px]">
                  {renderPopupContent(item)}
                </div>
              </Popup>
            </Marker>
          ))}

          {showAIZones && clusters.map((cluster, idx) => {
            const clusterIncidents = cluster.items.filter(item => item.type === 'incident');
            if (clusterIncidents.length === 0) return null;
            
            // Calculate a single clean risk buffer around the cluster center
            const radius = 1000 + (clusterIncidents.length - 1) * 150;
            return (
              <Circle
                key={`ai-cluster-${idx}-${showAIZones}`}
                center={cluster.center}
                pathOptions={{ 
                  color: '#ef4444', 
                  fillColor: '#ef4444', 
                  fillOpacity: 0.12,
                  weight: 2 
                }}
                radius={radius}
              />
            );
          })}

          {showRoutes && routePaths && routePaths.map((path, idx) => (
            <Polyline
              key={`route-path-${idx}-${showRoutes}`}
              positions={path}
              color="#6366f1"
              weight={4}
              dashArray="5, 10"
            />
          ))}

          {showRoutes && (!routePaths || routePaths.length === 0) && routePath && routePath.length > 1 && (
            <Polyline 
              key={`route-${showRoutes}`}
              positions={routePath} 
              color="#6366f1" 
              weight={4} 
              dashArray="5, 10" 
            />
          )}
        </MapContainer>
      </div>
    </div>
  );
};

export default DisasterMap;
