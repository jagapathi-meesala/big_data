import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/db';
import User from './User';

export enum ResourceType {
  FOOD = 'FOOD',
  WATER = 'WATER',
  MEDICINE = 'MEDICINE',
  AMBULANCE = 'AMBULANCE',
  FIRE_TRUCK = 'FIRE_TRUCK',
  RESCUE_TEAM = 'RESCUE_TEAM',
  POLICE_UNIT = 'POLICE_UNIT',
  SHELTER_CAPACITY = 'SHELTER_CAPACITY',
  HOSPITAL_BED = 'HOSPITAL_BED',
}

export enum ResourceStatus {
  AVAILABLE = 'AVAILABLE',
  ALLOCATED = 'ALLOCATED',
  IN_TRANSIT = 'IN_TRANSIT',
  MAINTENANCE = 'MAINTENANCE',
}

export class Resource extends Model {
  public id!: string;
  public ownerId!: string;
  public type!: ResourceType;
  public quantity!: number;
  public status!: ResourceStatus;
  public geom!: any;
  public name!: string | null;
  public icuBeds!: number | null;
  public doctorsCount!: number | null;
  public ambulancesCount!: number | null;
  public occupancy!: number | null;
  public electricityStatus!: string | null;
  public medicalFacilityStatus!: string | null;
  public district!: string | null;
  public state!: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Resource.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    ownerId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: User,
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    type: {
      type: DataTypes.ENUM(...Object.values(ResourceType)),
      allowNull: false,
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 0,
      },
    },
    status: {
      type: DataTypes.ENUM(...Object.values(ResourceStatus)),
      allowNull: false,
      defaultValue: ResourceStatus.AVAILABLE,
    },
    geom: {
      type: DataTypes.GEOMETRY('POINT', 4326),
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    icuBeds: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    doctorsCount: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    ambulancesCount: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    occupancy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    electricityStatus: {
      type: DataTypes.STRING(100),
      allowNull: true,
      defaultValue: 'CONNECTED',
    },
    medicalFacilityStatus: {
      type: DataTypes.STRING(100),
      allowNull: true,
      defaultValue: 'FUNCTIONAL',
    },
    district: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    state: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'resources',
    underscored: true,
    timestamps: true,
  }
);

Resource.belongsTo(User, { as: 'Owner', foreignKey: 'owner_id' });

export default Resource;
