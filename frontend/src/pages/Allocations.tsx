import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Play, Check, XCircle, Clock } from 'lucide-react';
import api from '../services/api';

export const Allocations: React.FC = () => {
  const [incidentId, setIncidentId] = useState('');
  const [historyPage, setHistoryPage] = useState(1);
  const queryClient = useQueryClient();

  const { data: activeAllocations, isLoading: loadingActive } = useQuery(
    ['allocations', 'active'],
    async () => {
      const res = await api.get('/allocations/active');
      return res.data;
    }
  );

  const { data: historyData, isLoading: loadingHistory } = useQuery(
    ['allocations', 'history', historyPage],
    async () => {
      const res = await api.get('/allocations/history', {
        params: { page: historyPage, limit: 5 },
      });
      return res.data;
    },
    { keepPreviousData: true }
  );

  const { data: incidentsData } = useQuery(['incidents-list'], async () => {
    const res = await api.get('/incidents', { params: { limit: 100 } });
    return res.data;
  });

  const optimizeMutation = useMutation(
    async (id: string) => {
      return api.post('/allocations/optimize', { incidentId: id });
    },
    {
      onSuccess: (res: any) => {
        queryClient.invalidateQueries(['allocations']);
        const count = res.data?.allocations?.length;
        if (count !== undefined) {
          alert(`Bulk optimization completed successfully! Dispatched resources and generated road routes for ${count} incidents.`);
        } else {
          alert("Optimization completed successfully! Dispatched closest resource and generated optimal road route.");
        }
        setIncidentId('');
      },
      onError: (err: any) => {
        const validationErrors = err.response?.data?.errors;
        const msg = validationErrors 
          ? validationErrors.map((e: any) => e.msg).join(", ") 
          : (err.response?.data?.message || err.message);
        alert("Failed to execute optimizer: " + msg);
      }
    }
  );

  const updateMutation = useMutation(
    async ({ id, status }: { id: string; status: string }) => {
      return api.put(`/allocations/${id}`, { status });
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['allocations']);
      },
      onError: (err: any) => {
        alert("Failed to update dispatch status: " + (err.response?.data?.message || err.message));
      }
    }
  );

  const handleOptimize = (e: React.FormEvent) => {
    e.preventDefault();
    if (incidentId) {
      optimizeMutation.mutate(incidentId);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">AI & Geospatial Resource Allocation</h1>
        <p className="text-sm opacity-60">Execute dispatch solvers, monitor active supply routes, and track audit logs.</p>
      </div>

      {/* Sub-navigation tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-6 text-sm font-semibold">
        <Link to="/resources" className="pb-3 text-slate-400 hover:text-slate-650 dark:hover:text-slate-200 transition">
          Supply Stocks
        </Link>
        <Link to="/hospitals" className="pb-3 text-slate-400 hover:text-slate-650 dark:hover:text-slate-200 transition">
          Hospitals
        </Link>
        <Link to="/shelters" className="pb-3 text-slate-400 hover:text-slate-650 dark:hover:text-slate-200 transition">
          Refuge Shelters
        </Link>
        <Link to="/allocations" className="border-b-2 border-brand-500 pb-3 text-brand-500">
          Resource Allocations
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Solver trigger panel */}
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm h-fit">
          <h2 className="text-lg font-bold mb-4">Trigger Optimization</h2>
          <form onSubmit={handleOptimize} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider block opacity-75">Target Incident</label>
              <select
                value={incidentId}
                onChange={(e) => setIncidentId(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg bg-slate-50 dark:bg-slate-950 dark:border-slate-800 text-sm cursor-pointer"
                required
              >
                <option value="">Select Incident...</option>
                <option value="all">All Incidents (Bulk)</option>
                {incidentsData?.incidents?.map((inc: any) => (
                  <option key={inc.id} value={inc.id}>
                    {inc.title} ({inc.disasterType} - {inc.severity})
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={optimizeMutation.isLoading}
              className="w-full py-2.5 bg-brand-500 hover:bg-brand-600 disabled:bg-brand-500/50 text-white font-bold rounded-lg text-sm transition flex items-center justify-center space-x-2 shadow-lg shadow-brand-500/10"
            >
              <Play size={16} />
              <span>{optimizeMutation.isLoading ? 'Computing solver...' : 'Execute Optimizer'}</span>
            </button>
          </form>
        </div>

        {/* Active dispatches */}
        <div className="lg:col-span-2 p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col justify-between min-h-[300px]">
          <div>
            <h2 className="text-lg font-bold mb-4">Active Dispatches</h2>
            {loadingActive ? (
              <div className="text-center py-10 opacity-55 text-sm">Loading active dispatches...</div>
            ) : activeAllocations?.length === 0 ? (
              <div className="text-center py-10 opacity-55 text-sm">No active dispatches. Select an incident to optimize resource mapping.</div>
            ) : (
              <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2">
                {activeAllocations?.map((alloc: any) => (
                  <div key={alloc.id} className="p-4 bg-slate-50 dark:bg-slate-955 dark:bg-slate-905 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-bold">{alloc.Incident?.title}</p>
                      <p className="text-xs opacity-60">
                        Allocated: <strong>{alloc.Resource?.type}</strong> (Qty: {alloc.quantityAllocated})
                      </p>
                      <span className="inline-block px-2 py-0.5 bg-blue-500/10 text-blue-500 rounded text-[9px] font-bold">
                        {alloc.status}
                      </span>
                    </div>

                    <div className="flex space-x-2">
                      <button
                        onClick={() => updateMutation.mutate({ id: alloc.id, status: 'COMPLETED' })}
                        className="p-2 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white rounded-lg transition"
                        title="Mark Complete"
                      >
                        <Check size={16} />
                      </button>
                      <button
                        onClick={() => updateMutation.mutate({ id: alloc.id, status: 'CANCELLED' })}
                        className="p-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-lg transition"
                        title="Cancel Dispatch"
                      >
                        <XCircle size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* History log */}
      <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
        <h2 className="text-lg font-bold mb-4 flex items-center space-x-2">
          <Clock size={20} className="text-slate-400" />
          <span>Allocation Log Audits</span>
        </h2>
        {loadingHistory ? (
          <div className="text-center py-10 opacity-55 text-sm">Querying log audits...</div>
        ) : (
          <div className="space-y-4">
            <div className="border border-slate-105 border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-inherit font-bold uppercase opacity-75">
                    <th className="p-3">Incident</th>
                    <th className="p-3">Resource</th>
                    <th className="p-3">Quantity</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Dispatched Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {historyData?.allocations?.map((alloc: any) => (
                    <tr key={alloc.id}>
                      <td className="p-3 font-semibold">{alloc.Incident?.title || 'Unknown'}</td>
                      <td className="p-3">{alloc.Resource?.type || 'Unknown'}</td>
                      <td className="p-3 font-mono font-bold">{alloc.quantityAllocated}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-md font-bold uppercase text-[9px] ${
                          alloc.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-500' :
                          alloc.status === 'CANCELLED' ? 'bg-red-500/10 text-red-500' :
                          'bg-blue-500/10 text-blue-500'
                        }`}>
                          {alloc.status}
                        </span>
                      </td>
                      <td className="p-3 opacity-60">{new Date(alloc.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between text-xs opacity-75 px-1">
              <span>Page {historyPage} of {historyData?.totalPages || 1}</span>
              <div className="space-x-2">
                <button
                  disabled={historyPage <= 1}
                  onClick={() => setHistoryPage(historyPage - 1)}
                  className="px-3 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  disabled={historyPage >= (historyData?.totalPages || 1)}
                  onClick={() => setHistoryPage(historyPage + 1)}
                  className="px-3 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Allocations;
