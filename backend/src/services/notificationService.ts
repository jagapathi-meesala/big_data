import nodemailer from 'nodemailer';
import twilio from 'twilio';
import logger from '../config/logger';

// Setup email transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: false,
  auth: {
    user: process.env.SMTP_USER || 'mock_user@ethereal.email',
    pass: process.env.SMTP_PASS || 'mock_password',
  },
});

// Setup Twilio SMS Client
const accountSid = process.env.TWILIO_ACCOUNT_SID || 'ACmock';
const authToken = process.env.TWILIO_AUTH_TOKEN || 'mock_token';
const twilioNumber = process.env.TWILIO_PHONE_NUMBER || '+15017122661';

const twilioClient = accountSid !== 'ACmock' ? twilio(accountSid, authToken) : null;

export const sendEmail = async (to: string, subject: string, text: string): Promise<boolean> => {
  try {
    const info = await transporter.sendMail({
      from: '"AID-DRAS System" <no-reply@aid-dras.gov>',
      to,
      subject,
      text,
    });
    logger.info(`Email sent successfully: ${info.messageId}`);
    return true;
  } catch (error) {
    logger.error(`Error sending email to ${to}: ${error}`);
    return false;
  }
};

export const sendSMS = async (phoneNumber: string, message: string): Promise<boolean> => {
  try {
    if (twilioClient) {
      const response = await twilioClient.messages.create({
        body: message,
        from: twilioNumber,
        to: phoneNumber
      });
      logger.info(`SMS sent successfully to ${phoneNumber}. Msg SID: ${response.sid}`);
    } else {
      logger.info(`[SMS PLACEHOLDER] Sent SMS to ${phoneNumber}: "${message}"`);
    }
    return true;
  } catch (error) {
    logger.error(`Error sending SMS to ${phoneNumber}: ${error}`);
    return false;
  }
};

export const sendPushNotification = async (userId: string, title: string, body: string): Promise<boolean> => {
  try {
    logger.info(`[PUSH NOTIFICATION PLACEHOLDER] Sent Push notification to User(${userId}) - Title: "${title}", Body: "${body}"`);
    return true;
  } catch (error) {
    logger.error(`Error sending Push Notification to User(${userId}): ${error}`);
    return false;
  }
};
