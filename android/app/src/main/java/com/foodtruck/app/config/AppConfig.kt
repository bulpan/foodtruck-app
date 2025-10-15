package com.foodtruck.app.config

import com.foodtruck.app.BuildConfig

object AppConfig {
    // 환경 설정 (BuildConfig에서 가져옴)
    private val IS_DEVELOPMENT = BuildConfig.IS_DEVELOPMENT
    
    // 서버 URL 설정 (BuildConfig에서 가져옴)
    private val DEV_LOCAL_IP = BuildConfig.DEV_LOCAL_IP
    private val DEV_PORT = BuildConfig.DEV_PORT
    private val PROD_BASE_URL = BuildConfig.PROD_BASE_URL
    
    // 현재 환경에 따른 서버 URL 반환
    fun getServerUrl(): String {
        return if (IS_DEVELOPMENT) {
            "http://$DEV_LOCAL_IP:$DEV_PORT"
        } else {
            PROD_BASE_URL
        }
    }
    
    // API 엔드포인트 URL
    fun getApiUrl(): String = "${getServerUrl()}/api"
    
    // 모바일 웹 URL
    fun getMobileUrl(): String = "${getServerUrl()}/mobile"
    
    // 환경 정보
    fun isDevelopment(): Boolean = IS_DEVELOPMENT
    
    fun getEnvironment(): String = if (IS_DEVELOPMENT) "development" else "production"
    
    // 디버그 정보
    fun getDebugInfo(): String {
        return """
            Environment: ${getEnvironment()}
            Server URL: ${getServerUrl()}
            API URL: ${getApiUrl()}
            Mobile URL: ${getMobileUrl()}
        """.trimIndent()
    }
}
