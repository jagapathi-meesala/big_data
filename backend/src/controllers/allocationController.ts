import { Response } from 'express';
import { Op } from 'sequelize';
import { sequelize } from '../config/db';
import Allocation from '../models/Allocation';
import Incident from '../models/Incident';
import Resource, { ResourceStatus } from '../models/Resource';
import { AuthenticatedRequest } from '../middlewares/auth';
import logger from '../config/logger';
import axios from 'axios';

async function getRoadRoute(startCoords: [number, number], endCoords: [number, number]): Promise<any> {
  try {
    const url = `http://router.project-osrm.org/route/v1/driving/${startCoords[0]},${startCoords[1]};${endCoords[0]},${endCoords[1]}?overview=full&geometries=geojson`;
    const response = await axios.get(url, { timeout: 4000 });
    const route = response.data?.routes?.[0]?.geometry;
    if (route && route.coordinates && route.coordinates.length > 0) {
      return route;
    }
  } catch (err: any) {
    logger.warn(`OSRM road routing failed: ${err.message}. Using straight-line fallback.`);
  }
  return {
    type: 'LineString',
    coordinates: [startCoords, endCoords],
  };
}

export const optimizeAllocation = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { incidentId } = req.body;

    const optimizeSingle = async (incident: Incident) => {
      const geom = incident.geom || (incident as any).geom || (incident as any).dataValues?.geom || incident.getDataValue('geom');
      if (!geom || !geom.coordinates) {
        throw new Error(`Incident geometry coordinates are missing. geom: ${JSON.stringify(geom)}`);
      }
      const incidentCoords = geom.coordinates;

      const closestResource = await Resource.findOne({
        where: {
          status: ResourceStatus.AVAILABLE,
          quantity: { [Op.gt]: 0 },
        },
        order: sequelize.literal(
          `geom <-> ST_SetSRID(ST_MakePoint(${incidentCoords[0]}, ${incidentCoords[1]}), 4326)`
        ),
      });

      if (!closestResource) {
        return null;
      }

      const resGeom = closestResource.geom || (closestResource as any).geom || (closestResource as any).dataValues?.geom || closestResource.getDataValue('geom');
      if (!resGeom || !resGeom.coordinates) {
        throw new Error(`Resource geometry coordinates are missing. geom: ${JSON.stringify(resGeom)}`);
      }
      const resourceCoords = resGeom.coordinates;

      const routeLineString = await getRoadRoute(resourceCoords, incidentCoords);

      closestResource.status = ResourceStatus.IN_TRANSIT;
      await closestResource.save();

      const incId = incident.id || (incident as any).id || (incident as any).dataValues?.id || incident.getDataValue('id');
      const resId = closestResource.id || (closestResource as any).id || (closestResource as any).dataValues?.id || closestResource.getDataValue('id');

      const allocation = await Allocation.create({
        incidentId: incId,
        incident_id: incId,
        resourceId: resId,
        resource_id: resId,
        quantityAllocated: 1,
        optimizedRouteGeom: routeLineString,
        status: 'ACTIVE',
      });

      const resourceName = closestResource.name || closestResource.getDataValue('name') || closestResource.type || closestResource.getDataValue('type');
      const incidentTitle = incident.title || incident.getDataValue('title');
      await sequelize.query(`
        INSERT INTO system_notifications (title, message, type, "createdAt", "updatedAt")
        VALUES (:title, :message, 'SUCCESS', NOW(), NOW());
      `, {
        replacements: {
          title: 'Resource Dispatched',
          message: `Resource '${resourceName}' allocated & routed to incident '${incidentTitle}'.`
        }
      });

      return {
        allocation,
        allocatedResource: {
          id: resId,
          type: closestResource.type || closestResource.getDataValue('type'),
          coordinates: resourceCoords,
        }
      };
    };

    if (incidentId && incidentId !== 'all') {
      const incident = await Incident.findByPk(incidentId);
      if (!incident) {
        res.status(404).json({ message: 'Incident not found.' });
        return;
      }

      const result = await optimizeSingle(incident);
      if (!result) {
        res.status(404).json({ message: 'No available resources found for allocation.' });
        return;
      }

      res.status(201).json({
        message: 'Resource allocated and optimized route generated.',
        allocation: result.allocation,
        allocatedResource: result.allocatedResource,
      });
    } else {
      const activeAllocations = await Allocation.findAll({ where: { status: 'ACTIVE' } });
      const activeIncidentIds = new Set(
        activeAllocations.map(a => a.incidentId || (a as any).incident_id || (a as any).incidentId || a.getDataValue('incidentId') || a.getDataValue('incident_id'))
      );

      const allIncidents = await Incident.findAll();
      const unallocatedIncidents = allIncidents.filter(
        inc => !activeIncidentIds.has(inc.id)
      );

      if (unallocatedIncidents.length === 0) {
        res.status(200).json({ message: 'All incidents are already allocated.', allocations: [] });
        return;
      }

      const results: any[] = [];
      for (const incident of unallocatedIncidents) {
        try {
          const resOpt = await optimizeSingle(incident);
          if (resOpt) {
            results.push(resOpt);
          }
        } catch (singleErr) {
          logger.error(`Error optimizing bulk incident ${incident.id}: ${singleErr}`);
        }
      }

      res.status(201).json({
        message: `Successfully allocated resources for ${results.length} incidents.`,
        allocations: results.map(r => r.allocation),
      });
    }
  } catch (error: any) {
    logger.error(`Optimize allocation error: ${error.stack || error}`);
    res.status(500).json({ message: 'Internal server error executing allocation optimizer.' });
  }
};

export const getActiveAllocations = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const allocations = await Allocation.findAll({
      where: { status: 'ACTIVE' },
      include: [
        { model: Incident, as: 'Incident' },
        { model: Resource, as: 'Resource' },
      ],
      order: [['createdAt', 'DESC']],
    });

    res.status(200).json(allocations);
  } catch (error) {
    console.error('Get allocations error:', error);
    res.status(500).json({ message: 'Internal server error fetching allocations.' });
  }
};

export const updateAllocation = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, quantityAllocated, routeCoordinates } = req.body;

    const allocation = await Allocation.findByPk(id);
    if (!allocation) {
      res.status(404).json({ message: 'Allocation not found.' });
      return;
    }

    if (status) {
      allocation.status = status;
      (allocation as any).status = status;
      allocation.setDataValue('status', status);

      if (status === 'COMPLETED' || status === 'CANCELLED') {
        const resId = allocation.resourceId || (allocation as any).resource_id || allocation.getDataValue('resourceId') || allocation.getDataValue('resource_id');
        const resource = await Resource.findByPk(resId);
        if (resource) {
          resource.status = ResourceStatus.AVAILABLE;
          (resource as any).status = ResourceStatus.AVAILABLE;
          resource.setDataValue('status', ResourceStatus.AVAILABLE);
          await resource.save();
        }
      }
    }
    if (quantityAllocated !== undefined) {
      allocation.quantityAllocated = quantityAllocated;
      (allocation as any).quantity_allocated = quantityAllocated;
      allocation.setDataValue('quantityAllocated', quantityAllocated);
      allocation.setDataValue('quantity_allocated', quantityAllocated);
    }
    if (routeCoordinates) {
      allocation.optimizedRouteGeom = {
        type: 'LineString',
        coordinates: routeCoordinates,
      };
      (allocation as any).optimized_route_geom = {
        type: 'LineString',
        coordinates: routeCoordinates,
      };
      allocation.setDataValue('optimizedRouteGeom', {
        type: 'LineString',
        coordinates: routeCoordinates,
      });
      allocation.setDataValue('optimized_route_geom', {
        type: 'LineString',
        coordinates: routeCoordinates,
      });
    }

    await allocation.save();

    res.status(200).json({
      message: 'Allocation updated successfully.',
      allocation,
    });
  } catch (error: any) {
    logger.error(`Update allocation error: ${error.stack || error}`);
    res.status(500).json({ message: 'Internal server error updating allocation.' });
  }
};

export const cancelAllocation = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const allocation = await Allocation.findByPk(id);
    if (!allocation) {
      res.status(404).json({ message: 'Allocation not found.' });
      return;
    }

    allocation.status = 'CANCELLED';
    (allocation as any).status = 'CANCELLED';
    allocation.setDataValue('status', 'CANCELLED');
    await allocation.save();

    const resId = allocation.resourceId || (allocation as any).resource_id || allocation.getDataValue('resourceId') || allocation.getDataValue('resource_id');
    const resource = await Resource.findByPk(resId);
    if (resource) {
      resource.status = ResourceStatus.AVAILABLE;
      (resource as any).status = ResourceStatus.AVAILABLE;
      resource.setDataValue('status', ResourceStatus.AVAILABLE);
      await resource.save();
    }

    res.status(200).json({
      message: 'Allocation cancelled successfully. Resource is now available.',
      allocation,
    });
  } catch (error: any) {
    logger.error(`Cancel allocation error: ${error.stack || error}`);
    res.status(500).json({ message: 'Internal server error cancelling allocation.' });
  }
};

export const getAllocationHistory = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const { count, rows: allocations } = await Allocation.findAndCountAll({
      limit: Number(limit),
      offset,
      include: [
        { model: Incident, as: 'Incident' },
        { model: Resource, as: 'Resource' },
      ],
      order: [['createdAt', 'DESC']],
    });

    res.status(200).json({
      totalItems: count,
      totalPages: Math.ceil(count / Number(limit)),
      currentPage: Number(page),
      allocations,
    });
  } catch (error) {
    console.error('Get allocation history error:', error);
    res.status(500).json({ message: 'Internal server error fetching allocation history.' });
  }
};
