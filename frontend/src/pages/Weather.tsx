import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  CloudRain, Wind, Droplets, Thermometer, AlertCircle, MapPin,
  Eye, TrendingUp, TrendingDown, BarChart3, Calendar, Activity,
  Zap, CloudLightning, CloudSnow, Sun, Waves
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
const MONTHLY_AVG_MM = {
  CAP: { JAN:7.5, FEB:12.9, MAR:13.2, APR:26.7, MAY:62.5, JUN:123.7, JUL:173.8, AUG:175.9, SEP:181.7, OCT:185.5, NOV:77.9, DEC:11.4 },
  TEL: { JAN:7.7, FEB:9.7,  MAR:12.6, APR:18.2, MAY:25.4, JUN:142.1, JUL:247.5, AUG:215.1, SEP:175.5, OCT:74.2,  NOV:20.3, DEC:5.1  },
};

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

const DECADE_MONSOON = [
  { decade:'1900s', cap:622.0, tel:715.5 },
  { decade:'1910s', cap:677.6, tel:710.3 },
  { decade:'1920s', cap:597.8, tel:685.5 },
  { decade:'1930s', cap:609.1, tel:816.0 },
  { decade:'1940s', cap:624.0, tel:760.9 },
  { decade:'1950s', cap:745.2, tel:874.8 },
  { decade:'1960s', cap:654.9, tel:797.8 },
  { decade:'1970s', cap:627.6, tel:752.5 },
  { decade:'1980s', cap:682.4, tel:918.1 },
  { decade:'1990s', cap:662.7, tel:768.7 },
  { decade:'2000s', cap:670.7, tel:750.5 },
  { decade:'2010s', cap:704.3, tel:822.1 },
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

const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
const MONSOON_MONTHS = ['JUN','JUL','AUG','SEP'];

// ─── LiveDot ──────────────────────────────────────────────────────────────────
const LiveDot = () => (
  <span className="flex items-center space-x-1">
    <span className="relative flex h-2 w-2">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
    </span>
    <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-500">Live Feed</span>
  </span>
);

// ─── Mini inline bar ──────────────────────────────────────────────────────────
const Bar = ({ value, max, color }: { value: number; max: number; color: string }) => (
  <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
    <div className="h-2 rounded-full transition-all" style={{ width:`${Math.max((value/max)*100,2)}%`, backgroundColor: color }} />
  </div>
);

// ─── Weather card ─────────────────────────────────────────────────────────────
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

// ─── Main Component ───────────────────────────────────────────────────────────
const Weather: React.FC = () => {
  const [tab, setTab] = useState<'weather' | 'rainfall' | 'extreme'>('weather');

  const { data, isLoading } = useQuery(['live-weather-feed'], async () => {
    const res = await api.get('/weather/live');
    return res.data;
  }, { refetchInterval: 5 * 60 * 1000 });

  const cities: CityWeather[] = data?.weather ?? [];
  const maxTemp    = cities.length ? Math.max(...cities.map(c => c.temp)) : 0;
  const avgTemp    = cities.length ? cities.reduce((s,c)=>s+c.temp,0)/cities.length : 0;
  const alertCount = cities.filter(c => c.temp>=35||c.windSpeed>=20||c.rainfall>0).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">Weather Warning Terminal</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Live climatic indicators, historical rainfall data and extreme event reports for Andhra Pradesh &amp; Telangana.
        </p>
      </div>

      {/* Tab nav */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-6 text-sm font-semibold">
        <Link to="/sos-requests" className="pb-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition">SOS Requests</Link>
        <Link to="/incidents"    className="pb-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition">Incidents Log</Link>
        {(['weather','rainfall','extreme'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`pb-3 transition ${tab===t ? 'border-b-2 border-blue-500 text-blue-500' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}>
            {t === 'weather' ? 'Weather Alerts' : t === 'rainfall' ? 'Rainfall Report' : 'Extreme Events'}
          </button>
        ))}
      </div>

      {/* ── WEATHER ALERTS ──────────────────────────────────────── */}
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

      {/* ── RAINFALL REPORT (annual + monsoon merged) ────────────── */}
      {tab === 'rainfall' && (
        <div className="space-y-6">
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label:'Coastal AP Mean',  value:'1,052.9 mm', icon:<CloudRain size={18}/>, color:'bg-blue-500/10 text-blue-500' },
              { label:'Telangana Mean',   value:'953.4 mm',   icon:<CloudRain size={18}/>, color:'bg-violet-500/10 text-violet-500' },
              { label:'Coastal AP Peak',  value:'1,712 mm',   icon:<TrendingUp size={18}/>, color:'bg-emerald-500/10 text-emerald-500' },
              { label:'Telangana Peak',   value:'1,544 mm',   icon:<TrendingUp size={18}/>, color:'bg-amber-500/10 text-amber-500' },
            ].map(k => (
              <div key={k.label} className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex items-center space-x-3">
                <div className={`p-3 rounded-xl ${k.color}`}>{k.icon}</div>
                <div><span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{k.label}</span>
                  <p className="text-base font-black text-slate-800 dark:text-slate-100 mt-0.5">{k.value}</p></div>
              </div>
            ))}
          </div>

          {/* Annual 2000-2015 */}
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
                  {(row.cap >= 1200 || row.tel >= 1200)
                    ? <span className="text-[9px] font-bold px-1.5 py-0.5 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded">EXTREME</span>
                    : (row.cap <= 750 || row.tel <= 750)
                    ? <span className="text-[9px] font-bold px-1.5 py-0.5 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded">DEFICIT</span>
                    : <span className="w-14"/>}
                </div>
              ))}
              <div className="flex items-center space-x-6 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center space-x-2 text-[10px] text-slate-400"><div className="w-3 h-3 rounded-sm bg-blue-500"/><span>Coastal AP</span></div>
                <div className="flex items-center space-x-2 text-[10px] text-slate-400"><div className="w-3 h-3 rounded-sm bg-violet-500"/><span>Telangana</span></div>
              </div>
            </div>
          </div>

          {/* Monthly averages */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center space-x-2">
                <Calendar size={16} className="text-blue-500"/>
                <h2 className="font-bold text-sm text-slate-800 dark:text-slate-100">Monthly Average (1901–2015, mm)</h2>
              </div>
              <div className="px-6 py-4 space-y-2">
                {MONTHS.map(m => {
                  const cap = MONTHLY_AVG_MM.CAP[m as keyof typeof MONTHLY_AVG_MM.CAP];
                  const tel = MONTHLY_AVG_MM.TEL[m as keyof typeof MONTHLY_AVG_MM.TEL];
                  const isMonsoon = MONSOON_MONTHS.includes(m);
                  return (
                    <div key={m} className={`flex items-center gap-3 py-1 px-2 rounded-lg ${isMonsoon ? 'bg-blue-500/5 dark:bg-blue-500/10' : ''}`}>
                      <span className={`text-[10px] font-bold w-7 ${isMonsoon ? 'text-blue-500' : 'text-slate-400'}`}>{m}</span>
                      {isMonsoon ? <Waves size={10} className="text-blue-400 shrink-0"/> : <span className="w-2.5"/>}
                      <div className="flex-1 flex items-center gap-2 text-[10px]">
                        <Bar value={cap} max={260} color="#3b82f6"/>
                        <span className="w-12 text-right font-mono text-slate-500">{cap}</span>
                      </div>
                      <div className="flex-1 flex items-center gap-2 text-[10px]">
                        <Bar value={tel} max={260} color="#8b5cf6"/>
                        <span className="w-12 text-right font-mono text-slate-500">{tel}</span>
                      </div>
                    </div>
                  );
                })}
                <div className="flex items-center space-x-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center space-x-2 text-[10px] text-slate-400"><div className="w-2.5 h-2.5 rounded-sm bg-blue-500"/><span>Coastal AP</span></div>
                  <div className="flex items-center space-x-2 text-[10px] text-slate-400"><div className="w-2.5 h-2.5 rounded-sm bg-violet-500"/><span>Telangana</span></div>
                  <div className="flex items-center space-x-2 text-[10px] text-slate-400"><Waves size={10} className="text-blue-400"/><span>Monsoon peak</span></div>
                </div>
              </div>
            </div>

            {/* Decade monsoon */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center space-x-2">
                <TrendingUp size={16} className="text-emerald-500"/>
                <h2 className="font-bold text-sm text-slate-800 dark:text-slate-100">Monsoon by Decade (Jun–Sep, mm)</h2>
              </div>
              <div className="px-6 py-4 space-y-2">
                {DECADE_MONSOON.map(row => (
                  <div key={row.decade} className="flex items-center gap-3">
                    <span className="text-[10px] font-bold text-slate-500 w-12">{row.decade}</span>
                    <div className="flex-1 flex items-center gap-2 text-[10px]">
                      <Bar value={row.cap} max={960} color="#3b82f6"/>
                      <span className="w-14 text-right font-mono text-slate-500">{row.cap.toFixed(0)}</span>
                    </div>
                    <div className="flex-1 flex items-center gap-2 text-[10px]">
                      <Bar value={row.tel} max={960} color="#8b5cf6"/>
                      <span className="w-14 text-right font-mono text-slate-500">{row.tel.toFixed(0)}</span>
                      {row.tel >= 900 && <span className="px-1 py-0.5 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded text-[8px] font-bold">HIGH</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── EXTREME EVENTS ──────────────────────────────────────── */}
      {tab === 'extreme' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label:'Record (Coastal AP)', value:'1,712.4 mm', sub:'Year 2010', color:'bg-rose-500/10 text-rose-500',   icon:<CloudLightning size={18}/> },
              { label:'Record (Telangana)',  value:'1,544.9 mm', sub:'Year 1988', color:'bg-amber-500/10 text-amber-500', icon:<CloudLightning size={18}/> },
              { label:'Lowest (Coastal AP)', value:'703.2 mm',   sub:'Year 2002', color:'bg-cyan-500/10 text-cyan-500',   icon:<CloudSnow size={18}/> },
              { label:'Lowest (Telangana)',  value:'437.0 mm',   sub:'All-time',  color:'bg-slate-500/10 text-slate-500', icon:<Sun size={18}/> },
            ].map(k => (
              <div key={k.label} className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex items-center space-x-3">
                <div className={`p-3 rounded-xl ${k.color}`}>{k.icon}</div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{k.label}</span>
                  <p className="text-base font-black text-slate-800 dark:text-slate-100 mt-0.5">{k.value}</p>
                  <p className="text-[9px] text-slate-400">{k.sub}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center space-x-2">
              <Zap size={16} className="text-rose-500"/>
              <h2 className="font-bold text-sm text-slate-800 dark:text-slate-100">Top 10 Extreme Rainfall Events (1901–2015)</h2>
              <span className="ml-auto text-[10px] text-slate-400">Threshold: ≥ 1,350 mm annual</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/40 text-[10px] uppercase tracking-wider text-slate-400">
                    <th className="px-5 py-3 text-left">Rank</th>
                    <th className="px-5 py-3 text-left">Subdivision</th>
                    <th className="px-4 py-3 text-center">Year</th>
                    <th className="px-4 py-3 text-right">Annual Rainfall</th>
                    <th className="px-4 py-3 text-right">vs. Mean</th>
                    <th className="px-4 py-3 text-left">Intensity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {EXTREME_YEARS.map((row, i) => {
                    const mean = row.sub === 'Coastal AP' ? 1052.9 : 953.4;
                    const pctAbove = (((row.mm - mean)/mean)*100).toFixed(0);
                    const barWidth = Math.min(100, ((row.mm-1300)/450)*100);
                    return (
                      <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                        <td className="px-5 py-3.5">
                          <span className={`w-6 h-6 inline-flex items-center justify-center rounded-full text-[10px] font-black
                            ${i===0 ? 'bg-rose-500 text-white' : i<3 ? 'bg-amber-500/20 text-amber-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                            {i+1}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border
                            ${row.sub === 'Coastal AP'
                              ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                              : 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20'}`}>
                            {row.sub}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center font-bold text-slate-700 dark:text-slate-200">{row.year}</td>
                        <td className="px-4 py-3.5 text-right font-black text-slate-800 dark:text-slate-100 font-mono">{row.mm.toFixed(1)} mm</td>
                        <td className="px-4 py-3.5 text-right"><span className="text-rose-500 font-bold text-[11px]">+{pctAbove}%</span></td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center space-x-2">
                            <div className="w-20 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div className="h-1.5 rounded-full bg-rose-500" style={{ width:`${barWidth}%`}}/>
                            </div>
                            <span className="text-[9px] font-bold text-rose-500 uppercase">
                              {row.mm>=1600 ? 'Catastrophic' : row.mm>=1450 ? 'Severe' : 'Extreme'}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
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
