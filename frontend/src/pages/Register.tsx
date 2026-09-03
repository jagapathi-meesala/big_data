import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setCredentials } from '../store/slices/authSlice';
import api from '../services/api';
import { ShieldCheck, UserPlus, AlertCircle, Loader2 } from 'lucide-react';

export const Register: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [role, setRole] = useState('CITIZEN');
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/auth/register', {
        email,
        password,
        firstName,
        lastName,
        phoneNumber,
        role,
      });
      const { token, refreshToken, user } = res.data;
      dispatch(setCredentials({ user, token, refreshToken }));
      navigate('/dashboard');
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Error occurred during registration.');
    } finally {
      setLoading(false);
    }
  };

  const roles = [
    { value: 'CITIZEN', label: 'Citizen (Report emergencies)' },
    { value: 'VOLUNTEER', label: 'Volunteer (Rescue / Field Support)' },
    { value: 'DISASTER_OFFICER', label: 'Disaster Officer (Dispatch & Command)' },
    { value: 'HOSPITAL', label: 'Hospital Representative' },
    { value: 'POLICE', label: 'Police Representative' },
    { value: 'FIRE_DEPARTMENT', label: 'Fire Department Rep' },
    { value: 'NGO', label: 'Non-Gov Organization (NGO)' },
  ];

  return (
    <div className="w-full max-w-xl mx-auto">
      <div className="bg-white/95 backdrop-blur-xl border border-slate-200/90 shadow-2xl shadow-sky-900/10 rounded-3xl p-7 sm:p-9 transition-all">
        {/* Header */}
        <div className="mb-6">
          <div className="w-12 h-12 rounded-2xl bg-sky-100 text-sky-700 border border-sky-200 flex items-center justify-center mb-4 shadow-sm">
            <UserPlus className="w-6 h-6 text-sky-600" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Create Account</h2>
          <p className="text-slate-500 text-xs sm:text-sm mt-1 font-medium">
            Join the AID-DRAS emergency allocation response network.
          </p>
        </div>

        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center space-x-2.5 mb-5">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block">First Name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="John"
                className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 text-slate-900 placeholder-slate-400 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-sky-500/15 focus:border-sky-500 transition shadow-sm"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block">Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Doe"
                className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 text-slate-900 placeholder-slate-400 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-sky-500/15 focus:border-sky-500 transition shadow-sm"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="officer@aid-dras.gov"
              className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 text-slate-900 placeholder-slate-400 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-sky-500/15 focus:border-sky-500 transition shadow-sm"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block">Phone Number</label>
              <input
                type="text"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+19876543210"
                className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 text-slate-900 placeholder-slate-400 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-sky-500/15 focus:border-sky-500 transition shadow-sm"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block">System Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 text-slate-900 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-sky-500/15 focus:border-sky-500 transition shadow-sm cursor-pointer"
              >
                {roles.map((r) => (
                  <option key={r.value} value={r.value} className="bg-white text-slate-900">
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 text-slate-900 placeholder-slate-400 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-sky-500/15 focus:border-sky-500 transition shadow-sm"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-3 py-3.5 bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 disabled:opacity-60 text-white font-bold rounded-xl shadow-lg shadow-sky-500/25 active:scale-[0.99] transition-all flex items-center justify-center space-x-2 text-sm"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Creating Account...</span>
              </>
            ) : (
              <span>Create Account</span>
            )}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-slate-100 text-center text-xs text-slate-500">
          Already registered?{' '}
          <Link to="/login" className="text-sky-600 font-bold hover:text-sky-700 hover:underline">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
