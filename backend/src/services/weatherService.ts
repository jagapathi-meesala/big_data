import axios from 'axios';
import logger from '../config/logger';
import { sequelize } from '../config/db';

const OPENWEATHER_API_URL = 'https://api.openweathermap.org/data/2.5/weather';
const OPENMETEO_API_URL = 'https://api.open-meteo.com/v1/forecast';

interface WeatherData {
  temp: number;
  humidity: number;
  rainfall: number;
  windSpeed: number;
  pressure: number;
  visibility: number;
  alerts: string;
}

export const fetchWeatherWithFailover = async (lat: number, lon: number): Promise<WeatherData> => {
  try {
    const apiKey = process.env.OPENWEATHER_API_KEY || 'MOCK_KEY';
    if (apiKey !== 'MOCK_KEY') {
      const response = await axios.get(OPENWEATHER_API_URL, {
        params: { lat, lon, appid: apiKey, units: 'metric' }
      });
      const data = response.data;
      return {
        temp: data.main?.temp || 20.0,
        humidity: data.main?.humidity || 60.0,
        rainfall: data.rain?.['1h'] || 0.0,
        windSpeed: data.wind?.speed || 5.0,
        pressure: data.main?.pressure || 1013.0,
        visibility: data.visibility || 10000.0,
        alerts: data.weather?.[0]?.description || 'Clear weather'
      };
    }
  } catch (error) {
    logger.error(`OpenWeather API failed: ${error}. Triggering failover to Open-Meteo...`);
  }

  try {
    const response = await axios.get(OPENMETEO_API_URL, {
      params: { latitude: lat, longitude: lon, current_weather: true }
    });
    const current = response.data?.current_weather;
    return {
      temp: current?.temperature || 21.0,
      humidity: 62.0,
      rainfall: 0.0,
      windSpeed: current?.windspeed || 4.5,
      pressure: 1012.0,
      visibility: 9500.0,
      alerts: 'Clear (Open-Meteo Failover)'
    };
  } catch (error) {
    logger.error(`Open-Meteo API failed: ${error}. Using static mock profiles.`);
    return {
      temp: 22.0,
      humidity: 65.0,
      rainfall: 0.0,
      windSpeed: 4.0,
      pressure: 1013.25,
      visibility: 10000.0,
      alerts: 'Clear (Local Fallback)'
    };
  }
};

export const saveWeatherHistory = async (lat: number, lon: number, data: WeatherData): Promise<void> => {
  try {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS weather_histories (
        id SERIAL PRIMARY KEY,
        latitude FLOAT NOT NULL,
        longitude FLOAT NOT NULL,
        temperature FLOAT,
        humidity FLOAT,
        rainfall FLOAT,
        wind_speed FLOAT,
        pressure FLOAT,
        visibility FLOAT,
        alerts TEXT,
        "createdAt" TIMESTAMP NOT NULL,
        "updatedAt" TIMESTAMP NOT NULL
      );
    `);

    await sequelize.query(`
      INSERT INTO weather_histories (latitude, longitude, temperature, humidity, rainfall, wind_speed, pressure, visibility, alerts, "createdAt", "updatedAt")
      VALUES (:lat, :lon, :temp, :humidity, :rainfall, :windSpeed, :pressure, :visibility, :alerts, NOW(), NOW());
    `, {
      replacements: {
        lat, lon,
        temp: data.temp,
        humidity: data.humidity,
        rainfall: data.rainfall,
        windSpeed: data.windSpeed,
        pressure: data.pressure,
        visibility: data.visibility,
        alerts: data.alerts
      }
    });
    logger.info(`Weather history persisted successfully for location: ${lat}, ${lon}`);
  } catch (error) {
    logger.error(`Error saving weather history: ${error}`);
  }
};
