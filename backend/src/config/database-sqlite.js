const { Sequelize } = require('sequelize');
const path = require('path');

// 개발용 SQLite 설정 (Docker 없이 개발 가능)
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, '../../database.sqlite'),
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  define: {
    timestamps: true,
    underscored: false
  }
});

// 연결 테스트
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ SQLite 데이터베이스 연결 성공');
  } catch (error) {
    console.error('❌ SQLite 연결 실패:', error.message);
  }
};

// 초기화 함수
const initializeDatabase = async () => {
  try {
    await testConnection();
    await sequelize.sync({ alter: true });
    console.log('✅ 데이터베이스 동기화 완료');
  } catch (error) {
    console.error('❌ 데이터베이스 초기화 실패:', error.message);
  }
};

module.exports = {
  sequelize,
  testConnection,
  initializeDatabase
};



