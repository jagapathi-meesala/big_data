import { createClient } from 'redis';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const redisClient = createClient({
  url: redisUrl,
});

redisClient.on('error', (err) => console.error('Redis Client Error:', err));

export const connectRedis = async (): Promise<void> => {
  try {
    await redisClient.connect();
    console.log('Connected to Redis server successfully.');
  } catch (error) {
    console.error('Failed to connect to Redis:', error);
    process.exit(1);
  }
};
