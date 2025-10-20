package com.foodtruck.app.ui.viewmodel

import com.foodtruck.app.config.AppConfig
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.IOException
import java.util.concurrent.TimeUnit
import javax.net.ssl.SSLContext
import javax.net.ssl.TrustManager
import javax.net.ssl.X509TrustManager
import java.security.cert.X509Certificate

class ApiService {
    
    private val client = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .followRedirects(true)
        .followSslRedirects(true)
        .build()
    
    private val baseUrl = AppConfig.getApiUrl()
    
    fun getMenus(): Response {
        val request = Request.Builder()
            .url("$baseUrl/menu")
            .get()
            .build()
        
        return try {
            client.newCall(request).execute()
        } catch (e: IOException) {
            throw e
        }
    }
    
    fun getCurrentLocation(): Response {
        val request = Request.Builder()
            .url("$baseUrl/location/current")
            .get()
            .build()
        
        return try {
            client.newCall(request).execute()
        } catch (e: IOException) {
            throw e
        }
    }
    
    fun registerFCMToken(token: String, deviceType: String): Response {
        val json = """
            {
                "token": "$token",
                "deviceType": "$deviceType",
                "deviceId": "android_device_${System.currentTimeMillis()}"
            }
        """.trimIndent()
        
        val requestBody = json.toRequestBody("application/json".toMediaType())
        
        val request = Request.Builder()
            .url("$baseUrl/fcm/token")
            .post(requestBody)
            .addHeader("Content-Type", "application/json")
            .build()
        
        return try {
            client.newCall(request).execute()
        } catch (e: IOException) {
            throw e
        }
    }
    
    fun getFCMTokens(): Response {
        val request = Request.Builder()
            .url("$baseUrl/fcm/tokens")
            .get()
            .build()
        
        return try {
            client.newCall(request).execute()
        } catch (e: IOException) {
            throw e
        }
    }
    
    fun getFCMStats(): Response {
        val request = Request.Builder()
            .url("$baseUrl/fcm/stats")
            .get()
            .build()
        
        return try {
            client.newCall(request).execute()
        } catch (e: IOException) {
            throw e
        }
    }
}
