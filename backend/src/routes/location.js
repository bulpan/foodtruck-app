const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { Location } = require('../models');
const { auth } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');

// 환경 설정
const config = {
  isDevelopment: process.env.NODE_ENV === 'development'
};

// 현재 위치 조회 (공개용 - 고객용)
router.get('/current', async (req, res) => {
  try {
    const currentLocation = await Location.findOne({
      order: [['createdAt', 'DESC']],
      attributes: ['id', 'name', 'address', 'openTime', 'closeTime', 'notice']
    });

    if (!currentLocation) {
      return res.status(404).json({
        error: '현재 영업 위치가 없습니다'
      });
    }

    res.json({
      location: {
        id: currentLocation.id,
        name: currentLocation.name,
        address: currentLocation.address,
        openTime: currentLocation.openTime,
        closeTime: currentLocation.closeTime,
        notice: currentLocation.notice
      }
    });
  } catch (error) {
    console.error('Get current location error:', error);
    res.status(500).json({
      error: '위치 정보 조회 중 오류가 발생했습니다'
    });
  }
});

// 관리자용 위치 목록 조회
router.get('/admin/list', auth, async (req, res) => {
  try {
    const locations = await Location.findAll({
      where: { adminId: req.admin.id },
      order: [['createdAt', 'DESC']]
    });

    res.json({
      locations: locations.map(location => ({
        id: location.id,
        name: location.name,
        address: location.address,
        openTime: location.openTime,
        closeTime: location.closeTime,
        notice: location.notice,
        createdAt: location.createdAt,
        updatedAt: location.updatedAt
      }))
    });
  } catch (error) {
    console.error('Get admin locations error:', error);
    res.status(500).json({
      error: '위치 목록 조회 중 오류가 발생했습니다'
    });
  }
});

// 위치 등록/업데이트 (관리자용)
router.post('/admin', [
  auth,
  validate(schemas.locationCreate)
], async (req, res) => {
  try {
    const { name, address, openTime, closeTime, notice } = req.body;
    
    const location = await Location.create({
      adminId: req.admin.id,
      name,
      address,
      openTime,
      closeTime,
      notice
    });

    res.status(201).json({
      message: '영업 위치가 성공적으로 설정되었습니다',
      location: {
        id: location.id,
        name: location.name,
        address: location.address,
        openTime: location.openTime,
        closeTime: location.closeTime,
        notice: location.notice
      }
    });
  } catch (error) {
    console.error('Create location error:', error);
    res.status(500).json({
      error: '위치 설정 중 오류가 발생했습니다'
    });
  }
});

// 위치 수정 (관리자용)
router.put('/admin/:id', [
  auth,
  validate(schemas.locationCreate)
], async (req, res) => {
  try {
    const location = await Location.findOne({
      where: { 
        id: req.params.id,
        adminId: req.admin.id 
      }
    });

    if (!location) {
      return res.status(404).json({
        error: '위치를 찾을 수 없습니다'
      });
    }

    const { name, address, openTime, closeTime, notice } = req.body;
    
    await location.update({
      name: name || location.name,
      address: address || location.address,
      openTime: openTime !== undefined ? openTime : location.openTime,
      closeTime: closeTime !== undefined ? closeTime : location.closeTime,
      notice: notice !== undefined ? notice : location.notice
    });

    res.json({
      message: '위치가 성공적으로 수정되었습니다',
      location: {
        id: location.id,
        name: location.name,
        address: location.address,
        openTime: location.openTime,
        closeTime: location.closeTime,
        notice: location.notice,
        updatedAt: location.updatedAt
      }
    });
  } catch (error) {
    console.error('Update location error:', error);
    res.status(500).json({
      error: '위치 수정 중 오류가 발생했습니다'
    });
  }
});

// 위치 삭제 (관리자용)
router.delete('/admin/:id', auth, async (req, res) => {
  try {
    const location = await Location.findOne({
      where: { 
        id: req.params.id,
        adminId: req.admin.id 
      }
    });

    if (!location) {
      return res.status(404).json({
        error: '위치를 찾을 수 없습니다'
      });
    }

    await location.destroy();

    res.json({
      message: '위치가 성공적으로 삭제되었습니다'
    });
  } catch (error) {
    console.error('Delete location error:', error);
    res.status(500).json({
      error: '위치 삭제 중 오류가 발생했습니다'
    });
  }
});

// 위치 등록 (관리자용)
router.post('/', [
  auth,
  validate(schemas.locationCreate)
], async (req, res) => {
  try {
    const { name, address, openTime, closeTime, notice } = req.body;
    
    const location = await Location.create({
      adminId: req.admin.id,
      name,
      address,
      openTime,
      closeTime,
      notice
    });

    res.status(201).json({
      message: '위치가 성공적으로 등록되었습니다',
      location: {
        id: location.id,
        name: location.name,
        address: location.address,
        openTime: location.openTime,
        closeTime: location.closeTime,
        notice: location.notice
      }
    });
  } catch (error) {
    console.error('Create location error:', error);
    console.error('Request body:', req.body);
    console.error('Request headers:', req.headers);
    res.status(500).json({
      error: '위치 등록 중 오류가 발생했습니다',
      details: config.isDevelopment ? error.message : undefined
    });
  }
});

// 위치 수정 (관리자용)
router.put('/:id', [
  auth,
  validate(schemas.locationCreate)
], async (req, res) => {
  try {
    const location = await Location.findOne({
      where: { 
        id: req.params.id,
        adminId: req.admin.id 
      }
    });

    if (!location) {
      return res.status(404).json({
        error: '위치를 찾을 수 없습니다'
      });
    }

    const { name, address, openTime, closeTime, notice } = req.body;
    
    await location.update({
      name: name || location.name,
      address: address || location.address,
      openTime: openTime !== undefined ? openTime : location.openTime,
      closeTime: closeTime !== undefined ? closeTime : location.closeTime,
      notice: notice !== undefined ? notice : location.notice
    });

    res.json({
      message: '위치가 성공적으로 수정되었습니다',
      location: {
        id: location.id,
        name: location.name,
        address: location.address,
        openTime: location.openTime,
        closeTime: location.closeTime,
        notice: location.notice
      }
    });
  } catch (error) {
    console.error('Update location error:', error);
    console.error('Request body:', req.body);
    console.error('Request params:', req.params);
    console.error('Request headers:', req.headers);
    res.status(500).json({
      error: '위치 수정 중 오류가 발생했습니다',
      details: config.isDevelopment ? error.message : undefined
    });
  }
});

module.exports = router;
