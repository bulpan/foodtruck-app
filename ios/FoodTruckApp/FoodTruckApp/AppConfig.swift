import Foundation

struct AppConfig {
    // MARK: - Environment Configuration
    static let isDevelopment: Bool = {
        #if DEBUG
        return false // 프로덕션 서버 사용
        #else
        return false
        #endif
    }()
    
    // MARK: - Server Configuration
    private static let devLocalIP = "192.168.219.200"
    private static let devPort = "3002"
    private static let prodBaseURL = "https://truck.carrera74.com"
    
    // MARK: - URLs
    static var serverURL: String {
        return isDevelopment ? "http://\(devLocalIP):\(devPort)" : prodBaseURL
    }
    
    static var apiURL: String {
        return "\(serverURL)/api"
    }
    
    static var mobileURL: String {
        return "\(serverURL)/mobile"
    }
    
    // MARK: - Environment Info
    static var environment: String {
        return isDevelopment ? "development" : "production"
    }
    
    // MARK: - Debug Info
    static var debugInfo: String {
        return """
        Environment: \(environment)
        Server URL: \(serverURL)
        API URL: \(apiURL)
        Mobile URL: \(mobileURL)
        """
    }
    
    // MARK: - App Info
    static let appName = "세종유미곱창트럭"
    static let appVersion = "1.0.0"
    static let bundleIdentifier = "com.foodtruck.app"
    
    // MARK: - Firebase Configuration
    static let firebaseConfigFile = "GoogleService-Info"
    
    // MARK: - Notification Configuration
    static let notificationChannelId = "foodtruck_notifications"
    static let notificationChannelName = "푸드트럭 알림"
    static let notificationChannelDescription = "푸드트럭의 메뉴, 위치 정보 알림"
}





