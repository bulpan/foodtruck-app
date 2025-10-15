const { sequelize } = require('../config/database');

// 모델들 임포트
const Admin = require('./Admin');
const Menu = require('./Menu');
const Location = require('./Location');
const FCMToken = require('./FCMToken');
const PushNotification = require('./PushNotification');
const PushHistory = require('./PushHistory');

// 관계 설정
Admin.hasMany(Menu, { foreignKey: 'adminId' });
Menu.belongsTo(Admin, { foreignKey: 'adminId' });

Admin.hasMany(Location, { foreignKey: 'adminId' });
Location.belongsTo(Admin, { foreignKey: 'adminId' });

Admin.hasMany(PushNotification, { foreignKey: 'adminId' });
PushNotification.belongsTo(Admin, { foreignKey: 'adminId' });

Admin.hasMany(PushHistory, { foreignKey: 'adminId' });
PushHistory.belongsTo(Admin, { foreignKey: 'adminId' });

module.exports = {
  sequelize,
  Admin,
  Menu,
  Location,
  FCMToken,
  PushNotification,
  PushHistory
};


