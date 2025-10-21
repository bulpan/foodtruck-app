import UIKit

protocol BottomNavigationViewDelegate: AnyObject {
    func didSelectScreen(_ screen: String)
}

class BottomNavigationView: UIView {
    
    // MARK: - Properties
    weak var delegate: BottomNavigationViewDelegate?
    private var navigationItems: [NavigationItem] = []
    private var stackView: UIStackView!
    
    private let itemFontSize: CGFloat = 16
    private let iconSize: CGFloat = 24
    private let itemHeight: CGFloat = 60
    
    // MARK: - Initialization
    override init(frame: CGRect) {
        super.init(frame: frame)
        setupUI()
        setupNavigationItems()
        
        // 터치 이벤트 활성화
        self.isUserInteractionEnabled = true
    }
    
    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setupUI()
        setupNavigationItems()
    }
    
    // MARK: - UI Setup
    private func setupUI() {
        backgroundColor = UIColor(red: 254/255, green: 198/255, blue: 80/255, alpha: 1.0) // 앱 테마 색상
        layer.cornerRadius = 24
        layer.maskedCorners = [.layerMinXMinYCorner, .layerMaxXMinYCorner]
        layer.shadowColor = UIColor.black.cgColor
        layer.shadowOffset = CGSize(width: 0, height: -2)
        layer.shadowOpacity = 0.1
        layer.shadowRadius = 8
        
        // 스택뷰 설정
        stackView = UIStackView()
        stackView.axis = .horizontal
        stackView.distribution = .fillEqually
        stackView.alignment = .center
        stackView.spacing = 8  // 버튼 간 간격 추가
        stackView.isUserInteractionEnabled = true  // 스택뷰 터치 활성화
        
        addSubview(stackView)
        
        stackView.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            stackView.topAnchor.constraint(equalTo: topAnchor, constant: 8),
            stackView.leadingAnchor.constraint(equalTo: leadingAnchor),
            stackView.trailingAnchor.constraint(equalTo: trailingAnchor),
            stackView.bottomAnchor.constraint(equalTo: bottomAnchor, constant: -8)
        ])
    }
    
    private func setupNavigationItems() {
        navigationItems = [
            NavigationItem(
                screen: "home",
                title: "Home"
            ),
            NavigationItem(
                screen: "notification",
                title: "알림설정"
            )
        ]
        
        createNavigationButtons()
    }
    
    private func createNavigationButtons() {
        // 기존 버튼들 제거
        stackView.arrangedSubviews.forEach { view in
            stackView.removeArrangedSubview(view)
            view.removeFromSuperview()
        }
        
        for (index, item) in navigationItems.enumerated() {
            let button = createNavigationButton(for: item)
            button.tag = index
            
            // 터치 이벤트 활성화 확인
            button.isUserInteractionEnabled = true
            print("✅ 버튼 \(index) 생성 완료 - isUserInteractionEnabled: \(button.isUserInteractionEnabled)")
            
            stackView.addArrangedSubview(button)
        }
    }
    
    private func createNavigationButton(for item: NavigationItem) -> UIButton {
        let button = UIButton(type: .custom)
        button.backgroundColor = UIColor.clear
        button.isUserInteractionEnabled = true
        
        // 버튼 기본 설정
        
        // 버튼 설정 - 이미지 제거하고 텍스트만 사용
        button.setTitle(item.title, for: .normal)
        button.setTitleColor(UIColor(red: 101/255, green: 67/255, blue: 33/255, alpha: 0.6), for: .normal)
        button.setTitleColor(UIColor(red: 101/255, green: 67/255, blue: 33/255, alpha: 1.0), for: .selected)
        
        // 폰트 설정 - Dynamic Type 대응
        button.titleLabel?.font = UIFont.systemFont(ofSize: itemFontSize, weight: .medium)
        button.titleLabel?.textAlignment = .center
        button.titleLabel?.numberOfLines = 1
        button.titleLabel?.adjustsFontSizeToFitWidth = true
        button.titleLabel?.minimumScaleFactor = 0.8
        
        // 버튼 액션 추가 - 여러 터치 이벤트 지원
        button.addTarget(self, action: #selector(buttonTapped(_:)), for: .touchUpInside)
        button.addTarget(self, action: #selector(buttonTapped(_:)), for: .touchDown)
        
        // 최소 크기 설정 (터치 영역 확보)
        button.translatesAutoresizingMaskIntoConstraints = false
        button.heightAnchor.constraint(greaterThanOrEqualToConstant: 50).isActive = true
        button.widthAnchor.constraint(greaterThanOrEqualToConstant: 100).isActive = true
        
        // 터치 영역 확장
        button.contentEdgeInsets = UIEdgeInsets(top: 12, left: 16, bottom: 12, right: 16)
        
        // 초기 선택 상태 설정
        button.isSelected = (item.screen == "home")
        updateButtonAppearance(button, item: item, isSelected: button.isSelected)
        
        return button
    }
    
    // MARK: - Actions
    @objc private func buttonTapped(_ sender: UIButton) {
        print("🔘 버튼 터치 이벤트 감지됨!")
        print("🔘 버튼 태그: \(sender.tag)")
        print("🔘 버튼 제목: \(sender.titleLabel?.text ?? "nil")")
        
        guard sender.tag < navigationItems.count else {
            print("❌ 터치 처리 실패: 잘못된 태그 \(sender.tag)")
            return
        }
        
        let item = navigationItems[sender.tag]
        print("✅ 버튼 터치됨: \(item.screen) - \(item.title)")
        
        selectScreen(item.screen)
    }
    
    private func selectScreen(_ screen: String) {
        // 모든 아이템을 비선택 상태로 변경
        for i in 0..<navigationItems.count {
            navigationItems[i].isSelected = false
        }
        
        // 선택된 아이템 찾기
        if let selectedIndex = navigationItems.firstIndex(where: { $0.screen == screen }) {
            navigationItems[selectedIndex].isSelected = true
            updateAllButtonsAppearance()
            delegate?.didSelectScreen(screen)
        }
    }
    
    // MARK: - UI Updates
    private func updateAllButtonsAppearance() {
        stackView.subviews.enumerated().forEach { index, button in
            if let uiButton = button as? UIButton, index < navigationItems.count {
                updateButtonAppearance(uiButton, item: navigationItems[index])
            }
        }
    }
    
    private func updateButtonAppearance(_ button: UIButton, item: NavigationItem, isSelected: Bool? = nil) {
        let selected = isSelected ?? item.isSelected
        button.isSelected = selected
        
        if selected {
            // 선택된 상태 애니메이션 - 텍스트만 사용
            UIView.animate(withDuration: 0.2) {
                button.titleLabel?.transform = CGAffineTransform(scaleX: 1.1, y: 1.1)
            } completion: { _ in
                UIView.animate(withDuration: 0.1) {
                    button.titleLabel?.transform = .identity
                }
            }
        } else {
            button.titleLabel?.transform = .identity
        }
    }
    
    // MARK: - Public Methods
    func setSelectedScreen(_ screen: String) {
        selectScreen(screen)
    }
    
    // MARK: - Touch Event Debugging
    override func hitTest(_ point: CGPoint, with event: UIEvent?) -> UIView? {
        let hitView = super.hitTest(point, with: event)
        print("🎯 hitTest 호출됨 - point: \(point), hitView: \(type(of: hitView))")
        return hitView
    }
    
    override func point(inside point: CGPoint, with event: UIEvent?) -> Bool {
        let isInside = super.point(inside: point, with: event)
        print("📍 point(inside:) 호출됨 - point: \(point), isInside: \(isInside)")
        return isInside
    }
}

// MARK: - NavigationItem Model
private struct NavigationItem {
    let screen: String
    let title: String
    var isSelected: Bool = false
}




