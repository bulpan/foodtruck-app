// 앱 설정
const CONFIG = {
    API_BASE_URL: 'https://truck.carrera74.com/api',
    GOOGLE_MAPS_API_KEY: 'your-google-maps-api-key', // 실제 키로 교체 필요
};
const CLIENT_ID_STORAGE_KEY = 'foodtruckClientIdV1';

function resolveClientSourceByPlatform(platform = '') {
    const normalized = String(platform || '').toLowerCase();
    if (normalized === 'android') {
        return 'app-android';
    }
    if (normalized === 'ios') {
        return 'app-ios';
    }
    return 'app-webview';
}

function setClientSourceHeader(source) {
    axios.defaults.headers.common['X-Client-Source'] = source;
}

function createClientId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
        return window.crypto.randomUUID();
    }
    return `cid-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

function getOrCreateClientId() {
    try {
        const existing = localStorage.getItem(CLIENT_ID_STORAGE_KEY);
        if (existing) {
            return existing;
        }
        const created = createClientId();
        localStorage.setItem(CLIENT_ID_STORAGE_KEY, created);
        return created;
    } catch (error) {
        console.warn('client id storage failed:', error);
        return createClientId();
    }
}

function configureAxiosClientHeaders() {
    const clientId = getOrCreateClientId();
    axios.defaults.headers.common['X-Client-Id'] = clientId;

    const isAppBridge = Boolean(
        window.FoodTruckInterface &&
        typeof window.FoodTruckInterface.getNotificationState === 'function'
    );

    setClientSourceHeader(isAppBridge ? 'app-webview' : 'mobile-web');
}

function getStoredFcmToken() {
    try {
        const stored = localStorage.getItem(CONTACT_FCM_KEY);
        if (stored) return stored;
    } catch (e) {
        // ignore
    }
    return null;
}

function getBridgeFcmToken() {
    try {
        if (window.FoodTruckInterface && typeof window.FoodTruckInterface.getFcmToken === 'function') {
            const token = window.FoodTruckInterface.getFcmToken();
            return token || null;
        }
    } catch (e) {
        console.warn('bridge fcm token error', e);
    }
    return null;
}

function getFcmTokenForContact() {
    const fromBridge = getBridgeFcmToken();
    if (fromBridge) {
        try { localStorage.setItem(CONTACT_FCM_KEY, fromBridge); } catch (e) {}
        return fromBridge;
    }
    return getStoredFcmToken();
}

// 전역 변수
let currentMenuData = [];
let currentLocationData = null;
let selectedCategory = 'all';
let hasStartedWelcomePopupFlow = false;
let hasRequestedPushPopup = false;
let hasShownCouponPopup = false;
let hasShownNotificationRequiredPopup = false;
let couponGateMode = 'pending'; // pending | legacy | bridge
let latestBridgeState = null;
let bridgeStateWaitResolver = null;
let bridgeStateWaitTimer = null;
let contactSubmitting = false;
const CONTACT_TICKET_KEY = 'foodtruckContactTicket';
const CONTACT_FCM_KEY = 'foodtruckFcmToken';
const CONTACT_LAST_SEEN_KEY = 'foodtruckContactLastSeen';

const LOCATION_POLL_INTERVAL_MS = 10000;
let locationPollIntervalId = null;
let locationAutoRefreshListenersBound = false;

/** In-app WebView: refresh truck location on the home screen without restarting the app. */
const LOCATION_REFRESH_INTERVAL_MS = 10000;
let locationRefreshIntervalId = null;

// 앱 초기화
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM 로드 완료');
    initializeApp();
    setupEventListeners();
    
    // DOM이 완전히 로드된 후 데이터 로드
    setTimeout(() => {
        console.log('데이터 로드 시작');
        loadInitialData();
    }, 100);
});

// 앱 설정
function initializeApp() {
    console.log('앱 초기화 중...');

    configureAxiosClientHeaders();
    
    // PWA 관련 설정
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/mobile/sw.js');
    }
    
    // 네비게이션 설정
    setupNavigation();
    
    // 스크롤 이벤트
    setupScrollEvents();

    // 주기적 위치 갱신 (앱/탭이 보일 때만 — Page Visibility ≈ RN AppState active)
    // DISABLED: 10s 자동 새로고침 — 고객은 홈 화면「새로고침」버튼으로 수동 갱신
    // setupLocationVisibilityRefresh();
}

// 이벤트 리스너 설정
function setupEventListeners() {
    // 카테고리 버튼
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', handleCategoryChange);
    });
    
    // 알림 토글
    document.querySelectorAll('.toggle-switch input').forEach(toggle => {
        toggle.addEventListener('change', handleNotificationToggle);
    });

    // 쿠폰 팝업 외부 클릭 시 닫기
    const couponOverlay = document.getElementById('dailyCouponOverlay');
    if (couponOverlay) {
        couponOverlay.addEventListener('click', (event) => {
            if (event.target === couponOverlay) {
                closeDailyCouponPopup();
            }
        });
    }

    const notificationOverlay = document.getElementById('notificationRequiredOverlay');
    if (notificationOverlay) {
        notificationOverlay.addEventListener('click', (event) => {
            if (event.target === notificationOverlay) {
                closeNotificationRequiredPopup();
            }
        });
    }

    const contactButton = document.getElementById('openContactBtn');
    if (contactButton) {
        contactButton.addEventListener('click', openContactModal);
    }

    const locationContactButton = document.getElementById('locationContactBtn');
    if (locationContactButton) {
        locationContactButton.addEventListener('click', openContactModal);
    }

    const inboxButton = document.getElementById('contactInboxBtn');
    if (inboxButton) {
        inboxButton.addEventListener('click', openContactInbox);
    }

    const inboxOverlay = document.getElementById('contactInboxOverlay');
    if (inboxOverlay) {
        inboxOverlay.addEventListener('click', (event) => {
            if (event.target === inboxOverlay) {
                closeContactInbox();
            }
        });
    }

    const contactOverlay = document.getElementById('contactModalOverlay');
    if (contactOverlay) {
        contactOverlay.addEventListener('click', (event) => {
            if (event.target === contactOverlay) {
                closeContactModal();
            }
        });
    }
}

// 네비게이션 설정
function setupNavigation() {
    // 네이티브 앱과의 통신 브릿지 (placeholder)
    if (window.FoodTruckInterface && typeof window.FoodTruckInterface.setNavigationListener === 'function') {
        window.FoodTruckInterface.setNavigationListener(navigateTo);
    }
}

// 스크롤 이벤트 (탑 버튼 제거로 인해 비활성화)
function setupScrollEvents() {
    // 탑 버튼이 제거되어 스크롤 이벤트 불필요
}

// 초기 데이터 로드
async function loadInitialData() {
    showLoading(true);
    
    try {
        await Promise.all([
            loadMenuData(),
            loadLocationData()
        ]);
        
        updateUI();
        console.log('데이터 로드 완료');
    } catch (error) {
        console.error('데이터 로드 실패:', error);
        showError(`데이터 로드 실패: ${error.message || error}`);
    } finally {
        showLoading(false);
        startWelcomePopupFlow();
        checkContactUnread();
        // DISABLED: 10s 위치 폴링 — 수동 새로고침만 사용
        // setupLocationAutoRefresh();
    }
}

// 메뉴 데이터 로드
async function loadMenuData() {
    try {
        console.log('메뉴 데이터 로드 시도:', `${CONFIG.API_BASE_URL}/menu`);
        const response = await axios.get(`${CONFIG.API_BASE_URL}/menu`);
        console.log('메뉴 API 응답:', response.data);
        currentMenuData = response.data.menus || [];
        console.log('로드된 메뉴 데이터:', currentMenuData);
        renderMenuGrid();
    } catch (error) {
        console.error('메뉴 데이터 로드 실패:', error);
        console.error('오류 상세:', error.response?.data || error.message);
        
        // 개발 단계에서는 에러를 표시
        const errorMsg = `메뉴 데이터 로드 실패: ${error.response?.status || '네트워크 오류'} - ${error.message}`;
        showError(errorMsg);
        
        // 샘플 데이터로 fallback
        currentMenuData = getSampleMenuData();
        renderMenuGrid();
    }
}

// 위치 데이터 로드
// options.silent: true — 백그라운드 주기 갱신용 (토스트/화면 초기화 없이, 일시적 오류는 기존 UI 유지)
async function loadLocationData(options = {}) {
    const silent = Boolean(options.silent);
    try {
        console.log('위치 데이터 로드 시도:', `${CONFIG.API_BASE_URL}/location/current`);
        
        // DOM 요소가 존재하는지 확인
        const locationName = document.querySelector('#currentLocation .location-name');
        console.log('위치명 DOM 요소 확인:', locationName);
        
        if (!locationName) {
            console.error('위치명 DOM 요소를 찾을 수 없음');
            if (!silent) {
                showError('위치 표시 요소를 찾을 수 없습니다.');
            }
            return;
        }
        
        const response = await axios.get(`${CONFIG.API_BASE_URL}/location/current`);
        console.log('위치 API 응답:', response.data);
        
        // 위치가 없는 경우 메시지 표시
        if (!response.data.location) {
            console.log('위치가 없음 - 메시지 표시');
            currentLocationData = null;
            showNoLocationMessage(response.data.message || '아직 어디로 갈지 몰라요');
            return;
        }
        
        currentLocationData = response.data.location;
        console.log('로드된 위치 데이터:', currentLocationData);
        console.log('위치 표시 업데이트 시작');
        updateLocationDisplay();
        console.log('위치 표시 업데이트 완료');
    } catch (error) {
        console.error('위치 데이터 로드 실패:', error);
        console.error('오류 상세:', error.response?.data || error.message);
        
        if (silent) {
            return;
        }

        // 개발 단계에서는 에러를 표시
        const errorMsg = `위치 데이터 로드 실패: ${error.response?.status || '네트워크 오류'} - ${error.message}`;
        showError(errorMsg);
        
        // 오류 시에도 메시지 표시
        currentLocationData = null;
        showNoLocationMessage('아직 어디로 갈지 몰라요');
    }
}

function stopLocationAutoRefresh() {
    // DISABLED: 10s WebView 홈 화면 위치 자동 갱신
    /*
    if (locationRefreshIntervalId !== null) {
        clearInterval(locationRefreshIntervalId);
        locationRefreshIntervalId = null;
    }
    */
}

function startLocationAutoRefresh() {
    // DISABLED: 10s WebView 홈 화면 위치 자동 갱신
    /*
    stopLocationAutoRefresh();
    if (document.visibilityState !== 'visible') {
        return;
    }
    locationRefreshIntervalId = setInterval(() => {
        if (document.visibilityState === 'visible') {
            loadLocationData({ silent: true });
        }
    }, LOCATION_REFRESH_INTERVAL_MS);
    */
}

function setupLocationVisibilityRefresh() {
    // DISABLED: 탭 가시성 시 즉시 갱신 + 10s interval
    /*
    const onVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
            loadLocationData({ silent: true });
            startLocationAutoRefresh();
        } else {
            stopLocationAutoRefresh();
        }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    startLocationAutoRefresh();
    */
}

// 샘플 메뉴 데이터
function getSampleMenuData() {
    return [
        {
            id: '1',
            name: '야채곱창',
            description: '신선한 야채와 곱창이 만나 맛있는 조화',
            price: 10000,
            imageUrl: '/public/uploads/menu/1759661743880-2DSC04071.jpg',
            category: 'main',
            isAvailable: true
        },
        {
            id: '2',
            name: '야채곱창',
            description: '신선한 야채와 곱창이 만나 맛있는 조화',
            price: 10000,
            imageUrl: '/public/uploads/menu/1759661743880-2DSC04071.jpg',
            category: 'main',
            isAvailable: true
        },
        {
            id: '3',
            name: '야채곱창',
            description: '신선한 야채와 곱창이 만나 맛있는 조화',
            price: 10000,
            imageUrl: '/public/uploads/menu/1759661743880-2DSC04071.jpg',
            category: 'main',
            isAvailable: true
        },
        {
            id: '4',
            name: '김치 감자튀김',
            description: '매운 김치와 함께하는 감자튀김',
            price: 4500,
            imageUrl: null,
            category: 'side',
            isAvailable: true
        },
        {
            id: '5',
            name: '아이스 아메리카노',
            description: '시원한 커피 음료',
            price: 3500,
            imageUrl: null,
            category: 'beverage',
            isAvailable: true
        }
    ];
}

// 샘플 위치 데이터
function getSampleLocationData() {
    return {
        id: '1',
        name: '다정동 가온마을 4단지 (10/10)',
        address: '세종특별자치시 다정동 가온마을 4단지',
        latitude: 36.4800,
        longitude: 127.2890,
        openTime: '11:00',
        closeTime: '22:00',
        notice: '오늘은 여기에서 합니다'
    };
}

// 메뉴 그리드 렌더링 (메인 화면용)
function renderMenuGrid() {
    const container = document.getElementById('menuGrid');
    if (!container) return;
    
    const filteredMenus = selectedCategory === 'all' 
        ? currentMenuData 
        : currentMenuData.filter(menu => menu.category === selectedCategory);
    
    container.innerHTML = filteredMenus.map(menu => `
        <div class="menu-item" onclick="selectMenu('${menu.id}')">
            ${menu.imageUrl ? `<img src="${menu.imageUrl}" alt="${menu.name}" class="menu-image" onerror="handleImageError(this)">` : '<div class="menu-image" style="background: #f0f0f0; display: flex; align-items: center; justify-content: center;"><i class="fas fa-utensils" style="font-size: 32px; color: #ccc;"></i></div>'}
            <div class="menu-info">
                <div class="menu-header">
                    <div class="menu-name">${menu.name}</div>
                    <div class="menu-price">${menu.price.toLocaleString()}원</div>
                </div>
                <div class="menu-description">${menu.description || ''}</div>
            </div>
        </div>
    `).join('');
}


// 위치 디스플레이 업데이트
function updateLocationDisplay() {
    console.log('updateLocationDisplay 호출됨');
    console.log('currentLocationData:', currentLocationData);
    
    if (!currentLocationData) {
        console.log('위치 데이터가 없음 - 함수 종료');
        return;
    }
    
    const locationName = document.querySelector('#currentLocation .location-name');
    const locationAddress = document.querySelector('#currentLocation .location-address');
    const locationHours = document.querySelector('#currentLocation .location-hours');
    const locationNotice = document.querySelector('#currentLocation .location-notice');
    
    console.log('DOM 요소들:', {
        locationName,
        locationAddress,
        locationHours,
        locationNotice
    });
    
    if (locationName) {
        locationName.textContent = currentLocationData.name;
        locationName.style.color = '';
        locationName.style.fontStyle = '';
        console.log('위치명 설정:', currentLocationData.name);
    }
    if (locationAddress) {
        locationAddress.textContent = currentLocationData.address;
        locationAddress.style.display = '';
        console.log('주소 설정:', currentLocationData.address);
    }
    
    // 시간을 시:분 형식으로 변환
    const formatTime = (timeString) => {
        if (!timeString) return '';
        // HH:MM:SS 형식을 HH:MM으로 변환
        return timeString.substring(0, 5);
    };
    
    if (locationHours) {
        const openTime = formatTime(currentLocationData.openTime) || '11:00';
        const closeTime = formatTime(currentLocationData.closeTime) || '22:00';
        locationHours.textContent = `🕒 ${openTime} ~ ${closeTime}`;
        locationHours.style.display = '';
        console.log('영업시간 설정:', `🕒 ${openTime} ~ ${closeTime}`);
    }
    
    if (locationNotice) {
        locationNotice.textContent = currentLocationData.notice || '';
        locationNotice.style.display = '';
        console.log('공지사항 설정:', currentLocationData.notice || '');
    }
    
    // 지도 컨테이너도 업데이트
    updateMapDisplay();
}

// 위치가 없을 때 메시지 표시
function showNoLocationMessage(message) {
    console.log('showNoLocationMessage 호출됨:', message);
    
    // 여러 번 시도하여 DOM 요소 찾기
    let attempts = 0;
    const maxAttempts = 10;
    
    const trySetMessage = () => {
        attempts++;
        console.log(`DOM 요소 찾기 시도 ${attempts}/${maxAttempts}`);
        
        const locationName = document.querySelector('#currentLocation .location-name');
        const locationAddress = document.querySelector('#currentLocation .location-address');
        const locationHours = document.querySelector('#currentLocation .location-hours');
        const locationNotice = document.querySelector('#currentLocation .location-notice');
        
        console.log('DOM 요소들:', {
            locationName,
            locationAddress,
            locationHours,
            locationNotice
        });
        
        if (locationName) {
            locationName.textContent = message;
            locationName.style.color = '#666';
            locationName.style.fontStyle = 'italic';
            console.log('메시지 설정 완료:', message);
            
            if (locationAddress) {
                locationAddress.textContent = '';
                locationAddress.style.display = 'none';
            }
            if (locationHours) {
                locationHours.textContent = '';
                locationHours.style.display = 'none';
            }
            if (locationNotice) {
                locationNotice.textContent = '';
                locationNotice.style.display = 'none';
            }
            
            // 지도 숨기기
            const mapContainer = document.querySelector('#mapContainer');
            if (mapContainer) {
                mapContainer.style.display = 'none';
                console.log('지도 숨김');
            }
            
            return true;
        } else if (attempts < maxAttempts) {
            console.log('DOM 요소를 찾을 수 없음, 재시도...');
            setTimeout(trySetMessage, 100);
        } else {
            console.error('DOM 요소를 찾을 수 없음 - 최대 시도 횟수 초과');
        }
    };
    
    trySetMessage();
}

// 지도 표시 업데이트
function updateMapDisplay() {
    const mapContainer = document.getElementById('mapContainer');
    if (!mapContainer || !currentLocationData) return;
    
    mapContainer.style.display = '';
    mapContainer.innerHTML = `
        <div class="map-placeholder">
            <i class="fas fa-map-marker-alt"></i>
            <p>${currentLocationData.name}</p>
            <p>${currentLocationData.address}</p>
            <small>지도 기능은 추가 예정</small>
        </div>
    `;
}

// 이미지 에러 처리 함수
function handleImageError(img) {
    // 무한 재시도를 방지하기 위해 이미 에러 처리가 되었는지 확인
    if (img.dataset.errorHandled === 'true') {
        return;
    }
    
    // 에러 처리 플래그 설정
    img.dataset.errorHandled = 'true';
    
    // placeholder 이미지로 교체
    img.src = '/images/placeholder.svg';
    
    // placeholder도 실패하면 아이콘으로 교체
    img.onerror = function() {
        if (img.dataset.finalError === 'true') {
            return;
        }
        img.dataset.finalError = 'true';
        
        // 이미지를 아이콘으로 교체
        const parent = img.parentElement;
        parent.innerHTML = '<div class="menu-image" style="background: #f0f0f0; display: flex; align-items: center; justify-content: center;"><i class="fas fa-utensils" style="font-size: 32px; color: #ccc;"></i></div>';
    };
}


// UI 업데이트
function updateUI() {
    renderMenuGrid();
    updateLocationDisplay();
}


// 네비게이션 함수
function navigateTo(screen) {
    // 모든 스크린 숨기기
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    
    // 선택한 스크린 보이기
    const targetScreen = document.getElementById(`${screen}-screen`);
    if (targetScreen) {
        targetScreen.classList.add('active');
    }
    
    // 스크롤 맨 위로
    window.scrollTo(0, 0);
    
    // 네이티브 앱에 현재 화면 알림
    if (window.FoodTruckInterface) {
        window.FoodTruckInterface.updateNavigation(screen);
    }
}


// 카테고리 변경 처리
function handleCategoryChange(event) {
    const clickedBtn = event.target;
    
    // 모든 버튼에서 active 제거
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // 클릭한 버튼에 active 추가
    clickedBtn.classList.add('active');
    
    // 카테고리 변경
    selectedCategory = clickedBtn.dataset.category;
    renderMenuGrid();
}

// 위치 새로고침
async function refreshLocation() {
    showLoading(true);
    try {
        await loadLocationData();
        showSuccess('위치 정보가 업데이트되었습니다.');
    } catch (error) {
        console.error('위치 새로고침 실패:', error);
        showError('위치 정보를 새로고침하는데 실패했습니다.');
    } finally {
        showLoading(false);
    }
}

function isLocationPollContextVisible() {
    return typeof document !== 'undefined' && document.visibilityState === 'visible';
}

function stopLocationPollTimer() {
    // DISABLED: 10s 위치 폴링 타이머
    /*
    if (locationPollIntervalId !== null) {
        clearInterval(locationPollIntervalId);
        locationPollIntervalId = null;
    }
    */
}

function startLocationPollTimer() {
    // DISABLED: 10s 위치 폴링 타이머
    /*
    if (locationPollIntervalId !== null) {
        return;
    }
    locationPollIntervalId = setInterval(() => {
        void pollLocationDataQuietly();
    }, LOCATION_POLL_INTERVAL_MS);
    */
}

async function pollLocationDataQuietly() {
    // DISABLED: 가시성/주기 폴링 시 백그라운드 위치 갱신
    /*
    if (!isLocationPollContextVisible()) {
        return;
    }
    try {
        await loadLocationData();
    } catch (error) {
        console.warn('위치 자동 새로고침 실패:', error);
    }
    */
}

function onLocationVisibilityChange() {
    // DISABLED: 가시성 변경 시 폴링 시작/중지
    /*
    if (!isLocationPollContextVisible()) {
        stopLocationPollTimer();
        return;
    }
    void pollLocationDataQuietly();
    startLocationPollTimer();
    */
}

function onLocationPageShow(event) {
    // DISABLED: bfcache 복귀 시 폴링
    /*
    if (event.persisted && isLocationPollContextVisible()) {
        void pollLocationDataQuietly();
        startLocationPollTimer();
    }
    */
}

function setupLocationAutoRefresh() {
    // DISABLED: visibility / pageshow·pagehide 기반 10s 위치 폴링
    /*
    if (locationAutoRefreshListenersBound) {
        return;
    }
    locationAutoRefreshListenersBound = true;
    document.addEventListener('visibilitychange', onLocationVisibilityChange);
    window.addEventListener('pagehide', stopLocationPollTimer);
    window.addEventListener('pageshow', onLocationPageShow);
    if (isLocationPollContextVisible()) {
        startLocationPollTimer();
    }
    */
}

// 메뉴 선택 (이벤트 제거)
function selectMenu(menuId) {
    // 메뉴 클릭 시 아무 동작하지 않음
    return;
}

// 알림 토글 처리
function handleNotificationToggle(event) {
    const toggleType = event.target.id;
    const isEnabled = event.target.checked;
    
    console.log(`${toggleType} ${isEnabled ? '활성화' : '비활성화'}`);
    
    // 네이티브 앱에 알림 설정 변경 알림
    if (window.FoodTruckInterface && typeof window.FoodTruckInterface.updateNotificationSettings === 'function') {
        window.FoodTruckInterface.updateNotificationSettings({
            type: toggleType,
            enabled: isEnabled
        });
    }
}

// 고객 센터 전화
function callCustomer() {
    const phoneNumber = currentLocationData?.phoneNumber || '010-2420-5174';
    
    if (window.FoodTruckInterface) {
        window.FoodTruckInterface.callPhone(phoneNumber);
    } else {
        // 웹에서 호출하는 경우 window.location 사용
        window.location.href = `tel:${phoneNumber}`;
    }
}

// 문의 모달 제어
function openContactModal() {
    const overlay = document.getElementById('contactModalOverlay');
    if (overlay) {
        overlay.classList.add('show');
        const textarea = document.getElementById('contactMessage');
        if (textarea) textarea.focus();
    }
}

function closeContactModal() {
    const overlay = document.getElementById('contactModalOverlay');
    if (overlay) overlay.classList.remove('show');
}

async function submitContact() {
    if (contactSubmitting) return;
    const name = (document.getElementById('contactName')?.value || '').trim();
    const contact = (document.getElementById('contactInfo')?.value || '').trim();
    const message = (document.getElementById('contactMessage')?.value || '').trim();

    if (message.length < 3) {
        showError('메시지를 3자 이상 입력해주세요.');
        return;
    }

    contactSubmitting = true;
    showLoading(true);
    try {
        const response = await axios.post(`${CONFIG.API_BASE_URL}/contact`, {
            name: name || undefined,
            contact: contact || undefined,
            message,
            userId: getOrCreateClientId(),
            source: 'mobile-web',
            fcmToken: getFcmTokenForContact() || undefined
        });

        const ticket = response.data?.ticket;
        if (ticket?.id && ticket?.accessKey) {
            saveLastContactTicket(ticket);
        }

        showSuccess('문의가 접수되었습니다. 답변은 내 문의에서 확인하세요.');
        document.getElementById('contactMessage').value = '';
        closeContactModal();
    } catch (error) {
        console.error('contact submit failed:', error.response?.data || error.message);
        showError('문의 접수에 실패했습니다. 다시 시도해주세요.');
    } finally {
        contactSubmitting = false;
        showLoading(false);
    }
}

function saveLastContactTicket(ticket) {
    try {
        localStorage.setItem(CONTACT_TICKET_KEY, JSON.stringify({
            id: ticket.id,
            publicId: ticket.publicId,
            accessKey: ticket.accessKey,
            savedAt: Date.now()
        }));
    } catch (e) {
        console.warn('save ticket failed', e);
    }
}

function getLastContactTicket() {
    try {
        const raw = localStorage.getItem(CONTACT_TICKET_KEY);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch (e) {
        return null;
    }
}

function getLastSeenAt() {
    const v = localStorage.getItem(CONTACT_LAST_SEEN_KEY);
    const n = v ? parseInt(v, 10) : 0;
    return Number.isFinite(n) ? n : 0;
}

function setLastSeenAt(ts) {
    try {
        localStorage.setItem(CONTACT_LAST_SEEN_KEY, String(ts));
    } catch (e) {
        // ignore storage failures
    }
}

function updateContactBadges(hasUnread) {
    const el = document.getElementById('contactInboxBadge');
    if (!el) return;
    el.classList.toggle('show', !!hasUnread);
}

function openContactInbox() {
    const overlay = document.getElementById('contactInboxOverlay');
    if (overlay) {
        overlay.classList.add('show');
        refreshContactInbox();
        document.body.classList.add('modal-open');
    }
}

function closeContactInbox() {
    const overlay = document.getElementById('contactInboxOverlay');
    if (overlay) {
        overlay.classList.remove('show');
    }
    document.body.classList.remove('modal-open');
}

async function refreshContactInbox() {
    const ticket = getLastContactTicket();
    const bodyEl = document.getElementById('contactInboxBody');
    if (!bodyEl) return;

    if (!ticket) {
        bodyEl.innerHTML = '<p class="contact-hint">최근 문의 내역이 없습니다.</p>';
        updateContactBadges(false);
        return;
    }

    bodyEl.innerHTML = '<p class="contact-hint">불러오는 중...</p>';
    try {
        const res = await axios.get(`${CONFIG.API_BASE_URL}/contact/${ticket.publicId || ticket.id}/messages`, {
            params: { accessKey: ticket.accessKey }
        });

        const messages = res.data?.messages || [];
        if (!messages.length) {
            bodyEl.innerHTML = '<p class="contact-hint">아직 메시지가 없습니다.</p>';
            updateContactBadges(false);
            return;
        }

        bodyEl.innerHTML = '';
        let latestAdminAt = 0;
        messages.forEach(msg => {
            const wrap = document.createElement('div');
            wrap.className = `chat-bubble ${msg.sender === 'admin' ? 'chat-admin' : 'chat-user'}`;
            wrap.textContent = msg.body;
            const meta = document.createElement('div');
            meta.className = 'chat-meta';
            meta.textContent = new Date(msg.createdAt).toLocaleString('ko-KR', { hour12: false });
            bodyEl.appendChild(wrap);
            bodyEl.appendChild(meta);
            if (msg.sender === 'admin') {
                latestAdminAt = Math.max(latestAdminAt, new Date(msg.createdAt).getTime());
            }
        });

        const hasUnread = latestAdminAt > getLastSeenAt();
        updateContactBadges(hasUnread);
        if (latestAdminAt) {
            setLastSeenAt(latestAdminAt);
        }
    } catch (error) {
        console.error('load inbox failed', error.response?.data || error.message);
        bodyEl.innerHTML = '<p class="contact-hint">불러오지 못했습니다. 다시 시도해주세요.</p>';
        updateContactBadges(false);
    }
}

async function checkContactUnread() {
    const ticket = getLastContactTicket();
    if (!ticket) {
        updateContactBadges(false);
        return;
    }
    try {
        const res = await axios.get(`${CONFIG.API_BASE_URL}/contact/${ticket.publicId || ticket.id}/messages`, {
            params: { accessKey: ticket.accessKey }
        });
        const messages = res.data?.messages || [];
        const latestAdminAt = messages
            .filter(m => m.sender === 'admin')
            .reduce((max, m) => Math.max(max, new Date(m.createdAt).getTime()), 0);
        const hasUnread = latestAdminAt > getLastSeenAt();
        updateContactBadges(hasUnread);
    } catch (error) {
        console.error('checkContactUnread failed', error.response?.data || error.message);
    }
}


// 로딩 표시
function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.classList.toggle('active', show);
    }
}

// 성공 메시지
function showSuccess(message) {
    showNotification(message, 'success');
}

// 에러 메시지
function showError(message) {
    showNotification(message, 'error');
}

// 노티피케이션 표시
function showNotification(message, type = 'info') {
    // 간단한 토스트 메시지 구현
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        top: 80px;
        left: 50%;
        transform: translateX(-50%);
        background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
        color: white;
        padding: 12px 20px;
        border-radius: 6px;
        z-index: 3000;
        font-size: 14px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        animation: slideDown 0.3s ease;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// PWA 관련 함수들
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/mobile/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    }
}

// 앱 업데이트 알림
function handleAppUpdate() {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (confirm('새로운 버전이 있습니다. 페이지를 새로고침하시겠습니까?')) {
            window.location.reload();
        }
    });
}

// 초기화 완료 후 서비스 워커 등록
document.addEventListener('DOMContentLoaded', registerServiceWorker);

// 로컬에서 실행할 때는 CORS 문제 해결을 위한 임시 설정
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    axios.defaults.withCredentials = false;
}

function formatCouponDateTime(date = new Date()) {
    try {
        const formatter = new Intl.DateTimeFormat('ko-KR', {
            timeZone: 'Asia/Seoul',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            weekday: 'short',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
        const parts = formatter.formatToParts(date);
        const values = {};
        parts.forEach(part => {
            if (part.type !== 'literal') {
                values[part.type] = part.value;
            }
        });

        return `${values.year}.${values.month}.${values.day} (${values.weekday}) ${values.hour}:${values.minute} KST`;
    } catch (error) {
        const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const weekday = dayNames[date.getDay()];
        const hour = String(date.getHours()).padStart(2, '0');
        const minute = String(date.getMinutes()).padStart(2, '0');
        return `${year}.${month}.${day} (${weekday}) ${hour}:${minute}`;
    }
}

function toBoolean(value, defaultValue = false) {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
        const normalized = value.toLowerCase();
        if (normalized === 'true') return true;
        if (normalized === 'false') return false;
    }
    return defaultValue;
}

function parseBridgeState(rawState) {
    if (!rawState) return null;

    let parsed = rawState;
    if (typeof rawState === 'string') {
        try {
            parsed = JSON.parse(rawState);
        } catch (error) {
            return null;
        }
    }

    if (!parsed || typeof parsed !== 'object') {
        return null;
    }

    const permissionGranted = toBoolean(parsed.permissionGranted, true);
    const appNotificationEnabled = parsed.appNotificationEnabled === undefined
        ? toBoolean(parsed.notificationEnabled, true)
        : toBoolean(parsed.appNotificationEnabled, true);
    const effectiveNotificationEnabled = parsed.notificationEnabled === undefined
        ? Boolean(appNotificationEnabled && permissionGranted)
        : toBoolean(parsed.notificationEnabled, false);

    return {
        platform: parsed.platform || 'unknown',
        appVersion: String(parsed.appVersion || ''),
        appVersionCode: parsed.appVersionCode || '',
        bridgeVersion: parsed.bridgeVersion || 0,
        supportsCouponGate: toBoolean(parsed.supportsCouponGate, false),
        notificationEnabled: effectiveNotificationEnabled,
        appNotificationEnabled,
        permissionGranted,
        locationNotificationEnabled: toBoolean(parsed.locationNotificationEnabled, appNotificationEnabled),
        updatedAt: parsed.updatedAt || Date.now()
    };
}

function hasNativeBridgeApi() {
    return Boolean(
        window.FoodTruckInterface &&
        typeof window.FoodTruckInterface.getNotificationState === 'function'
    );
}

function isBridgeCouponGateEnabled(state) {
    return Boolean(state && state.supportsCouponGate === true);
}

function hasRecognizedAppVersion(state) {
    return Boolean(state && String(state.appVersion || '').trim());
}

function isBridgeCouponEligible(state) {
    if (!isBridgeCouponGateEnabled(state)) return false;
    return Boolean(state.notificationEnabled && state.permissionGranted && state.appNotificationEnabled);
}

function resolveBridgeStateWait(state) {
    if (typeof bridgeStateWaitResolver === 'function') {
        bridgeStateWaitResolver(state || latestBridgeState);
        bridgeStateWaitResolver = null;
    }

    if (bridgeStateWaitTimer) {
        clearTimeout(bridgeStateWaitTimer);
        bridgeStateWaitTimer = null;
    }
}

function waitForBridgeState(timeoutMs = 1200) {
    return new Promise((resolve) => {
        if (latestBridgeState) {
            resolve(latestBridgeState);
            return;
        }

        bridgeStateWaitResolver = resolve;
        bridgeStateWaitTimer = setTimeout(() => {
            resolveBridgeStateWait(latestBridgeState);
        }, timeoutMs);
    });
}

function requestNativeNotificationStateSync() {
    try {
        if (window.FoodTruckInterface && typeof window.FoodTruckInterface.requestNotificationStateSync === 'function') {
            window.FoodTruckInterface.requestNotificationStateSync();
            return;
        }

        if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.FoodTruckInterface) {
            window.webkit.messageHandlers.FoodTruckInterface.postMessage({
                action: 'requestNotificationStateSync'
            });
        }
    } catch (error) {
        console.warn('requestNotificationStateSync failed:', error);
    }
}

function openNativeNotificationSettings() {
    try {
        if (window.FoodTruckInterface && typeof window.FoodTruckInterface.openNotificationSettings === 'function') {
            window.FoodTruckInterface.openNotificationSettings();
            return;
        }

        if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.FoodTruckInterface) {
            window.webkit.messageHandlers.FoodTruckInterface.postMessage({
                action: 'openNotificationSettings'
            });
        }
    } catch (error) {
        console.warn('openNotificationSettings failed:', error);
    }
}

async function requestBridgeStateFromInterface() {
    try {
        if (!window.FoodTruckInterface || typeof window.FoodTruckInterface.getNotificationState !== 'function') {
            return null;
        }

        const result = window.FoodTruckInterface.getNotificationState();
        const rawState = (result && typeof result.then === 'function')
            ? await result
            : result;

        return parseBridgeState(rawState);
    } catch (error) {
        console.warn('getNotificationState failed:', error);
        return null;
    }
}

function applyBridgeState(state, source = 'native') {
    if (!state) return;

    latestBridgeState = state;
    resolveBridgeStateWait(state);
    setClientSourceHeader(resolveClientSourceByPlatform(state.platform));
    console.log(`[CouponBridge] state updated from ${source}:`, state);
}

function renderNotificationRequiredMessage() {
    const messageEl = document.getElementById('notificationRequiredMessage');
    if (!messageEl) return;

    if (!latestBridgeState) {
        messageEl.textContent = '알림 상태를 확인 중입니다. 알림을 켜고 앱으로 돌아오면 쿠폰이 표시됩니다.';
        return;
    }

    if (!latestBridgeState.permissionGranted) {
        messageEl.textContent = '휴대폰 앱 권한에서 알림을 먼저 켜주세요.';
        return;
    }

    if (!latestBridgeState.appNotificationEnabled) {
        messageEl.textContent = '앱 알림 설정이 꺼져 있습니다. 알림을 켜면 쿠폰이 표시됩니다.';
        return;
    }

    messageEl.textContent = '알림을 켜고 앱으로 돌아오면 쿠폰이 자동 표시됩니다.';
}

function showNotificationRequiredPopup() {
    const overlay = document.getElementById('notificationRequiredOverlay');
    if (!overlay) return;

    renderNotificationRequiredMessage();
    overlay.classList.add('show');
    hasShownNotificationRequiredPopup = true;
}

function hideNotificationRequiredPopup() {
    const overlay = document.getElementById('notificationRequiredOverlay');
    if (!overlay) return;
    overlay.classList.remove('show');
}

async function resolveCouponGateMode() {
    if (!hasNativeBridgeApi()) {
        return { mode: 'legacy', state: null };
    }

    const directState = await requestBridgeStateFromInterface();
    if (directState) {
        applyBridgeState(directState, 'direct-call');
        if (!hasRecognizedAppVersion(directState)) {
            return { mode: 'legacy', state: directState };
        }
        if (directState.supportsCouponGate === false) {
            return { mode: 'legacy', state: directState };
        }
        if (isBridgeCouponGateEnabled(directState)) {
            return { mode: 'bridge', state: directState };
        }
    }

    requestNativeNotificationStateSync();
    const syncedState = await waitForBridgeState(1500);
    if (!syncedState) {
        // 브릿지 API가 있는 앱은 상태를 확인하지 못하면 쿠폰을 막는(fail-closed) 정책 적용
        return { mode: 'bridge', state: null };
    }
    if (!hasRecognizedAppVersion(syncedState)) {
        return { mode: 'legacy', state: syncedState };
    }
    if (syncedState.supportsCouponGate === false) {
        return { mode: 'legacy', state: syncedState };
    }

    return { mode: 'bridge', state: syncedState };
}

let isEvaluatingCouponFlow = false;
async function evaluateCouponPopupFlow() {
    if (hasShownCouponPopup || isEvaluatingCouponFlow) {
        return;
    }

    isEvaluatingCouponFlow = true;
    try {
        if (couponGateMode === 'pending') {
            const decision = await resolveCouponGateMode();
            couponGateMode = decision.mode;
            if (decision.state) {
                latestBridgeState = decision.state;
            }
        }

        if (couponGateMode === 'legacy') {
            hideNotificationRequiredPopup();
            showDailyCouponPopup();
            return;
        }

        if (isBridgeCouponEligible(latestBridgeState)) {
            hideNotificationRequiredPopup();
            showDailyCouponPopup();
            return;
        }

        showNotificationRequiredPopup();
    } finally {
        isEvaluatingCouponFlow = false;
    }
}

function triggerPushPermissionCheck() {
    if (hasRequestedPushPopup) {
        return;
    }

    hasRequestedPushPopup = true;
    checkPushPermission();
}

function startWelcomePopupFlow() {
    if (hasStartedWelcomePopupFlow) {
        return;
    }

    hasStartedWelcomePopupFlow = true;
    const couponOverlay = document.getElementById('dailyCouponOverlay');
    if (!couponOverlay) {
        triggerPushPermissionCheck();
        return;
    }

    setTimeout(() => {
        evaluateCouponPopupFlow();
    }, 350);
}

function showDailyCouponPopup() {
    const couponOverlay = document.getElementById('dailyCouponOverlay');
    if (!couponOverlay) {
        triggerPushPermissionCheck();
        return;
    }

    const dateTimeEl = document.getElementById('dailyCouponDateTime');
    if (dateTimeEl) {
        dateTimeEl.textContent = formatCouponDateTime(new Date());
    }

    couponOverlay.classList.add('show');
    hasShownCouponPopup = true;
    hideNotificationRequiredPopup();
    console.log('오늘의 할인 쿠폰 팝업 표시');
}

function hideDailyCouponPopup() {
    const couponOverlay = document.getElementById('dailyCouponOverlay');
    if (couponOverlay) {
        couponOverlay.classList.remove('show');
    }
}

function closeDailyCouponPopup() {
    hideDailyCouponPopup();
    triggerPushPermissionCheck();
}

function closeNotificationRequiredPopup() {
    hideNotificationRequiredPopup();
}

function openNotificationSettingsAndWait() {
    renderNotificationRequiredMessage();
    openNativeNotificationSettings();
    setTimeout(() => {
        requestNativeNotificationStateSync();
    }, 300);
}

function handleNativeNotificationStateUpdate(payload, source = 'callback') {
    const parsed = parseBridgeState(payload);
    if (!parsed) return;

    applyBridgeState(parsed, source);
    if (hasStartedWelcomePopupFlow && couponGateMode === 'bridge' && !hasShownCouponPopup) {
        evaluateCouponPopupFlow();
    }
}

window.onFoodTruckNotificationStateChanged = function(payload) {
    handleNativeNotificationStateUpdate(payload, 'native-callback');
};

window.addEventListener('foodtruck:notification-state', (event) => {
    handleNativeNotificationStateUpdate(event.detail, 'native-event');
});

// ==================== 푸시 알림 동의 유도 팝업 ====================

// 푸시 알림 팝업 표시 체크
function checkPushPermission() {
    // 알림 유도 팝업 비활성화
    return;
}

// 푸시 알림 동의 모달 표시
function showPushModal() {
    const modal = document.getElementById('pushModalOverlay');
    if (modal) {
        modal.classList.add('show');
        console.log('푸시 알림 유도 팝업 표시');
    }
}

// 푸시 알림 동의 모달 숨기기
function hidePushModal() {
    const modal = document.getElementById('pushModalOverlay');
    if (modal) {
        modal.classList.remove('show');
    }
}

// 확인 버튼 클릭 - 팝업 닫기
function closePushModal() {
    console.log('푸시 알림 팝업 닫기');
    
    // 모달 닫기
    hidePushModal();
    
    // 로컬 스토리지에 표시 횟수 증가
    const popupCount = parseInt(localStorage.getItem('pushPopupCount')) || 0;
    localStorage.setItem('pushPopupCount', (popupCount + 1).toString());
    console.log(`푸시 팝업 표시 횟수: ${popupCount + 1}/3`);
}
