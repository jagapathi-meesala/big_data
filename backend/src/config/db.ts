import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const dbHost = process.env.DB_HOST || 'localhost';
const dbPort = parseInt(process.env.DB_PORT || '5432', 10);
const dbUser = process.env.DB_USER || 'postgres';
const dbPassword = process.env.DB_PASSWORD || 'password';
const dbName = process.env.DB_NAME || 'aid_dras';

export const sequelize = new Sequelize(dbName, dbUser, dbPassword, {
  host: dbHost,
  port: dbPort,
  dialect: 'postgres',
  logging: false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
});

export const connectDB = async (retries = 5, delay = 5000): Promise<void> => {
  while (retries > 0) {
    try {
      await sequelize.authenticate();
      console.log('PostgreSQL database connection established successfully.');
      return;
    } catch (error) {
      retries -= 1;
      console.error(`Database connection failed. Retries remaining: ${retries}. Error: ${error}`);
      if (retries === 0) {
        console.error('Max retries hit. Exiting...');
        process.exit(1);
      }
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};
