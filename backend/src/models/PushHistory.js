const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PushHistory = sequelize.define('PushHistory', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  adminId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'admins',
      key: 'id'
    }
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  body: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  target: {
    type: DataTypes.ENUM('all', 'android', 'ios'),
    allowNull: false,
    defaultValue: 'all'
  },
  iosTokensCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  iosSuccessCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  iosFailureCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  androidTokensCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  androidSuccessCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  androidFailureCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  totalTokensCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  totalSuccessCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  totalFailureCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  successRate: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  status: {
    type: DataTypes.ENUM('success', 'partial', 'failed'),
    allowNull: false,
    defaultValue: 'success'
  },
  errorMessage: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'push_histories',
  timestamps: true,
  indexes: [
    {
      fields: ['adminId']
    },
    {
      fields: ['createdAt']
    },
    {
      fields: ['status']
    }
  ]
});

module.exports = PushHistory;

