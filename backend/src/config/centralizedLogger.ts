import winston from 'winston';

const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(
    (info) => `[${info.timestamp}] [${info.level.toUpperCase()}]: ${info.message}`
  )
);

export const weatherLogger = winston.createLogger({
  level: 'info',
  format,
  transports: [
    new winston.transports.File({ filename: 'logs/weather.log' }),
    new winston.transports.Console()
  ]
});

export const iotLogger = winston.createLogger({
  level: 'info',
  format,
  transports: [
    new winston.transports.File({ filename: 'logs/iot.log' }),
    new winston.transports.Console()
  ]
});

export const sparkLogger = winston.createLogger({
  level: 'info',
  format,
  transports: [
    new winston.transports.File({ filename: 'logs/spark.log' }),
    new winston.transports.Console()
  ]
});

export const backendLogger = winston.createLogger({
  level: 'info',
  format,
  transports: [
    new winston.transports.File({ filename: 'logs/backend.log' }),
    new winston.transports.Console()
  ]
});
export default backendLogger;
