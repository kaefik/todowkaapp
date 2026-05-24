package com.todowka.app.domain.repository

import com.todowka.app.data.remote.dto.response.TokenResponse
import com.todowka.app.data.remote.dto.response.UserResponse
import kotlinx.coroutines.flow.StateFlow

interface AuthRepository {
    suspend fun login(username: String, password: String): Result<UserResponse>
    suspend fun register(username: String, email: String, password: String): Result<UserResponse>
    suspend fun logout()
    suspend fun refreshToken(): Result<TokenResponse>
    suspend fun getCurrentUser(): Result<UserResponse>
    suspend fun changePassword(current: String, new: String): Result<Unit>
    suspend fun deleteAccount(password: String): Result<Unit>
    suspend fun enterGuestMode()
    val isLoggedIn: StateFlow<Boolean>
    val isGuestMode: StateFlow<Boolean>
    val currentUser: StateFlow<UserResponse?>
}
