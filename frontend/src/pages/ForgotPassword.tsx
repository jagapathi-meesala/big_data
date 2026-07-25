import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { Mail, Phone, ArrowLeft, CheckCircle, Info } from 'lucide-react';

export const ForgotPassword: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'password' | 'email'>('password');
  
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [recoveredEmail, setRecoveredEmail] = useState('');

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/auth/forgot-password', { email });
      setMessage(res.data?.message || 'Password reset link sent to your email.');
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Error occurred during request.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setRecoveredEmail('');
    setLoading(true);

    try {
      const res = await api.post('/auth/recover-email', { phoneNumber });
      setRecoveredEmail(res.data?.email || '');
      setMessage(res.data?.message || 'Account located successfully.');
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'No registered account found with this phone number.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold text-white mb-2">Account Recovery</h2>
        <p className="text-slate-400 text-xs">
          Select recovery parameter to restore credentials.
        </p>
      </div>

      {/* Tab selection menu */}
      <div className="grid grid-cols-2 p-1 bg-slate-900/80 border border-white/5 rounded-xl text-xs font-semibold text-slate-400">
        <button
          type="button"
          onClick={() => {
            setActiveTab('password');
            setMessage('');
            setError('');
            setRecoveredEmail('');
          }}
          className={`py-2 rounded-lg transition-all ${
            activeTab === 'password' ? 'bg-brand-500 text-white font-bold' : 'hover:text-white'
          }`}
        >
          Reset Password
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab('email');
            setMessage('');
            setError('');
            setRecoveredEmail('');
          }}
          className={`py-2 rounded-lg transition-all ${
            activeTab === 'email' ? 'bg-brand-500 text-white font-bold' : 'hover:text-white'
          }`}
        >
          Find Email ID
        </button>
      </div>

      {/* Status Messages */}
      {message && !recoveredEmail && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs flex items-center space-x-2">
          <CheckCircle size={14} />
          <span>{message}</span>
        </div>
      )}
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs flex items-center space-x-2">
          <Info size={14} />
          <span>{error}</span>
        </div>
      )}

      {/* Forms Area */}
      {activeTab === 'password' ? (
        <form onSubmit={handlePasswordSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-350 text-slate-300 uppercase tracking-wide block">Email Address</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="officer@aid-dras.gov"
                className="w-full pl-10 pr-4 py-3 bg-slate-900/60 border border-white/10 rounded-xl text-white placeholder-slate-550 focus:outline-none focus:border-brand-500 transition text-sm font-medium"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-brand-500 hover:bg-brand-600 disabled:bg-brand-500/50 text-white font-extrabold rounded-xl transition shadow-lg shadow-brand-500/20 text-sm active:scale-[0.99]"
          >
            {loading ? 'Sending link...' : 'Send Reset Link'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleEmailSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wide block">Registered Phone Number</label>
            <div className="relative">
              <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="e.g. +919876543210"
                className="w-full pl-10 pr-4 py-3 bg-slate-900/60 border border-white/10 rounded-xl text-white placeholder-slate-550 focus:outline-none focus:border-brand-500 transition text-sm font-medium"
                required
              />
            </div>
          </div>

          {recoveredEmail && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl space-y-1.5 text-xs animate-fadeIn">
              <span className="font-bold text-[9px] uppercase tracking-wider text-emerald-500 block">Registered Email Address Located:</span>
              <p className="font-mono text-sm font-bold text-white select-all bg-slate-950/60 p-2 rounded-lg border border-white/5">{recoveredEmail}</p>
              <p className="text-[10px] opacity-60">Copy this email address to proceed back to Sign In.</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-brand-500 hover:bg-brand-600 disabled:bg-brand-500/50 text-white font-extrabold rounded-xl transition shadow-lg shadow-brand-500/20 text-sm active:scale-[0.99]"
          >
            {loading ? 'Locating...' : 'Locate Email ID'}
          </button>
        </form>
      )}

      {/* Footer back button link */}
      <div className="text-center mt-6">
        <Link to="/login" className="text-xs text-slate-400 hover:text-white transition flex items-center justify-center space-x-1.5">
          <ArrowLeft size={14} />
          <span>Back to Sign In</span>
        </Link>
      </div>
    </div>
  );
};

export default ForgotPassword;
