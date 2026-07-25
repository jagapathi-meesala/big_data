import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Home, Users, MapPin, Flashlight, PlusCircle } from 'lucide-react';
import api from '../services/api';

export const Shelters: React.FC = () => {
  const { data, isLoading } = useQuery(['shelters-list'], async () => {
    const res = await api.get('/resources', { params: { type: 'SHELTER_CAPACITY', limit: 1000 } });
    return res.data;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Temporary Shelters</h1>
        <p className="text-sm opacity-60">Shelter vacancies, emergency food supplies, and local mapping.</p>
      </div>

      {isLoading ? (
        <div className="text-center py-20 opacity-55 text-sm">Querying shelter counts...</div>
      ) : data?.resources?.length === 0 ? (
        <div className="text-center py-20 opacity-55 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
          No shelter resources registered. Add shelter capacity in the Resources tab.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {data?.resources?.map((shelt: any) => (
            <div key={shelt.id} className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-4">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl">
                  <Home size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-sm">{shelt.name || `Refuge Center ${shelt.id.slice(0, 5).toUpperCase()}`}</h3>
                  <span className="text-[10px] uppercase font-bold text-slate-400">{shelt.district || 'Hyderabad'}, {shelt.state || 'Telangana'}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border dark:border-slate-800">
                <div className="flex justify-between items-center pr-2 border-r dark:border-slate-800">
                  <span className="opacity-70 flex items-center space-x-1">
                    <Users size={14} />
                    <span>Capacity</span>
                  </span>
                  <span className="font-bold">{shelt.quantity}</span>
                </div>
                <div className="flex justify-between items-center pl-2">
                  <span className="opacity-70">Occupied</span>
                  <span className="font-bold text-amber-500">{shelt.occupancy || 0}</span>
                </div>
                <div className="flex justify-between items-center pr-2 border-r dark:border-slate-800 pt-1.5 mt-1.5 border-t">
                  <span className="opacity-70 flex items-center space-x-1">
                    <Flashlight size={14} />
                    <span>Power</span>
                  </span>
                  <span className="font-bold uppercase text-[9px] text-emerald-500">{shelt.electricityStatus || 'YES'}</span>
                </div>
                <div className="flex justify-between items-center pl-2 pt-1.5 mt-1.5 border-t">
                  <span className="opacity-70 flex items-center space-x-1">
                    <PlusCircle size={14} />
                    <span>Medical</span>
                  </span>
                  <span className="font-bold uppercase text-[9px] text-emerald-500">{shelt.medicalFacilityStatus || 'YES'}</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <span className="px-2 py-0.5 bg-amber-500/10 text-amber-500 rounded font-bold uppercase text-[9px]">
                  {shelt.status}
                </span>
                <div className="flex items-center space-x-2 text-xs opacity-50">
                  <MapPin size={14} />
                  <span className="font-mono text-[10px]">
                    {shelt.geom.coordinates[1].toFixed(4)}, {shelt.geom.coordinates[0].toFixed(4)}
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

export default Shelters;
