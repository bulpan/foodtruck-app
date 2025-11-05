package com.foodtruck.app

import android.app.Application
import android.util.Log
import com.google.firebase.FirebaseApp
import com.google.firebase.messaging.FirebaseMessaging

class FoodTruckApplication : Application() {
    
    override fun onCreate() {
        super.onCreate()
        
        try {
            // Firebase가 이미 초기화되었는지 확인
            val firebaseApps = FirebaseApp.getApps(this)
            if (firebaseApps.isEmpty()) {
                // Firebase 초기화
                FirebaseApp.initializeApp(this)
                Log.d("FoodTruckApplication", "✅ Firebase 초기화 완료")
            } else {
                Log.d("FoodTruckApplication", "✅ Firebase 이미 초기화됨")
            }
            
            // Firebase Messaging 자동 초기화 활성화
            FirebaseMessaging.getInstance().isAutoInitEnabled = true
            Log.d("FoodTruckApplication", "✅ Firebase Messaging 자동 초기화 활성화")
        } catch (e: Exception) {
            Log.e("FoodTruckApplication", "❌ Firebase 초기화 실패: ${e.message}")
            e.printStackTrace()
        }
    }
}



