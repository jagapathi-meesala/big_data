import { Request, Response } from 'express';
import { sequelize } from '../config/db';
import logger from '../config/logger';
import { createSystemNotification } from '../services/notificationService';

const checkTable = async () => {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS iot_devices (
      id SERIAL PRIMARY KEY,
      device_id VARCHAR(100) UNIQUE NOT NULL,
      device_type VARCHAR(50) NOT NULL,
      status VARCHAR(50) DEFAULT 'ACTIVE',
      last_value FLOAT,
      latitude FLOAT,
      longitude FLOAT,
      "createdAt" TIMESTAMP NOT NULL,
      "updatedAt" TIMESTAMP NOT NULL
    );
  `);
};

export const registerDevice = async (req: Request, res: Response) => {
  const { deviceId, deviceType, lat, lon } = req.body;
  try {
    await checkTable();
    await sequelize.query(`
      INSERT INTO iot_devices (device_id, device_type, status, latitude, longitude, "createdAt", "updatedAt")
      VALUES (:deviceId, :deviceType, 'ACTIVE', :lat, :lon, NOW(), NOW())
      ON CONFLICT (device_id) DO UPDATE 
      SET latitude = :lat, longitude = :lon, "updatedAt" = NOW();
    `, { replacements: { deviceId, deviceType, lat, lon } });
    
    return res.status(200).json({ message: 'IoT Device registered successfully.' });
  } catch (error) {
    logger.error(`Error registering device: ${error}`);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

export const receiveTelemetry = async (req: Request, res: Response) => {
  const { deviceId, value } = req.body;
  try {
    await checkTable();
    
    await sequelize.query(`
      UPDATE iot_devices 
      SET last_value = :value, "updatedAt" = NOW()
      WHERE device_id = :deviceId;
    `, { replacements: { deviceId, value } });

    if (value > 15.0) {
      logger.warn(`[WARNING] IoT Sensor ${deviceId} reported critical alert value: ${value}`);
      await createSystemNotification(
        'IoT Alert Triggered',
        `Sensor '${deviceId}' reported critical warning telemetry value: ${value}.`,
        'WARNING'
      );
    }

    return res.status(200).json({ message: 'Telemetry processed successfully.' });
  } catch (error) {
    logger.error(`Error processing telemetry: ${error}`);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

export const getHealthSummary = async (req: Request, res: Response) => {
  try {
    await checkTable();
    const [devices] = await sequelize.query(`SELECT * FROM iot_devices;`);
    return res.status(200).json({ devices });
  } catch (error) {
    logger.error(`Error getting health summary: ${error}`);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};
