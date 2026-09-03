import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setCredentials } from '../store/slices/authSlice';
import api from '../services/api';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Activity,
  Building2,
  Users,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Radio,
} from 'lucide-react';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoNotice, setDemoNotice] = useState('');

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setDemoNotice('');
    setLoading(true);

    try {
      const res = await api.post('/auth/login', { email, password });
      const { token, refreshToken, user } = res.data;
      dispatch(setCredentials({ user, token, refreshToken }));
      navigate('/dashboard');
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Invalid credentials or connection error.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoFill = (demoEmail: string, roleName: string) => {
    setEmail(demoEmail);
    setPassword('password123');
    setError('');
    setDemoNotice(`Loaded credentials for ${roleName}`);
    setTimeout(() => setDemoNotice(''), 3500);
  };

  return (
    <div className="w-full max-w-6xl mx-auto grid lg:grid-cols-12 gap-8 lg:gap-12 items-center">
      {/* LEFT SIDE: Hero Showcase (Visible on Large Screens) */}
      <div className="hidden lg:flex lg:col-span-6 flex-col justify-between py-4 pr-4">
        <div className="space-y-6">
          {/* Top Pill Badge */}
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-sky-100/80 border border-sky-200/80 text-sky-800 text-xs font-semibold shadow-sm">
            <Sparkles className="w-4 h-4 text-sky-600" />
            <span>AI-Powered Crisis Response Operations</span>
          </div>

          {/* Heading */}
          <div className="space-y-3">
            <h1 className="text-3xl xl:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Next-Gen Crisis Management & Triage Portal
            </h1>
            <p className="text-slate-600 text-base leading-relaxed">
              Coordinate emergency response squads, balance critical hospital capacity, and dispatch disaster resources with real-time AI allocation.
            </p>
          </div>

          {/* Feature Highlights Grid */}
          <div className="space-y-3.5 pt-2">
            <div className="flex items-start space-x-3.5 p-3.5 rounded-2xl bg-white/70 border border-slate-200/70 shadow-sm">
              <div className="p-2.5 rounded-xl bg-sky-50 text-sky-600 border border-sky-100 mt-0.5">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Dynamic AI Triage</h4>
                <p className="text-xs text-slate-500 mt-0.5">Predictive allocation of ICU beds, oxygen, and emergency medical kits.</p>
              </div>
            </div>

            <div className="flex items-start space-x-3.5 p-3.5 rounded-2xl bg-white/70 border border-slate-200/70 shadow-sm">
              <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 mt-0.5">
                <Radio className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Geospatial SOS Tracking</h4>
                <p className="text-xs text-slate-500 mt-0.5">Live emergency telemetry pinpoints incidents with instant team routing.</p>
              </div>
            </div>

            <div className="flex items-start space-x-3.5 p-3.5 rounded-2xl bg-white/70 border border-slate-200/70 shadow-sm">
              <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 mt-0.5">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Multi-Agency Coordination</h4>
                <p className="text-xs text-slate-500 mt-0.5">Seamless sync between Command Officers, First Responders & Hospitals.</p>
              </div>
            </div>
          </div>

          {/* Live Metrics Counter Bar */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-200/80">
            <div>
              <p className="text-2xl font-extrabold text-slate-900">150+</p>
              <p className="text-xs text-slate-500 font-medium">Hospitals Syncing</p>
            </div>
            <div>
              <p className="text-2xl font-extrabold text-slate-900">&lt; 2m</p>
              <p className="text-xs text-slate-500 font-medium">Avg Triage Time</p>
            </div>
            <div>
              <p className="text-2xl font-extrabold text-slate-900">99.9%</p>
              <p className="text-xs text-slate-500 font-medium">System Uptime</p>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE: Interactive Light Login Form Card */}
      <div className="lg:col-span-6 w-full max-w-md mx-auto">
        <div className="bg-white/95 backdrop-blur-xl border border-slate-200/90 shadow-2xl shadow-sky-900/10 rounded-3xl p-7 sm:p-9 transition-all">
          {/* Form Header */}
          <div className="mb-6">
            <div className="w-12 h-12 rounded-2xl bg-sky-100 text-sky-700 border border-sky-200 flex items-center justify-center mb-4 shadow-sm">
              <ShieldCheck className="w-6 h-6 text-sky-600" />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Sign In</h2>
            <p className="text-slate-500 text-xs sm:text-sm mt-1 font-medium">
              Access your emergency command portal credentials.
            </p>
          </div>

          {/* Quick Demo Selector */}
          <div className="mb-6 p-3 bg-slate-50 border border-slate-200/80 rounded-2xl">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Quick Demo Role Fill:</span>
              <span className="text-sky-600 text-[10px] font-normal">Click to fill</span>
            </p>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => handleQuickDemoFill('officer@aid-dras.gov', 'Officer')}
                className="px-2.5 py-1 text-xs bg-white hover:bg-sky-50 border border-slate-200 hover:border-sky-300 rounded-lg text-slate-700 hover:text-sky-700 font-medium transition shadow-sm"
              >
                🛡️ Officer
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemoFill('hospital@aid-dras.gov', 'Hospital Admin')}
                className="px-2.5 py-1 text-xs bg-white hover:bg-sky-50 border border-slate-200 hover:border-sky-300 rounded-lg text-slate-700 hover:text-sky-700 font-medium transition shadow-sm"
              >
                🏥 Hospital
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemoFill('citizen@aid-dras.gov', 'Citizen')}
                className="px-2.5 py-1 text-xs bg-white hover:bg-sky-50 border border-slate-200 hover:border-sky-300 rounded-lg text-slate-700 hover:text-sky-700 font-medium transition shadow-sm"
              >
                👤 Citizen
              </button>
            </div>
          </div>

          {/* Feedback Notices */}
          {demoNotice && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs flex items-center space-x-2 mb-4 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{demoNotice}</span>
            </div>
          )}

          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center space-x-2.5 mb-5">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="officer@aid-dras.gov"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 text-slate-900 placeholder-slate-400 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-sky-500/15 focus:border-sky-500 transition shadow-sm"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-sky-600 hover:text-sky-700 font-semibold hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-3 bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 text-slate-900 placeholder-slate-400 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-sky-500/15 focus:border-sky-500 transition shadow-sm"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition p-1"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 disabled:opacity-60 text-white font-bold rounded-xl shadow-lg shadow-sky-500/25 hover:shadow-xl hover:shadow-sky-500/35 active:scale-[0.99] transition-all flex items-center justify-center space-x-2 text-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Portal</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Footer Register Link */}
          <div className="mt-6 pt-5 border-t border-slate-100 text-center text-xs text-slate-500">
            New to AID-DRAS?{' '}
            <Link to="/register" className="text-sky-600 font-bold hover:text-sky-700 hover:underline">
              Create an Account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
