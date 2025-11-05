# Add project-specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Keep line number information for debugging stack traces
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# Firebase Cloud Messaging
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.firebase.**
-dontwarn com.google.android.gms.**

# Keep Firebase messaging classes and methods
-keepclassmembers class com.google.firebase.messaging.FirebaseMessaging { *; }
-keepclassmembers class com.google.firebase.messaging.FirebaseMessagingService { *; }
-keep class com.foodtruck.app.services.FoodTruckFirebaseMessagingService { *; }

# Keep MainActivity and all its methods
-keep class com.foodtruck.app.MainActivity { *; }
-keepclassmembers class com.foodtruck.app.MainActivity {
    *;
}

# Keep Application class
-keep class com.foodtruck.app.FoodTruckApplication { *; }

# WebView JavaScript interface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep WebView related classes
-keep class android.webkit.** { *; }
-keep class androidx.webkit.** { *; }

# Keep Compose related classes
-keep class androidx.compose.** { *; }
-dontwarn androidx.compose.**

# Keep Gson classes
-keep class com.google.gson.** { *; }
-keep class * implements com.google.gson.TypeAdapterFactory
-keep class * implements com.google.gson.JsonSerializer
-keep class * implements com.google.gson.JsonDeserializer

# Keep OkHttp
-keep class okhttp3.** { *; }
-dontwarn okhttp3.**



