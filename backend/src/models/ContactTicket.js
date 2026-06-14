const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ContactTicket = sequelize.define('ContactTicket', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  publicId: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    allowNull: false,
    unique: true
  },
  accessKey: {
    type: DataTypes.STRING(64),
    allowNull: false,
    unique: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  contact: {
    type: DataTypes.STRING(120),
    allowNull: true
  },
  userId: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  source: {
    type: DataTypes.ENUM('web', 'app', 'kiosk', 'admin', 'unknown'),
    allowNull: false,
    defaultValue: 'web'
  },
  status: {
    type: DataTypes.ENUM('open', 'answered', 'closed'),
    allowNull: false,
    defaultValue: 'open'
  },
  fcmToken: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  lastMessagePreview: {
    type: DataTypes.STRING(240),
    allowNull: true
  },
  lastMessageAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'contact_tickets',
  timestamps: true
});

module.exports = ContactTicket;
