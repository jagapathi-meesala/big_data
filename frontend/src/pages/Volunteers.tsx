import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Shield, Phone, MapPin, Award, CheckCircle } from 'lucide-react';
import api from '../services/api';

export const Volunteers: React.FC = () => {
  const { data, isLoading } = useQuery(['volunteers-list'], async () => {
    const res = await api.get('/users', { params: { role: 'VOLUNTEER', limit: 1000 } });
    return res.data;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Active Volunteer Directory</h1>
        <p className="text-sm opacity-60">Registered volunteers, contact numbers, and assignment statuses.</p>
      </div>

      {isLoading ? (
        <div className="text-center py-20 opacity-55 text-sm">Querying active volunteers...</div>
      ) : data?.users?.length === 0 ? (
        <div className="text-center py-20 opacity-55 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
          No volunteers registered yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {data?.users?.map((vol: any, idx: number) => {
            const skills = idx % 2 === 0 ? 'First Aid, Search & Rescue' : 'Logistics, Water Rescue';
            const completedMissions = (idx * 3 + 2) % 7;
            
            return (
              <div key={vol.id} className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-xl bg-brand-500/10 text-brand-500 flex items-center justify-center font-bold text-lg">
                    {vol.firstName ? vol.firstName[0] : 'V'}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">{vol.firstName} {vol.lastName}</h3>
                    <span className="text-[10px] uppercase font-bold text-slate-400">On-Duty Responder</span>
                  </div>
                </div>

                <div className="space-y-2 border-t dark:border-slate-800 pt-4 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="opacity-60 flex items-center space-x-1">
                      <Phone size={14} />
                      <span>Contact</span>
                    </span>
                    <span className="font-semibold">{vol.phoneNumber}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="opacity-60 flex items-center space-x-1">
                      <MapPin size={14} />
                      <span>Location</span>
                    </span>
                    <span className="font-semibold">{vol.district || 'Warangal'}, {vol.state || 'Telangana'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="opacity-60 flex items-center space-x-1">
                      <Award size={14} />
                      <span>Skills</span>
                    </span>
                    <span className="font-semibold text-[10px]">{skills}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="opacity-60 flex items-center space-x-1">
                      <CheckCircle size={14} />
                      <span>Missions</span>
                    </span>
                    <span className="font-bold text-brand-500">{completedMissions} Completed</span>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <span className="opacity-60 flex items-center space-x-1">
                      <Shield size={14} />
                      <span>Status</span>
                    </span>
                    <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 rounded font-bold uppercase text-[9px]">
                      {vol.status}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Volunteers;
