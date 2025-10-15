import UIKit
import WebKit
import UserNotifications

class MainViewController: UIViewController {
    
    // MARK: - Properties
    private var webView: WKWebView!
    private var bottomNavigationView: BottomNavigationView!
    private var webViewManager: WebViewManager!
    
    private var currentScreen: String = "home" {
        didSet {
            updateNavigationUI()
            updateWebViewScreen()
        }
    }
    
    // 중복 실행 방지
    private var isNavigating = false
    
    
    // MARK: - Lifecycle
    override func viewDidLoad() {
        super.viewDidLoad()
        setupUI()
        setupNotifications()
        setupWebView()
        loadInitialWebContent()
    }
    
    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        // setupSafeArea() 제거 - 웹뷰 로딩 완료 시에만 호출
    }
    
    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        
        // 뷰 계층 구조 디버깅
        print("🔍 최종 뷰 계층 구조:")
        for (index, subview) in view.subviews.enumerated() {
            print("  \(index): \(type(of: subview)) - isUserInteractionEnabled: \(subview.isUserInteractionEnabled)")
        }
        
        // 하단 네비게이션 바 위치 및 상태 확인
        print("📍 BottomNavigationView frame: \(bottomNavigationView.frame)")
        print("📍 BottomNavigationView isUserInteractionEnabled: \(bottomNavigationView.isUserInteractionEnabled)")
        print("📍 BottomNavigationView alpha: \(bottomNavigationView.alpha)")
    }
    
    // MARK: - UI Setup
    private func setupUI() {
        view.backgroundColor = UIColor(red: 254/255, green: 198/255, blue: 80/255, alpha: 1.0) // 앱 테마 색상
        
        // 하단 네비게이션 바 설정
        setupBottomNavigation()
    }
    
    
    private func setupBottomNavigation() {
        bottomNavigationView = BottomNavigationView()
        bottomNavigationView.delegate = self
        view.addSubview(bottomNavigationView)
        
        // 제약 조건 설정
        bottomNavigationView.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            bottomNavigationView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            bottomNavigationView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            bottomNavigationView.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor),
            bottomNavigationView.heightAnchor.constraint(equalToConstant: 80)
        ])
        
        // 터치 이벤트 활성화 확인
        bottomNavigationView.isUserInteractionEnabled = true
        print("✅ BottomNavigationView 생성 완료 - isUserInteractionEnabled: \(bottomNavigationView.isUserInteractionEnabled)")
    }
    
    private func setupWebViewConstraints() {
        webView.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            webView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            webView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            webView.bottomAnchor.constraint(equalTo: bottomNavigationView.topAnchor)
        ])
    }
    
    private func setupWebView() {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        
        // JavaScript 브릿지 설정
        let contentController = WKUserContentController()
        
        // 네이티브 앱 인터페이스 추가
        contentController.add(self, name: "FoodTruckInterface")
        
        config.userContentController = contentController
        webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = self
        webView.scrollView.contentInsetAdjustmentBehavior = .automatic
        
        view.addSubview(webView)
        
        // 웹뷰 제약 조건 설정
        setupWebViewConstraints()
        
        // 하단 네비게이션 바가 웹뷰 위에 오도록 보장
        view.bringSubviewToFront(bottomNavigationView)
        
        // 디버깅: 뷰 계층 구조 확인
        print("🔍 웹뷰 설정 후 뷰 계층 구조:")
        for (index, subview) in view.subviews.enumerated() {
            print("  \(index): \(type(of: subview)) - isUserInteractionEnabled: \(subview.isUserInteractionEnabled)")
        }
        
        webViewManager = WebViewManager()
    }
    
    private func setupNotifications() {
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleNavigateToScreen),
            name: NSNotification.Name("NavigateToScreen"),
            object: nil
        )
    }
    
    private func loadInitialWebContent() {
        guard let url = URL(string: AppConfig.mobileURL) else { 
            print("❌ 잘못된 URL: \(AppConfig.mobileURL)")
            return 
        }
        
        print("🌐 웹뷰 로딩 시작:")
        print("   - URL: \(url)")
        print("   - 환경: \(AppConfig.environment)")
        print("   - 서버 URL: \(AppConfig.serverURL)")
        
        let request = URLRequest(url: url)
        webView.load(request)
    }
    
    // MARK: - Safe Area Setup
    private func setupSafeArea() {
        let safeAreaInsets = view.safeAreaInsets
        
        let script = """
            document.body.style.paddingTop = '\(max(safeAreaInsets.top - 40, 0))px';
            document.body.style.paddingBottom = '\(80)px';
        """
        
        webView.evaluateJavaScript(script)
    }
    
    // MARK: - Screen Navigation
    private func updateNavigationUI() {
        DispatchQueue.main.async { [weak self] in
            self?.bottomNavigationView.setSelectedScreen(self?.currentScreen ?? "home")
        }
    }
    
    private func updateWebViewScreen() {
        let script = """
            if (typeof navigateTo === 'function') {
                navigateTo('\(currentScreen)');
            }
        """
        webView.evaluateJavaScript(script)
    }
    
    @objc private func handleNavigateToScreen(_ notification: Notification) {
        guard let screen = notification.userInfo?["screen"] as? String else { return }
        currentScreen = screen
    }
    
    // MARK: - Network Status
    private func checkNetworkStatus() {
        guard let url = URL(string: "\(AppConfig.serverURL)/health") else { return }
        
        URLSession.shared.dataTask(with: url) { [weak self] _, response, error in
            DispatchQueue.main.async {
                if let httpResponse = response as? HTTPURLResponse,
                   httpResponse.statusCode == 200 {
                    print("서버 연결 정상")
                } else {
                    self?.showNetworkError()
                }
            }
        }.resume()
    }
    
    private func showNetworkError() {
        let alert = UIAlertController(
            title: "연결 오류",
            message: "서버에 연결할 수 없습니다. 네트워크 연결을 확인해주세요.",
            preferredStyle: .alert
        )
        
        alert.addAction(UIAlertAction(title: "다시 시도", style: .default) { _ in
            self.loadInitialWebContent()
        })
        
        alert.addAction(UIAlertAction(title: "취소", style: .cancel))
        
        present(alert, animated: true)
    }
}

// MARK: - WKNavigationDelegate
extension MainViewController: WKNavigationDelegate {
    func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
        print("🌐 웹뷰 로딩 시작")
    }
    
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        setupSafeArea()
        
        // 초기화 스크립트 실행
        let initScript = """
            window.FoodTruckInterface = {
                navigateToMenu: function() {
                    const menuSection = document.getElementById('menu-screen') || 
                                       document.querySelector('.menu-section');
                    if (menuSection) {
                        menuSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    } else {
                        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                    }
                },
                navigateToHome: function() {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                },
                navigateToNotification: function() {
                    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                }
            };
            
            function navigateTo(screen) {
                switch(screen) {
                    case 'home':
                        window.FoodTruckInterface.navigateToHome();
                        break;
                    case 'menu':
                        window.FoodTruckInterface.navigateToMenu();
                        break;
                    case 'notification':
                        window.FoodTruckInterface.navigateToNotification();
                        break;
                }
            }
        """
        
        webView.evaluateJavaScript(initScript)
        updateWebViewScreen()
    }
    
    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        print("❌ 웹뷰 로딩 실패: \(error.localizedDescription)")
        showNetworkError()
    }
    
    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        print("❌ 웹뷰 프로비저널 네비게이션 실패: \(error.localizedDescription)")
        showNetworkError()
    }
    
}

// MARK: - WKScriptMessageHandler
extension MainViewController: WKScriptMessageHandler {
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.name == "FoodTruckInterface" else { return }
        
        if let messageBody = message.body as? [String: Any],
           let action = messageBody["action"] as? String {
            
            switch action {
            case "navigateTo":
                if let screen = messageBody["screen"] as? String {
                    currentScreen = screen
                }
                
            case "menuSelected":
                if let menuData = messageBody["menuData"] as? [String: Any] {
                    handleMenuSelected(menuData)
                }
                
            case "callPhone":
                if let phoneNumber = messageBody["phoneNumber"] as? String {
                    // 전화 걸기
                    if let url = URL(string: "tel:\(phoneNumber)") {
                        UIApplication.shared.open(url)
                    }
                }
                
            default:
                break
            }
        }
    }
    
    private func handleMenuSelected(_ menuData: [String: Any]) {
        let alert = UIAlertController(
            title: "메뉴 선택",
            message: "\(menuData["name"] ?? "") 선택",
            preferredStyle: .alert
        )
        
        alert.addAction(UIAlertAction(title: "확인", style: .default))
        present(alert, animated: true)
    }
}

// MARK: - BottomNavigationViewDelegate
extension MainViewController: BottomNavigationViewDelegate {
    func didSelectScreen(_ screen: String) {
        // 중복 실행 방지
        guard !isNavigating else {
            print("⚠️ 네비게이션 처리 중 - 무시됨: \(screen)")
            return
        }
        
        // 같은 화면이면 무시
        guard currentScreen != screen else {
            print("⚠️ 같은 화면 - 무시됨: \(screen)")
            return
        }
        
        isNavigating = true
        print("📱 화면 전환 요청: \(screen)")
        currentScreen = screen
        
        // notification 화면은 네이티브로 처리
        if screen == "notification" {
            showNotificationSettings()
            return
        }
        
        // 나머지는 웹뷰에서 처리
        let script = """
            if (typeof navigateTo === 'function') {
                navigateTo('\(screen)');
            } else {
                window.location.hash = '#\(screen)';
            }
        """
        webView.evaluateJavaScript(script)
        
        // 1초 후에 다시 네비게이션 허용
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
            self.isNavigating = false
        }
    }
    
    private func showNotificationSettings() {
        print("🔔 알림 설정 화면으로 이동")
        let notificationVC = NotificationSettingsViewController()
        
        // 네비게이션 바 표시
        navigationController?.setNavigationBarHidden(false, animated: true)
        
        navigationController?.pushViewController(notificationVC, animated: true)
        
        // currentScreen을 notification으로 설정하지 않음 (웹뷰 화면이 아니므로)
        // isNavigating 플래그만 리셋
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            self.isNavigating = false
        }
    }
}




