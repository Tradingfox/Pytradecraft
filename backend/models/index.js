const sequelize = require('../config/database');
const User = require('./user');
const { KnowledgeGraphNode, KnowledgeGraphEdge } = require('./knowledgeGraph');
const { Algorithm, BacktestResult } = require('./algorithm');
const defineIndicator = require('./indicator'); // Require the indicator model definition
const sampleStrategies = require('./sampleStrategies');

const db = {
  sequelize,
  Sequelize: sequelize.Sequelize, // The Sequelize library instance
  User,
  KnowledgeGraphNode,
  KnowledgeGraphEdge,
  Algorithm,
  BacktestResult,
  // Indicator will be added after initialization
  sampleStrategies
};

// Initialize models that are defined as functions
db.Indicator = defineIndicator(sequelize);
// Assuming User, Algorithm, etc., are also initialized similarly if they follow the same pattern,
// but the require statements for them are direct, implying they might be structured differently.
// For this task, focusing on Indicator.

// Define Associations
// User and Algorithm associations (example, assuming they might not be in their respective files as per comments)
if (db.User.associate) { // Check if associate method exists
    db.User.associate(db);
}
if (db.Algorithm.associate) {
    db.Algorithm.associate(db);
}
if (db.BacktestResult.associate) {
    db.BacktestResult.associate(db);
}
if (db.KnowledgeGraphNode.associate) {
    db.KnowledgeGraphNode.associate(db);
}
if (db.KnowledgeGraphEdge.associate) {
    db.KnowledgeGraphEdge.associate(db);
}

// Indicator associations
if (db.Indicator.associate) {
  db.Indicator.associate(db); // This calls Indicator.belongsTo(models.User)
}
// Ensure User.hasMany(Indicator) is also set up.
// It's often cleaner to define both sides of association in one place or consistently.
// If User model definition doesn't include hasMany(Indicator), add it here.
// For this exercise, let's assume User model might not have it yet.
db.User.hasMany(db.Indicator, {
  foreignKey: 'UserId',
  as: 'indicators' // Optional alias
});


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
