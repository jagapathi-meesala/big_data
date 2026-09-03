import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useMutation } from '@tanstack/react-query';
import { RootState } from '../store';
import { setCredentials } from '../store/slices/authSlice';
import api from '../services/api';
import { Shield, Calendar, MapPin, Phone, Mail, UserCircle, User, Settings, Edit3, X, Lock, ShieldCheck, Activity, UserCheck } from 'lucide-react';


export const UserProfile: React.FC = () => {
  const { user, token } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();

  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');
  const [isEditing, setIsEditing] = useState(false);

  const isDefaultProfilePicture = !user?.profilePicture || user.profilePicture.includes('unsplash.com');

  const getInitials = () => {
    const first = firstName || user?.firstName || '';
    const last = lastName || user?.lastName || '';
    if (first || last) {
      return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
    }
    return (user?.email || 'U').charAt(0).toUpperCase();
  };

  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');
  const [profilePicture, setProfilePicture] = useState(user?.profilePicture || '');
  const [district, setDistrict] = useState(user?.district || '');
  const [regionState, setRegionState] = useState(user?.state || '');
  const [email, setEmail] = useState(user?.email || '');
  const [role, setRole] = useState(user?.role || 'CITIZEN');
  const [status, setStatus] = useState(user?.status || 'ACTIVE');
  const [availability, setAvailability] = useState(user?.availability || 'AVAILABLE');

  React.useEffect(() => {
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setPhoneNumber(user.phoneNumber || '');
      setProfilePicture(user.profilePicture || '');
      setDistrict(user.district || '');
      setRegionState(user.state || '');
      setEmail(user.email || '');
      setRole(user.role || 'CITIZEN');
      setStatus(user.status || 'ACTIVE');
      setAvailability(user.availability || 'AVAILABLE');
    }
  }, [user]);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const updateMutation = useMutation(
    async (payload: any) => {
      const res = await api.put('/users/profile', payload);
      return res.data;
    },
    {
      onSuccess: (data) => {
        setMessage('Profile updated successfully.');
        setIsEditing(false); // Lock back to read-only
        if (user && token) {
          dispatch(setCredentials({ user: data.user, token }));
        }
      },
      onError: (err: any) => {
        setError(err.response?.data?.message || 'Failed to update profile.');
      },
    }
  );

  const passwordMutation = useMutation(
    async (payload: any) => {
      const res = await api.put('/users/change-password', payload);
      return res.data;
    },
    {
      onSuccess: () => {
        setMessage('Password changed successfully.');
        setCurrentPassword('');
        setNewPassword('');
      },
      onError: (err: any) => {
        setError(err.response?.data?.message || 'Failed to change password.');
      },
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');
    updateMutation.mutate({ 
      firstName, 
      lastName, 
      phoneNumber, 
      profilePicture, 
      district, 
      state: regionState,
      email,
      role,
      status,
      availability
    });
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');
    passwordMutation.mutate({ currentPassword, newPassword });
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Reset fields back to current Redux store parameters
    setFirstName(user?.firstName || '');
    setLastName(user?.lastName || '');
    setPhoneNumber(user?.phoneNumber || '');
    setProfilePicture(user?.profilePicture || '');
    setDistrict(user?.district || '');
    setRegionState(user?.state || '');
    setEmail(user?.email || '');
    setRole(user?.role || 'CITIZEN');
    setStatus(user?.status || 'ACTIVE');
    setAvailability(user?.availability || 'AVAILABLE');
    setMessage('');
    setError('');
  };

  const createdDate = user?.createdAt ? new Date(user.createdAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }) : 'N/A';

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-rose-500/10 text-rose-500 border border-rose-500/20';
      case 'VOLUNTEER':
        return 'bg-purple-500/10 text-purple-500 border border-purple-500/20';
      case 'HOSPITAL':
        return 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20';
      default:
        return 'bg-blue-500/10 text-blue-500 border border-blue-500/20';
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fadeIn">
      {/* Header section */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100 flex items-center space-x-2">
          <Settings size={24} className="text-slate-400" />
          <span>Account Settings</span>
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Configure your profile details, contact information, and security parameters.</p>
      </div>

      {/* Messages */}
      {message && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-2xl text-sm flex items-center space-x-2 shadow-sm transition-all duration-300">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
          <span className="font-semibold">{message}</span>
        </div>
      )}
      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-2xl text-sm flex items-center space-x-2 shadow-sm transition-all duration-300">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
          <span className="font-semibold">{error}</span>
        </div>
      )}

      {/* Unified Settings Board */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xl flex flex-col md:flex-row min-h-[500px]">
        
        {/* Left Side Navigation & Card Panel */}
        <div className="w-full md:w-80 bg-slate-50/50 dark:bg-slate-950/40 border-r border-slate-200 dark:border-slate-800 p-6 flex flex-col justify-between">
          <div className="space-y-6">
            {/* Header info */}
            <div className="text-center space-y-4">
              <div className="relative inline-block">
                {isDefaultProfilePicture ? (
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-brand-500 to-indigo-600 text-white font-extrabold text-3xl flex items-center justify-center mx-auto border-2 border-brand-100 dark:border-brand-900/50 shadow-md">
                    {getInitials()}
                  </div>
                ) : (
                  <img
                    src={user?.profilePicture}
                    alt="Profile Preview"
                    className="w-24 h-24 rounded-full object-cover mx-auto border-2 border-slate-200 dark:border-slate-800 shadow-md"
                  />
                )}
                <span className="absolute bottom-1 right-1 w-4 h-4 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full shadow animate-pulse" title="Status: Online"></span>
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-800 dark:text-white">
                  {(user?.firstName || user?.lastName) ? `${user.firstName} ${user.lastName}` : 'No Profile Name'}
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">{user?.email}</p>
                <div className="mt-2">
                  <span className={`inline-block text-[10px] px-2.5 py-0.5 rounded-full font-extrabold uppercase tracking-wider ${getRoleBadge(user?.role || 'CITIZEN')}`}>
                    {user?.role || 'CITIZEN'}
                  </span>
                </div>
              </div>
            </div>

            {/* Vertical Menu Buttons */}
            <div className="space-y-1">
              <button
                onClick={() => {
                  setActiveTab('profile');
                  setIsEditing(false); // Reset profile editing on switch
                }}
                className={`w-full px-4 py-2.5 rounded-xl text-left text-sm font-semibold flex items-center space-x-3 transition ${
                  activeTab === 'profile'
                    ? 'bg-brand-500 text-white shadow-md shadow-brand-500/10'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                }`}
              >
                <UserCircle size={18} />
                <span>Profile Details</span>
              </button>

              <button
                onClick={() => setActiveTab('password')}
                className={`w-full px-4 py-2.5 rounded-xl text-left text-sm font-semibold flex items-center space-x-3 transition ${
                  activeTab === 'password'
                    ? 'bg-brand-500 text-white shadow-md shadow-brand-500/10'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                }`}
              >
                <Shield size={18} />
                <span>Security Settings</span>
              </button>
            </div>
          </div>

          {/* Core Info list */}
          <div className="pt-6 border-t border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center space-x-2.5 text-xs text-slate-650 dark:text-slate-350">
              <div className="p-1.5 bg-slate-100 dark:bg-slate-900 rounded-lg text-slate-400 dark:text-slate-500">
                <MapPin size={14} />
              </div>
              <span className="font-semibold">{user?.district || 'No District'}, {user?.state || 'No State'}</span>
            </div>
            <div className="flex items-center space-x-2.5 text-xs text-slate-655 dark:text-slate-345">
              <div className="p-1.5 bg-slate-100 dark:bg-slate-900 rounded-lg text-slate-400 dark:text-slate-500">
                <Phone size={14} />
              </div>
              <span className="font-semibold">{user?.phoneNumber || 'No Contact'}</span>
            </div>
            <div className="flex items-center space-x-2.5 text-xs text-slate-655 dark:text-slate-345">
              <div className="p-1.5 bg-slate-100 dark:bg-slate-900 rounded-lg text-slate-400 dark:text-slate-500">
                <Calendar size={14} />
              </div>
              <span className="font-semibold">Joined {createdDate}</span>
            </div>
          </div>
        </div>

        {/* Right Side Content Panel */}
        <div className="flex-1 p-8">
          {activeTab === 'profile' ? (
            <div className="space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-lg font-bold text-slate-800 dark:text-white">Profile Details</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Update your account name and registered phone number details.</p>
                </div>
                {!isEditing && (
                  <button
                    onClick={() => {
                      setIsEditing(true);
                      setMessage('');
                      setError('');
                    }}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 border border-slate-200 dark:border-slate-700"
                  >
                    <Edit3 size={14} />
                    <span>Edit Profile</span>
                  </button>
                )}
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-450 dark:text-slate-400">First Name</label>
                    {isEditing ? (
                      <div className="relative">
                        <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          className="w-full pl-9 pr-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:outline-none transition text-slate-800 dark:text-slate-100 font-semibold"
                          required
                        />
                      </div>
                    ) : (
                      <div className="flex items-center space-x-3 px-4 py-3 bg-slate-50/50 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-800/65 shadow-inner">
                        <User size={16} className="text-slate-400 dark:text-slate-500" />
                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{firstName || '—'}</span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-450 dark:text-slate-400">Last Name</label>
                    {isEditing ? (
                      <div className="relative">
                        <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          className="w-full pl-9 pr-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:outline-none transition text-slate-800 dark:text-slate-100 font-semibold"
                          required
                        />
                      </div>
                    ) : (
                      <div className="flex items-center space-x-3 px-4 py-3 bg-slate-50/50 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-800/65 shadow-inner">
                        <User size={16} className="text-slate-400 dark:text-slate-500" />
                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{lastName || '—'}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-455 dark:text-slate-400">Phone Number</label>
                  {isEditing ? (
                    <div className="relative">
                      <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:outline-none transition text-slate-800 dark:text-slate-100 font-semibold"
                        required
                      />
                    </div>
                  ) : (
                    <div className="flex items-center space-x-3 px-4 py-3 bg-slate-50/50 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-800/65 shadow-inner">
                      <Phone size={16} className="text-slate-400 dark:text-slate-500" />
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{phoneNumber || '—'}</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">District</label>
                    {isEditing ? (
                      <div className="relative">
                        <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={district}
                          onChange={(e) => setDistrict(e.target.value)}
                          className="w-full pl-9 pr-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:outline-none transition text-slate-800 dark:text-slate-100 font-semibold"
                          required
                        />
                      </div>
                    ) : (
                      <div className="flex items-center space-x-3 px-4 py-3 bg-slate-50/50 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-800/60 shadow-inner">
                        <MapPin size={16} className="text-slate-400 dark:text-slate-500" />
                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{district || '—'}</span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">State</label>
                    {isEditing ? (
                      <div className="relative">
                        <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={regionState}
                          onChange={(e) => setRegionState(e.target.value)}
                          className="w-full pl-9 pr-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:outline-none transition text-slate-800 dark:text-slate-100 font-semibold"
                          required
                        />
                      </div>
                    ) : (
                      <div className="flex items-center space-x-3 px-4 py-3 bg-slate-50/50 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-800/60 shadow-inner">
                        <MapPin size={16} className="text-slate-400 dark:text-slate-500" />
                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{regionState || '—'}</span>
                      </div>
                    )}
                  </div>
                </div>


                {isEditing && (
                  <div className="flex space-x-3 pt-2">
                    <button
                      type="submit"
                      disabled={updateMutation.isLoading}
                      className="flex-1 py-2.5 bg-brand-500 hover:bg-brand-600 disabled:bg-brand-500/50 text-white font-bold rounded-xl text-sm transition shadow-lg shadow-brand-500/10 active:scale-[0.99]"
                    >
                      {updateMutation.isLoading ? 'Saving...' : 'Save Profile Changes'}
                    </button>
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="px-6 py-2.5 border border-slate-200 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 rounded-xl text-sm font-semibold transition"
                    >
                      Cancel
                    </button>
                  </div>
                )}

                {/* Additional System Parameters details block */}
                <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-450 dark:text-slate-400">Official System Parameters</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50/50 dark:bg-slate-900/30 rounded-2xl border border-slate-100 dark:border-slate-800/60 flex items-center space-x-3.5 hover:border-slate-200 dark:hover:border-slate-700 transition duration-300 shadow-sm">
                      <div className="p-2 bg-rose-500/10 dark:bg-rose-500/5 text-rose-500 rounded-xl border border-rose-500/10">
                        <ShieldCheck size={18} />
                      </div>
                      <div className="flex flex-col flex-1">
                        <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">Account Role</span>
                        {isEditing ? (
                          <select
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                            className="w-full text-xs font-semibold bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 focus:ring-1 focus:ring-brand-500 focus:outline-none mt-1 text-slate-700 dark:text-slate-200 cursor-pointer"
                          >
                            <option value="ADMIN">ADMIN</option>
                            <option value="DISASTER_OFFICER">OFFICER</option>
                            <option value="CITIZEN">CITIZEN</option>
                            <option value="VOLUNTEER">VOLUNTEER</option>
                            <option value="HOSPITAL">HOSPITAL</option>
                            <option value="POLICE">POLICE</option>
                            <option value="FIRE_DEPARTMENT">FIRE</option>
                            <option value="NGO">NGO</option>
                          </select>
                        ) : (
                          <span className="text-sm font-extrabold text-slate-755 dark:text-slate-200 mt-0.5">{role}</span>
                        )}
                      </div>
                    </div>
                    <div className="p-4 bg-slate-50/50 dark:bg-slate-900/30 rounded-2xl border border-slate-100 dark:border-slate-800/60 flex items-center space-x-3.5 hover:border-slate-200 dark:hover:border-slate-700 transition duration-300 shadow-sm">
                      <div className="p-2 bg-emerald-500/10 dark:bg-emerald-500/5 text-emerald-500 rounded-xl border border-emerald-500/10">
                        <Activity size={18} />
                      </div>
                      <div className="flex flex-col flex-1">
                        <span className="text-[10px] uppercase font-bold text-slate-555 dark:text-slate-400 tracking-wider">Account Status</span>
                        {isEditing ? (
                          <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className="w-full text-xs font-semibold bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 focus:ring-1 focus:ring-brand-500 focus:outline-none mt-1 text-slate-700 dark:text-slate-200 cursor-pointer"
                          >
                            <option value="ACTIVE">ACTIVE</option>
                            <option value="INACTIVE">INACTIVE</option>
                            <option value="SUSPENDED">SUSPENDED</option>
                          </select>
                        ) : (
                          <span className="text-sm font-extrabold text-slate-755 dark:text-slate-200 mt-0.5">{status}</span>
                        )}
                      </div>
                    </div>
                    <div className="p-4 bg-slate-50/50 dark:bg-slate-900/30 rounded-2xl border border-slate-100 dark:border-slate-800/60 flex items-center space-x-3.5 hover:border-slate-200 dark:hover:border-slate-700 transition duration-300 shadow-sm">
                      <div className="p-2 bg-indigo-500/10 dark:bg-indigo-500/5 text-indigo-500 rounded-xl border border-indigo-500/10">
                        <Mail size={18} />
                      </div>
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-[10px] uppercase font-bold text-slate-555 dark:text-slate-400 tracking-wider">System Email</span>
                        {isEditing ? (
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full text-xs font-semibold bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 focus:ring-1 focus:ring-brand-500 focus:outline-none mt-1 text-slate-700 dark:text-slate-200 min-w-0"
                            required
                          />
                        ) : (
                          <span className="text-sm font-semibold text-slate-755 dark:text-slate-200 mt-0.5 truncate">{email}</span>
                        )}
                      </div>
                    </div>
                    <div className="p-4 bg-slate-50/50 dark:bg-slate-900/30 rounded-2xl border border-slate-100 dark:border-slate-800/60 flex items-center space-x-3.5 hover:border-slate-200 dark:hover:border-slate-700 transition duration-300 shadow-sm">
                      <div className="p-2 bg-amber-500/10 dark:bg-amber-500/5 text-amber-500 rounded-xl border border-amber-500/10">
                        <UserCheck size={18} />
                      </div>
                      <div className="flex flex-col flex-1">
                        <span className="text-[10px] uppercase font-bold text-slate-555 dark:text-slate-400 tracking-wider">Availability</span>
                        {isEditing ? (
                          <select
                            value={availability}
                            onChange={(e) => setAvailability(e.target.value)}
                            className="w-full text-xs font-semibold bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 focus:ring-1 focus:ring-brand-500 focus:outline-none mt-1 text-slate-700 dark:text-slate-200 cursor-pointer"
                          >
                            <option value="AVAILABLE">AVAILABLE</option>
                            <option value="UNAVAILABLE">UNAVAILABLE</option>
                          </select>
                        ) : (
                          <span className="text-sm font-extrabold text-slate-755 dark:text-slate-200 mt-0.5">{availability}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-slate-800 dark:text-white">Security Settings</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Change your system password. Keep your login credentials secure.</p>
              </div>

              <form onSubmit={handlePasswordSubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Current Password</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-sm focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 focus:outline-none transition text-slate-800 dark:text-slate-100"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">New Password</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-sm focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 focus:outline-none transition text-slate-800 dark:text-slate-100"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={passwordMutation.isLoading}
                  className="w-full py-2.5 bg-rose-500 hover:bg-rose-600 disabled:bg-rose-500/50 text-white font-bold rounded-xl text-sm transition shadow-lg shadow-rose-500/10 active:scale-[0.99]"
                >
                  {passwordMutation.isLoading ? 'Changing...' : 'Change Password'}
                </button>

                {/* Password/Email recovery guidance panel */}
                <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-850 flex flex-col space-y-2 text-xs text-slate-500">
                  <p className="font-bold text-slate-700 dark:text-slate-300">Forgot Current Password or registered Email ID?</p>
                  <p className="opacity-90">To find your login Email ID or request a secure password-reset link, please sign out of the system and click "Forgot password?" on the Sign In screen to access the Account Recovery Center.</p>
                </div>
              </form>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default UserProfile;
