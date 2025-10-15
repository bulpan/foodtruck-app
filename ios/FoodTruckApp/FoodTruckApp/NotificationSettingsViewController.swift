import UIKit
import UserNotifications

class NotificationSettingsViewController: UIViewController {
    
    // MARK: - Properties
    private var scrollView: UIScrollView!
    private var contentView: UIView!
    
    private var pushNotificationSwitch: UISwitch!
    private var menuNotificationSwitch: UISwitch!
    private var locationNotificationSwitch: UISwitch!
    
    // UserDefaults 키
    private let pushNotificationKey = "isPushNotificationEnabled"
    private let menuNotificationKey = "isMenuNotificationEnabled"
    private let locationNotificationKey = "isLocationNotificationEnabled"
    
    // MARK: - Lifecycle
    override func viewDidLoad() {
        super.viewDidLoad()
        setupUI()
        loadSettings()
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
        
        // 배경색 설정
        navigationController?.navigationBar.backgroundColor = UIColor(red: 254/255, green: 198/255, blue: 80/255, alpha: 1.0)
        navigationController?.navigationBar.barTintColor = UIColor(red: 254/255, green: 198/255, blue: 80/255, alpha: 1.0)
        navigationController?.navigationBar.tintColor = UIColor(red: 101/255, green: 67/255, blue: 33/255, alpha: 1.0)
        
        // 타이틀 색상 설정
        navigationController?.navigationBar.titleTextAttributes = [
            .foregroundColor: UIColor(red: 101/255, green: 67/255, blue: 33/255, alpha: 1.0)
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
        
        // 메뉴 알림 설정
        let menuNotificationCard = createSettingCard(
            title: "메뉴 알림",
            subtitle: "새로운 메뉴 등록 알림",
            switchAction: #selector(menuNotificationChanged(_:))
        )
        menuNotificationSwitch = menuNotificationCard.1
        stackView.addArrangedSubview(menuNotificationCard.0)
        
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
        
        // 네비게이션 바 숨기기
        navigationController?.setNavigationBarHidden(true, animated: true)
        
        navigationController?.popViewController(animated: true)
    }
    
    @objc private func pushNotificationChanged(_ sender: UISwitch) {
        print("🔔 전체 푸시 알림 변경: \(sender.isOn)")
        
        if sender.isOn {
            // 알림 권한 요청
            requestNotificationPermission()
        }
        
        // 전체 알림이 꺼지면 하위 알림도 비활성화
        if !sender.isOn {
            menuNotificationSwitch.isEnabled = false
            locationNotificationSwitch.isEnabled = false
        } else {
            menuNotificationSwitch.isEnabled = true
            locationNotificationSwitch.isEnabled = true
        }
    }
    
    @objc private func menuNotificationChanged(_ sender: UISwitch) {
        print("🍔 메뉴 알림 변경: \(sender.isOn)")
    }
    
    @objc private func locationNotificationChanged(_ sender: UISwitch) {
        print("📍 위치 알림 변경: \(sender.isOn)")
    }
    
    @objc private func saveButtonTapped() {
        print("💾 알림 설정 저장")
        
        // UserDefaults에 설정 저장
        saveSettings()
        
        // 성공 알림
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
    
    // MARK: - Settings Management
    private func loadSettings() {
        let isPushEnabled = UserDefaults.standard.bool(forKey: pushNotificationKey)
        let isMenuEnabled = UserDefaults.standard.bool(forKey: menuNotificationKey)
        let isLocationEnabled = UserDefaults.standard.bool(forKey: locationNotificationKey)
        
        // 처음 실행 시 기본값 설정
        if !UserDefaults.standard.bool(forKey: "hasLaunchedBefore") {
            UserDefaults.standard.set(true, forKey: pushNotificationKey)
            UserDefaults.standard.set(true, forKey: menuNotificationKey)
            UserDefaults.standard.set(true, forKey: locationNotificationKey)
            UserDefaults.standard.set(true, forKey: "hasLaunchedBefore")
            
            pushNotificationSwitch.isOn = true
            menuNotificationSwitch.isOn = true
            locationNotificationSwitch.isOn = true
        } else {
            pushNotificationSwitch.isOn = isPushEnabled
            menuNotificationSwitch.isOn = isMenuEnabled
            locationNotificationSwitch.isOn = isLocationEnabled
        }
        
        // 전체 알림이 꺼져있으면 하위 알림 비활성화
        menuNotificationSwitch.isEnabled = isPushEnabled
        locationNotificationSwitch.isEnabled = isPushEnabled
    }
    
    private func saveSettings() {
        UserDefaults.standard.set(pushNotificationSwitch.isOn, forKey: pushNotificationKey)
        UserDefaults.standard.set(menuNotificationSwitch.isOn, forKey: menuNotificationKey)
        UserDefaults.standard.set(locationNotificationSwitch.isOn, forKey: locationNotificationKey)
        UserDefaults.standard.synchronize()
        
        print("✅ 알림 설정 저장 완료:")
        print("   - 푸시 알림: \(pushNotificationSwitch.isOn)")
        print("   - 메뉴 알림: \(menuNotificationSwitch.isOn)")
        print("   - 위치 알림: \(locationNotificationSwitch.isOn)")
    }
    
    // MARK: - Notification Permission
    private func checkNotificationPermission() {
        UNUserNotificationCenter.current().getNotificationSettings { settings in
            DispatchQueue.main.async {
                switch settings.authorizationStatus {
                case .authorized, .provisional:
                    print("✅ 알림 권한 허용됨")
                case .denied:
                    print("❌ 알림 권한 거부됨")
                    self.showPermissionDeniedAlert()
                case .notDetermined:
                    print("⚠️ 알림 권한 미결정")
                @unknown default:
                    break
                }
            }
        }
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
            title: "알림 권한 필요",
            message: "푸시 알림을 받으려면 설정에서 알림 권한을 허용해주세요.",
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
}

