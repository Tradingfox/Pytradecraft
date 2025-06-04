const { DataTypes } = require('sequelize');
const sequelize = require('../config/database.cjs');
const User = require('./user.cjs');

/**
 * Algorithm model for storing trading algorithms
 * This model corresponds to the Algorithm interface in the frontend
 */
const Algorithm = sequelize.define('Algorithm', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'Algorithm name cannot be empty',
      },
    },
  },
  code: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'Algorithm code cannot be empty',
      },
    },
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
});

// Define relationships
User.hasMany(Algorithm);
Algorithm.belongsTo(User);

/**
 * BacktestResult model for storing backtest results
 */
const BacktestResult = sequelize.define('BacktestResult', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  initialCapital: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  finalEquity: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  parameters: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  results: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  metrics: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  generatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
});

// Define relationships
User.hasMany(BacktestResult);
BacktestResult.belongsTo(User);

Algorithm.hasMany(BacktestResult);
BacktestResult.belongsTo(Algorithm);

module.exports = { Algorithm, BacktestResult }; 