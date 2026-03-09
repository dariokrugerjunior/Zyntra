export type AuthMode = 'api-key' | 'jwt';

export type SessionStatus = 
  | 'created' 
  | 'starting' 
  | 'qr' 
  | 'ready' 
  | 'disconnected' 
  | 'stopped' 
  | 'error';

export interface Session {
  id: string;
  name: string;
  status: SessionStatus;
  phoneNumber?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SessionQR {
  qr?: string;
  qrString?: string;
  qrBase64?: string;
}

export interface ApiKey {
  id: string;
  name: string;
  createdAt: string;
  revokedAt?: string;
}

export interface ApiKeyCreated extends ApiKey {
  apiKey: string;
}

export interface Webhook {
  id: string;
  url: string;
  secret: string;
  events: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MessageSent {
  id?: string;
  jobId?: string;
  to: string;
  status: 'queued' | 'sent' | 'error';
  type: 'text' | 'media';
  content: string;
  sentAt: string;
  error?: string;
}

export interface SessionMessage {
  id: string;
  direction: 'in' | 'out';
  to?: string | null;
  from?: string | null;
  waMessageId?: string | null;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface SessionConversation {
  id: string;
  contact: string;
  lastMessageAt: string;
  lastDirection: 'in' | 'out';
  lastPreview: string;
  totalMessages: number;
}

export interface SessionAutoReplyConfig {
  enabled: boolean;
  promptText: string | null;
  provider: 'mock' | 'openai';
  apiToken: string | null;
  updatedAt: string | null;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}
