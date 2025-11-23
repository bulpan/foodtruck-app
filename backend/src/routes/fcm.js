const express = require('express');
const router = express.Router();
const { FCMToken } = require('../models');
const { validate, schemas } = require('../middleware/validation');
const { Op } = require('sequelize');

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
    const { isActive, notificationEnabled, locationNotificationEnabled } = req.body;
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
      notificationEnabled: notificationEnabled !== undefined ? notificationEnabled : fcmToken.notificationEnabled,
      locationNotificationEnabled: locationNotificationEnabled !== undefined ? locationNotificationEnabled : fcmToken.locationNotificationEnabled
    });

    res.json({
      message: `토큰이 ${fcmToken.isActive ? '활성화' : '비활성화'}되었습니다`,
      token: {
        id: fcmToken.id,
        isActive: fcmToken.isActive,
        notificationEnabled: fcmToken.notificationEnabled,
        locationNotificationEnabled: fcmToken.locationNotificationEnabled,
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
    const { page = 1, pageSize = 20, deviceType = 'all', months = 'all' } = req.query;
    
    // 필터 조건 설정
    const whereCondition = { isActive: true };
    
    // 디바이스 타입 필터
    if (deviceType !== 'all') {
      whereCondition.deviceType = deviceType;
    }
    
    // 날짜 필터 (최근 접속 기준)
    if (months !== 'all') {
      const monthsNum = parseInt(months);
      const dateThreshold = new Date();
      dateThreshold.setMonth(dateThreshold.getMonth() - monthsNum);
      whereCondition.lastUsedAt = {
        [Op.gte]: dateThreshold
      };
    }
    
    // 전체 개수 조회
    const totalCount = await FCMToken.count({ where: whereCondition });
    
    // 페이징 계산
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    const limit = parseInt(pageSize);
    
    // 토큰 목록 조회
    const tokens = await FCMToken.findAll({
      where: whereCondition,
      attributes: ['id', 'token', 'deviceType', 'deviceId', 'lastUsedAt', 'isActive', 'notificationEnabled', 'locationNotificationEnabled'],
      order: [['lastUsedAt', 'DESC']],
      limit: limit,
      offset: offset
    });

    res.json({
      tokens: tokens,
      count: tokens.length,
      totalCount: totalCount,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      totalPages: Math.ceil(totalCount / parseInt(pageSize))
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

// 접속 추이 분석 데이터 조회
router.get('/analytics/trend', async (req, res) => {
  try {
    const { period = 'day', startDate, endDate, deviceType = 'all', compareWith } = req.query;
    
    // 날짜 범위 설정
    let start = startDate ? new Date(startDate) : new Date();
    let end = endDate ? new Date(endDate) : new Date();
    
    // 기본값: 최근 30일
    if (!startDate) {
      start.setDate(start.getDate() - 30);
    }
    
    // 시간을 00:00:00으로 설정
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    
    // 필터 조건
    const whereCondition = {
      isActive: true,
      lastUsedAt: {
        [Op.between]: [start, end]
      }
    };
    
    if (deviceType !== 'all') {
      whereCondition.deviceType = deviceType;
    }
    
    // 모든 토큰 조회
    const tokens = await FCMToken.findAll({
      where: whereCondition,
      attributes: ['id', 'deviceType', 'lastUsedAt', 'createdAt']
    });
    
    // 기간별 그룹화 함수
    const groupByPeriod = (date, periodType) => {
      const d = new Date(date);
      switch (periodType) {
        case 'day':
          return d.toISOString().split('T')[0]; // YYYY-MM-DD
        case 'week':
          const weekStart = new Date(d);
          weekStart.setDate(d.getDate() - d.getDay());
          return weekStart.toISOString().split('T')[0];
        case 'month':
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        case 'year':
          return String(d.getFullYear());
        default:
          return d.toISOString().split('T')[0];
      }
    };
    
    // 데이터 집계
    const dataMap = new Map();
    let totalUsers = 0;
    let newUsers = 0;
    let returningUsers = 0;
    let iosCount = 0;
    let androidCount = 0;
    
    tokens.forEach(token => {
      if (!token.lastUsedAt) return;
      
      const periodKey = groupByPeriod(token.lastUsedAt, period);
      const isNew = token.createdAt && new Date(token.createdAt) >= start;
      
      if (!dataMap.has(periodKey)) {
        dataMap.set(periodKey, {
          date: periodKey,
          total: 0,
          new: 0,
          returning: 0,
          ios: 0,
          android: 0
        });
      }
      
      const data = dataMap.get(periodKey);
      data.total++;
      totalUsers++;
      
      if (isNew) {
        data.new++;
        newUsers++;
      } else {
        data.returning++;
        returningUsers++;
      }
      
      if (token.deviceType === 'ios') {
        data.ios++;
        iosCount++;
      } else {
        data.android++;
        androidCount++;
      }
    });
    
    // 배열로 변환 및 정렬
    const data = Array.from(dataMap.values()).sort((a, b) => a.date.localeCompare(b.date));
    
    // 평균 계산
    const averageDaily = data.length > 0 ? Math.round(totalUsers / data.length) : 0;
    
    // 이전 기간 데이터 (비교용)
    let comparison = null;
    if (compareWith === 'previous') {
      const periodDays = period === 'day' ? 1 : period === 'week' ? 7 : period === 'month' ? 30 : 365;
      const prevStart = new Date(start);
      prevStart.setDate(prevStart.getDate() - periodDays);
      const prevEnd = new Date(start);
      
      const prevTokens = await FCMToken.findAll({
        where: {
          ...whereCondition,
          lastUsedAt: {
            [Op.between]: [prevStart, prevEnd]
          }
        },
        attributes: ['id', 'deviceType', 'lastUsedAt', 'createdAt']
      });
      
      const prevDataMap = new Map();
      let prevTotal = 0;
      
      prevTokens.forEach(token => {
        if (!token.lastUsedAt) return;
        const periodKey = groupByPeriod(token.lastUsedAt, period);
        if (!prevDataMap.has(periodKey)) {
          prevDataMap.set(periodKey, { date: periodKey, total: 0 });
        }
        prevDataMap.get(periodKey).total++;
        prevTotal++;
      });
      
      const prevData = Array.from(prevDataMap.values());
      const prevAverage = prevData.length > 0 ? Math.round(prevTotal / prevData.length) : 0;
      const growthRate = prevAverage > 0 ? ((averageDaily - prevAverage) / prevAverage * 100).toFixed(1) : 0;
      
      comparison = {
        previousPeriod: prevData,
        growthRate: parseFloat(growthRate)
      };
    }
    
    res.json({
      period,
      data,
      summary: {
        totalUsers,
        newUsers,
        returningUsers,
        averageDaily,
        iosCount,
        androidCount
      },
      comparison
    });
  } catch (error) {
    console.error('Get analytics trend error:', error);
    res.status(500).json({
      error: '접속 추이 분석 중 오류가 발생했습니다'
    });
  }
});

module.exports = router;

