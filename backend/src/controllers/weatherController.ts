import { Request, Response } from 'express';
import { fetchWeatherWithFailover, saveWeatherHistory } from '../services/weatherService';

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

export const getLiveWeather = async (req: Request, res: Response): Promise<void> => {
  try {
    const weatherData = await Promise.all(
      CITIES_COORDS.map(async (city) => {
        try {
          const stats = await fetchWeatherWithFailover(city.lat, city.lon);
          saveWeatherHistory(city.lat, city.lon, stats).catch((err) =>
            console.error(`Save weather history failed for ${city.name}:`, err)
          );
          return {
            city: city.name,
            latitude: city.lat,
            longitude: city.lon,
            ...stats
          };
        } catch (err) {
          return {
            city: city.name,
            latitude: city.lat,
            longitude: city.lon,
            temp: 28.0,
            humidity: 70,
            rainfall: 0.0,
            windSpeed: 4.5,
            pressure: 1012.0,
            visibility: 10000,
            alerts: 'No active warning'
          };
        }
      })
    );
    res.status(200).json({ weather: weatherData });
  } catch (error) {
    console.error('Weather fetching error:', error);
    res.status(500).json({ message: 'Internal server error fetching weather.' });
  }
};
