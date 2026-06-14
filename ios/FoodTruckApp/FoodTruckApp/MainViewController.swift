import UIKit
import WebKit
import UserNotifications

class MainViewController: UIViewController {
    
    // MARK: - Properties
    private var webView: WKWebView!
    private var webViewManager: WebViewManager!
    private var phoneButton: UIButton!
    
    private var currentScreen: String = "home" {
        didSet {
            updateNavigationUI()
            updateWebViewScreen()
        }
    }
    
    // 중복 실행 방지
    private var isNavigating = false
    private let pushNotificationKey = "isPushNotificationEnabled"
    private let locationNotificationKey = "isLocationNotificationEnabled"
    
    
    // MARK: - Lifecycle
    override func viewDidLoad() {
        super.viewDidLoad()
        ensureNotificationDefaults()
        setupUI()
        setupNotifications()
        setupWebView()
        loadInitialWebContent()
    }
    
    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        // 네비게이션 바 설정 재적용
        setupNavigationBar()
        sendNotificationStateToWeb()
    }

    deinit {
        NotificationCenter.default.removeObserver(self)
    }
    
    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        
        // 뷰 계층 구조 디버깅
        print("🔍 최종 뷰 계층 구조:")
        for (index, subview) in view.subviews.enumerated() {
            print("  \(index): \(type(of: subview)) - isUserInteractionEnabled: \(subview.isUserInteractionEnabled)")
        }
    }
    
    // MARK: - UI Setup
    private func setupUI() {
        view.backgroundColor = UIColor(red: 254/255, green: 198/255, blue: 80/255, alpha: 1.0) // 앱 테마 색상
        
        // 네비게이션 바 설정
        setupNavigationBar()
        
        // 하단 전화 버튼 설정
        setupPhoneButton()
    }
    
    
    private func setupNavigationBar() {
        // 네비게이션 바 표시
        navigationController?.setNavigationBarHidden(false, animated: false)
        
        // 네비게이션 바 스타일 설정
        navigationController?.navigationBar.backgroundColor = UIColor(red: 254/255, green: 198/255, blue: 80/255, alpha: 1.0)
        navigationController?.navigationBar.barTintColor = UIColor(red: 254/255, green: 198/255, blue: 80/255, alpha: 1.0)
        navigationController?.navigationBar.tintColor = UIColor(red: 101/255, green: 67/255, blue: 33/255, alpha: 1.0)
        navigationController?.navigationBar.isTranslucent = false
        
        // 타이틀 설정
        title = "세종 유미네 곱창 트럭"
        navigationController?.navigationBar.titleTextAttributes = [
            .foregroundColor: UIColor(red: 101/255, green: 67/255, blue: 33/255, alpha: 1.0),
            .font: UIFont.systemFont(ofSize: 18, weight: .semibold)
        ]
        
        // 우측 알림 버튼 추가 - 간단한 방법
        let notificationBarButton = UIBarButtonItem(
            title: "알림",
            style: .plain,
            target: self,
            action: #selector(notificationButtonTapped)
        )
        
        // 버튼 스타일 설정
        notificationBarButton.tintColor = .white
        notificationBarButton.setTitleTextAttributes([
            .foregroundColor: UIColor.white,
            .font: UIFont.systemFont(ofSize: 14, weight: .medium)
        ], for: .normal)
        
        navigationItem.rightBarButtonItem = notificationBarButton
        
        // iOS 15+ 네비게이션 바 설정
        if #available(iOS 15.0, *) {
            let appearance = UINavigationBarAppearance()
            appearance.configureWithOpaqueBackground()
            appearance.backgroundColor = UIColor(red: 254/255, green: 198/255, blue: 80/255, alpha: 1.0)
            appearance.titleTextAttributes = [
                .foregroundColor: UIColor(red: 101/255, green: 67/255, blue: 33/255, alpha: 1.0),
                .font: UIFont.systemFont(ofSize: 18, weight: .semibold)
            ]
            navigationController?.navigationBar.standardAppearance = appearance
            navigationController?.navigationBar.scrollEdgeAppearance = appearance
        }
    }
    
    private func setupPhoneButton() {
        phoneButton = UIButton(type: .system)
        phoneButton.backgroundColor = UIColor(red: 101/255, green: 67/255, blue: 33/255, alpha: 1.0) // 알림 버튼과 동일한 다크 브라운 색상
        phoneButton.setTitle("📞 주인장에게 전화하기", for: .normal)
        phoneButton.setTitleColor(.white, for: .normal)
        phoneButton.titleLabel?.font = UIFont.systemFont(ofSize: 16, weight: .semibold)
        phoneButton.layer.cornerRadius = 12
        phoneButton.layer.shadowColor = UIColor.black.cgColor
        phoneButton.layer.shadowOffset = CGSize(width: 0, height: -2)
        phoneButton.layer.shadowOpacity = 0.3
        phoneButton.layer.shadowRadius = 4
        
        phoneButton.addTarget(self, action: #selector(phoneButtonTapped), for: .touchUpInside)
        
        view.addSubview(phoneButton)
        phoneButton.translatesAutoresizingMaskIntoConstraints = false
        
        NSLayoutConstraint.activate([
            phoneButton.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 16),
            phoneButton.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -16),
            phoneButton.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -16),
            phoneButton.heightAnchor.constraint(equalToConstant: 50)
        ])
    }
    
    private func setupWebViewConstraints() {
        webView.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            webView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            webView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            webView.bottomAnchor.constraint(equalTo: view.bottomAnchor)
        ])
    }
    
    private func setupWebView() {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        
        // localStorage 사용을 위해 영구 저장소 사용
        config.websiteDataStore = WKWebsiteDataStore.default()
        
        // JavaScript 브릿지 설정
        let contentController = WKUserContentController()
        
        // 네이티브 앱 인터페이스 추가
        contentController.add(self, name: "FoodTruckInterface")
        let bridgeScript = WKUserScript(
            source: bridgeBootstrapScript(),
            injectionTime: .atDocumentStart,
            forMainFrameOnly: true
        )
        contentController.addUserScript(bridgeScript)
        
        config.userContentController = contentController
        webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = self
        webView.scrollView.contentInsetAdjustmentBehavior = .automatic
        webView.backgroundColor = UIColor.white
        webView.isOpaque = false
        
        view.addSubview(webView)
        
        // 웹뷰 제약 조건 설정
        setupWebViewConstraints()
        
        // 전화 버튼이 웹뷰 위에 오도록 보장
        view.bringSubviewToFront(phoneButton)
        
        webViewManager = WebViewManager()
    }
    
    private func setupNotifications() {
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleNavigateToScreen),
            name: NSNotification.Name("NavigateToScreen"),
            object: nil
        )

        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleNotificationSettingsChanged),
            name: NSNotification.Name("FoodTruckNotificationSettingsChanged"),
            object: nil
        )

        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleAppWillEnterForeground),
            name: UIApplication.willEnterForegroundNotification,
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
        
        // 캐시를 무시하는 요청 설정
        var request = URLRequest(url: url)
        request.cachePolicy = .reloadIgnoringLocalCacheData
        request.setValue("no-cache", forHTTPHeaderField: "Cache-Control")
        request.setValue("no-cache", forHTTPHeaderField: "Pragma")
        
        webView.load(request)
    }

    private func ensureNotificationDefaults() {
        let defaults = UserDefaults.standard
        if defaults.object(forKey: pushNotificationKey) == nil {
            defaults.set(true, forKey: pushNotificationKey)
        }
        if defaults.object(forKey: locationNotificationKey) == nil {
            defaults.set(true, forKey: locationNotificationKey)
        }
    }

    private func bridgeBootstrapScript() -> String {
        return """
        (function() {
            if (window.__foodtruckBridgeInitialized) return;
            window.__foodtruckBridgeInitialized = true;

            window.FoodTruckInterface = window.FoodTruckInterface || {};
            window.__foodtruckBridgeCallbacks = window.__foodtruckBridgeCallbacks || {};

            window.FoodTruckInterface.requestNotificationStateSync = function() {
                if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.FoodTruckInterface) {
                    window.webkit.messageHandlers.FoodTruckInterface.postMessage({ action: 'requestNotificationStateSync' });
                }
            };

            window.FoodTruckInterface.openNotificationSettings = function() {
                if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.FoodTruckInterface) {
                    window.webkit.messageHandlers.FoodTruckInterface.postMessage({ action: 'openNotificationSettings' });
                }
            };

            window.FoodTruckInterface.getNotificationState = function() {
                return new Promise(function(resolve) {
                    var callbackId = 'cb_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
                    window.__foodtruckBridgeCallbacks[callbackId] = resolve;

                    if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.FoodTruckInterface) {
                        window.webkit.messageHandlers.FoodTruckInterface.postMessage({
                            action: 'getNotificationState',
                            callbackId: callbackId
                        });
                    } else {
                        resolve(null);
                    }
                });
            };

            window.FoodTruckInterface.__resolveNotificationState = function(callbackId, payload) {
                var resolver = window.__foodtruckBridgeCallbacks[callbackId];
                if (typeof resolver === 'function') {
                    resolver(payload);
                    delete window.__foodtruckBridgeCallbacks[callbackId];
                }
            };
        })();
        """
    }

    private func buildNotificationBridgePayload(permissionStatus: UNAuthorizationStatus) -> [String: Any] {
        let defaults = UserDefaults.standard
        let appNotificationEnabled = defaults.object(forKey: pushNotificationKey) == nil
            ? true
            : defaults.bool(forKey: pushNotificationKey)
        let locationNotificationEnabled = defaults.object(forKey: locationNotificationKey) == nil
            ? true
            : defaults.bool(forKey: locationNotificationKey)

        let permissionGranted: Bool
        switch permissionStatus {
        case .authorized, .provisional:
            permissionGranted = true
        default:
            permissionGranted = false
        }

        let appVersion = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0.0"
        let buildNumber = Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "1"
        let effectiveNotificationEnabled = appNotificationEnabled && permissionGranted

        return [
            "platform": "ios",
            "appVersion": appVersion,
            "appVersionCode": buildNumber,
            "bridgeVersion": 1,
            "supportsCouponGate": true,
            "notificationEnabled": effectiveNotificationEnabled,
            "appNotificationEnabled": appNotificationEnabled,
            "permissionGranted": permissionGranted,
            "locationNotificationEnabled": locationNotificationEnabled && effectiveNotificationEnabled,
            "updatedAt": Int(Date().timeIntervalSince1970 * 1000)
        ]
    }

    private func fetchNotificationBridgeState(completion: @escaping ([String: Any]) -> Void) {
        UNUserNotificationCenter.current().getNotificationSettings { [weak self] settings in
            guard let self = self else { return }
            let payload = self.buildNotificationBridgePayload(permissionStatus: settings.authorizationStatus)
            completion(payload)
        }
    }

    private func escapeForJavaScript(_ value: String) -> String {
        return value
            .replacingOccurrences(of: "\\", with: "\\\\")
            .replacingOccurrences(of: "'", with: "\\'")
            .replacingOccurrences(of: "\n", with: "\\n")
            .replacingOccurrences(of: "\r", with: "")
    }

    private func sendNotificationStateToWeb(callbackId: String? = nil) {
        fetchNotificationBridgeState { [weak self] payload in
            guard let self = self else { return }
            guard let data = try? JSONSerialization.data(withJSONObject: payload),
                  let payloadJson = String(data: data, encoding: .utf8) else {
                return
            }

            let callbackScript: String
            if let callbackId = callbackId {
                callbackScript = """
                    if (window.FoodTruckInterface && typeof window.FoodTruckInterface.__resolveNotificationState === 'function') {
                        window.FoodTruckInterface.__resolveNotificationState('\(self.escapeForJavaScript(callbackId))', payload);
                    }
                """
            } else {
                callbackScript = ""
            }

            let script = """
                (function() {
                    try {
                        var payload = \(payloadJson);
                        \(callbackScript)
                        if (typeof window.onFoodTruckNotificationStateChanged === 'function') {
                            window.onFoodTruckNotificationStateChanged(payload);
                        }
                        if (typeof window.dispatchEvent === 'function' && typeof CustomEvent === 'function') {
                            window.dispatchEvent(new CustomEvent('foodtruck:notification-state', { detail: payload }));
                        }
                    } catch (e) {
                        console.error('FoodTruck iOS bridge dispatch failed', e);
                    }
                })();
            """

            DispatchQueue.main.async {
                self.webView?.evaluateJavaScript(script, completionHandler: nil)
            }
        }
    }

    private func openNotificationSettingsFromWeb() {
        DispatchQueue.main.async {
            if let navigationController = self.navigationController {
                let settingsVC = NotificationSettingsViewController()
                navigationController.pushViewController(settingsVC, animated: true)
            } else if let settingsURL = URL(string: UIApplication.openSettingsURLString) {
                UIApplication.shared.open(settingsURL, options: [:], completionHandler: nil)
            }
        }
    }
    
    // MARK: - Safe Area Setup
    private func setupSafeArea() {
        let safeAreaInsets = view.safeAreaInsets
        
        let script = """
            document.body.style.paddingTop = '\(max(safeAreaInsets.top - 40, 0))px';
        """
        
        webView.evaluateJavaScript(script)
    }
    
    // MARK: - Actions
    @objc private func notificationButtonTapped() {
        print("🔔 알림 버튼 클릭")
        let notificationVC = NotificationSettingsViewController()
        navigationController?.pushViewController(notificationVC, animated: true)
    }
    
    @objc private func phoneButtonTapped() {
        print("📞 전화 버튼 클릭")
        let phoneNumber = "010-2420-5174"
        if let url = URL(string: "tel:\(phoneNumber)") {
            if UIApplication.shared.canOpenURL(url) {
                UIApplication.shared.open(url, options: [:], completionHandler: nil)
            } else {
                print("❌ 전화 앱을 열 수 없습니다")
            }
        }
    }
    
    // MARK: - Screen Navigation
    private func updateNavigationUI() {
        // 하단 네비게이션 바가 제거되어 더 이상 필요 없음
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

    @objc private func handleNotificationSettingsChanged() {
        sendNotificationStateToWeb()
    }

    @objc private func handleAppWillEnterForeground() {
        sendNotificationStateToWeb()
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
    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = navigationAction.request.url else {
            decisionHandler(.allow)
            return
        }
        
        let urlString = url.absoluteString
        
        if urlString.hasPrefix("tel:") {
            // 전화 걸기
            if let phoneURL = URL(string: urlString) {
                if UIApplication.shared.canOpenURL(phoneURL) {
                    UIApplication.shared.open(phoneURL, options: [:], completionHandler: nil)
                }
            }
            decisionHandler(.cancel)
            return
        } else if urlString.hasPrefix("mailto:") {
            // 이메일
            if let mailURL = URL(string: urlString) {
                if UIApplication.shared.canOpenURL(mailURL) {
                    UIApplication.shared.open(mailURL, options: [:], completionHandler: nil)
                }
            }
            decisionHandler(.cancel)
            return
        } else if urlString.hasPrefix("http://") || urlString.hasPrefix("https://") {
            // 메인 도메인이 아닌 외부 링크만 외부 브라우저에서 열기
            if !urlString.contains("truck.carrera74.com") {
                if UIApplication.shared.canOpenURL(url) {
                    UIApplication.shared.open(url, options: [:], completionHandler: nil)
                }
                decisionHandler(.cancel)
                return
            }
        }
        
        // 다른 URL은 WebView에서 처리
        decisionHandler(.allow)
    }
    
    func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
        print("🌐 웹뷰 로딩 시작")
    }
    
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        setupSafeArea()
        sendNotificationStateToWeb()
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

            case "requestNotificationStateSync":
                sendNotificationStateToWeb()

            case "openNotificationSettings":
                openNotificationSettingsFromWeb()

            case "getNotificationState":
                if let callbackId = messageBody["callbackId"] as? String {
                    sendNotificationStateToWeb(callbackId: callbackId)
                } else {
                    sendNotificationStateToWeb()
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
