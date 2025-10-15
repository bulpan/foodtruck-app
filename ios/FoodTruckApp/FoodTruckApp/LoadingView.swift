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
        backgroundColor = UIColor(red: 254/255, green: 198/255, blue: 80/255, alpha: 1.0) // 앱 테마 색상
        
        setupActivityIndicator()
        setupAppIcon()
        setupAppName()
        setupLoadingMessage()
        setupConstraints()
    }
    
    private func setupActivityIndicator() {
        activityIndicator.color = UIColor(red: 101/255, green: 67/255, blue: 33/255, alpha: 1.0) // 다크 브라운 색상
        activityIndicator.translatesAutoresizingMaskIntoConstraints = false
        addSubview(activityIndicator)
        activityIndicator.startAnimating()
    }
    
    private func setupAppIcon() {
        // 기본 시스템 아이콘 사용 (실제 앱에서는 앱 아이콘 사용)
        appIconImageView.image = UIImage(systemName: "fork.knife")
        appIconImageView.tintColor = UIColor(red: 101/255, green: 67/255, blue: 33/255, alpha: 1.0)
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
            // Activity Indicator
            activityIndicator.centerXAnchor.constraint(equalTo: centerXAnchor),
            activityIndicator.centerYAnchor.constraint(equalTo: centerYAnchor, constant: -40),
            activityIndicator.widthAnchor.constraint(equalToConstant: 60),
            activityIndicator.heightAnchor.constraint(equalToConstant: 60),
            
            // App Icon
            appIconImageView.centerXAnchor.constraint(equalTo: centerXAnchor),
            appIconImageView.topAnchor.constraint(equalTo: activityIndicator.bottomAnchor, constant: 24),
            appIconImageView.widthAnchor.constraint(equalToConstant: 80),
            appIconImageView.heightAnchor.constraint(equalToConstant: 80),
            
            // App Name
            appNameLabel.centerXAnchor.constraint(equalTo: centerXAnchor),
            appNameLabel.topAnchor.constraint(equalTo: appIconImageView.bottomAnchor, constant: 16),
            appNameLabel.leadingAnchor.constraint(greaterThanOrEqualTo: leadingAnchor, constant: 20),
            appNameLabel.trailingAnchor.constraint(lessThanOrEqualTo: trailingAnchor, constant: -20),
            
            // Loading Message
            loadingMessageLabel.centerXAnchor.constraint(equalTo: centerXAnchor),
            loadingMessageLabel.topAnchor.constraint(equalTo: appNameLabel.bottomAnchor, constant: 8),
            loadingMessageLabel.leadingAnchor.constraint(greaterThanOrEqualTo: leadingAnchor, constant: 20),
            loadingMessageLabel.trailingAnchor.constraint(lessThanOrEqualTo: trailingAnchor, constant: -20)
        ])
    }
}





