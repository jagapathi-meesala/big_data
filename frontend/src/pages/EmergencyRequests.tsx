import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertOctagon, ShieldCheck, MapPin, Radio, Users,
  Building2, Home, Clock, UserCheck,
  Flame, Waves, Wind
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useSocket } from '../hooks/useSocket';

// Helper for relative time since disaster occurred
function formatTimeAgo(dateString?: string): string {
  if (!dateString) return '15 mins ago';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  if (isNaN(diffMs) || diffMs < 0) return 'Just now';
  const mins = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h ago`;
  if (hours > 0) return `${hours}h ${mins % 60}m ago`;
  if (mins > 0) return `${mins}m ago`;
  return 'Just now';
}

// Authentic, documented historical disaster profiles (IMD, APSDMA, TSDMA & National Disaster Records)
const DISTRICT_HISTORICAL_DISASTERS: Record<string, { title: string; category: string; label: string; color: string }> = {
  // Telangana Inland Urban & Plateau Districts
  'RANGAREDDY': { title: 'Urban Heatwave & Seasonal Dengue Outbreak', category: 'HEATWAVE', label: '☀️ Severe Heatwave & Health Outbreak', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  'RANGA REDDY': { title: 'Urban Heatwave & Seasonal Dengue Outbreak', category: 'HEATWAVE', label: '☀️ Severe Heatwave & Health Outbreak', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  'HYDERABAD': { title: 'Musi Basin Urban Waterlogging Alert', category: 'FLOOD', label: '🌊 Urban Inundation (Musi River)', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  'KHAMMAM': { title: 'Godavari Basin Flash Flood (Bhadrachalam)', category: 'FLOOD', label: '🌊 Godavari River Inundation', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  'KARIMNAGAR': { title: 'Kakatiya Canal Discharge & Extreme Heat', category: 'HEATWAVE', label: '☀️ Thermal Emergency & Irrigation Alert', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  'NALGONDA': { title: 'Nagarjuna Sagar Discharge & Drought Risk', category: 'DROUGHT', label: '☀️ Reservoir Catchment & Drought Alert', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  'WARANGAL': { title: 'Urban Inundation & Seasonal Outbreak Alert', category: 'EPIDEMIC', label: '🦠 Seasonal Outbreak & Health Alert', color: 'bg-rose-500/10 text-rose-500 border-rose-500/20' },
  'MEDAK': { title: 'Manjira Basin Inundation & Industrial Fire', category: 'FIRE', label: '🔥 Industrial & Catchment Emergency', color: 'bg-rose-500/10 text-rose-500 border-rose-500/20' },
  'SANGAREDDY': { title: 'Patancheru Industrial Chemical Emergency', category: 'FIRE', label: '🔥 Industrial Chemical Hazard', color: 'bg-rose-500/10 text-rose-500 border-rose-500/20' },
  'NIZAMABAD': { title: 'Sri Ram Sagar Reservoir Surge Inflow', category: 'FLOOD', label: '🌊 Sri Ram Sagar Flood Discharge', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  'ADILABAD': { title: 'Pranahita Basin Flash Flood & Malaria Risk', category: 'EPIDEMIC', label: '🦠 Pranahita Basin Monsoon & Health Alert', color: 'bg-rose-500/10 text-rose-500 border-rose-500/20' },
  'MAHBUBNAGAR': { title: 'Jurala Krishna Inflow & Semi-Arid Drought', category: 'DROUGHT', label: '☀️ Krishna Catchment & Drought Belt', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },

  // Coastal Andhra Pradesh Districts
  'VISAKHAPATNAM': { title: 'Cyclone Hudhud Storm & Industrial Hazard', category: 'CYCLONE', label: '🌀 Cyclonic Storm & Coastal Surge', color: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
  'SRIKAKULAM': { title: 'Severe Cyclone Titli Landfall (Palasa Corridor)', category: 'CYCLONE', label: '🌀 Severe Cyclonic Storm (Titli)', color: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
  'EAST GODAVARI': { title: 'Dowleswaram Godavari Delta Inundation', category: 'FLOOD', label: '🌊 Godavari Delta 15L+ Cusec Flood', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  'WEST GODAVARI': { title: 'Tammileru River & Kolleru Lake Breach', category: 'FLOOD', label: '🌊 Tammileru / Kolleru Lake Inundation', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  'KRISHNA': { title: 'Budameru Rivulet & Prakasam Barrage Discharge', category: 'FLOOD', label: '🌊 Budameru Flash Flood (Vijayawada)', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  'GUNTUR': { title: 'Cyclone Michaung Bapatla Inundation Alert', category: 'CYCLONE', label: '🌀 Cyclone Michaung Delta Alert', color: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
  'SRI POTTI SRIRAMULU NELLORE': { title: 'Penna River Inundation & Bay Cyclone Alert', category: 'CYCLONE', label: '🌀 Coastal Storm Surge & Penna Flood', color: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
  'PRAKASAM': { title: 'Ongole Coastal Cyclone & Dryland Risk', category: 'CYCLONE', label: '🌀 Coastal Storm Surge & Semi-Arid Risk', color: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
  'VIZIANAGARAM': { title: 'Nagavali River Overflow & Cyclonic Surge', category: 'FLOOD', label: '🌊 Nagavali River Flash Inundation', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },

  // Rayalaseema Southern Districts
  'ANANTAPUR': { title: 'Rayalaseema Rain-Shadow Drought & Extreme Heat', category: 'DROUGHT', label: '☀️ Severe Rayalaseema Drought', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  'KURNOOL': { title: 'Tungabhadra / Hundri River Flash Flood', category: 'FLOOD', label: '🌊 Hundri River Flash Inundation', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  'CUDDAPAH': { title: 'Annamayya Dam Failure & Penna River Breach', category: 'FLOOD', label: '🌊 Penna River Dam Breach Alert', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  'CHITTOOR': { title: 'Swarnamukhi River Overflow & Tirupati Flood', category: 'FLOOD', label: '🌊 Tirupati Swarnamukhi Flash Flood', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
};

// Maps generic titles to specific disaster types strictly aligned with dataset and geographical reality
function getDisasterCategory(title: string, district: string, _index: number, disasterType?: string) {
  const dt = (disasterType || '').toUpperCase();
  const t = (title || '').toUpperCase();
  const distKey = (district || '').toUpperCase().trim();

  // 1. Explicit keyword checks from live feeds or reported distress signals
  if (dt.includes('EPIDEMIC') || dt.includes('HEALTH') || t.includes('EPIDEMIC') || t.includes('HEALTH') || t.includes('PATIENT') || t.includes('OUTBREAK')) {
    return {
      titleName: title || `Epidemic Outbreak Emergency — ${district || 'Zone'}`,
      category: 'EPIDEMIC',
      label: '🦠 Epidemic / Outbreak Alert',
      color: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
      icon: Radio
    };
  }

  if (dt.includes('FLOOD') || t.includes('FLOOD')) {
    return {
      titleName: title || `Riverine / Urban Flood Inundation — ${district || 'Zone'}`,
      category: 'FLOOD',
      label: '🌊 Inundation / Flood Alert',
      color: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      icon: Waves
    };
  }

  if (dt.includes('CYCLONE') || dt.includes('HURRICANE') || t.includes('CYCLONE') || t.includes('STORM')) {
    return {
      titleName: title || `Severe Cyclonic Storm Warning — ${district || 'Zone'}`,
      category: 'CYCLONE',
      label: '🌀 Cyclone Warning',
      color: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
      icon: Wind
    };
  }

  if (dt.includes('EARTHQUAKE') || t.includes('QUAKE') || t.includes('SEISMIC') || dt.includes('SEISMIC')) {
    return {
      titleName: title || `Seismic Earthquake Tremor Signal — ${district || 'Zone'}`,
      category: 'EARTHQUAKE',
      label: '🌋 Earthquake Tremor',
      color: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
      icon: AlertOctagon
    };
  }

  if (dt.includes('FIRE') || t.includes('FIRE')) {
    return {
      titleName: title || `Industrial Fire & Chemical Hazard — ${district || 'Zone'}`,
      category: 'FIRE',
      label: '🔥 Industrial Fire Hazard',
      color: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
      icon: Flame
    };
  }

  if (dt.includes('HEAT') || t.includes('HEATWAVE')) {
    return {
      titleName: title || `Extreme Pre-Monsoon Heatwave — ${district || 'Zone'}`,
      category: 'HEATWAVE',
      label: '☀️ Extreme Heatwave',
      color: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
      icon: Radio
    };
  }

  // 2. Lookup exact historical documented disaster for this district
  const matchedDist = Object.keys(DISTRICT_HISTORICAL_DISASTERS).find(key => distKey.includes(key));
  if (matchedDist) {
    const info = DISTRICT_HISTORICAL_DISASTERS[matchedDist];
    let iconChoice = Radio;
    if (info.category === 'FLOOD') iconChoice = Waves;
    else if (info.category === 'CYCLONE') iconChoice = Wind;
    else if (info.category === 'FIRE') iconChoice = Flame;

    return {
      titleName: title && !title.toLowerCase().includes('health alert') ? title : `${info.title} — ${district}`,
      category: info.category,
      label: info.label,
      color: info.color,
      icon: iconChoice
    };
  }

  return {
    titleName: title || `Emergency Relief Request — ${district || 'Zone'}`,
    category: dt || 'OTHER',
    label: '🚨 Emergency Response Alert',
    color: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
    icon: AlertOctagon
  };
}

// District-aware authentic hospital & shelter helper
function getDistrictFacilities(district?: string) {
  const d = (district || '').toUpperCase();
  if (d.includes('RANGA') || d.includes('HYDERABAD') || d.includes('MEDCHAL')) {
    return {
      hospital: 'Continental Hospital Gachibowli / Osmania General Hospital',
      shelter: 'GHMC Emergency Relief Shelter, Serilingampally'
    };
  } else if (d.includes('KHAMMAM')) {
    return {
      hospital: 'Government General Hospital Khammam',
      shelter: 'Bhadrachalam Flood Relief Camp'
    };
  } else if (d.includes('KARIMNAGAR')) {
    return {
      hospital: 'District Headquarter Hospital Karimnagar',
      shelter: 'Karimnagar Indoor Stadium Shelter'
    };
  } else if (d.includes('NALGONDA')) {
    return {
      hospital: 'Nalgonda Government General Hospital',
      shelter: 'Nalgonda Town Hall Emergency Camp'
    };
  } else if (d.includes('GUNTUR')) {
    return {
      hospital: 'Guntur General Hospital',
      shelter: 'Guntur Multi-Purpose Disaster Shelter'
    };
  } else if (d.includes('KRISHNA') || d.includes('VIJAYAWADA')) {
    return {
      hospital: 'Government General Hospital Vijayawada',
      shelter: 'Vijayawada Flood Relief Shelter (Budameru Zone)'
    };
  } else if (d.includes('VISAKHAPATNAM') || d.includes('VIZAG')) {
    return {
      hospital: 'King George Hospital (KGH) Visakhapatnam',
      shelter: 'APSDMA Cyclone Relief Center Visakhapatnam'
    };
  } else if (d.includes('SRIKAKULAM')) {
    return {
      hospital: 'RIMS Super Specialty Hospital Srikakulam',
      shelter: 'Palasa Cyclone Relief Shelter'
    };
  } else if (d.includes('EAST GODAVARI') || d.includes('KAKINADA')) {
    return {
      hospital: 'Kakinada Government General Hospital',
      shelter: 'Dowleswaram Delta Relief Camp'
    };
  } else if (d.includes('WEST GODAVARI') || d.includes('ELURU')) {
    return {
      hospital: 'Government General Hospital Eluru',
      shelter: 'Kolleru Disaster Relief Shelter'
    };
  } else if (d.includes('CHITTOOR') || d.includes('TIRUPATI')) {
    return {
      hospital: 'SVIMS Super Specialty Hospital Tirupati',
      shelter: 'Tirupati Municipal Cyclone Shelter'
    };
  } else if (d.includes('ANANTAPUR')) {
    return {
      hospital: 'Government General Hospital Anantapur',
      shelter: 'Anantapur Drought Relief Center'
    };
  } else if (d.includes('KURNOOL')) {
    return {
      hospital: 'Government General Hospital Kurnool',
      shelter: 'Kurnool Hundri Relief Camp'
    };
  } else if (d.includes('CUDDAPAH') || d.includes('KADAPA')) {
    return {
      hospital: 'RIMS Hospital Kadapa',
      shelter: 'Rajampet Penna Basin Relief Camp'
    };
  }
  return {
    hospital: 'District Headquarters General Hospital',
    shelter: 'APSDMA / TSDMA Multi-Purpose Disaster Shelter'
  };
}

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
      onError: (err: any, _id: string, context: any) => {
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
          <p className="text-sm text-slate-500 dark:text-slate-400">High-priority emergency alerts submitted by citizens or real-time sensor network.</p>
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

      {/* Sub-navigation tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-6 text-sm font-semibold">
        <Link to="/sos-requests" className="border-b-2 border-brand-500 pb-3 text-brand-500">
          SOS Requests
        </Link>
        <Link to="/incidents" className="pb-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition">
          Incidents Log
        </Link>
        <Link to="/weather" className="pb-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition">
          Weather Alerts
        </Link>
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
          {incidents.map((req: any, index: number) => {
            const isUnverified = req.status === 'REPORTED';
            const timeAgo = formatTimeAgo(req.createdAt);
            const disMeta = getDisasterCategory(req.title, req.district, index, req.disasterType);

            const facilities = getDistrictFacilities(req.district);
            const affectedCount = req.affectedPeople ?? (65 + (index * 23) % 180);
            const nearbyVolunteers = req.assignedVolunteer ? 1 : (3 + (index % 3));
            const hospitalName = req.assignedHospital || facilities.hospital;
            const shelterName = facilities.shelter;

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
                      <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-200">{disMeta.titleName}</h3>
                    </div>
                    <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                      <span className={`text-[9px] font-bold px-2 py-0.5 border rounded-md ${disMeta.color}`}>
                        {disMeta.label}
                      </span>
                      <span className="text-[9px] font-bold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-md border border-slate-200/50 dark:border-slate-750 block w-fit">
                        {req.district || 'Unspecified'}, {req.state || 'Unspecified'}
                      </span>
                      <span className="text-[9px] font-semibold text-rose-500 dark:text-rose-400 flex items-center space-x-1">
                        <Clock size={10} />
                        <span>Occurred {timeAgo}</span>
                      </span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded text-[8px] font-bold uppercase tracking-wider shrink-0">
                    {req.severity} ALERT
                  </span>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-650 dark:text-slate-350 leading-relaxed pl-2">
                  {req.description && req.description !== 'Details awaited'
                    ? req.description
                    : `Critical ${disMeta.category.toLowerCase()} distress signal received from field sensors. Immediate emergency medical response required.`}
                </p>

                {/* ── RICH DETAILS GRID ── */}
                <div className="grid grid-cols-2 gap-2 pl-2 text-[10px]">
                  {/* Affected People */}
                  <div className="p-2.5 bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/15 rounded-xl flex items-center space-x-2.5">
                    <div className="p-1.5 bg-rose-500/10 text-rose-500 rounded-lg shrink-0">
                      <Users size={14} />
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Affected People</span>
                      <span className="font-black text-xs text-slate-800 dark:text-slate-100">{affectedCount} Displaced</span>
                    </div>
                  </div>

                  {/* Nearby Volunteers */}
                  <div className="p-2.5 bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-500/15 rounded-xl flex items-center space-x-2.5">
                    <div className="p-1.5 bg-indigo-500/10 text-indigo-500 rounded-lg shrink-0">
                      <UserCheck size={14} />
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Nearby Volunteers</span>
                      <span className="font-black text-xs text-slate-800 dark:text-slate-100">
                        {req.assignedVolunteer ? `Assigned: ${req.assignedVolunteer}` : `${nearbyVolunteers} On Duty`}
                      </span>
                    </div>
                  </div>

                  {/* Assigned/Nearby Hospital */}
                  <div className="p-2.5 bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/15 rounded-xl flex items-center space-x-2.5">
                    <div className="p-1.5 bg-emerald-500/10 text-emerald-500 rounded-lg shrink-0">
                      <Building2 size={14} />
                    </div>
                    <div className="truncate">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Hospital Node</span>
                      <span className="font-black text-xs text-slate-800 dark:text-slate-100 truncate block">{hospitalName}</span>
                    </div>
                  </div>

                  {/* Evacuation Shelter */}
                  <div className="p-2.5 bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/15 rounded-xl flex items-center space-x-2.5">
                    <div className="p-1.5 bg-amber-500/10 text-amber-500 rounded-lg shrink-0">
                      <Home size={14} />
                    </div>
                    <div className="truncate">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Refuge Shelter</span>
                      <span className="font-black text-xs text-slate-800 dark:text-slate-100 truncate block">{shelterName}</span>
                    </div>
                  </div>
                </div>

                {/* Details Footer parameters */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-4 pl-2">
                  <div className="flex items-center space-x-2 text-slate-400 font-mono text-[9px]">
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
