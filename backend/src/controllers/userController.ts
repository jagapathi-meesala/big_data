import { Response } from 'express';
import User, { UserRole, UserStatus } from '../models/User';
import { AuthenticatedRequest } from '../middlewares/auth';

export const getUsers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { role, status, page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    const whereClause: any = {};

    if (role) whereClause.role = role;
    if (status) whereClause.status = status;

    const { count, rows: users } = await User.findAndCountAll({
      where: whereClause,
      limit: Number(limit),
      offset,
      attributes: { exclude: ['passwordHash', 'refreshToken', 'passwordResetToken', 'passwordResetExpires'] },
      order: [['createdAt', 'DESC']],
    });

    res.status(200).json({
      totalItems: count,
      totalPages: Math.ceil(count / Number(limit)),
      currentPage: Number(page),
      users,
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Internal server error fetching users.' });
  }
};

export const getUserById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id, {
      attributes: { exclude: ['passwordHash', 'refreshToken', 'passwordResetToken', 'passwordResetExpires'] },
    });

    if (!user) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }

    res.status(200).json(user);
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({ message: 'Internal server error fetching user.' });
  }
};

export const updateProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'User context is missing.' });
      return;
    }

    const { firstName, lastName, phoneNumber, profilePicture, district, state, email, role, status, availability } = req.body;
    const user = await User.findByPk(req.user.id);

    if (!user) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }

    if (firstName) {
      user.firstName = firstName;
      (user as any).first_name = firstName;
      user.setDataValue('firstName', firstName);
      user.setDataValue('first_name', firstName);
    }
    if (lastName) {
      user.lastName = lastName;
      (user as any).last_name = lastName;
      user.setDataValue('lastName', lastName);
      user.setDataValue('last_name', lastName);
    }
    if (phoneNumber) {
      user.phoneNumber = phoneNumber;
      (user as any).phone_number = phoneNumber;
      user.setDataValue('phoneNumber', phoneNumber);
      user.setDataValue('phone_number', phoneNumber);
    }
    if (profilePicture) {
      user.profilePicture = profilePicture;
      (user as any).profile_picture = profilePicture;
      user.setDataValue('profilePicture', profilePicture);
      user.setDataValue('profile_picture', profilePicture);
    }
    if (district) {
      user.district = district;
      user.setDataValue('district', district);
    }
    if (state) {
      user.state = state;
      user.setDataValue('state', state);
    }
    if (email) {
      user.email = email;
      user.setDataValue('email', email);
    }
    if (role) {
      user.role = role;
      user.setDataValue('role', role);
    }
    if (status) {
      user.status = status;
      user.setDataValue('status', status);
    }
    if (availability) {
      user.availability = availability;
      user.setDataValue('availability', availability);
    }

    await user.save();

    const id = user.id || user.getDataValue('id') || (user as any).id;
    const emailVal = user.email || user.getDataValue('email') || (user as any).email;
    const roleVal = user.role || user.getDataValue('role') || (user as any).role;
    const statusVal = user.status || user.getDataValue('status') || (user as any).status;
    const availabilityVal = user.availability || user.getDataValue('availability') || (user as any).availability;

    res.status(200).json({
      message: 'Profile updated successfully.',
      user: {
        id,
        email: emailVal,
        firstName: user.firstName || (user as any).first_name || user.getDataValue('firstName') || user.getDataValue('first_name'),
        lastName: user.lastName || (user as any).last_name || user.getDataValue('lastName') || user.getDataValue('last_name'),
        phoneNumber: user.phoneNumber || (user as any).phone_number || user.getDataValue('phoneNumber') || user.getDataValue('phone_number'),
        role: roleVal,
        status: statusVal,
        availability: availabilityVal,
        profilePicture: user.profilePicture || (user as any).profile_picture || user.getDataValue('profilePicture') || user.getDataValue('profile_picture'),
        district: user.district || user.getDataValue('district'),
        state: user.state || user.getDataValue('state'),
        createdAt: user.createdAt || user.getDataValue('createdAt'),
      },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Internal server error updating profile.' });
  }
};

export const updateUserStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !Object.values(UserStatus).includes(status)) {
      res.status(400).json({ message: 'Invalid or missing user status.' });
      return;
    }

    const user = await User.findByPk(id);
    if (!user) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }

    user.status = status;
    (user as any).status = status;
    user.setDataValue('status', status);
    await user.save();

    res.status(200).json({
      message: 'User status updated successfully.',
      user: {
        id: user.id || user.getDataValue('id') || (user as any).id,
        email: user.email || user.getDataValue('email') || (user as any).email,
        role: user.role || user.getDataValue('role') || (user as any).role,
        status: user.status || user.getDataValue('status') || (user as any).status,
      },
    });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ message: 'Internal server error updating user status.' });
  }
};

export const assignRole = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role || !Object.values(UserRole).includes(role)) {
      res.status(400).json({ message: 'Invalid or missing user role.' });
      return;
    }

    const user = await User.findByPk(id);
    if (!user) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }

    user.role = role;
    (user as any).role = role;
    user.setDataValue('role', role);
    await user.save();

    res.status(200).json({
      message: 'User role updated successfully.',
      user: {
        id: user.id || user.getDataValue('id') || (user as any).id,
        email: user.email || user.getDataValue('email') || (user as any).email,
        role: user.role || user.getDataValue('role') || (user as any).role,
        status: user.status || user.getDataValue('status') || (user as any).status,
      },
    });
  } catch (error) {
    console.error('Assign role error:', error);
    res.status(500).json({ message: 'Internal server error assigning role.' });
  }
};

export const deleteUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id);

    if (!user) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }

    await user.destroy();
    res.status(200).json({ message: 'User deleted successfully.' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Internal server error deleting user.' });
  }
};

export const changePassword = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const bcrypt = require('bcryptjs');
    if (!req.user) {
      res.status(401).json({ message: 'User context is missing.' });
      return;
    }
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      res.status(400).json({ message: 'Current and new passwords are required.' });
      return;
    }

    const user = await User.findByPk(req.user.id);
    if (!user) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }

    const hash = user.passwordHash || (user as any).password_hash || user.getDataValue('passwordHash') || user.getDataValue('password_hash');
    const isMatch = await bcrypt.compare(currentPassword, hash);
    if (!isMatch) {
      res.status(400).json({ message: 'Incorrect current password.' });
      return;
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    user.passwordHash = newHash;
    (user as any).password_hash = newHash;
    user.setDataValue('passwordHash', newHash);
    user.setDataValue('password_hash', newHash);
    await user.save();

    res.status(200).json({ message: 'Password changed successfully.' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Internal server error changing password.' });
  }
};
