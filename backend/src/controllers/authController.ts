import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { Op } from 'sequelize';
import User from '../models/User';
import { sendEmail } from '../services/notificationService';
import logger from '../config/logger';

const generateToken = (id: string, email: string, role: string): string => {
  return jwt.sign(
    { id, email, role },
    process.env.JWT_SECRET || 'supersecretjwtkeyforaid-dras2026!',
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    }
  );
};

const generateRefreshToken = (id: string, email: string, role: string): string => {
  return jwt.sign(
    { id, email, role },
    process.env.JWT_SECRET || 'supersecretjwtkeyforaid-dras2026!',
    {
      expiresIn: '30d',
    }
  );
};

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, firstName, lastName, phoneNumber, role } = req.body;

    if (!email || !password || !firstName || !lastName || !phoneNumber || !role) {
      res.status(400).json({ message: 'Please provide all required fields.' });
      return;
    }

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      res.status(400).json({ message: 'User with this email already exists.' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      email,
      passwordHash,
      firstName,
      lastName,
      phoneNumber,
      role,
    });

    const id = newUser.id || newUser.getDataValue('id') || (newUser as any).id;
    const emailVal = newUser.email || newUser.getDataValue('email') || (newUser as any).email;
    const roleVal = newUser.role || newUser.getDataValue('role') || (newUser as any).role;

    const token = generateToken(id, emailVal, roleVal);
    const refreshToken = generateRefreshToken(id, emailVal, roleVal);

    newUser.refreshToken = refreshToken;
    await newUser.save();

    res.status(201).json({
      token,
      refreshToken,
      user: {
        id,
        email: emailVal,
        firstName: newUser.firstName || (newUser as any).first_name || newUser.getDataValue('firstName') || newUser.getDataValue('first_name'),
        lastName: newUser.lastName || (newUser as any).last_name || newUser.getDataValue('lastName') || newUser.getDataValue('last_name'),
        phoneNumber: newUser.phoneNumber || (newUser as any).phone_number || newUser.getDataValue('phoneNumber') || newUser.getDataValue('phone_number'),
        role: roleVal,
        profilePicture: newUser.profilePicture || (newUser as any).profile_picture || newUser.getDataValue('profilePicture') || newUser.getDataValue('profile_picture'),
        district: newUser.district || newUser.getDataValue('district'),
        state: newUser.state || newUser.getDataValue('state'),
        createdAt: newUser.createdAt || newUser.getDataValue('createdAt'),
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Internal server error during registration.' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ message: 'Please provide email and password.' });
      return;
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      res.status(401).json({ message: 'Invalid credentials.' });
      return;
    }

    const hash = user.passwordHash || (user as any).password_hash || user.getDataValue('passwordHash') || user.getDataValue('password_hash');
    const isMatch = await bcrypt.compare(password, hash);
    if (!isMatch) {
      res.status(401).json({ message: 'Invalid credentials.' });
      return;
    }

    const id = user.id || user.getDataValue('id') || (user as any).id;
    const emailVal = user.email || user.getDataValue('email') || (user as any).email;
    const roleVal = user.role || user.getDataValue('role') || (user as any).role;

    const token = generateToken(id, emailVal, roleVal);
    const refreshToken = generateRefreshToken(id, emailVal, roleVal);

    user.refreshToken = refreshToken;
    await user.save();

    res.status(200).json({
      token,
      refreshToken,
      user: {
        id,
        email: emailVal,
        firstName: user.firstName || (user as any).first_name || user.getDataValue('firstName') || user.getDataValue('first_name'),
        lastName: user.lastName || (user as any).last_name || user.getDataValue('lastName') || user.getDataValue('last_name'),
        phoneNumber: user.phoneNumber || (user as any).phone_number || user.getDataValue('phoneNumber') || user.getDataValue('phone_number'),
        role: roleVal,
        profilePicture: user.profilePicture || (user as any).profile_picture || user.getDataValue('profilePicture') || user.getDataValue('profile_picture'),
        district: user.district || user.getDataValue('district'),
        state: user.state || user.getDataValue('state'),
        createdAt: user.createdAt || user.getDataValue('createdAt'),
      },
    });
  } catch (error: any) {
    logger.error(`Login error: ${error.stack || error}`);
    res.status(500).json({ message: 'Internal server error during login.' });
  }
};

export const refresh = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.body;

    if (!token) {
      res.status(400).json({ message: 'Refresh token is required.' });
      return;
    }

    const user = await User.findOne({ where: { refreshToken: token } });
    if (!user) {
      res.status(401).json({ message: 'Invalid refresh token.' });
      return;
    }

    // Verify token
    try {
      jwt.verify(token, process.env.JWT_SECRET || 'supersecretjwtkeyforaid-dras2026!');
    } catch (err) {
      res.status(401).json({ message: 'Expired or invalid refresh token.' });
      return;
    }

    const newAccessToken = generateToken(user.id, user.email, user.role);
    const newRefreshToken = generateRefreshToken(user.id, user.email, user.role);

    user.refreshToken = newRefreshToken;
    await user.save();

    res.status(200).json({
      token: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ message: 'Internal server error during token refresh.' });
  }
};

export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ message: 'Email address is required.' });
      return;
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      res.status(404).json({ message: 'User not found with this email.' });
      return;
    }

    // Generate token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    user.passwordResetToken = hashedResetToken;
    user.passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
    await user.save();

    // Send email
    const resetUrl = `http://localhost:5000/api/v1/auth/reset-password/${resetToken}`;
    const message = `You requested a password reset. Please click this link or make a PUT request to: \n\n ${resetUrl} \n\n This link expires in 10 minutes.`;

    await sendEmail(user.email, 'AID-DRAS Password Reset Request', message);

    res.status(200).json({ message: 'Password reset link sent to your email.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Internal server error during password reset request.' });
  }
};

export const recoverEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const { phoneNumber } = req.body;
    if (!phoneNumber) {
      res.status(400).json({ message: 'Phone number is required.' });
      return;
    }
    const user = await User.findOne({ where: { phoneNumber } });
    if (!user) {
      res.status(404).json({ message: 'No account registered with this phone number.' });
      return;
    }
    const emailVal = user.email || user.getDataValue('email') || (user as any).email;
    res.status(200).json({
      message: 'Account located successfully.',
      email: emailVal
    });
  } catch (error) {
    console.error('Recover email error:', error);
    res.status(500).json({ message: 'Internal server error recovering email.' });
  }
};

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password) {
      res.status(400).json({ message: 'Password is required.' });
      return;
    }

    const hashedResetToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      where: {
        passwordResetToken: hashedResetToken,
        passwordResetExpires: {
          [Op.gt]: new Date(),
        },
      },
    });

    if (!user) {
      res.status(400).json({ message: 'Token is invalid or has expired.' });
      return;
    }

    user.passwordHash = await bcrypt.hash(password, 10);
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    
    // Invalidate refresh token on password change
    user.refreshToken = null;
    await user.save();

    res.status(200).json({ message: 'Password has been reset successfully. Please login again.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Internal server error during password reset.' });
  }
};
