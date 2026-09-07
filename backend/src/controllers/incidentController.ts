import { Response } from 'express';
import { Op } from 'sequelize';
import crypto from 'crypto';
import { sequelize } from '../config/db';
import Incident, { IncidentStatus, SeverityLevel, DisasterType } from '../models/Incident';
import { AuthenticatedRequest } from '../middlewares/auth';

export const createIncident = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { title, description, severity, disasterType, imageUrl, latitude, longitude } = req.body;

    if (!title || latitude === undefined || longitude === undefined) {
      res.status(400).json({ message: 'Title, latitude, and longitude are required.' });
      return;
    }

    let reporterId = req.user ? req.user.id : null;
    if (reporterId) {
      const User = require('../models/User').default;
      const userExists = await User.findByPk(reporterId);
      if (!userExists) {
        const firstAdmin = await User.findOne({ where: { role: 'ADMIN' } });
        reporterId = firstAdmin ? firstAdmin.id : null;
      }
    }

    const incident = await Incident.create({
      reporterId,
      title,
      description,
      severity: severity || SeverityLevel.MEDIUM,
      status: IncidentStatus.REPORTED,
      disasterType: disasterType || DisasterType.OTHER,
      imageUrl: imageUrl || null,
      geom: {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)],
      },
    });

    await sequelize.query(`
      INSERT INTO system_notifications (title, message, type, "createdAt", "updatedAt")
      VALUES (:title, :message, 'WARNING', NOW(), NOW());
    `, {
      replacements: {
        title: 'New Incident Reported',
        message: `A new ${incident.severity} severity ${incident.disasterType} incident has been reported: '${incident.title}'.`
      }
    });

    try {
      const { redisClient } = require('../config/redis');
      await redisClient.publish('incident:events', JSON.stringify({
        event: 'incident:created',
        incident
      }));
    } catch (redisErr) {
      console.error('Redis publish for incident:created failed:', redisErr);
    }

    res.status(201).json({
      message: 'Incident reported successfully.',
      incident,
    });
  } catch (error: any) {
    console.error('Create incident error:', error);
    res.status(500).json({ message: 'Internal server error reporting incident.' });
  }
};

export const getIncidents = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { lat, lng, radius, status, severity, disasterType, search, page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    const whereClause: any = {};

    if (status) whereClause.status = status;
    if (severity) whereClause.severity = severity;
    if (disasterType) whereClause.disasterType = disasterType;

    if (search) {
      whereClause[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
      ];
    }

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

    const { count, rows: incidents } = await Incident.findAndCountAll({
      where: whereClause,
      limit: Number(limit),
      offset,
      order: [['createdAt', 'DESC']],
    });

    res.status(200).json({
      totalItems: count,
      totalPages: Math.ceil(count / Number(limit)),
      currentPage: Number(page),
      incidents,
    });
  } catch (error) {
    console.error('Get incidents error:', error);
    res.status(500).json({ message: 'Internal server error fetching incidents.' });
  }
};

export const updateIncident = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { title, description, severity, status, disasterType, imageUrl, latitude, longitude } = req.body;

    const incident = await Incident.findByPk(id);
    if (!incident) {
      res.status(404).json({ message: 'Incident not found.' });
      return;
    }

    if (title) incident.title = title;
    if (description) incident.description = description;
    if (severity) incident.severity = severity;
    if (status) incident.status = status;
    if (disasterType) incident.disasterType = disasterType;
    if (imageUrl) incident.imageUrl = imageUrl;

    if (latitude !== undefined && longitude !== undefined) {
      incident.geom = {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)],
      };
    }

    await incident.save();

    try {
      const { redisClient } = require('../config/redis');
      await redisClient.publish('incident:events', JSON.stringify({
        event: 'incident:updated',
        incident
      }));
    } catch (redisErr) {
      console.error('Redis publish for incident:updated failed:', redisErr);
    }

    res.status(200).json({
      message: 'Incident updated successfully.',
      incident,
    });
  } catch (error) {
    console.error('Update incident error:', error);
    res.status(500).json({ message: 'Internal server error updating incident.' });
  }
};

export const deleteIncident = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const incident = await Incident.findByPk(id);

    if (!incident) {
      res.status(404).json({ message: 'Incident not found.' });
      return;
    }

    await incident.destroy();
    res.status(200).json({ message: 'Incident deleted successfully.' });
  } catch (error) {
    console.error('Delete incident error:', error);
    res.status(500).json({ message: 'Internal server error deleting incident.' });
  }
};

export const uploadImage = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const fileId = crypto.randomUUID();
    const mockCdnUrl = `https://cdn.aid-dras.org/uploads/disaster_${fileId}.jpg`;

    res.status(200).json({
      message: 'Disaster image uploaded successfully.',
      imageUrl: mockCdnUrl,
    });
  } catch (error) {
    console.error('Upload image error:', error);
    res.status(500).json({ message: 'Internal server error uploading image.' });
  }
};

export const updateIncidentStatus = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      res.status(400).json({ message: 'Status is required.' });
      return;
    }

    const incident = await Incident.findByPk(id);
    if (!incident) {
      res.status(404).json({ message: 'Incident not found.' });
      return;
    }

    incident.status = status;
    await incident.save();

    await sequelize.query(`
      INSERT INTO system_notifications (title, message, type, "createdAt", "updatedAt")
      VALUES (:title, :message, 'INFO', NOW(), NOW());
    `, {
      replacements: {
        title: `Distress ${status === 'VERIFIED' ? 'Verified' : 'Updated'}`,
        message: `Incident '${incident.title}' has been successfully ${status === 'VERIFIED' ? 'verified' : 'marked as ' + status} by the dispatch system.`
      }
    });

    try {
      const { redisClient } = require('../config/redis');
      await redisClient.publish('incident:events', JSON.stringify({
        event: 'incident:updated',
        incident
      }));
    } catch (redisErr) {
      console.error('Redis publish for incident:updated failed:', redisErr);
    }

    res.status(200).json({
      message: 'Incident status updated successfully.',
      incident,
    });
  } catch (error) {
    console.error('Update incident status error:', error);
    res.status(500).json({ message: 'Internal server error updating incident status.' });
  }
};
