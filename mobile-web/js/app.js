// 앱 설정
const CONFIG = {
    API_BASE_URL: 'https://truck.carrera74.com/api',
    GOOGLE_MAPS_API_KEY: 'your-google-maps-api-key', // 실제 키로 교체 필요
};

// 전역 변수
let currentMenuData = [];
let currentLocationData = null;
let selectedCategory = 'all';

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
    
    // PWA 관련 설정
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/mobile/sw.js');
    }
    
    // 네비게이션 설정
    setupNavigation();
    
    // 스크롤 이벤트
    setupScrollEvents();
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
    
}

// 네비게이션 설정
function setupNavigation() {
    // 네이티브 앱과의 통신 브릿지 (placeholder)
    if (window.FoodTruckInterface) {
        window.FoodTruckInterface.setNavigationListener(navigateTo);
    }
}

// 스크롤 이벤트
function setupScrollEvents() {
    const scrollTopBtn = document.getElementById('scrollTopBtn');
    
    window.addEventListener('scroll', function() {
        const scrollPos = window.scrollY;
        
        if (scrollPos > 300) {
            scrollTopBtn.classList.add('visible');
        } else {
            scrollTopBtn.classList.remove('visible');
        }
    });
    
    scrollTopBtn.addEventListener('click', function() {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
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
        renderPopularMenu();
        console.log('데이터 로드 완료');
    } catch (error) {
        console.error('데이터 로드 실패:', error);
        showError('데이터를 불러오는데 실패했습니다.');
    } finally {
        showLoading(false);
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
        // 샘플 데이터로 fallback
        currentMenuData = getSampleMenuData();
        renderMenuGrid();
    }
}

// 위치 데이터 로드
async function loadLocationData() {
    try {
        console.log('위치 데이터 로드 시도:', `${CONFIG.API_BASE_URL}/location/current`);
        
        // DOM 요소가 존재하는지 확인
        const locationName = document.querySelector('#currentLocation .location-name');
        console.log('위치명 DOM 요소 확인:', locationName);
        
        if (!locationName) {
            console.error('위치명 DOM 요소를 찾을 수 없음');
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
        // 오류 시에도 메시지 표시
        currentLocationData = null;
        showNoLocationMessage('아직 어디로 갈지 몰라요');
    }
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

// 메뉴 그리드 렌더링
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
                <div class="menu-name">${menu.name}</div>
                <div class="menu-description">${menu.description || ''}</div>
                <div class="menu-price">${menu.price.toLocaleString()}원</div>
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
        console.log('위치명 설정:', currentLocationData.name);
    }
    if (locationAddress) {
        locationAddress.textContent = currentLocationData.address;
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
        locationHours.textContent = `영업시간: ${openTime} - ${closeTime}`;
        console.log('영업시간 설정:', `영업시간: ${openTime} - ${closeTime}`);
    }
    
    if (locationNotice) {
        locationNotice.textContent = currentLocationData.notice || '';
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

// 인기메뉴 렌더링
function renderPopularMenu() {
    const container = document.getElementById('popularMenuGrid');
    if (!container) {
        console.error('popularMenuGrid 컨테이너를 찾을 수 없습니다');
        return;
    }
    
    console.log('인기메뉴 렌더링 시작, 메뉴 데이터:', currentMenuData);
    
    // 이미지가 있는 메뉴만 필터링하고 최대 3개까지 표시
    const popularMenus = currentMenuData
        .filter(menu => menu.imageUrl && menu.isAvailable)
        .slice(0, 3);
    
    console.log('필터링된 인기메뉴:', popularMenus);
    
    if (popularMenus.length === 0) {
        console.log('표시할 인기메뉴가 없습니다');
        container.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">인기메뉴를 준비중입니다</p>';
        return;
    }
    
    container.innerHTML = popularMenus.map(menu => {
        // 이미지 URL을 절대 경로로 변환
        const imageUrl = menu.imageUrl.startsWith('/') 
            ? `https://truck.carrera74.com${menu.imageUrl}` 
            : menu.imageUrl;
        
        return `
            <div class="popular-menu-item" onclick="selectMenu('${menu.id}')">
                <div class="popular-menu-image">
                    <img src="${imageUrl}" alt="${menu.name}" onerror="handleImageError(this)">
                    <div class="popular-menu-heart">
                        <i class="fas fa-heart"></i>
                    </div>
                </div>
                <div class="popular-menu-info">
                    <div class="popular-menu-name">${menu.name}</div>
                    <div class="popular-menu-price">${menu.price.toLocaleString()}원</div>
                </div>
            </div>
        `;
    }).join('');
    
    console.log('인기메뉴 렌더링 완료');
}

// UI 업데이트
function updateUI() {
    renderMenuGrid();
    updateLocationDisplay();
    renderPopularMenu();
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

// 메뉴 선택
function selectMenu(menuId) {
    const menu = currentMenuData.find(m => m.id === menuId);
    if (!menu) return;
    
    // 앱 내에서 메뉴 상세 정보 표시 (간단한 알림으로 대체)
    if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
    }
    
    showSuccess(`${menu.name} 선택됨`);
    
    // 네이티브 앱에 메뉴 선택 알림
    if (window.FoodTruckInterface) {
        window.FoodTruckInterface.onMenuSelected({
            id: menu.id,
            name: menu.name,
            price: menu.price,
            description: menu.description
        });
    }
}

// 알림 토글 처리
function handleNotificationToggle(event) {
    const toggleType = event.target.id;
    const isEnabled = event.target.checked;
    
    console.log(`${toggleType} ${isEnabled ? '활성화' : '비활성화'}`);
    
    // 네이티브 앱에 알림 설정 변경 알림
    if (window.FoodTruckInterface) {
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


