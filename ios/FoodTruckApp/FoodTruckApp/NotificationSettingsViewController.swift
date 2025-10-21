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
        
        // 뒤로가기 버튼
        let backButton = UIBarButtonItem(
            image: UIImage(systemName: "chevron.left"),
            style: .plain,
            target: self,
            action: #selector(backButtonTapped)
        )
        backButton.tintColor = UIColor(red: 101/255, green: 67/255, blue: 33/255, alpha: 1.0)
        navigationItem.leftBarButtonItem = backButton
        
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
        
        // 저장 버튼
        let saveButton = UIButton(type: .system)
        saveButton.setTitle("저장", for: .normal)
        saveButton.backgroundColor = UIColor(red: 254/255, green: 198/255, blue: 80/255, alpha: 1.0)
        saveButton.setTitleColor(UIColor(red: 101/255, green: 67/255, blue: 33/255, alpha: 1.0), for: .normal)
        saveButton.titleLabel?.font = UIFont.systemFont(ofSize: 18, weight: .semibold)
        saveButton.layer.cornerRadius = 12
        saveButton.translatesAutoresizingMaskIntoConstraints = false
        saveButton.heightAnchor.constraint(equalToConstant: 50).isActive = true
        saveButton.addTarget(self, action: #selector(saveButtonTapped), for: .touchUpInside)
        stackView.addArrangedSubview(saveButton)
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
        toggleSwitch.addTarget(self, action: switchAction, for: .valueChanged)
        
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
            // 권한 상태 확인
            UNUserNotificationCenter.current().getNotificationSettings { settings in
                DispatchQueue.main.async {
                    switch settings.authorizationStatus {
                    case .authorized, .provisional:
                        // 권한이 허용된 경우 - 정상 동작
                        self.locationNotificationSwitch.isEnabled = true
                        // 서버에 설정 저장
                        self.saveSettingsToServer()
                    case .denied:
                        // 권한이 거부된 경우 - OS 설정으로 이동
                        sender.isOn = false // 스위치를 다시 OFF로
                        self.showPermissionDeniedAlert()
                    case .notDetermined:
                        // 권한이 미결정인 경우 - 권한 요청
                        self.requestNotificationPermission()
                    @unknown default:
                        break
                    }
                }
            }
        } else {
            // 전체 알림이 꺼지면 하위 알림도 비활성화 및 OFF
            locationNotificationSwitch.isOn = false
            locationNotificationSwitch.isEnabled = false
            // 서버에 설정 저장
            saveSettingsToServer()
        }
    }
    
    
    @objc private func locationNotificationChanged(_ sender: UISwitch) {
        print("📍 위치 알림 변경: \(sender.isOn)")
        // 서버에 설정 저장
        saveSettingsToServer()
    }
    
    @objc private func saveButtonTapped() {
        print("💾 알림 설정 저장")
        
        // 서버에 설정 저장
        saveSettingsToServer()
    }
    
    // MARK: - Settings Management
    private func loadSettings() {
        let isPushEnabled = UserDefaults.standard.bool(forKey: pushNotificationKey)
        let isLocationEnabled = UserDefaults.standard.bool(forKey: locationNotificationKey)
        
        // 처음 실행 시 기본값 설정
        if !UserDefaults.standard.bool(forKey: "hasLaunchedBefore") {
            UserDefaults.standard.set(true, forKey: pushNotificationKey)
            UserDefaults.standard.set(true, forKey: locationNotificationKey)
            UserDefaults.standard.set(true, forKey: "hasLaunchedBefore")
            
            pushNotificationSwitch.isOn = true
            locationNotificationSwitch.isOn = true
        } else {
            pushNotificationSwitch.isOn = isPushEnabled
            locationNotificationSwitch.isOn = isLocationEnabled
        }
        
        // 전체 알림이 꺼져있으면 하위 알림 비활성화
        locationNotificationSwitch.isEnabled = isPushEnabled
    }
    
    private func saveSettings() {
        UserDefaults.standard.set(pushNotificationSwitch.isOn, forKey: pushNotificationKey)
        UserDefaults.standard.set(locationNotificationSwitch.isOn, forKey: locationNotificationKey)
        UserDefaults.standard.synchronize()
        
        print("✅ 알림 설정 저장 완료:")
        print("   - 푸시 알림: \(pushNotificationSwitch.isOn)")
        print("   - 위치 알림: \(locationNotificationSwitch.isOn)")
    }
    
    // MARK: - Notification Permission
    private func checkNotificationPermission() {
        UNUserNotificationCenter.current().getNotificationSettings { settings in
            DispatchQueue.main.async {
                switch settings.authorizationStatus {
                case .authorized, .provisional:
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
        // 권한이 거부된 경우 모든 스위치를 OFF로 설정하고 비활성화
        pushNotificationSwitch.isOn = false
        locationNotificationSwitch.isOn = false
        pushNotificationSwitch.isEnabled = false
        locationNotificationSwitch.isEnabled = false
    }
    
    private func requestNotificationPermission() {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound]) { granted, error in
            DispatchQueue.main.async {
                if granted {
                    print("✅ 알림 권한 허용됨")
                    UIApplication.shared.registerForRemoteNotifications()
                } else {
                    print("❌ 알림 권한 거부됨")
                    self.pushNotificationSwitch.isOn = false
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
        // 먼저 로컬 설정으로 UI 초기화
        loadSettings()
        
        // FCM 토큰 가져오기
        Messaging.messaging().token { [weak self] (token: String?, error: Error?) in
            if let error = error {
                print("❌ FCM 토큰 가져오기 실패: \(error)")
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
    
    private func fetchNotificationSettings(token: String) {
        guard let url = URL(string: "\(baseURL)/api/fcm/tokens") else {
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
                
                guard let data = data else {
                    print("❌ 응답 데이터 없음")
                    return
                }
                
                do {
                    if let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
                       let tokens = json["tokens"] as? [[String: Any]] {
                        print("📱 서버에서 받은 토큰 목록: \(json)")
                        
                        // 현재 토큰에 해당하는 설정 찾기
                        var notificationEnabled = true
                        var locationNotificationEnabled = true
                        
                        for tokenData in tokens {
                            if let tokenValue = tokenData["token"] as? String, tokenValue == token {
                                notificationEnabled = tokenData["notificationEnabled"] as? Bool ?? true
                                locationNotificationEnabled = tokenData["locationNotificationEnabled"] as? Bool ?? true
                                break
                            }
                        }
                        
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
        Messaging.messaging().token { [weak self] (token: String?, error: Error?) in
            if let error = error {
                print("❌ FCM 토큰 가져오기 실패: \(error)")
                self?.showErrorAlert(message: "FCM 토큰을 가져올 수 없습니다.")
                return
            }
            
            guard let token = token else {
                print("❌ FCM 토큰이 nil")
                self?.showErrorAlert(message: "FCM 토큰이 없습니다.")
                return
            }
            
            self?.updateNotificationSettingsOnServer(token: token)
        }
    }
    
    private func updateNotificationSettingsOnServer(token: String) {
        guard let url = URL(string: "\(baseURL)/api/fcm/token/\(token)") else {
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
                    self?.showErrorAlert(message: "서버 통신에 실패했습니다.")
                    return
                }
                
                if let httpResponse = response as? HTTPURLResponse {
                    print("📱 서버 응답 코드: \(httpResponse.statusCode)")
                    
                    if httpResponse.statusCode == 200 || httpResponse.statusCode == 201 {
                        // 성공
                        self?.saveSettings() // 로컬에도 저장
                        self?.showSuccessAlert()
                    } else {
                        print("❌ 서버 오류: \(httpResponse.statusCode)")
                        self?.showErrorAlert(message: "서버에서 오류가 발생했습니다.")
                    }
                }
            }
        }.resume()
    }
    
    private func showSuccessAlert() {
        let alert = UIAlertController(
            title: "저장 완료",
            message: "알림 설정이 저장되었습니다.",
            preferredStyle: .alert
        )
        alert.addAction(UIAlertAction(title: "확인", style: .default) { [weak self] _ in
            // 네비게이션 바 숨기기
            self?.navigationController?.setNavigationBarHidden(true, animated: true)
            self?.navigationController?.popViewController(animated: true)
        })
        present(alert, animated: true)
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

