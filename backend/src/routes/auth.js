const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { Admin } = require('../models');
const { loginLimiter } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');

// 관리자 로그인
router.post('/login', [
  loginLimiter,
  validate(schemas.adminLogin)
], async (req, res) => {
  try {
    const { username, password } = req.body;

    const admin = await Admin.findOne({ where: { username } });
    if (!admin || !(await admin.validatePassword(password))) {
      return res.status(401).json({
        error: '사용자명 또는 비밀번호가 올바르지 않습니다'
      });
    }

    if (!admin.isActive) {
      return res.status(403).json({
        error: '계정이 비활성화되었습니다'
      });
    }

    // 마지막 로그인 시간 업데이트
    admin.lastLoginAt = new Date();
    await admin.save();

    const token = jwt.sign(
      { id: admin.id, username: admin.username },
      process.env.JWT_SECRET || 'your-super-secret-jwt-key',
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.json({
      message: '로그인 성공',
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        shopName: admin.shopName,
        shopDescription: admin.shopDescription,
        phoneNumber: admin.phoneNumber,
        kakaoTalkId: admin.kakaoTalkId
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: '로그인 처리 중 오류가 발생했습니다'
    });
  }
});

// 관리자 회원가입 (초기 설정용)
router.post('/register', [
  validate(schemas.adminRegister)
], async (req, res) => {
  try {
    const { username, password, email, shopName, shopDescription, phoneNumber, kakaoTalkId } = req.body;

    // 이미 존재하는 username이나 email 확인
    const existingAdmin = await Admin.findOne({
      where: {
        [require('sequelize').Op.or]: [
          { username },
          { email }
        ]
      }
    });

    if (existingAdmin) {
      return res.status(400).json({
        error: existingAdmin.username === username ? '이미 사용중인 사용자명입니다' : '이미 등록된 이메일입니다'
      });
    }

    const admin = await Admin.create({
      username,
      password,
      email,
      shopName,
      shopDescription,
      phoneNumber,
      kakaoTalkId
    });

    res.status(201).json({
      message: '관리자 계정이 성공적으로 생성되었습니다',
      admin: {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        shopName: admin.shopName
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      error: '회원가입 처리 중 오류가 발생했습니다'
    });
  }
});

// 현재 인증된 관리자 정보 조회
router.get('/me', require('../middleware/auth').auth, async (req, res) => {
  try {
    const admin = req.admin;
    res.json({
      admin: {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        shopName: admin.shopName,
        shopDescription: admin.shopDescription,
        phoneNumber: admin.phoneNumber,
        kakaoTalkId: admin.kakaoTalkId,
        lastLoginAt: admin.lastLoginAt,
        createdAt: admin.createdAt
      }
    });
  } catch (error) {
    console.error('Get admin info error:', error);
    res.status(500).json({
      error: '관리자 정보 조회 중 오류가 발생했습니다'
    });
  }
});

module.exports = router;
