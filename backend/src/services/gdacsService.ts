import axios from 'axios';
import Incident, { DisasterType, SeverityLevel, IncidentStatus } from '../models/Incident';
import { logger } from '../config/logger';
import { createSystemNotification } from './notificationService';

const GDACS_FEED_URL = 'https://www.gdacs.org/xml/gdacs.geojson';
const USGS_QUAKE_URL = 'https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&minmagnitude=2.5&limit=25';
const NASA_EONET_URL = 'https://eonet.gsfc.nasa.gov/api/v2.1/events?limit=25';

const CITIES_COORDS = [
  { name: 'Hyderabad', lat: 17.3850, lon: 78.4867 },
  { name: 'Warangal', lat: 17.9689, lon: 79.5941 },
  { name: 'Khammam', lat: 17.2473, lon: 80.1514 },
  { name: 'Karimnagar', lat: 18.4386, lon: 79.1288 },
  { name: 'Nizamabad', lat: 18.6725, lon: 78.0941 },
  { name: 'Vijayawada', lat: 16.5062, lon: 80.6480 },
  { name: 'Visakhapatnam', lat: 17.6868, lon: 83.2185 },
  { name: 'Guntur', lat: 16.3067, lon: 80.4365 },
  { name: 'Tirupati', lat: 13.6284, lon: 79.4192 },
  { name: 'Nellore', lat: 14.4426, lon: 79.9865 },
  { name: 'Kurnool', lat: 15.8281, lon: 78.0373 },
  { name: 'Anantapur', lat: 14.6819, lon: 77.6006 },
  { name: 'Kakinada', lat: 16.9890, lon: 82.2475 },
  { name: 'Nalgonda', lat: 17.0575, lon: 79.2684 },
  { name: 'Mahabubnagar', lat: 16.7333, lon: 77.9833 },
  { name: 'Eluru', lat: 16.7104, lon: 81.1035 },
  { name: 'Adilabad', lat: 19.6641, lon: 78.5320 },
  { name: 'Kadapa', lat: 14.4673, lon: 78.8242 },
  { name: 'Rajahmundry', lat: 16.9891, lon: 81.7835 },
  { name: 'Suryapet', lat: 17.1500, lon: 79.6200 },
  { name: 'Ongole', lat: 15.5057, lon: 80.0499 },
  { name: 'Srikakulam', lat: 18.2949, lon: 83.8938 },
  { name: 'Vizianagaram', lat: 18.1124, lon: 83.3956 },
  { name: 'Siddipet', lat: 18.1018, lon: 78.8520 },
  { name: 'Sangareddy', lat: 17.6167, lon: 78.0833 },
  { name: 'Bhadrachalam', lat: 17.6700, lon: 80.8900 }
];

export const syncUSGSQuakes = async (): Promise<number> => {
  try {
    logger.info('[USGS Sync] Querying live seismic earthquake feed...');
    const response = await axios.get(USGS_QUAKE_URL, { timeout: 5000 });
    const features = response.data?.features || [];
    let count = 0;

    for (const feat of features) {
      const coords = feat.geometry?.coordinates;
      if (!coords || coords.length < 2) continue;
      const lon = coords[0];
      const lat = coords[1];
      const mag = feat.properties?.mag || 3.0;
      const place = feat.properties?.place || 'Seismic Zone';
      const title = `Live Alert - Earthquake M${mag} (${place})`;

      const existing = await Incident.findOne({ where: { title } });
      if (!existing) {
        let severity = SeverityLevel.MEDIUM;
        if (mag >= 6.0) severity = SeverityLevel.CRITICAL;
        else if (mag >= 4.5) severity = SeverityLevel.HIGH;

        await Incident.create({
          title,
          description: `Real-time USGS seismic event recorded with magnitude ${mag} at ${place}. Depth: ${coords[2] || 10}km.`,
          severity,
          status: IncidentStatus.REPORTED,
          disasterType: DisasterType.EARTHQUAKE,
          geom: { type: 'Point', coordinates: [lon, lat] },
          district: place.split(',')[1]?.trim() || place,
          state: place.split(',')[1]?.trim() || 'Global Alert Zone',
          estimatedDamage: Math.round(mag * 100000)
        });
        count++;
      }
    }
    logger.info(`[USGS Sync] Completed. Ingested ${count} new seismic incidents.`);
    return count;
  } catch (err: any) {
    logger.warn(`[USGS Sync] Failed: ${err.message}`);
    return 0;
  }
};

export const syncEONETEvents = async (): Promise<number> => {
  try {
    logger.info('[NASA EONET Sync] Querying live NASA satellite event tracker...');
    const response = await axios.get(NASA_EONET_URL, { timeout: 5000 });
    const events = response.data?.events || [];
    let count = 0;

    for (const evt of events) {
      const geo = evt.geometries?.[0];
      if (!geo || !geo.coordinates) continue;
      const coords = geo.coordinates;
      const lon = Array.isArray(coords[0]) ? coords[0][0] : coords[0];
      const lat = Array.isArray(coords[0]) ? coords[0][1] : coords[1];
      const eventName = evt.title || 'NASA Tracked Event';
      const categoryName = evt.categories?.[0]?.title || 'Natural Event';

      let type = DisasterType.OTHER;
      if (categoryName.toLowerCase().includes('wildfire') || categoryName.toLowerCase().includes('fire')) type = DisasterType.FIRE;
      else if (categoryName.toLowerCase().includes('storm')) type = DisasterType.HURRICANE;
      else if (categoryName.toLowerCase().includes('flood')) type = DisasterType.FLOOD;

      const title = `Live Alert - ${eventName}`;
      const existing = await Incident.findOne({ where: { title } });

      if (!existing) {
        await Incident.create({
          title,
          description: `NASA EONET Satellite feed detected live ${categoryName.toLowerCase()} titled "${eventName}". Tracking coordinates: ${lat}, ${lon}.`,
          severity: SeverityLevel.HIGH,
          status: IncidentStatus.REPORTED,
          disasterType: type,
          geom: { type: 'Point', coordinates: [lon, lat] },
          district: categoryName,
          state: 'Global Satellite Watch',
          estimatedDamage: 250000
        });
        count++;
      }
    }
    logger.info(`[NASA EONET Sync] Completed. Ingested ${count} new satellite event incidents.`);
    return count;
  } catch (err: any) {
    logger.warn(`[NASA EONET Sync] Failed: ${err.message}`);
    return 0;
  }
};

export const syncLiveWeatherAlerts = async (): Promise<number> => {
  try {
    logger.info('[Weather Sync] Querying live Open-Meteo weather parameters for AP & Telangana...');
    let weatherAlertsCount = 0;

    for (const city of CITIES_COORDS) {
      try {
        const response = await axios.get('https://api.open-meteo.com/v1/forecast', {
          params: {
            latitude: city.lat,
            longitude: city.lon,
            current_weather: true
          },
          timeout: 4000
        });

        const current = response.data?.current_weather;
        if (!current) continue;

        const temp = current.temperature;
        const windspeed = current.windspeed;
        const weathercode = current.weathercode;

        let hasAlert = false;
        let alertMsg = '';
        let type = DisasterType.OTHER;
        let severity = SeverityLevel.MEDIUM;

        if (temp >= 32.0) {
          hasAlert = true;
          alertMsg = `High heat alert: Temperature recorded at ${temp}°C in real-time by Open-Meteo sensors.`;
          severity = temp >= 40.0 ? SeverityLevel.CRITICAL : SeverityLevel.HIGH;
        } else if (temp <= 15.0) {
          hasAlert = true;
          alertMsg = `Cold alert: Temperature recorded at cold levels of ${temp}°C.`;
          severity = SeverityLevel.MEDIUM;
        }

        if (windspeed >= 18.0) {
          hasAlert = true;
          alertMsg += ` Strong wind gusts of ${windspeed} km/h detected.`;
          severity = SeverityLevel.HIGH;
        }

        const rainCodes = [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99];
        if (rainCodes.includes(weathercode)) {
          hasAlert = true;
          alertMsg += ` Active rainfall or storm shower detected (code ${weathercode}).`;
          type = DisasterType.FLOOD;
          severity = SeverityLevel.HIGH;
        }

        if (hasAlert) {
          const title = `Live Alert - Weather Warning (${city.name})`;
          
          const existing = await Incident.findOne({ where: { title } });

          if (!existing) {
            await Incident.create({
              title,
              description: alertMsg,
              severity,
              status: IncidentStatus.REPORTED,
              disasterType: type,
              geom: {
                type: 'Point',
                coordinates: [city.lon, city.lat]
              },
              district: city.name,
              state: ['Hyderabad', 'Warangal', 'Khammam', 'Karimnagar', 'Nizamabad', 'Nalgonda', 'Mahabubnagar', 'Siddipet', 'Sangareddy', 'Suryapet', 'Bhadrachalam'].includes(city.name) ? 'Telangana' : 'Andhra Pradesh',
              estimatedDamage: parseFloat((windspeed / 10).toFixed(1)) || 0.0
            });

            await createSystemNotification(
              'Live Weather Warning Issued',
              `Extreme weather detected in ${city.name}: Temp ${temp}°C, Wind ${windspeed} km/h.`,
              'WARNING'
            );

            weatherAlertsCount++;
          }
        }
      } catch (err: any) {
        logger.warn(`[Weather Sync] Failed fetching live weather for ${city.name}: ${err.message}`);
      }
    }

    logger.info(`[Weather Sync] Completed. Ingested ${weatherAlertsCount} new real-time weather incidents.`);
    return weatherAlertsCount;
  } catch (err: any) {
    logger.error(`[Weather Sync] Error: ${err.message}`);
    return 0;
  }
};

export const syncGDACSDisasters = async (): Promise<number> => {
  try {
    logger.info('[Live Disasters Sync] Querying live feeds (GDACS, USGS, NASA EONET, Open-Meteo)...');
    
    await syncUSGSQuakes();
    await syncEONETEvents();

    const response = await axios.get(GDACS_FEED_URL, { timeout: 6000 });
    const geojson = response.data;

    let ingestedCount = 0;
    if (geojson && geojson.features) {
      const features = geojson.features;

      for (const feature of features) {
        const coords = feature.geometry?.coordinates;
        if (!coords || coords.length < 2) continue;

        const lon = coords[0];
        const lat = coords[1];

        const properties = feature.properties || {};
        const eventName = properties.eventname || 'Unnamed Incident';
        const eventType = properties.eventtype || 'OTHER';
        const alertLevel = (properties.alertlevel || 'green').toLowerCase();

        let type = DisasterType.OTHER;
        if (eventType === 'EQ') type = DisasterType.EARTHQUAKE;
        else if (eventType === 'FL') type = DisasterType.FLOOD;
        else if (eventType === 'TC') type = DisasterType.HURRICANE;
        else if (eventType === 'LS') type = DisasterType.LANDSLIDE;

        let severity = SeverityLevel.LOW;
        if (alertLevel === 'red') severity = SeverityLevel.CRITICAL;
        else if (alertLevel === 'orange') severity = SeverityLevel.HIGH;
        else if (alertLevel === 'green') severity = SeverityLevel.MEDIUM;

        const title = `Live Alert - ${eventName}`;

        const existing = await Incident.findOne({
          where: { title }
        });

        if (!existing) {
          await Incident.create({
            title,
            description: properties.description || `Real-time disaster alert for ${eventName} updated dynamically by GDACS. Alert level: ${properties.alertlevel || 'Green'}.`,
            severity,
            status: IncidentStatus.REPORTED,
            disasterType: type,
            geom: {
              type: 'Point',
              coordinates: [lon, lat]
            },
            district: properties.country || 'Disaster Control Zone',
            state: properties.country || 'India',
            estimatedDamage: parseFloat(properties.severity || '0.0') || 0.0
          });

          await createSystemNotification(
            'Live Emergency Alert Ingested',
            `GDACS Satellite feed detected active ${type.toLowerCase()} near ${properties.country || 'India'} (Alert level: ${properties.alertlevel || 'Green'}).`,
            'WARNING'
          );

          ingestedCount++;
        }
      }
    }

    const weatherCount = await syncLiveWeatherAlerts();
    return ingestedCount + weatherCount;
  } catch (err: any) {
    logger.error(`[GDACS Sync] Error syncing disasters: ${err.message}`);
    return 0;
  }
};
