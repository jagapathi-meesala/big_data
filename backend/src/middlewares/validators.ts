import { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';

export const validateResult = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }
  next();
};

export const registerValidator = [
  body('email').isEmail().withMessage('Provide a valid email address'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  body('firstName').notEmpty().withMessage('First name is required'),
  body('lastName').notEmpty().withMessage('Last name is required'),
  body('phoneNumber').notEmpty().withMessage('Phone number is required'),
  body('role').isIn(['ADMIN', 'DISASTER_OFFICER', 'CITIZEN', 'VOLUNTEER', 'HOSPITAL', 'POLICE', 'FIRE_DEPARTMENT', 'NGO']).withMessage('Invalid user role'),
  validateResult,
];

export const loginValidator = [
  body('email').isEmail().withMessage('Provide a valid email address'),
  body('password').notEmpty().withMessage('Password is required'),
  validateResult,
];

export const incidentValidator = [
  body('title').notEmpty().withMessage('Incident title is required'),
  body('severity').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).withMessage('Invalid severity level'),
  body('disasterType').optional().isIn(['FLOOD', 'FIRE', 'EARTHQUAKE', 'HURRICANE', 'LANDSLIDE', 'OTHER']).withMessage('Invalid disaster type'),
  body('latitude').isFloat({ min: -90, max: 90 }).withMessage('Latitude must be between -90 and 90'),
  body('longitude').isFloat({ min: -180, max: 180 }).withMessage('Longitude must be between -180 and 180'),
  validateResult,
];

export const resourceValidator = [
  body('type').isIn(['FOOD', 'WATER', 'MEDICINE', 'AMBULANCE', 'FIRE_TRUCK', 'RESCUE_TEAM', 'POLICE_UNIT', 'SHELTER_CAPACITY', 'HOSPITAL_BED']).withMessage('Invalid resource type'),
  body('quantity').isInt({ min: 0 }).withMessage('Quantity must be greater than or equal to 0'),
  body('status').optional().isIn(['AVAILABLE', 'ALLOCATED', 'IN_TRANSIT', 'MAINTENANCE']).withMessage('Invalid resource status'),
  body('latitude').isFloat({ min: -90, max: 90 }).withMessage('Latitude must be between -90 and 90'),
  body('longitude').isFloat({ min: -180, max: 180 }).withMessage('Longitude must be between -180 and 180'),
  validateResult,
];

export const allocationValidator = [
  body('incidentId').custom((value) => {
    if (value === 'all') return true;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(value)) return true;
    throw new Error('Incident ID must be a valid UUID or "all"');
  }),
  validateResult,
];
