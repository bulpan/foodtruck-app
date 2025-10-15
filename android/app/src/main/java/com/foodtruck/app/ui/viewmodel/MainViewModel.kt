package com.foodtruck.app.ui.viewmodel

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import com.google.gson.Gson
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.IOException

data class MenuItem(
    val id: String,
    val name: String,
    val description: String,
    val price: Int,
    val category: String,
    val isAvailable: Boolean
)

data class Location(
    val id: String,
    val name: String,
    val address: String,
    val latitude: Double,
    val longitude: Double,
    val openTime: String,
    val closeTime: String,
    val notice: String
)

data class NotificationSettings(
    val isEnabled: Boolean = true,
    val menuUpdates: Boolean = true,
    val locationUpdates: Boolean = true,
    val promotions: Boolean = false
)

class MainViewModel : ViewModel() {
    
    private val _menus = MutableStateFlow<List<MenuItem>>(emptyList())
    val menus: StateFlow<List<MenuItem>> = _menus.asStateFlow()
    
    private val _currentLocation = MutableStateFlow<Location?>(null)
    val currentLocation: StateFlow<Location?> = _currentLocation.asStateFlow()
    
    private val _notificationSettings = MutableStateFlow(NotificationSettings())
    val notificationSettings: StateFlow<NotificationSettings> = _notificationSettings.asStateFlow()
    
    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()
    
    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()
    
    private val apiService = ApiService()
    private val gson = Gson()
    
    init {
        loadInitialData()
    }
    
    private fun loadInitialData() {
        viewModelScope.launch {
            loadMenus()
            loadCurrentLocation()
        }
    }
    
    fun loadMenus() {
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null
            
            try {
                val response = apiService.getMenus()
                if (response.isSuccessful) {
                    val menuResponse = gson.fromJson(
                        response.body?.string(), 
                        MenuResponse::class.java
                    )
                    _menus.value = menuResponse.menus.map { 
                        MenuItem(
                            id = it.id,
                            name = it.name,
                            description = it.description,
                            price = it.price,
                            category = it.category,
                            isAvailable = it.isAvailable
                        )
                    }
                } else {
                    _error.value = "메뉴를 불러올 수 없습니다"
                }
            } catch (e: Exception) {
                _error.value = "네트워크 오류: ${e.message}"
            } finally {
                _isLoading.value = false
            }
        }
    }
    
    fun loadCurrentLocation() {
        viewModelScope.launch {
            try {
                val response = apiService.getCurrentLocation()
                if (response.isSuccessful) {
                    val locationResponse = gson.fromJson(
                        response.body?.string(),
                        LocationResponse::class.java
                    )
                    _currentLocation.value = Location(
                        id = locationResponse.location.id,
                        name = locationResponse.location.name,
                        address = locationResponse.location.address,
                        latitude = locationResponse.location.latitude,
                        longitude = locationResponse.location.longitude,
                        openTime = locationResponse.location.openTime,
                        closeTime = locationResponse.location.closeTime,
                        notice = locationResponse.location.notice
                    )
                }
            } catch (e: Exception) {
                _error.value = "위치 정보를 불러올 수 없습니다"
            }
        }
    }
    
    fun registerFCMToken(token: String, deviceType: String = "android") {
        viewModelScope.launch {
            try {
                val response = apiService.registerFCMToken(token, deviceType)
                if (response.isSuccessful) {
                    // 토큰 등록 성공
                } else {
                    _error.value = "푸시 알림 등록에 실패했습니다"
                }
            } catch (e: Exception) {
                _error.value = "푸시 알림 등록 오류: ${e.message}"
            }
        }
    }
    
    fun updateNotificationSettings(settings: NotificationSettings) {
        _notificationSettings.value = settings
        // 로컬 저장소에 저장 (SharedPreferences 등)
    }
    
    fun callPhone(phoneNumber: String, context: Context) {
        try {
            val intent = Intent(Intent.ACTION_CALL).apply {
                data = Uri.parse("tel:$phoneNumber")
            }
            context.startActivity(intent)
        } catch (e: Exception) {
            _error.value = "전화를 걸 수 없습니다: ${e.message}"
        }
    }
    
    fun openExternalLink(url: String, context: Context) {
        try {
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
            context.startActivity(intent)
        } catch (e: Exception) {
            _error.value = "링크를 열 수 없습니다: ${e.message}"
        }
    }
    
    fun clearError() {
        _error.value = null
    }
}

// API 응답 데이터 클래스
data class MenuResponse(
    val menus: List<MenuApiItem>
)

data class MenuApiItem(
    val id: String,
    val name: String,
    val description: String,
    val price: Int,
    val category: String,
    val isAvailable: Boolean
)

data class LocationResponse(
    val location: LocationApiItem
)

data class LocationApiItem(
    val id: String,
    val name: String,
    val address: String,
    val latitude: Double,
    val longitude: Double,
    val openTime: String,
    val closeTime: String,
    val notice: String
)



