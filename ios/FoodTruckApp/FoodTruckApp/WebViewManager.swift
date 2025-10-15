import Foundation
import WebKit

class WebViewManager: NSObject {
    
    // MARK: - Properties
    private let baseURL = "http://localhost:3002/mobile/"
    private var currentURL: String = ""
    
    // MARK: - Initialization
    override init() {
        super.init()
        currentURL = baseURL
    }
    
    // MARK: - URL Management
    func getCurrentURL() -> URL? {
        return URL(string: currentURL)
    }
    
    func updateURL(for screen: String) {
        currentURL = baseURL + "#" + screen
    }
    
    // MARK: - WebView Configuration
    func createWebViewConfiguration() -> WKWebViewConfiguration {
        let config = WKWebViewConfiguration()
        
        // 기본 설정
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        config.preferences.javaScriptEnabled = true
        config.preferences.javaScriptCanOpenWindowsAutomatically = false
        
        // 사용자 설정
        if #available(iOS 14.0, *) {
            config.defaultWebpagePreferences.allowsContentJavaScript = true
        }
        
        return config
    }
    
    // MARK: - JavaScript Bridge
    func setupJavaScriptBridge(config: WKWebViewConfiguration) {
        let contentController = config.userContentController
        
        // 네이티브 인터페이스 추가
        contentController.add(self, name: "sendMessage")
        contentController.add(self, name: "requestLocation")
        contentController.add(self, name: "shareContent")
        contentController.add(self, name: "copyToClipboard")
    }
    
    // MARK: - Script Injection
    func injectNativeScripts() -> String {
        return """
        (function() {
            'use strict';
            
            // 네이티브 인터페이스 객체 생성
            window.NativeApp = {
                // 메시지 전송
                sendMessage: function(message) {
                    window.webkit.messageHandlers.sendMessage.postMessage(message);
                },
                
                // 위치 요청
                requestLocation: function() {
                    window.webkit.messageHandlers.requestLocation.postMessage({});
                },
                
                // 콘텐츠 공유
                shareContent: function(title, text, url) {
                    window.webkit.messageHandlers.shareContent.postMessage({
                        title: title,
                        text: text,
                        url: url
                    });
                },
                
                // 클립보드 복사
                copyToClipboard: function(text) {
                    window.webkit.messageHandlers.copyToClipboard.postMessage({
                        text: text
                    });
                },
                
                // 햅틱 피드백
                hapticFeedback: function(type) {
                    console.log('Haptic feedback:', type);
                },
                
                // 앱 정보
                getAppInfo: function() {
                    return {
                        platform: 'ios',
                        version: '1.0.0',
                        buildNumber: '1'
                    };
                }
            };
            
            console.log('Native app interface loaded');
        })();
        """
    }
    
    // MARK: - Web Content Management
    func createWebContentHTML() -> String {
        return """
        <!DOCTYPE html>
        <html lang="ko">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
            <title>Food Truck App</title>
            <style>
                body {
                    margin: 0;
                    padding: 0;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                }
                .loading-container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    height: 100vh;
                    background-color: #f8f9fa;
                }
                .loading-spinner {
                    width: 40px;
                    height: 40px;
                    border: 4px solid #f3f3f3;
                    border-top: 4px solid #007AFF;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                .loading-text {
                    margin-top: 16px;
                    color: #666;
                    font-size: 16px;
                }
            </style>
        </head>
        <body>
            <div class="loading-container">
                <div class="loading-spinner"></div>
                <div class="loading-text">앱을 불러오는 중...</div>
            </div>
            
            <script>
                (function() {
                    setTimeout(function() {
                        window.location.href = '\(baseURL)';
                    }, 1000);
                })();
            </script>
        </body>
        </html>
        """
    }
}

// MARK: - WKScriptMessageHandler
extension WebViewManager: WKScriptMessageHandler {
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        switch message.name {
        case "sendMessage":
            handleSendMessage(message.body)
            
        case "requestLocation":
            handleLocationRequest()
            
        case "shareContent":
            handleShareContent(message.body)
            
        case "copyToClipboard":
            handleCopyToClipboard(message.body)
            
        default:
            print("Unknown message received: \(message.name)")
        }
    }
    
    private func handleSendMessage(_ body: Any) {
        // 메시지 처리 로직
        print("Received message: \(body)")
    }
    
    private func handleLocationRequest() {
        // 위치 요청 처리
        NotificationCenter.default.post(
            name: NSNotification.Name("LocationRequested"),
            object: nil
        )
    }
    
    private func handleShareContent(_ body: Any) {
        // 공유 콘텐츠 처리
        guard let messageData = body as? [String: Any],
              let title = messageData["title"] as? String,
              let text = messageData["text"] as? String else { return }
        
        NotificationCenter.default.post(
            name: NSNotification.Name("ShareContent"),
            object: nil,
            userInfo: ["title": title, "message": text]
        )
    }
    
    private func handleCopyToClipboard(_ body: Any) {
        // 클립보드 복사 처리
        guard let messageData = body as? [String: Any],
              let text = messageData["text"] as? String else { return }
        
        DispatchQueue.main.async {
            UIPasteboard.general.string = text
            
            // 복사 완료 알림
            NotificationCenter.default.post(
                name: NSNotification.Name("TextCopied"),
                object: nil,
                userInfo: ["text": text]
            )
        }
    }
}




