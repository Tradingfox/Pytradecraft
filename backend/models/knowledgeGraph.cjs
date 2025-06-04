const { DataTypes } = require('sequelize');
const sequelize = require('../config/database.cjs');
const User = require('./user.cjs');

/**
 * KnowledgeGraphNode model for storing nodes in a knowledge graph
 */
const KnowledgeGraphNode = sequelize.define('KnowledgeGraphNode', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  label: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  properties: {
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
});

/**
 * KnowledgeGraphEdge model for storing edges between nodes in a knowledge graph
 */
const KnowledgeGraphEdge = sequelize.define('KnowledgeGraphEdge', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  sourceId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'KnowledgeGraphNodes',
      key: 'id',
    },
  },
  targetId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'KnowledgeGraphNodes',
      key: 'id',
    },
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  properties: {
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
});

// Define relationships
User.hasMany(KnowledgeGraphNode);
KnowledgeGraphNode.belongsTo(User);

User.hasMany(KnowledgeGraphEdge);
KnowledgeGraphEdge.belongsTo(User);

KnowledgeGraphNode.hasMany(KnowledgeGraphEdge, {
  foreignKey: 'sourceId',
  as: 'outgoingEdges',
});

KnowledgeGraphNode.hasMany(KnowledgeGraphEdge, {
  foreignKey: 'targetId',
  as: 'incomingEdges',
});

KnowledgeGraphEdge.belongsTo(KnowledgeGraphNode, {
  foreignKey: 'sourceId',
  as: 'source',
});

KnowledgeGraphEdge.belongsTo(KnowledgeGraphNode, {
  foreignKey: 'targetId',
  as: 'target',
});

module.exports = { KnowledgeGraphNode, KnowledgeGraphEdge }; 