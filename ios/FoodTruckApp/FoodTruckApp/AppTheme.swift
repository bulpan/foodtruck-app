import UIKit

struct AppTheme {
    
    // MARK: - Colors
    struct Colors {
        // 앱 테마 색상 (RGB: 254, 198, 80)
        static let primary = UIColor(red: 254/255, green: 198/255, blue: 80/255, alpha: 1.0)
        
        // 다크 브라운 색상 (RGB: 101, 67, 33)
        static let accent = UIColor(red: 101/255, green: 67/255, blue: 33/255, alpha: 1.0)
        
        // 반투명 다크 브라운 색상
        static let accentLight = UIColor(red: 101/255, green: 67/255, blue: 33/255, alpha: 0.6)
        
        // 배경 색상
        static let background = UIColor.systemBackground
        
        // 텍스트 색상
        static let textPrimary = UIColor.label
        static let textSecondary = UIColor.secondaryLabel
        
        // 네비게이션 색상
        static let navigationBackground = primary
        static let navigationText = accent
        static let navigationTextSelected = accent
        static let navigationTextUnselected = accentLight
    }
    
    // MARK: - Fonts
    struct Fonts {
        static let largeTitle = UIFont.systemFont(ofSize: 34, weight: .bold)
        static let title1 = UIFont.systemFont(ofSize: 28, weight: .bold)
        static let title2 = UIFont.systemFont(ofSize: 22, weight: .bold)
        static let title3 = UIFont.systemFont(ofSize: 20, weight: .semibold)
        static let headline = UIFont.systemFont(ofSize: 17, weight: .semibold)
        static let body = UIFont.systemFont(ofSize: 17, weight: .regular)
        static let callout = UIFont.systemFont(ofSize: 16, weight: .regular)
        static let subhead = UIFont.systemFont(ofSize: 15, weight: .regular)
        static let footnote = UIFont.systemFont(ofSize: 13, weight: .regular)
        static let caption1 = UIFont.systemFont(ofSize: 12, weight: .regular)
        static let caption2 = UIFont.systemFont(ofSize: 11, weight: .regular)
        
        // 네비게이션 폰트
        static let navigationTitle = UIFont.systemFont(ofSize: 12, weight: .medium)
    }
    
    // MARK: - Spacing
    struct Spacing {
        static let xs: CGFloat = 4
        static let sm: CGFloat = 8
        static let md: CGFloat = 16
        static let lg: CGFloat = 24
        static let xl: CGFloat = 32
        static let xxl: CGFloat = 48
    }
    
    // MARK: - Corner Radius
    struct CornerRadius {
        static let small: CGFloat = 8
        static let medium: CGFloat = 12
        static let large: CGFloat = 16
        static let extraLarge: CGFloat = 24
    }
    
    // MARK: - Shadows
    struct Shadows {
        static let small = CGSize(width: 0, height: 1)
        static let medium = CGSize(width: 0, height: 2)
        static let large = CGSize(width: 0, height: 4)
        
        static let smallOpacity: Float = 0.1
        static let mediumOpacity: Float = 0.15
        static let largeOpacity: Float = 0.2
    }
    
    // MARK: - Animation
    struct Animation {
        static let fast: TimeInterval = 0.2
        static let medium: TimeInterval = 0.3
        static let slow: TimeInterval = 0.5
        
        static let springDamping: CGFloat = 0.8
        static let springVelocity: CGFloat = 0.5
    }
}

// MARK: - UIColor Extension
extension UIColor {
    static let appPrimary = AppTheme.Colors.primary
    static let appAccentColor = AppTheme.Colors.accent
    static let appAccentLight = AppTheme.Colors.accentLight
    static let appNavigationBackground = AppTheme.Colors.navigationBackground
    static let appNavigationText = AppTheme.Colors.navigationText
    static let appNavigationTextSelected = AppTheme.Colors.navigationTextSelected
    static let appNavigationTextUnselected = AppTheme.Colors.navigationTextUnselected
}

// MARK: - UIFont Extension
extension UIFont {
    static let appLargeTitle = AppTheme.Fonts.largeTitle
    static let appTitle1 = AppTheme.Fonts.title1
    static let appTitle2 = AppTheme.Fonts.title2
    static let appTitle3 = AppTheme.Fonts.title3
    static let appHeadline = AppTheme.Fonts.headline
    static let appBody = AppTheme.Fonts.body
    static let appCallout = AppTheme.Fonts.callout
    static let appSubhead = AppTheme.Fonts.subhead
    static let appFootnote = AppTheme.Fonts.footnote
    static let appCaption1 = AppTheme.Fonts.caption1
    static let appCaption2 = AppTheme.Fonts.caption2
    static let appNavigationTitle = AppTheme.Fonts.navigationTitle
}





