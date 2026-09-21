import React, { useState } from 'react';
import { AlertTriangle, Flame, Waves, Wind, Activity, RefreshCw, X, ShieldAlert, CheckCircle2, Zap } from 'lucide-react';
import api from '../services/api';

interface FakeDisasterAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSimulationTriggered?: () => void;
}

interface Scenario {
  id: string;
  title: string;
  disasterType: string;
  district: string;
  state: string;
  severity: string;
  latitude: number;
  longitude: number;
  description: string;
  icon: any;
  badgeColor: string;
}

const PRESET_SCENARIOS: Scenario[] = [
  {
    id: 's1',
    title: 'Vijayawada Krishna River Flash Flood',
    disasterType: 'FLOOD',
    district: 'Vijayawada',
    state: 'Andhra Pradesh',
    severity: 'CRITICAL',
    latitude: 16.5062,
    longitude: 80.6480,
    description: 'CRITICAL ALERT: Severe flash flood along Prakasam Barrage / Krishna River basin. Inundation threat to low-lying sectors.',
    icon: Waves,
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
  },
  {
    id: 's2',
    title: 'Visakhapatnam Bay Cyclone Impact',
    disasterType: 'HURRICANE',
    district: 'Visakhapatnam',
    state: 'Andhra Pradesh',
    severity: 'CRITICAL',
    latitude: 17.6868,
    longitude: 83.2185,
    description: 'CRITICAL ALERT: Category 4 tropical cyclone landfall near Vizag coast. Extreme wind gusts & coastal storm surge projected.',
    icon: Wind,
    badgeColor: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-800',
  },
  {
    id: 's3',
    title: 'Bhadrachalam / Khammam Seismic Tremor',
    disasterType: 'EARTHQUAKE',
    district: 'Khammam',
    state: 'Telangana',
    severity: 'HIGH',
    latitude: 17.2473,
    longitude: 80.1514,
    description: 'HIGH ALERT: 6.2 Magnitude seismic tremor along Godavari rift line. Emergency structural assessment & rescue response active.',
    icon: Activity,
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800',
  },
  {
    id: 's4',
    title: 'Hyderabad Musi Urban Inundation',
    disasterType: 'FLOOD',
    district: 'Hyderabad',
    state: 'Telangana',
    severity: 'HIGH',
    latitude: 17.3850,
    longitude: 78.4867,
    description: 'HIGH ALERT: Extreme cloudburst leading to rapid water accumulation along Musi riverbed and urban arterial roads.',
    icon: Waves,
    badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800',
  },
  {
    id: 's5',
    title: 'Warangal Industrial Chemical Fire',
    disasterType: 'FIRE',
    district: 'Warangal',
    state: 'Telangana',
    severity: 'HIGH',
    latitude: 17.9689,
    longitude: 79.5941,
    description: 'HIGH ALERT: Industrial warehouse fire with hazardous chemical smoke plume. Immediate perimeter evacuation active.',
    icon: Flame,
    badgeColor: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800',
  },
];

export const FakeDisasterAlertModal: React.FC<FakeDisasterAlertModalProps> = ({
  isOpen,
  onClose,
  onSimulationTriggered,
}) => {
  const [selectedScenario, setSelectedScenario] = useState<Scenario>(PRESET_SCENARIOS[0]);
  const [customTitle, setCustomTitle] = useState('');
  const [customType, setCustomType] = useState('FLOOD');
  const [customDistrict, setCustomDistrict] = useState('Vijayawada');
  const [customState, setCustomState] = useState('Andhra Pradesh');
  const [customSeverity, setCustomSeverity] = useState('CRITICAL');
  const [customLat, setCustomLat] = useState('16.5062');
  const [customLng, setCustomLng] = useState('80.6480');
  const [customDesc, setCustomDesc] = useState('');

  const [activeTab, setActiveTab] = useState<'presets' | 'custom'>('presets');
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  if (!isOpen) return null;

  const handleSelectScenario = (sc: Scenario) => {
    setSelectedScenario(sc);
    setCustomTitle(sc.title);
    setCustomType(sc.disasterType);
    setCustomDistrict(sc.district);
    setCustomState(sc.state);
    setCustomSeverity(sc.severity);
    setCustomLat(sc.latitude.toString());
    setCustomLng(sc.longitude.toString());
    setCustomDesc(sc.description);
  };

  const handleTriggerSimulation = async () => {
    setLoading(true);
    setStatusMessage(null);
    try {
      const payload = {
        title: activeTab === 'presets' ? selectedScenario.title : (customTitle || 'Simulated Disaster Alert'),
        disasterType: activeTab === 'presets' ? selectedScenario.disasterType : customType,
        district: activeTab === 'presets' ? selectedScenario.district : customDistrict,
        state: activeTab === 'presets' ? selectedScenario.state : customState,
        severity: activeTab === 'presets' ? selectedScenario.severity : customSeverity,
        latitude: activeTab === 'presets' ? selectedScenario.latitude : parseFloat(customLat),
        longitude: activeTab === 'presets' ? selectedScenario.longitude : parseFloat(customLng),
        description: activeTab === 'presets' ? selectedScenario.description : (customDesc || 'Simulated emergency scenario.'),
      };

      const res = await api.post('/incidents/simulate', payload);
      setStatusMessage({
        text: `Simulated Disaster Alert "${res.data.incident.title}" successfully triggered! AI risk scores & hospital allocations updated.`,
        type: 'success',
      });

      if (onSimulationTriggered) onSimulationTriggered();
    } catch (err: any) {
      console.error('Trigger simulation error:', err);
      setStatusMessage({
        text: err.response?.data?.message || 'Failed to trigger simulated disaster alert.',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetSimulation = async () => {
    setResetLoading(true);
    setStatusMessage(null);
    try {
      const res = await api.post('/incidents/simulation/reset');
      setStatusMessage({
        text: `Simulated scenarios successfully reset (${res.data.purgedCount || 0} simulation cases cleared). Baseline system restored.`,
        type: 'success',
      });

      if (onSimulationTriggered) onSimulationTriggered();
    } catch (err: any) {
      console.error('Reset simulation error:', err);
      setStatusMessage({
        text: err.response?.data?.message || 'Failed to reset simulated disaster scenarios.',
        type: 'error',
      });
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Trigger Simulated Disaster Scenario
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 font-semibold border border-amber-500/20 uppercase tracking-wider">
                  Test Mode
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Run an end-to-end disaster workflow test across DB, ML Risk, GIS Map, &amp; Allocation engine.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Warning Banner */}
        <div className="mx-6 mt-4 p-3.5 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl flex items-start gap-3 text-slate-700 dark:text-amber-200 text-xs leading-relaxed">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <strong className="text-slate-900 dark:text-amber-100">SAFE SIMULATION: </strong>
            Generates real database records, AI hazard scoring, resource routing &amp; map updates, but will <strong className="text-amber-700 dark:text-amber-100">NOT</strong> send real text messages or contact real emergency services. All records carry a <code className="bg-amber-100 dark:bg-amber-950 px-1 py-0.5 rounded text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">[SIMULATION]</code> tag and can be reset cleanly.
          </div>
        </div>

        {/* Tab Selection */}
        <div className="px-6 mt-4 flex border-b border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setActiveTab('presets')}
            className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'presets'
                ? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            Preset Test Scenarios ({PRESET_SCENARIOS.length})
          </button>
          <button
            onClick={() => setActiveTab('custom')}
            className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'custom'
                ? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            Custom Parameters
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {statusMessage && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                  : 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30 text-rose-800 dark:text-rose-300'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {activeTab === 'presets' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {PRESET_SCENARIOS.map((sc) => {
                const IconComponent = sc.icon;
                const isSelected = selectedScenario.id === sc.id;
                return (
                  <div
                    key={sc.id}
                    onClick={() => handleSelectScenario(sc)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-slate-50 dark:bg-slate-800 border-emerald-500 ring-2 ring-emerald-500/20 shadow-sm'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
                          <IconComponent className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[130px]">
                          {sc.district}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${sc.badgeColor}`}
                      >
                        {sc.severity}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">{sc.title}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">{sc.description}</p>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">Scenario Title</label>
                  <input
                    type="text"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="e.g. Flash Flood Alert"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">Disaster Type</label>
                  <select
                    value={customType}
                    onChange={(e) => setCustomType(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-emerald-500"
                  >
                    <option value="FLOOD">FLOOD</option>
                    <option value="HURRICANE">CYCLONE / HURRICANE</option>
                    <option value="EARTHQUAKE">EARTHQUAKE</option>
                    <option value="FIRE">FIRE</option>
                    <option value="LANDSLIDE">LANDSLIDE</option>
                    <option value="OTHER">OTHER</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">District</label>
                  <input
                    type="text"
                    value={customDistrict}
                    onChange={(e) => setCustomDistrict(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">State</label>
                  <input
                    type="text"
                    value={customState}
                    onChange={(e) => setCustomState(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">Severity</label>
                  <select
                    value={customSeverity}
                    onChange={(e) => setCustomSeverity(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-emerald-500"
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="CRITICAL">CRITICAL (SOS)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={customLat}
                    onChange={(e) => setCustomLat(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={customLng}
                    onChange={(e) => setCustomLng(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">Description / Notes</label>
                <textarea
                  rows={2}
                  value={customDesc}
                  onChange={(e) => setCustomDesc(e.target.value)}
                  placeholder="Details regarding the simulated disaster scenario..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <button
            onClick={handleResetSimulation}
            disabled={resetLoading || loading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 hover:bg-rose-100 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${resetLoading ? 'animate-spin' : ''}`} />
            Reset Active Simulation
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Close
            </button>
            <button
              onClick={handleTriggerSimulation}
              disabled={loading || resetLoading}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 shadow-md transition-all disabled:opacity-50"
            >
              <Zap className={`w-4 h-4 ${loading ? 'animate-bounce' : ''}`} />
              {loading ? 'Triggering Simulation...' : 'Trigger Fake Disaster Alert'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
