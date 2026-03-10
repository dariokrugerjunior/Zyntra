# Troubleshooting Guide

## Common Issues and Solutions

### 1. Application Won't Start

**Symptom:** Error when running `npm run dev`

**Solutions:**
- Ensure Node.js 18+ is installed: `node --version`
- Delete `node_modules` and reinstall: 
  ```bash
  rm -rf node_modules
  npm install
  ```
- Check for port conflicts (default: 5173)
- Verify `.env.local` file exists and is properly formatted

### 2. Authentication Issues

#### "Authentication failed"
**Causes:**
- Backend not running
- Invalid API key or JWT
- Wrong API base URL

**Solutions:**
1. Check backend is running at the URL in `.env.local`
2. Test backend health: `curl http://localhost:3000/health`
3. Verify your credentials are valid
4. Check browser console for detailed error messages

#### Automatic logout
**Causes:**
- Token expired (JWT)
- API key revoked
- 401/403 response from backend

**Solutions:**
1. Generate new credentials
2. Check token expiration time
3. Verify API key is not revoked

### 3. Session Issues

#### QR Code Not Appearing
**Causes:**
- Session not in `qr` status
- Backend not generating QR
- QR endpoint returning error

**Solutions:**
1. Check session status in detail page
2. Verify backend logs for QR generation
3. Try stopping and restarting the session
4. Check browser console for API errors

#### Session Stuck in "Starting"
**Causes:**
- Backend initialization issue
- WhatsApp connection problems
- Timeout

**Solutions:**
1. Wait 30 seconds for status to update
2. Stop the session and start again
3. Check backend logs
4. Verify backend WhatsApp integration is working

#### Polling Not Working
**Causes:**
- JavaScript disabled
- Tab in background (some browsers throttle)
- Network issues

**Solutions:**
1. Keep tab in foreground
2. Check browser console for errors
3. Manually refresh using the "Refresh" button

### 4. Message Sending Issues

#### "Failed to send message"
**Causes:**
- Session not in `ready` status
- Invalid phone number format
- Network error
- Backend issue

**Solutions:**
1. Verify session status is "Ready"
2. Check phone number format: `+5511999999999` (E.164)
3. Review backend logs
4. Try sending again (idempotency key prevents duplicates)

#### Media Upload Fails
**Causes:**
- File too large
- Invalid MIME type
- Base64 conversion error

**Solutions:**
1. Reduce file size (< 16MB recommended)
2. Use common formats (JPEG, PNG, PDF, etc.)
3. Check browser console for conversion errors

### 5. Webhook Issues

#### Webhooks Not Firing
**Causes:**
- Webhook inactive
- Invalid URL
- Backend not configured to send webhooks
- Events not selected

**Solutions:**
1. Verify webhook is "Active"
2. Test URL accessibility
3. Check selected events match triggered events
4. Review backend webhook configuration

#### "Invalid URL" Error
**Causes:**
- Malformed URL
- Missing protocol (http/https)
- Localhost URL (may not work from remote backend)

**Solutions:**
1. Use full URL with protocol: `https://example.com/webhook`
2. For local testing, use ngrok or similar
3. Validate URL format

### 6. UI Issues

#### Dark Mode Not Working
**Causes:**
- LocalStorage disabled
- Browser compatibility

**Solutions:**
1. Enable localStorage in browser settings
2. Clear browser cache
3. Use modern browser (Chrome 90+, Firefox 88+, Safari 14+)

#### Sidebar Collapsed/Not Showing
**Causes:**
- Small screen size
- localStorage corruption

**Solutions:**
1. Click the menu toggle button
2. Clear local data in Settings
3. Increase window size

#### Toasts Not Appearing
**Causes:**
- z-index conflict
- Browser extensions blocking

**Solutions:**
1. Disable browser extensions temporarily
2. Check browser console for errors
3. Refresh the page

### 7. Performance Issues

#### Slow Loading
**Causes:**
- Large number of sessions/messages
- Slow backend response
- Network latency

**Solutions:**
1. Check network tab in DevTools
2. Optimize backend queries
3. Consider pagination (future enhancement)

#### High Memory Usage
**Causes:**
- Too many messages in history
- Memory leak in polling

**Solutions:**
1. Refresh the page
2. Message history is limited to 100 items
3. Stop unnecessary polling by navigating away from detail page

### 8. Data Issues

#### Data Not Persisting
**Causes:**
- LocalStorage disabled/full
- Private browsing mode
- Browser clearing data

**Solutions:**
1. Enable localStorage
2. Disable private browsing
3. Check storage quota: 
   ```javascript
   console.log(navigator.storage.estimate())
   ```

#### "Clear Local Data" Not Working
**Causes:**
- Browser blocking localStorage access
- JavaScript error

**Solutions:**
1. Manually clear: Browser DevTools > Application > Local Storage
2. Use incognito/private window
3. Clear browser cache entirely

### 9. Network Issues

#### CORS Errors
**Causes:**
- Backend not configured for CORS
- Wrong origin

**Solutions:**
1. Configure backend CORS headers
2. Add frontend URL to backend allowed origins
3. Check preflight OPTIONS requests

#### Request Timeout
**Causes:**
- Backend too slow
- Network latency
- Large payload

**Solutions:**
1. Backend should respond within 30 seconds
2. Check network connection
3. Reduce file size for media uploads

### 10. Development Issues

#### TypeScript Errors
**Causes:**
- Missing types
- Version mismatch

**Solutions:**
1. Run `npm install` to ensure all types are installed
2. Restart TypeScript server in IDE
3. Check `tsconfig.json` configuration

#### Build Fails
**Causes:**
- TypeScript errors
- Missing dependencies
- Environment variables not set

**Solutions:**
1. Fix all TypeScript errors
2. Run `npm install`
3. Set required environment variables
4. Check `vite.config.ts`

## Debug Mode

### Enable Detailed Logging

Add this to your `.env.local`:
```env
VITE_DEBUG=true
```

### Browser DevTools

1. **Network Tab**: Monitor API calls and responses
2. **Console Tab**: View errors and logs
3. **Application Tab**: Inspect localStorage
4. **React DevTools**: Inspect component state

### Check API Client

In browser console:
```javascript
// Check stored auth
localStorage.getItem('auth-storage')

// Check current API base URL
import.meta.env.VITE_API_BASE_URL
```

## Getting Help

If issues persist:

1. Check the README.md for configuration details
2. Review API_CONTRACT.md for expected backend behavior
3. Check browser console for detailed errors
4. Review backend logs for server-side issues
5. Verify all environment variables are set correctly
6. Test backend endpoints directly with curl or Postman

## Logs to Collect

When reporting issues, include:

1. Browser console output
2. Network tab showing failed requests
3. Backend logs (if available)
4. Steps to reproduce
5. Environment details:
   - Node version
   - Browser version
   - Operating system
   - Package versions

## Reset Everything

Nuclear option if nothing else works:

```bash
# Clear all local data
localStorage.clear() # In browser console

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Reset environment
rm .env.local
cp .env.example .env.local
# Edit .env.local with correct values

# Restart development server
npm run dev
```
