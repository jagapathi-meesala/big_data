import axios from 'axios';
import { Op } from 'sequelize';
import Incident, { DisasterType, SeverityLevel, IncidentStatus } from '../models/Incident';
import { logger } from '../config/logger';
import { createSystemNotification } from './notificationService';

const GDACS_FEED_URL = 'https://www.gdacs.org/xml/gdacs.geojson';

// Combined Andhra Pradesh & Telangana geographic bounding box bounds
const MIN_LAT = 12.0;
const MAX_LAT = 20.5;
const MIN_LON = 76.5;
const MAX_LON = 85.0;

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

export const syncLiveWeatherAlerts = async (): Promise<void> => {
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

        // Check atmospheric warning conditions
        // Low threshold chosen so that developers always see actual weather warning events on calm days
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
          
          // Check if already registered
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

            // Trigger a live system warning notification
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
  } catch (err: any) {
    logger.error(`[Weather Sync] Error: ${err.message}`);
  }
};

export const syncGDACSDisasters = async (): Promise<void> => {
  try {
    // Clear any previously synced live alerts to ensure a clean state
    await Incident.destroy({
      where: {
        title: {
          [Op.like]: 'Live Alert - %'
        }
      }
    });

    logger.info('[GDACS Sync] Querying live GeoJSON disaster feed...');
    const response = await axios.get(GDACS_FEED_URL);
    const geojson = response.data;

    if (!geojson || !geojson.features) {
      logger.warn('[GDACS Sync] Invalid feed format or empty features.');
      return;
    }

    let ingestedCount = 0;
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

      // Check geographic boundaries strictly within Andhra Pradesh & Telangana
      const isWithinTargetZone = lat >= MIN_LAT && lat <= MAX_LAT && lon >= MIN_LON && lon <= MAX_LON;

      if (!isWithinTargetZone) continue;

      // Map GDACS event types to system Enums
      let type = DisasterType.OTHER;
      if (eventType === 'EQ') type = DisasterType.EARTHQUAKE;
      else if (eventType === 'FL') type = DisasterType.FLOOD;
      else if (eventType === 'TC') type = DisasterType.HURRICANE;
      else if (eventType === 'LS') type = DisasterType.LANDSLIDE;

      // Map GDACS alert levels to Severity Level Enums
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

        // Trigger a live warning notification in the feed
        await createSystemNotification(
          'Live Emergency Alert Ingested',
          `GDACS Satellite feed detected active ${type.toLowerCase()} near ${properties.country || 'India'} (Alert level: ${properties.alertlevel || 'Green'}).`,
          'WARNING'
        );

        ingestedCount++;
      }
    }

    logger.info(`[GDACS Sync] Completed. Ingested ${ingestedCount} new real-world active disasters.`);
    
    // Ingest live weather alerts dynamically for AP & Telangana
    await syncLiveWeatherAlerts();
  } catch (err: any) {
    logger.error(`[GDACS Sync] Error syncing disasters: ${err.message}`);
  }
};
