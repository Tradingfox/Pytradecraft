const { DataTypes } = require('sequelize');
const sequelize = require('../config/database.cjs');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: {
        msg: 'Username cannot be empty',
      },
      len: {
        args: [3, 50],
        msg: 'Username must be between 3 and 50 characters',
      },
    },
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: {
        msg: 'Must be a valid email address',
      },
      notEmpty: {
        msg: 'Email cannot be empty',
      },
    },
  },
  passwordHash: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  // Virtual field for password (not stored in DB)
  password: {
    type: DataTypes.VIRTUAL,
    set(value) {
      if (value && value.length >= 6) {
        const salt = bcrypt.genSaltSync(10);
        this.setDataValue('passwordHash', bcrypt.hashSync(value, salt));
      } else if (value) { // Only throw error if a value is provided but too short
        throw new Error('Password must be at least 6 characters long');
      }
    },
    validate: {
      isLongEnough(value) {
        // This validation runs on the virtual field.
        // The actual check for password presence before hashing is handled by allowNull: false on passwordHash
        // and the setter logic.
        if (this.isNewRecord && (!value || value.length < 6)) {
           // For new records, password is required.
           // For existing records, password might not be updated, so this check is conditional.
          throw new Error('Password must be at least 6 characters long.');
        }
      }
    }
  },
  firstName: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  lastName: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  apiKeys: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {},
  },
  preferences: {
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

// Instance method to verify password
User.prototype.verifyPassword = function(password) {
  return bcrypt.compareSync(password, this.passwordHash);
};

module.exports = User; 