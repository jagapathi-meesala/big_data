import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { Shield, ArrowLeft, HeartPulse } from 'lucide-react';

export const AuthLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 relative overflow-hidden flex flex-col selection:bg-sky-500 selection:text-white">
      {/* Background Decorative Ambient Glow Orbs */}
      <div className="absolute -top-32 -left-32 w-[34rem] h-[34rem] bg-sky-200/60 rounded-full blur-[100px] pointer-events-none animate-pulse" />
      <div className="absolute -bottom-32 -right-32 w-[38rem] h-[38rem] bg-indigo-200/50 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[42rem] h-[42rem] bg-cyan-100/40 rounded-full blur-[140px] pointer-events-none" />
      
      {/* Subtle Mesh Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:28px_28px] opacity-40 pointer-events-none" />

      {/* Top Header Navigation */}
      <header className="relative z-20 w-full max-w-7xl mx-auto px-4 sm:px-8 py-5 flex items-center justify-between">
        <Link to="/" className="flex items-center space-x-3 group">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-600 via-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/25 group-hover:scale-105 transition-transform">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-xl tracking-tight text-slate-900">AID-DRAS</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 border border-sky-200">
                AI Platform
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium hidden sm:block">Disaster & Resource Allocation System</p>
          </div>
        </Link>

        <div className="flex items-center space-x-4">
          <div className="hidden md:flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>24/7 Operational Live</span>
          </div>

          <Link
            to="/"
            className="flex items-center space-x-2 text-xs sm:text-sm font-semibold text-slate-600 hover:text-sky-600 transition-colors bg-white/80 backdrop-blur-sm px-4 py-2 rounded-xl border border-slate-200 shadow-sm hover:shadow"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="relative z-20 py-4 text-center text-xs text-slate-400 font-medium">
        <div className="flex items-center justify-center space-x-2">
          <HeartPulse className="w-3.5 h-3.5 text-sky-500" />
          <span>AID-DRAS &bull; Distributed Disaster Resource Allocation & Operational Intelligence</span>
        </div>
      </footer>
    </div>
  );
};

export default AuthLayout;
