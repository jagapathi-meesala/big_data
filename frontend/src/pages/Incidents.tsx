import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, Search, Trash2, Edit2 } from 'lucide-react';
import api from '../services/api';

export const Incidents: React.FC = () => {
  const [search, setSearch] = useState('');
  const [severity, setSeverity] = useState('');
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editingIncident, setEditingIncident] = useState<any | null>(null);

  // Form Fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [incidentSeverity, setIncidentSeverity] = useState('MEDIUM');
  const [disasterType, setDisasterType] = useState('OTHER');
  const [lat, setLat] = useState('17.3850');
  const [lng, setLng] = useState('78.4867');

  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery(
    ['incidents', search, severity, page],
    async () => {
      const res = await api.get('/incidents', {
        params: { search, severity, page, limit: 5 },
      });
      return res.data;
    },
    { keepPreviousData: true }
  );

  const createMutation = useMutation(
    async (payload: any) => {
      return api.post('/incidents', payload);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['incidents']);
        setShowModal(false);
        resetForm();
      },
      onError: (err: any) => {
        alert("Failed to report incident: " + (err.response?.data?.message || err.response?.data?.errors?.map((e: any) => e.msg).join(', ') || err.message));
      }
    }
  );

  const updateMutation = useMutation(
    async ({ id, payload }: { id: string; payload: any }) => {
      return api.put(`/incidents/${id}`, payload);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['incidents']);
        setShowModal(false);
        resetForm();
      },
      onError: (err: any) => {
        alert("Failed to update incident: " + (err.response?.data?.message || err.response?.data?.errors?.map((e: any) => e.msg).join(', ') || err.message));
      }
    }
  );

  const deleteMutation = useMutation(
    async (id: string) => {
      return api.delete(`/incidents/${id}`);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['incidents']);
      },
      onError: (err: any) => {
        alert("Failed to delete incident: " + (err.response?.data?.message || err.message));
      }
    }
  );

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setIncidentSeverity('MEDIUM');
    setDisasterType('OTHER');
    setLat('17.3850');
    setLng('78.4867');
    setEditingIncident(null);
  };

  const handleEdit = (incident: any) => {
    setEditingIncident(incident);
    setTitle(incident.title);
    setDescription(incident.description || '');
    setIncidentSeverity(incident.severity);
    setDisasterType(incident.disasterType);
    setLat(String(incident.geom.coordinates[1]));
    setLng(String(incident.geom.coordinates[0]));
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      title,
      description,
      severity: incidentSeverity,
      disasterType,
      latitude: parseFloat(lat),
      longitude: parseFloat(lng),
    };

    if (editingIncident) {
      updateMutation.mutate({ id: editingIncident.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Disaster Incidents Management</h1>
          <p className="text-sm opacity-60">Log critical events, categorize severities, and view active distress signals.</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg flex items-center space-x-2 text-sm font-semibold transition"
        >
          <Plus size={16} />
          <span>Report Incident</span>
        </button>
      </div>

      {/* Sub-navigation tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-6 text-sm font-semibold">
        <Link to="/sos-requests" className="pb-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition">
          SOS Requests
        </Link>
        <Link to="/incidents" className="border-b-2 border-brand-500 pb-3 text-brand-500">
          Incidents Log
        </Link>
        <Link to="/weather" className="pb-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition">
          Weather Alerts
        </Link>
      </div>

      {/* Filters bar */}
      <div className="flex flex-col sm:flex-row gap-4 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search incident titles or descriptions..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:border-brand-500 transition"
          />
        </div>
        <select
          value={severity}
          onChange={(e) => setSeverity(e.target.value)}
          className="px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:border-brand-500 transition"
        >
          <option value="">All Severities</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="CRITICAL">Critical</option>
        </select>
      </div>

      {/* Grid List */}
      {isLoading ? (
        <div className="text-center py-20 opacity-55">Loading active reports...</div>
      ) : (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-xs font-bold uppercase opacity-75">
                  <th className="p-4">Title</th>
                  <th className="p-4">Disaster Type</th>
                  <th className="p-4">Severity</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Coordinates</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {data?.incidents?.map((incident: any) => (
                  <tr key={incident.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition">
                    <td className="p-4 font-semibold">{incident.title}</td>
                    <td className="p-4">{incident.disasterType}</td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        incident.severity === 'CRITICAL' ? 'bg-red-500/10 text-red-500' :
                        incident.severity === 'HIGH' ? 'bg-amber-500/10 text-amber-500' :
                        'bg-emerald-500/10 text-emerald-500'
                      }`}>
                        {incident.severity}
                      </span>
                    </td>
                    <td className="p-4 opacity-75">{incident.status}</td>
                    <td className="p-4 font-mono text-xs opacity-50">
                      {incident.geom.coordinates[1].toFixed(4)}, {incident.geom.coordinates[0].toFixed(4)}
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => handleEdit(incident)}
                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 transition"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => deleteMutation.mutate(incident.id)}
                        className="p-1.5 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg text-red-500 transition"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between text-xs opacity-75 px-2">
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

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/70 z-50 flex items-center justify-center p-6 backdrop-blur-sm">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl relative">
            <h2 className="text-xl font-bold mb-4">{editingIncident ? 'Edit Incident' : 'Report Incident'}</h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider block opacity-75">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg bg-slate-50 dark:bg-slate-955 dark:bg-slate-950 dark:border-slate-800 text-sm"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider block opacity-75">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg bg-slate-50 dark:bg-slate-950 dark:border-slate-800 h-24 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider block opacity-75">Severity</label>
                  <select
                    value={incidentSeverity}
                    onChange={(e) => setIncidentSeverity(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg bg-slate-50 dark:bg-slate-950 dark:border-slate-800 text-sm"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider block opacity-75">Disaster Type</label>
                  <select
                    value={disasterType}
                    onChange={(e) => setDisasterType(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg bg-slate-50 dark:bg-slate-950 dark:border-slate-800 text-sm"
                  >
                    <option value="FLOOD">Flood</option>
                    <option value="FIRE">Fire</option>
                    <option value="EARTHQUAKE">Earthquake</option>
                    <option value="HURRICANE">Hurricane</option>
                    <option value="LANDSLIDE">Landslide</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider block opacity-75">Latitude</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={lat}
                    onChange={(e) => setLat(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg bg-slate-50 dark:bg-slate-950 dark:border-slate-800 text-sm"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider block opacity-75">Longitude</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={lng}
                    onChange={(e) => setLng(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg bg-slate-50 dark:bg-slate-950 dark:border-slate-800 text-sm"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-sm transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-sm font-semibold transition"
                >
                  {editingIncident ? 'Update Incident' : 'Submit Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Incidents;
