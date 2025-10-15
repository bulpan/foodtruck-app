const express = require('express');
const router = express.Router();
const { FCMToken, PushNotification } = require('../models');
const { auth } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const pushService = require('../services/pushService');
const { Op } = require('sequelize');

// 환경 설정
const config = {
  isDevelopment: process.env.NODE_ENV === 'development'
};

// 푸시 알림 발송 (관리자용)
router.post('/send', [
  auth,
  validate(schemas.pushNotification)
], async (req, res) => {
  try {
    const { title, body, data, scheduledAt, target } = req.body;

    // 활성화된 FCM 토큰들 조회 (대상별 필터링)
    let whereCondition = { isActive: true };
    
    // 대상별 필터링 (선택사항)
    if (target && target !== 'all') {
      whereCondition.deviceType = target;
    }

    const fcmTokens = await FCMToken.findAll({ 
      where: whereCondition,
      attributes: ['token', 'deviceType']
    });

    if (fcmTokens.length === 0) {
      return res.status(400).json({
        error: '발송 가능한 활성 토큰이 없습니다'
      });
    }

    // 푸시 알림 이력 생성
    const notification = await PushNotification.create({
      adminId: req.admin.id,
      title,
      body,
      data: data || {},
      targetCount: fcmTokens.length,
      status: 'pending',
      scheduledAt: scheduledAt || new Date()
    });

    // 스케줄된 발송인 경우 저장만 하고 즉시 발송하지 않음
    if (scheduledAt && new Date(scheduledAt) > new Date()) {
      return res.json({
        message: '푸시 알림이 예약되었습니다',
        notification: {
          id: notification.id,
          title: notification.title,
          body: notification.body,
          scheduledAt: notification.scheduledAt,
          status: notification.status
        }
      });
    }

    // 즉시 발송 처리
    try {
      const tokensByType = {
        ios: fcmTokens.filter(t => t.deviceType === 'ios').map(t => t.token),
        android: fcmTokens.filter(t => t.deviceType === 'android').map(t => t.token)
      };

      const result = await pushService.sendPushNotification({
        title,
        body,
        data: data || {},
        tokens: tokensByType,
        adminId: req.admin.id,
        target: target || 'all'
      });

      // 발송 결과 업데이트
      await notification.update({
        sentCount: result.successCount,
        failedCount: result.failureCount,
        status: result.failureCount > 0 ? 'partial' : 'sent',
        sentAt: new Date()
      });

      res.json({
        message: `푸시 알림이 ${result.successCount}명에게 발송되었습니다`,
        notification: {
          id: notification.id,
          title: notification.title,
          body: notification.body,
          targetCount: notification.targetCount,
          sentCount: notification.sentCount,
          failedCount: notification.failedCount,
          status: notification.status,
          sentAt: notification.sentAt
        }
      });
    } catch (pushError) {
      console.error('Push sending error:', pushError);
      
      await notification.update({
        status: 'failed',
        sentAt: new Date()
      });

      res.status(500).json({
        error: '푸시 알림 발송 중 오류가 발생했습니다'
      });
    }
  } catch (error) {
    console.error('Send push notification error:', error);
    console.error('Request body:', req.body);
    console.error('Request headers:', req.headers);
    res.status(500).json({
      error: '푸시 알림 처리 중 오류가 발생했습니다',
      details: config.isDevelopment ? error.message : undefined
    });
  }
});

// 푸시 알림 발송 이력 조회 (관리자용)
router.get('/history', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const notifications = await PushNotification.findAndCountAll({
      where: { adminId: req.admin.id },
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      notifications: notifications.rows.map(notification => ({
        id: notification.id,
        title: notification.title,
        body: notification.body,
        targetCount: notification.targetCount,
        sentCount: notification.sentCount,
        failedCount: notification.failedCount,
        status: notification.status,
        scheduledAt: notification.scheduledAt,
        sentAt: notification.sentAt,
        createdAt: notification.createdAt
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: notifications.count,
        pages: Math.ceil(notifications.count / limit)
      }
    });
  } catch (error) {
    console.error('Get push history error:', error);
    res.status(500).json({
      error: '푸시 알림 이력 조회 중 오류가 발생했습니다'
    });
  }
});

// 특정 푸시 알림 상세 조회
router.get('/history/:id', auth, async (req, res) => {
  try {
    const notification = await PushNotification.findOne({
      where: { 
        id: req.params.id,
        adminId: req.admin.id 
      }
    });

    if (!notification) {
      return res.status(404).json({
        error: '푸시 알림을 찾을 수 없습니다'
      });
    }

    res.json({
      notification: {
        id: notification.id,
        title: notification.title,
        body: notification.body,
        data: notification.data,
        targetCount: notification.targetCount,
        sentCount: notification.sentCount,
        failedCount: notification.failedCount,
        status: notification.status,
        scheduledAt: notification.scheduledAt,
        sentAt: notification.sentAt,
        createdAt: notification.createdAt,
        updatedAt: notification.updatedAt
      }
    });
  } catch (error) {
    console.error('Get push detail error:', error);
    res.status(500).json({
      error: '푸시 알림 상세 조회 중 오류가 발생했습니다'
    });
  }
});

// 발송 통계 조회
router.get('/stats', auth, async (req, res) => {
  try {
    const { Op } = require('sequelize');
    const stats = await PushNotification.findAll({
      where: { adminId: req.admin.id },
      attributes: [
        [require('sequelize').fn('COUNT', '*'), 'totalCount'],
        [require('sequelize').fn('SUM', 'sentCount'), 'totalSent'],
        [require('sequelize').fn('SUM', 'failedCount'), 'totalFailed'],
        [require('sequelize').fn('COUNT', require('sequelize').col('status')), 'statusDistribution']
      ],
      group: ['status'],
      raw: true
    });

    res.json({
      stats: {
        totalNotifications: stats.reduce((sum, stat) => sum + parseInt(stat.totalCount), 0),
        totalSent: stats.reduce((sum, stat) => sum + (parseInt(stat.totalSent) || 0), 0),
        totalFailed: stats.reduce((sum, stat) => sum + (parseInt(stat.totalFailed) || 0), 0),
        statusDistribution: stats.map(stat => ({
          status: stat.status,
          count: parseInt(stat.totalCount)
        }))
      }
    });
  } catch (error) {
    console.error('Get push stats error:', error);
    res.status(500).json({
      error: '푸시 알림 통계 조회 중 오류가 발생했습니다'
    });
  }
});

// 새로운 푸시 발송 내역 조회 (상세 정보 포함)
router.get('/history-detailed', auth, async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const histories = await pushService.getPushHistory(req.admin.id, parseInt(limit));
    
    res.json({
      histories: histories.map(history => ({
        id: history.id,
        title: history.title,
        body: history.body,
        target: history.target,
        createdAt: history.createdAt,
        iosTokensCount: history.iosTokensCount,
        iosSuccessCount: history.iosSuccessCount,
        iosFailureCount: history.iosFailureCount,
        androidTokensCount: history.androidTokensCount,
        androidSuccessCount: history.androidSuccessCount,
        androidFailureCount: history.androidFailureCount,
        totalTokensCount: history.totalTokensCount,
        totalSuccessCount: history.totalSuccessCount,
        totalFailureCount: history.totalFailureCount,
        successRate: history.successRate,
        status: history.status
      }))
    });
  } catch (error) {
    console.error('Get detailed push history error:', error);
    res.status(500).json({
      error: '푸시 발송 내역 조회 중 오류가 발생했습니다'
    });
  }
});

// 최근 2주간 발송한 푸시 알림 목록 조회 (빠른 재발송용)
router.get('/recent', auth, async (req, res) => {
  try {
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    
    const recentNotifications = await PushNotification.findAll({
      where: { 
        adminId: req.admin.id,
        createdAt: {
          [Op.gte]: twoWeeksAgo
        },
        status: {
          [Op.in]: ['sent', 'partial']
        }
      },
      order: [['createdAt', 'DESC']],
      limit: 4,
      attributes: ['id', 'title', 'body', 'data', 'createdAt']
    });
    
    res.json({
      recentNotifications: recentNotifications.map(notification => ({
        id: notification.id,
        title: notification.title,
        body: notification.body,
        data: notification.data,
        createdAt: notification.createdAt
      }))
    });
  } catch (error) {
    console.error('Get recent push notifications error:', error);
    res.status(500).json({
      error: '최근 푸시 알림 조회 중 오류가 발생했습니다'
    });
  }
});

// 금일 푸시 발송 건수 조회
router.get('/today-count', auth, async (req, res) => {
  try {
    const count = await pushService.getTodayPushCount(req.admin.id);
    
    res.json({
      todayPushCount: count
    });
  } catch (error) {
    console.error('Get today push count error:', error);
    res.status(500).json({
      error: '금일 푸시 발송 건수 조회 중 오류가 발생했습니다'
    });
  }
});

module.exports = router;
