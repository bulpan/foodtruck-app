import UIKit

class LoadingView: UIView {
    
    private let activityIndicator = UIActivityIndicatorView(style: .large)
    private let appIconImageView = UIImageView()
    private let appNameLabel = UILabel()
    private let loadingMessageLabel = UILabel()
    
    override init(frame: CGRect) {
        super.init(frame: frame)
        setupUI()
    }
    
    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setupUI()
    }
    
    private func setupUI() {
        backgroundColor = UIColor(red: 255/255, green: 255/255, blue: 240/255, alpha: 1.0) // 아이보리 색상
        
        setupAppIcon()
        setupConstraints()
    }
    
    private func setupActivityIndicator() {
        activityIndicator.color = UIColor(red: 101/255, green: 67/255, blue: 33/255, alpha: 1.0) // 다크 브라운 색상
        activityIndicator.translatesAutoresizingMaskIntoConstraints = false
        addSubview(activityIndicator)
        activityIndicator.startAnimating()
    }
    
    private func setupAppIcon() {
        // Assets의 앱 아이콘 사용
        if let appIcon = UIImage(named: "icon") {
            appIconImageView.image = appIcon
        } else {
            // 앱 아이콘이 없으면 기본 아이콘 사용
            appIconImageView.image = UIImage(systemName: "fork.knife")
            appIconImageView.tintColor = UIColor(red: 101/255, green: 67/255, blue: 33/255, alpha: 1.0)
        }
        appIconImageView.contentMode = .scaleAspectFit
        appIconImageView.translatesAutoresizingMaskIntoConstraints = false
        addSubview(appIconImageView)
    }
    
    private func setupAppName() {
        appNameLabel.text = "세종유미곱창트럭"
        appNameLabel.font = UIFont.systemFont(ofSize: 20, weight: .bold)
        appNameLabel.textColor = UIColor(red: 101/255, green: 67/255, blue: 33/255, alpha: 1.0)
        appNameLabel.textAlignment = .center
        appNameLabel.translatesAutoresizingMaskIntoConstraints = false
        addSubview(appNameLabel)
    }
    
    private func setupLoadingMessage() {
        loadingMessageLabel.text = "잠시만 기다려주세요..."
        loadingMessageLabel.font = UIFont.systemFont(ofSize: 16, weight: .medium)
        loadingMessageLabel.textColor = UIColor(red: 101/255, green: 67/255, blue: 33/255, alpha: 0.8)
        loadingMessageLabel.textAlignment = .center
        loadingMessageLabel.translatesAutoresizingMaskIntoConstraints = false
        addSubview(loadingMessageLabel)
    }
    
    private func setupConstraints() {
        NSLayoutConstraint.activate([
            // App Icon - 화면 중앙에 배치
            appIconImageView.centerXAnchor.constraint(equalTo: centerXAnchor),
            appIconImageView.centerYAnchor.constraint(equalTo: centerYAnchor),
            appIconImageView.widthAnchor.constraint(equalToConstant: 120),
            appIconImageView.heightAnchor.constraint(equalToConstant: 120)
        ])
    }
}





