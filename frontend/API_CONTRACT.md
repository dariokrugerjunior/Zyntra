# API Contract Examples

This document shows the expected request/response formats for the backend API.

## Authentication Headers

### API Key
```
X-API-Key: your-api-key-here
```

### JWT
```
Authorization: Bearer your-jwt-token-here
```

## Sessions

### Create Session
**Request:**
```json
POST /sessions
{
  "name": "Customer Support"
}
```

**Response:**
```json
{
  "id": "session-123",
  "name": "Customer Support",
  "status": "created",
  "createdAt": "2026-03-02T10:00:00Z",
  "updatedAt": "2026-03-02T10:00:00Z"
}
```

### List Sessions
**Request:**
```
GET /sessions
```

**Response:**
```json
[
  {
    "id": "session-123",
    "name": "Customer Support",
    "status": "ready",
    "phoneNumber": "+5511999999999",
    "createdAt": "2026-03-02T10:00:00Z",
    "updatedAt": "2026-03-02T10:05:00Z"
  }
]
```

### Get Session
**Request:**
```
GET /sessions/session-123
```

**Response:**
```json
{
  "id": "session-123",
  "name": "Customer Support",
  "status": "ready",
  "phoneNumber": "+5511999999999",
  "createdAt": "2026-03-02T10:00:00Z",
  "updatedAt": "2026-03-02T10:05:00Z"
}
```

### Start Session
**Request:**
```
POST /sessions/session-123/start
```

**Response:**
```json
{
  "success": true,
  "message": "Session started"
}
```

### Stop Session
**Request:**
```
POST /sessions/session-123/stop
```

**Response:**
```json
{
  "success": true,
  "message": "Session stopped"
}
```

### Get QR Code
**Request:**
```
GET /sessions/session-123/qr
```

**Response (Text QR):**
```json
{
  "qrString": "2@abc123xyz..."
}
```

**Response (Base64 QR):**
```json
{
  "qrBase64": "data:image/png;base64,iVBORw0KGgo..."
}
```

### Get Status
**Request:**
```
GET /sessions/session-123/status
```

**Response:**
```json
{
  "status": "ready",
  "phoneNumber": "+5511999999999"
}
```

## Messages

### Send Text Message
**Request:**
```json
POST /sessions/session-123/messages/text
Headers:
  Idempotency-Key: uuid-v4-here

{
  "to": "+5511999999999",
  "text": "Hello World"
}
```

**Response:**
```json
{
  "id": "msg-123",
  "jobId": "job-456",
  "status": "queued"
}
```

### Send Media Message
**Request:**
```json
POST /sessions/session-123/messages/media
Headers:
  Idempotency-Key: uuid-v4-here

{
  "to": "+5511999999999",
  "base64": "iVBORw0KGgoAAAANSUhEUgA...",
  "mime": "image/png",
  "fileName": "photo.png",
  "caption": "Check this out!"
}
```

**Response:**
```json
{
  "id": "msg-124",
  "jobId": "job-457",
  "status": "queued"
}
```

## Webhooks

### Create Webhook
**Request:**
```json
POST /webhooks
{
  "url": "https://example.com/webhook",
  "secret": "webhook-secret-123",
  "events": [
    "session.ready",
    "message.received",
    "message.sent"
  ]
}
```

**Response:**
```json
{
  "id": "webhook-123",
  "url": "https://example.com/webhook",
  "secret": "webhook-secret-123",
  "events": [
    "session.ready",
    "message.received",
    "message.sent"
  ],
  "isActive": true,
  "createdAt": "2026-03-02T10:00:00Z",
  "updatedAt": "2026-03-02T10:00:00Z"
}
```

### List Webhooks
**Request:**
```
GET /webhooks
```

**Response:**
```json
[
  {
    "id": "webhook-123",
    "url": "https://example.com/webhook",
    "secret": "webhook-secret-123",
    "events": ["session.ready", "message.received"],
    "isActive": true,
    "createdAt": "2026-03-02T10:00:00Z",
    "updatedAt": "2026-03-02T10:00:00Z"
  }
]
```

### Update Webhook
**Request:**
```json
PATCH /webhooks/webhook-123
{
  "url": "https://example.com/new-webhook",
  "isActive": false,
  "events": ["session.ready"]
}
```

**Response:**
```json
{
  "id": "webhook-123",
  "url": "https://example.com/new-webhook",
  "secret": "webhook-secret-123",
  "events": ["session.ready"],
  "isActive": false,
  "createdAt": "2026-03-02T10:00:00Z",
  "updatedAt": "2026-03-02T10:15:00Z"
}
```

### Delete Webhook
**Request:**
```
DELETE /webhooks/webhook-123
```

**Response:**
```json
{
  "success": true,
  "message": "Webhook deleted"
}
```

## API Keys

### Create API Key
**Request:**
```json
POST /api-keys
{
  "name": "Production API Key"
}
```

**Response:**
```json
{
  "id": "key-123",
  "name": "Production API Key",
  "apiKeyPlaintext": "sk_live_abc123xyz789...",
  "createdAt": "2026-03-02T10:00:00Z"
}
```

**Note:** The `apiKeyPlaintext` is only returned once on creation.

### List API Keys
**Request:**
```
GET /api-keys
```

**Response:**
```json
[
  {
    "id": "key-123",
    "name": "Production API Key",
    "createdAt": "2026-03-02T10:00:00Z",
    "revokedAt": null
  },
  {
    "id": "key-124",
    "name": "Old Key",
    "createdAt": "2026-03-01T10:00:00Z",
    "revokedAt": "2026-03-02T09:00:00Z"
  }
]
```

### Revoke API Key
**Request:**
```
DELETE /api-keys/key-123
```

**Response:**
```json
{
  "success": true,
  "message": "API key revoked"
}
```

## Health Check

**Request:**
```
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-03-02T10:00:00Z"
}
```

## Error Responses

All error responses follow this format:

```json
{
  "error": "Error message",
  "message": "Detailed error description",
  "statusCode": 400
}
```

### Common Error Codes

- **400** - Bad Request (validation errors)
- **401** - Unauthorized (invalid or missing credentials)
- **403** - Forbidden (valid credentials but no permission)
- **404** - Not Found
- **500** - Internal Server Error

### Example Error Response

```json
{
  "error": "Validation Error",
  "message": "Invalid phone number format",
  "statusCode": 400,
  "details": {
    "field": "to",
    "issue": "Must be in E.164 format"
  }
}
```

## Session Status Values

- `created` - Session created but not started
- `starting` - Session is initializing
- `qr` - Waiting for QR code scan
- `ready` - Connected and ready to send messages
- `disconnected` - Connection lost
- `stopped` - Session manually stopped
- `error` - An error occurred

## Webhook Events

Available webhook events:
- `session.qr` - QR code generated
- `session.ready` - Session connected
- `session.disconnected` - Session disconnected
- `message.received` - Incoming message
- `message.sent` - Outgoing message sent
- `message.error` - Message sending failed

## Notes

1. All timestamps are in ISO 8601 format (UTC)
2. Phone numbers must be in E.164 format (+country_code + number)
3. The frontend generates UUID v4 for idempotency keys
4. Base64 strings for media should not include the data URL prefix
5. Session polling happens every 3 seconds when status is `starting` or `qr`
