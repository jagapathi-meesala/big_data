import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/db';
import Incident from './Incident';
import Resource from './Resource';

export class Allocation extends Model {
  public id!: string;
  public incidentId!: string;
  public resourceId!: string;
  public quantityAllocated!: number;
  public optimizedRouteGeom!: any | null;
  public status!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Allocation.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    incidentId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: Incident,
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    resourceId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: Resource,
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    quantityAllocated: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
      },
    },
    optimizedRouteGeom: {
      type: DataTypes.GEOMETRY('LINESTRING', 4326),
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'ACTIVE',
    },
  },
  {
    sequelize,
    tableName: 'allocations',
    underscored: true,
    timestamps: true,
  }
);

Allocation.belongsTo(Incident, { as: 'Incident', foreignKey: 'incident_id' });
Allocation.belongsTo(Resource, { as: 'Resource', foreignKey: 'resource_id' });

export default Allocation;
