import UIKit
import UserNotifications
import FirebaseMessaging

@main
class AppDelegate: UIResponder, UIApplicationDelegate {

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        
        print("🚀 앱 시작 - Firebase 초기화 중...")
        
        // 백그라운드 작업 설정
        if #available(iOS 13.0, *) {
            // iOS 13+ 에서 백그라운드 작업 설정
        }
        
        // Firebase Messaging 초기화 (Analytics 완전 제거)
        print("✅ Firebase Messaging 초기화 완료")
        
        // 푸시 알림 권한 상태 확인
        print("🔔 푸시 알림 권한 상태 확인 중...")
        UNUserNotificationCenter.current().delegate = self
        
        UNUserNotificationCenter.current().getNotificationSettings { settings in
            DispatchQueue.main.async {
                switch settings.authorizationStatus {
                case .notDetermined:
                    // 최초 설치 시에만 권한 요청
                    print("🔔 최초 설치 - 푸시 알림 권한 요청 중...")
                    UNUserNotificationCenter.current().requestAuthorization(
                        options: [.alert, .badge, .sound],
                        completionHandler: { granted, error in
                            if granted {
                                print("✅ 푸시 알림 권한 허용됨")
                                self.setupFirebaseMessaging()
                                DispatchQueue.main.async {
                                    application.registerForRemoteNotifications()
                                }
                            } else {
                                print("❌ 푸시 알림 권한 거부됨: \(error?.localizedDescription ?? "알 수 없는 오류")")
                            }
                        }
                    )
                case .authorized, .provisional, .ephemeral:
                    // 권한이 유효하면 바로 설정
                    print("✅ 푸시 알림 권한 사용 가능 상태: \(settings.authorizationStatus.rawValue)")
                    self.setupFirebaseMessaging()
                    application.registerForRemoteNotifications()
                case .denied:
                    // 권한 거부된 경우
                    print("❌ 푸시 알림 권한 거부됨 - 토큰 등록 건너뜀")
                @unknown default:
                    print("⚠️ 알 수 없는 권한 상태")
                }
            }
        }
        
        // Firebase Messaging 설정 (APNs 토큰 등록 후에 실행)
        print("📱 Firebase Messaging 설정 시작...")
        Messaging.messaging().delegate = FoodTruckFirebaseMessagingService.shared
        Messaging.messaging().isAutoInitEnabled = false  // 자동 초기화 비활성화
        print("✅ Firebase Messaging 기본 설정 완료")
        
        print("🎯 앱 초기화 완료")
        return true
    }
    
    // MARK: - Firebase Messaging 설정
    private func setupFirebaseMessaging() {
        print("📱 Firebase Messaging 설정 시작...")
        Messaging.messaging().isAutoInitEnabled = true
        FoodTruckFirebaseMessagingService.shared.initializeIfNeeded()
        print("✅ Firebase Messaging 설정 완료")
    }

    // MARK: UISceneSession Lifecycle
    func application(_ application: UIApplication, configurationForConnecting connectingSceneSession: UISceneSession, options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        return UISceneConfiguration(name: "Default Configuration", sessionRole: connectingSceneSession.role)
    }

    func application(_ application: UIApplication, didDiscardSceneSessions sceneSessions: Set<UISceneSession>) {
    }
    
    // MARK: APNs 등록
    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        print("📱 APNs 토큰 등록 성공: \(deviceToken.map { String(format: "%02.2hhx", $0) }.joined())")
        
        // Firebase에 APNs 토큰 설정
        Messaging.messaging().apnsToken = deviceToken
        print("✅ Firebase에 APNs 토큰 설정 완료")
        
        // 권한 상태 확인 후 FCM 토큰 등록
        UNUserNotificationCenter.current().getNotificationSettings { settings in
            DispatchQueue.main.async {
                switch settings.authorizationStatus {
                case .authorized, .provisional, .ephemeral:
                    print("✅ 푸시 알림 권한 사용 가능 상태로 FCM 토큰 등록 진행")
                    DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
                        print("🔄 FCM 토큰 등록 시작...")
                        FoodTruckFirebaseMessagingService.shared.registerFCMToken()
                    }
                default:
                    print("❌ 푸시 알림 권한 미허용 상태로 FCM 토큰 등록 건너뜀")
                }
            }
        }
    }
    
    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        print("❌ APNs 토큰 등록 실패: \(error.localizedDescription)")
        print("⚠️ FCM 토큰 등록을 건너뜁니다")
        
        // 시뮬레이터에서는 APNs 등록이 실패할 수 있으므로 더미 토큰으로 테스트
        #if targetEnvironment(simulator)
        print("🧪 시뮬레이터 환경에서 더미 토큰으로 테스트 진행...")
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
            FoodTruckFirebaseMessagingService.shared.registerFCMToken()
        }
        #endif
    }
    
    // MARK: Firebase Messaging 수동 통합
    func application(_ application: UIApplication, didReceiveRemoteNotification userInfo: [AnyHashable: Any]) {
        print("📨 Firebase 원격 알림 수신 (포그라운드): \(userInfo)")
        
        // 시뮬레이터 환경에서는 RBSAssertionError 무시
        #if targetEnvironment(simulator)
        print("⚠️ 시뮬레이터 환경에서 실행 중 - 일부 백그라운드 기능이 제한될 수 있습니다")
        #endif
    }
    
    func application(_ application: UIApplication, didReceiveRemoteNotification userInfo: [AnyHashable: Any], fetchCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void) {
        print("📨 Firebase 원격 알림 수신 (백그라운드): \(userInfo)")
        
        // 시뮬레이터 환경에서는 RBSAssertionError 무시
        #if targetEnvironment(simulator)
        print("⚠️ 시뮬레이터 환경에서 실행 중 - 백그라운드 작업이 제한될 수 있습니다")
        completionHandler(.noData)
        return
        #endif
        
        // 실제 디바이스에서만 백그라운드 처리
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
            completionHandler(.newData)
        }
    }
}

// MARK: UNUserNotificationCenterDelegate
extension AppDelegate: UNUserNotificationCenterDelegate {
    func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification, withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        print("🔔 AppDelegate - 포그라운드 알림 수신:")
        print("   - 제목: \(notification.request.content.title)")
        print("   - 내용: \(notification.request.content.body)")
        print("   - 사용자 정보: \(notification.request.content.userInfo)")
        
        // 앱이 foreground에 있을 때 알림 표시 방법
        if #available(iOS 14.0, *) {
            completionHandler([.banner, .badge, .sound])
        } else {
            completionHandler([.alert, .badge, .sound])
        }
    }
    
    func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse, withCompletionHandler completionHandler: @escaping () -> Void) {
        print("👆 AppDelegate - 알림 클릭 처리:")
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


