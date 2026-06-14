import UIKit
import UserNotifications
import Firebase
import FirebaseMessaging

class NotificationSettingsViewController: UIViewController {
    
    // MARK: - Properties
    private var scrollView: UIScrollView!
    private var contentView: UIView!
    
    private var pushNotificationSwitch: UISwitch!
    private var locationNotificationSwitch: UISwitch!
    
    // UserDefaults 키
    private let pushNotificationKey = "isPushNotificationEnabled"
    private let locationNotificationKey = "isLocationNotificationEnabled"
    
    // 서버 API URL
    private let baseURL = "https://truck.carrera74.com"
    
    // MARK: - Lifecycle
    override func viewDidLoad() {
        super.viewDidLoad()
        setupUI()
        checkNotificationPermission()
        loadSettingsFromServer()
    }
    
    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        // 네비게이션 바 설정 재적용
        setupNavigationBar()
        // 화면이 나타날 때마다 권한 상태 확인
        checkNotificationPermission()
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        NotificationCenter.default.post(
            name: NSNotification.Name("FoodTruckNotificationSettingsChanged"),
            object: nil
        )
    }
    
    // MARK: - UI Setup
    private func setupUI() {
        view.backgroundColor = .white
        
        // 네비게이션 바 설정
        setupNavigationBar()
        
        // 스크롤뷰 설정
        setupScrollView()
        
        // 콘텐츠 설정
        setupContent()
    }
    
    private func setupNavigationBar() {
        title = "알림 설정"
        
        // 네비게이션 바 설정
        navigationController?.navigationBar.backgroundColor = UIColor(red: 254/255, green: 198/255, blue: 80/255, alpha: 1.0)
        navigationController?.navigationBar.barTintColor = UIColor(red: 254/255, green: 198/255, blue: 80/255, alpha: 1.0)
        navigationController?.navigationBar.tintColor = UIColor(red: 101/255, green: 67/255, blue: 33/255, alpha: 1.0)
        
        // 네비게이션 바 스타일 설정
        navigationController?.navigationBar.isTranslucent = false
        navigationController?.navigationBar.prefersLargeTitles = false
        
        // 타이틀 색상 및 폰트 설정
        navigationController?.navigationBar.titleTextAttributes = [
            .foregroundColor: UIColor(red: 101/255, green: 67/255, blue: 33/255, alpha: 1.0),
            .font: UIFont.systemFont(ofSize: 18, weight: .semibold)
        ]
        
        // 뒤로가기 버튼 - 커스텀 버튼으로 생성
        let backButton = UIButton(type: .custom)
        backButton.setImage(UIImage(systemName: "chevron.left"), for: .normal)
        backButton.tintColor = UIColor(red: 51/255, green: 34/255, blue: 17/255, alpha: 1.0)
        backButton.backgroundColor = UIColor.clear
        
        // 테두리 제거
        backButton.layer.borderWidth = 0
        backButton.layer.borderColor = UIColor.clear.cgColor
        
        // 버튼 크기 설정
        backButton.frame = CGRect(x: 0, y: 0, width: 30, height: 30)
        backButton.contentEdgeInsets = UIEdgeInsets(top: 6, left: 6, bottom: 6, right: 6)
        
        backButton.addTarget(self, action: #selector(backButtonTapped), for: .touchUpInside)
        
        let backBarButton = UIBarButtonItem(customView: backButton)
        navigationItem.leftBarButtonItem = backBarButton
        
        // 네비게이션 바 레이아웃 조정
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
    
    private func setupScrollView() {
        scrollView = UIScrollView()
        scrollView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(scrollView)
        
        contentView = UIView()
        contentView.translatesAutoresizingMaskIntoConstraints = false
        scrollView.addSubview(contentView)
        
        NSLayoutConstraint.activate([
            scrollView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            scrollView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            scrollView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            scrollView.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor),
            
            contentView.topAnchor.constraint(equalTo: scrollView.topAnchor),
            contentView.leadingAnchor.constraint(equalTo: scrollView.leadingAnchor),
            contentView.trailingAnchor.constraint(equalTo: scrollView.trailingAnchor),
            contentView.bottomAnchor.constraint(equalTo: scrollView.bottomAnchor),
            contentView.widthAnchor.constraint(equalTo: scrollView.widthAnchor)
        ])
    }
    
    private func setupContent() {
        let stackView = UIStackView()
        stackView.axis = .vertical
        stackView.spacing = 16
        stackView.translatesAutoresizingMaskIntoConstraints = false
        contentView.addSubview(stackView)
        
        NSLayoutConstraint.activate([
            stackView.topAnchor.constraint(equalTo: contentView.topAnchor, constant: 16),
            stackView.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 16),
            stackView.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -16),
            stackView.bottomAnchor.constraint(equalTo: contentView.bottomAnchor, constant: -16)
        ])
        
        // 제목
        let titleLabel = UILabel()
        titleLabel.text = "푸시 알림 설정"
        titleLabel.font = UIFont.systemFont(ofSize: 24, weight: .bold)
        titleLabel.textColor = UIColor(red: 101/255, green: 67/255, blue: 33/255, alpha: 1.0)
        stackView.addArrangedSubview(titleLabel)
        
        // 전체 알림 설정
        let pushNotificationCard = createSettingCard(
            title: "푸시 알림",
            subtitle: "모든 알림을 켜거나 끕니다",
            switchAction: #selector(pushNotificationChanged(_:))
        )
        pushNotificationSwitch = pushNotificationCard.1
        stackView.addArrangedSubview(pushNotificationCard.0)
        
        
        // 위치 알림 설정
        let locationNotificationCard = createSettingCard(
            title: "위치 알림",
            subtitle: "푸드트럭 위치 변경 알림",
            switchAction: #selector(locationNotificationChanged(_:))
        )
        locationNotificationSwitch = locationNotificationCard.1
        stackView.addArrangedSubview(locationNotificationCard.0)
        
        // 스페이서
        let spacer = UIView()
        spacer.translatesAutoresizingMaskIntoConstraints = false
        spacer.heightAnchor.constraint(greaterThanOrEqualToConstant: 20).isActive = true
        stackView.addArrangedSubview(spacer)
    }
    
    private func createSettingCard(title: String, subtitle: String, switchAction: Selector) -> (UIView, UISwitch) {
        let cardView = UIView()
        cardView.backgroundColor = UIColor(red: 254/255, green: 198/255, blue: 80/255, alpha: 1.0)
        cardView.layer.cornerRadius = 12
        cardView.translatesAutoresizingMaskIntoConstraints = false
        
        let contentStack = UIStackView()
        contentStack.axis = .horizontal
        contentStack.spacing = 16
        contentStack.alignment = .center
        contentStack.translatesAutoresizingMaskIntoConstraints = false
        cardView.addSubview(contentStack)
        
        // 텍스트 스택
        let textStack = UIStackView()
        textStack.axis = .vertical
        textStack.spacing = 4
        
        let titleLabel = UILabel()
        titleLabel.text = title
        titleLabel.font = UIFont.systemFont(ofSize: 17, weight: .semibold)
        titleLabel.textColor = UIColor(red: 101/255, green: 67/255, blue: 33/255, alpha: 1.0)
        
        let subtitleLabel = UILabel()
        subtitleLabel.text = subtitle
        subtitleLabel.font = UIFont.systemFont(ofSize: 14, weight: .regular)
        subtitleLabel.textColor = UIColor(red: 101/255, green: 67/255, blue: 33/255, alpha: 0.7)
        subtitleLabel.numberOfLines = 0
        
        textStack.addArrangedSubview(titleLabel)
        textStack.addArrangedSubview(subtitleLabel)
        
        // 스위치
        let toggleSwitch = UISwitch()
        toggleSwitch.onTintColor = UIColor(red: 101/255, green: 67/255, blue: 33/255, alpha: 1.0)
        toggleSwitch.isUserInteractionEnabled = true
        toggleSwitch.isEnabled = true
        toggleSwitch.addTarget(self, action: switchAction, for: .valueChanged)
        
        // 터치 이벤트 디버깅을 위한 추가 타겟
        toggleSwitch.addTarget(self, action: #selector(switchTouched(_:)), for: .touchUpInside)
        toggleSwitch.addTarget(self, action: #selector(switchTouched(_:)), for: .valueChanged)
        
        contentStack.addArrangedSubview(textStack)
        contentStack.addArrangedSubview(toggleSwitch)
        
        NSLayoutConstraint.activate([
            contentStack.topAnchor.constraint(equalTo: cardView.topAnchor, constant: 16),
            contentStack.leadingAnchor.constraint(equalTo: cardView.leadingAnchor, constant: 16),
            contentStack.trailingAnchor.constraint(equalTo: cardView.trailingAnchor, constant: -16),
            contentStack.bottomAnchor.constraint(equalTo: cardView.bottomAnchor, constant: -16)
        ])
        
        return (cardView, toggleSwitch)
    }
    
    // MARK: - Actions
    @objc private func backButtonTapped() {
        print("🔙 뒤로가기 버튼 클릭")
        
        // 네비게이션 바 숨기기 (애니메이션 제거)
        navigationController?.setNavigationBarHidden(true, animated: false)
        
        navigationController?.popViewController(animated: true)
    }
    
    @objc private func pushNotificationChanged(_ sender: UISwitch) {
        print("🔔 전체 푸시 알림 변경: \(sender.isOn)")

        if sender.isOn {
            print("🔍 권한 상태 확인 중...")
            // 권한 상태 확인
            UNUserNotificationCenter.current().getNotificationSettings { settings in
                print("📱 현재 권한 상태: \(settings.authorizationStatus.rawValue)")
                print("📱 알림 설정: \(settings)")
                
                DispatchQueue.main.async {
                    switch settings.authorizationStatus {
                    case .authorized, .provisional, .ephemeral:
                        print("✅ 권한이 허용됨 - 정상 동작")
                        // 권한이 허용된 경우 - 정상 동작
                        self.locationNotificationSwitch.isEnabled = true
                        // 푸시 알림이 켜지면 위치 알림도 자동으로 켜기
                        self.locationNotificationSwitch.isOn = true
                        // 로컬 설정은 즉시 저장하고 서버 동기화는 비동기로 진행
                        self.saveSettings()
                        self.saveSettingsToServer()
                    case .denied:
                        print("❌ 권한이 거부됨 - 설정으로 이동")
                        // 권한이 거부된 경우 - OS 설정으로 이동
                        sender.isOn = false // 스위치를 다시 OFF로
                        self.locationNotificationSwitch.isOn = false
                        self.locationNotificationSwitch.isEnabled = false
                        self.saveSettings()
                        self.showPermissionDeniedAlert()
                    case .notDetermined:
                        print("⚠️ 권한이 미결정 - 권한 요청")
                        // 권한이 미결정인 경우 - 권한 요청
                        self.requestNotificationPermission()
                    @unknown default:
                        print("❓ 알 수 없는 권한 상태")
                        break
                    }
                }
            }
        } else {
            print("🔔 알림 끄기 - 하위 알림도 비활성화")
            // 전체 알림이 꺼지면 하위 알림도 비활성화 및 OFF
            locationNotificationSwitch.isOn = false
            locationNotificationSwitch.isEnabled = false
            // 로컬 설정은 즉시 저장하고 서버 동기화는 비동기로 진행
            saveSettings()
            saveSettingsToServer()
        }
    }
    
    
    @objc private func locationNotificationChanged(_ sender: UISwitch) {
        print("📍 위치 알림 변경: \(sender.isOn)")

        // 로컬 설정은 즉시 저장하고 서버 동기화는 비동기로 진행
        saveSettings()
        saveSettingsToServer()
    }
    
    // 디버깅용 메서드
    @objc private func switchTouched(_ sender: UISwitch) {
        print("🔘 스위치 터치됨: \(sender.isOn)")
        print("🔘 스위치 isEnabled: \(sender.isEnabled)")
        print("🔘 스위치 isUserInteractionEnabled: \(sender.isUserInteractionEnabled)")
    }
    
    // MARK: - Settings Management
    private func loadSettings() {
        let defaults = UserDefaults.standard
        let isPushEnabled: Bool
        let isLocationEnabled: Bool

        if let pushValue = defaults.object(forKey: pushNotificationKey) as? Bool {
            isPushEnabled = pushValue
        } else {
            isPushEnabled = true
            defaults.set(true, forKey: pushNotificationKey)
        }

        if let locationValue = defaults.object(forKey: locationNotificationKey) as? Bool {
            isLocationEnabled = locationValue
        } else {
            isLocationEnabled = true
            defaults.set(true, forKey: locationNotificationKey)
        }

        pushNotificationSwitch.isOn = isPushEnabled
        locationNotificationSwitch.isOn = isPushEnabled ? isLocationEnabled : false
        
        // 전체 알림이 꺼져있으면 하위 알림 비활성화
        locationNotificationSwitch.isEnabled = isPushEnabled

        print("📥 로컬 알림 설정 로드:")
        print("   - 푸시 알림: \(isPushEnabled)")
        print("   - 위치 알림: \(isLocationEnabled)")
    }
    
    private func saveSettings() {
        UserDefaults.standard.set(pushNotificationSwitch.isOn, forKey: pushNotificationKey)
        UserDefaults.standard.set(locationNotificationSwitch.isOn, forKey: locationNotificationKey)
        UserDefaults.standard.synchronize()
        
        print("✅ 알림 설정 저장 완료:")
        print("   - 푸시 알림: \(pushNotificationSwitch.isOn)")
        print("   - 위치 알림: \(locationNotificationSwitch.isOn)")

        NotificationCenter.default.post(
            name: NSNotification.Name("FoodTruckNotificationSettingsChanged"),
            object: nil
        )
    }
    
    // MARK: - Notification Permission
    private func checkNotificationPermission() {
        UNUserNotificationCenter.current().getNotificationSettings { settings in
            DispatchQueue.main.async {
                switch settings.authorizationStatus {
                case .authorized, .provisional, .ephemeral:
                    print("✅ 알림 권한 허용됨")
                    self.enableNotificationControls()
                case .denied:
                    print("❌ 알림 권한 거부됨")
                    self.disableNotificationControls()
                case .notDetermined:
                    print("⚠️ 알림 권한 미결정")
                    self.enableNotificationControls()
                @unknown default:
                    break
                }
            }
        }
    }
    
    private func enableNotificationControls() {
        pushNotificationSwitch.isEnabled = true
        locationNotificationSwitch.isEnabled = true
    }
    
    private func disableNotificationControls() {
        // 권한이 거부된 경우 스위치는 활성화하되 OFF로 설정
        // 사용자가 스위치를 켜려고 하면 설정으로 이동하도록 함
        pushNotificationSwitch.isOn = false
        locationNotificationSwitch.isOn = false
        pushNotificationSwitch.isEnabled = true  // 활성화 유지
        locationNotificationSwitch.isEnabled = false  // 위치 알림은 비활성화
    }
    
    private func requestNotificationPermission() {
        print("🔔 알림 권한 요청 시작")
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound]) { granted, error in
            print("🔔 권한 요청 결과 - granted: \(granted), error: \(error?.localizedDescription ?? "none")")
            
            DispatchQueue.main.async {
                if granted {
                    print("✅ 알림 권한 허용됨")
                    UIApplication.shared.registerForRemoteNotifications()
                    // 권한이 허용되면 위치 알림 스위치도 활성화하고 켜기
                    self.locationNotificationSwitch.isEnabled = true
                    self.locationNotificationSwitch.isOn = true
                    // 로컬 설정은 즉시 저장하고 서버 동기화는 비동기로 진행
                    self.saveSettings()
                    self.saveSettingsToServer()
                } else {
                    print("❌ 알림 권한 거부됨")
                    self.pushNotificationSwitch.isOn = false
                    self.locationNotificationSwitch.isOn = false
                    self.locationNotificationSwitch.isEnabled = false
                    self.saveSettings()
                    self.showPermissionDeniedAlert()
                }
            }
        }
    }
    
    private func showPermissionDeniedAlert() {
        let alert = UIAlertController(
            title: "알림 설정 필요",
            message: "앱설정에서 푸시설정을 켜야합니다.\n설정 앱에서 알림 권한을 허용해주세요.",
            preferredStyle: .alert
        )
        
        alert.addAction(UIAlertAction(title: "설정으로 이동", style: .default) { _ in
            if let url = URL(string: UIApplication.openSettingsURLString) {
                UIApplication.shared.open(url)
            }
        })
        
        alert.addAction(UIAlertAction(title: "취소", style: .cancel))
        
        present(alert, animated: true)
    }
    
    // MARK: - Server API
    private func loadSettingsFromServer() {
        let hasLocalPreference =
            UserDefaults.standard.object(forKey: pushNotificationKey) != nil &&
            UserDefaults.standard.object(forKey: locationNotificationKey) != nil

        // 먼저 로컬 설정으로 UI 초기화
        loadSettings()

        // 사용자가 이미 앱에서 설정한 값이 있으면 서버 값으로 덮어쓰지 않음
        if hasLocalPreference {
            print("ℹ️ 로컬 알림 설정이 존재하여 서버 동기화 덮어쓰기를 건너뜁니다")
            return
        }
        
        // 알림 권한 상태 확인 후 FCM 토큰 가져오기
        UNUserNotificationCenter.current().getNotificationSettings { [weak self] settings in
            DispatchQueue.main.async {
                switch settings.authorizationStatus {
                case .authorized, .provisional, .ephemeral:
                    print("✅ 알림 권한 허용됨 - FCM 토큰 가져오기 시도")
                    self?.getFCMTokenAndLoadSettings()
                case .denied:
                    print("❌ 알림 권한 거부됨 - FCM 토큰 가져오기 건너뜀")
                    // 권한이 거부된 경우 로컬 설정만 사용
                    self?.loadSettings()
                case .notDetermined:
                    print("⚠️ 알림 권한 미결정 - FCM 토큰 가져오기 시도")
                    self?.getFCMTokenAndLoadSettings()
                @unknown default:
                    print("❓ 알 수 없는 권한 상태")
                    break
                }
            }
        }
    }
    
    private func getFCMTokenAndLoadSettings() {
        // FCM 토큰 가져오기
        Messaging.messaging().token { [weak self] (token: String?, error: Error?) in
            if let error = error {
                print("❌ FCM 토큰 가져오기 실패: \(error)")
                // FCM 토큰이 없어도 로컬 설정은 사용 가능
                return
            }
            
            guard let token = token else {
                print("❌ FCM 토큰이 nil")
                return
            }
            
            print("✅ FCM 토큰: \(token)")
            self?.fetchNotificationSettings(token: token)
        }
    }

    private func encodedPathToken(_ token: String) -> String {
        let allowed = CharacterSet.alphanumerics.union(CharacterSet(charactersIn: "-._~"))
        return token.addingPercentEncoding(withAllowedCharacters: allowed) ?? token
    }
    
    private func fetchNotificationSettings(token: String) {
        let encodedToken = encodedPathToken(token)
        guard let url = URL(string: "\(baseURL)/api/fcm/token/\(encodedToken)") else {
            print("❌ 잘못된 URL")
            return
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("FoodTruckApp/1.0.0", forHTTPHeaderField: "User-Agent")
        
        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            DispatchQueue.main.async {
                if let error = error {
                    print("❌ 서버 통신 오류: \(error)")
                    return
                }

                guard let httpResponse = response as? HTTPURLResponse else {
                    print("❌ HTTP 응답이 아닙니다")
                    return
                }

                if httpResponse.statusCode == 404 {
                    print("ℹ️ 서버에 토큰 설정이 없어 로컬 설정을 유지합니다")
                    return
                }

                guard (200...299).contains(httpResponse.statusCode) else {
                    print("❌ 서버 오류: \(httpResponse.statusCode)")
                    return
                }
                
                guard let data = data else {
                    print("❌ 응답 데이터 없음")
                    return
                }
                
                do {
                    if let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
                       let tokenData = json["token"] as? [String: Any] {
                        print("📱 서버에서 받은 토큰 설정: \(json)")
                        
                        let notificationEnabled = tokenData["notificationEnabled"] as? Bool ?? true
                        let locationNotificationEnabled = tokenData["locationNotificationEnabled"] as? Bool ?? true
                        
                        // UI 업데이트
                        self?.pushNotificationSwitch.isOn = notificationEnabled
                        self?.locationNotificationSwitch.isOn = locationNotificationEnabled
                        self?.locationNotificationSwitch.isEnabled = notificationEnabled
                        
                        // 로컬에도 저장
                        UserDefaults.standard.set(notificationEnabled, forKey: self?.pushNotificationKey ?? "")
                        UserDefaults.standard.set(locationNotificationEnabled, forKey: self?.locationNotificationKey ?? "")
                        UserDefaults.standard.synchronize()
                        
                        print("✅ 서버에서 알림 설정 로드 완료 - 푸시: \(notificationEnabled), 위치: \(locationNotificationEnabled)")
                    }
                } catch {
                    print("❌ JSON 파싱 오류: \(error)")
                }
            }
        }.resume()
    }
    
    private func saveSettingsToServer() {
        // 알림 권한 상태 확인
        UNUserNotificationCenter.current().getNotificationSettings { [weak self] settings in
            DispatchQueue.main.async {
                switch settings.authorizationStatus {
                case .authorized, .provisional, .ephemeral:
                    print("✅ 알림 권한 허용됨 - 서버에 설정 저장 시도")
                    self?.getFCMTokenAndSaveSettings()
                case .denied:
                    print("❌ 알림 권한 거부됨 - 서버 동기화 생략 (로컬 설정 유지)")
                case .notDetermined:
                    print("⚠️ 알림 권한 미결정 - 서버에 설정 저장 시도")
                    self?.getFCMTokenAndSaveSettings()
                @unknown default:
                    print("❓ 알 수 없는 권한 상태")
                    break
                }
            }
        }
    }
    
    private func getFCMTokenAndSaveSettings() {
        Messaging.messaging().token { [weak self] (token: String?, error: Error?) in
            if let error = error {
                print("❌ FCM 토큰 가져오기 실패: \(error)")
                // 로컬 저장은 이미 완료되어 있으므로 서버 동기화만 생략
                return
            }
            
            guard let token = token else {
                print("❌ FCM 토큰이 nil")
                // 로컬 저장은 이미 완료되어 있으므로 서버 동기화만 생략
                return
            }
            
            self?.updateNotificationSettingsOnServer(token: token)
        }
    }
    
    private func updateNotificationSettingsOnServer(token: String) {
        let encodedToken = encodedPathToken(token)
        guard let url = URL(string: "\(baseURL)/api/fcm/token/\(encodedToken)") else {
            print("❌ 잘못된 URL")
            showErrorAlert(message: "잘못된 서버 URL입니다.")
            return
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "PATCH"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("FoodTruckApp/1.0.0", forHTTPHeaderField: "User-Agent")
        
        let requestBody: [String: Any] = [
            "notificationEnabled": pushNotificationSwitch.isOn,
            "locationNotificationEnabled": locationNotificationSwitch.isOn
        ]
        
        do {
            request.httpBody = try JSONSerialization.data(withJSONObject: requestBody)
        } catch {
            print("❌ JSON 직렬화 오류: \(error)")
            showErrorAlert(message: "요청 데이터 생성에 실패했습니다.")
            return
        }
        
        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            DispatchQueue.main.async {
                if let error = error {
                    print("❌ 서버 통신 오류: \(error)")
                    // 앱 내 로컬 설정은 유지하고 서버 동기화만 실패 처리
                    self?.showErrorAlert(message: "서버 동기화에 실패했습니다. 앱 설정은 유지됩니다.")
                    return
                }
                
                if let httpResponse = response as? HTTPURLResponse {
                    print("📱 서버 응답 코드: \(httpResponse.statusCode)")
                    
                    if httpResponse.statusCode == 200 || httpResponse.statusCode == 201 {
                        // 성공
                        self?.saveSettings() // 로컬에도 저장
                        print("✅ 서버에 알림 설정 저장 완료")
                    } else {
                        print("❌ 서버 오류: \(httpResponse.statusCode)")
                        // 앱 내 로컬 설정은 유지하고 서버 동기화만 실패 처리
                        self?.showErrorAlert(message: "서버 동기화에 실패했습니다. 앱 설정은 유지됩니다.")
                    }
                }
            }
        }.resume()
    }
    
    
    private func showErrorAlert(message: String) {
        let alert = UIAlertController(
            title: "오류",
            message: message,
            preferredStyle: .alert
        )
        alert.addAction(UIAlertAction(title: "확인", style: .default))
        present(alert, animated: true)
    }
}
