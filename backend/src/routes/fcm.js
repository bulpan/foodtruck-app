const express = require('express');
const router = express.Router();
const { FCMToken } = require('../models');
const { validate, schemas } = require('../middleware/validation');

// FCM 토큰 등록 (고객용 앱에서 호출)
router.post('/token', [
  validate(schemas.fcmToken)
], async (req, res) => {
  try {
    const { token, deviceType, deviceId } = req.body;

    // 기존 토큰이 있는지 확인
    let fcmToken = await FCMToken.findOne({ where: { token } });

    if (fcmToken) {
      // 토큰이 이미 있으면 정보 업데이트
      fcmToken.deviceType = deviceType;
      fcmToken.deviceId = deviceId;
      fcmToken.isActive = true;
      fcmToken.lastUsedAt = new Date();
      await fcmToken.save();
    } else {
      // 새 토큰 등록
      fcmToken = await FCMToken.create({
        token,
        deviceType,
        deviceId,
        isActive: true,
        lastUsedAt: new Date()
      });
    }

    res.status(201).json({
      message: 'FCM 토큰이 성공적으로 등록되었습니다',
      token: {
        id: fcmToken.id,
        deviceType: fcmToken.deviceType,
        isActive: fcmToken.isActive,
        lastUsedAt: fcmToken.lastUsedAt
      }
    });
  } catch (error) {
    console.error('Register FCM token error:', error);
    res.status(500).json({
      error: 'FCM 토큰 등록 중 오류가 발생했습니다'
    });
  }
});

// FCM 토큰 삭제/비활성화 (ID로 삭제)
router.delete('/token/:id', async (req, res) => {
  try {
    const fcmToken = await FCMToken.findByPk(req.params.id);

    if (!fcmToken) {
      return res.status(404).json({
        error: '토큰을 찾을 수 없습니다'
      });
    }

    await fcmToken.destroy();

    res.json({
      message: 'FCM 토큰이 성공적으로 삭제되었습니다'
    });
  } catch (error) {
    console.error('Delete FCM token by ID error:', error);
    res.status(500).json({
      error: 'FCM 토큰 삭제 중 오류가 발생했습니다'
    });
  }
});

// FCM 토큰 삭제/비활성화 (토큰 값으로 삭제)
router.delete('/token/:token', async (req, res) => {
  try {
    const fcmToken = await FCMToken.findOne({ 
      where: { token: req.params.token } 
    });

    if (!fcmToken) {
      return res.status(404).json({
        error: '토큰을 찾을 수 없습니다'
      });
    }

    await fcmToken.destroy();

    res.json({
      message: 'FCM 토큰이 성공적으로 삭제되었습니다'
    });
  } catch (error) {
    console.error('Delete FCM token error:', error);
    res.status(500).json({
      error: 'FCM 토큰 삭제 중 오류가 발생했습니다'
    });
  }
});

// 토큰 상태 업데이트
router.patch('/token/:token', async (req, res) => {
  try {
    const { isActive, notificationEnabled } = req.body;
    const fcmToken = await FCMToken.findOne({ 
      where: { token: req.params.token } 
    });

    if (!fcmToken) {
      return res.status(404).json({
        error: '토큰을 찾을 수 없습니다'
      });
    }

    await fcmToken.update({ 
      isActive: isActive !== undefined ? isActive : fcmToken.isActive,
      notificationEnabled: notificationEnabled !== undefined ? notificationEnabled : fcmToken.notificationEnabled
    });

    res.json({
      message: `토큰이 ${fcmToken.isActive ? '활성화' : '비활성화'}되었습니다`,
      token: {
        id: fcmToken.id,
        isActive: fcmToken.isActive,
        notificationEnabled: fcmToken.notificationEnabled,
        lastUsedAt: fcmToken.lastUsedAt
      }
    });
  } catch (error) {
    console.error('Update FCM token error:', error);
    res.status(500).json({
      error: 'FCM 토큰 업데이트 중 오류가 발생했습니다'
    });
  }
});

// 등록된 토큰 목록 조회 (관리자용)
router.get('/tokens', async (req, res) => {
  try {
    const tokens = await FCMToken.findAll({
      where: { isActive: true },
      attributes: ['id', 'token', 'deviceType', 'deviceId', 'lastUsedAt', 'isActive', 'notificationEnabled'],
      order: [['lastUsedAt', 'DESC']]
    });

    res.json({
      tokens: tokens,
      count: tokens.length
    });
  } catch (error) {
    console.error('Get FCM tokens error:', error);
    res.status(500).json({
      error: 'FCM 토큰 조회 중 오류가 발생했습니다'
    });
  }
});

// 등록된 토큰 통계 조회 (관리자용)
router.get('/stats', async (req, res) => {
  try {
    const totalTokens = await FCMToken.count();
    const activeTokens = await FCMToken.count({ where: { isActive: true } });
    const iosTokens = await FCMToken.count({ 
      where: { deviceType: 'ios', isActive: true } 
    });
    const androidTokens = await FCMToken.count({ 
      where: { deviceType: 'android', isActive: true } 
    });

    res.json({
      stats: {
        totalTokens,
        activeTokens,
        inactiveTokens: totalTokens - activeTokens,
        iosTokens,
        androidTokens
      }
    });
  } catch (error) {
    console.error('Get FCM stats error:', error);
    res.status(500).json({
      error: 'FCM 통계 조회 중 오류가 발생했습니다'
    });
  }
});

module.exports = router;

