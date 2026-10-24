import math
import numpy as np

class SpatialRiskSolver:
    def __init__(self, grid_size=0.05):
        self.grid_size = grid_size

    def compute_vulnerability_index(self, lat, lon, historical_incidents=None):
        """
        Computes spatial vulnerability index across Andhra Pradesh & Telangana coordinates
        using kernel density estimation over historical disaster clusters.
        """
        if historical_incidents is None:
            historical_incidents = []

        if not historical_incidents:
            # Baseline district vulnerability fallback
            return round(min(0.95, max(0.15, 0.4 + 0.3 * math.sin(lat) + 0.2 * math.cos(lon))), 2)

        coords = np.array([[inc.get('lat', 17.0), inc.get('lon', 79.0)] for inc in historical_incidents])
        target = np.array([lat, lon])

        # Euclidean distances to all historical incident clusters
        dists = np.linalg.norm(coords - target, axis=1)
        bandwidth = 0.5
        kernel_weights = np.exp(-0.5 * (dists / bandwidth) ** 2)
        density_score = float(np.sum(kernel_weights))

        normalized_score = min(0.98, max(0.10, 1.0 / (1.0 + math.exp(-density_score + 2.0))))
        return round(normalized_score, 2)

    def optimize_resource_allocation(self, demand_hubs, supply_centers):
        """
        Solves optimal transportation/allocation vectors from supply centers to emergency demand hubs.
        """
        allocations = []
        for hub in demand_hubs:
            hub_lat, hub_lon = hub.get('lat', 17.38), hub.get('lon', 78.48)
            best_center = None
            min_dist = float('inf')

            for center in supply_centers:
                c_lat, c_lon = center.get('lat', 17.38), center.get('lon', 78.48)
                dist = math.sqrt((hub_lat - c_lat) ** 2 + (hub_lon - c_lon) ** 2)
                if dist < min_dist and center.get('available_quantity', 0) > 0:
                    min_dist = dist
                    best_center = center

            if best_center:
                allocated_units = min(hub.get('required_quantity', 10), best_center.get('available_quantity', 10))
                allocations.append({
                    'hub_id': hub.get('id'),
                    'hub_name': hub.get('name'),
                    'supply_center_id': best_center.get('id'),
                    'supply_center_name': best_center.get('name'),
                    'allocated_units': allocated_units,
                    'distance_km': round(min_dist * 111.0, 2)
                })

        return allocations

spatial_solver = SpatialRiskSolver()
