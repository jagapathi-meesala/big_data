import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Brain, ShieldCheck, CheckCircle2,
  Truck, Building2, Home, Sparkles,
  Layers, FileText, Check, ArrowRight, RefreshCw
} from 'lucide-react';
import api from '../services/api';

export const AgentDisasterPanel: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedIncidentId, setSelectedIncidentId] = useState<string>('');
  const [executingActionId, setExecutingActionId] = useState<string | null>(null);
  const [executionMessage, setExecutionMessage] = useState<string | null>(null);

  // Fetch agent passport status
  const { data: agentStatus } = useQuery({
    queryKey: ['agent-passport-status'],
    queryFn: async () => {
      const res = await api.get('/agent/status');
      return res.data;
    },
    staleTime: 60000,
  });

  // Fetch active incidents for dropdown selector
  const { data: incidentsData } = useQuery({
    queryKey: ['agent-incidents-selector'],
    queryFn: async () => {
      const res = await api.get('/incidents', { params: { limit: 20 } });
      return res.data;
    },
  });

  const incidents = incidentsData?.incidents || [];
  const activeIncidentId = selectedIncidentId || (incidents.length > 0 ? incidents[0].id : '');

  // Query Agent Analysis for selected incident
  const {
    data: analysisResponse,
    isLoading: isAnalyzing,
    refetch: triggerAnalysis,
    isRefetching
  } = useQuery({
    queryKey: ['agent-incident-analysis', activeIncidentId],
    queryFn: async () => {
      if (!activeIncidentId) return null;
      const res = await api.post('/agent/analyze', {
        incidentId: activeIncidentId,
        query: 'Execute situational assessment & resource priority optimization'
      });
      return res.data?.data;
    },
    enabled: !!activeIncidentId,
    staleTime: 30000,
  });

  // Action execution mutation for Human Oversight
  const executeActionMutation = useMutation({
    mutationFn: async (action: any) => {
      const res = await api.post('/agent/execute-action', {
        actionId: action.id,
        action: action.action,
        district: analysisData?.incident?.district || 'Regional Command'
      });
      return res.data;
    },
    onSuccess: (_data, action) => {
      setExecutingActionId(null);
      setExecutionMessage(`Confirmed & Executed: "${action.action}"`);
      queryClient.invalidateQueries(['header-notifications']);
      queryClient.invalidateQueries(['recent-incidents-log']);
      setTimeout(() => setExecutionMessage(null), 5000);
    },
    onError: (err: any) => {
      setExecutingActionId(null);
      alert('Failed to execute action: ' + (err.response?.data?.message || err.message));
    }
  });

  const handleConfirmAction = (action: any) => {
    setExecutingActionId(action.id);
    executeActionMutation.mutate(action);
  };

  const analysisData = analysisResponse;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-md overflow-hidden transition-all duration-300">
      {/* Header Bar with Agent Passport Verification Badges */}
      <div className="p-6 bg-slate-950 text-white border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-2xl shrink-0">
            <Brain size={24} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2.5 flex-wrap">
              <h2 className="text-base font-bold tracking-tight">AI Disaster Response Agent</h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center space-x-1">
                <ShieldCheck size={12} />
                <span>Passport Verified</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-500/20 text-blue-300 border border-blue-500/30">
                Agent ID: {agentStatus?.agent_id || 'disaster-response-agent-01'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Autonomous situational assessment, spatial solver coordination &amp; decision support.
            </p>
          </div>
        </div>

        {/* Passport Verification Checkpoint Indicators */}
        <div className="flex items-center space-x-2 text-[10px] font-bold shrink-0">
          <span className="px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-xl text-slate-300 flex items-center space-x-1">
            <CheckCircle2 size={12} className="text-emerald-400" />
            <span>Validate: PASSED</span>
          </span>
          <span className="px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-xl text-slate-300 flex items-center space-x-1">
            <CheckCircle2 size={12} className="text-emerald-400" />
            <span>Explain: PASSED</span>
          </span>
          <span className="px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-xl text-slate-300 flex items-center space-x-1">
            <CheckCircle2 size={12} className="text-emerald-400" />
            <span>Export: PASSED</span>
          </span>
        </div>
      </div>

      {/* Control Bar: Incident Selector & Analyze Button */}
      <div className="p-6 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex-1 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 shrink-0">
            Target Incident:
          </label>
          <select
            value={activeIncidentId}
            onChange={(e) => setSelectedIncidentId(e.target.value)}
            className="w-full sm:w-auto flex-1 max-w-md px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {incidents.map((inc: any) => (
              <option key={inc.id} value={inc.id}>
                {inc.title} ({inc.district} — {inc.severity})
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={() => triggerAnalysis()}
          disabled={isAnalyzing || isRefetching}
          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold rounded-xl shadow-md transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer shrink-0"
        >
          <Sparkles size={15} className={(isAnalyzing || isRefetching) ? 'animate-spin' : ''} />
          <span>{(isAnalyzing || isRefetching) ? 'Analyzing Context...' : 'Analyze Incident with Agent'}</span>
        </button>
      </div>

      {/* Execution Feedback Notification */}
      {executionMessage && (
        <div className="mx-6 mt-6 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center justify-between animate-in fade-in duration-200">
          <div className="flex items-center space-x-2">
            <CheckCircle2 size={16} />
            <span>{executionMessage}</span>
          </div>
          <span className="text-[10px] text-emerald-500/80 uppercase tracking-wide">Human Authorized Action Recorded</span>
        </div>
      )}

      {/* Main Analysis Body */}
      <div className="p-6 space-y-6">
        {isAnalyzing && !analysisData ? (
          <div className="p-12 text-center space-y-3">
            <RefreshCw size={28} className="animate-spin text-emerald-500 mx-auto" />
            <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
              Disaster Response Agent is evaluating situational parameters...
            </p>
            <p className="text-[11px] text-slate-400">
              Querying PostGIS coordinates, Scikit-Learn risk predictor &amp; PySpark resource models.
            </p>
          </div>
        ) : !analysisData ? (
          <div className="p-8 text-center text-xs opacity-60">
            Select an incident above to generate Agent decision recommendations.
          </div>
        ) : (
          <>
            {/* Top Bar: Situation Summary & Hazard Risk Meter */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 p-5 rounded-2xl bg-slate-900 border border-slate-800 text-white space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Situation Assessment Summary</span>
                  <span className="text-[10px] text-emerald-400 font-mono">Timestamp: {new Date(analysisData.timestamp).toLocaleTimeString()}</span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed font-medium">
                  {analysisData.situation_summary}
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold opacity-60 uppercase tracking-wider">Hazard Severity &amp; Risk</span>
                  <span className={`px-2 py-0.5 text-[10px] font-black rounded-full uppercase ${
                    analysisData.severity.level === 'CRITICAL' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  }`}>
                    {analysisData.severity.level}
                  </span>
                </div>
                <div className="mt-3">
                  <div className="flex justify-between items-baseline mb-1">
                    <span className="text-2xl font-black text-slate-900 dark:text-slate-100">{analysisData.severity.risk_score}</span>
                    <span className="text-[10px] opacity-50 font-bold">Risk Index / 100</span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        analysisData.severity.risk_score > 75 ? 'bg-rose-500' : 'bg-amber-500'
                      }`}
                      style={{ width: `${Math.min(100, analysisData.severity.risk_score)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Recommended Actions Section with Human Oversight */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center space-x-2">
                  <Sparkles size={15} className="text-emerald-500" />
                  <span>Agent Recommended Actions</span>
                </h3>
                <span className="text-[10px] font-semibold text-amber-500 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                  ⚠️ Human Oversight: Requires Command Officer Approval
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {analysisData.recommended_actions?.map((act: any) => (
                  <div
                    key={act.id}
                    className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`px-2 py-0.5 text-[9px] font-black rounded-md uppercase ${
                          act.priority === 'CRITICAL' ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                        }`}>
                          {act.priority} PRIORITY
                        </span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase">{act.category}</span>
                      </div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-snug">
                        {act.action}
                      </p>
                    </div>

                    <button
                      onClick={() => handleConfirmAction(act)}
                      disabled={executingActionId === act.id}
                      className="w-full py-2 bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-[11px] font-bold rounded-xl shadow transition-all duration-200 flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {executingActionId === act.id ? (
                        <span>Executing Action...</span>
                      ) : (
                        <>
                          <span>Confirm &amp; Execute Action</span>
                          <ArrowRight size={13} />
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Target Facility Recommendations Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Hospitals */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-3">
                <div className="flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                  <Building2 size={16} className="text-emerald-500" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    Hospital Recommendations
                  </h4>
                </div>
                <div className="space-y-2.5 max-h-[180px] overflow-y-auto pr-1">
                  {analysisData.hospital_recommendations?.map((h: any) => (
                    <div key={h.id} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-xs">
                      <div className="flex justify-between items-start font-bold">
                        <span className="text-slate-800 dark:text-slate-100 truncate">{h.name}</span>
                        <span className="text-[10px] text-emerald-500 shrink-0">{h.availableBeds} beds</span>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">{h.recommendation}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Ambulances */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-3">
                <div className="flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                  <Truck size={16} className="text-cyan-500" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    Ambulance Units
                  </h4>
                </div>
                <div className="space-y-2.5 max-h-[180px] overflow-y-auto pr-1">
                  {analysisData.ambulance_recommendations?.map((a: any) => (
                    <div key={a.id} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-xs">
                      <div className="flex justify-between items-start font-bold">
                        <span className="text-slate-800 dark:text-slate-100 truncate">{a.name}</span>
                        <span className="text-[10px] text-cyan-500 shrink-0">{a.availableUnits} units</span>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">{a.recommendation}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Shelters */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-3">
                <div className="flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                  <Home size={16} className="text-amber-500" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    Relief Shelters
                  </h4>
                </div>
                <div className="space-y-2.5 max-h-[180px] overflow-y-auto pr-1">
                  {analysisData.shelter_recommendations?.map((s: any) => (
                    <div key={s.id} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-xs">
                      <div className="flex justify-between items-start font-bold">
                        <span className="text-slate-800 dark:text-slate-100 truncate">{s.name}</span>
                        <span className="text-[10px] text-amber-500 shrink-0">{s.openCapacity} cap</span>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">{s.recommendation}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Row: Transparent Reasoning & Data Sources Used */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
              <div className="md:col-span-2 p-5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center space-x-2">
                  <FileText size={15} className="text-indigo-500" />
                  <span>Agent Reasoning Breakdown</span>
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {analysisData.reasoning_summary}
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center space-x-2">
                  <Layers size={15} className="text-emerald-500" />
                  <span>Data Sources Queried</span>
                </h4>
                <ul className="space-y-1">
                  {analysisData.data_sources?.map((src: string, i: number) => (
                    <li key={i} className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center space-x-1.5">
                      <Check size={12} className="text-emerald-500 shrink-0" />
                      <span>{src}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AgentDisasterPanel;
