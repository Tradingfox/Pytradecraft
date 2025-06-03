const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./user');

/**
 * KnowledgeGraph model for storing chat history and progress
 * This model creates a graph structure where nodes represent chat messages, algorithms,
 * or other entities, and edges represent relationships between them.
 */
const KnowledgeGraphNode = sequelize.define('KnowledgeGraphNode', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Type of node: message, algorithm, backtest, etc.'
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Content of the node, could be a message, algorithm code, etc.'
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Additional metadata for the node'
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  }
});

const KnowledgeGraphEdge = sequelize.define('KnowledgeGraphEdge', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Type of relationship: reply, reference, parent-child, etc.'
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Additional metadata for the edge'
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  }
});

// Define relationships
User.hasMany(KnowledgeGraphNode);
KnowledgeGraphNode.belongsTo(User);

// Self-referential relationship for nodes through edges
KnowledgeGraphNode.belongsToMany(KnowledgeGraphNode, {
  through: KnowledgeGraphEdge,
  as: 'sourceNode',
  foreignKey: 'sourceNodeId'
});

KnowledgeGraphNode.belongsToMany(KnowledgeGraphNode, {
  through: KnowledgeGraphEdge,
  as: 'targetNode',
  foreignKey: 'targetNodeId'
});

// Helper methods for common operations
KnowledgeGraphNode.prototype.addRelatedNode = async function(targetNode, relationType, metadata = {}) {
  const edge = await KnowledgeGraphEdge.create({
    type: relationType,
    metadata,
    sourceNodeId: this.id,
    targetNodeId: targetNode.id
  });
  return edge;
};

KnowledgeGraphNode.findByType = function(type, options = {}) {
  return KnowledgeGraphNode.findAll({
    where: { type },
    ...options
  });
};

KnowledgeGraphNode.findRelated = async function(nodeId, relationType = null) {
  const query = {
    include: [
      {
        model: KnowledgeGraphNode,
        as: 'targetNode',
        through: {
          where: relationType ? { type: relationType } : {}
        }
      }
    ],
    where: { id: nodeId }
  };
  
  return KnowledgeGraphNode.findOne(query);
};

module.exports = {
  KnowledgeGraphNode,
  KnowledgeGraphEdge
};