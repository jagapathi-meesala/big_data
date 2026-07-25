import React from 'react';
import { Outlet } from 'react-router-dom';

export const AuthLayout: React.FC = () => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-brand-900 via-slate-900 to-slate-950 p-6 relative overflow-hidden">
      {/* Decorative background glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] bg-brand-500 rounded-full blur-[8rem] opacity-20 pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40rem] h-[40rem] bg-indigo-500 rounded-full blur-[8rem] opacity-15 pointer-events-none"></div>
      
      <div className="w-full max-w-lg glass border border-white/10 shadow-2xl rounded-2xl p-8 z-10">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-white tracking-tight">AID-DRAS</h1>
          <p className="text-brand-300 text-sm mt-1">Distributed Disaster Resource Allocation</p>
        </div>
        <Outlet />
      </div>
    </div>
  );
};

export default AuthLayout;
