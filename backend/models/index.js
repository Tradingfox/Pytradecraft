const sequelize = require('../config/database');
const User = require('./user');
const { KnowledgeGraphNode, KnowledgeGraphEdge } = require('./knowledgeGraph');
const { Algorithm, BacktestResult } = require('./algorithm');
const sampleStrategies = require('./sampleStrategies');

// Associations are defined in the model files
// User.hasMany(Algorithm) - defined in algorithm.js
// Algorithm.belongsTo(User) - defined in algorithm.js
// User.hasMany(KnowledgeGraphNode) - defined in knowledgeGraph.js
// KnowledgeGraphNode.belongsTo(User) - defined in knowledgeGraph.js

const db = {
  sequelize,
  Sequelize: sequelize.Sequelize, // The Sequelize library instance
  User,
  KnowledgeGraphNode,
  KnowledgeGraphEdge,
  Algorithm,
  BacktestResult,
  sampleStrategies
};

// Function to initialize/sync database
// In a real application, you might use migrations (like Sequelize CLI migrations)
// for more robust schema management in production.
db.syncDb = async (options = {}) => {
  try {
    // The { force: true } option will drop tables before re-creating them.
    // Use with caution, especially in production.
    // For development, it can be useful for quickly resetting the schema.
    // Consider using { alter: true } for less destructive updates in development.
    await sequelize.sync(options);
    console.log('[DB Models] Database synchronized successfully.');
  } catch (error) {
    console.error('[DB Models] Error synchronizing database:', error);
    throw error; // Re-throw to allow calling code to handle
  }
};

module.exports = db;
