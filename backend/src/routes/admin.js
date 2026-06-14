const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const {
  getTodayVisitorStats,
  getVisitorTrend
} = require('../services/visitorStatsService');

// 관리자 통계 API
// 접속 통계는 요청 시 로그 파일을 직접 파싱하지 않고, 요청 미들웨어가
// 누적해 둔 캐시를 읽어서 반환한다.

router.get('/visitor-stats', auth, async (req, res) => {
  try {
    const requestedDays = Number.parseInt(req.query.days, 10) || 14;
    res.json(getVisitorTrend(requestedDays));
  } catch (error) {
    console.error('Get visitor stats error:', error);
    res.status(500).json({
      error: '접속자 통계 조회 중 오류가 발생했습니다'
    });
  }
});

router.get('/visitor-stats/today', auth, async (req, res) => {
  try {
    res.json(getTodayVisitorStats());
  } catch (error) {
    console.error('Get today visitor stats error:', error);
    res.status(500).json({
      error: '당일 접속자 통계 조회 중 오류가 발생했습니다'
    });
  }
});

module.exports = router;
