import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setCredentials } from '../store/slices/authSlice';
import api from '../services/api';

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
    { value: 'VOLUNTEER', label: 'Volunteer (Rescue/support)' },
    { value: 'DISASTER_OFFICER', label: 'Disaster Officer (Dispatch/Command)' },
    { value: 'HOSPITAL', label: 'Hospital representative' },
    { value: 'POLICE', label: 'Police representative' },
    { value: 'FIRE_DEPARTMENT', label: 'Fire Department rep' },
    { value: 'NGO', label: 'Non-Gov Organization (NGO)' },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-white mb-4">Create Account</h2>
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm mb-4">
            {error}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wide">First Name</label>
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="w-full px-3 py-2 bg-slate-900/60 border border-white/10 rounded-xl text-white focus:outline-none focus:border-brand-500 transition text-sm"
            required
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wide">Last Name</label>
          <input
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="w-full px-3 py-2 bg-slate-900/60 border border-white/10 rounded-xl text-white focus:outline-none focus:border-brand-500 transition text-sm"
            required
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wide">Email Address</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3 py-2 bg-slate-900/60 border border-white/10 rounded-xl text-white focus:outline-none focus:border-brand-500 transition text-sm"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wide">Phone Number</label>
          <input
            type="text"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            className="w-full px-3 py-2 bg-slate-900/60 border border-white/10 rounded-xl text-white focus:outline-none focus:border-brand-500 transition text-sm"
            required
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wide">System Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full px-3 py-2 bg-slate-900/60 border border-white/10 rounded-xl text-white focus:outline-none focus:border-brand-500 transition text-sm cursor-pointer"
          >
            {roles.map((r) => (
              <option key={r.value} value={r.value} className="bg-slate-950 text-white">
                {r.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wide">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Min 6 characters"
          className="w-full px-3 py-2 bg-slate-900/60 border border-white/10 rounded-xl text-white focus:outline-none focus:border-brand-500 transition text-sm"
          required
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3.5 bg-brand-500 hover:bg-brand-600 disabled:bg-brand-500/50 text-white font-bold rounded-xl transition shadow-lg shadow-brand-500/20 text-sm mt-4"
      >
        {loading ? 'Creating Account...' : 'Sign Up'}
      </button>

      <div className="text-center text-xs text-slate-400 mt-4">
        Already registered?{' '}
        <Link to="/login" className="text-brand-400 font-semibold hover:underline">
          Sign In
        </Link>
      </div>
    </form>
  );
};

export default Register;
