// 서비스 워커 파일
const CACHE_NAME = 'foodtruck-v1';
const STATIC_CACHE_URLS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/app.js',
  '/manifest.json',
  '/images/icon-192x192.png',
  '/images/icon-512x512.png'
];

// 설치 이벤트
self.addEventListener('install', event => {
  console.log('Service Worker 설치 중...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('캐시에 파일 저장 중...');
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => {
        console.log('Service Worker 설치 완료');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('Service Worker 설치 실패:', error);
      })
  );
});

// 활성화 이벤트
self.addEventListener('activate', event => {
  console.log('Service Worker 활성화 중...');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              console.log('오래된 캐시 삭제:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker 활성화 완료');
        return self.clients.claim();
      })
  );
});

// 페치 이벤트 (요청 가로채기)
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // API 요청은 네트워크 우선
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request));
    return;
  }
  
  // 정적 리소스는 캐시 우선
  event.respondWith(cacheFirst(request));
});

// 캐시 우선 전략
async function cacheFirst(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('캐시 우선 전략 실패:', error);
    
    // 오프라인 페이지 반환
    if (request.destination === 'document') {
      return caches.match('/offline.html') || 
             new Response('오프라인입니다. 네트워크 연결을 확인해주세요.', {
               status: 503,
               statusText: 'Service Unavailable'
             });
    }
  }
}

// 네트워크 우선 전략
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('네트워크 우선 전략 실패:', error);
    
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    return new Response('데이터를 불러올 수 없습니다.', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

// 백그라운드 동기화
self.addEventListener('sync', event => {
  console.log('백그라운드 동기화:', event.tag);
  
  if (event.tag === 'location-sync') {
    event.waitUntil(syncLocationData());
  }
});

// 위치 데이터 동기화
async function syncLocationData() {
  try {
    const response = await fetch('/api/location/current');
    if (response.ok) {
      const locationData = await response.json();
      
      // 모든 클라이언트에 데이터 업데이트 알림
      const clients = await self.clients.matchAll();
      clients.forEach(client => {
        client.postMessage({
          type: 'LOCATION_UPDATE',
          data: locationData
        });
      });
      
      console.log('위치 데이터 동기화 완료');
    }
  } catch (error) {
    console.error('위치 데이터 동기화 실패:', error);
  }
}

// 푸시 알림 처리
self.addEventListener('push', event => {
  console.log('푸시 알림 받음:', event);
  
  const options = {
    body: '새로운 소식이 있습니다!',
    icon: '/images/icon-192x192.png',
    badge: '/images/badge.png',
    vibrate: [200, 100, 200],
    data: {
      timestamp: Date.now()
    },
    actions: [
      {
        action: 'view',
        title: '보기',
        icon: '/images/view-icon.png'
      },
      {
        action: 'close',
        title: '닫기',
        icon: '/images/close-icon.png'
      }
    ],
    requireInteraction: true
  };
  
  if (event.data) {
    try {
      const pushData = event.data.json();
      options.title = pushData.title || '맛있는 푸드트럭';
      options.body = pushData.body || '새로운 소식이 있습니다!';
      
      if (pushData.icon) {
        options.icon = pushData.icon;
      }
      
      options.data = {
        ...options.data,
        ...pushData.data
      };
    } catch (error) {
      console.error('푸시 데이터 파싱 실패:', error);
      options.title = '푸드트럭 알림';
      options.body = event.data.text();
    }
  }
  
  event.waitUntil(
    self.registration.showNotification('맛있는 푸드트럭', options)
  );
});

// 알림 클릭 처리
self.addEventListener('notificationclick', event => {
  console.log('알림 클릭됨:', event);
  
  event.notification.close();
  
  if (event.action === 'close') {
    return;
  }
  
  const urlToOpen = '/';
  const targetScreen = event.notification.data?.screen || 'home';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        // 이미 열린 창이 있는지 확인
        for (const client of clientList) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus().then(() => {
              // 특정 화면으로 이동
              client.postMessage({
                type: 'NAVIGATE_TO',
                data: targetScreen
              });
            });
          }
        }
        
        // 새 창 열기
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen).then(WindowClient => {
            // 로드 완료 후 화면 이동
            setTimeout(() => {
              if (windowClient && windowClient.navigateTo) {
                WindowClient.postMessage({
                  type: 'NAVIGATE_TO',
                  data: targetScreen
                });
              }
            }, 1000);
          });
        }
      })
  );
});

// 메시지 처리
self.addEventListener('message', event => {
  console.log('Service Worker 메시지 수신:', event.data);
  
  const { type, data } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'GET_VERSION':
      event.ports[0].postMessage({
        version: CACHE_NAME
      });
      break;
      
    case 'CLEAR_CACHE':
      caches.delete(CACHE_NAME).then(() => {
        console.log('캐시 삭제 완료');
      });
      break;
      
    default:
      console.log('알 수 없는 메시지 타입:', type);
  }
});

console.log('Service Worker 로드됨');
