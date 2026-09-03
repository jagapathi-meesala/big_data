import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, MapPin, Zap, Activity } from 'lucide-react';

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-955 text-slate-100 flex flex-col justify-between bg-slate-950 relative overflow-hidden">
      {/* Decorative vectors */}
      <div className="absolute top-[-10%] left-[-15%] w-[50rem] h-[50rem] bg-brand-500 rounded-full blur-[9rem] opacity-20 pointer-events-none"></div>
      <div className="absolute bottom-[-15%] right-[-10%] w-[50rem] h-[50rem] bg-indigo-500 rounded-full blur-[9rem] opacity-15 pointer-events-none"></div>

      {/* Navigation */}
      <header className="h-20 flex items-center justify-between px-8 z-10 border-b border-white/5 backdrop-blur-md bg-slate-950/40">
        <div className="font-extrabold text-2xl text-brand-400">AID-DRAS</div>
        <div className="flex items-center space-x-4">
          <Link to="/login" className="text-slate-400 hover:text-slate-100 transition text-sm font-semibold">
            Sign In
          </Link>
          <Link
            to="/register"
            className="px-5 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg transition text-sm font-semibold shadow-lg shadow-brand-500/20"
          >
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 py-20 z-10">
        <span className="px-4 py-1.5 bg-brand-500/10 text-brand-400 rounded-full text-xs font-bold uppercase tracking-wider mb-6 border border-brand-500/20 animate-pulse">
          Next-Gen Disaster Response
        </span>
        <h1 className="text-5xl md:text-7xl font-black max-w-4xl leading-tight tracking-tight mb-8">
          AI-Powered Distributed <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 via-indigo-400 to-cyan-400">
            Disaster Resource Allocation
          </span>
        </h1>
        <p className="text-slate-400 text-lg md:text-xl max-w-2xl mb-12 font-medium">
          AID-DRAS optimizes logistics routing, aggregates heterogeneous disaster datasets, and syncs emergency dispatches across agencies in real time.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6 w-full">
          <Link
            to="/register"
            className="w-full sm:w-auto px-8 py-3.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-bold transition shadow-xl shadow-brand-500/25 text-center"
          >
            Create Account
          </Link>
          <Link
            to="/login"
            className="w-full sm:w-auto px-8 py-3.5 bg-slate-900 hover:bg-slate-800 text-slate-100 rounded-xl font-bold border border-white/5 transition text-center"
          >
            System Login
          </Link>
        </div>

        {/* Feature Cards Grid */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-8 max-w-6xl w-full mt-24">
          <div className="p-6 bg-white/5 border border-white/5 rounded-2xl text-left hover:border-brand-500/30 transition">
            <div className="w-12 h-12 rounded-xl bg-brand-500/10 flex items-center justify-center text-brand-400 mb-4 border border-brand-500/15">
              <Shield size={22} />
            </div>
            <h3 className="font-bold text-lg mb-2">Resource Guard</h3>
            <p className="text-slate-400 text-sm">
              Tracks food, water, medicine, beds, and vehicles across regions.
            </p>
          </div>

          <div className="p-6 bg-white/5 border border-white/5 rounded-2xl text-left hover:border-indigo-500/30 transition">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-4 border border-indigo-500/15">
              <MapPin size={22} />
            </div>
            <h3 className="font-bold text-lg mb-2">Real-Time GIS</h3>
            <p className="text-slate-400 text-sm">
              Displays status maps for responders using Socket.io and Leaflet coordinates.
            </p>
          </div>

          <div className="p-6 bg-white/5 border border-white/5 rounded-2xl text-left hover:border-cyan-500/30 transition">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 mb-4 border border-cyan-500/15">
              <Zap size={22} />
            </div>
            <h3 className="font-bold text-lg mb-2">AI Dispatch</h3>
            <p className="text-slate-400 text-sm">
              Executes Graph Neural Networks to forecast allocation demands.
            </p>
          </div>

          <div className="p-6 bg-white/5 border border-white/5 rounded-2xl text-left hover:border-brand-500/30 transition">
            <div className="w-12 h-12 rounded-xl bg-brand-500/10 flex items-center justify-center text-brand-400 mb-4 border border-brand-500/15">
              <Activity size={22} />
            </div>
            <h3 className="font-bold text-lg mb-2">Scalable Clusters</h3>
            <p className="text-slate-400 text-sm">
              Processes raw sensor feeds using Apache Spark and Hadoop.
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="h-16 flex items-center justify-between px-8 border-t border-white/5 z-10 text-slate-500 text-xs">
        <div>&copy; 2026 AID-DRAS. All rights reserved.</div>
        <div className="flex space-x-4">
          <a href="#" className="hover:text-slate-300">Privacy Policy</a>
          <a href="#" className="hover:text-slate-300">Terms of Use</a>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
