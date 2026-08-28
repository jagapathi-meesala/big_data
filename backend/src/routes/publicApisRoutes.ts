import { Router, Request, Response } from 'express';
import {
  fetchLiveWeatherAndRainfall,
  fetchLiveRoadRouting,
  fetchLiveWorldBankPopulation,
  getDistrictPublicApiSummary
} from '../services/publicApisService';
import logger from '../config/logger';

const router = Router();

const AP_TELANGANA_CITIES: Record<string, { lat: number; lon: number }> = {
  Hyderabad: { lat: 17.3850, lon: 78.4867 },
  Warangal: { lat: 17.9689, lon: 79.5941 },
  Vijayawada: { lat: 16.5062, lon: 80.6480 },
  Visakhapatnam: { lat: 17.6868, lon: 83.2185 },
  Karimnagar: { lat: 18.4386, lon: 79.1288 },
  Nalgonda: { lat: 17.0575, lon: 79.2684 },
  Khammam: { lat: 17.2473, lon: 80.1514 },
  Nizamabad: { lat: 18.6725, lon: 78.0941 },
  Guntur: { lat: 16.3067, lon: 80.4365 },
  Tirupati: { lat: 13.6284, lon: 79.4192 },
  Kurnool: { lat: 15.8281, lon: 78.0373 }
};

/**
 * GET /api/v1/public-apis/weather
 * Returns live rainfall & weather parameters from Open-Meteo API
 */
router.get('/weather', async (req: Request, res: Response) => {
  try {
    const lat = parseFloat(req.query.lat as string) || 17.3850;
    const lon = parseFloat(req.query.lon as string) || 78.4867;
    const data = await fetchLiveWeatherAndRainfall(lat, lon);
    return res.json({
      success: true,
      api: 'Open-Meteo Weather & Rainfall API',
      coordinates: { lat, lon },
      data
    });
  } catch (error: any) {
    logger.error(`Error in /public-apis/weather: ${error.message}`);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/v1/public-apis/roads
 * Returns live road routing & transport accessibility from OSRM API
 */
router.get('/roads', async (req: Request, res: Response) => {
  try {
    const originLat = parseFloat(req.query.originLat as string) || 17.3850;
    const originLon = parseFloat(req.query.originLon as string) || 78.4867;
    const destLat = parseFloat(req.query.destLat as string) || 17.9689;
    const destLon = parseFloat(req.query.destLon as string) || 79.5941;

    const data = await fetchLiveRoadRouting(originLat, originLon, destLat, destLon);
    return res.json({
      success: true,
      api: 'OSRM (Open Source Routing Machine) Road API',
      route: { origin: { lat: originLat, lon: originLon }, destination: { lat: destLat, lon: destLon } },
      data
    });
  } catch (error: any) {
    logger.error(`Error in /public-apis/roads: ${error.message}`);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/v1/public-apis/population
 * Returns national & regional population indicator from World Bank API
 */
router.get('/population', async (req: Request, res: Response) => {
  try {
    const data = await fetchLiveWorldBankPopulation();
    return res.json({
      success: true,
      api: 'World Bank Open Data Population API',
      data
    });
  } catch (error: any) {
    logger.error(`Error in /public-apis/population: ${error.message}`);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/v1/public-apis/summary
 * Returns multi-source public API fusion (Weather, Roads, Population, DDRPS) for all key districts
 */
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const districtName = (req.query.district as string) || 'Hyderabad';
    const coords = AP_TELANGANA_CITIES[districtName] || AP_TELANGANA_CITIES['Hyderabad'];

    const summary = await getDistrictPublicApiSummary(districtName, coords.lat, coords.lon);

    return res.json({
      success: true,
      message: 'Multi-Source Public API Fusion Summary',
      districtSummary: summary
    });
  } catch (error: any) {
    logger.error(`Error in /public-apis/summary: ${error.message}`);
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
