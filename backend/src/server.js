const express = require('express');
const cors = require('cors');
// const helmet = require('helmet'); // 개발 환경에서는 비활성화
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();

// 로그 디렉토리 생성
const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// 로그 파일 설정
const logFile = path.join(logDir, `server-${new Date().toISOString().split('T')[0]}.log`);

// 로그 함수
function writeLog(level, message, data = null) {
  const timestamp = new Date().toISOString();
  
  // 데이터가 있으면 포맷팅
  let dataStr = '';
  if (data) {
    try {
      dataStr = '\n' + JSON.stringify(data, null, 2);
    } catch (e) {
      dataStr = '\n' + String(data);
    }
  }
  
  const logEntry = `[${timestamp}] [${level}] ${message}${dataStr}\n`;
  
  // 콘솔에 출력 (색상 구분)
  if (level === 'ERROR') {
    console.error(`\x1b[31m${logEntry.trim()}\x1b[0m`); // 빨간색
  } else if (level === 'WARN') {
    console.warn(`\x1b[33m${logEntry.trim()}\x1b[0m`); // 노란색
  } else if (level === 'DEBUG') {
    console.log(`\x1b[36m${logEntry.trim()}\x1b[0m`); // 청록색
  } else {
    console.log(logEntry.trim());
  }
  
  // 파일에 저장
  fs.appendFileSync(logFile, logEntry);
}

// 환경별 설정
const config = {
  port: process.env.PORT || 3002,
  host: process.env.SERVER_HOST || '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',
  isDevelopment: process.env.NODE_ENV === 'development',
  devLocalIp: process.env.DEV_LOCAL_IP || '192.168.219.200',
  
  // 서버 URL 설정 (환경별)
  getServerUrl: () => {
    if (process.env.NODE_ENV === 'production') {
      return process.env.SERVER_URL || 'https://your-domain.com';
    } else {
      // 개발 환경에서는 로컬 IP 사용
      return `http://${config.devLocalIp}:${config.port}`;
    }
  },
  
  // Firebase 설정
  firebase: {
    serviceAccountPath: process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './serviceAccount.json'
  }
};

// 미들웨어 설정
// 개발 환경에서는 helmet 비활성화
// if (process.env.NODE_ENV === 'production') {
//   const helmet = require('helmet');
//   app.use(helmet({
//     contentSecurityPolicy: {
//       directives: {
//         defaultSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "data:", "blob:"],
//         styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
//         scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.jsdelivr.net", "https://static.cloudflareinsights.com"],
//         scriptSrcAttr: ["'unsafe-inline'"],
//         imgSrc: ["'self'", "data:", "https:", "blob:"],
//         fontSrc: ["'self'", "https://cdnjs.cloudflare.com", "https://fonts.gstatic.com"],
//         connectSrc: ["'self'", "https://cdn.jsdelivr.net", "https://static.cloudflareinsights.com"],
//         formAction: ["'self'"],
//         frameAncestors: ["'self'"],
//         objectSrc: ["'none'"],
//       },
//     },
//   }));
// }
app.use(cors({
  origin: config.isDevelopment ? true : process.env.ALLOWED_ORIGINS?.split(',') || false,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 정적 파일 서빙 (이미지, CSS, JS 등)
app.use('/images', express.static(path.join(__dirname, '../public/images'), {
  maxAge: config.isDevelopment ? 0 : '1d', // 개발환경에서는 캐시 비활성화
  etag: true
}));
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads'), {
  maxAge: config.isDevelopment ? 0 : '1d',
  etag: true
}));
app.use('/css', express.static(path.join(__dirname, '../public/css'), {
  maxAge: config.isDevelopment ? 0 : '1d',
  etag: true
}));
app.use('/js', express.static(path.join(__dirname, '../public/js'), {
  maxAge: config.isDevelopment ? 0 : '1d',
  etag: true
}));

// 상세 요청/응답 로깅 미들웨어
app.use((req, res, next) => {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substr(2, 9);
  
  // 요청 정보 로깅
  const requestLog = {
    requestId,
    method: req.method,
    url: req.url,
    originalUrl: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    headers: {
      'content-type': req.get('Content-Type'),
      'authorization': req.get('Authorization') ? 'Bearer ***' : undefined
    },
    body: req.method !== 'GET' ? req.body : undefined,
    query: req.query,
    params: req.params
  };
  
  writeLog('INFO', `[${requestId}] REQUEST: ${req.method} ${req.originalUrl}`, requestLog);
  
  // 응답 완료 시 로깅
  const originalSend = res.send;
  const originalJson = res.json;
  
  res.send = function(data) {
    const duration = Date.now() - startTime;
    const responseLog = {
      requestId,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      responseSize: data ? data.length : 0,
      headers: {
        'content-type': res.get('Content-Type')
      }
    };
    
    if (res.statusCode >= 400) {
      writeLog('ERROR', `[${requestId}] RESPONSE ERROR: ${res.statusCode}`, responseLog);
      if (data) {
        try {
          const errorData = typeof data === 'string' ? JSON.parse(data) : data;
          writeLog('ERROR', `[${requestId}] ERROR DETAILS:`, errorData);
        } catch (e) {
          writeLog('ERROR', `[${requestId}] ERROR RESPONSE:`, data);
        }
      }
    } else {
      writeLog('INFO', `[${requestId}] RESPONSE: ${res.statusCode}`, responseLog);
    }
    
    originalSend.call(this, data);
  };
  
  res.json = function(data) {
    const duration = Date.now() - startTime;
    const responseLog = {
      requestId,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      responseSize: data ? JSON.stringify(data).length : 0,
      headers: {
        'content-type': res.get('Content-Type')
      }
    };
    
    if (res.statusCode >= 400) {
      writeLog('ERROR', `[${requestId}] RESPONSE ERROR: ${res.statusCode}`, responseLog);
      writeLog('ERROR', `[${requestId}] ERROR DETAILS:`, data);
    } else {
      writeLog('INFO', `[${requestId}] RESPONSE: ${res.statusCode}`, responseLog);
      // 성공 응답의 경우 데이터도 로깅 (개발 환경에서만)
      if (config.isDevelopment && data) {
        writeLog('DEBUG', `[${requestId}] RESPONSE DATA:`, data);
      }
    }
    
    originalJson.call(this, data);
  };
  
  next();
});

// 모바일 웹 앱 서빙
app.use('/mobile', require('./routes/mobile'));

// 어드민 웹 페이지 서빙 (정적 파일 포함)
app.use('/admin', require('./routes/admin-web'));

// API 라우트 설정
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/menu', require('./routes/menu'));
app.use('/api/location', require('./routes/location'));
app.use('/api/fcm', require('./routes/fcm'));
app.use('/api/push', require('./routes/push'));

// 환경 정보 엔드포인트 (개발 환경에서만)
if (config.isDevelopment) {
  app.get('/config', (req, res) => {
    res.json({
      environment: config.nodeEnv,
      serverUrl: config.getServerUrl(),
      isDevelopment: config.isDevelopment,
      localIp: config.devLocalIp,
      logFile: logFile
    });
  });
}

// 헬스 체크 엔드포인트
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'foodtruck-backend',
    environment: config.nodeEnv,
    serverUrl: config.getServerUrl()
  });
});

// 루트 엔드포인트
app.get('/', (req, res) => {
  res.json({
    message: 'Food Truck Backend API',
    version: '1.0.0',
    environment: config.nodeEnv,
    serverUrl: config.getServerUrl(),
    endpoints: {
      health: '/health',
      config: config.isDevelopment ? '/config' : null,
      auth: '/api/auth',
      admin: '/api/admin',
      menu: '/api/menu',
      location: '/api/location',
      fcm: '/api/fcm',
      push: '/api/push',
      mobile: '/mobile',
      adminWeb: '/admin'
    }
  });
});

// 404 핸들러
app.use('*', (req, res) => {
  writeLog('WARN', `404 Not Found: ${req.originalUrl}`);
  res.status(404).json({ 
    error: 'Endpoint not found',
    path: req.originalUrl 
  });
});

// 에러 핸들러
app.use((err, req, res, next) => {
  writeLog('ERROR', err.message, {
    stack: err.stack,
    url: req.url,
    method: req.method
  });
  res.status(500).json({ 
    error: 'Internal server error',
    message: config.isDevelopment ? err.message : 'Something went wrong'
  });
});

// 데이터베이스 동기화 및 서버 시작
async function startServer() {
  try {
    // 데이터베이스 모델 동기화
    const { sequelize } = require('./models');
    await sequelize.sync({ alter: true });
    writeLog('INFO', '데이터베이스 테이블 동기화 완료');
    
    // 서버 시작
    app.listen(config.port, config.host, () => {
      writeLog('INFO', `Food Truck Backend 서버가 포트 ${config.port}에서 실행중입니다`);
      writeLog('INFO', `환경: ${config.nodeEnv}`);
      writeLog('INFO', `헬스 체크: http://localhost:${config.port}/health`);
      writeLog('INFO', `API 문서: http://localhost:${config.port}/api`);
      writeLog('INFO', `서버 URL: ${config.getServerUrl()}`);
      writeLog('INFO', `로그 파일: ${logFile}`);
      if (config.isDevelopment) {
        writeLog('INFO', `개발 설정: http://localhost:${config.port}/config`);
      }
    });
  } catch (error) {
    writeLog('ERROR', '서버 시작 실패:', error);
    process.exit(1);
  }
}

startServer();

module.exports = { app, config };