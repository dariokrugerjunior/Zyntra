# Quick Start Guide

## Running the Application

1. **Install dependencies** (if not done yet):
   ```bash
   npm install
   ```

2. **Start the development server**:
   ```bash
   npm run dev
   ```

3. **Open in browser**:
   The app will be available at `http://localhost:5173`

## First Time Setup

### 1. Login
- The app will redirect you to the login page
- Choose authentication mode:
  - **API Key**: Enter your backend API key
  - **JWT**: Enter your JWT token
- Click "Sign In"

### 2. Create a Session
- Navigate to "Sessions" in the sidebar
- Click "Create Session"
- Enter a name (e.g., "My WhatsApp")
- Click "Create"

### 3. Connect WhatsApp
- Click on your session to view details
- Click "Start Session"
- Wait for the QR code to appear
- Scan the QR code with WhatsApp on your phone
- Wait for status to change to "Ready"

### 4. Send Messages
- Navigate to "Messages" in the sidebar
- Select your ready session
- Enter phone number in E.164 format (e.g., +5511999999999)
- Type your message
- Click "Send Text"

### 5. Configure Webhooks (Optional)
- Navigate to "Webhooks" in the sidebar
- Click "Create Webhook"
- Enter your webhook URL
- Click "Generate" to create a secret
- Select events you want to receive
- Click "Create"

## Testing Without Backend

If you want to test the UI without a backend:

1. The app will show errors when making API calls
2. You can still navigate through all pages
3. Forms will validate correctly
4. UI components are fully functional

## Development Tips

- Use the browser DevTools to inspect API calls
- Check the browser console for any errors
- All state is persisted in localStorage
- Use the "Clear Local Data" button in Settings to reset

## Common Issues

### "Authentication failed"
- Check that your backend is running
- Verify the API base URL in `.env`
- Ensure your API key or JWT is valid

### "Failed to load sessions"
- Verify backend connectivity
- Check if you have proper permissions
- Review network tab in DevTools

### QR code not showing
- Ensure session status is "qr"
- Check backend logs for QR generation
- Try stopping and restarting the session

## Environment Variables

Create a `.env` file in the root directory:

```env
VITE_API_BASE_URL=http://localhost:3000
```

Replace `http://localhost:3000` with your backend URL.

## Features Overview

### Dashboard
- Overview of all sessions
- Quick statistics (total, ready, QR, disconnected)
- Recent sessions list

### Sessions
- Create/manage sessions
- Start/stop sessions
- View QR codes
- Real-time status updates

### Messages
- Send text messages
- Send media messages (with file upload)
- Message history
- Idempotency key generation

### Webhooks
- Create/edit webhooks
- Enable/disable webhooks
- Event selection
- Secret generation

### API Keys
- Create API keys
- View active/revoked keys
- One-time plaintext display
- Revoke keys

### Settings
- View API configuration
- Toggle dark mode
- Clear local data
- System information
