# Zyntra - WhatsApp Manager SaaS

Multi-tenant SaaS platform for managing WhatsApp sessions and message sending. Built with React, TypeScript, and TailwindCSS.

## Features

- **Authentication**: API Key or JWT-based authentication
- **Session Management**: Create, start, stop, and monitor WhatsApp sessions
- **QR Code Display**: Real-time QR code generation with automatic polling
- **Message Sending**: Send text and media messages with idempotency support
- **Webhook Management**: Configure webhooks for real-time event notifications
- **API Key Management**: Create and revoke API keys for authentication
- **Dark Mode**: Full dark mode support (default enabled)
- **Real-time Updates**: Automatic polling for session status updates
- **Responsive UI**: Clean, modern interface with loading states and error handling

## Tech Stack

- **React 18** with TypeScript
- **Vite** for fast development and building
- **TailwindCSS** for styling
- **Zustand** for state management
- **React Router** for navigation
- **Axios** for HTTP requests
- **Zod** for form validation
- **QRCode** library for QR code generation
- **Lucide React** for icons

## Prerequisites

- Node.js 18+ and npm/pnpm
- Backend API running (see backend documentation)

## Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Create `.env.local` file from example:

```bash
cp .env.example .env.local
```

4. Configure environment variables in `.env.local`:

```env
VITE_API_BASE_URL=http://localhost:3000
```

## Running the Application

### Development Mode

```bash
npm run dev
```

The application will start on `http://localhost:5173` (or next available port).

### Production Build

```bash
npm run build
```

Built files will be in the `dist/` directory.

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_BASE_URL` | Backend API base URL | `http://localhost:3000` |

## Project Structure

```
src/
├── app/
│   ├── components/       # Reusable UI components
│   │   ├── Layout.tsx    # Main layout with sidebar
│   │   ├── Modal.tsx     # Modal component
│   │   ├── Toast.tsx     # Toast notifications
│   │   ├── Loader.tsx    # Loading spinner
│   │   ├── StatusBadge.tsx
│   │   ├── EmptyState.tsx
│   │   └── TableSkeleton.tsx
│   ├── pages/            # Page components
│   │   ├── LoginPage.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── SessionsListPage.tsx
│   │   ├── SessionDetailPage.tsx
│   │   ├── MessagesPage.tsx
│   │   ├── WebhooksPage.tsx
│   │   ├── ApiKeysPage.tsx
│   │   └── SettingsPage.tsx
│   ├── routes.tsx        # Router configuration
│   └── App.tsx           # Main app component
├── stores/               # Zustand stores
│   ├── auth-store.ts
│   ├── sessions-store.ts
│   ├── webhooks-store.ts
│   ├── api-keys-store.ts
│   ├── messages-store.ts
│   └── ui-store.ts
├── lib/
│   └── api-client.ts     # Axios instance with interceptors
└── types/
    └── index.ts          # TypeScript types
```

## Key Features Explained

### Authentication

The app supports two authentication modes:
- **API Key**: Via `X-API-Key` header
- **JWT**: Via `Authorization: Bearer <token>` header

Credentials are stored in localStorage and automatically injected into API requests.

### Session Management

- Create and manage multiple WhatsApp sessions
- Real-time status updates with automatic polling (every 3s)
- QR code generation for WhatsApp connection
- Start/Stop session controls

### Message Sending

- Send text messages with phone number validation (E.164 format)
- Send media messages with file upload and base64 conversion
- Automatic idempotency key generation
- Message history with status tracking

### Webhooks

- Create webhooks with custom URLs and secrets
- Select specific events to listen to:
  - `session.qr`
  - `session.ready`
  - `session.disconnected`
  - `message.received`
  - `message.sent`
  - `message.error`
- Enable/disable webhooks
- Edit and delete webhooks

### API Keys

- Create named API keys
- View API key plaintext only once during creation
- Revoke API keys when no longer needed

## API Endpoints Expected

The frontend expects the following backend endpoints:

### Health
- `GET /health`

### API Keys
- `POST /api-keys` - Create API key
- `GET /api-keys` - List API keys
- `DELETE /api-keys/:id` - Revoke API key

### Sessions
- `POST /sessions` - Create session
- `GET /sessions` - List sessions
- `GET /sessions/:id` - Get session details
- `POST /sessions/:id/start` - Start session
- `POST /sessions/:id/stop` - Stop session
- `GET /sessions/:id/qr` - Get QR code
- `GET /sessions/:id/status` - Get session status

### Messages
- `POST /sessions/:id/messages/text` - Send text message
- `POST /sessions/:id/messages/media` - Send media message

### Webhooks
- `POST /webhooks` - Create webhook
- `GET /webhooks` - List webhooks
- `PATCH /webhooks/:id` - Update webhook
- `DELETE /webhooks/:id` - Delete webhook

## Development Notes

- Dark mode is enabled by default
- All forms include Zod validation
- API errors are handled globally via Axios interceptors
- 401/403 responses automatically redirect to login
- Session status polling is paused when not needed
- QR codes are generated client-side from text or displayed from base64

## Security

- API keys and tokens are stored in localStorage (MVP approach)
- Secrets are not logged to console
- Idempotency keys are auto-generated for message sending
- Logout clears all stored credentials

## Browser Support

Modern browsers with ES6+ support:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## License

Private project - All rights reserved
