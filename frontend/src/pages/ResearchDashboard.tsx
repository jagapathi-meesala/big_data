import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { FlaskConical, BarChart3, Table2, Radio, Scale } from 'lucide-react';
import api from '../services/api';

interface RankingRow {
  district: string;
  scheme: string;
  qd: number | null;
  qd_upper: number | null;
  dd: number | null;
  hd: number | null;
  md: number | null;
  vd: number | null;
  ddrps: number | null;
  risk_rank: number | null;
  priority_rank: number | null;
  category: string | null;
  population: number | null;
}

interface MetricRow {
  target: string;
  model: string;
  split: string;
  roc_auc: number;
  pr_auc: number;
  n: number;
}

interface StrategyRow {
  strategy: string;
  realized_unmet_units: number;
  unmet_per_event: number;
  unmet_ratio_vs_uniform: number;
  'precision@5': number;
  'recall@5': number;
}

interface LiveAlert {
  district: string;
  ts: string;
  rain_mm: number | null;
  temp_c: number | null;
  wind_kmh: number | null;
  qd_live: number | null;
  ddrps_live: number | null;
  category: string | null;
  lat: number | null;
  lon: number | null;
}

interface ApiEnvelope<T> {
  available: boolean;
  message?: string;
  count?: number;
  data: T[];
}

const categoryColor = (cat: string | null): string => {
  if (!cat) return 'bg-slate-200 text-slate-700';
  if (cat.includes('CRITICAL')) return 'bg-red-100 text-red-700';
  if (cat.includes('HIGH')) return 'bg-orange-100 text-orange-700';
  if (cat.includes('MEDIUM')) return 'bg-amber-100 text-amber-700';
  return 'bg-emerald-100 text-emerald-700';
};

const Card: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode }> = ({
  title, icon, children
}) => (
  <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-5">
    <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-4">
      {icon} {title}
    </h2>
    {children}
  </section>
);

const Unavailable: React.FC<{ message?: string }> = ({ message }) => (
  <p className="text-sm text-slate-500 dark:text-slate-400">
    {message || 'Not published yet. Run the RADAR pipeline: ./run_pipeline.sh all, then bigdata/serving/write_to_postgres.py.'}
  </p>
);

const ResearchDashboard: React.FC = () => {
  const ranking = useQuery<ApiEnvelope<RankingRow>>({
    queryKey: ['research', 'ddrps-ranking'],
    queryFn: async ({ signal }) => (await api.get('/research/ddrps-ranking', { signal })).data,
    refetchInterval: 60_000,
  });
  const validation = useQuery<{ available: boolean; data?: { holdout_events?: number; strategies?: StrategyRow[]; ranking?: Record<string, unknown> } }>({
    queryKey: ['research', 'validation-summary'],
    queryFn: async ({ signal }) => (await api.get('/research/validation-summary', { signal })).data,
    refetchInterval: 60_000,
  });
  const metrics = useQuery<ApiEnvelope<MetricRow>>({
    queryKey: ['research', 'model-metrics'],
    queryFn: async ({ signal }) => (await api.get('/research/model-metrics', { signal })).data,
    refetchInterval: 120_000,
  });
  const alerts = useQuery<ApiEnvelope<LiveAlert>>({
    queryKey: ['research', 'live-alerts'],
    queryFn: async ({ signal }) => (await api.get('/research/live-alerts', { signal })).data,
    refetchInterval: 30_000,
  });

  const baseline = (ranking.data?.data || []).filter((r) => r.scheme === 'baseline');
  const strategies = validation.data?.data?.strategies || [];
  const maxUnmet = Math.max(1, ...strategies.map((s) => s.unmet_per_event));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold flex items-center gap-2">
          <FlaskConical className="text-brand-500" /> RADAR Research Console
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Outputs of the RADAR pipeline: calibrated hazard models, DDRPS 2.0
          response-priority ranking, outcome-validated pre-positioning, and the
          live streaming alert layer.
        </p>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card title="DDRPS 2.0 response-priority ranking (baseline weights)" icon={<Table2 size={16} />}>
          {ranking.isLoading ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : baseline.length === 0 ? (
            <Unavailable message={ranking.data?.message} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-500 border-b border-slate-200 dark:border-slate-800">
                    <th className="py-2 pr-3">#</th>
                    <th className="py-2 pr-3">District</th>
                    <th className="py-2 pr-3">Qd</th>
                    <th className="py-2 pr-3">Qd upper 90%</th>
                    <th className="py-2 pr-3">Dd</th>
                    <th className="py-2 pr-3">Hd</th>
                    <th className="py-2 pr-3">Md</th>
                    <th className="py-2 pr-3">Vd</th>
                    <th className="py-2 pr-3">DDRPS</th>
                    <th className="py-2">Category</th>
                  </tr>
                </thead>
                <tbody>
                  {baseline.map((r) => (
                    <tr key={r.district} className="border-b border-slate-100 dark:border-slate-800/60">
                      <td className="py-1.5 pr-3 font-semibold">{r.priority_rank}</td>
                      <td className="py-1.5 pr-3">{r.district}</td>
                      <td className="py-1.5 pr-3">{r.qd?.toFixed(3)}</td>
                      <td className="py-1.5 pr-3">{r.qd_upper?.toFixed(3)}</td>
                      <td className="py-1.5 pr-3">{r.dd?.toFixed(2)}</td>
                      <td className="py-1.5 pr-3">{r.hd?.toFixed(2)}</td>
                      <td className="py-1.5 pr-3">{r.md?.toFixed(2)}</td>
                      <td className="py-1.5 pr-3">{r.vd?.toFixed(2)}</td>
                      <td className="py-1.5 pr-3 font-bold">{r.ddrps?.toFixed(3)}</td>
                      <td className="py-1.5">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${categoryColor(r.category)}`}>
                          {r.category?.replace('PRIORITY_', 'P').replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <div className="space-y-6">
          <Card title="Hazard model quality (test split)" icon={<BarChart3 size={16} />}>
            {metrics.isLoading ? (
              <p className="text-sm text-slate-500">Loading…</p>
            ) : (metrics.data?.data || []).length === 0 ? (
              <Unavailable message={metrics.data?.message} />
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-500 border-b border-slate-200 dark:border-slate-800">
                    <th className="py-2 pr-3">Target</th>
                    <th className="py-2 pr-3">Model</th>
                    <th className="py-2 pr-3">ROC-AUC</th>
                    <th className="py-2 pr-3">PR-AUC</th>
                    <th className="py-2">n</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.data!.data.filter((m) => m.split === 'test').map((m, i) => (
                    <tr key={`${m.target}-${m.model}-${i}`} className="border-b border-slate-100 dark:border-slate-800/60">
                      <td className="py-1.5 pr-3">{m.target}</td>
                      <td className="py-1.5 pr-3">{m.model}</td>
                      <td className="py-1.5 pr-3">{m.roc_auc?.toFixed(3)}</td>
                      <td className="py-1.5 pr-3">{m.pr_auc?.toFixed(3)}</td>
                      <td className="py-1.5">{m.n}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>

          <Card title={`Pre-positioning replay (${validation.data?.data?.holdout_events ?? '—'} holdout events)`} icon={<Scale size={16} />}>
            {validation.isLoading ? (
              <p className="text-sm text-slate-500">Loading…</p>
            ) : strategies.length === 0 ? (
              <Unavailable message={validation.data ? undefined : 'Loading…'} />
            ) : (
              <div className="space-y-2">
                {strategies.map((s) => (
                  <div key={s.strategy}>
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="font-medium">{s.strategy}</span>
                      <span className="text-slate-500">
                        unmet/event {s.unmet_per_event} · P@5 {s['precision@5']}
                      </span>
                    </div>
                    <div className="h-2.5 rounded bg-slate-200 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-brand-500"
                        style={{ width: `${(s.unmet_per_event / maxUnmet) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
                <p className="text-xs text-slate-500 pt-1">Lower is better: mean unmet demand per held-out historical flood event.</p>
              </div>
            )}
          </Card>
        </div>
      </div>

      <Card title="Live alerts (Spark Structured Streaming → PostGIS)" icon={<Radio size={16} />}>
        {alerts.isLoading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : (alerts.data?.data || []).length === 0 ? (
          <Unavailable message={alerts.data?.message} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {alerts.data!.data.map((a) => (
              <div key={a.district} className="rounded-lg border border-slate-200 dark:border-slate-800 p-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">{a.district}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${categoryColor(a.category)}`}>
                    {a.category?.replace('PRIORITY_', 'P')}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  rain {a.rain_mm?.toFixed(1) ?? '–'} mm · wind {a.wind_kmh?.toFixed(0) ?? '–'} km/h
                </p>
                <p className="text-xs text-slate-500">
                  live DDRPS {a.ddrps_live?.toFixed(3)} · {new Date(a.ts).toLocaleTimeString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default ResearchDashboard;
