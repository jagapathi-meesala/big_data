import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Building2, Bed, MapPin, Navigation, Activity, ShieldAlert, Fuel, Home, RefreshCw } from 'lucide-react';
import api from '../services/api';

export const Hospitals: React.FC = () => {
  const [district, setDistrict] = useState('Hyderabad');

  // Query database registered hospitals
  const { data: dbData, isLoading: isDbLoading } = useQuery(['hospitals-list'], async () => {
    const res = await api.get('/resources', { params: { type: 'HOSPITAL_BED', limit: 1000 } });
    return res.data;
  });

  // Query BDA OpenStreetMap + NPPES Healthcare Provider Registry & Distance Matrix API
  const { data: bdaData, isLoading: isBdaLoading, refetch: refetchBda } = useQuery(
    ['bda-nearby-resources', district],
    async () => {
      const res = await api.get('/public-apis/nearby-resources', {
        params: { district, lat: 17.3850, lon: 78.4867 }
      });
      return res.data;
    },
    { refetchOnWindowFocus: false }
  );

  const bdaResources = bdaData?.data?.resources || [];
  const metrics = bdaData?.data?.summaryMetrics || {
    totalHospitals: 0,
    totalShelters: 0,
    totalFuelPoints: 0,
    availableBunksSum: 0,
    avgDistanceKm: 0
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Hospitals & Community Resources</h1>
          <p className="text-sm opacity-60">
            OpenStreetMap & NPPES Healthcare Provider Registry API • Distance & Bed/Bunk Availability Pipeline
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold"
          >
            <option value="Hyderabad">Hyderabad</option>
            <option value="Vijayawada">Vijayawada</option>
            <option value="Visakhapatnam">Visakhapatnam</option>
            <option value="Warangal">Warangal</option>
            <option value="Tirupati">Tirupati</option>
          </select>
          <button
            onClick={() => refetchBda()}
            className="flex items-center space-x-1 px-3 py-1.5 bg-brand-500 text-white rounded-xl text-xs font-semibold hover:bg-brand-600 transition"
          >
            <RefreshCw size={14} className={isBdaLoading ? 'animate-spin' : ''} />
            <span>Sync APIs</span>
          </button>
        </div>
      </div>

      {/* Sub-navigation tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-6 text-sm font-semibold">
        <Link to="/resources" className="pb-3 text-slate-400 hover:text-slate-650 dark:hover:text-slate-200 transition">
          Supply Stocks
        </Link>
        <Link to="/hospitals" className="border-b-2 border-brand-500 pb-3 text-brand-500">
          Hospitals
        </Link>
        <Link to="/shelters" className="pb-3 text-slate-400 hover:text-slate-650 dark:hover:text-slate-200 transition">
          Refuge Shelters
        </Link>
        <Link to="/allocations" className="pb-3 text-slate-400 hover:text-slate-650 dark:hover:text-slate-200 transition">
          Resource Allocations
        </Link>
      </div>

      {/* BDA Architecture Card */}
      <div className="p-5 bg-gradient-to-r from-slate-900 via-brand-950 to-slate-900 border border-brand-500/20 rounded-2xl text-white shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Activity className="text-brand-400" size={18} />
            <span className="text-xs font-bold uppercase tracking-wider text-brand-300">
              BDA Architecture Pipeline (OpenStreetMap + NPPES Healthcare Registry)
            </span>
          </div>
          <span className="text-[10px] px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full font-bold border border-emerald-500/30">
            Live Public API Data Cleaning Active
          </span>
        </div>
        <p className="text-xs opacity-80">
          User Location <span className="text-brand-400 font-bold">→</span> OpenStreetMap & NPPES Provider Registry <span className="text-brand-400 font-bold">→</span> Data Cleaning <span className="text-brand-400 font-bold">→</span> BDA Distance & Bed/Bunk Availability Analysis
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
          <div className="p-3 bg-white/5 border border-white/10 rounded-xl">
            <span className="text-[10px] opacity-60 uppercase font-semibold block">Hospitals (NPPES/OSM)</span>
            <span className="text-lg font-extrabold text-emerald-400">{metrics.totalHospitals}</span>
          </div>
          <div className="p-3 bg-white/5 border border-white/10 rounded-xl">
            <span className="text-[10px] opacity-60 uppercase font-semibold block">Refuge Shelters</span>
            <span className="text-lg font-extrabold text-amber-400">{metrics.totalShelters}</span>
          </div>
          <div className="p-3 bg-white/5 border border-white/10 rounded-xl">
            <span className="text-[10px] opacity-60 uppercase font-semibold block">Fuel Points</span>
            <span className="text-lg font-extrabold text-blue-400">{metrics.totalFuelPoints}</span>
          </div>
          <div className="p-3 bg-white/5 border border-white/10 rounded-xl">
            <span className="text-[10px] opacity-60 uppercase font-semibold block">Available Bunks</span>
            <span className="text-lg font-extrabold text-brand-400">{metrics.availableBunksSum}</span>
          </div>
          <div className="p-3 bg-white/5 border border-white/10 rounded-xl col-span-2 sm:col-span-1">
            <span className="text-[10px] opacity-60 uppercase font-semibold block">Avg Distance</span>
            <span className="text-lg font-extrabold text-purple-400">{metrics.avgDistanceKm} km</span>
          </div>
        </div>
      </div>

      {/* BDA Distance & Availability Matrix Table */}
      <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-base flex items-center space-x-2">
            <Navigation size={18} className="text-brand-500" />
            <span>Nearby Resource Availability & Distance Matrix</span>
          </h2>
          <span className="text-xs text-slate-400">Sorted by Haversine Distance</span>
        </div>

        {isBdaLoading ? (
          <div className="text-center py-12 text-xs opacity-60">Querying OpenStreetMap & NPPES APIs...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 uppercase font-bold text-[10px]">
                <tr>
                  <th className="p-3 rounded-l-xl">Facility / Resource</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Source API</th>
                  <th className="p-3">Distance & Transit</th>
                  <th className="p-3">Bed/Bunk Capacity</th>
                  <th className="p-3">Available Bunks</th>
                  <th className="p-3 rounded-r-xl">Occupancy Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {bdaResources.map((item: any) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                    <td className="p-3">
                      <div className="font-bold text-slate-800 dark:text-slate-200">{item.name}</div>
                      <div className="text-[10px] text-slate-400 max-w-xs truncate">{item.address}</div>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded font-bold uppercase text-[9px] ${
                        item.category === 'HOSPITAL' ? 'bg-emerald-500/10 text-emerald-500' :
                        item.category === 'SHELTER' ? 'bg-amber-500/10 text-amber-500' : 'bg-blue-500/10 text-blue-500'
                      }`}>
                        {item.category}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                        {item.sourceApi}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="font-bold">{item.distanceKm} km</div>
                      <div className="text-[10px] text-slate-400">~{item.durationMins} mins drive</div>
                    </td>
                    <td className="p-3 font-semibold">{item.capacityBunks} units</td>
                    <td className="p-3">
                      <span className="font-extrabold text-emerald-500">{item.availableBunks} available</span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center space-x-2">
                        <div className="w-16 h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${item.occupancyPercent > 80 ? 'bg-red-500' : item.occupancyPercent > 60 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                            style={{ width: `${item.occupancyPercent}%` }}
                          />
                        </div>
                        <span className="font-bold text-[10px]">{item.occupancyPercent}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Database Registered Facilities */}
      <div>
        <h2 className="font-bold text-base mb-4">System Registered Hospital Facilities</h2>
        {isDbLoading ? (
          <div className="text-center py-12 opacity-55 text-sm">Querying database levels...</div>
        ) : dbData?.resources?.length === 0 ? (
          <div className="text-center py-12 opacity-55 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
            No system facilities registered.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {dbData?.resources?.map((hosp: any) => (
              <div key={hosp.id} className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
                    <Building2 size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">{hosp.name || `ER Facility ${hosp.id.slice(0, 5).toUpperCase()}`}</h3>
                    <span className="text-[10px] uppercase font-bold text-slate-400">{hosp.district || 'N/A'}, {hosp.state || 'N/A'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border dark:border-slate-800">
                  <div className="flex justify-between items-center pr-2 border-r dark:border-slate-800">
                    <span className="opacity-70 flex items-center space-x-1">
                      <Bed size={14} />
                      <span>Beds</span>
                    </span>
                    <span className="font-bold text-emerald-500">{hosp.quantity}</span>
                  </div>
                  <div className="flex justify-between items-center pl-2">
                    <span className="opacity-70">ICU</span>
                    <span className="font-bold">{hosp.icuBeds || 0}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Hospitals;
