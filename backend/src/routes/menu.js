const express = require('express');
const router = express.Router();
const { Menu, sequelize } = require('../models');
const { auth } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const multer = require('multer');

// 환경 설정
const config = {
  isDevelopment: process.env.NODE_ENV === 'development'
};

// Multer 설정 (이미지 업로드)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads/menu');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB 제한
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('이미지 파일만 업로드 가능합니다'), false);
    }
  }
});

// 카테고리 변환 함수 (한글 -> 영문)
const convertCategory = (category) => {
  const categoryMap = {
    '메인': 'main',
    '사이드': 'side', 
    '음료': 'beverage',
    '디저트': 'dessert',
    'main': 'main',
    'side': 'side',
    'beverage': 'beverage',
    'dessert': 'dessert'
  };
  return categoryMap[category] || 'main';
};

// 카테고리 변환 함수 (영문 -> 한글)
const convertCategoryToKorean = (category) => {
  const categoryMap = {
    'main': '메인',
    'side': '사이드',
    'beverage': '음료',
    'dessert': '디저트',
    '메인': '메인',
    '사이드': '사이드',
    '음료': '음료',
    '디저트': '디저트'
  };
  return categoryMap[category] || '메인';
};

// 메뉴 목록 조회 (공개용 - 인증 불필요)
router.get('/', async (req, res) => {
  try {
    console.log('🔍 GET / 라우트가 매칭되었습니다!');
    const menus = await Menu.findAll({
      where: { isAvailable: true },
      order: [['sortOrder', 'ASC'], ['createdAt', 'DESC']],
      attributes: ['id', 'name', 'description', 'price', 'imageUrl', 'category', 'isAvailable']
    });

    res.json({
      menus: menus.map(menu => ({
        id: menu.id,
        name: menu.name,
        description: menu.description,
        price: parseFloat(menu.price),
        imageUrl: menu.imageUrl,
        category: convertCategoryToKorean(menu.category),
        isAvailable: menu.isAvailable
      }))
    });
  } catch (error) {
    console.error('Get menus error:', error);
    res.status(500).json({
      error: '메뉴 목록 조회 중 오류가 발생했습니다'
    });
  }
});

// 관리자용 메뉴 목록 조회 (인증 필요)
router.get('/admin', auth, async (req, res) => {
  try {
    const menus = await Menu.findAll({
      where: { adminId: req.admin.id },
      order: [['sortOrder', 'ASC'], ['createdAt', 'DESC']]
    });

    res.json({
      menus: menus.map(menu => ({
        id: menu.id,
        name: menu.name,
        description: menu.description,
        price: parseFloat(menu.price),
        imageUrl: menu.imageUrl,
        category: convertCategoryToKorean(menu.category),
        isAvailable: menu.isAvailable,
        sortOrder: menu.sortOrder,
        createdAt: menu.createdAt,
        updatedAt: menu.updatedAt
      }))
    });
  } catch (error) {
    console.error('Get admin menus error:', error);
    res.status(500).json({
      error: '메뉴 목록 조회 중 오류가 발생했습니다'
    });
  }
});

// 메뉴 상세 조회
router.get('/:id', async (req, res) => {
  try {
    const menu = await Menu.findByPk(req.params.id);
    
    if (!menu || !menu.isAvailable) {
      return res.status(404).json({
        error: '메뉴를 찾을 수 없습니다'
      });
    }

    res.json({
      menu: {
        id: menu.id,
        name: menu.name,
        description: menu.description,
        price: parseFloat(menu.price),
        imageUrl: menu.imageUrl,
        category: convertCategoryToKorean(menu.category),
        isAvailable: menu.isAvailable
      }
    });
  } catch (error) {
    console.error('Get menu error:', error);
    res.status(500).json({
      error: '메뉴 조회 중 오류가 발생했습니다'
    });
  }
});

// 메뉴 등록 (관리자용 - 이미지 업로드 포함)
router.post('/', [
  auth,
  upload.single('image'),
  validate(schemas.menuCreate)
], async (req, res) => {
  try {
    const { name, description, price, category, isAvailable, sortOrder } = req.body;
    
    // 카테고리 변환 (한글 -> 영문)
    const convertedCategory = convertCategory(category);
    
    // 이미지 URL 처리
    let imageUrl = null;
    if (req.file) {
      // 업로드된 파일의 URL 생성
      imageUrl = `/uploads/menu/${req.file.filename}`;
    } else if (req.body.imageUrl && req.body.imageUrl.trim() !== '') {
      // JSON으로 전달된 이미지 URL 사용 (빈 문자열 제외)
      imageUrl = req.body.imageUrl;
    }
    
    const menu = await Menu.create({
      adminId: req.admin.id,
      name,
      description,
      price,
      imageUrl,
      category: convertedCategory,
      isAvailable: isAvailable !== undefined ? isAvailable : true,
      sortOrder: sortOrder || 0
    });

    res.status(201).json({
      message: '메뉴가 성공적으로 등록되었습니다',
      menu: {
        id: menu.id,
        name: menu.name,
        description: menu.description,
        price: parseFloat(menu.price),
        imageUrl: menu.imageUrl,
        category: convertCategoryToKorean(menu.category),
        isAvailable: menu.isAvailable,
        sortOrder: menu.sortOrder
      }
    });
  } catch (error) {
    console.error('Create menu error:', error);
    console.error('Request body:', req.body);
    console.error('Request headers:', req.headers);
    res.status(500).json({
      error: '메뉴 등록 중 오류가 발생했습니다',
      details: config.isDevelopment ? error.message : undefined
    });
  }
});

// 메뉴 순서 업데이트 (드래그 앤 드롭)
router.put('/order', auth, async (req, res) => {
  try {
    console.log('✅ PUT /order 라우트가 매칭되었습니다!');
    console.log('✅ 요청 본문:', req.body);
    const { menuOrders } = req.body; // [{ id: 'uuid', sortOrder: 1 }, ...]
    
    if (!Array.isArray(menuOrders)) {
      return res.status(400).json({
        error: '메뉴 순서 배열이 필요합니다'
      });
    }
    
    // 트랜잭션으로 모든 순서 업데이트
    const transaction = await sequelize.transaction();
    
    try {
      for (const menuOrder of menuOrders) {
        await Menu.update(
          { sortOrder: menuOrder.sortOrder },
          { 
            where: { 
              id: menuOrder.id,
              adminId: req.admin.id // 본인 메뉴만 수정 가능
            },
            transaction
          }
        );
      }
      
      await transaction.commit();
      
      res.json({
        message: '메뉴 순서가 업데이트되었습니다',
        updatedCount: menuOrders.length
      });
      
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
    
  } catch (error) {
    console.error('Update menu order error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      error: '메뉴 순서 업데이트 중 오류가 발생했습니다',
      details: config.isDevelopment ? error.message : undefined
    });
  }
});

// 메뉴 수정 (관리자용 - 이미지 업로드 포함)
router.put('/:id', [
  auth,
  upload.single('image'),
  validate(schemas.menuCreate)
], async (req, res) => {
  try {
    console.log('❌ PUT /:id 라우트가 매칭되었습니다! ID:', req.params.id);
    console.log('❌ 요청 URL:', req.url);
    console.log('❌ 요청 경로:', req.path);
    console.log('❌ 요청 원본 URL:', req.originalUrl);
    const menu = await Menu.findOne({
      where: { 
        id: req.params.id,
        adminId: req.admin.id 
      }
    });

    if (!menu) {
      return res.status(404).json({
        error: '메뉴를 찾을 수 없습니다'
      });
    }

          const { name, description, price, category, isAvailable, sortOrder } = req.body;
          
          // 카테고리 변환 (한글 -> 영문)
          const convertedCategory = category ? convertCategory(category) : menu.category;
          
          // 이미지 URL 처리
          let imageUrl = menu.imageUrl; // 기본값은 기존 이미지
          if (req.file) {
            // 업로드된 파일의 URL 생성
            imageUrl = `/uploads/menu/${req.file.filename}`;
          } else if (req.body.imageUrl !== undefined) {
            // JSON으로 전달된 이미지 URL 사용 (빈 문자열이면 null로 설정)
            imageUrl = req.body.imageUrl.trim() !== '' ? req.body.imageUrl : null;
          }
          
          await menu.update({
            name: name || menu.name,
            description: description !== undefined ? description : menu.description,
            price: price || menu.price,
            imageUrl: imageUrl,
            category: convertedCategory,
            isAvailable: isAvailable !== undefined ? isAvailable : menu.isAvailable,
            sortOrder: sortOrder !== undefined ? sortOrder : menu.sortOrder
          });

    res.json({
      message: '메뉴가 성공적으로 수정되었습니다',
      menu: {
        id: menu.id,
        name: menu.name,
        description: menu.description,
        price: parseFloat(menu.price),
        imageUrl: menu.imageUrl,
        category: convertCategoryToKorean(menu.category),
        isAvailable: menu.isAvailable,
        sortOrder: menu.sortOrder,
        updatedAt: menu.updatedAt
      }
    });
  } catch (error) {
    console.error('Update menu error:', error);
    console.error('Request body:', req.body);
    console.error('Request params:', req.params);
    console.error('Request headers:', req.headers);
    res.status(500).json({
      error: '메뉴 수정 중 오류가 발생했습니다',
      details: config.isDevelopment ? error.message : undefined
    });
  }
});

// 메뉴 삭제 (관리자용)
router.delete('/:id', auth, async (req, res) => {
  try {
    const menu = await Menu.findOne({
      where: { 
        id: req.params.id,
        adminId: req.admin.id 
      }
    });

    if (!menu) {
      return res.status(404).json({
        error: '메뉴를 찾을 수 없습니다'
      });
    }

    await menu.destroy();

    res.json({
      message: '메뉴가 성공적으로 삭제되었습니다'
    });
  } catch (error) {
    console.error('Delete menu error:', error);
    res.status(500).json({
      error: '메뉴 삭제 중 오류가 발생했습니다'
    });
  }
});

module.exports = router;

