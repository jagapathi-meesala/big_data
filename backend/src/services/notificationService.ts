import { sequelize } from '../config/db';
import { redisClient } from '../config/redis';

export interface SystemNotification {
  id?: number;
  title: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING';
  createdAt?: Date;
  updatedAt?: Date;
}

export const createSystemNotification = async (
  title: string,
  message: string,
  type: 'INFO' | 'SUCCESS' | 'WARNING'
): Promise<void> => {
  try {
    // 1. Ensure the table exists (fail-safe check)
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

    // 2. Insert notification record into the database
    const [results]: any = await sequelize.query(`
      INSERT INTO system_notifications (title, message, type, "createdAt", "updatedAt")
      VALUES (:title, :message, :type, NOW(), NOW())
      RETURNING id, title, message, type, "createdAt", "updatedAt";
    `, {
      replacements: { title, message, type },
    });

    const newNotification = results?.[0];

    // 3. Publish to Redis to broadcast via WebSockets to all active clients
    if (newNotification) {
      await redisClient.publish('notification:events', JSON.stringify({
        id: newNotification.id,
        title: newNotification.title,
        message: newNotification.message,
        type: newNotification.type,
        createdAt: newNotification.createdAt || new Date(),
        updatedAt: newNotification.updatedAt || new Date()
      }));
    }
  } catch (error) {
    console.error('Failed to create system notification:', error);
  }
};
