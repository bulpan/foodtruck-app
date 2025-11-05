package com.foodtruck.app

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.util.Log
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import com.foodtruck.app.config.AppConfig
import com.google.firebase.messaging.FirebaseMessaging
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.activity.OnBackPressedCallback

class MainActivity : ComponentActivity() {
    
    private var currentWebView: WebView? = null
    
    // 푸시 알림 권한 요청 런처
    private val requestPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { isGranted: Boolean ->
        if (isGranted) {
            Log.d("MainActivity", "✅ 푸시 알림 권한 허용됨")
            getFirebaseToken()
        } else {
            Log.d("MainActivity", "❌ 푸시 알림 권한 거부됨")
        }
    }
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // 푸시 알림 권한 처리 (Android 13+ vs Android 12 이하)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            // Android 13+ (API 33+): 런타임 권한 요청 필요
            val hasPermission = ContextCompat.checkSelfPermission(
                this,
                Manifest.permission.POST_NOTIFICATIONS
            ) == PackageManager.PERMISSION_GRANTED
            
            if (!hasPermission) {
                Log.d("MainActivity", "Android 13+ 푸시 알림 권한 요청")
                requestPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
            } else {
                Log.d("MainActivity", "Android 13+ 푸시 알림 권한 이미 허용됨")
                getFirebaseToken()
            }
        } else {
            // Android 12 이하 (API 32 이하): 권한 요청 없이 바로 토큰 요청
            Log.d("MainActivity", "Android 12 이하 - 푸시 알림 자동 허용, Firebase 토큰 요청")
            getFirebaseToken()
        }
        
        setContent {
            FoodTruckApp(
                onWebViewCreated = { webView -> currentWebView = webView }
            )
        }
    }
    
    private fun getFirebaseToken(retryCount: Int = 0) {
        val maxRetries = 5
        Log.d("MainActivity", "🔥 Firebase 토큰 요청 시작 (Android ${Build.VERSION.SDK_INT}, 재시도 횟수: $retryCount)")
        
        // Firebase가 초기화되었는지 확인
        try {
            val firebaseApps = com.google.firebase.FirebaseApp.getApps(this)
            if (firebaseApps.isEmpty()) {
                Log.w("MainActivity", "⚠️ Firebase 앱 인스턴스 없음, 초기화 대기 중...")
                if (retryCount < maxRetries) {
                    val delay = 1000L * (retryCount + 1) // 재시도 횟수에 따라 대기 시간 증가 (1초, 2초, 3초...)
                    android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
                        getFirebaseToken(retryCount + 1)
                    }, delay)
                    return
                } else {
                    Log.e("MainActivity", "❌ Firebase 초기화 대기 최대 횟수 도달: $maxRetries")
                    return
                }
            }
            Log.d("MainActivity", "✅ Firebase 앱 인스턴스 확인: ${firebaseApps[0].name}")
        } catch (e: Exception) {
            Log.w("MainActivity", "⚠️ Firebase 초기화 확인 중 오류: ${e.message}")
            if (retryCount < maxRetries) {
                val delay = 1000L * (retryCount + 1)
                android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
                    getFirebaseToken(retryCount + 1)
                }, delay)
                return
            }
        }
        
        // Firebase 초기화 대기 후 토큰 요청
        try {
            FirebaseMessaging.getInstance().isAutoInitEnabled = true
            FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
                if (task.isSuccessful) {
                    val token = task.result
                    Log.d("MainActivity", "✅ Firebase 토큰 성공: $token")
                    // 서버에 토큰 등록
                    registerTokenDirectly(token)
                } else {
                    val exception = task.exception
                    Log.e("MainActivity", "❌ Firebase 토큰 가져오기 실패: $exception")
                    Log.e("MainActivity", "❌ 예외 상세: ${exception?.message}")
                    exception?.printStackTrace()
                    
                    // 재시도 로직 (모든 Android 버전에 적용)
                    if (retryCount < maxRetries) {
                        val delay = 1000L * (retryCount + 1) // 재시도 횟수에 따라 대기 시간 증가
                        Log.d("MainActivity", "🔄 재시도... ($retryCount/$maxRetries, ${delay}ms 후)")
                        android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
                            getFirebaseToken(retryCount + 1)
                        }, delay)
                    } else {
                        Log.e("MainActivity", "❌ 최대 재시도 횟수 도달: $maxRetries")
                    }
                }
            }
        } catch (e: Exception) {
            Log.e("MainActivity", "❌ Firebase Messaging 인스턴스 가져오기 실패: ${e.message}")
            if (retryCount < maxRetries) {
                val delay = 1000L * (retryCount + 1)
                android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
                    getFirebaseToken(retryCount + 1)
                }, delay)
            }
        }
    }
    
    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        when {
            currentWebView?.canGoBack() == true -> {
                currentWebView?.goBack()
            }
            else -> {
                super.onBackPressed()
            }
        }
    }
    
    // Firebase 토큰을 서버에 등록하는 메서드
    private fun registerTokenDirectly(token: String) {
        Log.d("MainActivity", "🌐 서버에 토큰 등록 시작: $token")
        Thread {
            try {
                val url = "${AppConfig.getApiUrl()}/fcm/token"
                Log.d("MainActivity", "📡 서버 URL: $url")
                val connection = java.net.URL(url).openConnection() as java.net.HttpURLConnection
                
                connection.requestMethod = "POST"
                connection.setRequestProperty("Content-Type", "application/json")
                connection.doOutput = true
                
                val jsonData = """
                    {
                        "token": "$token",
                        "deviceType": "android",
                        "deviceId": "${android.os.Build.MODEL}"
                    }
                """.trimIndent()
                
                Log.d("MainActivity", "📤 전송 데이터: $jsonData")
                
                connection.outputStream.use { outputStream ->
                    outputStream.write(jsonData.toByteArray())
                }
                
                val responseCode = connection.responseCode
                val responseMessage = connection.responseMessage ?: "Unknown"
                
                // 응답 본문 읽기
                val responseBody = try {
                    connection.inputStream.bufferedReader().use { it.readText() }
                } catch (e: Exception) {
                    "응답 읽기 실패: ${e.message}"
                }
                
                Log.d("MainActivity", "📥 서버 응답: $responseCode $responseMessage")
                Log.d("MainActivity", "📄 응답 본문: $responseBody")
                
                if (responseCode == 200) {
                    Log.d("MainActivity", "✅ 토큰 등록 성공")
                } else {
                    Log.e("MainActivity", "❌ 토큰 등록 실패")
                }
                
                connection.disconnect()
            } catch (e: Exception) {
                Log.e("MainActivity", "❌ 토큰 등록 중 오류: ${e.message}")
                Log.e("MainActivity", "❌ 예외 상세: ${e.stackTraceToString()}")
            }
        }.start()
    }
    
    // 서버에 알림 설정 상태 업데이트
    internal fun updateNotificationSettings(notificationEnabled: Boolean, locationNotificationEnabled: Boolean) {
        // FCM 토큰을 가져와서 서버에 알림 설정 상태 업데이트
        FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
            if (task.isSuccessful) {
                val token = task.result
                Log.d("NotificationSettings", "알림 설정 업데이트: notification=$notificationEnabled, location=$locationNotificationEnabled, 토큰: $token")
                
                // 서버에 알림 설정 상태 업데이트 API 호출
                updateNotificationSettingsOnServer(token, notificationEnabled, locationNotificationEnabled)
            } else {
                Log.e("NotificationSettings", "FCM 토큰 가져오기 실패", task.exception)
            }
        }
    }
    
    // 서버에 알림 설정 상태 업데이트 API 호출
    private fun updateNotificationSettingsOnServer(token: String, notificationEnabled: Boolean, locationNotificationEnabled: Boolean) {
        Thread {
            try {
                val url = "${AppConfig.getApiUrl()}/fcm/token/$token"
                Log.d("NotificationSettings", "📡 알림 설정 업데이트 URL: $url")
                val connection = java.net.URL(url).openConnection() as java.net.HttpURLConnection
                
                connection.requestMethod = "PATCH"
                connection.setRequestProperty("Content-Type", "application/json")
                connection.doOutput = true
                
                val requestBody = """
                    {
                        "notificationEnabled": $notificationEnabled,
                        "locationNotificationEnabled": $locationNotificationEnabled
                    }
                """.trimIndent()
                
                Log.d("NotificationSettings", "📤 요청 본문: $requestBody")
                
                connection.outputStream.use { outputStream ->
                    outputStream.write(requestBody.toByteArray())
                }
                
                val responseCode = connection.responseCode
                val responseMessage = connection.responseMessage ?: "Unknown"
                
                // 응답 본문 읽기
                val responseBody = try {
                    connection.inputStream.bufferedReader().use { it.readText() }
                } catch (e: Exception) {
                    "응답 읽기 실패: ${e.message}"
                }
                
                Log.d("NotificationSettings", "📥 서버 응답: $responseCode $responseMessage")
                Log.d("NotificationSettings", "📄 응답 본문: $responseBody")
                
                if (responseCode == 200 || responseCode == 201) {
                    Log.d("NotificationSettings", "✅ 서버에 알림 설정 업데이트 성공")
                } else {
                    Log.e("NotificationSettings", "❌ 서버 응답 오류: $responseCode")
                }
                
                connection.disconnect()
            } catch (e: Exception) {
                Log.e("NotificationSettings", "❌ 서버 통신 오류", e)
            }
        }.start()
    }
}

@Composable
fun FoodTruckApp(
    onWebViewCreated: (WebView) -> Unit = {}
) {
    var showNotificationSettings by remember { mutableStateOf(false) }
    var webView by remember { mutableStateOf<WebView?>(null) }
    
    // MainActivity 인스턴스 가져오기
    val context = LocalContext.current
    val mainActivity = context as? MainActivity
    
    // 시스템 뒤로가기 키 처리
    val backPressedDispatcher = context as ComponentActivity
    val backPressedCallback = remember {
        object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (showNotificationSettings) {
                    // 알림 설정 화면이 열려있으면 닫기
                    showNotificationSettings = false
                } else {
                    // WebView에서 뒤로가기 가능하면 WebView 뒤로가기, 아니면 앱 종료
                    if (webView?.canGoBack() == true) {
                        webView?.goBack()
                    } else {
                        // 더 이상 뒤로갈 곳이 없으면 앱 종료
                        backPressedDispatcher.finish()
                    }
                }
            }
        }
    }
    
    LaunchedEffect(Unit) {
        backPressedDispatcher.onBackPressedDispatcher.addCallback(backPressedCallback)
    }
    
    DisposableEffect(Unit) {
        onDispose {
            backPressedCallback.remove()
        }
    }
    
    Box(modifier = Modifier.fillMaxSize()) {
        Column(modifier = Modifier.fillMaxSize()) {
            // Top App Bar
            @OptIn(ExperimentalMaterial3Api::class)
            TopAppBar(
                title = { 
                    Text(
                        "세종 유미네 곱창 트럭",
                        color = Color(101, 67, 33)
                    ) 
                },
                actions = {
                    Button(
                        onClick = { showNotificationSettings = true },
                        colors = ButtonDefaults.buttonColors(
                            containerColor = Color(101, 67, 33)
                        ),
                        shape = androidx.compose.foundation.shape.RoundedCornerShape(6.dp),
                        modifier = Modifier.padding(end = 8.dp)
                    ) {
                        Text(
                            "알림",
                            color = Color.White,
                            fontSize = 16.sp
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Color(254, 198, 80),
                    titleContentColor = Color(101, 67, 33),
                    actionIconContentColor = Color(101, 67, 33)
                )
            )
            
            // WebView 영역
            Box(modifier = Modifier.weight(1f)) {
                AndroidView(
                    factory = { context ->
                        WebView(context).apply {
                            // WebView 생성 전에 앱 데이터 저장소 정리
                            try {
                                context.deleteDatabase("webview.db")
                                context.deleteDatabase("webviewCache.db")
                            } catch (e: Exception) {
                                Log.d("WebView", "데이터베이스 삭제 실패: ${e.message}")
                            }
                            
                            settings.apply {
                                javaScriptEnabled = true
                                domStorageEnabled = true
                                loadWithOverviewMode = true
                                useWideViewPort = true
                                builtInZoomControls = false
                                displayZoomControls = false
                                setSupportZoom(true)
                                
                                // 캐시 완전 비활성화
                                cacheMode = WebSettings.LOAD_NO_CACHE
                                setDatabaseEnabled(false)
                                setGeolocationEnabled(false)
                                setRenderPriority(WebSettings.RenderPriority.HIGH)
                                
                                mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
                            }
                            
                            // 캐시 완전 삭제
                            clearCache(true)
                            clearHistory()
                            clearFormData()
                            
                            // WebView 데이터 저장소 정리
                            clearFormData()
                            clearMatches()
                            
                            webViewClient = object : WebViewClient() {
                                override fun shouldOverrideUrlLoading(view: WebView?, url: String?): Boolean {
                                    url?.let { currentUrl ->
                                        when {
                                            currentUrl.startsWith("tel:") -> {
                                                val intent = Intent(Intent.ACTION_DIAL, Uri.parse(currentUrl))
                                                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                                                context.startActivity(intent)
                                                return true
                                            }
                                            currentUrl.startsWith("mailto:") -> {
                                                val intent = Intent(Intent.ACTION_SENDTO, Uri.parse(currentUrl))
                                                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                                                context.startActivity(intent)
                                                return true
                                            }
                                            currentUrl.startsWith("http://") || currentUrl.startsWith("https://") -> {
                                                val intent = Intent(Intent.ACTION_VIEW, Uri.parse(currentUrl))
                                                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                                                context.startActivity(intent)
                                                return true
                                            }
                                            else -> {
                                                return false
                                            }
                                        }
                                    }
                                    return false
                                }
                            }
                            
                            // 캐시 무시하고 URL 로드
                            val url = "${AppConfig.getMobileUrl()}/?t=${System.currentTimeMillis()}"
                            loadUrl(url)
                            webView = this
                            onWebViewCreated(this)
                        }
                    },
                    modifier = Modifier.fillMaxSize()
                )
                
                // 하단 전화 버튼 오버레이
                PhoneButtonOverlay()
            }
        }
        
        // 알림 설정 화면 오버레이
        if (showNotificationSettings) {
            NotificationSettingsScreen(
                onBackClick = { showNotificationSettings = false },
                onUpdateNotificationSettings = { notificationEnabled, locationNotificationEnabled ->
                    mainActivity?.updateNotificationSettings(notificationEnabled, locationNotificationEnabled)
                }
            )
        }
    }
}

@Composable
fun PhoneButtonOverlay() {
    val context = LocalContext.current
    
    Box(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        contentAlignment = Alignment.BottomCenter
    ) {
        Button(
            onClick = {
                val intent = Intent(Intent.ACTION_DIAL)
                intent.data = Uri.parse("tel:010-2420-5174")
                context.startActivity(intent)
            },
            modifier = Modifier
                .fillMaxWidth()
                .height(50.dp),
            colors = ButtonDefaults.buttonColors(
                containerColor = Color(101, 67, 33) // 알림 버튼과 동일한 다크 브라운 색상
            ),
            shape = androidx.compose.foundation.shape.RoundedCornerShape(12.dp)
        ) {
            Text(
                text = "📞 주인장에게 전화하기",
                color = Color.White,
                fontSize = 16.sp,
                fontWeight = FontWeight.SemiBold
            )
        }
    }
}

@Composable
fun NotificationSettingsScreen(
    onBackClick: () -> Unit,
    onUpdateNotificationSettings: (Boolean, Boolean) -> Unit
) {
    var isNotificationEnabled by remember { mutableStateOf(true) }
    var isLocationNotificationEnabled by remember { mutableStateOf(true) }
    
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.White)
    ) {
        Column(
            modifier = Modifier.fillMaxSize()
        ) {
            // Top App Bar
            @OptIn(ExperimentalMaterial3Api::class)
            TopAppBar(
                title = { Text("알림 설정") },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        androidx.compose.material3.Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "뒤로가기",
                            tint = Color(101, 67, 33)
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Color(254, 198, 80),
                    titleContentColor = Color(101, 67, 33),
                    actionIconContentColor = Color(101, 67, 33)
                )
            )
            
            // 알림 설정 내용
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                Text(
                    text = "푸시 알림 설정",
                    style = MaterialTheme.typography.headlineSmall
                )
                
                // 전체 알림 설정
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(
                        containerColor = Color(254, 198, 80)
                    )
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(
                                text = "푸시 알림",
                                style = MaterialTheme.typography.bodyLarge
                            )
                            Text(
                                text = "모든 알림을 켜거나 끕니다",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                        Switch(
                            checked = isNotificationEnabled,
                            onCheckedChange = { 
                                isNotificationEnabled = it
                                if (it) {
                                    isLocationNotificationEnabled = true
                                } else {
                                    isLocationNotificationEnabled = false
                                }
                                
                                // 서버에 알림 설정 업데이트
                                onUpdateNotificationSettings(it, isLocationNotificationEnabled)
                            }
                        )
                    }
                }
                
                // 위치 알림 설정
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(
                        containerColor = Color(254, 198, 80)
                    )
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(
                                text = "위치 알림",
                                style = MaterialTheme.typography.bodyLarge
                            )
                            Text(
                                text = "푸드트럭 위치 변경 알림",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                        Switch(
                            checked = isLocationNotificationEnabled && isNotificationEnabled,
                            onCheckedChange = { 
                                isLocationNotificationEnabled = it
                                // 서버에 알림 설정 업데이트
                                onUpdateNotificationSettings(isNotificationEnabled, it)
                            },
                            enabled = isNotificationEnabled
                        )
                    }
                }
                
                Spacer(modifier = Modifier.weight(1f))
            }
        }
    }
}