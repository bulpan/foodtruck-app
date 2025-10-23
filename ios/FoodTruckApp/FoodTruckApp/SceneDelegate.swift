import UIKit
import SwiftUI

class SceneDelegate: UIResponder, UIWindowSceneDelegate {

    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = (scene as? UIWindowScene) else { return }

        window = UIWindow(windowScene: windowScene)
        
        // 스플래시 화면 먼저 표시
        showSplashScreen()
        
        // 알림 클릭으로 앱이 열린 경우 처리
        if let userActivity = connectionOptions.userActivities.first,
           let url = userActivity.webpageURL {
            handleNotificationNavigation(url: url)
        }
    }
    
    private func showSplashScreen() {
        let splashViewController = UIViewController()
        let loadingView = LoadingView()
        loadingView.translatesAutoresizingMaskIntoConstraints = false
        
        splashViewController.view.addSubview(loadingView)
        NSLayoutConstraint.activate([
            loadingView.topAnchor.constraint(equalTo: splashViewController.view.topAnchor),
            loadingView.leadingAnchor.constraint(equalTo: splashViewController.view.leadingAnchor),
            loadingView.trailingAnchor.constraint(equalTo: splashViewController.view.trailingAnchor),
            loadingView.bottomAnchor.constraint(equalTo: splashViewController.view.bottomAnchor)
        ])
        
        window?.rootViewController = splashViewController
        window?.makeKeyAndVisible()
        
        // 0.5초 후 메인 화면으로 전환
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            self.showMainScreen()
        }
    }
    
    private func showMainScreen() {
        let mainViewController = MainViewController()
        let navigationController = UINavigationController(rootViewController: mainViewController)
        navigationController.isNavigationBarHidden = true
        
        window?.rootViewController = navigationController
    }
    
    func handleNotificationNavigation(url: URL) {
        // 알림에서 전달된 URL 파라미터를 분석하여 스크린 이동
        let components = URLComponents(url: url, resolvingAgainstBaseURL: false)
        if let screen = components?.queryItems?.first(where: { $0.name == "screen" })?.value {
            NotificationCenter.default.post(
                name: NSNotification.Name("NavigateToScreen"),
                object: nil,
                userInfo: ["screen": screen]
            )
        }
    }

    func sceneDidDisconnect(_ scene: UIScene) {
    }

    func sceneDidBecomeActive(_ scene: UIScene) {
    }

    func sceneWillResignActive(_ scene: UIScene) {
    }

    func sceneWillEnterForeground(_ scene: UIScene) {
    }

    func sceneDidEnterBackground(_ scene: UIScene) {
    }
}



