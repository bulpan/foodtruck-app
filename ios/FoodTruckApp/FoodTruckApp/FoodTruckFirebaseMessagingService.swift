import UIKit
import UserNotifications
import Firebase
import FirebaseMessaging

class FoodTruckFirebaseMessagingService: NSObject {
    
    static let shared = FoodTruckFirebaseMessagingService()
    
    private let channelId = "foodtruck_notifications"
    private let channelName = "푸드트럭 알림"
    private let channelDescription = "푸드트럭의 메뉴, 위치 정보 알림"
    
    private override init() {
        super.init()
        // 알림 채널 생성
        createNotificationChannel()
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
        print("✅ 알림 채널 생성 완료")
    }
    
    // MARK: - Token Management
    func registerFCMToken() {
        print("🔑 FCM 토큰 등록 요청 중...")
        
        // 시뮬레이터 환경에서는 제한된 기능
        #if targetEnvironment(simulator)
        print("⚠️ 시뮬레이터 환경에서 실행 중 - FCM 토큰 등록이 제한될 수 있습니다")
        
        // 시뮬레이터에서는 더미 토큰으로 테스트
        let dummyToken = "simulator_dummy_token_\(UUID().uuidString)"
        print("🧪 시뮬레이터용 더미 토큰 생성: \(dummyToken)")
        self.sendFCMTokenToServer(token: dummyToken)
        return
        #endif
        
        Messaging.messaging().token { token, error in
            if let error = error {
                print("❌ FCM 토큰 등록 실패: \(error.localizedDescription)")
                
                // 오류가 발생해도 서버에 알림
                print("🔄 오류 발생으로 인한 재시도...")
                DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
                    self.registerFCMToken()
                }
            } else if let token = token {
                print("✅ FCM 토큰 등록 성공: \(token)")
                self.sendFCMTokenToServer(token: token)
            } else {
                print("⚠️ FCM 토큰이 nil입니다")
            }
        }
    }
    
    private func sendFCMTokenToServer(token: String) {
        let url = URL(string: "\(AppConfig.apiURL)/fcm/token")!
        print("🌐 API 통신 시작 - URL: \(url)")
        print("📤 요청 데이터:")
        print("   - Token: \(token)")
        print("   - Device Type: ios")
        print("   - Device ID: \(UIDevice.current.identifierForVendor?.uuidString ?? "unknown")")
        print("   - API URL: \(AppConfig.apiURL)")
        print("   - Server URL: \(AppConfig.serverURL)")
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("iOS-FoodTruckApp/1.0", forHTTPHeaderField: "User-Agent")
        request.timeoutInterval = 30.0
        
        let body = [
            "token": token,
            "deviceType": "ios",
            "deviceId": UIDevice.current.identifierForVendor?.uuidString ?? "",
            "appVersion": "1.0.0",
            "platform": "ios"
        ]
        
        do {
            request.httpBody = try JSONSerialization.data(withJSONObject: body)
            print("✅ 요청 본문 JSON 직렬화 완료")
            print("📦 요청 본문 크기: \(request.httpBody?.count ?? 0) bytes")
        } catch {
            print("❌ 요청 본문 JSON 직렬화 실패: \(error.localizedDescription)")
            return
        }
        
        print("📡 서버로 요청 전송 중...")
        URLSession.shared.dataTask(with: request) { data, response, error in
            DispatchQueue.main.async {
                if let error = error {
                    print("❌ API 통신 실패: \(error.localizedDescription)")
                    print("🔍 오류 상세 정보:")
                    print("   - 오류 코드: \((error as NSError).code)")
                    print("   - 오류 도메인: \((error as NSError).domain)")
                    print("   - 사용자 정보: \((error as NSError).userInfo)")
                    
                    // 네트워크 연결 상태 확인
                    self.checkNetworkConnectivity()
                    return
                }
                
                if let httpResponse = response as? HTTPURLResponse {
                    print("📥 서버 응답 수신:")
                    print("   - 상태 코드: \(httpResponse.statusCode)")
                    print("   - 헤더: \(httpResponse.allHeaderFields)")
                    
                    if httpResponse.statusCode == 200 {
                        print("✅ FCM 토큰 서버 등록 성공")
                    } else {
                        print("⚠️ 서버 응답 오류 - 상태 코드: \(httpResponse.statusCode)")
                    }
                }
                
                if let data = data {
                    if let responseString = String(data: data, encoding: .utf8) {
                        print("📄 서버 응답 본문: \(responseString)")
                    } else {
                        print("📄 서버 응답 본문 (바이너리): \(data.count) bytes")
                    }
                } else {
                    print("⚠️ 서버 응답 본문이 비어있습니다")
                }
            }
        }.resume()
    }
    
    private func checkNetworkConnectivity() {
        print("🔍 네트워크 연결 상태 확인 중...")
        
        // 간단한 네트워크 테스트
        guard let testURL = URL(string: "https://www.google.com") else { return }
        
        var testRequest = URLRequest(url: testURL)
        testRequest.timeoutInterval = 5.0
        
        URLSession.shared.dataTask(with: testRequest) { data, response, error in
            DispatchQueue.main.async {
                if let error = error {
                    print("❌ 네트워크 연결 실패: \(error.localizedDescription)")
                } else {
                    print("✅ 네트워크 연결 정상")
                }
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
        print("🔄 Firebase 토큰 갱신 수신:")
        if let token = fcmToken {
            print("   - 새 토큰: \(token)")
            sendFCMTokenToServer(token: token)
        } else {
            print("   - 토큰이 nil입니다")
        }
    }
}

// MARK: - UNUserNotificationCenterDelegate
extension FoodTruckFirebaseMessagingService: UNUserNotificationCenterDelegate {
    func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification, withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        print("🔔 포그라운드 알림 수신:")
        print("   - 제목: \(notification.request.content.title)")
        print("   - 내용: \(notification.request.content.body)")
        print("   - 사용자 정보: \(notification.request.content.userInfo)")
        
        // 앱이 foreground에 있을 때 알림 표시 방법
        completionHandler([.alert, .badge, .sound])
    }
    
    func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse, withCompletionHandler completionHandler: @escaping () -> Void) {
        print("👆 알림 클릭 처리:")
        let userInfo = response.notification.request.content.userInfo
        print("   - 사용자 정보: \(userInfo)")
        
        if let screen = userInfo["screen"] as? String {
            print("   - 이동할 화면: \(screen)")
            NotificationCenter.default.post(
                name: NSNotification.Name("NavigateToScreen"),
                object: nil,
                userInfo: ["screen": screen]
            )
        }
        
        completionHandler()
    }
}
