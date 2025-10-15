const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME || 'foodtruck_db',
  process.env.DB_USER || 'foodtruck_admin', 
  process.env.DB_PASSWORD || 'foodtruck_password',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

// 연결 테스트
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ PostgreSQL 데이터베이스 연결 성공');
  } catch (error) {
    console.error('❌ PostgreSQL 연결 실패:', error.message);
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


