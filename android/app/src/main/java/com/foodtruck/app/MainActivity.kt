package com.foodtruck.app

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.util.Log
import android.webkit.WebView
import android.webkit.WebViewClient
import android.webkit.WebSettings
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
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
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.foundation.clickable
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.ui.unit.sp
import com.foodtruck.app.R

class MainActivity : ComponentActivity() {
    
    private var currentWebView: WebView? = null
    private var showNotificationSettings = false
    private var onNotificationSettingsChanged: ((Boolean) -> Unit)? = null
    
    private val requestPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { isGranted: Boolean ->
        if (isGranted) {
            // 권한이 허용되면 FCM 토큰 등록
            registerFCMToken()
        }
    }
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // 알림 권한 요청
        requestNotificationPermission()
        
        // 알림 채널 생성 (앱 시작 시)
        createNotificationChannel()
        
        setContent {
            FoodTruckApp(
                onWebViewCreated = { webView -> currentWebView = webView },
                onNotificationSettingsChanged = { show -> 
                    showNotificationSettings = show
                }
            )
        }
    }
    
    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        // 뒤로가기 버튼 처리
        when {
            showNotificationSettings -> {
                // 알림 설정 화면에서 뒤로가기 시 메인 화면으로
                showNotificationSettings = false
            }
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
    
    private fun getCurrentWebView(): WebView? {
        // 현재 WebView 인스턴스를 가져오는 방법
        // 이는 Compose에서 직접 접근하기 어려우므로
        // 다른 방법을 사용해야 합니다
        return null
    }
    
    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            
            // 기존 채널 삭제 (있다면)
            notificationManager.deleteNotificationChannel("foodtruck_notifications")
            
            val channel = NotificationChannel(
                "foodtruck_notifications",
                "푸드트럭 알림",
                NotificationManager.IMPORTANCE_MAX
            ).apply {
                description = "푸드트럭의 메뉴, 위치 정보 알림"
                enableLights(true)
                enableVibration(true)
                setShowBadge(true)
                lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
                setBypassDnd(true)
                setSound(android.provider.Settings.System.DEFAULT_NOTIFICATION_URI, null)
                vibrationPattern = longArrayOf(0, 1000, 500, 1000)
            }
            
            notificationManager.createNotificationChannel(channel)
            Log.d("MainActivity", "알림 채널 생성 완료: foodtruck_notifications")
        }
    }
    
    private fun requestNotificationPermission() {
        when {
            ContextCompat.checkSelfPermission(
                this,
                Manifest.permission.POST_NOTIFICATIONS
            ) == PackageManager.PERMISSION_GRANTED -> {
                // 권한이 이미 있으면 FCM 토큰 등록
                Log.d("FCM", "알림 권한이 이미 허용됨")
                registerFCMToken()
            }
            else -> {
                // 권한 요청
                Log.d("FCM", "알림 권한 요청 중...")
                requestPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
            }
        }
    }
    
    private fun registerFCMToken() {
        FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
            if (!task.isSuccessful) {
                Log.e("FCM", "FCM 토큰 가져오기 실패", task.exception)
                return@addOnCompleteListener
            }
            
            // FCM 토큰 가져오기 성공
            val token = task.result
            Log.d("FCM", "FCM 토큰: $token")
            
            // 서버에 토큰 등록
            registerTokenToServer(token)
        }
    }
    
    private fun registerTokenToServer(token: String) {
        val apiService = ApiService()
        
        Thread {
            try {
                val response = apiService.registerFCMToken(token, "android")
                if (response.isSuccessful) {
                    Log.d("FCM", "토큰 등록 성공: $token")
                } else {
                    Log.e("FCM", "토큰 등록 실패: ${response.code} - ${response.message}")
                }
            } catch (e: Exception) {
                Log.e("FCM", "토큰 등록 오류", e)
            }
        }.start()
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
            // 로딩 스피너
            CircularProgressIndicator(
                modifier = Modifier.size(60.dp),
                color = Color(101, 67, 33), // 다크 브라운 색상
                strokeWidth = 4.dp
            )
            
            Spacer(modifier = Modifier.height(24.dp))
            
            // 앱 로고/아이콘
            Icon(
                painter = painterResource(id = R.drawable.icon_notification),
                contentDescription = "앱 로고",
                modifier = Modifier.size(80.dp),
                tint = Color(101, 67, 33)
            )
            
            Spacer(modifier = Modifier.height(16.dp))
            
            // 앱 이름
            Text(
                text = "세종유미곱창트럭",
                style = MaterialTheme.typography.headlineSmall,
                color = Color(101, 67, 33),
                fontWeight = FontWeight.Bold
            )
            
            Spacer(modifier = Modifier.height(8.dp))
            
            // 로딩 메시지
            Text(
                text = "잠시만 기다려주세요...",
                style = MaterialTheme.typography.bodyMedium,
                color = Color(101, 67, 33).copy(alpha = 0.8f)
            )
        }
    }
}

@Composable
fun FoodTruckApp(
    onWebViewCreated: (WebView) -> Unit = {},
    onNotificationSettingsChanged: (Boolean) -> Unit = {}
) {
        val viewModel: MainViewModel = viewModel()
        var webView by remember { mutableStateOf<WebView?>(null) }
        var currentUrl by remember { mutableStateOf(AppConfig.getMobileUrl() + "/") }
        var showNotificationSettings by remember { mutableStateOf(false) }
        var isWebViewLoading by remember { mutableStateOf(false) }
        
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
                                webViewClient = object : WebViewClient() {
                                    override fun onPageStarted(view: WebView?, url: String?, favicon: android.graphics.Bitmap?) {
                                        super.onPageStarted(view, url, favicon)
                                        Log.d("MainActivity", "Page loading started: $url")
                                        isWebViewLoading = true
                                    }
                                    
                                    override fun onPageFinished(view: WebView?, url: String?) {
                                        super.onPageFinished(view, url)
                                        Log.d("MainActivity", "Page loaded: $url")
                                        isWebViewLoading = false
                                        // 페이지 로드 완료 후 JavaScript 인터페이스 설정
                                        setupJavaScriptInterface(view)
                                    }
                                    
                                    override fun onReceivedError(view: WebView?, errorCode: Int, description: String?, failingUrl: String?) {
                                        super.onReceivedError(view, errorCode, description, failingUrl)
                                        Log.e("MainActivity", "WebView error: $errorCode - $description for URL: $failingUrl")
                                        isWebViewLoading = false
                                    }
                                }
                                settings.javaScriptEnabled = true
                                settings.domStorageEnabled = true
                                settings.loadWithOverviewMode = true
                                settings.useWideViewPort = true
                                
                                // 개발 환경에서는 캐시 비활성화
                                if (BuildConfig.IS_DEVELOPMENT) {
                                    settings.cacheMode = WebSettings.LOAD_NO_CACHE
                                    clearCache(true)
                                    clearHistory()
                                }
                                
                                loadUrl(currentUrl)
                                webView = this
                                onWebViewCreated(this)
                            }
                        },
                        modifier = Modifier.fillMaxSize()
                    )
                    
                    // 로딩 화면 오버레이
                    if (isWebViewLoading) {
                        LoadingScreen()
                    }
                }
                
                // Bottom Navigation
                BottomNavigationBar(
                    onHomeClick = { 
                        currentUrl = AppConfig.getMobileUrl() + "/"
                        webView?.loadUrl(currentUrl)
                    },
                    onMenuClick = { 
                        // 메뉴 화면으로 이동
                        webView?.evaluateJavascript("window.FoodTruckInterface.navigateToMenu()", null)
                    },
                    onNotificationSettingsClick = { 
                        // 네이티브 알림 설정 화면으로 이동
                        showNotificationSettings = true
                        onNotificationSettingsChanged(true)
                    }
                )
            }
        }
    }
    
    private fun setupJavaScriptInterface(webView: WebView?) {
        webView?.let { view ->
            val initScript = """
                window.FoodTruckInterface = {
                    callPhone: function(phoneNumber) {
                        // 네이티브 전화 걸기 기능
                        console.log('Calling:', phoneNumber);
                    },
                    openExternalLink: function(url) {
                        // 외부 링크 열기
                        console.log('Opening:', url);
                    },
                    registerFCMToken: function(token) {
                        // FCM 토큰 등록
                        console.log('Registering FCM token:', token);
                    },
                    scrollToMenu: function() {
                        // 메뉴 섹션으로 스크롤
                        console.log('Scrolling to menu section');
                        const menuSection = document.getElementById('menu-section') || document.querySelector('.menu-section') || document.querySelector('[data-section="menu"]');
                        if (menuSection) {
                            menuSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        } else {
                            // 메뉴 섹션을 찾지 못한 경우 페이지 하단으로 스크롤
                            window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                        }
                    },
                    navigateToMenu: function() {
                        // 메뉴 화면으로 이동
                        console.log('Navigating to menu screen');
                        // 메뉴 섹션을 찾기 (다양한 선택자 시도)
                        const menuSection = document.getElementById('menu-screen') || 
                                           document.getElementById('menu-section') || 
                                           document.querySelector('.menu-section') || 
                                           document.querySelector('[data-section="menu"]');
                        
                        if (menuSection) {
                            // 메뉴 섹션이 있으면 해당 화면으로 이동
                            console.log('Found menu section, navigating to it');
                            // 모든 화면 숨기기
                            const screens = document.querySelectorAll('.screen');
                            screens.forEach(screen => screen.classList.remove('active'));
                            
                            // 메뉴 화면 활성화
                            menuSection.classList.add('active');
                            
                            // 메뉴 섹션으로 스크롤
                            menuSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        } else {
                            // 메뉴 섹션이 없으면 메뉴 페이지로 이동
                            console.log('Menu section not found, navigating to menu page');
                            const menuUrl = window.location.origin + '/#menu';
                            if (window.location.href !== menuUrl) {
                                window.location.href = menuUrl;
                            } else {
                                // 이미 메뉴 페이지에 있으면 메뉴 섹션으로 스크롤
                                setTimeout(() => {
                                    const menuSection = document.getElementById('menu-screen') || 
                                                       document.getElementById('menu-section') || 
                                                       document.querySelector('.menu-section') || 
                                                       document.querySelector('[data-section="menu"]');
                                    if (menuSection) {
                                        menuSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                    } else {
                                        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                                    }
                                }, 100);
                            }
                        }
                    }
                };
            """.trimIndent()
            
            view.evaluateJavascript(initScript, null)
        }
    }
    
    @Composable
    fun BottomNavigationBar(
        onHomeClick: () -> Unit,
        onMenuClick: () -> Unit,
        onNotificationSettingsClick: () -> Unit
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
                    iconResId = R.drawable.icon_home,
                    label = "Home",
                    onClick = onHomeClick,
                    modifier = Modifier.weight(1f)
                )
                NavigationItem(
                    iconResId = R.drawable.icon_menu,
                    label = "Menu",
                    onClick = onMenuClick,
                    modifier = Modifier.weight(1f)
                )
                NavigationItem(
                    iconResId = R.drawable.icon_notification,
                    label = "Notifications",
                    onClick = onNotificationSettingsClick,
                    modifier = Modifier.weight(1f)
                )
            }
        }
    }
    
    @Composable
    fun NavigationItem(
        iconResId: Int,
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
            Icon(
                painter = painterResource(id = iconResId),
                contentDescription = label,
                modifier = Modifier.size(58.dp), // 이미지 크기를 1.2배로 증가 (48 * 1.2 = 57.6 ≈ 58)
                tint = Color.Unspecified // 이미지의 원본 색상 사용
            )
        }
    }
    
    @OptIn(ExperimentalMaterial3Api::class)
    @Composable
    fun NotificationSettingsScreen(
        onBackClick: () -> Unit
    ) {
        var isNotificationEnabled by remember { mutableStateOf(true) }
        var isMenuNotificationEnabled by remember { mutableStateOf(true) }
        var isLocationNotificationEnabled by remember { mutableStateOf(true) }
        
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
                            onCheckedChange = { isNotificationEnabled = it }
                        )
                    }
                }
                
                // 메뉴 알림 설정
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
                                text = "메뉴 알림",
                                style = MaterialTheme.typography.bodyLarge
                            )
                            Text(
                                text = "새로운 메뉴나 메뉴 변경 알림",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                        Switch(
                            checked = isMenuNotificationEnabled && isNotificationEnabled,
                            onCheckedChange = { isMenuNotificationEnabled = it },
                            enabled = isNotificationEnabled
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