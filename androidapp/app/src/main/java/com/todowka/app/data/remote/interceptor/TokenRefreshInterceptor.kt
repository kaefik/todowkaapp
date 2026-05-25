package com.todowka.app.data.remote.interceptor

import okhttp3.Interceptor
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.Response
import org.json.JSONObject

class TokenRefreshInterceptor(
    private val getRefreshToken: () -> String?,
    private val saveTokens: (accessToken: String, refreshToken: String) -> Unit,
    private val onLogout: () -> Unit
) : Interceptor {

    override fun intercept(chain: Interceptor.Chain): Response {
        val originalRequest = chain.request()
        val response = chain.proceed(originalRequest)

        if (response.code != 401) {
            return response
        }

        val path = originalRequest.url.encodedPath
        if (path == "/api/auth/login" || path == "/api/auth/register" || path == "/api/auth/refresh") {
            return response
        }

        response.close()

        val refreshToken = getRefreshToken()
        if (refreshToken == null) {
            onLogout()
            return response
        }

        val refreshUrl = originalRequest.url.newBuilder()
            .scheme(originalRequest.url.scheme)
            .host(originalRequest.url.host)
            .port(originalRequest.url.port)
            .encodedPath("/api/auth/refresh")
            .build()

        val refreshRequest = Request.Builder()
            .url(refreshUrl)
            .post("".toRequestBody("application/json".toMediaType()))
            .header("Authorization", "Bearer $refreshToken")
            .header("X-Client-Type", "android")
            .build()

        try {
            val refreshResponse = chain.proceed(refreshRequest)
            if (refreshResponse.isSuccessful) {
                val body = refreshResponse.body?.string() ?: run {
                    onLogout()
                    return response
                }

                val json = JSONObject(body)
                val newAccessToken = json.optString("access_token", null) ?: run {
                    onLogout()
                    return response
                }
                val newRefreshToken = json.optString("refresh_token", null) ?: run {
                    onLogout()
                    return response
                }

                saveTokens(newAccessToken, newRefreshToken)

                val newRequest = originalRequest.newBuilder()
                    .header("Authorization", "Bearer $newAccessToken")
                    .build()

                return chain.proceed(newRequest)
            } else {
                refreshResponse.close()
                onLogout()
                return response
            }
        } catch (_: Exception) {
            onLogout()
            return response
        }
    }
}
