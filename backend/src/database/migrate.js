const { initializeDatabase, sequelize } = require('../config/database');
const { Admin, Menu, Location, FCMToken, PushNotification } = require('../models');

// 데이터베이스 마이그레이션 및 초기화
async function migrate() {
  try {
    console.log('🔄 데이터베이스 마이그레이션 시작...');
    
    // 데이터베이스 연결 및 동기화
    await initializeDatabase();
    
    // 기본 관리자 계정 생성 (비밀번호: admin123)
    const existingAdmin = await Admin.findOne({ where: { username: 'admin' } });
    if (!existingAdmin) {
      await Admin.create({
        username: 'admin',
        password: 'admin123',
        email: 'admin@foodtruck.com',
        shopName: '유미네 곱창트럭',
        shopDescription: '신선한 곱창으로 만드는 맛있는 음식',
        phoneNumber: '010-1234-5678',
        kakaoTalkId: 'foodtruck_admin',
        isActive: true
      });
      
      console.log('✅ 기본 관리자 계정이 생성되었습니다');
      console.log('👤 사용자명: admin');
      console.log('🔐 비밀번호: admin123');
    }
    
    console.log('✅ 데이터베이스 마이그레이션이 완료되었습니다');
  } catch (error) {
    console.error('❌ 데이터베이스 마이그레이션 실패:', error);
    process.exit(1);
  }
}

// 스크립트로 직접 실행되는 경우 마이그레이션 실행
if (require.main === module) {
  migrate().then(() => {
    console.log('🚀 마이그레이션 완료. 서버를 시작할 준비가 되었습니다.');
    process.exit(0);
  });
}

module.exports = migrate;


