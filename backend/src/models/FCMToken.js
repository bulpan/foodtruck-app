const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const FCMToken = sequelize.define('FCMToken', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  token: {
    type: DataTypes.STRING(500),
    allowNull: false,
    unique: true
  },
  deviceType: {
    type: DataTypes.ENUM('ios', 'android'),
    allowNull: false
  },
  deviceId: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  lastUsedAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'fcm_tokens',
  timestamps: true
});

module.exports = FCMToken;


