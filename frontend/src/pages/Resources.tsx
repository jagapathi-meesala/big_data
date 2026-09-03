import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, Trash2, Edit2 } from 'lucide-react';
import api from '../services/api';

export const Resources: React.FC = () => {
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editingResource, setEditingResource] = useState<any | null>(null);

  // Form Fields
  const [resourceType, setResourceType] = useState('FOOD');
  const [quantity, setQuantity] = useState('100');
  const [status, setStatus] = useState('AVAILABLE');
  const [lat, setLat] = useState('17.3850');
  const [lng, setLng] = useState('78.4867');

  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery(
    ['resources', type, page],
    async () => {
      const res = await api.get('/resources', {
        params: { type, page, limit: 5 },
      });
      return res.data;
    },
    { keepPreviousData: true }
  );

  const createMutation = useMutation(
    async (payload: any) => {
      return api.post('/resources', payload);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['resources']);
        setShowModal(false);
        resetForm();
      },
    }
  );

  const updateMutation = useMutation(
    async ({ id, payload }: { id: string; payload: any }) => {
      return api.put(`/resources/${id}`, payload);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['resources']);
        setShowModal(false);
        resetForm();
      },
    }
  );

  const deleteMutation = useMutation(
    async (id: string) => {
      return api.delete(`/resources/${id}`);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['resources']);
      },
    }
  );

  const resetForm = () => {
    setResourceType('FOOD');
    setQuantity('100');
    setStatus('AVAILABLE');
    setLat('17.3850');
    setLng('78.4867');
    setEditingResource(null);
  };

  const handleEdit = (resource: any) => {
    setEditingResource(resource);
    setResourceType(resource.type);
    setQuantity(String(resource.quantity));
    setStatus(resource.status);
    setLat(String(resource.geom.coordinates[1]));
    setLng(String(resource.geom.coordinates[0]));
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      type: resourceType,
      quantity: parseInt(quantity, 10),
      status,
      latitude: parseFloat(lat),
      longitude: parseFloat(lng),
    };

    if (editingResource) {
      updateMutation.mutate({ id: editingResource.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const resourceTypes = [
    { value: 'FOOD', label: 'Food Packages' },
    { value: 'WATER', label: 'Water Supplies' },
    { value: 'MEDICINE', label: 'Medical Kits' },
    { value: 'AMBULANCE', label: 'Emergency Ambulance' },
    { value: 'FIRE_TRUCK', label: 'Fire Engines' },
    { value: 'RESCUE_TEAM', label: 'Rescue Crew' },
    { value: 'POLICE_UNIT', label: 'Police Escort' },
    { value: 'SHELTER_CAPACITY', label: 'Shelter Vacancies' },
    { value: 'HOSPITAL_BED', label: 'ER Beds' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Resource Inventory Hub</h1>
          <p className="text-sm opacity-60">Register assets, monitor critical stock levels, and update locations.</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg flex items-center space-x-2 text-sm font-semibold transition"
        >
          <Plus size={16} />
          <span>Register Resource</span>
        </button>
      </div>

      {/* Sub-navigation tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-6 text-sm font-semibold">
        <Link to="/resources" className="border-b-2 border-brand-500 pb-3 text-brand-500">
          Supply Stocks
        </Link>
        <Link to="/hospitals" className="pb-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition">
          Hospitals
        </Link>
        <Link to="/shelters" className="pb-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition">
          Refuge Shelters
        </Link>
        <Link to="/allocations" className="pb-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition">
          Resource Allocations
        </Link>
      </div>

      {/* Filter panel */}
      <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
        <select
          value={type}
          onChange={(e) => {
            setType(e.target.value);
            setPage(1);
          }}
          className="px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:border-brand-500 transition w-full sm:w-64"
        >
          <option value="">All Resource Types</option>
          {resourceTypes.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      {/* Table list */}
      {isLoading ? (
        <div className="text-center py-20 opacity-55">Querying stock counts...</div>
      ) : (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-xs font-bold uppercase opacity-75">
                  <th className="p-4">Resource Type</th>
                  <th className="p-4">Stock Quantity</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Coordinates</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {data?.resources?.map((resource: any) => (
                  <tr key={resource.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition">
                    <td className="p-4 font-semibold">{resource.type}</td>
                    <td className="p-4 font-mono font-bold">{resource.quantity}</td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        resource.status === 'AVAILABLE' ? 'bg-emerald-500/10 text-emerald-500' :
                        resource.status === 'IN_TRANSIT' ? 'bg-blue-500/10 text-blue-500' :
                        'bg-slate-500/10 text-slate-500'
                      }`}>
                        {resource.status}
                      </span>
                    </td>
                    <td className="p-4 font-mono text-xs opacity-50">
                      {resource.geom.coordinates[1].toFixed(4)}, {resource.geom.coordinates[0].toFixed(4)}
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => handleEdit(resource)}
                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 transition"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => deleteMutation.mutate(resource.id)}
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
            <h2 className="text-xl font-bold mb-4">{editingResource ? 'Edit Resource' : 'Register Resource'}</h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider block opacity-75">Resource Type</label>
                  <select
                    value={resourceType}
                    onChange={(e) => setResourceType(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg bg-slate-50 dark:bg-slate-950 dark:border-slate-800 text-sm cursor-pointer"
                  >
                    {resourceTypes.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider block opacity-75">Quantity / Capacity</label>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg bg-slate-50 dark:bg-slate-955 dark:bg-slate-950 dark:border-slate-800 text-sm"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider block opacity-75">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg bg-slate-50 dark:bg-slate-950 dark:border-slate-800 text-sm cursor-pointer"
                >
                  <option value="AVAILABLE">Available</option>
                  <option value="ALLOCATED">Allocated</option>
                  <option value="IN_TRANSIT">In Transit</option>
                  <option value="MAINTENANCE">Maintenance</option>
                </select>
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
                  {editingResource ? 'Update Resource' : 'Register Resource'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Resources;
