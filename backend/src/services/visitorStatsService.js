const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const readline = require('readline');

const LOG_DIR = path.join(__dirname, '../../logs');
const CACHE_FILE = path.join(LOG_DIR, 'visitor-stats-cache.json');
const STATS_TIME_ZONE = process.env.VISITOR_STATS_TIMEZONE || 'Asia/Seoul';
const RETENTION_DAYS = Number.parseInt(process.env.VISITOR_STATS_RETENTION_DAYS, 10) || 14;
const FLUSH_INTERVAL_MS = Number.parseInt(process.env.VISITOR_STATS_FLUSH_INTERVAL_MS, 10) || 15000;

let statsDateHourFormatter;
try {
  statsDateHourFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: STATS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23'
  });
} catch (error) {
  statsDateHourFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23'
  });
}

let store = createEmptyStore();
let initialized = false;
let dirty = false;
let flushTimer = null;
let flushPromise = null;

function createEmptyStore() {
  return {
    version: 1,
    updatedAt: null,
    days: {}
  };
}

function createEmptyDay(date) {
  return {
    date,
    requestCount: 0,
    rawRequestCount: 0,
    unreliableRequestCount: 0,
    clientIdRequestCount: 0,
    uniqueIds: new Set(),
    hours: {}
  };
}

function createEmptyHour(hour) {
  return {
    hour,
    requestCount: 0,
    rawRequestCount: 0,
    unreliableRequestCount: 0,
    clientIdRequestCount: 0,
    uniqueIds: new Set(),
    latestEventAt: null
  };
}

function getStatsDateHourParts(date) {
  return statsDateHourFormatter.formatToParts(date).reduce((acc, part) => {
    if (part.type !== 'literal') {
      acc[part.type] = part.value;
    }
    return acc;
  }, {});
}

function getDateHourInStatsTimeZone(timestamp = '') {
  if (!timestamp) {
    return { date: null, hour: null };
  }

  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) {
    return { date: null, hour: null };
  }

  const parts = getStatsDateHourParts(parsed);
  const date = parts.year && parts.month && parts.day
    ? `${parts.year}-${parts.month}-${parts.day}`
    : null;

  let hour = Number.parseInt(parts.hour, 10);
  if (hour === 24) {
    hour = 0;
  }

  return {
    date,
    hour: Number.isNaN(hour) ? null : hour
  };
}

function getCurrentDateInStatsTimeZone(now = new Date()) {
  const parts = getStatsDateHourParts(now);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function toDateStringUTC(date) {
  return date.toISOString().split('T')[0];
}

function getLastNDates(days, maxDays = 30) {
  const normalizedDays = Math.min(Math.max(days, 1), maxDays);
  const todayDateText = getCurrentDateInStatsTimeZone();
  const [year, month, day] = todayDateText.split('-').map((value) => Number.parseInt(value, 10));
  const today = new Date(Date.UTC(year, month - 1, day));

  const dates = [];
  for (let i = normalizedDays - 1; i >= 0; i -= 1) {
    const targetDate = new Date(today);
    targetDate.setUTCDate(targetDate.getUTCDate() - i);
    dates.push(toDateStringUTC(targetDate));
  }

  return dates;
}

function normalizeIp(rawIp = '') {
  return rawIp.replace(/^::ffff:/, '');
}

function isLoopbackIp(rawIp = '') {
  const ip = normalizeIp(rawIp).toLowerCase();
  return ip === '127.0.0.1' || ip === '::1' || ip === 'localhost';
}

function hasStaticAssetExtension(urlPath = '') {
  return /\.(css|js|png|jpg|jpeg|gif|svg|ico|webp|woff|woff2|ttf|map|json|txt)$/i.test(urlPath);
}

function isVisitEvent(method = '', url = '') {
  if (method !== 'GET' || !url) {
    return false;
  }

  let urlPath = url.split('?')[0] || '';
  if (urlPath.length > 1 && urlPath.endsWith('/')) {
    urlPath = urlPath.slice(0, -1);
  }

  if (!urlPath || hasStaticAssetExtension(urlPath)) {
    return false;
  }

  return urlPath === '/mobile'
    || urlPath === '/api/menu'
    || urlPath === '/api/location/current';
}

function getHeaderValue(requestLog, key) {
  if (!requestLog || !requestLog.headers || typeof requestLog.headers !== 'object') {
    return '';
  }

  const rawValue = requestLog.headers[key];
  return typeof rawValue === 'string' ? rawValue.trim() : '';
}

function parseForwardedFor(rawValue = '') {
  if (!rawValue) return '';
  return normalizeIp(rawValue.split(',')[0].trim());
}

function isLikelyBotUserAgent(userAgent = '') {
  return /(bot|crawler|spider|curl|wget|python|go-http-client|java)/i.test(userAgent);
}

function isLikelyAppWebViewUserAgent(userAgent = '') {
  const ua = String(userAgent || '').toLowerCase();

  if (ua.includes('; wv') || ua.includes(' wv)')) {
    return true;
  }

  const isIOS = ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod');
  return isIOS
    && ua.includes('applewebkit')
    && ua.includes('mobile/')
    && !ua.includes('safari/');
}

function isAppClientRequest(requestLog) {
  const source = getHeaderValue(requestLog, 'x-client-source').toLowerCase();
  if (source === 'app-android'
    || source === 'app-ios'
    || source === 'app-webview'
    || source === 'app') {
    return true;
  }

  return source === 'mobile-web' && isLikelyAppWebViewUserAgent(requestLog.userAgent || '');
}

function resolveVisitorIdentifier(requestLog) {
  const clientId = getHeaderValue(requestLog, 'x-client-id');
  if (clientId) {
    return { id: `cid:${clientId}`, source: 'client-id' };
  }

  const forwardedFor = parseForwardedFor(getHeaderValue(requestLog, 'x-forwarded-for'));
  if (forwardedFor && !isLoopbackIp(forwardedFor)) {
    return { id: `xff:${forwardedFor}`, source: 'x-forwarded-for' };
  }

  const realIp = normalizeIp(getHeaderValue(requestLog, 'x-real-ip'));
  if (realIp && !isLoopbackIp(realIp)) {
    return { id: `rip:${realIp}`, source: 'x-real-ip' };
  }

  const ip = normalizeIp(requestLog && typeof requestLog.ip === 'string' ? requestLog.ip : '');
  if (ip && !isLoopbackIp(ip)) {
    return { id: `ip:${ip}`, source: 'ip' };
  }

  return { id: '', source: 'unknown' };
}

function hashVisitorId(visitorId) {
  return crypto.createHash('sha256').update(visitorId).digest('hex').slice(0, 32);
}

function getOrCreateDay(date) {
  if (!store.days[date]) {
    store.days[date] = createEmptyDay(date);
  }
  return store.days[date];
}

function getOrCreateHour(dayBucket, hour) {
  const hourKey = String(hour);
  if (!dayBucket.hours[hourKey]) {
    dayBucket.hours[hourKey] = createEmptyHour(hour);
  }
  return dayBucket.hours[hourKey];
}

function markDirty() {
  dirty = true;
  store.updatedAt = new Date().toISOString();
}

function recordVisitEvent({ timestamp = new Date().toISOString(), method, url, requestLog }) {
  const { date, hour } = getDateHourInStatsTimeZone(timestamp);
  if (!date || hour === null || hour < 0 || hour > 23) {
    return false;
  }

  if (!isVisitEvent(method, url)) {
    return false;
  }

  if (!requestLog) {
    return false;
  }

  if (isLikelyBotUserAgent(requestLog.userAgent || '')) {
    return false;
  }

  if (!isAppClientRequest(requestLog)) {
    return false;
  }

  const dayBucket = getOrCreateDay(date);
  const hourBucket = getOrCreateHour(dayBucket, hour);

  dayBucket.rawRequestCount += 1;
  hourBucket.rawRequestCount += 1;

  if (!hourBucket.latestEventAt || timestamp > hourBucket.latestEventAt) {
    hourBucket.latestEventAt = timestamp;
  }

  const visitorInfo = resolveVisitorIdentifier(requestLog);
  if (!visitorInfo.id) {
    dayBucket.unreliableRequestCount += 1;
    hourBucket.unreliableRequestCount += 1;
    markDirty();
    return true;
  }

  const visitorHash = hashVisitorId(visitorInfo.id);
  dayBucket.requestCount += 1;
  hourBucket.requestCount += 1;

  if (visitorInfo.source === 'client-id') {
    dayBucket.clientIdRequestCount += 1;
    hourBucket.clientIdRequestCount += 1;
  }

  dayBucket.uniqueIds.add(visitorHash);
  hourBucket.uniqueIds.add(visitorHash);
  markDirty();
  return true;
}

function recordVisitFromRequest(req, requestLog) {
  return recordVisitEvent({
    method: req.method,
    url: req.originalUrl || req.url,
    requestLog
  });
}

function serializeStore() {
  const days = {};

  Object.entries(store.days).forEach(([date, dayBucket]) => {
    const hours = {};
    Object.entries(dayBucket.hours || {}).forEach(([hour, hourBucket]) => {
      hours[hour] = {
        ...hourBucket,
        uniqueIds: Array.from(hourBucket.uniqueIds || [])
      };
    });

    days[date] = {
      ...dayBucket,
      uniqueIds: Array.from(dayBucket.uniqueIds || []),
      hours
    };
  });

  return {
    version: store.version,
    updatedAt: store.updatedAt,
    days
  };
}

function hydrateStore(rawStore) {
  const nextStore = createEmptyStore();
  nextStore.version = rawStore && rawStore.version ? rawStore.version : 1;
  nextStore.updatedAt = rawStore && rawStore.updatedAt ? rawStore.updatedAt : null;

  Object.entries((rawStore && rawStore.days) || {}).forEach(([date, rawDay]) => {
    const dayBucket = createEmptyDay(date);
    dayBucket.requestCount = Number(rawDay.requestCount || 0);
    dayBucket.rawRequestCount = Number(rawDay.rawRequestCount || 0);
    dayBucket.unreliableRequestCount = Number(rawDay.unreliableRequestCount || 0);
    dayBucket.clientIdRequestCount = Number(rawDay.clientIdRequestCount || 0);
    dayBucket.uniqueIds = new Set(Array.isArray(rawDay.uniqueIds) ? rawDay.uniqueIds : []);

    Object.entries(rawDay.hours || {}).forEach(([hour, rawHour]) => {
      const hourNumber = Number.parseInt(hour, 10);
      const hourBucket = createEmptyHour(Number.isNaN(hourNumber) ? Number(rawHour.hour || 0) : hourNumber);
      hourBucket.requestCount = Number(rawHour.requestCount || 0);
      hourBucket.rawRequestCount = Number(rawHour.rawRequestCount || 0);
      hourBucket.unreliableRequestCount = Number(rawHour.unreliableRequestCount || 0);
      hourBucket.clientIdRequestCount = Number(rawHour.clientIdRequestCount || 0);
      hourBucket.uniqueIds = new Set(Array.isArray(rawHour.uniqueIds) ? rawHour.uniqueIds : []);
      hourBucket.latestEventAt = rawHour.latestEventAt || null;
      dayBucket.hours[String(hourBucket.hour)] = hourBucket;
    });

    nextStore.days[date] = dayBucket;
  });

  store = nextStore;
}

function loadVisitorStatsCache() {
  if (!fs.existsSync(CACHE_FILE)) {
    store = createEmptyStore();
    initialized = true;
    return;
  }

  try {
    const raw = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    hydrateStore(raw);
  } catch (error) {
    console.error('Failed to load visitor stats cache:', error.message);
    store = createEmptyStore();
  }

  initialized = true;
}

function pruneStore() {
  const keepDates = new Set(getLastNDates(RETENTION_DAYS, Math.max(RETENTION_DAYS, 30)));
  Object.keys(store.days).forEach((date) => {
    if (!keepDates.has(date)) {
      delete store.days[date];
    }
  });
}

async function flushVisitorStatsCache({ force = false } = {}) {
  if (flushPromise) {
    return flushPromise;
  }

  if (!dirty && !force) {
    return null;
  }

  pruneStore();
  const payload = JSON.stringify(serializeStore());
  const tmpFile = `${CACHE_FILE}.tmp`;
  dirty = false;

  flushPromise = (async () => {
    await fsp.mkdir(LOG_DIR, { recursive: true });
    await fsp.writeFile(tmpFile, payload);
    await fsp.rename(tmpFile, CACHE_FILE);
  })().catch((error) => {
    dirty = true;
    throw error;
  }).finally(() => {
    flushPromise = null;
  });

  return flushPromise;
}

function initializeVisitorStatsService() {
  if (!initialized) {
    loadVisitorStatsCache();
  }

  if (!flushTimer) {
    flushTimer = setInterval(() => {
      flushVisitorStatsCache().catch((error) => {
        console.error('Failed to flush visitor stats cache:', error.message);
      });
    }, FLUSH_INTERVAL_MS);

    if (typeof flushTimer.unref === 'function') {
      flushTimer.unref();
    }
  }
}

function getVisitorTrend(requestedDays = 14) {
  if (!initialized) {
    loadVisitorStatsCache();
  }

  const dateList = getLastNDates(requestedDays);
  const stats = dateList.map((date) => {
    const bucket = store.days[date];
    return {
      date,
      uniqueVisitors: bucket ? bucket.uniqueIds.size : 0,
      requestCount: bucket ? bucket.requestCount : 0,
      rawRequestCount: bucket ? bucket.rawRequestCount : 0,
      unreliableRequestCount: bucket ? bucket.unreliableRequestCount : 0
    };
  });

  const summary = stats.reduce((acc, day) => {
    acc.totalUniqueVisitors += day.uniqueVisitors;
    acc.totalRequests += day.requestCount;
    acc.totalRawRequests += day.rawRequestCount;
    acc.totalUnreliableRequests += day.unreliableRequestCount;
    return acc;
  }, {
    totalUniqueVisitors: 0,
    totalRequests: 0,
    totalRawRequests: 0,
    totalUnreliableRequests: 0
  });

  const reliableFromDate = dateList.find((date) => {
    const bucket = store.days[date];
    return bucket && bucket.clientIdRequestCount > 0;
  }) || null;

  return {
    days: dateList.length,
    stats,
    summary: {
      ...summary,
      avgUniqueVisitors: Math.round(summary.totalUniqueVisitors / dateList.length),
      avgRequests: Math.round(summary.totalRequests / dateList.length)
    },
    quality: {
      reliableFromDate,
      hasUnreliableData: summary.totalUnreliableRequests > 0,
      cacheUpdatedAt: store.updatedAt,
      message: reliableFromDate
        ? `${reliableFromDate} 이후 앱 접속 데이터부터 신뢰 가능한 방문자 식별(X-Client-Id) 기준으로 집계됩니다.`
        : '아직 앱 접속 기준의 신뢰 가능한 방문자 식별 데이터(X-Client-Id)가 충분히 쌓이지 않았습니다.'
    }
  };
}

function getTodayVisitorStats() {
  if (!initialized) {
    loadVisitorStatsCache();
  }

  const today = getCurrentDateInStatsTimeZone();
  const dayBucket = store.days[today];
  const hourly = Array.from({ length: 24 }, (_, hour) => {
    const bucket = dayBucket && dayBucket.hours ? dayBucket.hours[String(hour)] : null;
    return {
      hour,
      uniqueVisitors: bucket ? bucket.uniqueIds.size : 0,
      requestCount: bucket ? bucket.requestCount : 0,
      rawRequestCount: bucket ? bucket.rawRequestCount : 0,
      unreliableRequestCount: bucket ? bucket.unreliableRequestCount : 0
    };
  });

  const summary = hourly.reduce((acc, bucket) => {
    acc.totalRequests += bucket.requestCount;
    acc.totalRawRequests += bucket.rawRequestCount;
    acc.totalUnreliableRequests += bucket.unreliableRequestCount;
    if (bucket.requestCount > 0) {
      acc.activeHours += 1;
    }
    return acc;
  }, {
    totalUniqueVisitors: dayBucket ? dayBucket.uniqueIds.size : 0,
    totalRequests: 0,
    totalRawRequests: 0,
    totalUnreliableRequests: 0,
    activeHours: 0
  });

  const peakHour = hourly.reduce((peak, current) => {
    if (current.requestCount > peak.requestCount) {
      return current;
    }
    return peak;
  }, { hour: 0, requestCount: 0, uniqueVisitors: 0 });

  const lastEventAt = dayBucket
    ? Object.values(dayBucket.hours || {}).reduce((latest, hourBucket) => {
      if (hourBucket.latestEventAt && (!latest || hourBucket.latestEventAt > latest)) {
        return hourBucket.latestEventAt;
      }
      return latest;
    }, null)
    : null;

  const hasReliableClientId = Boolean(dayBucket && dayBucket.clientIdRequestCount > 0);

  return {
    date: today,
    hourly,
    summary: {
      ...summary,
      peakHour: peakHour.requestCount > 0 ? {
        hour: peakHour.hour,
        requestCount: peakHour.requestCount,
        uniqueVisitors: peakHour.uniqueVisitors
      } : null,
      lastEventAt
    },
    quality: {
      hasReliableClientId,
      cacheUpdatedAt: store.updatedAt,
      message: hasReliableClientId
        ? '당일 통계는 앱 접속 이벤트 중 앱 식별자(X-Client-Id) 기반 집계를 포함합니다.'
        : '당일 앱 접속 통계는 식별 정보 부족 구간이 포함될 수 있습니다.'
    }
  };
}

function resetVisitorStatsStore() {
  store = createEmptyStore();
  dirty = true;
  initialized = true;
}

function updateBraceState(line, state) {
  for (const ch of line) {
    if (state.inString) {
      if (state.isEscaped) {
        state.isEscaped = false;
        continue;
      }

      if (ch === '\\') {
        state.isEscaped = true;
        continue;
      }

      if (ch === '"') {
        state.inString = false;
      }

      continue;
    }

    if (ch === '"') {
      state.inString = true;
      continue;
    }

    if (ch === '{') state.braceDepth += 1;
    if (ch === '}') state.braceDepth -= 1;
  }
}

async function ingestLogFile(filePath) {
  const stream = fs.createReadStream(filePath, { encoding: 'utf8' });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  const requestPattern = /^\[([^\]]+)\]\s+\[INFO\]\s+\[[^\]]+\]\s+REQUEST:\s+(\w+)\s+([^\s]+)/;

  let pendingRequest = null;
  let collectingJson = false;
  let jsonLines = [];
  let jsonState = null;
  let parsedCount = 0;
  let recordedCount = 0;

  function finishJsonBlock() {
    try {
      const requestLog = JSON.parse(jsonLines.join('\n'));
      parsedCount += 1;
      if (recordVisitEvent({ ...pendingRequest, requestLog })) {
        recordedCount += 1;
      }
    } catch (error) {
      // Ignore malformed legacy log blocks.
    }

    pendingRequest = null;
    collectingJson = false;
    jsonLines = [];
    jsonState = null;
  }

  for await (const line of rl) {
    if (collectingJson) {
      jsonLines.push(line);
      updateBraceState(line, jsonState);
      if (jsonState.braceDepth === 0 && !jsonState.inString) {
        finishJsonBlock();
      }
      continue;
    }

    const match = line.match(requestPattern);
    if (match) {
      pendingRequest = {
        timestamp: match[1],
        method: match[2],
        url: match[3]
      };
      continue;
    }

    if (!pendingRequest) {
      continue;
    }

    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }

    if (trimmed.startsWith('{')) {
      collectingJson = true;
      jsonLines = [line];
      jsonState = {
        braceDepth: 0,
        inString: false,
        isEscaped: false
      };
      updateBraceState(line, jsonState);
      if (jsonState.braceDepth === 0 && !jsonState.inString) {
        finishJsonBlock();
      }
    } else if (trimmed.startsWith('[')) {
      pendingRequest = null;
    }
  }

  return { parsedCount, recordedCount };
}

module.exports = {
  CACHE_FILE,
  LOG_DIR,
  flushVisitorStatsCache,
  getTodayVisitorStats,
  getVisitorTrend,
  ingestLogFile,
  initializeVisitorStatsService,
  recordVisitEvent,
  recordVisitFromRequest,
  resetVisitorStatsStore
};
