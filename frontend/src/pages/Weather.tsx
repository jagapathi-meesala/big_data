import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { CloudRain, Wind, Droplets, Thermometer, AlertCircle, MapPin, Eye } from 'lucide-react';
import api from '../services/api';

export const Weather: React.FC = () => {
  const { data, isLoading } = useQuery(['live-weather-feed'], async () => {
    const res = await api.get('/weather/live');
    return res.data;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Weather Warning Terminal</h1>
        <p className="text-sm opacity-60">Live climatic indicators and extreme weather forecasts for Andhra Pradesh & Telangana.</p>
      </div>

      {/* Sub-navigation tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-6 text-sm font-semibold">
        <Link to="/sos-requests" className="pb-3 text-slate-400 hover:text-slate-650 dark:hover:text-slate-200 transition">
          SOS Requests
        </Link>
        <Link to="/incidents" className="pb-3 text-slate-400 hover:text-slate-650 dark:hover:text-slate-200 transition">
          Incidents Log
        </Link>
        <Link to="/weather" className="border-b-2 border-brand-500 pb-3 text-brand-500">
          Weather Alerts
        </Link>
      </div>

      {isLoading ? (
        <div className="text-center py-20 opacity-55 text-sm animate-pulse">Querying live weather feeds...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {data?.weather?.map((cityWeather: any) => (
            <div key={cityWeather.city} className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b dark:border-slate-800 pb-3">
                <div className="flex items-center space-x-2">
                  <MapPin size={16} className="text-brand-500" />
                  <span className="font-bold text-sm">{cityWeather.city}</span>
                </div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Live Feed</span>
              </div>

              <div className="flex items-center space-x-4">
                <CloudRain className="text-brand-500 w-12 h-12 shrink-0 animate-pulse" />
                <div>
                  <span className="text-3xl font-extrabold">{cityWeather.temp.toFixed(1)}°C</span>
                  <span className="text-[10px] block opacity-60 font-semibold">{cityWeather.alerts || 'No Warning Alerts'}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[10px] opacity-75">
                <div className="flex items-center space-x-1.5">
                  <Thermometer size={14} />
                  <span>Pressure: {cityWeather.pressure} hPa</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <Droplets size={14} />
                  <span>Humidity: {cityWeather.humidity}%</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <Wind size={14} />
                  <span>Wind: {cityWeather.windSpeed} m/s</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <Eye size={14} />
                  <span>Visibility: {cityWeather.visibility} m</span>
                </div>
              </div>

              {cityWeather.rainfall > 0 && (
                <div className="p-2.5 bg-brand-500/10 border border-brand-500/20 text-[10px] text-brand-400 rounded-lg flex items-center space-x-1.5">
                  <AlertCircle size={14} />
                  <span>Rainfall: {cityWeather.rainfall} mm registered.</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Weather;
