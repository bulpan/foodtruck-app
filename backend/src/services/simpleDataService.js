// 개발용 인메모리 데이터 저장소
let data = {
  adminUsers: [
    {
      id: '1',
      username: 'admin',
      password: 'admin123',
      shopName: '유미네 곱창트럭',
      shopDescription: '신선한 곱창으로 만드는 맛있는 음식'
    }
  ],
  menus: [
    {
      id: '1',
      adminId: '1',
      name: '베이컨 치즈버거',
      description: '신선한 베이컨과 치즈가 들어간 버거',
      price: 8800,
      imageUrl: '/images/bacon-burger.jpg',
      category: 'main',
      isAvailable: true,
      sortOrder: 1
    }
  ],
  location: {
    id: '1',
    adminId: '1',
    name: '강남역 3번 출구',
    address: '서울특별시 강남구 강남대로 396',
    latitude: 37.5665,
    longitude: 102.9780,
    openTime: '11:00',
    closeTime: '22:00',
    notice: '오늘은 신메뉴 판매중!',
    isActive: true
  },
  fcmTokens: [],
  notifications: []
};

class SimpleDataService {
  // 관리자 관련
  getAdminById(id) {
    return data.adminUsers.find(u => u.id === id);
  }

  getAdminByUsername(username) {
    return data.adminUsers.find(u => u.username === username);
  }

  // 메뉴 관련
  getAllMenus() {
    return data.menus.filter(m => m.isAvailable);
  }

  getMenuById(id) {
    return data.menus.find(m => m.id === id);
  }

  createMenu(menuData) {
    const newMenu = {
      id: (data.menus.length + 1).toString(),
      ...menuData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    data.menus.push(newMenu);
    return newMenu;
  }

  updateMenu(id, updateData) {
    const index = data.menus.findIndex(m => m.id === id);
    if (index === -1) return null;
    
    data.menus[index] = {
      ...data.menus[index],
      ...updateData,
      updatedAt: new Date()
    };
    return data.menus[index];
  }

  deleteMenu(id: string) {
    const index = data.menus.findIndex(m => m.id === id);
    if (index === -1) return false;
    
    data.menus.splice(index, 1);
    return true;
  }

  // 위치 관련
  getCurrentLocation() {
    return data.location.isActive ? data.location : null;
  }

  updateLocation(locationData) {
    data.location = {
      ...data.location,
      ...locationData,
      updatedAt: new Date()
    };
    return data.location;
  }

  // FCM 토큰 관련
  addFCMToken(tokenData) {
    const existingToken = data.fcmTokens.find(t => t.token === tokenData.token);
    if (existingToken) {
      existingToken.deviceType = tokenData.deviceType;
      existingToken.deviceId = tokenData.deviceId;
      existingToken.isActive = true;
      existingToken.lastUsedAt = new Date();
      return existingToken;
    }

    const newToken = {
      id: (data.fcmTokens.length + 1).toString(),
      ...tokenData,
      isActive: true,
      lastUsedAt: new Date(),
      createdAt: new Date()
    };
    data.fcmTokens.push(newToken);
    return newToken;
  }

  getActiveTokens() {
    return data.fcmTokens.filter(t => t.isActive);
  }

  // 푸시 알림 관련
  createNotification(notificationData) {
    const activeCount = this.getActiveTokens().length;
    const newNotification = {
      id: (data.notifications.length + 1).toString(),
      ...notificationData,
      targetCount: activeCount,
      sentCount: 0,
      failedCount: 0,
      status: 'pending',
      createdAt: new Date()
    };
    data.notifications.push(newNotification);
    return newNotification;
  }

  updateNotification(id, updateData) {
    const index = data.notifications.findIndex(n => n.id === id);
    if (index === -1) return null;
    
    data.notifications[index] = {
      ...data.notifications[index],
      ...updateData,
      updatedAt: new Date()
    };
    return data.notifications[index];
  }

  getAllNotifications() {
    return data.notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
}

module.exports = new SimpleDataService();
module.exports.adminUsers = data.adminUsers; // 편의를 위해 직접 접근 허용



