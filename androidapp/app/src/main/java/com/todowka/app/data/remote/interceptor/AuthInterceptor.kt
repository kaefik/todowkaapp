package com.todowka.app.data.remote.interceptor

import okhttp3.Interceptor
import okhttp3.Request
import okhttp3.Response

class AuthInterceptor(
    private val getToken: () -> String?
) : Interceptor {

    override fun intercept(chain: Interceptor.Chain): Response {
        val originalRequest = chain.request()
        val token = getToken()

        if (token == null || isSkippedPath(originalRequest)) {
            return chain.proceed(originalRequest)
        }

        val authenticatedRequest = originalRequest.newBuilder()
            .header("Authorization", "Bearer $token")
            .header("X-Requested-With", "XMLHttpRequest")
            .build()

        return chain.proceed(authenticatedRequest)
    }

    private fun isSkippedPath(request: Request): Boolean {
        val path = request.url.encodedPath
        return path.contains("/api/auth/login") ||
                path.contains("/api/auth/register") ||
                path.contains("/api/auth/refresh") ||
                path.contains("/api/config")
    }
}
