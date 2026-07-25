import { Response } from 'express';
import { Op } from 'sequelize';
import { sequelize } from '../config/db';
import { redisClient } from '../config/redis';
import Resource, { ResourceStatus } from '../models/Resource';
import { AuthenticatedRequest } from '../middlewares/auth';

export const createResource = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { type, quantity, status, latitude, longitude } = req.body;

    if (!type || quantity === undefined || latitude === undefined || longitude === undefined) {
      res.status(400).json({ message: 'Type, quantity, latitude, and longitude are required.' });
      return;
    }

    if (!req.user) {
      res.status(401).json({ message: 'User context is missing.' });
      return;
    }

    let ownerId = req.user.id;
    const User = require('../models/User').default;
    const userExists = await User.findByPk(ownerId);
    if (!userExists) {
      const firstAdmin = await User.findOne({ where: { role: 'ADMIN' } });
      ownerId = firstAdmin ? firstAdmin.id : null;
    }

    const resource = await Resource.create({
      ownerId,
      type,
      quantity,
      status: status || ResourceStatus.AVAILABLE,
      geom: {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)],
      },
    });

    try {
      await redisClient.geoAdd('active_resources', {
        longitude: parseFloat(longitude),
        latitude: parseFloat(latitude),
        member: resource.id,
      });
    } catch (redisErr) {
      console.error('Redis GEOADD failed:', redisErr);
    }

    res.status(201).json({
      message: 'Resource registered successfully.',
      resource,
    });
  } catch (error) {
    console.error('Create resource error:', error);
    res.status(500).json({ message: 'Internal server error registering resource.' });
  }
};

export const getResources = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { lat, lng, radius, type, status, page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    const whereClause: any = {};

    if (type) whereClause.type = type;
    if (status) whereClause.status = status;

    if (lat && lng && radius) {
      const latitude = parseFloat(lat as string);
      const longitude = parseFloat(lng as string);
      const radiusInMeters = parseFloat(radius as string);

      if (!isNaN(latitude) && !isNaN(longitude) && !isNaN(radiusInMeters)) {
        whereClause[Op.and] = sequelize.literal(
          `ST_DWithin(geom, ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography, ${radiusInMeters})`
        );
      } else {
        res.status(400).json({ message: 'Invalid latitude, longitude, or radius query params.' });
        return;
      }
    }

    const { count, rows: resources } = await Resource.findAndCountAll({
      where: whereClause,
      limit: Number(limit),
      offset,
      order: [['createdAt', 'DESC']],
    });

    res.status(200).json({
      totalItems: count,
      totalPages: Math.ceil(count / Number(limit)),
      currentPage: Number(page),
      resources,
    });
  } catch (error) {
    console.error('Get resources error:', error);
    res.status(500).json({ message: 'Internal server error fetching resources.' });
  }
};

export const updateResource = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { type, quantity, status, latitude, longitude } = req.body;

    const resource = await Resource.findByPk(id);
    if (!resource) {
      res.status(404).json({ message: 'Resource not found.' });
      return;
    }

    if (type) resource.type = type;
    if (quantity !== undefined) resource.quantity = quantity;
    if (status) resource.status = status;

    if (latitude !== undefined && longitude !== undefined) {
      resource.geom = {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)],
      };

      try {
        await redisClient.geoAdd('active_resources', {
          longitude: parseFloat(longitude),
          latitude: parseFloat(latitude),
          member: resource.id,
        });
      } catch (redisErr) {
        console.error('Redis GEOADD failed during resource update:', redisErr);
      }
    }

    await resource.save();

    res.status(200).json({
      message: 'Resource updated successfully.',
      resource,
    });
  } catch (error) {
    console.error('Update resource error:', error);
    res.status(500).json({ message: 'Internal server error updating resource.' });
  }
};

export const deleteResource = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const resource = await Resource.findByPk(id);

    if (!resource) {
      res.status(404).json({ message: 'Resource not found.' });
      return;
    }

    await resource.destroy();

    try {
      await redisClient.zRem('active_resources', id);
    } catch (redisErr) {
      console.error('Redis zRem failed during resource deletion:', redisErr);
    }

    res.status(200).json({ message: 'Resource deleted successfully.' });
  } catch (error) {
    console.error('Delete resource error:', error);
    res.status(500).json({ message: 'Internal server error deleting resource.' });
  }
};

export const updateResourceLocation = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { latitude, longitude } = req.body;

    if (latitude === undefined || longitude === undefined) {
      res.status(400).json({ message: 'Latitude and longitude are required.' });
      return;
    }

    const resource = await Resource.findByPk(id);
    if (!resource) {
      res.status(404).json({ message: 'Resource not found.' });
      return;
    }

    resource.geom = {
      type: 'Point',
      coordinates: [parseFloat(longitude), parseFloat(latitude)],
    };
    await resource.save();

    try {
      await redisClient.geoAdd('active_resources', {
        longitude: parseFloat(longitude),
        latitude: parseFloat(latitude),
        member: resource.id,
      });

      await redisClient.publish('resource:moves', JSON.stringify({
        resourceId: resource.id,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        type: resource.type,
      }));
    } catch (redisErr) {
      console.error('Redis geo/pubsub update failed:', redisErr);
    }

    res.status(200).json({
      message: 'Resource location updated successfully.',
      resource,
    });
  } catch (error) {
    console.error('Update resource location error:', error);
    res.status(500).json({ message: 'Internal server error updating location.' });
  }
};
