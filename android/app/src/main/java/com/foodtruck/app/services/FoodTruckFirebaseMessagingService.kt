package com.foodtruck.app.services

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import com.google.firebase.messaging.FirebaseMessaging
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import com.foodtruck.app.MainActivity
import com.foodtruck.app.R

class FoodTruckFirebaseMessagingService : FirebaseMessagingService() {
    
    companion object {
        private const val TAG = "FoodTruckFCM"
        private const val CHANNEL_ID = "foodtruck_notifications"
        private const val CHANNEL_NAME = "푸드트럭 알림"
        private const val CHANNEL_DESCRIPTION = "푸드트럭의 메뉴, 위치 정보 알림"
        private const val NOTIFICATION_ID = 1001
    }
    
    override fun onCreate() {
        super.onCreate()
        // Firebase 자동 초기화 활성화
        FirebaseMessaging.getInstance().isAutoInitEnabled = true
        // 알림 채널 생성
        createNotificationChannel()
    }
    
    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        super.onMessageReceived(remoteMessage)
        
        Log.d(TAG, "=== FCM 메시지 수신 ===")
        Log.d(TAG, "From: ${remoteMessage.from}")
        Log.d(TAG, "Message ID: ${remoteMessage.messageId}")
        Log.d(TAG, "Message Type: ${remoteMessage.messageType}")
        Log.d(TAG, "To: ${remoteMessage.to}")
        
        // 데이터 페이로드 확인
        if (remoteMessage.data.isNotEmpty()) {
            Log.d(TAG, "Message data payload: ${remoteMessage.data}")
            
            val screen = remoteMessage.data["screen"]
            val menuId = remoteMessage.data["menuId"]
            val message = remoteMessage.data["message"]
            
            // 알림 처리 로직
            handleNotificationData(screen, menuId, message)
        }
        
        // 알림 페이로드 확인
        remoteMessage.notification?.let { notification ->
            Log.d(TAG, "=== 알림 페이로드 정보 ===")
            Log.d(TAG, "Notification Title: ${notification.title}")
            Log.d(TAG, "Notification Body: ${notification.body}")
            Log.d(TAG, "Notification Icon: ${notification.icon}")
            Log.d(TAG, "Notification Color: ${notification.color}")
            Log.d(TAG, "Notification Sound: ${notification.sound}")
            Log.d(TAG, "Notification Tag: ${notification.tag}")
            Log.d(TAG, "Notification Click Action: ${notification.clickAction}")
            
            // 알림 표시 로직
            showNotification(notification.title ?: "푸드트럭 알림", notification.body ?: "")
        } ?: run {
            Log.w(TAG, "알림 페이로드가 없습니다. 데이터 메시지만 있습니다.")
        }
    }
    
    override fun onNewToken(token: String) {
        super.onNewToken(token)
        Log.d(TAG, "Refreshed token: $token")
        
        // 새로운 토큰을 서버에 등록
        sendRegistrationToServer(token)
    }
    
    private fun sendRegistrationToServer(token: String) {
        // ViewModel을 통해 토큰 등록
        // 실제 구현에서는 Application 클래스나 Repository를 통해 처리
        Log.d(TAG, "Sending token to server: $token")
    }
    
    private fun handleNotificationData(screen: String?, menuId: String?, message: String?) {
        when (screen) {
            "menu" -> {
                Log.d(TAG, "Navigate to menu screen")
                // 메뉴 화면으로 이동
            }
            "location" -> {
                Log.d(TAG, "Navigate to location screen")
                // 위치 화면으로 이동
            }
            "notification" -> {
                Log.d(TAG, "Navigate to notification screen")
                // 알림 설정 화면으로 이동
            }
        }
        
        menuId?.let {
            Log.d(TAG, "Menu ID: $it")
            // 특정 메뉴 정보 표시
        }
        
        message?.let {
            Log.d(TAG, "Custom message: $it")
            // 커스텀 메시지 처리
        }
    }
    
    private fun showNotification(title: String, body: String) {
        Log.d(TAG, "=== 알림 표시 시작 ===")
        Log.d(TAG, "Title: $title")
        Log.d(TAG, "Body: $body")
        
        // 알림 채널 생성 (Android 8.0 이상)
        createNotificationChannel()
        
        // 알림 클릭 시 MainActivity로 이동하는 Intent
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        }
        
        val pendingIntent = PendingIntent.getActivity(
            this, 
            0, 
            intent, 
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        
        // 알림 빌더 생성
        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(title)
            .setContentText(body)
            .setSmallIcon(R.drawable.icon_notification)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_MAX) // 최고 우선순위
            .setDefaults(NotificationCompat.DEFAULT_ALL)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setCategory(NotificationCompat.CATEGORY_MESSAGE)
            .setFullScreenIntent(pendingIntent, false)
            .setOngoing(false)
            .setOnlyAlertOnce(false)
            .setSound(android.provider.Settings.System.DEFAULT_NOTIFICATION_URI) // 소리 강제 설정
            .setVibrate(longArrayOf(0, 1000, 500, 1000)) // 진동 강제 설정
            .setLights(android.graphics.Color.BLUE, 1000, 500) // LED 강제 설정
            .setWhen(System.currentTimeMillis())
            .setShowWhen(true)
            .setTimeoutAfter(10000) // 10초 후 자동 제거 (기본값보다 길게)
            .setUsesChronometer(false) // 시간 표시 방식
            .build()
        
        // 알림 표시
        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.notify(NOTIFICATION_ID, notification)
        
        Log.d(TAG, "=== 알림 표시 완료 ===")
        Log.d(TAG, "Notification ID: $NOTIFICATION_ID")
        Log.d(TAG, "Channel ID: $CHANNEL_ID")
    }
    
    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            
            // 기존 채널 삭제 (있다면)
            notificationManager.deleteNotificationChannel(CHANNEL_ID)
            
            val channel = NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_MAX  // 최고 중요도로 변경
            ).apply {
                description = CHANNEL_DESCRIPTION
                enableLights(true)
                enableVibration(true)
                setShowBadge(true)
                lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
                
                // 상단 표시를 위한 추가 설정
                setBypassDnd(true) // 방해 금지 모드 우회
                setSound(android.provider.Settings.System.DEFAULT_NOTIFICATION_URI, null)
                vibrationPattern = longArrayOf(0, 1000, 500, 1000)
            }
            
            notificationManager.createNotificationChannel(channel)
            
            Log.d(TAG, "Notification channel created: $CHANNEL_ID with bypass DND")
        }
    }
}


