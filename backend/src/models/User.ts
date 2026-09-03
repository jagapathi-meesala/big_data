import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/db';

export enum UserRole {
  ADMIN = 'ADMIN',
  DISASTER_OFFICER = 'DISASTER_OFFICER',
  CITIZEN = 'CITIZEN',
  VOLUNTEER = 'VOLUNTEER',
  HOSPITAL = 'HOSPITAL',
  POLICE = 'POLICE',
  FIRE_DEPARTMENT = 'FIRE_DEPARTMENT',
  NGO = 'NGO',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
}

export class User extends Model {
  public id!: string;
  public email!: string;
  public passwordHash!: string;
  public firstName!: string;
  public lastName!: string;
  public phoneNumber!: string;
  public role!: UserRole;
  public status!: UserStatus;
  public availability!: string | null;
  public profilePicture!: string | null;
  public district!: string | null;
  public state!: string | null;
  public refreshToken!: string | null;
  public passwordResetToken!: string | null;
  public passwordResetExpires!: Date | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    passwordHash: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    firstName: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    lastName: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    phoneNumber: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM(...Object.values(UserRole)),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(UserStatus)),
      allowNull: false,
      defaultValue: UserStatus.ACTIVE,
    },
    availability: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: 'AVAILABLE',
    },
    profilePicture: {
      type: DataTypes.STRING(1000),
      allowNull: true,
      defaultValue: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    },
    district: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    state: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    refreshToken: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    passwordResetToken: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    passwordResetExpires: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'users',
    underscored: true,
    timestamps: true,
  }
);

export default User;
