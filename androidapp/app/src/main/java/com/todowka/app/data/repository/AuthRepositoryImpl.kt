package com.todowka.app.data.repository

import com.todowka.app.data.local.db.TodowkaDatabase
import com.todowka.app.data.local.preferences.AuthPreferences
import com.todowka.app.data.local.preferences.UserPreferences
import com.todowka.app.data.remote.api.AuthApi
import com.todowka.app.data.remote.dto.request.ChangePasswordRequest
import com.todowka.app.data.remote.dto.request.DeleteAccountRequest
import com.todowka.app.data.remote.dto.request.LoginRequest
import com.todowka.app.data.remote.dto.request.RegisterRequest
import com.todowka.app.data.remote.dto.response.TokenResponse
import com.todowka.app.data.remote.dto.response.UserResponse
import com.todowka.app.domain.repository.AuthRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

class AuthRepositoryImpl(
    private val authApi: AuthApi,
    private val authPreferences: AuthPreferences,
    private val userPreferences: UserPreferences,
    private val db: TodowkaDatabase
) : AuthRepository {

    private val _isLoggedIn = MutableStateFlow(authPreferences.accessToken != null)
    override val isLoggedIn: StateFlow<Boolean> = _isLoggedIn.asStateFlow()

    private val _currentUser = MutableStateFlow<UserResponse?>(null)
    override val currentUser: StateFlow<UserResponse?> = _currentUser.asStateFlow()

    override suspend fun login(username: String, password: String): Result<UserResponse> {
        return try {
            val response = authApi.login(LoginRequest(username, password))
            if (response.isSuccessful) {
                val body = response.body() ?: return Result.failure(Exception("Empty response"))
                val accessToken = body.accessToken ?: return Result.failure(Exception("No access token"))
                val refreshToken = body.refreshToken ?: return Result.failure(Exception("No refresh token"))
                authPreferences.saveTokens(accessToken, refreshToken, body.user.id)
                _currentUser.value = body.user
                _isLoggedIn.value = true
                Result.success(body.user)
            } else {
                Result.failure(Exception(response.message()))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun register(username: String, email: String, password: String): Result<UserResponse> {
        return try {
            val response = authApi.register(RegisterRequest(username, email, password))
            if (response.isSuccessful) {
                val body = response.body() ?: return Result.failure(Exception("Empty response"))
                Result.success(body)
            } else {
                Result.failure(Exception(response.message()))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun logout() {
        try {
            authApi.logout()
        } catch (_: Exception) {
        }
        authPreferences.clearTokens()
        _currentUser.value = null
        _isLoggedIn.value = false
        db.clearAllTables()
    }

    override suspend fun refreshToken(): Result<TokenResponse> {
        return try {
            val token = authPreferences.refreshToken ?: return Result.failure(Exception("No refresh token"))
            val response = authApi.refresh("Bearer $token")
            if (response.isSuccessful) {
                val body = response.body() ?: return Result.failure(Exception("Empty response"))
                val accessToken = body.accessToken ?: return Result.failure(Exception("No access token"))
                val newRefreshToken = body.refreshToken ?: return Result.failure(Exception("No refresh token"))
                val userId = body.user.id
                authPreferences.saveTokens(accessToken, newRefreshToken, userId)
                _currentUser.value = body.user
                Result.success(body)
            } else {
                logout()
                Result.failure(Exception("Token refresh failed"))
            }
        } catch (e: Exception) {
            logout()
            Result.failure(e)
        }
    }

    override suspend fun getCurrentUser(): Result<UserResponse> {
        return try {
            val response = authApi.getMe()
            if (response.isSuccessful) {
                val body = response.body() ?: return Result.failure(Exception("Empty response"))
                _currentUser.value = body
                Result.success(body)
            } else {
                Result.failure(Exception(response.message()))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun changePassword(current: String, new: String): Result<Unit> {
        return try {
            val response = authApi.changePassword(ChangePasswordRequest(current, new))
            if (response.isSuccessful) {
                Result.success(Unit)
            } else {
                Result.failure(Exception(response.message()))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun deleteAccount(password: String): Result<Unit> {
        return try {
            val response = authApi.deleteAccount(DeleteAccountRequest(password))
            if (response.isSuccessful) {
                logout()
                Result.success(Unit)
            } else {
                Result.failure(Exception(response.message()))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
