const { DataTypes } = require('sequelize');
const sequelize = require('../config/database.cjs');
const User = require('./user.cjs');

/**
 * Deployment model for storing algorithm deployments
 * This model corresponds to the AlgorithmDeployment interface in the frontend
 */
const Deployment = sequelize.define('Deployment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  algorithmId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  algorithmName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  accountId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  accountName: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('pending', 'running', 'paused', 'stopped', 'error', 'completed'),
    allowNull: false,
    defaultValue: 'pending',
  },
  parameters: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {},
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  lastRunAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  errorMessage: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
});

/**
 * DeploymentLog model for storing logs from deployed algorithms
 */
const DeploymentLog = sequelize.define('DeploymentLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  deploymentId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  level: {
    type: DataTypes.ENUM('debug', 'info', 'warning', 'error'),
    allowNull: false,
    defaultValue: 'info',
  },
  timestamp: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
});

// Define relationships
User.hasMany(Deployment);
Deployment.belongsTo(User);

User.hasMany(DeploymentLog);
DeploymentLog.belongsTo(User);

Deployment.hasMany(DeploymentLog, {
  foreignKey: 'deploymentId',
  onDelete: 'CASCADE',
});
DeploymentLog.belongsTo(Deployment, {
  foreignKey: 'deploymentId',
});

module.exports = { Deployment, DeploymentLog }; 