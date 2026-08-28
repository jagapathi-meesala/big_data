import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import { connectDB, sequelize } from './config/db';
import { connectRedis } from './config/redis';
import { initSockets } from './sockets/socket';
import { swaggerSpec } from './config/swagger';
import { logger } from './config/logger';
import { errorHandler } from './middlewares/errorHandler';
import { seedDatabase } from './config/seed';

// Import routes
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import incidentRoutes from './routes/incidentRoutes';
import resourceRoutes from './routes/resourceRoutes';
import allocationRoutes from './routes/allocationRoutes';
import iotRoutes from './routes/iotRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import analyticsRoutes from './routes/analyticsRoutes';
import weatherRoutes from './routes/weatherRoutes';
import reportRoutes from './routes/reportRoutes';
import notificationRoutes from './routes/notificationRoutes';
import publicApisRoutes from './routes/publicApisRoutes';
import helmet from 'helmet';
import { syncGDACSDisasters } from './services/gdacsService';
import rateLimit from 'express-rate-limit';
import { auditLogger } from './middlewares/auditLogger';

dotenv.config();

const app = express();
const httpServer = createServer(app);

// Request Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'development' ? 10000 : 100,
  message: 'Too many requests from this IP, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(helmet());
app.use(limiter);
app.use(auditLogger);

// Request Logging Middleware
app.use((req, res, next) => {
  logger.info(`HTTP ${req.method} ${req.originalUrl} - IP: ${req.ip}`);
  next();
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Swagger Documentation Route
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Basic Status Endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'online',
    system: 'AI Powered Distributed Disaster Resource Allocation System',
    timestamp: new Date(),
  });
});

// Mounting Sub-Routers
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/incidents', incidentRoutes);
app.use('/api/v1/resources', resourceRoutes);
app.use('/api/v1/allocations', allocationRoutes);
app.use('/api/v1/iot', iotRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/weather', weatherRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/public-apis', publicApisRoutes);

// Global Error Handler Middleware (MUST be registered last)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  // 1. Connect to PostgreSQL
  await connectDB();

  // 2. Sync database schema (PostGIS extensions assumed enabled)
  try {
    await sequelize.sync({ alter: true });
    logger.info('Database tables synchronized successfully.');
    await seedDatabase();
  } catch (error) {
    logger.error(`Database synchronization failed: ${error}`);
  }

  // 3. Connect to Redis
  await connectRedis();

  // 4. Initialize Sockets
  await initSockets(httpServer);

  // 5. Run HttpServer — bind to port FIRST so the dashboard loads immediately
  httpServer.listen(PORT, () => {
    logger.info(`Backend server is running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode.`);

    // 6. Fire live disaster sync AFTER server is online (non-blocking)
    syncGDACSDisasters().catch((err) =>
      logger.error(`[GDACS Sync] Startup sync failed: ${err.message}`)
    );

    // Set up recurring sync every 30 minutes
    setInterval(() => {
      syncGDACSDisasters().catch((err) =>
        logger.error(`[GDACS Sync] Recurring sync failed: ${err.message}`)
      );
    }, 30 * 60 * 1000);
  });
};

// Bootstrap if not running tests
if (process.env.NODE_ENV !== 'test') {
  startServer().catch((error) => {
    logger.error(`Critical server bootstrap error: ${error}`);
  });
}

// Trigger reload: fixed seed dataset resolution
export default app;
