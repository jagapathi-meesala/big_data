import { Sequelize } from 'sequelize';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const dbDialect = process.env.DB_DIALECT || 'sqlite';
const sqliteStoragePath = path.resolve(__dirname, '../../../riskshield.db');

let sequelizeInstance: Sequelize;

try {
  if (dbDialect === 'sqlite' && process.env.DB_HOST) {
    require.resolve('sqlite3');
    sequelizeInstance = new Sequelize({
      dialect: 'sqlite',
      storage: sqliteStoragePath,
      logging: false,
    });
  } else {
    sequelizeInstance = new Sequelize(
      process.env.DB_NAME || 'aid_dras',
      process.env.DB_USER || 'postgres',
      process.env.DB_PASSWORD || 'password',
      {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        dialect: 'postgres',
        logging: false,
      }
    );
  }
} catch {
  sequelizeInstance = new Sequelize(
    process.env.DB_NAME || 'aid_dras',
    process.env.DB_USER || 'postgres',
    process.env.DB_PASSWORD || 'password',
    {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      dialect: 'postgres',
      logging: false,
    }
  );
}

export const sequelize = sequelizeInstance;

export const connectDB = async (retries = 2, delay = 1000): Promise<void> => {
  let count = retries;
  while (count > 0) {
    try {
      await sequelize.authenticate();
      console.log(`Database connection established successfully using ${sequelize.getDialect()} dialect.`);
      return;
    } catch (error) {
      count -= 1;
      console.warn(`Database connection attempt failed (${count} retries remaining):`, error);
      if (count === 0) {
        console.warn('Could not establish persistent DB connection. Server will run with fallback mock data mode.');
        return;
      }
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};
