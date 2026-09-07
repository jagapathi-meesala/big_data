import { sequelize } from '../config/db';
import { redisClient } from '../config/redis';

// SMTP delivery for transactional mail (password reset). When SMTP env vars
// are absent the mail is logged instead of sent — forgot-password stays
// functional in dev without an SMTP server.
export const sendEmail = async (to: string, subject: string, text: string): Promise<void> => {
  const host = process.env.SMTP_HOST;
  if (!host) {
    console.warn(`[email:dev-only] to=${to} subject="${subject}" body=${text}`);
    return;
  }
  const nodemailer = await import('nodemailer');
  const transporter = nodemailer.createTransport({
    host,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined
  });
  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'no-reply@aid-dras.org',
    to,
    subject,
    text
  });
};

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
