'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Indicator extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Indicator.belongsTo(models.User, {
        foreignKey: 'UserId',
        onDelete: 'CASCADE',
      });
    }
  }
  Indicator.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    code: {
      type: DataTypes.TEXT, // Can be lengthy for indicator scripts
      allowNull: false,
    },
    parameters: {
      type: DataTypes.JSON, // Store default params or param definitions
      allowNull: true,
    },
    UserId: { // Foreign key for User
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Users', // Name of the Users table
        key: 'id',
      },
    },
  }, {
    sequelize,
    modelName: 'Indicator',
  });
  return Indicator;
};
