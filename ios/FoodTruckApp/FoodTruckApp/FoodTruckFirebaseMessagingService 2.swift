import UIKit
import Firebase
import FirebaseMessaging
import UserNotifications

class FoodTruckFirebaseMessagingService: NSObject {
    
    static let shared = FoodTruckFirebaseMessagingService()
    
    private let channelId = "foodtruck_notifications"
    private let channelName = "푸드트럭 알림"
    private let channelDescription = "푸드트럭의 메뉴, 위치 정보 알림"
    
    private override init() {
        super.init()
        setupFirebaseMessaging()
    }
    
    // MARK: - Firebase Messaging Setup
    private func setupFirebaseMessaging() {
        Messaging.messaging().delegate = self
        
        // Firebase 자동 초기화 활성화
        Messaging.messaging().isAutoInitEnabled = true
        
        // 알림 채널 생성
        createNotificationChannel()
        
        // 알림 권한 요청
        requestNotificationPermission()
    }
    
    private func createNotificationChannel() {
        // iOS에서는 UNUserNotificationCenter를 사용하여 알림 설정
        let center = UNUserNotificationCenter.current()
        
        // 알림 카테고리 생성
        let category = UNNotificationCategory(
            identifier: channelId,
            actions: [],
            intentIdentifiers: [],
            options: [.customDismissAction]
        )
        
        center.setNotificationCategories([category])
    }
    
    private func requestNotificationPermission() {
        let center = UNUserNotificationCenter.current()
        center.requestAuthorization(options: [.alert, .badge, .sound]) { granted, error in
            if granted {
                DispatchQueue.main.async {
                    UIApplication.shared.registerForRemoteNotifications()
                }
                print("알림 권한 허용됨")
            } else {
                print("알림 권한 거부됨: \(error?.localizedDescription ?? "")")
            }
        }
    }
    
    // MARK: - Token Management
    func registerFCMToken() {
        Messaging.messaging().token { token, error in
            if let error = error {
                print("Error fetching FCM registration token: \(error)")
            } else if let token = token {
                print("FCM registration token: \(token)")
                self.sendFCMTokenToServer(token: token)
            }
        }
    }
    
    private func sendFCMTokenToServer(token: String) {
        let url = URL(string: "\(AppConfig.apiURL)/fcm/token")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body = [
            "token": token,
            "deviceType": "ios",
            "deviceId": UIDevice.current.identifierForVendor?.uuidString ?? ""
        ]
        
        do {
            request.httpBody = try JSONSerialization.data(withJSONObject: body)
        } catch {
            print("Error encoding FCM token: \(error)")
            return
        }
        
        URLSession.shared.dataTask(with: request) { data, response, error in
            if let error = error {
                print("Error sending FCM token: \(error)")
            } else {
                print("FCM token sent successfully")
            }
        }.resume()
    }
    
    // MARK: - Notification Handling
    func showLocalNotification(title: String, body: String) {
        let center = UNUserNotificationCenter.current()
        
        let content = UNMutableNotificationContent()
        content.title = title
        content.body = body
        content.sound = UNNotificationSound.default
        content.badge = 1
        content.categoryIdentifier = channelId
        
        // 알림 요청 생성
        let request = UNNotificationRequest(
            identifier: UUID().uuidString,
            content: content,
            trigger: nil
        )
        
        center.add(request) { error in
            if let error = error {
                print("Error showing notification: \(error)")
            } else {
                print("Notification shown successfully")
            }
        }
    }
}

// MARK: - MessagingDelegate
extension FoodTruckFirebaseMessagingService: MessagingDelegate {
    func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
        print("Firebase registration token: \(String(describing: fcmToken))")
        
        if let token = fcmToken {
            sendFCMTokenToServer(token: token)
        }
    }
}

// MARK: - UNUserNotificationCenterDelegate
extension FoodTruckFirebaseMessagingService: UNUserNotificationCenterDelegate {
    func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification, withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        // 앱이 foreground에 있을 때 알림 표시 방법
        completionHandler([.alert, .badge, .sound])
    }
    
    func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse, withCompletionHandler completionHandler: @escaping () -> Void) {
        // 알림 클릭 시 처리
        let userInfo = response.notification.request.content.userInfo
        
        if let screen = userInfo["screen"] as? String {
            NotificationCenter.default.post(
                name: NSNotification.Name("NavigateToScreen"),
                object: nil,
                userInfo: ["screen": screen]
            )
        }
        
        completionHandler()
    }
}
