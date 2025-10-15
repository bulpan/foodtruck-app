const jwt = require('jsonwebtoken');
const { Admin } = require('../models');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        error: '토큰이 필요합니다' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-super-secret-jwt-key');
    const admin = await Admin.findByPk(decoded.id);

    if (!admin || !admin.isActive) {
      return res.status(401).json({ 
        error: '유효하지 않은 토큰입니다' 
      });
    }

    req.admin = admin;
    next();
  } catch (error) {
    res.status(401).json({ 
      error: '토큰 검증 실패',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-super-secret-jwt-key');
      const admin = await Admin.findByPk(decoded.id);
      req.admin = admin;
    }
    
    next();
  } catch (error) {
    // 선택적 인증이므로 토큰 검증 실패해도 계속 진행
    next();
  }
};

const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 20, // 15분당 20회 시도 (개발용으로 증가)
  message: {
    error: '너무 많은 로그인 시도로 인해 일시적으로 차단되었습니다. 15분 후 다시 시도해주세요.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  auth,
  optionalAuth,
  loginLimiter
};


