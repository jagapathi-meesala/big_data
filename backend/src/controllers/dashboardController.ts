import { Request, Response } from 'express';
import { Op } from 'sequelize';
import User, { UserRole } from '../models/User';
import Incident, { IncidentStatus, SeverityLevel } from '../models/Incident';
import Resource, { ResourceType, ResourceStatus } from '../models/Resource';
import { sequelize } from '../config/db';

export const getDashboardStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const activeIncidents = await Incident.count({
      where: {
        status: {
          [Op.in]: [IncidentStatus.REPORTED, IncidentStatus.VERIFIED, IncidentStatus.DISPATCHED]
        }
      }
    });

    const volunteersCount = await User.count({
      where: {
        role: UserRole.VOLUNTEER,
        availability: 'AVAILABLE'
      }
    });

    const hospitalBeds = await Resource.sum('quantity', {
      where: {
        type: ResourceType.HOSPITAL_BED
      }
    }) || 0;

    const sheltersCount = await Resource.count({
      where: {
        type: ResourceType.SHELTER_CAPACITY,
        status: ResourceStatus.AVAILABLE
      }
    });

    const ambulancesCount = await Resource.count({
      where: {
        type: ResourceType.AMBULANCE,
        status: ResourceStatus.AVAILABLE
      }
    });

    const sosRequests = await Incident.count({
      where: {
        severity: SeverityLevel.CRITICAL,
        status: IncidentStatus.REPORTED
      }
    });

    const severityDistribution = await Incident.findAll({
      attributes: ['severity', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
      group: ['severity'],
      raw: true
    });

    res.status(200).json({
      activeIncidents,
      volunteers: volunteersCount,
      availableBeds: hospitalBeds,
      shelters: sheltersCount,
      ambulances: ambulancesCount,
      emergencyRequests: sosRequests,
      totalIncidents: await Incident.count(),
      resolvedIncidents: await Incident.count({ where: { status: IncidentStatus.RESOLVED } }),
      severityDistribution
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ message: 'Internal server error fetching stats.' });
  }
};
