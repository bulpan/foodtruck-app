const Joi = require('joi');

// 공통 유효성 검사 함수
const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: '입력 데이터가 올바르지 않습니다',
        details: error.details.map(detail => detail.message)
      });
    }
    next();
  };
};

// 스키마 정의
const schemas = {
  adminLogin: Joi.object({
    username: Joi.string().trim().min(3).max(50).required()
      .messages({
        'string.empty': '사용자명을 입력해주세요',
        'string.min': '사용자명은 최소 3글자 이상이어야 합니다',
        'string.max': '사용자명은 최대 50글자까지 입력 가능합니다'
      }),
    password: Joi.string().min(6).required()
      .messages({
        'string.empty': '비밀번호를 입력해주세요',
        'string.min': '비밀번호는 최소 6글자 이상이어야 합니다'
      })
  }),

  adminRegister: Joi.object({
    username: Joi.string().trim().min(3).max(50).required(),
    password: Joi.string().min(6).required(),
    email: Joi.string().email().required(),
    shopName: Joi.string().trim().min(2).max(100).required(),
    shopDescription: Joi.string().trim().max(500),
    phoneNumber: Joi.string().pattern(/^[0-9-+\s()+]+$/).required()
      .messages({
        'string.pattern.base': '올바른 전화번호 형식이 아닙니다'
      }),
    kakaoTalkId: Joi.string().trim().max(50)
  }),

  menuCreate: Joi.object({
    name: Joi.string().trim().min(2).max(100).required(),
    description: Joi.string().trim().max(500),
    price: Joi.number().positive().precision(2).required(),
    imageUrl: Joi.string().uri().allow('').optional(),
    category: Joi.string().valid('main', 'side', 'beverage', 'dessert', '메인', '사이드', '음료', '디저트').default('main'),
    isAvailable: Joi.boolean().default(true),
    sortOrder: Joi.number().integer().min(0).default(0)
  }),

  locationCreate: Joi.object({
    name: Joi.string().trim().min(2).max(100).required(),
    address: Joi.string().trim().min(5).max(255).required(),
    openTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
    closeTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
    notice: Joi.string().trim().max(500).optional()
  }),

  fcmToken: Joi.object({
    token: Joi.string().trim().required(),
    deviceType: Joi.string().valid('ios', 'android').required(),
    deviceId: Joi.string().trim().max(100).optional()
  }),

  pushNotification: Joi.object({
    title: Joi.string().trim().min(2).max(100).required(),
    body: Joi.string().trim().min(5).max(500).required(),
    data: Joi.object().optional(),
    scheduledAt: Joi.date().greater('now').optional(),
    target: Joi.string().valid('all', 'android', 'ios').optional()
  })
};

module.exports = {
  validate,
  schemas
};
