const express = require('express');
const path = require('path');
const router = express.Router();

// 모바일 웹 페이지 서빙
router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../../../mobile-web/index.html'));
});

// 모바일 웹 정적 코드 서빙
router.use('/js', express.static(path.join(__dirname, '../../../mobile-web/js')));
router.use('/css', express.static(path.join(__dirname, '../../../mobile-web/css')));
router.use('/images', express.static(path.join(__dirname, '../../../mobile-web/images')));

// PWA 관련 파일들
router.get('/manifest.json', (req, res) => {
    res.sendFile(path.join(__dirname, '../../../mobile-web/manifest.json'));
});

router.get('/sw.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.sendFile(path.join(__dirname, '../../../mobile-web/sw.js'));
});

// 아이콘들 서빙 (placeholder)
router.get('/icon-*', (req, res) => {
    // 실제로는 적절한 아이콘 파일을 반환해야 함
    res.status(404).json({ error: 'Icon not found' });
});

module.exports = router;
