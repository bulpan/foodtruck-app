// 토스트 알림 시스템
function showToast(message, type = 'info', title = null, duration = 5000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toastId = 'toast-' + Date.now();
    const icons = {
        success: 'fas fa-check-circle text-success',
        error: 'fas fa-exclamation-circle text-danger',
        warning: 'fas fa-exclamation-triangle text-warning',
        info: 'fas fa-info-circle text-info'
    };

    const titles = {
        success: '성공',
        error: '오류',
        warning: '경고',
        info: '알림'
    };

    const toast = document.createElement('div');
    toast.id = toastId;
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div class="toast-header">
            <i class="toast-icon ${icons[type]}"></i>
            <h6 class="toast-title">${title || titles[type]}</h6>
            <button class="toast-close" onclick="closeToast('${toastId}')">&times;</button>
        </div>
        <div class="toast-body">${message}</div>
    `;

    container.appendChild(toast);

    // 자동 제거
    if (duration > 0) {
        setTimeout(() => {
            closeToast(toastId);
        }, duration);
    }

    return toastId;
}

function closeToast(toastId) {
    const toast = document.getElementById(toastId);
    if (toast) {
        toast.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => {
            toast.remove();
        }, 300);
    }
}

// 기존 showLoginAlert 함수를 토스트로 교체
function showLoginAlert(message, type) {
    showToast(message, type, null, 4000);
}

// 전역 변수
let authToken = null;
let currentEditingMenuId = null;
let currentEditingLocationId = null;

// API 기본 URL
const API_BASE_URL = window.location.origin + '/api';

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', function() {
    console.log('Admin page loaded');
    
    // 로그인 폼 이벤트 리스너
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        console.log('Login form found, adding event listener');
        loginForm.addEventListener('submit', handleLogin);
    } else {
        console.error('Login form not found!');
    }
    
    // 메뉴 폼 이벤트 리스너
    const menuForm = document.getElementById('menu-form-element');
    if (menuForm) {
        menuForm.addEventListener('submit', handleMenuSubmit);
    }
    
    // 위치 폼 이벤트 리스너
    const locationForm = document.getElementById('location-form-element');
    if (locationForm) {
        locationForm.addEventListener('submit', handleLocationSubmit);
    }
    
    // 푸시 폼 이벤트 리스너
    const pushForm = document.getElementById('push-form');
    if (pushForm) {
        pushForm.addEventListener('submit', handlePushSubmit);
    }
    
    // 접속 추이 탭 이벤트 리스너
    const analyticsTab = document.getElementById('token-analytics-tab');
    if (analyticsTab) {
        analyticsTab.addEventListener('shown.bs.tab', function() {
            // 탭이 활성화되면 자동으로 데이터 로드
            loadAnalytics();
        });
    }
    
    // 접속 추이 날짜 기본값 설정
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    
    const analyticsEndDate = document.getElementById('analyticsEndDate');
    const analyticsStartDate = document.getElementById('analyticsStartDate');
    if (analyticsEndDate && analyticsStartDate) {
        analyticsEndDate.value = endDate.toISOString().split('T')[0];
        analyticsStartDate.value = startDate.toISOString().split('T')[0];
    }
    
    // 저장된 토큰이 있는지 확인
    const savedToken = localStorage.getItem('adminToken');
    if (savedToken) {
        authToken = savedToken;
        // 토큰 유효성 검증
        validateToken();
    } else {
        showLoginSection();
    }
    
    console.log('Admin page initialization complete');
});

// 토큰 유효성 검증
async function validateToken() {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (response.ok) {
            showMainContent();
            loadDashboardData();
        } else {
            // 토큰이 유효하지 않으면 로그인 화면으로
            localStorage.removeItem('adminToken');
            authToken = null;
            showLoginSection();
        }
    } catch (error) {
        console.error('Token validation error:', error);
        localStorage.removeItem('adminToken');
        authToken = null;
        showLoginSection();
    }
}

// 로그인 섹션 표시
function showLoginSection() {
    document.getElementById('login-section').style.display = 'flex';
    document.getElementById('main-content').style.display = 'none';
    // 에러 메시지 초기화
    clearLoginError();
}

// 로그인 에러 메시지 표시
function showLoginError(message) {
    const alertDiv = document.getElementById('login-alert');
    if (alertDiv) {
        alertDiv.innerHTML = `
            <div class="alert alert-danger alert-dismissible fade show" role="alert">
                <i class="fas fa-exclamation-triangle me-2"></i>
                <strong>로그인 실패</strong><br>
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        `;
        alertDiv.style.display = 'block';
        
        // 로그인 폼으로 스크롤
        alertDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

// 로그인 에러 메시지 초기화
function clearLoginError() {
    const alertDiv = document.getElementById('login-alert');
    if (alertDiv) {
        alertDiv.innerHTML = '';
        alertDiv.style.display = 'none';
    }
}

// 메인 콘텐츠 표시
function showMainContent() {
    console.log('showMainContent called');
    
    const loginSection = document.getElementById('login-section');
    const mainContent = document.getElementById('main-content');
    
    console.log('login-section:', loginSection);
    console.log('main-content:', mainContent);
    
    if (loginSection) {
        loginSection.style.display = 'none';
        loginSection.style.visibility = 'hidden';
        console.log('Login section hidden');
    }
    
    if (mainContent) {
        mainContent.style.display = 'block';
        mainContent.style.visibility = 'visible';
        console.log('Main content shown');
    }
    
    // 강제로 화면 업데이트
    document.body.style.display = 'none';
    document.body.offsetHeight; // 리플로우 강제 실행
    document.body.style.display = '';
    
    // 사이드바 활성화 (PC)
    document.querySelectorAll('.sidebar .nav-link').forEach(link => {
        link.classList.remove('active');
    });
    const dashboardSidebarLink = document.querySelector('.sidebar .nav-link[onclick*="dashboard"]');
    if (dashboardSidebarLink) {
        dashboardSidebarLink.classList.add('active');
        console.log('Dashboard sidebar link activated');
    }
    
    // 모바일 탭 활성화
    document.querySelectorAll('.mobile-nav .nav-link').forEach(link => {
        link.classList.remove('active');
    });
    const dashboardMobileLink = document.querySelector('.mobile-nav .nav-link[onclick*="dashboard"]');
    if (dashboardMobileLink) {
        dashboardMobileLink.classList.add('active');
        console.log('Dashboard mobile link activated');
    }
}

// 로그인 처리
async function handleLogin(e) {
    e.preventDefault();
    console.log('Login form submitted');
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    console.log('Username:', username);
    console.log('API URL:', `${API_BASE_URL}/auth/login`);
    
    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        
        console.log('Response status:', response.status);
        const data = await response.json();
        console.log('Response data:', data);
        
        if (response.ok) {
            authToken = data.token;
            localStorage.setItem('adminToken', authToken);
            
            // 에러 메시지 초기화
            clearLoginError();
            
            // 로그인 성공 시 즉시 화면 전환
            showMainContent();
            loadDashboardData();
            showToast('로그인에 성공했습니다!', 'success', '로그인 성공', 3000);
        } else {
            const errorMessage = data.error || '로그인에 실패했습니다.';
            
            // 로그인 폼 아래에 에러 메시지 표시
            showLoginError(errorMessage);
            
            // 로그인 제한 에러인지 확인
            if (errorMessage.includes('너무 많은 로그인 시도') || errorMessage.includes('일시적으로 차단')) {
                showToast(
                    errorMessage,
                    'warning',
                    '로그인 제한',
                    10000
                );
            } else if (errorMessage.includes('사용자명 또는 비밀번호')) {
                showToast(
                    '사용자명 또는 비밀번호가 올바르지 않습니다.<br>다시 확인해주세요.',
                    'error',
                    '로그인 실패',
                    5000
                );
            } else if (errorMessage.includes('계정이 비활성화')) {
                showToast(
                    '계정이 비활성화되었습니다.<br>관리자에게 문의하세요.',
                    'error',
                    '계정 비활성화',
                    6000
                );
            } else {
                showToast(errorMessage, 'error', '로그인 오류', 5000);
            }
        }
    } catch (error) {
        console.error('Login error:', error);
        const errorMsg = '네트워크 오류가 발생했습니다. 인터넷 연결을 확인하고 다시 시도해주세요.';
        showLoginError(errorMsg);
        showToast(
            errorMsg,
            'error',
            '연결 오류',
            6000
        );
    }
}

// 로그아웃 처리
function logout() {
    console.log('Logout called');
    
    // 토큰 제거
    authToken = null;
    localStorage.removeItem('adminToken');
    
    // 페이지 새로고침하여 로그인 화면으로 리다이렉트
    window.location.href = window.location.pathname;
    
    console.log('Logout completed');
}

// API 호출 시 인증 헤더 추가
function getAuthHeaders() {
    if (!authToken) {
        showLoginSection();
        showToast('로그인이 필요합니다.', 'warning', '인증 필요', 3000);
        throw new Error('인증이 필요합니다.');
    }
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
    };
}


// 섹션 표시 (반응형 네비게이션 지원)
function showSection(sectionName) {
    // 모든 섹션 숨기기
    document.querySelectorAll('.page-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // 선택된 섹션 표시
    const targetSection = document.getElementById(`${sectionName}-section`);
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    // PC 사이드바 활성화
    document.querySelectorAll('.sidebar .nav-link').forEach(link => {
        link.classList.remove('active');
    });
    const activeSidebarLink = document.querySelector(`.sidebar .nav-link[onclick*="${sectionName}"]`);
    if (activeSidebarLink) {
        activeSidebarLink.classList.add('active');
    }
    
    // 모바일 탭 활성화
    document.querySelectorAll('.mobile-nav .nav-link').forEach(link => {
        link.classList.remove('active');
    });
    const activeMobileLink = document.querySelector(`.mobile-nav .nav-link[onclick*="${sectionName}"]`);
    if (activeMobileLink) {
        activeMobileLink.classList.add('active');
    }
    
    // 섹션별 데이터 로드
    switch(sectionName) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'menu':
            loadMenus();
            break;
        case 'location':
            loadLocations();
            break;
        case 'push':
            loadPushStats();
            loadRecentPushNotifications();
            break;
        case 'tokens':
            loadTokens();
            // 필터 이벤트 리스너 설정
            setTimeout(() => {
                setupTokenFilters();
            }, 100);
            break;
    }
}

// 대시보드 데이터 로드
async function loadDashboardData() {
    try {
        const [menusResponse, tokensResponse, locationsResponse] = await Promise.all([
            fetch(`${API_BASE_URL}/menu`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            }),
            fetch(`${API_BASE_URL}/fcm/tokens`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            }),
            fetch(`${API_BASE_URL}/location/current`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            })
        ]);
        
        const menusData = await menusResponse.json();
        const tokensData = await tokensResponse.json();
        const locationsData = await locationsResponse.json();
        
        // 통계 업데이트
        document.getElementById('total-devices').textContent = tokensData.count || 0;
        document.getElementById('total-menus').textContent = menusData.menus?.length || 0;
        document.getElementById('current-location').textContent = locationsData.location ? '1' : '0';
        
        // 푸시 발송 내역과 금일 건수 로드
        await Promise.all([
            loadPushHistory(),
            loadTodayPushCount()
        ]);
        
    } catch (error) {
        console.error('Dashboard data load error:', error);
    }
}

// 메뉴 관리
async function loadMenus() {
    try {
        const response = await fetch(`${API_BASE_URL}/menu`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const data = await response.json();
        
        const menuList = document.getElementById('menu-list');
        menuList.innerHTML = '';
        
        if (data.menus && data.menus.length > 0) {
            data.menus.forEach((menu, index) => {
                const row = document.createElement('tr');
                row.dataset.menuId = menu.id;
                row.dataset.sortOrder = menu.sortOrder || index;
                row.innerHTML = `
                    <td class="text-center">
                        <span class="badge bg-secondary">${menu.sortOrder || index + 1}</span>
                    </td>
                    <td class="text-center">
                        <div class="btn-group-vertical" role="group">
                            <button class="btn btn-sm btn-outline-secondary" onclick="moveMenuUp('${menu.id}')" title="위로 이동">
                                <i class="fas fa-chevron-up"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-secondary" onclick="moveMenuDown('${menu.id}')" title="아래로 이동">
                                <i class="fas fa-chevron-down"></i>
                            </button>
                        </div>
                    </td>
                    <td>${menu.name}</td>
                    <td>${menu.price.toLocaleString()}원</td>
                    <td>${menu.category}</td>
                    <td>
                        <span class="badge ${menu.isAvailable ? 'bg-success' : 'bg-danger'}">
                            ${menu.isAvailable ? '판매중' : '품절'}
                        </span>
                    </td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary me-2" onclick="editMenu('${menu.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteMenu('${menu.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                `;
                menuList.appendChild(row);
            });
        } else {
            menuList.innerHTML = '<tr><td colspan="7" class="text-center text-muted">등록된 메뉴가 없습니다.</td></tr>';
        }
    } catch (error) {
        console.error('Load menus error:', error);
        showAlert('메뉴 목록을 불러오는 중 오류가 발생했습니다.', 'danger');
    }
}

// 드래그 위치 계산
function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('tr[draggable]:not(.dragging)')];
    
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// 메뉴 위로 이동
async function moveMenuUp(menuId) {
    try {
        const menuList = document.getElementById('menu-list');
        const rows = Array.from(menuList.querySelectorAll('tr[data-menu-id]'));
        const currentIndex = rows.findIndex(row => row.dataset.menuId === menuId);
        
        if (currentIndex > 0) {
            // DOM에서 위치 변경
            const currentRow = rows[currentIndex];
            const previousRow = rows[currentIndex - 1];
            menuList.insertBefore(currentRow, previousRow);
            
            // 서버에 순서 업데이트
            await updateMenuOrder();
        }
    } catch (error) {
        console.error('Move menu up error:', error);
        showAlert('메뉴 순서 변경 중 오류가 발생했습니다.', 'danger');
    }
}

// 메뉴 아래로 이동
async function moveMenuDown(menuId) {
    try {
        const menuList = document.getElementById('menu-list');
        const rows = Array.from(menuList.querySelectorAll('tr[data-menu-id]'));
        const currentIndex = rows.findIndex(row => row.dataset.menuId === menuId);
        
        if (currentIndex < rows.length - 1) {
            // DOM에서 위치 변경
            const currentRow = rows[currentIndex];
            const nextRow = rows[currentIndex + 1];
            menuList.insertBefore(currentRow, nextRow.nextSibling);
            
            // 서버에 순서 업데이트
            await updateMenuOrder();
        }
    } catch (error) {
        console.error('Move menu down error:', error);
        showAlert('메뉴 순서 변경 중 오류가 발생했습니다.', 'danger');
    }
}

// 메뉴 순서 업데이트
async function updateMenuOrder() {
    try {
        console.log('updateMenuOrder 시작');
        const menuList = document.getElementById('menu-list');
        const rows = menuList.querySelectorAll('tr[data-menu-id]');
        
        const menuOrders = Array.from(rows).map((row, index) => ({
            id: row.dataset.menuId,
            sortOrder: index + 1
        }));
        
        console.log('업데이트할 메뉴 순서:', menuOrders);
        
        const response = await fetch(`${API_BASE_URL}/menu/order`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ menuOrders })
        });
        
        console.log('API 응답 상태:', response.status);
        
        if (response.ok) {
            // 순서 번호 업데이트
            rows.forEach((row, index) => {
                const orderBadge = row.querySelector('.badge.bg-secondary');
                if (orderBadge) {
                    orderBadge.textContent = index + 1;
                }
            });
            
            showAlert('메뉴 순서가 업데이트되었습니다.', 'success');
        } else {
            const error = await response.json();
            showAlert(`순서 업데이트 실패: ${error.error}`, 'danger');
        }
    } catch (error) {
        console.error('Update menu order error:', error);
        showAlert('메뉴 순서 업데이트 중 오류가 발생했습니다.', 'danger');
    }
}

// 메뉴 추가 폼 표시
function showAddMenuForm() {
    currentEditingMenuId = null;
    document.getElementById('menu-form-title').textContent = '메뉴 추가';
    document.getElementById('menu-form-element').reset();
    
    // 이미지 관련 요소 초기화
    document.getElementById('current-image-preview').style.display = 'none';
    document.getElementById('new-image-upload').style.display = 'block';
    
    document.getElementById('menu-form').style.display = 'block';
}

// URL 벨리데이션 함수
function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

// 현재 이미지 제거
function removeCurrentImage() {
    const currentImagePreview = document.getElementById('current-image-preview');
    const newImageUpload = document.getElementById('new-image-upload');
    
    // 기존 이미지 미리보기 숨기기
    currentImagePreview.style.display = 'none';
    
    // 새 이미지 업로드 폼 표시
    newImageUpload.style.display = 'block';
    
    // 이미지 URL 필드 초기화
    document.getElementById('menu-image-url').value = '';
    document.getElementById('menu-image').value = '';
}

// 메뉴 편집
async function editMenu(menuId) {
    try {
        const response = await fetch(`${API_BASE_URL}/menu/${menuId}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const data = await response.json();
        
        if (response.ok) {
            currentEditingMenuId = menuId;
            document.getElementById('menu-form-title').textContent = '메뉴 편집';
            document.getElementById('menu-id').value = menuId;
            document.getElementById('menu-name').value = data.menu.name;
            document.getElementById('menu-price').value = data.menu.price;
            document.getElementById('menu-description').value = data.menu.description || '';
            
            // 카테고리 설정 (기존 데이터가 있으면 선택)
            const categorySelect = document.getElementById('menu-category');
            categorySelect.value = data.menu.category || '메인';
            
            // 판매 상태 설정
            document.getElementById('menu-available').value = data.menu.isAvailable.toString();
            
            // 이미지 처리
            const currentImagePreview = document.getElementById('current-image-preview');
            const newImageUpload = document.getElementById('new-image-upload');
            const currentImage = document.getElementById('current-image');
            
            if (data.menu.imageUrl) {
                // 기존 이미지가 있으면 미리보기 표시
                currentImage.src = data.menu.imageUrl;
                currentImagePreview.style.display = 'block';
                newImageUpload.style.display = 'none';
                
                // 숨겨진 필드에 기존 이미지 URL 저장
                document.getElementById('menu-image-url').value = data.menu.imageUrl;
            } else {
                // 기존 이미지가 없으면 새 이미지 업로드 폼 표시
                currentImagePreview.style.display = 'none';
                newImageUpload.style.display = 'block';
                document.getElementById('menu-image').value = '';
                document.getElementById('menu-image-url').value = '';
            }
            
            document.getElementById('menu-form').style.display = 'block';
        }
    } catch (error) {
        console.error('Edit menu error:', error);
        showToast('메뉴 정보를 불러오는 중 오류가 발생했습니다.', 'error', '오류', 5000);
    }
}

// 메뉴 폼 숨기기
function hideMenuForm() {
    document.getElementById('menu-form').style.display = 'none';
    currentEditingMenuId = null;
    
    // 이미지 관련 요소 초기화
    document.getElementById('current-image-preview').style.display = 'none';
    document.getElementById('new-image-upload').style.display = 'block';
}

// 메뉴 저장
async function handleMenuSubmit(e) {
    e.preventDefault();
    
    // 폼 벨리데이션 체크
    const menuName = document.getElementById('menu-name').value.trim();
    const menuPrice = document.getElementById('menu-price').value;
    const menuCategory = document.getElementById('menu-category').value;
    
    if (!menuName) {
        showToast('메뉴명을 입력해주세요.', 'error', '입력 오류', 3000);
        document.getElementById('menu-name').focus();
        return;
    }
    
    if (!menuPrice || parseFloat(menuPrice) <= 0) {
        showToast('올바른 가격을 입력해주세요.', 'error', '입력 오류', 3000);
        document.getElementById('menu-price').focus();
        return;
    }
    
    if (!menuCategory) {
        showToast('카테고리를 선택해주세요.', 'error', '입력 오류', 3000);
        document.getElementById('menu-category').focus();
        return;
    }
    
    const formData = new FormData();
    formData.append('name', menuName);
    formData.append('price', menuPrice);
    formData.append('description', document.getElementById('menu-description').value);
    formData.append('category', menuCategory);
    formData.append('isAvailable', document.getElementById('menu-available').value === 'true');
    
    // 이미지 처리
    const imageFile = document.getElementById('menu-image').files[0];
    const imageUrl = document.getElementById('menu-image-url').value.trim();
    const currentImagePreview = document.getElementById('current-image-preview');
    
    // 이미지 URL 벨리데이션 (URL이 입력된 경우)
    if (imageUrl && !isValidUrl(imageUrl)) {
        showToast('올바른 이미지 URL 형식을 입력해주세요.', 'error', '입력 오류', 3000);
        document.getElementById('menu-image-url').focus();
        return;
    }
    
    // 기존 이미지가 있고 새 이미지를 업로드하지 않은 경우
    if (currentImagePreview.style.display !== 'none' && !imageFile && !imageUrl) {
        // 기존 이미지 URL을 그대로 사용
        const currentImageSrc = document.getElementById('current-image').src;
        if (currentImageSrc) {
            formData.append('imageUrl', currentImageSrc);
            console.log('기존 이미지 URL 유지:', currentImageSrc);
        }
    } else if (imageFile) {
        // 새 이미지 파일 업로드
        formData.append('image', imageFile);
        console.log('새 이미지 파일 추가:', imageFile.name);
    } else if (imageUrl) {
        // 새 이미지 URL 사용
        formData.append('imageUrl', imageUrl);
        console.log('새 이미지 URL 추가:', imageUrl);
    }
    
    // FormData 내용 확인
    console.log('FormData 내용:');
    for (let [key, value] of formData.entries()) {
        console.log(key, ':', value);
    }
    
    try {
        const url = currentEditingMenuId 
            ? `${API_BASE_URL}/menu/${currentEditingMenuId}`
            : `${API_BASE_URL}/menu`;
        
        const method = currentEditingMenuId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Authorization': `Bearer ${authToken}`
            },
            body: formData
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showAlert(currentEditingMenuId ? '메뉴가 수정되었습니다.' : '메뉴가 추가되었습니다.', 'success');
            hideMenuForm();
            loadMenus();
        } else {
            showAlert(data.error || '메뉴 저장 중 오류가 발생했습니다.', 'danger');
        }
    } catch (error) {
        console.error('Menu submit error:', error);
        showAlert('메뉴 저장 중 오류가 발생했습니다.', 'danger');
    }
}

// 메뉴 삭제
async function deleteMenu(menuId) {
    if (!confirm('정말로 이 메뉴를 삭제하시겠습니까?')) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/menu/${menuId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (response.ok) {
            showAlert('메뉴가 삭제되었습니다.', 'success');
            loadMenus();
        } else {
            const data = await response.json();
            showAlert(data.error || '메뉴 삭제 중 오류가 발생했습니다.', 'danger');
        }
    } catch (error) {
        console.error('Delete menu error:', error);
        showAlert('메뉴 삭제 중 오류가 발생했습니다.', 'danger');
    }
}

// 위치 관리
async function loadLocations() {
    try {
        const response = await fetch(`${API_BASE_URL}/location/current`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const data = await response.json();
        
        const locationList = document.getElementById('location-list');
        locationList.innerHTML = '';
        
        if (data.location) {
            const location = data.location;
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${location.name}</td>
                <td>${location.address}</td>
                <td>${location.openTime} - ${location.closeTime}</td>
                <td>
                    <span class="badge ${location.isActive ? 'bg-success' : 'bg-secondary'}">
                        ${location.isActive ? '활성' : '비활성'}
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-outline-primary me-2" onclick="editLocation('${location.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                </td>
            `;
            locationList.appendChild(row);
        } else {
            locationList.innerHTML = '<tr><td colspan="5" class="text-center text-muted">등록된 위치가 없습니다.</td></tr>';
        }
    } catch (error) {
        console.error('Load locations error:', error);
        showAlert('위치 정보를 불러오는 중 오류가 발생했습니다.', 'danger');
    }
}

// 위치 추가 폼 표시
function showAddLocationForm() {
    currentEditingLocationId = null;
    document.getElementById('location-form-title').textContent = '위치 추가';
    document.getElementById('location-form-element').reset();
    document.getElementById('location-form').style.display = 'block';
    document.getElementById('delete-location-btn').style.display = 'none';
    
    // 현재 날짜로 설정
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('location-date').value = today;
    
    // 이력 로드
    loadLocationHistory();
}

// 위치 편집
async function editLocation(locationId) {
    try {
        const response = await fetch(`${API_BASE_URL}/location/current`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const data = await response.json();
        
        if (response.ok && data.location) {
            const location = data.location;
            currentEditingLocationId = locationId;
            document.getElementById('location-form-title').textContent = '위치 편집';
            document.getElementById('location-id').value = locationId;
            document.getElementById('location-name').value = location.name;
            document.getElementById('location-address').value = location.address;
            
            // 시간 값을 HH:MM 형식으로 설정 (input type="time"은 HH:MM 형식을 기대함)
            document.getElementById('location-open-time').value = location.openTime || '';
            document.getElementById('location-close-time').value = location.closeTime || '';
            
            // 날짜 설정
            document.getElementById('location-date').value = location.date || new Date().toISOString().split('T')[0];
            
            document.getElementById('location-notice').value = location.notice || '';
            document.getElementById('location-form').style.display = 'block';
            document.getElementById('delete-location-btn').style.display = 'inline-block';
            
            // 이력 로드
            loadLocationHistory();
        }
    } catch (error) {
        console.error('Edit location error:', error);
        showAlert('위치 정보를 불러오는 중 오류가 발생했습니다.', 'danger');
    }
}

// 위치 폼 숨기기
function hideLocationForm() {
    document.getElementById('location-form').style.display = 'none';
    document.getElementById('delete-location-btn').style.display = 'none';
    currentEditingLocationId = null;
}

// 위치 저장
async function handleLocationSubmit(e) {
    e.preventDefault();
    
    // 시간 값을 HH:MM 형식으로 변환 (HH:MM:SS -> HH:MM)
    const formatTime = (timeValue) => {
        if (!timeValue) return null;
        return timeValue.substring(0, 5); // HH:MM:SS -> HH:MM
    };
    
    const formData = {
        name: document.getElementById('location-name').value,
        address: document.getElementById('location-address').value,
        date: document.getElementById('location-date').value,
        openTime: formatTime(document.getElementById('location-open-time').value),
        closeTime: formatTime(document.getElementById('location-close-time').value),
        notice: document.getElementById('location-notice').value
    };
    
    try {
        const url = currentEditingLocationId 
            ? `${API_BASE_URL}/location/admin/${currentEditingLocationId}`
            : `${API_BASE_URL}/location/admin`;
        
        const method = currentEditingLocationId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showAlert(currentEditingLocationId ? '위치가 수정되었습니다.' : '위치가 추가되었습니다.', 'success');
            
            // 이력에 저장
            saveLocationToHistory(formData);
            
            hideLocationForm();
            loadLocations();
        } else {
            showAlert(data.error || '위치 저장 중 오류가 발생했습니다.', 'danger');
        }
    } catch (error) {
        console.error('Location submit error:', error);
        showAlert('위치 저장 중 오류가 발생했습니다.', 'danger');
    }
}

// 위치 삭제
async function deleteLocation() {
    if (!currentEditingLocationId) {
        showAlert('삭제할 위치를 선택해주세요.', 'warning');
        return;
    }
    
    if (!confirm('정말로 이 위치를 삭제하시겠습니까?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/location/admin/${currentEditingLocationId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (response.ok) {
            showAlert('위치가 삭제되었습니다.', 'success');
            hideLocationForm();
            loadLocations();
        } else {
            const data = await response.json();
            showAlert(data.error || '위치 삭제 중 오류가 발생했습니다.', 'danger');
        }
    } catch (error) {
        console.error('Delete location error:', error);
        showAlert('위치 삭제 중 오류가 발생했습니다.', 'danger');
    }
}

// 위치 이력 저장
function saveLocationToHistory(locationData) {
    let history = JSON.parse(localStorage.getItem('locationHistory') || '[]');
    
    // 현재 날짜로 설정
    const today = new Date().toISOString().split('T')[0];
    locationData.date = today;
    
    // 중복 제거 (같은 이름과 주소가 있으면 제거)
    history = history.filter(item => 
        !(item.name === locationData.name && item.address === locationData.address)
    );
    
    // 새 항목 추가
    history.unshift(locationData);
    
    // 최대 5개만 유지
    if (history.length > 5) {
        history = history.slice(0, 5);
    }
    
    localStorage.setItem('locationHistory', JSON.stringify(history));
}

// 위치 이력 로드
function loadLocationHistory() {
    const history = JSON.parse(localStorage.getItem('locationHistory') || '[]');
    const select = document.getElementById('location-history');
    
    // 기존 옵션 제거 (첫 번째 옵션 제외)
    while (select.children.length > 1) {
        select.removeChild(select.lastChild);
    }
    
    // 이력 옵션 추가
    history.forEach((item, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = `${item.name} - ${item.address} (${item.date})`;
        select.appendChild(option);
    });
}

// 이력에서 위치 로드
function loadLocationFromHistory() {
    const select = document.getElementById('location-history');
    const history = JSON.parse(localStorage.getItem('locationHistory') || '[]');
    
    if (select.value !== '') {
        const index = parseInt(select.value);
        const item = history[index];
        
        if (item) {
            document.getElementById('location-name').value = item.name || '';
            document.getElementById('location-address').value = item.address || '';
            document.getElementById('location-open-time').value = item.openTime || '';
            document.getElementById('location-close-time').value = item.closeTime || '';
            document.getElementById('location-notice').value = item.notice || '';
            
            // 날짜는 현재 날짜로 설정
            const today = new Date().toISOString().split('T')[0];
            document.getElementById('location-date').value = today;
        }
    }
}

// 푸시 발송 통계 로드
async function loadPushStats() {
    try {
        const response = await fetch(`${API_BASE_URL}/fcm/tokens`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const data = await response.json();
        
        const totalDevices = data.count || 0;
        const androidDevices = data.tokens?.filter(token => token.deviceType === 'android').length || 0;
        const iosDevices = data.tokens?.filter(token => token.deviceType === 'ios').length || 0;
        
        // 알림 설정이 허용된 디바이스 수 계산
        const notificationEnabledDevices = data.tokens?.filter(token => token.notificationEnabled).length || 0;
        const androidNotificationEnabled = data.tokens?.filter(token => token.deviceType === 'android' && token.notificationEnabled).length || 0;
        const iosNotificationEnabled = data.tokens?.filter(token => token.deviceType === 'ios' && token.notificationEnabled).length || 0;
        
        document.getElementById('total-devices-stats').textContent = totalDevices;
        document.getElementById('android-devices').textContent = `${androidDevices} (알림 허용: ${androidNotificationEnabled})`;
        document.getElementById('ios-devices').textContent = `${iosDevices} (알림 허용: ${iosNotificationEnabled})`;
        
    } catch (error) {
        console.error('Load push stats error:', error);
    }
}

// 푸시 발송
async function handlePushSubmit(e) {
    e.preventDefault();
    
    const title = document.getElementById('push-title').value;
    const body = document.getElementById('push-body').value;
    const target = document.getElementById('push-target').value;
    const type = document.getElementById('push-type').value;
    
    // 발송 상태 UI 표시
    showPushProgress();
    
    try {
        // 먼저 토큰 목록 가져오기
        const tokensResponse = await fetch(`${API_BASE_URL}/fcm/tokens`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const tokensData = await tokensResponse.json();
        
        if (!tokensData.tokens || tokensData.tokens.length === 0) {
            hidePushProgress();
            showAlert('발송할 디바이스가 없습니다.', 'warning');
            return;
        }
        
        // 알림 설정이 허용된 디바이스 수 확인
        const notificationEnabledTokens = tokensData.tokens.filter(token => token.notificationEnabled);
        console.log('등록된 토큰 수:', tokensData.tokens.length);
        console.log('알림 허용된 토큰 수:', notificationEnabledTokens.length);
        
        if (notificationEnabledTokens.length === 0) {
            hidePushProgress();
            showAlert('알림 설정을 허용한 사용자가 없습니다.', 'warning');
            return;
        }
        
        // 발송 상태 업데이트
        updatePushProgress(0, notificationEnabledTokens.length, '발송 준비 중...');
        
        // 푸시 발송 요청
        const pushData = {
            title: title,
            body: body,
            data: {
                type: type,
                timestamp: new Date().toISOString()
            },
            target: target  // 대상 정보 추가
        };
        
        const response = await fetch(`${API_BASE_URL}/push/send`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(pushData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // 발송 완료 상태 업데이트
            updatePushProgress(data.notification.sentCount, data.notification.targetCount, '발송 완료!');
            
            // 2초 후 상태 UI 숨기기
            setTimeout(() => {
                hidePushProgress();
                showAlert(`푸시 알림이 발송되었습니다. (성공: ${data.notification.sentCount}, 실패: ${data.notification.failedCount})`, 'success');
                document.getElementById('push-form').reset();
                
                // 푸시 발송 내역과 금일 건수 새로고침
                loadPushHistory();
                loadTodayPushCount();
            }, 2000);
        } else {
            hidePushProgress();
            showAlert(data.error || '푸시 발송 중 오류가 발생했습니다.', 'danger');
        }
    } catch (error) {
        console.error('Push submit error:', error);
        hidePushProgress();
        showAlert('푸시 발송 중 오류가 발생했습니다.', 'danger');
    }
}

// 발송 상태 UI 표시
function showPushProgress() {
    const progressDiv = document.getElementById('push-progress');
    if (progressDiv) {
        progressDiv.style.display = 'block';
    }
}

// 발송 상태 UI 숨기기
function hidePushProgress() {
    const progressDiv = document.getElementById('push-progress');
    if (progressDiv) {
        progressDiv.style.display = 'none';
    }
}

// 발송 상태 업데이트
function updatePushProgress(sent, total, status) {
    const statusText = document.getElementById('push-status-text');
    const progressText = document.getElementById('push-progress-text');
    const progressBar = document.getElementById('push-progress-bar');
    
    if (statusText) {
        statusText.textContent = status;
    }
    
    if (progressText) {
        progressText.textContent = `( 발송완료 ${sent}건 / 총 발송대상 ${total}건 )`;
    }
    
    if (progressBar && total > 0) {
        const percentage = Math.round((sent / total) * 100);
        progressBar.style.width = `${percentage}%`;
        progressBar.setAttribute('aria-valuenow', percentage);
    }
}

// 토큰 관리
// 페이징 및 필터 상태
let currentPage = 1;
const pageSize = 20;

async function loadTokens(page = 1) {
    try {
        currentPage = page;
        const deviceType = document.getElementById('deviceTypeFilter')?.value || 'all';
        const months = document.getElementById('monthsFilter')?.value || 'all';
        
        const params = new URLSearchParams({
            page: page.toString(),
            pageSize: pageSize.toString(),
            deviceType: deviceType,
            months: months
        });
        
        const response = await fetch(`${API_BASE_URL}/fcm/tokens?${params}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const data = await response.json();
        
        const tokenList = document.getElementById('token-list');
        tokenList.innerHTML = '';
        
        // 총 개수 표시
        const countInfo = document.getElementById('token-count-info');
        if (countInfo) {
            countInfo.textContent = `총 ${data.totalCount || 0}개`;
        }
        
        if (data.tokens && data.tokens.length > 0) {
            data.tokens.forEach(token => {
                const row = document.createElement('tr');
                const lastUsed = token.lastUsedAt ? new Date(token.lastUsedAt).toLocaleString('ko-KR') : '없음';
                row.innerHTML = `
                    <td>
                        <span class="badge ${token.deviceType === 'android' ? 'bg-success' : 'bg-primary'}">
                            ${token.deviceType === 'android' ? 'Android' : 'iOS'}
                        </span>
                    </td>
                    <td>${token.deviceId || '-'}</td>
                    <td>${lastUsed}</td>
                    <td>
                        <span class="badge ${token.isActive ? 'bg-success' : 'bg-danger'}">
                            ${token.isActive ? '활성' : '비활성'}
                        </span>
                    </td>
                    <td>
                        <span class="badge ${token.notificationEnabled ? 'bg-success' : 'bg-warning'}">
                            ${token.notificationEnabled ? '알림 켜짐' : '알림 꺼짐'}
                        </span>
                    </td>
                    <td>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteToken('${token.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                `;
                tokenList.appendChild(row);
            });
        } else {
            tokenList.innerHTML = '<tr><td colspan="6" class="text-center text-muted">등록된 토큰이 없습니다.</td></tr>';
        }
        
        // 페이징 UI 생성
        renderPagination(data.totalPages || 1, page);
        
    } catch (error) {
        console.error('Load tokens error:', error);
        showAlert('토큰 목록을 불러오는 중 오류가 발생했습니다.', 'danger');
    }
}

// 전역 스코프에 명시적으로 할당
window.loadTokens = loadTokens;

// 페이징 UI 렌더링
function renderPagination(totalPages, currentPage) {
    const pagination = document.getElementById('pagination');
    if (!pagination) return;
    
    pagination.innerHTML = '';
    
    if (totalPages <= 1) {
        return;
    }
    
    // 이전 버튼
    const prevLi = document.createElement('li');
    prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
    prevLi.innerHTML = `<a class="page-link" href="#" onclick="loadTokens(${currentPage - 1}); return false;">이전</a>`;
    pagination.appendChild(prevLi);
    
    // 페이지 번호 버튼
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);
    
    if (startPage > 1) {
        const firstLi = document.createElement('li');
        firstLi.className = 'page-item';
        firstLi.innerHTML = `<a class="page-link" href="#" onclick="loadTokens(1); return false;">1</a>`;
        pagination.appendChild(firstLi);
        
        if (startPage > 2) {
            const ellipsis = document.createElement('li');
            ellipsis.className = 'page-item disabled';
            ellipsis.innerHTML = '<span class="page-link">...</span>';
            pagination.appendChild(ellipsis);
        }
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const li = document.createElement('li');
        li.className = `page-item ${i === currentPage ? 'active' : ''}`;
        li.innerHTML = `<a class="page-link" href="#" onclick="loadTokens(${i}); return false;">${i}</a>`;
        pagination.appendChild(li);
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            const ellipsis = document.createElement('li');
            ellipsis.className = 'page-item disabled';
            ellipsis.innerHTML = '<span class="page-link">...</span>';
            pagination.appendChild(ellipsis);
        }
        
        const lastLi = document.createElement('li');
        lastLi.className = 'page-item';
        lastLi.innerHTML = `<a class="page-link" href="#" onclick="loadTokens(${totalPages}); return false;">${totalPages}</a>`;
        pagination.appendChild(lastLi);
    }
    
    // 다음 버튼
    const nextLi = document.createElement('li');
    nextLi.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
    nextLi.innerHTML = `<a class="page-link" href="#" onclick="loadTokens(${currentPage + 1}); return false;">다음</a>`;
    pagination.appendChild(nextLi);
}

// 필터 적용
function applyFilters() {
    loadTokens(1); // 첫 페이지로 리셋
}

// 토큰 새로고침
function refreshTokens() {
    loadTokens(currentPage);
    showAlert('토큰 목록이 새로고침되었습니다.', 'info');
}

// 필터 이벤트 리스너 설정 (DOM 로드 후 실행)
function setupTokenFilters() {
    const deviceTypeFilter = document.getElementById('deviceTypeFilter');
    const monthsFilter = document.getElementById('monthsFilter');
    const refreshBtn = document.getElementById('refreshTokensBtn');
    
    if (deviceTypeFilter) {
        deviceTypeFilter.addEventListener('change', applyFilters);
    }
    if (monthsFilter) {
        monthsFilter.addEventListener('change', applyFilters);
    }
    if (refreshBtn) {
        refreshBtn.addEventListener('click', refreshTokens);
    }
}

// 전역 스코프에 명시적으로 할당
window.applyFilters = applyFilters;
window.refreshTokens = refreshTokens;

// 토큰 삭제
async function deleteToken(tokenId) {
    if (!confirm('정말로 이 토큰을 삭제하시겠습니까?')) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/fcm/token/${tokenId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (response.ok) {
            showAlert('토큰이 삭제되었습니다.', 'success');
            loadTokens();
        } else {
            const data = await response.json();
            showAlert(data.error || '토큰 삭제 중 오류가 발생했습니다.', 'danger');
        }
    } catch (error) {
        console.error('Delete token error:', error);
        showAlert('토큰 삭제 중 오류가 발생했습니다.', 'danger');
    }
}

// 푸시 발송 내역 로드
async function loadPushHistory() {
    try {
        const response = await fetch(`${API_BASE_URL}/push/history-detailed?limit=10`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            displayPushHistory(data.histories);
        } else {
            console.error('Failed to load push history');
        }
    } catch (error) {
        console.error('Load push history error:', error);
    }
}

// 푸시 발송 내역 표시
function displayPushHistory(histories) {
    const tableBody = document.getElementById('push-history-table');
    
    if (!histories || histories.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">최근 발송된 푸시 알림이 없습니다.</td></tr>';
        return;
    }
    
    tableBody.innerHTML = histories.map(history => {
        const createdAt = new Date(history.createdAt);
        const dateStr = createdAt.toLocaleDateString('ko-KR');
        const timeStr = createdAt.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
        
        const iosText = history.iosTokensCount > 0 
            ? `${history.iosSuccessCount}/${history.iosFailureCount}` 
            : '-';
        const androidText = history.androidTokensCount > 0 
            ? `${history.androidSuccessCount}/${history.androidFailureCount}` 
            : '-';
        
        return `
            <tr>
                <td>
                    <small>${dateStr}<br>${timeStr}</small>
                </td>
                <td>
                    <strong>${history.title}</strong>
                    <br><small class="text-muted">${history.body.substring(0, 30)}${history.body.length > 30 ? '...' : ''}</small>
                </td>
                <td>
                    <span class="badge ${history.iosSuccessCount > 0 ? 'bg-success' : 'bg-secondary'}">${iosText}</span>
                </td>
                <td>
                    <span class="badge ${history.androidSuccessCount > 0 ? 'bg-success' : 'bg-secondary'}">${androidText}</span>
                </td>
            </tr>
        `;
    }).join('');
}

// 최근 발송한 푸시 알림 로드
async function loadRecentPushNotifications() {
    try {
        const response = await fetch(`${API_BASE_URL}/push/recent`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const data = await response.json();
        
        displayRecentPushNotifications(data.recentNotifications || []);
    } catch (error) {
        console.error('Load recent push notifications error:', error);
    }
}

// 최근 발송한 푸시 알림 표시
function displayRecentPushNotifications(notifications) {
    const container = document.getElementById('recent-push-list');
    
    if (!notifications || notifications.length === 0) {
        container.innerHTML = '<div class="col-12"><p class="text-muted text-center">최근 발송한 푸시 알림이 없습니다.</p></div>';
        return;
    }
    
    container.innerHTML = notifications.map(notification => {
        const createdAt = new Date(notification.createdAt);
        const dateStr = createdAt.toLocaleDateString('ko-KR');
        const timeStr = createdAt.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
        
        return `
            <div class="col-md-6 col-lg-3 mb-3">
                <div class="card h-100 recent-push-card" onclick="setPushFormFromRecent('${notification.id}')" style="cursor: pointer;">
                    <div class="card-body">
                        <h6 class="card-title">${notification.title}</h6>
                        <p class="card-text small text-muted">${notification.body.substring(0, 50)}${notification.body.length > 50 ? '...' : ''}</p>
                        <small class="text-muted">
                            <i class="fas fa-clock me-1"></i>
                            ${dateStr} ${timeStr}
                        </small>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// 최근 발송한 푸시 알림 클릭 시 폼에 세팅
async function setPushFormFromRecent(notificationId) {
    try {
        const response = await fetch(`${API_BASE_URL}/push/history/${notificationId}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const data = await response.json();
        
        if (response.ok && data.notification) {
            const notification = data.notification;
            
            // 폼에 값 세팅
            document.getElementById('push-title').value = notification.title;
            document.getElementById('push-body').value = notification.body;
            document.getElementById('push-target').value = notification.data?.target || 'all';
            document.getElementById('push-type').value = notification.data?.type || 'general';
            
            // 폼으로 스크롤
            document.getElementById('push-title').scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            showAlert('최근 발송한 푸시 알림 내용이 입력창에 설정되었습니다.', 'info');
        }
    } catch (error) {
        console.error('Set push form from recent error:', error);
        showAlert('푸시 알림 정보를 불러오는 중 오류가 발생했습니다.', 'danger');
    }
}

// 금일 푸시 발송 건수 로드
async function loadTodayPushCount() {
    try {
        const response = await fetch(`${API_BASE_URL}/push/today-count`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            document.getElementById('today-pushes').textContent = data.todayPushCount;
        } else {
            console.error('Failed to load today push count');
        }
    } catch (error) {
        console.error('Load today push count error:', error);
    }
}

// 알림 표시
function showAlert(message, type = 'info') {
    const alertContainer = document.getElementById('alert-container');
    const alertId = 'alert-' + Date.now();
    
    const alertHTML = `
        <div id="${alertId}" class="alert alert-${type} alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
    
    alertContainer.insertAdjacentHTML('beforeend', alertHTML);
    
    // 5초 후 자동 제거
    setTimeout(() => {
        const alertElement = document.getElementById(alertId);
        if (alertElement) {
            alertElement.remove();
        }
    }, 5000);
}

// 접속 추이 분석 관련 변수
let trendChart = null;
let dailyChart = null;
let deviceChart = null;

// 접속 추이 데이터 로드
async function loadAnalytics() {
    try {
        const period = document.getElementById('analyticsPeriod').value;
        const startDate = document.getElementById('analyticsStartDate').value;
        const endDate = document.getElementById('analyticsEndDate').value;
        const deviceType = document.getElementById('analyticsDeviceType').value;
        const compareWith = document.getElementById('analyticsCompare').checked ? 'previous' : null;
        
        // 기본 날짜 설정 (최근 30일)
        const end = endDate ? new Date(endDate) : new Date();
        const start = startDate ? new Date(startDate) : new Date();
        if (!startDate) {
            start.setDate(start.getDate() - 30);
        }
        
        // 날짜 포맷팅
        const formatDate = (date) => {
            return date.toISOString().split('T')[0];
        };
        
        const params = new URLSearchParams({
            period: period,
            startDate: formatDate(start),
            endDate: formatDate(end),
            deviceType: deviceType
        });
        
        if (compareWith) {
            params.append('compareWith', compareWith);
        }
        
        const response = await fetch(`${API_BASE_URL}/fcm/analytics/trend?${params}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (!response.ok) {
            throw new Error('데이터 로드 실패');
        }
        
        const data = await response.json();
        
        // 요약 통계 업데이트
        updateAnalyticsSummary(data.summary, data.comparison);
        
        // 그래프 렌더링
        renderTrendChart(data);
        renderDailyChart(data);
        renderDeviceChart(data);
        
        showToast('접속 추이 데이터를 불러왔습니다.', 'success', '성공', 3000);
        
    } catch (error) {
        console.error('Load analytics error:', error);
        showToast('접속 추이 데이터를 불러오는 중 오류가 발생했습니다.', 'error', '오류', 5000);
    }
}

// 요약 통계 업데이트
function updateAnalyticsSummary(summary, comparison) {
    document.getElementById('summaryTotal').textContent = summary.totalUsers.toLocaleString();
    document.getElementById('summaryNew').textContent = summary.newUsers.toLocaleString();
    document.getElementById('summaryReturning').textContent = summary.returningUsers.toLocaleString();
    document.getElementById('summaryAverage').textContent = summary.averageDaily.toLocaleString();
    
    // 비교 데이터 표시
    if (comparison) {
        const growthRate = comparison.growthRate;
        const isPositive = growthRate >= 0;
        const changeClass = isPositive ? 'positive' : 'negative';
        const changeIcon = isPositive ? '↑' : '↓';
        
        document.getElementById('summaryTotalChange').innerHTML = 
            `<span class="${changeClass}">${changeIcon} ${Math.abs(growthRate)}%</span>`;
    } else {
        document.getElementById('summaryTotalChange').textContent = '';
    }
}

// 접속 추이 그래프 렌더링
function renderTrendChart(data) {
    const ctx = document.getElementById('trendChart');
    if (!ctx) return;
    
    const labels = data.data.map(item => item.date);
    const totalData = data.data.map(item => item.total);
    const newData = data.data.map(item => item.new);
    const returningData = data.data.map(item => item.returning);
    
    if (trendChart) {
        trendChart.destroy();
    }
    
    trendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: '총 접속자',
                    data: totalData,
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    tension: 0.4,
                    fill: true
                },
                {
                    label: '신규 가입자',
                    data: newData,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4,
                    fill: true
                },
                {
                    label: '재방문자',
                    data: returningData,
                    borderColor: '#f59e0b',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    tension: 0.4,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            }
        }
    });
}

// 일일 접속자 수 막대 그래프 렌더링
function renderDailyChart(data) {
    const ctx = document.getElementById('dailyChart');
    if (!ctx) return;
    
    const labels = data.data.map(item => item.date);
    const totalData = data.data.map(item => item.total);
    
    if (dailyChart) {
        dailyChart.destroy();
    }
    
    dailyChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: '접속자 수',
                data: totalData,
                backgroundColor: 'rgba(102, 126, 234, 0.8)',
                borderColor: '#667eea',
                borderWidth: 1,
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                }
            }
        }
    });
}

// 디바이스 타입별 분포 파이 차트 렌더링
function renderDeviceChart(data) {
    const ctx = document.getElementById('deviceChart');
    if (!ctx) return;
    
    const iosCount = data.summary.iosCount;
    const androidCount = data.summary.androidCount;
    
    if (deviceChart) {
        deviceChart.destroy();
    }
    
    deviceChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['iOS', 'Android'],
            datasets: [{
                data: [iosCount, androidCount],
                backgroundColor: [
                    'rgba(102, 126, 234, 0.8)',
                    'rgba(16, 185, 129, 0.8)'
                ],
                borderColor: [
                    '#667eea',
                    '#10b981'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// 데이터 내보내기
function exportAnalytics() {
    // CSV 내보내기 기능 (추후 구현)
    showToast('데이터 내보내기 기능은 준비 중입니다.', 'info', '알림', 3000);
}
