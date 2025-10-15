const express = require('express');
const path = require('path');
const router = express.Router();

// 어드민 웹 페이지 서빙
router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../../../admin-web/index.html'));
});

// 어드민 웹 정적 파일 서빙 (CSS, JS 등)
router.use(express.static(path.join(__dirname, '../../../admin-web')));

module.exports = router;
