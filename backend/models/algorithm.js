const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./user');

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

// Define a model for backtest results
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
  totalReturn: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  sharpeRatio: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  maxDrawdown: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  equityCurve: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Array of equity data points (date, value)'
  },
  metrics: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Array of performance metrics (name, value)'
  },
  logs: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Array of log messages'
  },
  trades: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Array of simulated trades'
  },
  generatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
});

// Define relationships for backtest results
Algorithm.hasMany(BacktestResult);
BacktestResult.belongsTo(Algorithm);
User.hasMany(BacktestResult);
BacktestResult.belongsTo(User);

module.exports = {
  Algorithm,
  BacktestResult
};