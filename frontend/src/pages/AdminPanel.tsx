import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2, ShieldAlert, UserPlus, X } from 'lucide-react';
import api from '../services/api';

export const AdminPanel: React.FC = () => {
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  // Modal and Form States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('CITIZEN');
  
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const { data, isLoading } = useQuery(['admin-users', page], async () => {
    const res = await api.get('/users', { params: { page, limit: 10 } });
    return res.data;
  });

  const deleteMutation = useMutation(
    async (id: string) => {
      return api.delete(`/users/${id}`);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['admin-users']);
      },
    }
  );

  const roleMutation = useMutation(
    async ({ id, role }: { id: string; role: string }) => {
      return api.patch(`/users/${id}/role`, { role });
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['admin-users']);
      },
    }
  );

  const statusMutation = useMutation(
    async ({ id, status }: { id: string; status: string }) => {
      return api.patch(`/users/${id}/status`, { status });
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['admin-users']);
      },
    }
  );

  const registerMutation = useMutation(
    async (payload: any) => {
      const res = await api.post('/auth/register', payload);
      return res.data;
    },
    {
      onSuccess: () => {
        setFormSuccess('Personnel added successfully.');
        setFormError('');
        queryClient.invalidateQueries(['admin-users']);
        setTimeout(() => {
          setIsModalOpen(false);
          resetForm();
        }, 1200);
      },
      onError: (err: any) => {
        setFormError(err.response?.data?.message || 'Failed to add personnel.');
        setFormSuccess('');
      },
    }
  );

  const resetForm = () => {
    setFirstName('');
    setLastName('');
    setEmail('');
    setPhoneNumber('');
    setPassword('');
    setRole('CITIZEN');
    setFormError('');
    setFormSuccess('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-red-500 flex items-center space-x-2">
            <ShieldAlert size={26} />
            <span>Administrative Control Panel</span>
          </h1>
          <p className="text-sm opacity-60">Audit active personnel roles, credentials, and block access.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 shadow-lg shadow-red-500/10 active:scale-[0.99] self-start md:self-auto"
        >
          <UserPlus size={14} />
          <span>Add User</span>
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-20 opacity-55 text-sm">Querying system user accounts...</div>
      ) : (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-inherit font-bold uppercase opacity-75">
                  <th className="p-3">Name</th>
                  <th className="p-3">Email Address</th>
                  <th className="p-3">Phone</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Account Status</th>
                  <th className="p-3 text-right font-bold">Manage Settings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {data?.users?.map((usr: any) => (
                  <tr key={usr.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition">
                    <td className="p-3 font-semibold">{usr.firstName} {usr.lastName}</td>
                    <td className="p-3 font-mono opacity-85">{usr.email}</td>
                    <td className="p-3 font-mono">{usr.phoneNumber}</td>
                    <td className="p-3">
                      <select
                        value={usr.role}
                        onChange={(e) => roleMutation.mutate({ id: usr.id, role: e.target.value })}
                        className="px-2 py-1 bg-slate-50 dark:bg-slate-950 border dark:border-slate-800 rounded-md font-semibold text-[10px] cursor-pointer"
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
                    </td>
                    <td className="p-3">
                      <select
                        value={usr.status}
                        onChange={(e) => statusMutation.mutate({ id: usr.id, status: e.target.value })}
                        className="px-2 py-1 bg-slate-50 dark:bg-slate-950 border dark:border-slate-800 rounded-md font-semibold text-[10px] cursor-pointer"
                      >
                        <option value="ACTIVE">ACTIVE</option>
                        <option value="INACTIVE">INACTIVE</option>
                        <option value="SUSPENDED">SUSPENDED</option>
                      </select>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => deleteMutation.mutate(usr.id)}
                        className="p-1.5 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg text-red-500 transition"
                        title="Delete User"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between text-xs opacity-75 px-1">
            <span>Page {page} of {data?.totalPages || 1}</span>
            <div className="space-x-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={page >= (data?.totalPages || 1)}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center space-x-2 text-red-500">
                <UserPlus size={20} />
                <h2 className="text-base font-bold">Add New Personnel</h2>
              </div>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  resetForm();
                }}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-850 rounded-lg text-slate-400 dark:text-slate-500 transition"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setFormError('');
                setFormSuccess('');
                registerMutation.mutate({
                  firstName,
                  lastName,
                  email,
                  phoneNumber,
                  password,
                  role,
                });
              }}
              className="p-5 space-y-4 overflow-y-auto"
            >
              {formSuccess && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs flex items-center space-x-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                  <span className="font-semibold">{formSuccess}</span>
                </div>
              )}
              {formError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-xl text-xs flex items-center space-x-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>
                  <span className="font-semibold">{formError}</span>
                </div>
              )}

              {/* Grid of First and Last Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-550 dark:text-slate-400">First Name</label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="John"
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-xs focus:ring-2 focus:ring-red-500/20 focus:border-red-500 focus:outline-none transition text-slate-800 dark:text-slate-100 font-semibold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-550 dark:text-slate-400">Last Name</label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Doe"
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-xs focus:ring-2 focus:ring-red-500/20 focus:border-red-500 focus:outline-none transition text-slate-800 dark:text-slate-100 font-semibold"
                  />
                </div>
              </div>

              {/* Email Address */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-550 dark:text-slate-400">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john.doe@aid-dras.gov"
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-xs focus:ring-2 focus:ring-red-500/20 focus:border-red-500 focus:outline-none transition text-slate-800 dark:text-slate-100 font-semibold"
                />
              </div>

              {/* Phone Number & Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-550 dark:text-slate-400">Phone Number</label>
                  <input
                    type="text"
                    required
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+919876543210"
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-xs focus:ring-2 focus:ring-red-500/20 focus:border-red-500 focus:outline-none transition text-slate-800 dark:text-slate-100 font-semibold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-550 dark:text-slate-400">Password</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••"
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-xs focus:ring-2 focus:ring-red-500/20 focus:border-red-500 focus:outline-none transition text-slate-800 dark:text-slate-100 font-semibold"
                  />
                </div>
              </div>

              {/* Role Selection */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-550 dark:text-slate-400">System Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-xs focus:ring-2 focus:ring-red-500/20 focus:border-red-500 focus:outline-none transition text-slate-800 dark:text-slate-100 font-semibold cursor-pointer"
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
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3 pt-2">
                <button
                  type="submit"
                  disabled={registerMutation.isLoading}
                  className="flex-1 py-2.5 bg-red-500 hover:bg-red-650 disabled:bg-red-500/50 text-white font-bold rounded-xl text-xs transition shadow-lg shadow-red-500/10 active:scale-[0.99]"
                >
                  {registerMutation.isLoading ? 'Adding User...' : 'Add Personnel'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    resetForm();
                  }}
                  className="px-5 py-2.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 rounded-xl text-xs font-semibold transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
