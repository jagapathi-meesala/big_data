import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Building2, Bed, MapPin } from 'lucide-react';
import api from '../services/api';

export const Hospitals: React.FC = () => {
  const { data, isLoading } = useQuery(['hospitals-list'], async () => {
    const res = await api.get('/resources', { params: { type: 'HOSPITAL_BED', limit: 1000 } });
    return res.data;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Hospitals & Trauma Centers</h1>
        <p className="text-sm opacity-60">Emergency bed capacities and regional coordinates.</p>
      </div>

      {isLoading ? (
        <div className="text-center py-20 opacity-55 text-sm">Querying bed levels...</div>
      ) : data?.resources?.length === 0 ? (
        <div className="text-center py-20 opacity-55 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
          No hospital resources registered. Add ER Bed capacity in the Resources tab.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {data?.resources?.map((hosp: any) => (
            <div key={hosp.id} className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-4">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
                  <Building2 size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-sm">{hosp.name || `ER Facility ${hosp.id.slice(0, 5).toUpperCase()}`}</h3>
                  <span className="text-[10px] uppercase font-bold text-slate-400">{hosp.district || 'Hyderabad'}, {hosp.state || 'Telangana'}</span>
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
                <div className="flex justify-between items-center pr-2 border-r dark:border-slate-800 pt-1.5 mt-1.5 border-t">
                  <span className="opacity-70">Doctors</span>
                  <span className="font-bold">{hosp.doctorsCount || 0}</span>
                </div>
                <div className="flex justify-between items-center pl-2 pt-1.5 mt-1.5 border-t">
                  <span className="opacity-70">Ambulances</span>
                  <span className="font-bold">{hosp.ambulancesCount || 0}</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 rounded font-bold uppercase text-[9px]">
                  {hosp.status}
                </span>
                <div className="flex items-center space-x-2 text-xs opacity-50">
                  <MapPin size={14} />
                  <span className="font-mono text-[10px]">
                    {hosp.geom?.coordinates && hosp.geom.coordinates.length >= 2 ? (
                      `${hosp.geom.coordinates[1].toFixed(4)}, ${hosp.geom.coordinates[0].toFixed(4)}`
                    ) : (
                      'N/A'
                    )}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Hospitals;
