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
        
        // 푸시 알림 권한 요청 (Android 13 이상)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            val hasPermission = ContextCompat.checkSelfPermission(
                this,
                Manifest.permission.POST_NOTIFICATIONS
            ) == PackageManager.PERMISSION_GRANTED
            
            if (!hasPermission) {
                requestPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
            } else {
                getFirebaseToken()
            }
        } else {
            getFirebaseToken()
        }
        
        setContent {
            FoodTruckApp(
                onWebViewCreated = { webView -> currentWebView = webView }
            )
        }
    }
    
    private fun getFirebaseToken() {
        FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
            if (task.isSuccessful) {
                val token = task.result
                Log.d("MainActivity", "Firebase 토큰: $token")
            } else {
                Log.e("MainActivity", "Firebase 토큰 가져오기 실패: ${task.exception}")
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
}

@Composable
fun FoodTruckApp(
    onWebViewCreated: (WebView) -> Unit = {}
) {
    var showNotificationSettings by remember { mutableStateOf(false) }
    var webView by remember { mutableStateOf<WebView?>(null) }
    
    // 시스템 뒤로가기 키 처리
    val backPressedDispatcher = LocalContext.current as ComponentActivity
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
                onBackClick = { showNotificationSettings = false }
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
    onBackClick: () -> Unit
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
                            onCheckedChange = { isLocationNotificationEnabled = it },
                            enabled = isNotificationEnabled
                        )
                    }
                }
                
                Spacer(modifier = Modifier.weight(1f))
            }
        }
    }
}