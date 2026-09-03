import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { Mail, Phone, ArrowLeft, CheckCircle, Info, KeyRound, Loader2 } from 'lucide-react';

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
    <div className="w-full max-w-lg mx-auto">
      <div className="bg-white/95 backdrop-blur-xl border border-slate-200/90 shadow-2xl shadow-sky-900/10 rounded-3xl p-7 sm:p-9 transition-all">
        {/* Header */}
        <div className="mb-6">
          <div className="w-12 h-12 rounded-2xl bg-sky-100 text-sky-700 border border-sky-200 flex items-center justify-center mb-4 shadow-sm">
            <KeyRound className="w-6 h-6 text-sky-600" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Account Recovery</h2>
          <p className="text-slate-500 text-xs sm:text-sm mt-1 font-medium">
            Restore access to your command portal account.
          </p>
        </div>

        {/* Tab Selection Bar */}
        <div className="grid grid-cols-2 p-1 bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 mb-6">
          <button
            type="button"
            onClick={() => {
              setActiveTab('password');
              setMessage('');
              setError('');
              setRecoveredEmail('');
            }}
            className={`py-2 rounded-lg transition-all ${
              activeTab === 'password' ? 'bg-white text-sky-700 font-bold shadow-sm' : 'hover:text-slate-900'
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
              activeTab === 'email' ? 'bg-white text-sky-700 font-bold shadow-sm' : 'hover:text-slate-900'
            }`}
          >
            Find Email ID
          </button>
        </div>

        {/* Status Messages */}
        {message && !recoveredEmail && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs flex items-center space-x-2 mb-5">
            <CheckCircle size={16} className="text-emerald-600 flex-shrink-0" />
            <span>{message}</span>
          </div>
        )}
        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center space-x-2 mb-5">
            <Info size={16} className="text-rose-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Forms Area */}
        {activeTab === 'password' ? (
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block">
                Email Address
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
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

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 disabled:opacity-60 text-white font-bold rounded-xl shadow-lg shadow-sky-500/25 active:scale-[0.99] transition-all flex items-center justify-center space-x-2 text-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Sending reset link...</span>
                </>
              ) : (
                <span>Send Reset Link</span>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block">
                Registered Phone Number
              </label>
              <div className="relative">
                <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="e.g. +19876543210"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 text-slate-900 placeholder-slate-400 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-sky-500/15 focus:border-sky-500 transition shadow-sm"
                  required
                />
              </div>
            </div>

            {recoveredEmail && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl space-y-1.5 text-xs animate-fadeIn">
                <span className="font-bold text-[10px] uppercase tracking-wider text-emerald-600 block">
                  Registered Email Address Located:
                </span>
                <p className="font-mono text-sm font-bold text-slate-900 select-all bg-white p-2.5 rounded-lg border border-emerald-200 shadow-sm">
                  {recoveredEmail}
                </p>
                <p className="text-[11px] text-slate-500">Copy this email address to proceed back to Sign In.</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 disabled:opacity-60 text-white font-bold rounded-xl shadow-lg shadow-sky-500/25 active:scale-[0.99] transition-all flex items-center justify-center space-x-2 text-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Locating account...</span>
                </>
              ) : (
                <span>Locate Email ID</span>
              )}
            </button>
          </form>
        )}

        <div className="mt-6 pt-5 border-t border-slate-100 text-center">
          <Link
            to="/login"
            className="text-xs font-semibold text-slate-500 hover:text-sky-600 transition inline-flex items-center space-x-1.5"
          >
            <ArrowLeft size={14} />
            <span>Back to Sign In</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
