const admin = require('firebase-admin');
const path = require('path');
const PushHistory = require('../models/PushHistory');

// 환경별 Firebase 설정
const getFirebaseConfig = () => {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './serviceAccount.json';
  
  // 프로덕션 환경에서는 환경변수에서 직접 설정 가능
  if (nodeEnv === 'production' && process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } catch (error) {
      console.warn('환경변수 FIREBASE_SERVICE_ACCOUNT 파싱 실패, 파일 경로 사용');
    }
  }
  
  // 파일 경로 사용 (개발 환경 또는 환경변수 파싱 실패 시)
  const fullPath = path.resolve(serviceAccountPath);
  return require(fullPath);
};

// Firebase Admin SDK 초기화
if (!admin.apps.length) {
  try {
    const serviceAccount = getFirebaseConfig();
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.FIREBASE_PROJECT_ID || 'truckspot-9031e'
    });
    console.log('✅ Firebase Admin SDK 초기화 성공');
  } catch (error) {
    console.error('❌ Firebase Admin SDK 초기화 실패:', error.message);
    console.log('💡 Firebase 설정을 확인해주세요:');
    console.log('   - serviceAccount.json 파일이 존재하는지 확인');
    console.log('   - FIREBASE_SERVICE_ACCOUNT_PATH 환경변수 설정');
    console.log('   - FIREBASE_PROJECT_ID 환경변수 설정');
  }
}

class PushService {
  /**
   * 푸시 알림 발송
   * @param {Object} options - 발송 옵션
   * @param {string} options.title - 제목
   * @param {string} options.body - 내용
   * @param {Object} options.data - 추가 데이터
   * @param {Object} options.tokens - 디바이스별 토큰 목록 {ios: [], android: []}
   * @param {string} options.adminId - 관리자 ID
   * @param {string} options.target - 대상 (all, android, ios)
   */
  async sendPushNotification(options) {
    const { title, body, data = {}, tokens = {}, adminId, target = 'all' } = options;
    
    console.log('🚀 푸시 알림 발송 시작:', {
      title,
      body,
      tokenCounts: {
        ios: tokens.ios?.length || 0,
        android: tokens.android?.length || 0
      }
    });
    
    try {
      if (!tokens.ios?.length && !tokens.android?.length) {
        throw new Error('발송할 토큰이 없습니다');
      }

      const promises = [];
      let successCount = 0;
      let failureCount = 0;

      // iOS 토큰 발송
      if (tokens.ios?.length > 0) {
        console.log(`📱 iOS 토큰 ${tokens.ios.length}개 발송 시작`);
        const iosPromises = tokens.ios.map(async (token) => {
          try {
            console.log(`📤 iOS 푸시 발송 시도: ${token.substring(0, 20)}...`);
            const result = await admin.messaging().send({
              token,
              notification: {
                title,
                body
              },
              data: {
                ...Object.keys(data).reduce((acc, key) => {
                  acc[key] = data[key].toString();
                  return acc;
                }, {}),
                click_action: 'FLUTTER_NOTIFICATION_CLICK'
              },
              apns: {
                headers: {
                  'apns-priority': '10'
                },
                payload: {
                  aps: {
                    sound: 'default',
                    badge: 1,
                    alert: {
                      title: title,
                      body: body
                    }
                  }
                }
              }
            });
            console.log(`✅ iOS 푸시 발송 성공: ${token.substring(0, 20)}... (MessageId: ${result})`);
            return { success: true, token, messageId: result };
          } catch (error) {
            console.error(`❌ iOS 푸시 발송 실패 (${token.substring(0, 20)}...):`, {
              error: error.message,
              code: error.code,
              details: error.details,
              stack: error.stack
            });
            return { success: false, token, error: error.message, code: error.code };
          }
        });
        promises.push(...iosPromises);
      }

      // Android 토큰 발송
      if (tokens.android?.length > 0) {
        console.log(`🤖 Android 토큰 ${tokens.android.length}개 발송 시작`);
        const androidPromises = tokens.android.map(async (token) => {
          try {
            console.log(`📤 Android 푸시 발송 시도: ${token.substring(0, 20)}...`);
            const result = await admin.messaging().send({
              token,
              notification: {
                title,
                body
              },
              data: {
                ...Object.keys(data).reduce((acc, key) => {
                  acc[key] = data[key].toString();
                  return acc;
                }, {}),
                click_action: 'FLUTTER_NOTIFICATION_CLICK'
              },
              android: {
                notification: {
                  title: title,
                  body: body,
                  sound: 'default',
                  priority: 'high',
                  channelId: 'foodtruck_notifications',
                  clickAction: 'FLUTTER_NOTIFICATION_CLICK',
                  icon: 'ic_notification',
                  color: '#FF6B35',
                  tag: 'foodtruck_notification'
                },
                priority: 'high',
                ttl: 3600000
              }
            });
            console.log(`✅ Android 푸시 발송 성공: ${token.substring(0, 20)}... (MessageId: ${result})`);
            return { success: true, token, messageId: result };
          } catch (error) {
            console.error(`❌ Android 푸시 발송 실패 (${token.substring(0, 20)}...):`, {
              error: error.message,
              code: error.code,
              details: error.details,
              stack: error.stack
            });
            return { success: false, token, error: error.message, code: error.code };
          }
        });
        promises.push(...androidPromises);
      }

      // 모든 발송 결과 처리
      const results = await Promise.all(promises);
      
      results.forEach(result => {
        if (result.success) {
          successCount++;
        } else {
          failureCount++;
        }
      });

      const finalResult = {
        successCount,
        failureCount,
        totalTokens: tokens.ios?.length + tokens.android?.length,
        results: results.map(r => ({
          success: r.success,
          token: r.token ? r.token.substring(0, 20) + '...' : null,
          error: r.error || null,
          code: r.code || null,
          messageId: r.messageId || null
        }))
      };

      console.log('📊 푸시 발송 최종 결과:', {
        totalTokens: finalResult.totalTokens,
        successCount: finalResult.successCount,
        failureCount: finalResult.failureCount,
        successRate: finalResult.totalTokens > 0 ? 
          ((finalResult.successCount / finalResult.totalTokens) * 100).toFixed(1) + '%' : '0%',
        detailedResults: finalResult.results
      });

      // 푸시 발송 내역을 데이터베이스에 저장
      if (adminId) {
        try {
          const successRate = finalResult.totalTokens > 0 ? 
            ((finalResult.successCount / finalResult.totalTokens) * 100) : 0;
          
          let status = 'success';
          if (finalResult.failureCount > 0 && finalResult.successCount > 0) {
            status = 'partial';
          } else if (finalResult.failureCount > 0) {
            status = 'failed';
          }

          await PushHistory.create({
            adminId,
            title,
            body,
            target,
            iosTokensCount: tokens.ios?.length || 0,
            iosSuccessCount: results.filter(r => r.success && tokens.ios?.includes(r.token)).length,
            iosFailureCount: results.filter(r => !r.success && tokens.ios?.includes(r.token)).length,
            androidTokensCount: tokens.android?.length || 0,
            androidSuccessCount: results.filter(r => r.success && tokens.android?.includes(r.token)).length,
            androidFailureCount: results.filter(r => !r.success && tokens.android?.includes(r.token)).length,
            totalTokensCount: finalResult.totalTokens,
            totalSuccessCount: finalResult.successCount,
            totalFailureCount: finalResult.failureCount,
            successRate: successRate,
            status: status
          });

          console.log('✅ 푸시 발송 내역이 데이터베이스에 저장되었습니다');
        } catch (error) {
          console.error('❌ 푸시 발송 내역 저장 실패:', error);
        }
      }

      return finalResult;

    } catch (error) {
      console.error('푸시 알림 발송 오류:', error);
      throw new Error('푸시 알림 발송 중 오류가 발생했습니다');
    }
  }

  /**
   * 토픽 구독 푸시 발송 (미래 확장용)
   */
  async sendToTopic(topic, title, body, data = {}) {
    try {
      await admin.messaging().send({
        topic,
        notification: { title, body },
        data: Object.keys(data).reduce((acc, key) => {
          acc[key] = data[key].toString();
          return acc;
        }, {})
      });
      
      return { success: true };
    } catch (error) {
      console.error('토픽 푸시 발송 실패:', error);
      throw error;
    }
  }

  /**
   * 토큰 유효성 검증
   */
  async validateToken(token) {
    try {
      await admin.messaging().send({
        token,
        data: { test: 'validation' }
      }, true);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 푸시 발송 내역 조회
   * @param {string} adminId - 관리자 ID
   * @param {number} limit - 조회할 개수 (기본값: 10)
   */
  async getPushHistory(adminId, limit = 10) {
    try {
      const histories = await PushHistory.findAll({
        where: { adminId },
        order: [['createdAt', 'DESC']],
        limit: limit,
        attributes: [
          'id', 'title', 'body', 'target', 'createdAt',
          'iosTokensCount', 'iosSuccessCount', 'iosFailureCount',
          'androidTokensCount', 'androidSuccessCount', 'androidFailureCount',
          'totalTokensCount', 'totalSuccessCount', 'totalFailureCount',
          'successRate', 'status'
        ]
      });

      return histories;
    } catch (error) {
      console.error('푸시 발송 내역 조회 오류:', error);
      throw new Error('푸시 발송 내역 조회 중 오류가 발생했습니다');
    }
  }

  /**
   * 금일 푸시 발송 건수 조회
   * @param {string} adminId - 관리자 ID
   */
  async getTodayPushCount(adminId) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const count = await PushHistory.count({
        where: {
          adminId,
          createdAt: {
            [require('sequelize').Op.gte]: today,
            [require('sequelize').Op.lt]: tomorrow
          }
        }
      });

      return count;
    } catch (error) {
      console.error('금일 푸시 발송 건수 조회 오류:', error);
      throw new Error('금일 푸시 발송 건수 조회 중 오류가 발생했습니다');
    }
  }
}

module.exports = new PushService();
