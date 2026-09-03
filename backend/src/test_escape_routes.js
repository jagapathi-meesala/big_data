const axios = require('axios');

function calculateHaversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return parseFloat((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(2));
}

async function computeEmergencyEscapeRoutes(originLat, originLon, destLat, destLon, targetName = 'Apollo ER Hospital') {
  // 1. Query OSRM Primary & Alternative Routes
  let osrmRoutes = [];
  try {
    const osrmUrl = `http://router.project-osrm.org/route/v1/driving/${originLon},${originLat};${destLon},${destLat}`;
    const res = await axios.get(osrmUrl, {
      params: {
        alternatives: 'true',
        steps: 'true',
        geometries: 'geojson',
        overview: 'full'
      },
      timeout: 5000
    });

    if (res.data?.code === 'Ok' && res.data?.routes) {
      osrmRoutes = res.data.routes;
    }
  } catch (err) {
    console.warn('OSRM request error:', err.message);
  }

  // Generate 3 candidate routes (A, B, C) if OSRM returns fewer than 3
  const candidates = [];
  const routeNames = ['Route A (Express Corridor)', 'Route B (Arterial Bypass)', 'Route C (Perimeter Route)'];

  for (let i = 0; i < 3; i++) {
    let routeData = osrmRoutes[i];
    let distanceKm, durationMins, polyline = [], steps = [];

    if (routeData) {
      distanceKm = parseFloat((routeData.distance / 1000).toFixed(2));
      durationMins = parseFloat((routeData.duration / 60).toFixed(1));
      polyline = routeData.geometry.coordinates.map(([lon, lat]) => [lat, lon]);
      steps = routeData.legs[0]?.steps?.map(s => s.maneuver?.instruction || s.name).filter(Boolean) || [];
    } else {
      // Create synthetic detour variant if OSRM alternative is absent
      const factor = 1.0 + (i * 0.14);
      const baseDist = calculateHaversineKm(originLat, originLon, destLat, destLon) * 1.2;
      distanceKm = parseFloat((baseDist * factor).toFixed(2));
      durationMins = parseFloat((distanceKm / 32 * 60).toFixed(1));
      
      const midLat = (originLat + destLat) / 2 + (i * 0.015);
      const midLon = (originLon + destLon) / 2 - (i * 0.012);
      polyline = [[originLat, originLon], [midLat, midLon], [destLat, destLon]];
      steps = [`Head towards ${targetName} via Bypass ${i+1}`, `Turn onto Regional Corridor`, `Arrive at ${targetName}`];
    }

    // 2. BDA Risk Analysis
    // Simulated weather/road risk factors (e.g. Route A has high risk due to flooded underpass)
    const baseWeatherRisk = i === 0 ? 68 : (i === 1 ? 18 : 35);
    const roadRiskScore = Math.min(95, Math.max(10, baseWeatherRisk));

    // 3. Composite Route Score Calculation
    // Route Score = (0.35 * NormalizedDistance) + (0.35 * NormalizedTime) + (0.30 * RoadRiskScore)
    const compScore = parseFloat((0.35 * distanceKm + 0.35 * durationMins + 0.30 * roadRiskScore).toFixed(1));

    candidates.push({
      id: `route-${i + 1}`,
      name: routeNames[i],
      distanceKm,
      durationMins,
      roadRiskScore,
      compositeScore: compScore,
      polyline,
      steps: steps.slice(0, 5),
      riskCategory: roadRiskScore > 50 ? 'HIGH' : (roadRiskScore > 25 ? 'MEDIUM' : 'LOW')
    });
  }

  // 4. Rank candidates by Composite Score (lowest score is best route)
  candidates.sort((a, b) => a.compositeScore - b.compositeScore);

  candidates[0].recommendation = 'BEST_RECOMMENDED';
  candidates[0].badge = '✅ Best Recommended Route';
  candidates[0].color = '#10b981'; // Emerald

  candidates[1].recommendation = 'CAUTION';
  candidates[1].badge = '⚠️ Caution Route';
  candidates[1].color = '#f59e0b'; // Amber

  candidates[2].recommendation = 'HIGH_HAZARD';
  candidates[2].badge = '❌ High Hazard Route';
  candidates[2].color = '#ef4444'; // Red

  return {
    origin: { lat: originLat, lon: originLon },
    destination: { lat: destLat, lon: destLon, name: targetName },
    routes: candidates
  };
}

computeEmergencyEscapeRoutes(17.3850, 78.4867, 17.9689, 79.5941, 'Warangal General Hospital').then(res => {
  console.log('=== BDA EMERGENCY ESCAPE ROUTE RECOMMENDATION MATRIX ===');
  res.routes.forEach(r => {
    console.log(`\n${r.badge} (${r.name})`);
    console.log(` Distance: ${r.distanceKm} km | Time: ${r.durationMins} mins | Road Risk: ${r.roadRiskScore}/100 | Composite Score: ${r.compositeScore}`);
  });
});
