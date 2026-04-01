# Authentication Specification

## Overview

JWT-based authentication with refresh token mechanism for enhanced security and multi-device support.

## Architecture

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ 1. Register/Login
       ↓
┌─────────────┐
│   Backend   │
└──────┬──────┘
       │ 2. Access Token (JWT) + Refresh Token
       ↓
┌─────────────────────────┐
│   HttpOnly Cookies     │
│   - access_token       │
│   - refresh_token     │
└─────────────────────────┘
       │ 3. Access Token sent with requests
       ↓
┌─────────────┐
│   Backend   │
└──────┬──────┘
       │ 4. Token expired
       ↓
┌─────────────┐
│  Refresh    │
│  Endpoint   │
└──────┬──────┘
       │ 5. New tokens
       ↓
┌─────────────────────────┐
│   Updated Cookies      │
└─────────────────────────┘
```

## Tokens

### Access Token

**Purpose:** Short-lived authentication token for API requests

**Format:** JWT (JSON Web Token)

**Payload:**
```json
{
  "sub": "user_id",
  "email": "user@example.com",
  "session_id": "refresh_token_id",
  "exp": 1712040000,
  "iat": 1712036400,
  "type": "access"
}
```

**Expiration:** 15 minutes (configurable)

**Storage:** HttpOnly cookie

**Cookie Details:**
- Name: `access_token`
- HttpOnly: true (XSS protection)
- Secure: true (HTTPS only in production)
- SameSite: Lax (CSRF protection)
- Path: `/`
- Max-Age: 900 (15 minutes)

### Refresh Token

**Purpose:** Long-lived token for obtaining new access tokens

**Format:** 64-character URL-safe random string

**Generation:**
```python
import secrets

raw_token = secrets.token_urlsafe(64)
# Example: "xK9mN2pQ5vR8sT1wY4zB7cD0fG3hJ6kM9nP2qR5sT8uV1wX4zA7bC0dF3gH6j"
```

**Hashing:**
```python
import hmac
import hashlib
import hashlib

hash_key = "SECRET_HASH_KEY_FROM_ENV"
token_hash = hmac.new(
    hash_key.encode(),
    raw_token.encode(),
    hashlib.sha256
).hexdigest()
```

**Storage:** Database (hashed) + HttpOnly cookie (plain)

**Database Table:** `refresh_tokens`

**Cookie Details:**
- Name: `refresh_token`
- HttpOnly: true
- Secure: true
- SameSite: Lax
- Path: `/api/v1/auth/refresh` (restricted path)
- Max-Age: 2,592,000 (30 days)

**Expiration:** 30 days (configurable)

## Authentication Flow

### 1. Registration

**Endpoint:** `POST /api/v1/auth/register`

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

**Backend Process:**
1. Validate email format and uniqueness
2. Validate password requirements (min 8 chars, 1 uppercase, 1 lowercase, 1 digit)
3. Hash password (bcrypt/argon2)
4. Create user record
5. Create initial refresh token (optional)
6. Generate access token
7. Set cookies
8. Return user data

**Response:**
```json
{
  "id": 1,
  "email": "user@example.com",
  "created_at": "2026-04-01T10:00:00Z",
  "updated_at": "2026-04-01T10:00:00Z"
}
```

**Cookies Set:**
- `access_token`: JWT
- `refresh_token`: Plain token (path: `/api/v1/auth/refresh`)

### 2. Login

**Endpoint:** `POST /api/v1/auth/login`

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

**Backend Process:**
1. Find user by email
2. Verify password hash
3. Extract device info:
   - User-Agent
   - IP address
   - Parse device name (e.g., "Chrome on Windows")
4. Create refresh token in database:
   - Hash token using SECRET_KEY
   - Store: user_id, device_name, user_agent, ip_address, expires_at
5. Generate access token (JWT)
6. Set cookies
7. Return user data with refresh_token_id

**Device Name Parsing:**
```javascript
function parseUserAgent(userAgent) {
  if (!userAgent) return "Unknown Device";

  const ua = userAgent.toLowerCase();
  let browser = "Unknown Browser";
  let os = "Unknown OS";

  if (ua.includes("edg")) browser = "Edge";
  else if (ua.includes("chrome")) browser = "Chrome";
  else if (ua.includes("firefox")) browser = "Firefox";
  else if (ua.includes("safari")) browser = "Safari";
  else if (ua.includes("opera")) browser = "Opera";

  if (ua.includes("windows")) os = "Windows";
  else if (ua.includes("mac")) os = "macOS";
  else if (ua.includes("linux")) os = "Linux";
  else if (ua.includes("android")) os = "Android";
  else if (ua.includes("iphone") || ua.includes("ipad")) os = "iOS";

  return `${browser} on ${os}`;
}
```

**Response:**
```json
{
  "refresh_token_id": 42,
  "token_type": "bearer",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "created_at": "2026-04-01T10:00:00Z",
    "updated_at": "2026-04-01T10:00:00Z"
  }
}
```

### 3. Access Protected Resource

**Request:**
```
GET /api/v1/tasks
Cookie: access_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Backend Process:**
1. Extract access_token from cookie
2. Verify JWT signature (using SECRET_KEY)
3. Check expiration
4. Extract user_id from `sub` claim
5. Verify session exists (optional, check refresh_tokens table)
6. Add user_id to request context
7. Process request
8. Return response

**Error Handling:**
- Invalid token: 401 Unauthorized
- Expired token: 401 Unauthorized (client should refresh)
- Revoked session: 401 Unauthorized

### 4. Refresh Token

**Endpoint:** `POST /api/v1/auth/refresh`

**Request:**
```
Cookie: refresh_token=xK9mN2pQ5vR8sT1wY4zB7cD0fG3hJ6kM9nP2qR5sT8uV1wX4zA7bC0dF3gH6j
```

**Backend Process:**
1. Extract refresh_token from cookie
2. Hash the token using SECRET_KEY
3. Look up token in database:
   ```sql
   SELECT * FROM refresh_tokens
   WHERE token_hash = ?
     AND user_id = ?
     AND is_revoked = false
     AND expires_at > NOW()
   ```
4. Verify token exists and is valid
5. Create NEW refresh token:
   - Generate new raw token
   - Hash new token
   - Store in database
   - Update last_used_at
   - Mark old token as revoked (token rotation)
6. Generate new access token (JWT)
7. Set new cookies
8. Return user data

**Response:**
```json
{
  "refresh_token_id": 43,
  "token_type": "bearer",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "created_at": "2026-04-01T10:00:00Z",
    "updated_at": "2026-04-01T10:00:00Z"
  }
}
```

**Cookies Updated:**
- `access_token`: New JWT
- `refresh_token`: New plain token

**Token Rotation:** Always issue new refresh token and revoke old one

### 5. Logout

**Endpoint:** `POST /api/v1/auth/logout`

**Request:**
```
Cookie: access_token=...; refresh_token=...
```

**Backend Process:**
1. Extract access_token from cookie
2. Decode JWT to get session_id
3. Mark refresh token as revoked:
   ```sql
   UPDATE refresh_tokens
   SET is_revoked = true, revoked_at = NOW()
   WHERE id = ? AND user_id = ?
   ```
4. Clear cookies
5. Return success message

**Response:**
```json
{
  "message": "Logged out successfully"
}
```

**Cookies Cleared:**
- `access_token`
- `refresh_token`

## Session Management

### Get All Sessions

**Endpoint:** `GET /api/v1/auth/sessions`

**Backend Process:**
1. Extract user_id from JWT
2. Get current token's session_id from JWT
3. Query all valid sessions:
   ```sql
   SELECT * FROM refresh_tokens
   WHERE user_id = ?
     AND is_revoked = false
     AND expires_at > NOW()
   ORDER BY last_used_at DESC
   ```
4. Mark current session with `is_current: true`

**Response:**
```json
{
  "sessions": [
    {
      "id": 42,
      "device_name": "Chrome on Windows",
      "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0.4472.124",
      "ip_address": "192.168.1.100",
      "last_used_at": "2026-04-01T12:00:00Z",
      "created_at": "2026-04-01T10:00:00Z",
      "is_current": true
    },
    {
      "id": 40,
      "device_name": "Safari on iOS",
      "user_agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) Safari/605.1.15",
      "ip_address": "192.168.1.101",
      "last_used_at": "2026-04-01T11:00:00Z",
      "created_at": "2026-04-01T08:00:00Z",
      "is_current": false
    }
  ]
}
```

### Revoke All Sessions

**Endpoint:** `DELETE /api/v1/auth/sessions/all`

**Backend Process:**
1. Extract user_id from JWT
2. Get current session_id from JWT
3. Revoke all sessions except current:
   ```sql
   UPDATE refresh_tokens
   SET is_revoked = true, revoked_at = NOW()
   WHERE user_id = ?
     AND id != ?
     AND is_revoked = false
   ```
4. Return count

**Response:**
```json
{
  "message": "Revoked 3 sessions"
}
```

### Revoke Specific Session

**Endpoint:** `DELETE /api/v1/auth/sessions/{session_id}`

**Backend Process:**
1. Extract user_id from JWT
2. Get current session_id from JWT
3. Validate: cannot revoke current session
4. Mark session as revoked:
   ```sql
   UPDATE refresh_tokens
   SET is_revoked = true, revoked_at = NOW()
   WHERE id = ? AND user_id = ?
   ```
5. Return success

**Response:**
```json
{
  "message": "Session revoked"
}
```

**Error (404):** Session not found
**Error (400):** Cannot revoke current session (use logout)

## Security Considerations

### 1. Password Hashing

**Algorithm:** bcrypt or argon2

**Example (bcrypt):**
```python
import bcrypt

password = "SecurePass123"
salt = bcrypt.gensalt()
password_hash = bcrypt.hashpw(password.encode('utf-8'), salt)

# Verify
bcrypt.checkpw(password.encode('utf-8'), password_hash)
```

**Work Factor:** 12 rounds (configurable)

### 2. JWT Secret

**Requirements:**
- Minimum 32 characters
- Randomly generated
- Stored in environment variable: `SECRET_KEY`
- Never commit to version control

**Example:**
```bash
SECRET_KEY=$(openssl rand -base64 32)
```

### 3. Refresh Token Hash Key

**Requirements:**
- Minimum 32 characters
- Different from JWT secret
- Stored in environment variable: `REFRESH_TOKEN_HASH_KEY`

**Purpose:** Hash refresh tokens before storing in database

### 4. HttpOnly Cookies

**Why:**
- Prevents XSS attacks from stealing tokens
- JavaScript cannot access cookies

**Trade-off:** Requires CSRF protection (SameSite=Lax)

### 5. SameSite Cookies

**Options:**
- `Strict`: Best security, but breaks some redirects
- `Lax`: Good balance, recommended
- `None`: Required for cross-site cookies (must use Secure)

**Recommendation:** Lax for most applications

### 6. Secure Cookies

**Development:** `Secure: false` (HTTP)
**Production:** `Secure: true` (HTTPS)

### 7. Cookie Path Restriction

**Access Token:** Path `/` (accessible everywhere)
**Refresh Token:** Path `/api/v1/auth/refresh` (restricted to refresh endpoint only)

### 8. Token Rotation

**Why:** Prevent token theft and replay attacks

**Implementation:** Always issue new refresh token and revoke old one on refresh

### 9. Expiration

**Access Token:** Short-lived (15 minutes)
**Refresh Token:** Long-lived (30 days)

**Trade-off:** More frequent refresh requests vs. better security

### 10. Rate Limiting

**Endpoints:**
- `/auth/register`: 5 requests per hour per IP
- `/auth/login`: 10 requests per minute per IP
- `/auth/refresh`: 100 requests per minute per IP

### 11. IP Tracking

**Purpose:** Detect suspicious activity

**Implementation:** Store IP address on login/refresh, alert on changes

## Client-Side Implementation

### Automatic Token Refresh

**Pattern:**
1. Intercept API requests
2. Check if access token expired (401 response)
3. Call refresh endpoint
4. Retry original request with new token
5. If refresh fails, redirect to login

**Example (JavaScript):**
```javascript
let isRefreshing = false;
let refreshSubscribers = [];

function subscribeTokenRefresh(cb) {
  refreshSubscribers.push(cb);
}

function onRefreshed(token) {
  refreshSubscribers.forEach(cb => cb(token));
  refreshSubscribers = [];
}

async function fetchWithAuth(url, options) {
  const response = await fetch(url, {
    ...options,
    credentials: 'include'  // Send cookies
  });

  if (response.status === 401 && !isRefreshing) {
    isRefreshing = true;

    try {
      const refreshResponse = await fetch('/api/v1/auth/refresh', {
        method: 'POST',
        credentials: 'include'
      });

      if (refreshResponse.ok) {
        onRefreshed();
        // Retry original request
        return fetch(url, options);
      } else {
        // Refresh failed, redirect to login
        window.location.href = '/login';
        throw new Error('Refresh failed');
      }
    } finally {
      isRefreshing = false;
    }
  }

  return response;
}
```

### Initialize on App Load

```javascript
useEffect(() => {
  // Check if user is authenticated
  const checkAuth = async () => {
    try {
      const response = await fetch('/api/v1/auth/me', {
        credentials: 'include'
      });

      if (response.ok) {
        const user = await response.json();
        setUser(user);
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  checkAuth();
}, []);
```

### Logout Handler

```javascript
async function logout() {
  try {
    await fetch('/api/v1/auth/logout', {
      method: 'POST',
      credentials: 'include'
    });
  } catch (error) {
    console.error('Logout failed:', error);
  } finally {
    setUser(null);
    setIsAuthenticated(false);
    // Redirect to login
    window.location.href = '/login';
  }
}
```

## Environment Variables

**Required:**
```
SECRET_KEY=your-jwt-secret-key-min-32-chars
REFRESH_TOKEN_HASH_KEY=your-refresh-token-hash-key-min-32-chars
```

**Optional (with defaults):**
```
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=30
COOKIE_SECURE=false  # Set to true in production
COOKIE_DOMAIN=       # Leave empty for localhost
COOKIE_SAMESITE=Lax
```

## Testing Authentication

### 1. Register
```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass123"}' \
  -c cookies.txt
```

### 2. Login
```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass123"}' \
  -c cookies.txt
```

### 3. Access Protected Resource
```bash
curl http://localhost:8000/api/v1/tasks \
  -b cookies.txt
```

### 4. Refresh Token
```bash
curl -X POST http://localhost:8000/api/v1/auth/refresh \
  -b cookies.txt \
  -c cookies.txt
```

### 5. Logout
```bash
curl -X POST http://localhost:8000/api/v1/auth/logout \
  -b cookies.txt
```

## Common Issues

### 1. Token Expired During Request

**Symptom:** 401 error mid-request

**Solution:** Implement automatic token refresh on client

### 2. Cross-Origin Cookie Issues

**Symptom:** Cookies not sent

**Solution:** Check CORS configuration, credentials, SameSite settings

### 3. Refresh Token Stolen

**Mitigation:**
- Token rotation (issue new on each refresh)
- Short expiration (30 days)
- Revoke all sessions on security event

### 4. Multiple Tabs Open

**Symptom:** Race conditions on refresh

**Solution:** Implement refresh queue/subscribers pattern

### 5. Session Persistence

**Symptom:** User logged out unexpectedly

**Solution:** Ensure cookies persist across restarts (not session cookies)

## Best Practices

1. **Never store tokens in localStorage** (vulnerable to XSS)
2. **Always use HttpOnly cookies** for token storage
3. **Implement automatic token refresh** on client
4. **Log security events** (failed logins, IP changes)
5. **Implement rate limiting** on auth endpoints
6. **Use HTTPS in production**
7. **Rotate secrets periodically**
8. **Implement device fingerprinting** (optional)
9. **Notify users of new logins**
10. **Provide logout from all devices** feature
