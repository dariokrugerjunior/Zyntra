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

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}
