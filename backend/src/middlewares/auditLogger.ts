import { Request, Response, NextFunction } from 'express';
import { sequelize } from '../config/db';
import logger from '../config/logger';

export const auditLogger = async (req: Request, res: Response, next: NextFunction) => {
  const originalSend = res.send;
  
  res.send = function (body) {
    res.send = originalSend;
    
    if (req.originalUrl.includes('/allocations') || req.originalUrl.includes('/resources')) {
      const user = (req as any).user;
      const userId = user ? String(user.id) : 'ANONYMOUS';
      const userRole = user ? String(user.role) : 'GUEST';
      
      sequelize.query(`
        CREATE TABLE IF NOT EXISTS audit_logs (
          id SERIAL PRIMARY KEY,
          user_id VARCHAR(100),
          role VARCHAR(50),
          action VARCHAR(50),
          url VARCHAR(255),
          status INT,
          "createdAt" TIMESTAMP NOT NULL,
          "updatedAt" TIMESTAMP NOT NULL
        );
      `).then(() => {
        sequelize.query(`
          INSERT INTO audit_logs (user_id, role, action, url, status, "createdAt", "updatedAt")
          VALUES (:userId, :userRole, :method, :url, :status, NOW(), NOW());
        `, {
          replacements: {
            userId,
            userRole,
            method: req.method,
            url: req.originalUrl,
            status: res.statusCode
          }
        }).catch(err => logger.error(`Audit insertion failed: ${err}`));
      }).catch(err => logger.error(`Audit table check failed: ${err}`));
    }
    
    return res.send(body);
  };
  
  next();
};
