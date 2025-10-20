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
        
        // FCM 자동 알림을 무시하고 우리가 직접 알림 생성
        // 데이터 페이로드 확인
        if (remoteMessage.data.isNotEmpty()) {
            val screen = remoteMessage.data["screen"]
            val menuId = remoteMessage.data["menuId"]
            val message = remoteMessage.data["message"]
            
            // 알림 처리 로직
            handleNotificationData(screen, menuId, message)
        }
        
        // 알림 페이로드가 있으면 우리가 직접 알림 생성
        remoteMessage.notification?.let { notification ->
            showNotification(notification.title ?: "푸드트럭 알림", notification.body ?: "")
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
        // 알림 채널 생성 (Android 8.0 이상)
        createNotificationChannel()
        
        // 알림 클릭 시 MainActivity로 이동하는 Intent
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK
            putExtra("from_notification", "true")
            putExtra("notification_title", title)
            putExtra("notification_body", body)
        }
        
        val pendingIntent = PendingIntent.getActivity(
            this, 
            1001,
            intent, 
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        
        // 알림 생성
        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(title)
            .setContentText(body)
            .setSmallIcon(R.drawable.icon_notification)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .build()
        
        // 알림 표시
        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.notify(NOTIFICATION_ID, notification)
    }
    
    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            
            val channel = NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = CHANNEL_DESCRIPTION
                enableLights(true)
                enableVibration(true)
                setShowBadge(true)
                lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
            }
            
            notificationManager.createNotificationChannel(channel)
        }
    }
}


