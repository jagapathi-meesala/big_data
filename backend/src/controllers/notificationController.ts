import { Request, Response } from 'express';
import { sequelize } from '../config/db';
import logger from '../config/logger';

const checkTable = async () => {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS system_notifications (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      message TEXT,
      type VARCHAR(50) DEFAULT 'INFO',
      "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL,
      "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL
    );
  `);
};

export const getNotifications = async (req: Request, res: Response): Promise<void> => {
  try {
    await checkTable();
    const [rows] = await sequelize.query(`
      SELECT * FROM system_notifications
      ORDER BY "createdAt" DESC
      LIMIT 20;
    `);
    res.status(200).json({ notifications: rows });
  } catch (error) {
    logger.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Internal server error fetching notifications.' });
  }
};

export const createNotification = async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, message, type } = req.body;
    await checkTable();
    await sequelize.query(`
      INSERT INTO system_notifications (title, message, type, "createdAt", "updatedAt")
      VALUES (:title, :message, :type, NOW(), NOW());
    `, { replacements: { title, message, type: type || 'INFO' } });
    
    res.status(201).json({ message: 'Notification created.' });
  } catch (error) {
    logger.error('Error creating notification:', error);
    res.status(500).json({ message: 'Internal server error creating notification.' });
  }
};
