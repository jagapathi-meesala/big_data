import axios from 'axios';
import logger from '../config/logger';

// 1. Weather & Rainfall API (Open-Meteo - Public API)
const OPENMETEO_API_URL = 'https://api.open-meteo.com/v1/forecast';
// 2. Road & Routing API (OSRM - Public API)
const OSRM_ROUTING_URL = 'http://router.project-osrm.org/route/v1/driving';
// 3. Population & Demographics API (World Bank Open Data - Public API)
const WORLDBANK_POP_URL = 'https://api.worldbank.org/v2/country/IND/indicator/SP.POP.TOTL';

export interface LiveWeatherData {
  temperature: number;
  humidity: number;
  precipitation: number; // mm
  rain: number; // mm
  windSpeed: number;
  surfacePressure: number;
  weatherCode: number;
  description: string;
}

export interface LiveRoadRouteData {
  distanceKm: number;
  durationMins: number;
  averageSpeedKmh: number;
  roadAccessibilityScore: number; // 0 to 1
  routabilityStatus: string;
}

export interface LivePopulationData {
  country: string;
  totalPopulation: number;
  dataYear: string;
  source: string;
}

export interface DistrictPublicApiSummary {
  district: string;
  coordinates: { lat: number; lon: number };
  weather: LiveWeatherData;
  roadRoute: LiveRoadRouteData;
  population: LivePopulationData;
  ddrpsSubScores: {
    Qd: number; // Risk (Rainfall/Weather)
    Dd: number; // Population Density
    Hd: number; // Healthcare Deficit
    Md: number; // Mobility/Road Deficit
    Vd: number; // Housing/Shelter Vulnerability
  };
}

/**
 * 1. Fetch Real Live Weather & Rainfall from Open-Meteo Public API
 */
export const fetchLiveWeatherAndRainfall = async (lat: number, lon: number): Promise<LiveWeatherData> => {
  try {
    const response = await axios.get(OPENMETEO_API_URL, {
      params: {
        latitude: lat,
        longitude: lon,
        current: 'temperature_2m,relative_humidity_2m,precipitation,rain,showers,wind_speed_10m,weather_code,surface_pressure',
        timezone: 'auto'
      },
      timeout: 5000
    });

    const current = response.data?.current || response.data?.current_weather || {};
    const precipitation = current.precipitation ?? current.rain ?? 0.0;
    const temp = current.temperature_2m ?? current.temperature ?? 28.0;
    const humidity = current.relative_humidity_2m ?? 65.0;
    const windSpeed = current.wind_speed_10m ?? current.windspeed ?? 10.0;
    const pressure = current.surface_pressure ?? 1012.0;
    const code = current.weather_code ?? current.weathercode ?? 0;

    let description = 'Clear Sky';
    if (code >= 51 && code <= 67) description = 'Rain / Drizzle';
    else if (code >= 80 && code <= 82) description = 'Heavy Rain Showers';
    else if (code >= 95) description = 'Thunderstorm';
    else if (temp >= 35) description = 'Heatwave Warning';

    return {
      temperature: temp,
      humidity,
      precipitation,
      rain: current.rain ?? precipitation,
      windSpeed,
      surfacePressure: pressure,
      weatherCode: code,
      description
    };
  } catch (err: any) {
    logger.warn(`[Public-APIs] Open-Meteo query failed for ${lat},${lon}: ${err.message}. Using fallback.`);
    return {
      temperature: 28.5,
      humidity: 62.0,
      precipitation: 0.0,
      rain: 0.0,
      windSpeed: 8.5,
      surfacePressure: 1012.0,
      weatherCode: 0,
      description: 'Clear (Fallback)'
    };
  }
};

/**
 * 2. Fetch Real Road Routing & Transport Accessibility from OSRM Public API
 */
export const fetchLiveRoadRouting = async (
  originLat: number, originLon: number,
  destLat: number, destLon: number
): Promise<LiveRoadRouteData> => {
  try {
    const url = `${OSRM_ROUTING_URL}/${originLon},${originLat};${destLon},${destLat}`;
    const response = await axios.get(url, {
      params: { overview: 'false' },
      timeout: 5000
    });

    if (response.data?.code === 'Ok' && response.data?.routes?.[0]) {
      const route = response.data.routes[0];
      const distanceKm = parseFloat((route.distance / 1000).toFixed(2));
      const durationMins = parseFloat((route.duration / 60).toFixed(2));
      const avgSpeed = durationMins > 0 ? parseFloat((distanceKm / (durationMins / 60)).toFixed(1)) : 40.0;

      // Higher speed and clear routability -> higher accessibility score
      const roadAccessibilityScore = Math.min(1.0, Math.max(0.1, avgSpeed / 80.0));

      return {
        distanceKm,
        durationMins,
        averageSpeedKmh: avgSpeed,
        roadAccessibilityScore: parseFloat(roadAccessibilityScore.toFixed(3)),
        routabilityStatus: 'Optimal Routability'
      };
    }
  } catch (err: any) {
    logger.warn(`[Public-APIs] OSRM Road API failed for route: ${err.message}. Using fallback estimate.`);
  }

  // Haversine fallback estimate
  const R = 6371;
  const dLat = (destLat - originLat) * (Math.PI / 180);
  const dLon = (destLon - originLon) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(originLat * Math.PI / 180) * Math.cos(destLat * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distKm = parseFloat((R * c * 1.3).toFixed(2));
  const durationMins = parseFloat((distKm / 45.0 * 60).toFixed(2));

  return {
    distanceKm: distKm,
    durationMins: durationMins,
    averageSpeedKmh: 45.0,
    roadAccessibilityScore: 0.56,
    routabilityStatus: 'Estimated (Haversine Fallback)'
  };
};

/**
 * 3. Fetch Live National Population Indicator from World Bank Public API
 */
export const fetchLiveWorldBankPopulation = async (): Promise<LivePopulationData> => {
  try {
    const response = await axios.get(WORLDBANK_POP_URL, {
      params: { format: 'json' },
      timeout: 5000
    });

    if (Array.isArray(response.data) && response.data[1]?.[0]) {
      const record = response.data[1][0];
      return {
        country: record.country?.value || 'India',
        totalPopulation: record.value || 1428627663,
        dataYear: record.date || '2025',
        source: 'World Bank Open Data API'
      };
    }
  } catch (err: any) {
    logger.warn(`[Public-APIs] World Bank Population API failed: ${err.message}. Using fallback.`);
  }

  return {
    country: 'India',
    totalPopulation: 1428627663,
    dataYear: '2025',
    source: 'World Bank Open Data (Fallback)'
  };
};

/**
 * 4. Aggregate Multi-Source Public API Data for a District
 */
export const getDistrictPublicApiSummary = async (
  district: string,
  lat: number,
  lon: number,
  hospitalLat: number = 17.3850,
  hospitalLon: number = 78.4867
): Promise<DistrictPublicApiSummary> => {
  const [weather, roadRoute, population] = await Promise.all([
    fetchLiveWeatherAndRainfall(lat, lon),
    fetchLiveRoadRouting(lat, lon, hospitalLat, hospitalLon),
    fetchLiveWorldBankPopulation()
  ]);

  // Compute live sub-scores for DDRPS formula:
  // DDRPS = 0.5757*Dd + 0.3951*Vd + 0.0097*(Qd + Hd + Md)
  const Qd = Math.min(1.0, Math.max(0.05, (weather.precipitation * 10 + weather.temperature / 40.0) / 2.0));
  const Dd = 0.65; // District density indicator
  const Hd = 0.45; // Healthcare deficit
  const Md = parseFloat((1.0 - roadRoute.roadAccessibilityScore).toFixed(3)); // Mobility deficit derived from OSRM road speed
  const Vd = 0.50; // Housing vulnerability

  return {
    district,
    coordinates: { lat, lon },
    weather,
    roadRoute,
    population,
    ddrpsSubScores: { Qd, Dd, Hd, Md, Vd }
  };
};
