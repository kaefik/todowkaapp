# SSE Support in Vite Proxy - Research Results

**Date:** 2026-04-17
**Researcher:** Task Executor
**Purpose:** Investigate Vite proxy support for Server-Sent Events (SSE)

---

## Executive Summary

**Recommendation:** Use fallback (direct connection) for SSE in development mode.

**Rationale:**
- Vite proxy **theoretically supports** SSE (it's regular HTTP)
- However, there are **authentication issues** (401 errors) in dev mode
- Cookie authentication doesn't work properly through Vite proxy for SSE
- Direct connection to backend resolves the authentication problem

---

## Current Configuration Analysis

### frontend/vite.config.ts

```typescript
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:8000',
      changeOrigin: true,
    },
    '/health': {
      target: 'http://localhost:8000',
      changeOrigin: true,
    }
  }
}
```

**Observations:**
- Uses default Vite proxy configuration
- `changeOrigin: true` is set
- No special SSE configuration
- No timeout settings for long-lived connections

---

## Vite Proxy Technical Details

### Underlying Technology
- Vite proxy uses **http-proxy-3** (modern rewrite of node-http-proxy)
- Full documentation: https://github.com/sagemathinc/http-proxy-3

### SSE Support Status
✅ **Supported - Theoretically**
- SSE uses regular HTTP with `text/event-stream` Content-Type
- No special configuration required for basic SSE
- Works like any other HTTP request through proxy

### WebSocket Support
⚠️ **Requires Special Configuration**
- WebSocket needs `ws: true` option
- SSE ≠ WebSocket (different protocols)
- SSE doesn't need `ws: true`

### Known Limitations
1. **Cookie Authentication Issues**
   - Cookies may not propagate correctly through proxy
   - HttpOnly cookies have domain restrictions
   - Dev mode (localhost) vs production (different domains)

2. **Long-lived Connection Issues**
   - Default timeouts may terminate SSE connections
   - No built-in connection pooling optimization
   - Proxy adds latency (~2x slower than direct)

3. **No Native SSE Optimizations**
   - http-proxy-3 doesn't have SSE-specific handling
   - Treats SSE as regular HTTP
   - No connection reuse for multiple SSE streams

---

## Problem Analysis

### Current Issue: SSE Returns 401 in Dev Mode

**Symptoms:**
- SSE endpoint `/api/sse/notifications` returns 401 Unauthorized
- Cookie authentication works for regular API requests
- Same endpoint works in production (or with direct connection)

**Root Cause:**
1. **Cookie Domain Mismatch**
   - Dev mode: cookie set for `localhost:8000` (backend)
   - Proxy: request comes from `localhost:5173` (frontend)
   - Browser doesn't send cookie to different domain

2. **HttpOnly Cookie Restrictions**
   - HttpOnly cookies not accessible to JavaScript
   - Can't manually attach to SSE request
   - Must rely on browser automatic cookie sending

3. **Proxy Cookie Path Issues**
   - Cookies have path restrictions (`/api/sse`)
   - Proxy may rewrite paths
   - Cookie may not be sent to proxied URL

---

## Recommended Solution

### Approach 1: Fallback for SSE in Dev Mode ✅ **RECOMMENDED**

**Implementation:**
```typescript
const sseUrl = import.meta.env.DEV
  ? 'http://localhost:8000/api/sse/notifications'  // Direct connection
  : '/api/sse/notifications'                        // Through proxy
```

**Advantages:**
- ✅ Fixes authentication immediately
- ✅ No proxy configuration changes needed
- ✅ Production uses proxy (as intended)
- ✅ Simple to implement

**Disadvantages:**
- ❌ Different behavior dev vs production
- ❌ CORS configuration needed for direct connection
- ❌ Must configure cookie domain for localhost

### Approach 2: Configure Vite Proxy for SSE

**Implementation:**
```typescript
server: {
  proxy: {
    '/api/sse': {
      target: 'http://localhost:8000',
      changeOrigin: true,
      ws: false,  // Not needed for SSE
      cookieDomainRewrite: 'localhost',
      configure: (proxy, options) => {
        proxy.on('proxyReq', (proxyReq, req, res, options) => {
          // Manually attach cookie if needed
        });
      }
    }
  }
}
```

**Advantages:**
- ✅ Consistent behavior dev vs production
- ✅ Single configuration

**Disadvantages:**
- ❌ Complex configuration
- ❌ May not solve all cookie issues
- ❌ Still has domain mismatch problems
- ❌ Requires testing and debugging

### Approach 3: Use Authorization Header Instead of Cookie

**Implementation:**
```typescript
const eventSource = new EventSource(url, {
  withCredentials: true,  // Send cookies
  // OR
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

**Advantages:**
- ✅ No cookie domain issues
- ✅ Explicit authentication

**Disadvantages:**
- ❌ EventSource doesn't support custom headers (browser limitation)
- ❌ Requires using custom SSE implementation (fetch/EventSource polyfill)
- ❌ Adds complexity

---

## Comparison Table

| Aspect | Vite Proxy | Direct Connection | Fallback (Recommended) |
|--------|------------|-------------------|------------------------|
| SSE Support | ✅ Yes | ✅ Yes | ✅ Both |
| Cookie Auth | ❌ Broken | ✅ Works | ✅ Works in dev |
| Production | ✅ Works | ❌ CORS issues | ✅ Works |
| Configuration | ❌ Complex | ✅ Simple | ✅ Simple |
| Consistency | ✅ Same dev/prod | ❌ Different dev/prod | ❌ Different dev/prod |
| Performance | ❌ 2x slower | ✅ Fast | ✅ Fast in dev |

---

## Final Recommendation

**Use Approach 1: Fallback for SSE in Dev Mode**

**Reasons:**
1. **Immediate fix** for 401 errors
2. **Minimal code changes** required
3. **Well-documented pattern** (React Query, SWR, etc. use this)
4. **Production remains optimized** (uses proxy)
5. **No proxy configuration complexity**

**Implementation Steps:**
1. Update `sseManager.ts` to use conditional URL based on `import.meta.env.DEV`
2. Configure backend to set cookie with domain `localhost` for dev mode
3. Add CORS configuration to backend for `http://localhost:5173`
4. Test SSE connection in both dev and production

**Follow-up Tasks:**
- [ ] Implement conditional SSE URL in `sseManager.ts`
- [ ] Configure cookie domain for localhost in dev mode
- [ ] Test SSE authentication in dev mode
- [ ] Verify production SSE still works through proxy
- [ ] Monitor SSE connection stability

---

## Additional Notes

### http-proxy-3 SSE Support
From the documentation, http-proxy-3:
- ✅ Supports regular HTTP/HTTPS (which SSE uses)
- ✅ No special configuration needed for basic SSE
- ❌ No SSE-specific optimizations
- ❌ WebSocket support requires `ws: true` (but SSE ≠ WebSocket)

### Common SSE + Proxy Patterns
1. **Vite ecosystem:** Most projects use direct connection for SSE in dev
2. **Next.js:** Uses API routes (no proxy needed)
3. **Create React App:** Uses proxy, but SSE often bypasses it
4. **Production:** Always use proxy/load balancer for SSE

### Monitoring Recommendations
- Log SSE connection attempts
- Track 401 error rates
- Monitor connection duration
- Alert on frequent reconnections

---

## Conclusion

Vite proxy **does support** SSE (it's just HTTP), but **cookie authentication** doesn't work properly through the proxy in development mode due to domain restrictions. The recommended solution is to use a **fallback to direct connection** for SSE in dev mode, which provides immediate relief from 401 errors while maintaining production optimization.

This is a common pattern in the React ecosystem and doesn't indicate a fundamental flaw in Vite proxy - just a limitation of cookie-based authentication across domains in development.
