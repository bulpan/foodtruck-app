const { initializeDatabase, sequelize } = require('../config/database');
const { Admin, Menu, Location, FCMToken, PushNotification } = require('../models');

// 데이터베이스 마이그레이션 및 초기화
async function migrate() {
  try {
    console.log('🔄 데이터베이스 마이그레이션 시작...');
    
    // 데이터베이스 연결 및 동기화
    await initializeDatabase();
    
    // 기본 관리자 계정 생성 또는 업데이트
    const existingAdmin = await Admin.findOne({ where: { username: 'goodman' } });
    if (!existingAdmin) {
      // 기존 admin 계정이 있으면 업데이트, 없으면 새로 생성
      const oldAdmin = await Admin.findOne({ where: { username: 'admin' } });
      if (oldAdmin) {
        oldAdmin.username = 'goodman';
        oldAdmin.password = '!thdbs1624';
        await oldAdmin.save();
        console.log('✅ 관리자 계정이 업데이트되었습니다');
        console.log('👤 사용자명: goodman');
        console.log('🔐 비밀번호: !thdbs1624');
      } else {
      await Admin.create({
          username: 'goodman',
          password: '!thdbs1624',
        email: 'admin@foodtruck.com',
        shopName: '유미네 곱창트럭',
        shopDescription: '신선한 곱창으로 만드는 맛있는 음식',
        phoneNumber: '010-1234-5678',
        kakaoTalkId: 'foodtruck_admin',
        isActive: true
      });
      console.log('✅ 기본 관리자 계정이 생성되었습니다');
        console.log('👤 사용자명: goodman');
        console.log('🔐 비밀번호: !thdbs1624');
      }
    } else {
      // goodman 계정이 이미 있으면 비밀번호만 업데이트 (비밀번호 변경 플래그 설정)
      existingAdmin.password = '!thdbs1624';
      existingAdmin.changed('password', true); // 비밀번호 변경 플래그 명시적 설정
      await existingAdmin.save();
      console.log('✅ 관리자 비밀번호가 업데이트되었습니다');
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


