import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/db';
import User from './User';

export enum SeverityLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum IncidentStatus {
  REPORTED = 'REPORTED',
  VERIFIED = 'VERIFIED',
  DISPATCHED = 'DISPATCHED',
  RESOLVED = 'RESOLVED',
  FALSE_ALARM = 'FALSE_ALARM',
}

export enum DisasterType {
  FLOOD = 'FLOOD',
  FIRE = 'FIRE',
  EARTHQUAKE = 'EARTHQUAKE',
  HURRICANE = 'HURRICANE',
  LANDSLIDE = 'LANDSLIDE',
  OTHER = 'OTHER',
}

export class Incident extends Model {
  public id!: string;
  public reporterId!: string | null;
  public title!: string;
  public description!: string | null;
  public severity!: SeverityLevel;
  public status!: IncidentStatus;
  public disasterType!: DisasterType;
  public imageUrl!: string | null;
  public geom!: any;
  public district!: string | null;
  public state!: string | null;
  public assignedHospital!: string | null;
  public assignedVolunteer!: string | null;
  public estimatedDamage!: number | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Incident.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    reporterId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: User,
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    severity: {
      type: DataTypes.ENUM(...Object.values(SeverityLevel)),
      allowNull: false,
      defaultValue: SeverityLevel.MEDIUM,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(IncidentStatus)),
      allowNull: false,
      defaultValue: IncidentStatus.REPORTED,
    },
    disasterType: {
      type: DataTypes.ENUM(...Object.values(DisasterType)),
      allowNull: false,
      defaultValue: DisasterType.OTHER,
    },
    imageUrl: {
      type: DataTypes.STRING(1000),
      allowNull: true,
    },
    geom: {
      type: DataTypes.GEOMETRY('POINT', 4326),
      allowNull: false,
    },
    district: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    state: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    assignedHospital: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    assignedVolunteer: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    estimatedDamage: {
      type: DataTypes.FLOAT,
      allowNull: true,
      defaultValue: 0.0,
    },
  },
  {
    sequelize,
    tableName: 'incidents',
    underscored: true,
    timestamps: true,
  }
);

Incident.belongsTo(User, { as: 'Reporter', foreignKey: 'reporter_id' });

export default Incident;
