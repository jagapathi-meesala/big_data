import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  CloudRain, Wind, Droplets, Thermometer, AlertCircle, MapPin,
  Eye, BarChart3, Activity,
  Zap, Award, ChevronUp, ChevronDown
} from 'lucide-react';
import api from '../services/api';

// ─── Types ────────────────────────────────────────────────────────────────────
interface CityWeather {
  city: string;
  temp: number;
  humidity: number;
  rainfall: number;
  windSpeed: number;
  pressure: number;
  visibility: number;
  alerts: string;
}

// ─── Real Rainfall Data (1901–2015, IMD Dataset) ─────────────────────────────
const ANNUAL_RECENT = [
  { year:2000, cap:992.3,  tel:1078.0 },
  { year:2001, cap:1009.3, tel:922.3  },
  { year:2002, cap:703.2,  tel:765.3  },
  { year:2003, cap:1096.8, tel:963.2  },
  { year:2004, cap:873.6,  tel:667.0  },
  { year:2005, cap:1221.6, tel:1163.1 },
  { year:2006, cap:1159.6, tel:1053.0 },
  { year:2007, cap:1099.2, tel:843.3  },
  { year:2008, cap:1107.5, tel:1035.3 },
  { year:2009, cap:790.5,  tel:666.3  },
  { year:2010, cap:1712.4, tel:1276.4 },
  { year:2011, cap:861.9,  tel:753.1  },
  { year:2012, cap:1318.4, tel:1008.6 },
  { year:2013, cap:1120.5, tel:1348.7 },
  { year:2014, cap:874.9,  tel:746.4  },
  { year:2015, cap:1010.9, tel:857.3  },
];

const EXTREME_YEARS = [
  { sub:'Coastal AP',  year:2010, mm:1712.4 },
  { sub:'Coastal AP',  year:1990, mm:1611.1 },
  { sub:'Coastal AP',  year:1958, mm:1605.3 },
  { sub:'Telangana',   year:1988, mm:1544.9 },
  { sub:'Telangana',   year:1983, mm:1497.5 },
  { sub:'Telangana',   year:1990, mm:1425.7 },
  { sub:'Coastal AP',  year:1956, mm:1408.5 },
  { sub:'Telangana',   year:1933, mm:1396.3 },
  { sub:'Coastal AP',  year:1955, mm:1378.9 },
  { sub:'Coastal AP',  year:1995, mm:1352.0 },
];

const DISTRICT_PRIORITIES = [
  { rank: 1,  district: 'Karimnagar',                    state: 'Telangana',      score: 0.8146, zone: 'ZONE 1 — CRITICAL', shift: 1,   Dd: '0.85', Vd: '0.78', Qd: '0.45' },
  { rank: 2,  district: 'Nalgonda',                      state: 'Telangana',      score: 0.8037, zone: 'ZONE 1 — CRITICAL', shift: -1,  Dd: '0.82', Vd: '0.76', Qd: '0.48' },
  { rank: 3,  district: 'Mahbubnagar',                   state: 'Telangana',      score: 0.6713, zone: 'ZONE 2 — HIGH',     shift: 0,   Dd: '0.68', Vd: '0.65', Qd: '0.52' },
  { rank: 4,  district: 'Medak',                         state: 'Telangana',      score: 0.5694, zone: 'ZONE 2 — HIGH',     shift: 0,   Dd: '0.58', Vd: '0.54', Qd: '0.41' },
  { rank: 5,  district: 'Warangal',                      state: 'Telangana',      score: 0.5169, zone: 'ZONE 2 — HIGH',     shift: 1,   Dd: '0.52', Vd: '0.50', Qd: '0.49' },
  { rank: 6,  district: 'Adilabad',                      state: 'Telangana',      score: 0.4848, zone: 'ZONE 3 — MEDIUM',   shift: -1,  Dd: '0.47', Vd: '0.49', Qd: '0.55' },
  { rank: 7,  district: 'Khammam',                       state: 'Telangana',      score: 0.4311, zone: 'ZONE 3 — MEDIUM',   shift: 0,   Dd: '0.44', Vd: '0.41', Qd: '0.50' },
  { rank: 8,  district: 'West Godavari',                 state: 'Andhra Pradesh', score: 0.3714, zone: 'ZONE 3 — MEDIUM',   shift: 11,  Dd: '0.38', Vd: '0.35', Qd: '0.42' },
  { rank: 9,  district: 'Nizamabad',                     state: 'Telangana',      score: 0.3706, zone: 'ZONE 3 — MEDIUM',   shift: 0,   Dd: '0.36', Vd: '0.37', Qd: '0.39' },
  { rank: 10, district: 'Krishna',                       state: 'Andhra Pradesh', score: 0.3108, zone: 'ZONE 3 — MEDIUM',   shift: 6,   Dd: '0.31', Vd: '0.30', Qd: '0.35' },
  { rank: 11, district: 'East Godavari',                state: 'Andhra Pradesh', score: 0.3031, zone: 'ZONE 3 — MEDIUM',   shift: 11,  Dd: '0.30', Vd: '0.29', Qd: '0.38' },
  { rank: 12, district: 'Hyderabad',                    state: 'Telangana',      score: 0.3029, zone: 'ZONE 3 — MEDIUM',   shift: 11,  Dd: '0.29', Vd: '0.31', Qd: '0.28' },
  { rank: 13, district: 'Guntur',                       state: 'Andhra Pradesh', score: 0.2798, zone: 'ZONE 4 — LOW',      shift: 2,   Dd: '0.27', Vd: '0.28', Qd: '0.32' },
  { rank: 14, district: 'Srikakulam',                   state: 'Andhra Pradesh', score: 0.2591, zone: 'ZONE 4 — LOW',      shift: -6,  Dd: '0.25', Vd: '0.26', Qd: '0.34' },
  { rank: 15, district: 'Rangareddy',                    state: 'Telangana',      score: 0.2283, zone: 'ZONE 4 — LOW',      shift: 5,   Dd: '0.22', Vd: '0.23', Qd: '0.25' },
  { rank: 16, district: 'Vizianagaram',                 state: 'Andhra Pradesh', score: 0.2113, zone: 'ZONE 4 — LOW',      shift: -5,  Dd: '0.20', Vd: '0.21', Qd: '0.31' },
  { rank: 17, district: 'Sri Potti Sriramulu Nellore',  state: 'Andhra Pradesh', score: 0.2042, zone: 'ZONE 4 — LOW',      shift: -5,  Dd: '0.19', Vd: '0.21', Qd: '0.29' },
  { rank: 18, district: 'Prakasam',                     state: 'Andhra Pradesh', score: 0.1901, zone: 'ZONE 4 — LOW',      shift: -5,  Dd: '0.18', Vd: '0.19', Qd: '0.27' },
  { rank: 19, district: 'Chittoor',                     state: 'Andhra Pradesh', score: 0.1805, zone: 'ZONE 4 — LOW',      shift: -5,  Dd: '0.17', Vd: '0.18', Qd: '0.26' },
  { rank: 20, district: 'Visakhapatnam',                state: 'Andhra Pradesh', score: 0.1774, zone: 'ZONE 4 — LOW',      shift: 1,   Dd: '0.17', Vd: '0.17', Qd: '0.25' },
  { rank: 21, district: 'Anantapur',                    state: 'Andhra Pradesh', score: 0.1654, zone: 'ZONE 4 — LOW',      shift: -11, Dd: '0.15', Vd: '0.16', Qd: '0.22' },
  { rank: 22, district: 'Cuddapah',                     state: 'Andhra Pradesh', score: 0.1585, zone: 'ZONE 4 — LOW',      shift: -5,  Dd: '0.15', Vd: '0.15', Qd: '0.21' },
  { rank: 23, district: 'Kurnool',                      state: 'Andhra Pradesh', score: 0.1529, zone: 'ZONE 4 — LOW',      shift: -5,  Dd: '0.14', Vd: '0.15', Qd: '0.20' },
];

const LiveDot = () => (
  <span className="flex items-center space-x-1">
    <span className="relative flex h-2 w-2">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
    </span>
    <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-500">Live Feed</span>
  </span>
);

const Bar = ({ value, max, color }: { value: number; max: number; color: string }) => (
  <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
    <div className="h-2 rounded-full transition-all" style={{ width:`${Math.max((value/max)*100,2)}%`, backgroundColor: color }} />
  </div>
);

const WeatherCard = ({ city }: { city: CityWeather }) => {
  const isHot   = city.temp >= 35;
  const isWindy = city.windSpeed >= 20;
  const hasRain = city.rainfall > 0;
  const hasAlert = isHot || isWindy || hasRain;

  return (
    <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-md transition-shadow space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-1.5">
          <MapPin size={13} className="text-blue-500 shrink-0" />
          <span className="font-bold text-sm text-slate-800 dark:text-slate-100">{city.city}</span>
        </div>
        <LiveDot />
      </div>
      <div className="flex items-center space-x-4">
        <CloudRain className={`w-12 h-12 shrink-0 ${isHot ? 'text-amber-500 animate-pulse' : 'text-blue-400'}`} />
        <div>
          <span className={`text-3xl font-black ${isHot ? 'text-amber-500' : 'text-slate-800 dark:text-slate-100'}`}>
            {city.temp.toFixed(1)}°C
          </span>
          <span className="text-[10px] block opacity-60 font-semibold mt-0.5">{city.alerts || 'Clear Sky'}</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500 dark:text-slate-400">
        <div className="flex items-center space-x-1.5"><Thermometer size={12}/><span>Pressure: {city.pressure} hPa</span></div>
        <div className="flex items-center space-x-1.5"><Droplets size={12}/><span>Humidity: {city.humidity}%</span></div>
        <div className="flex items-center space-x-1.5">
          <Wind size={12} className={isWindy ? 'text-amber-500':''} />
          <span className={isWindy ? 'text-amber-500 font-bold':''}>Wind: {city.windSpeed} m/s</span>
        </div>
        <div className="flex items-center space-x-1.5"><Eye size={12}/><span>Visibility: {city.visibility} m</span></div>
      </div>
      {hasAlert && (
        <div className={`p-2.5 rounded-lg flex items-center space-x-1.5 text-[10px] font-semibold
          ${isHot ? 'bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400'
                  : 'bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400'}`}>
          <AlertCircle size={13}/>
          <span>
            {isHot ? `⚠ Heat Alert — ${city.temp.toFixed(1)}°C` : ''}
            {isWindy ? `${isHot ? ' · ' : ''}Strong Wind — ${city.windSpeed} m/s` : ''}
            {hasRain ? ` · Rainfall: ${city.rainfall} mm` : ''}
          </span>
        </div>
      )}
    </div>
  );
};

const Weather: React.FC = () => {
  const [tab, setTab] = useState<'weather' | 'rainfall' | 'zones' | 'extreme'>('weather');

  const { data, isLoading } = useQuery(['live-weather-feed'], async () => {
    const res = await api.get('/weather/live');
    return res.data;
  }, { refetchInterval: 5 * 60 * 1000 });

  const cities: CityWeather[] = data?.weather ?? [];
  const maxTemp    = cities.length ? Math.max(...cities.map(c => c.temp)) : 0;
  const avgTemp    = cities.length ? cities.reduce((s,c)=>s+c.temp,0)/cities.length : 0;
  const alertCount = cities.filter(c => c.temp>=35||c.windSpeed>=20||c.rainfall>0).length;

  const zoneColor = (zone: string) => {
    if (zone.includes('ZONE 1')) return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
    if (zone.includes('ZONE 2')) return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
    if (zone.includes('ZONE 3')) return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">Weather Warning Terminal</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Live climatic indicators, district priority zones, historical rainfall data and extreme event reports for Andhra Pradesh &amp; Telangana.
        </p>
      </div>

      {/* Tab nav */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-6 text-sm font-semibold">
        <Link to="/sos-requests" className="pb-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition">SOS Requests</Link>
        <Link to="/incidents"    className="pb-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition">Incidents Log</Link>
        <button onClick={() => setTab('weather')} className={`pb-3 transition ${tab==='weather' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-slate-400 hover:text-slate-600'}`}>
          Weather Alerts
        </button>
        <button onClick={() => setTab('zones')} className={`pb-3 transition ${tab==='zones' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-slate-400 hover:text-slate-600'}`}>
          District Priority Zones
        </button>
        <button onClick={() => setTab('rainfall')} className={`pb-3 transition ${tab==='rainfall' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-slate-400 hover:text-slate-600'}`}>
          Rainfall Report
        </button>
        <button onClick={() => setTab('extreme')} className={`pb-3 transition ${tab==='extreme' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-slate-400 hover:text-slate-600'}`}>
          Extreme Events
        </button>
      </div>

      {/* ── WEATHER ALERTS ── */}
      {tab === 'weather' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex items-center space-x-3">
              <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl"><Thermometer size={20}/></div>
              <div><span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Peak Temperature</span>
                <p className="text-xl font-black text-slate-800 dark:text-slate-100 mt-0.5">{maxTemp.toFixed(1)}°C</p></div>
            </div>
            <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex items-center space-x-3">
              <div className="p-3 bg-blue-500/10 text-blue-500 rounded-xl"><Activity size={20}/></div>
              <div><span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Average Temp</span>
                <p className="text-xl font-black text-slate-800 dark:text-slate-100 mt-0.5">{avgTemp.toFixed(1)}°C</p></div>
            </div>
            <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex items-center space-x-3">
              <div className="p-3 bg-rose-500/10 text-rose-500 rounded-xl"><AlertCircle size={20}/></div>
              <div><span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Alerts</span>
                <p className="text-xl font-black text-slate-800 dark:text-slate-100 mt-0.5">{alertCount}</p></div>
            </div>
          </div>
          {isLoading ? (
            <div className="text-center py-20 text-sm text-slate-400 animate-pulse">Querying live weather feeds…</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {cities.map(city => <WeatherCard key={city.city} city={city}/>)}
            </div>
          )}
        </>
      )}

      {/* ── DISTRICT PRIORITY ZONES (1-4) ── */}
      {tab === 'zones' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Award size={16} className="text-blue-500" />
                <h2 className="font-bold text-sm text-slate-800 dark:text-slate-100">District DDRPS Priority Scores &amp; Zones (1–4)</h2>
              </div>
              <span className="text-[10px] font-mono text-slate-400">ElasticNet CV Model (R² = 0.6283)</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/40 text-[10px] uppercase tracking-wider text-slate-400">
                    <th className="px-5 py-3 text-left">Rank</th>
                    <th className="px-5 py-3 text-left">District &amp; State</th>
                    <th className="px-4 py-3 text-center">DDRPS Score</th>
                    <th className="px-4 py-3 text-left">Priority Zone</th>
                    <th className="px-4 py-3 text-center">Pop. Exposure (Dₐ)</th>
                    <th className="px-4 py-3 text-center">Housing Vuln. (Vₐ)</th>
                    <th className="px-4 py-3 text-center">Rainfall Risk (Qₐ)</th>
                    <th className="px-4 py-3 text-center">Shift</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {DISTRICT_PRIORITIES.map((d) => (
                    <tr key={d.district} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                      <td className="px-5 py-3.5 font-black text-slate-800 dark:text-slate-100">#{d.rank}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center space-x-2">
                          <MapPin size={12} className="text-blue-500 shrink-0" />
                          <div>
                            <p className="font-bold text-slate-800 dark:text-slate-100">{d.district}</p>
                            <p className="text-[9px] text-slate-400">{d.state}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-center font-mono font-extrabold text-slate-800 dark:text-slate-100 text-[11px]">
                        {d.score.toFixed(4)}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`px-2.5 py-1 border rounded-lg text-[9px] font-black uppercase tracking-wider ${zoneColor(d.zone)}`}>
                          {d.zone}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center font-mono text-slate-500">{d.Dd}</td>
                      <td className="px-4 py-3.5 text-center font-mono text-slate-500">{d.Vd}</td>
                      <td className="px-4 py-3.5 text-center font-mono text-slate-500">{d.Qd}</td>
                      <td className="px-4 py-3.5 text-center">
                        {d.shift > 0 ? (
                          <span className="inline-flex items-center space-x-0.5 text-emerald-500 font-bold text-[11px]">
                            <ChevronUp size={13} /><span>+{d.shift}</span>
                          </span>
                        ) : d.shift < 0 ? (
                          <span className="inline-flex items-center space-x-0.5 text-rose-500 font-bold text-[11px]">
                            <ChevronDown size={13} /><span>{d.shift}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── RAINFALL REPORT ── */}
      {tab === 'rainfall' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center space-x-2">
              <BarChart3 size={16} className="text-blue-500"/>
              <h2 className="font-bold text-sm text-slate-800 dark:text-slate-100">Annual Rainfall 2000–2015</h2>
              <span className="ml-auto text-[10px] text-slate-400">Source: IMD 1901–2015</span>
            </div>
            <div className="px-6 py-5 space-y-2.5">
              {ANNUAL_RECENT.map(row => (
                <div key={row.year} className="flex items-center gap-3">
                  <span className="text-[10px] font-bold text-slate-500 w-10">{row.year}</span>
                  <div className="flex-1 flex items-center gap-2 text-[10px]">
                    <Bar value={row.cap} max={1800} color="#3b82f6"/>
                    <span className="w-16 text-right font-mono text-slate-500">{row.cap.toFixed(0)} mm</span>
                  </div>
                  <div className="flex-1 flex items-center gap-2 text-[10px]">
                    <Bar value={row.tel} max={1800} color="#8b5cf6"/>
                    <span className="w-16 text-right font-mono text-slate-500">{row.tel.toFixed(0)} mm</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── EXTREME EVENTS ── */}
      {tab === 'extreme' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center space-x-2">
              <Zap size={16} className="text-rose-500"/>
              <h2 className="font-bold text-sm text-slate-800 dark:text-slate-100">Top 10 Extreme Rainfall Events (1901–2015)</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/40 text-[10px] uppercase tracking-wider text-slate-400">
                    <th className="px-5 py-3 text-left">Rank</th>
                    <th className="px-5 py-3 text-left">Subdivision</th>
                    <th className="px-4 py-3 text-center">Year</th>
                    <th className="px-4 py-3 text-right">Annual Rainfall</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {EXTREME_YEARS.map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                      <td className="px-5 py-3.5 font-bold">{i+1}</td>
                      <td className="px-5 py-3.5 font-bold">{row.sub}</td>
                      <td className="px-4 py-3.5 text-center font-bold">{row.year}</td>
                      <td className="px-4 py-3.5 text-right font-black font-mono">{row.mm.toFixed(1)} mm</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Weather;
