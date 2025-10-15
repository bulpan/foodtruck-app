const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Location = sequelize.define('Location', {
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
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  address: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  openTime: {
    type: DataTypes.TIME,
    allowNull: true
  },
  closeTime: {
    type: DataTypes.TIME,
    allowNull: true
  },
  notice: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'locations',
  timestamps: true
});

module.exports = Location;


