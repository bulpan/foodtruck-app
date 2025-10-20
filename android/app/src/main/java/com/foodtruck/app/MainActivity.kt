package com.foodtruck.app

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.util.Log
import android.view.WindowInsets
import android.view.WindowInsetsController
import android.webkit.WebView
import android.webkit.WebViewClient
import android.webkit.WebSettings
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.view.WindowCompat
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.background
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.LaunchedEffect
import com.foodtruck.app.ui.viewmodel.MainViewModel

import com.foodtruck.app.ui.viewmodel.ApiService
import com.foodtruck.app.config.AppConfig
import com.google.firebase.messaging.FirebaseMessaging
import androidx.activity.OnBackPressedCallback
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import com.google.gson.Gson
import com.google.gson.JsonObject
import com.google.gson.JsonArray
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.foundation.clickable
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.ui.unit.sp
import com.foodtruck.app.R

// 알림 설정 데이터 클래스
data class NotificationSettings(
    val notificationEnabled: Boolean = true,
    val locationNotificationEnabled: Boolean = true
)

class MainActivity : ComponentActivity() {
    
    private var currentWebView: WebView? = null
    
    // 푸시 알림 권한 요청 런처
    private val requestPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { isGranted: Boolean ->
        if (isGranted) {
            Log.d("MainActivity", "✅ 푸시 알림 권한 허용됨")
            // Firebase 토큰 가져오기
            FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
                if (task.isSuccessful) {
                    val token = task.result
                    Log.d("MainActivity", "Firebase 토큰: $token")
                }
            }
        } else {
            Log.d("MainActivity", "❌ 푸시 알림 권한 거부됨")
        }
    }
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Edge-to-Edge 비활성화 (targetSdk 35 호환)
        // WindowInsetsController는 onResume에서 처리하거나 제거
        // WindowCompat.setDecorFitsSystemWindows(window, false)
        
        // 푸시 알림 권한 요청 (Android 13 이상)
        Log.d("MainActivity", "Android 버전: ${Build.VERSION.SDK_INT}, TIRAMISU: ${Build.VERSION_CODES.TIRAMISU}")
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            val hasPermission = ContextCompat.checkSelfPermission(
                this,
                Manifest.permission.POST_NOTIFICATIONS
            ) == PackageManager.PERMISSION_GRANTED
            
            Log.d("MainActivity", "푸시 알림 권한 상태: $hasPermission")
            
            if (!hasPermission) {
                Log.d("MainActivity", "푸시 알림 권한 요청 중...")
                requestPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
            } else {
                Log.d("MainActivity", "✅ 푸시 알림 권한 이미 허용됨")
                // Firebase 토큰 가져오기 및 서버 등록
                FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
                    if (task.isSuccessful) {
                        val token = task.result
                        Log.d("MainActivity", "Firebase 토큰: $token")
                        // 서버에 토큰 등록 (직접 API 호출)
                        registerTokenDirectly(token)
                    } else {
                        Log.e("MainActivity", "Firebase 토큰 가져오기 실패: ${task.exception}")
                    }
                }
            }
        } else {
            Log.d("MainActivity", "Android 13 미만 - Firebase 토큰 가져오기")
            // Android 13 미만에서는 권한 요청 없이 바로 토큰 가져오기
            FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
                if (task.isSuccessful) {
                    val token = task.result
                    Log.d("MainActivity", "Firebase 토큰: $token")
                    // 서버에 토큰 등록 (직접 API 호출)
                    registerTokenDirectly(token)
                } else {
                    Log.e("MainActivity", "Firebase 토큰 가져오기 실패: ${task.exception}")
                }
            }
        }
        
        setContent {
            FoodTruckApp(
                onWebViewCreated = { webView -> currentWebView = webView }
            )
        }
    }
    
    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        // 뒤로가기 버튼 처리
        when {
            currentWebView?.canGoBack() == true -> {
                // WebView에서 뒤로가기 가능하면 WebView 뒤로가기
                currentWebView?.goBack()
            }
            else -> {
                // 그렇지 않으면 앱 종료
                super.onBackPressed()
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LoadingScreen() {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(254, 198, 80)), // 앱 테마 색상
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            CircularProgressIndicator(
                color = Color(101, 67, 33), // 다크 브라운 색상
                strokeWidth = 4.dp
            )
            Spacer(modifier = Modifier.height(16.dp))
            Text(
                text = "로딩 중...",
                color = Color(101, 67, 33), // 다크 브라운 색상
                style = MaterialTheme.typography.bodyLarge
            )
        }
    }
}

@Composable
fun FoodTruckApp(
    onWebViewCreated: (WebView) -> Unit = {}
) {
        val viewModel: MainViewModel = viewModel()
        var webView by remember { mutableStateOf<WebView?>(null) }
        var currentUrl by remember { mutableStateOf(AppConfig.getMobileUrl() + "/") }
        var isWebViewLoading by remember { mutableStateOf(false) }
        var showNotificationSettings by remember { mutableStateOf(false) }
        
        // ViewModel 상태 관찰
        val isLoading by viewModel.isLoading.collectAsState()
        val error by viewModel.error.collectAsState()
        
        // 에러 표시
        error?.let { errorMessage ->
            LaunchedEffect(errorMessage) {
                // 에러 메시지 표시 (Snackbar 등)
                viewModel.clearError()
            }
        }
        
        if (showNotificationSettings) {
            NotificationSettingsScreen(
                onBackClick = { 
                    showNotificationSettings = false
                }
            )
        } else {
            Column(modifier = Modifier.fillMaxSize()) {
                // WebView 영역
                Box(modifier = Modifier.weight(1f)) {
                    AndroidView(
                        factory = { context ->
                            WebView(context).apply {
                                settings.apply {
                                    javaScriptEnabled = true
                                    domStorageEnabled = true
                                    loadWithOverviewMode = true
                                    useWideViewPort = true
                                    builtInZoomControls = false
                                    displayZoomControls = false
                                    setSupportZoom(true)
                                    cacheMode = WebSettings.LOAD_NO_CACHE
                                    mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
                                    
                                    // 캐시 완전 비활성화
                                    setDatabaseEnabled(false)
                                    setGeolocationEnabled(false)
                                    setRenderPriority(WebSettings.RenderPriority.HIGH)
                                }
                                
                                // 캐시 완전 삭제
                                clearCache(true)
                                clearHistory()
                                clearFormData()
                                
                                webViewClient = object : WebViewClient() {
                                    override fun onPageStarted(view: WebView?, url: String?, favicon: android.graphics.Bitmap?) {
                                        super.onPageStarted(view, url, favicon)
                                        isWebViewLoading = true
                                    }
                                    
                                    override fun onPageFinished(view: WebView?, url: String?) {
                                        super.onPageFinished(view, url)
                                        isWebViewLoading = false
                                    }
                                    
                                    override fun shouldOverrideUrlLoading(view: WebView?, url: String?): Boolean {
                                        url?.let { currentUrl ->
                                            when {
                                                currentUrl.startsWith("tel:") -> {
                                                    // 전화 걸기 Intent 생성
                                                    val intent = android.content.Intent(android.content.Intent.ACTION_DIAL, android.net.Uri.parse(currentUrl))
                                                    intent.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK)
                                                    context.startActivity(intent)
                                                    return true
                                                }
                                                currentUrl.startsWith("mailto:") -> {
                                                    // 이메일 Intent 생성
                                                    val intent = android.content.Intent(android.content.Intent.ACTION_SENDTO, android.net.Uri.parse(currentUrl))
                                                    intent.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK)
                                                    context.startActivity(intent)
                                                    return true
                                                }
                                                currentUrl.startsWith("http://") || currentUrl.startsWith("https://") -> {
                                                    // 외부 브라우저에서 열기
                                                    val intent = android.content.Intent(android.content.Intent.ACTION_VIEW, android.net.Uri.parse(currentUrl))
                                                    intent.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK)
                                                    context.startActivity(intent)
                                                    return true
                                                }
                                                else -> {
                                                    // 다른 URL은 WebView에서 처리
                                                    return false
                                                }
                                            }
                                        }
                                        return false
                                    }
                                }
                                
                                // 캐시 무시하고 URL 로드
                                loadUrl("$currentUrl?t=${System.currentTimeMillis()}")
                                webView = this
                                onWebViewCreated(this)
                            }
                        },
                        modifier = Modifier.fillMaxSize()
                    )
                    
                    if (isWebViewLoading) {
                        LoadingScreen()
                    }
                }
                
                // Bottom Navigation
                BottomNavigationBar(
                        onHomeClick = { 
                            currentUrl = AppConfig.getMobileUrl() + "/"
                            webView?.loadUrl("$currentUrl?t=${System.currentTimeMillis()}")
                        },
                    onMenuClick = { 
                        // 알림설정 화면으로 이동
                        showNotificationSettings = true
                    }
                )
            }
        }
}

@Composable
fun BottomNavigationBar(
    onHomeClick: () -> Unit,
    onMenuClick: () -> Unit
) {
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 8.dp),
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(
                containerColor = Color(254, 198, 80) // RGB(254, 198, 80)
            ),
            elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
        ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(72.dp) // 높이를 약간 줄여서 더 균형잡힌 모습으로
                            .padding(horizontal = 8.dp),
                        horizontalArrangement = Arrangement.SpaceEvenly,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        NavigationItem(
                            iconResId = null,
                            label = "홈",
                            onClick = onHomeClick,
                            modifier = Modifier.weight(1f)
                        )
                        NavigationItem(
                            iconResId = null,
                            label = "알림설정",
                            onClick = onMenuClick,
                            modifier = Modifier.weight(1f)
                        )
                    }
        }
    }
    
    @Composable
    fun NavigationItem(
        iconResId: Int?,
        label: String,
        onClick: () -> Unit,
        modifier: Modifier = Modifier
    ) {
        Box(
            modifier = modifier
                .clickable { onClick() }
                .padding(vertical = 12.dp),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = label,
                color = Color(101, 67, 33), // 다크 브라운 색상
                fontSize = 24.sp, // 크기를 2배로 증가
                fontWeight = FontWeight.Bold // 볼드체 적용
            )
        }
    }
    
    @OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NotificationSettingsScreen(
    onBackClick: () -> Unit
) {
    var isNotificationEnabled by remember { mutableStateOf(true) }
    var isLocationNotificationEnabled by remember { mutableStateOf(true) }
    var isLoading by remember { mutableStateOf(true) }
    
    // 서버에서 알림 설정 상태 가져오기
    LaunchedEffect(Unit) {
        loadNotificationSettingsFromServer { settings ->
            isNotificationEnabled = settings.notificationEnabled
            isLocationNotificationEnabled = settings.locationNotificationEnabled
            isLoading = false
        }
    }
    
    if (isLoading) {
        // 로딩 중 표시
        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = androidx.compose.ui.Alignment.Center
        ) {
            CircularProgressIndicator(
                color = Color(254, 198, 80)
            )
        }
    } else {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(Color.White) // 배경색을 화이트로 변경
        ) {
            // Top App Bar
            TopAppBar(
                title = { Text("알림 설정") },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(
                            imageVector = androidx.compose.material.icons.Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "뒤로가기",
                            tint = Color(101, 67, 33) // 다크 브라운 색상
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Color(254, 198, 80), // 메인 노랑색톤과 동일
                    titleContentColor = Color(101, 67, 33) // 다크 브라운 색상
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
                        containerColor = Color(254, 198, 80) // 노랑색 계열 배경
                    )
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = androidx.compose.ui.Alignment.CenterVertically
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
                                // 서버에 알림 설정 상태 업데이트
                                updateNotificationSettings(it)
                            }
                        )
                    }
                }
                
                // 위치 알림 설정
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(
                        containerColor = Color(254, 198, 80) // 노랑색 계열 배경
                    )
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = androidx.compose.ui.Alignment.CenterVertically
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
                            onCheckedChange = { isLocationNotificationEnabled = it },
                            enabled = isNotificationEnabled
                        )
                    }
                }
                
                Spacer(modifier = Modifier.weight(1f))
                
                // 저장 버튼
                Button(
                    onClick = {
                        // 알림 설정 저장 로직
                        Log.d("NotificationSettings", "알림 설정 저장됨")
                        onBackClick()
                    },
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = Color(254, 198, 80) // 노랑색 계열 배경
                    )
                ) {
                    Text(
                        "설정 저장",
                        color = Color(101, 67, 33) // 다크 브라운 텍스트 색상
                    )
                }
            }
        }
    }
}
    
    // 서버에 알림 설정 상태 업데이트
    private fun updateNotificationSettings(enabled: Boolean) {
        // FCM 토큰을 가져와서 서버에 알림 설정 상태 업데이트
        FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
            if (task.isSuccessful) {
                val token = task.result
                Log.d("NotificationSettings", "알림 설정 업데이트: $enabled, 토큰: $token")
                
                // 서버에 알림 설정 상태 업데이트 API 호출
                updateNotificationSettingsOnServer(token, enabled)
            } else {
                Log.e("NotificationSettings", "FCM 토큰 가져오기 실패", task.exception)
            }
        }
    }
    
    // 서버에 토큰 직접 등록 (targetSdk 35 호환)
    private fun registerTokenDirectly(token: String) {
        Thread {
            try {
                val url = java.net.URL("https://truck.carrera74.com/api/fcm/token")
                val connection = url.openConnection() as java.net.HttpURLConnection
                
                connection.requestMethod = "POST"
                connection.setRequestProperty("Content-Type", "application/json")
                connection.setRequestProperty("User-Agent", "FoodTruckApp/1.0.0")
                connection.doOutput = true
                
                val requestBody = """
                    {
                        "token": "$token",
                        "deviceType": "android",
                        "deviceId": "android_device_${System.currentTimeMillis()}"
                    }
                """.trimIndent()
                
                connection.outputStream.use { outputStream ->
                    outputStream.write(requestBody.toByteArray())
                }
                
                val responseCode = connection.responseCode
                Log.d("MainActivity", "토큰 등록 서버 응답 코드: $responseCode")
                
                if (responseCode == 200 || responseCode == 201) {
                    Log.d("MainActivity", "✅ 서버에 토큰 등록 성공")
                } else {
                    Log.e("MainActivity", "❌ 토큰 등록 실패: $responseCode")
                    val errorResponse = connection.errorStream?.bufferedReader()?.readText()
                    Log.e("MainActivity", "오류 응답: $errorResponse")
                }
                
            } catch (e: Exception) {
                Log.e("MainActivity", "❌ 토큰 등록 서버 통신 오류", e)
            }
        }.start()
    }
    
    // 서버에서 알림 설정 상태 가져오기
    private fun loadNotificationSettingsFromServer(callback: (NotificationSettings) -> Unit) {
        // 기본값으로 즉시 설정 (ANR 방지)
        callback(NotificationSettings(notificationEnabled = true, locationNotificationEnabled = true))
        
        // UI 스레드에서 FCM 토큰 가져오기
        FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
            if (task.isSuccessful) {
                val token = task.result
                Log.d("NotificationSettings", "서버에서 알림 설정 조회 중... 토큰: $token")
                
                // 백그라운드 스레드에서 네트워크 요청
                Thread {
                    try {
                        val url = java.net.URL("https://truck.carrera74.com/api/fcm/tokens")
                        val connection = url.openConnection() as java.net.HttpURLConnection
                        
                        connection.requestMethod = "GET"
                        connection.setRequestProperty("Content-Type", "application/json")
                        connection.setRequestProperty("User-Agent", "FoodTruckApp/1.0.0")
                        connection.connectTimeout = 10000 // 10초 타임아웃
                        connection.readTimeout = 10000 // 10초 타임아웃
                        
                        val responseCode = connection.responseCode
                        Log.d("NotificationSettings", "서버 응답 코드: $responseCode")
                    
                        if (responseCode == 200) {
                            val response = connection.inputStream.bufferedReader().readText()
                            Log.d("NotificationSettings", "서버 응답: $response")
                            
                            // JSON 파싱하여 현재 토큰의 설정 찾기
                            val jsonObject = org.json.JSONObject(response)
                            val tokensArray = jsonObject.getJSONArray("tokens")
                            
                            var foundSettings = NotificationSettings(
                                notificationEnabled = true, // 기본값
                                locationNotificationEnabled = true
                            )
                            
                            for (i in 0 until tokensArray.length()) {
                                val tokenObj = tokensArray.getJSONObject(i)
                                if (tokenObj.getString("token") == token) {
                                    foundSettings = NotificationSettings(
                                        notificationEnabled = tokenObj.getBoolean("notificationEnabled"),
                                        locationNotificationEnabled = tokenObj.getBoolean("notificationEnabled") // 위치 알림도 같은 설정 사용
                                    )
                                    break
                                }
                            }
                            
                            Log.d("NotificationSettings", "✅ 서버에서 알림 설정 로드 성공: $foundSettings")
                            callback(foundSettings)
                            
                        } else {
                            Log.e("NotificationSettings", "❌ 서버 응답 오류: $responseCode")
                            callback(NotificationSettings(notificationEnabled = true, locationNotificationEnabled = true))
                        }
                        
                    } catch (e: Exception) {
                        Log.e("NotificationSettings", "❌ 서버에서 알림 설정 로드 실패", e)
                        callback(NotificationSettings(notificationEnabled = true, locationNotificationEnabled = true))
                    }
                }.start()
                
            } else {
                Log.e("NotificationSettings", "FCM 토큰 가져오기 실패", task.exception)
                callback(NotificationSettings(notificationEnabled = true, locationNotificationEnabled = true))
            }
        }
    }
    
    // 서버에 알림 설정 상태 업데이트 API 호출
    private fun updateNotificationSettingsOnServer(token: String, enabled: Boolean) {
        Thread {
            try {
                val url = java.net.URL("https://truck.carrera74.com/api/fcm/token/$token")
                val connection = url.openConnection() as java.net.HttpURLConnection
                
                connection.requestMethod = "PATCH"
                connection.setRequestProperty("Content-Type", "application/json")
                connection.doOutput = true
                
                val requestBody = """
                    {
                        "notificationEnabled": $enabled
                    }
                """.trimIndent()
                
                connection.outputStream.use { outputStream ->
                    outputStream.write(requestBody.toByteArray())
                }
                
                val responseCode = connection.responseCode
                Log.d("NotificationSettings", "서버 응답 코드: $responseCode")
                
                if (responseCode == 200) {
                    Log.d("NotificationSettings", "✅ 서버에 알림 설정 업데이트 성공")
                } else {
                    Log.e("NotificationSettings", "❌ 서버 응답 오류: $responseCode")
                    // 응답 내용 읽기
                    val errorResponse = connection.errorStream?.bufferedReader()?.readText()
                    Log.e("NotificationSettings", "오류 응답: $errorResponse")
                }
                
            } catch (e: Exception) {
                Log.e("NotificationSettings", "❌ 서버 통신 오류", e)
            }
        }.start()
    }