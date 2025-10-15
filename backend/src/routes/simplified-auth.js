const express = require('express');
const router = express.Router();
const { adminUsers } = require('../services/simpleDataService');

// 간단한 인메모리 인증 시스템 (개발용)
router.post('/login', (req, res) => {
  try {
    const { unique, password } = req.body;

    const admin = adminUsers.find(u => u.username === username && u.password === password);
    
    if (!admin) {
      return res.status(401).json({
        error: '사용자명 또는 비밀번호가 올바르지 않습니다'
      });
    }

    // 간단한 토큰 생성 (개발용)
    const token = `demo-token-${admin.id}-${Date.now()}`;

    res.json({
      message: '로그인 성공',
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        shopName: admin.shopName,
        shopDescription: admin.shopDescription
      }
    });
  } catch (error) {
    res.status(500).json({
      error: '로그인 처리 중 오류가 발생했습니다'
    });
  }
});

// 현재 인증된 관리자 정보 조회 (간단화)
router.get('/me', (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token || !token.startsWith('demo-token-')) {
      return res.status(401).json({
        error: '토큰이 필요합니다'
      });
    }

    // 간단한 토큰 파싱
    const parts = token.split('-');
    const adminId = parts[2];
    
    const admin = adminUsers.find(u => u.id === adminId);
    if (!admin) {
      return res.status(401).json({
        error: '유효하지 않은 토큰입니다'
      });
    }

    res.json({
      admin: {
        id: admin.id,
        username: admin.username,
        shopName: admin.shopName,
        shopDescription: admin.shopDescription
      }
    });
  } catch (error) {
    res.status(500).json({
      error: '관리자 정보 조회 중 오류가 발생했습니다'
    });
  }
});

module.exports = router;



