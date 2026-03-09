import React, { useEffect, useState } from 'react';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { apiClient } from '../../lib/api-client';
import { useSessionsStore } from '../../stores/sessions-store';
import { useMessagesStore } from '../../stores/messages-store';
import { useUiStore } from '../../stores/ui-store';
import { MessageSent } from '../../types';
import { Loader } from '../components/Loader';
import { Send, Upload, Copy, CheckCircle2, XCircle, Clock } from 'lucide-react';

const textMessageSchema = z.object({
  to: z.string().regex(/^\+?\d{10,15}$/, 'Invalid phone number (E.164 format)'),
  text: z.string().min(1, 'Message is required'),
});

const mediaMessageSchema = z.object({
  to: z.string().regex(/^\+?\d{10,15}$/, 'Invalid phone number (E.164 format)'),
  base64: z.string().min(1, 'File is required'),
  mime: z.string().min(1, 'MIME type is required'),
  fileName: z.string().optional(),
  caption: z.string().optional(),
});

export const MessagesPage: React.FC = () => {
  const { sessions, setSessions } = useSessionsStore();
  const { messages, addMessage } = useMessagesStore();
  const { addToast } = useUiStore();

  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [textForm, setTextForm] = useState({ to: '', text: '' });
  const [mediaForm, setMediaForm] = useState({
    to: '',
    file: null as File | null,
    caption: '',
  });
  const [textLoading, setTextLoading] = useState(false);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [textErrors, setTextErrors] = useState<Record<string, string>>({});
  const [mediaErrors, setMediaErrors] = useState<Record<string, string>>({});
  const [idempotencyKey, setIdempotencyKey] = useState(uuidv4());

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const response = await apiClient.get('/sessions');
      setSessions(response.data);
    } catch (error: any) {
      addToast('error', error.message || 'Failed to load sessions');
    }
  };

  const readySessionsOnly = sessions.filter((s) => s.status === 'ready');

  const handleSendText = async (e: React.FormEvent) => {
    e.preventDefault();
    setTextErrors({});

    try {
      const validated = textMessageSchema.parse(textForm);
      
      if (!selectedSessionId) {
        addToast('error', 'Please select a session');
        return;
      }

      setTextLoading(true);
      const messageId = uuidv4();

      addMessage({
        id: messageId,
        to: validated.to,
        status: 'queued',
        type: 'text',
        content: validated.text,
        sentAt: new Date().toISOString(),
      });

      const response = await apiClient.post(
        `/sessions/${selectedSessionId}/messages/text`,
        validated,
        {
          headers: {
            'Idempotency-Key': idempotencyKey,
          },
        }
      );

      addMessage({
        id: messageId,
        jobId: response.data.jobId,
        to: validated.to,
        status: 'sent',
        type: 'text',
        content: validated.text,
        sentAt: new Date().toISOString(),
      });

      addToast('success', 'Message sent successfully');
      setTextForm({ to: '', text: '' });
      setIdempotencyKey(uuidv4());
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        const errorList = error.errors || error.issues || [];
        errorList.forEach((err: any) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as string] = err.message;
          }
        });
        setTextErrors(fieldErrors);
      } else {
        addToast('error', error.message || 'Failed to send message');
      }
    } finally {
      setTextLoading(false);
    }
  };

  const handleSendMedia = async (e: React.FormEvent) => {
    e.preventDefault();
    setMediaErrors({});

    try {
      if (!mediaForm.file) {
        setMediaErrors({ file: 'Please select a file' });
        return;
      }

      if (!selectedSessionId) {
        addToast('error', 'Please select a session');
        return;
      }

      setMediaLoading(true);

      const base64 = await fileToBase64(mediaForm.file);
      const validated = mediaMessageSchema.parse({
        to: mediaForm.to,
        base64,
        mime: mediaForm.file.type,
        fileName: mediaForm.file.name,
        caption: mediaForm.caption || undefined,
      });

      const messageId = uuidv4();
      const newIdempotencyKey = uuidv4();

      addMessage({
        id: messageId,
        to: validated.to,
        status: 'queued',
        type: 'media',
        content: validated.fileName || 'media',
        sentAt: new Date().toISOString(),
      });

      const response = await apiClient.post(
        `/sessions/${selectedSessionId}/messages/media`,
        validated,
        {
          headers: {
            'Idempotency-Key': newIdempotencyKey,
          },
        }
      );

      addMessage({
        id: messageId,
        jobId: response.data.jobId,
        to: validated.to,
        status: 'sent',
        type: 'media',
        content: validated.fileName || 'media',
        sentAt: new Date().toISOString(),
      });

      addToast('success', 'Media message sent successfully');
      setMediaForm({ to: '', file: null, caption: '' });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        const errorList = error.errors || error.issues || [];
        errorList.forEach((err: any) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as string] = err.message;
          }
        });
        setMediaErrors(fieldErrors);
      } else {
        addToast('error', error.message || 'Failed to send media');
      }
    } finally {
      setMediaLoading(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const copyIdempotencyKey = () => {
    navigator.clipboard.writeText(idempotencyKey);
    addToast('info', 'Idempotency key copied');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Messages</h1>
        <p className="text-gray-400 mt-1">Send text and media messages via WhatsApp</p>
      </div>

      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Select Session
          </label>
          <select
            value={selectedSessionId}
            onChange={(e) => setSelectedSessionId(e.target.value)}
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Choose a session...</option>
            {readySessionsOnly.map((session) => (
              <option key={session.id} value={session.id}>
                {session.name} {session.phoneNumber ? `(${session.phoneNumber})` : ''}
              </option>
            ))}
          </select>
          {readySessionsOnly.length === 0 && (
            <p className="mt-2 text-sm text-yellow-400">
              No ready sessions available. Please start a session first.
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Send Text Message</h3>
            <form onSubmit={handleSendText} className="space-y-4">
              <div>
                <label htmlFor="text-to" className="block text-sm font-medium text-gray-300 mb-2">
                  To (E.164 format)
                </label>
                <input
                  type="text"
                  id="text-to"
                  value={textForm.to}
                  onChange={(e) => setTextForm({ ...textForm, to: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="+5511999999999"
                />
                {textErrors.to && <p className="mt-1 text-sm text-red-400">{textErrors.to}</p>}
              </div>

              <div>
                <label htmlFor="text-message" className="block text-sm font-medium text-gray-300 mb-2">
                  Message
                </label>
                <textarea
                  id="text-message"
                  value={textForm.text}
                  onChange={(e) => setTextForm({ ...textForm, text: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Type your message..."
                />
                {textErrors.text && <p className="mt-1 text-sm text-red-400">{textErrors.text}</p>}
              </div>

              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span>Idempotency Key:</span>
                <code className="bg-gray-700 px-2 py-1 rounded">{idempotencyKey.slice(0, 8)}...</code>
                <button
                  type="button"
                  onClick={copyIdempotencyKey}
                  className="text-blue-400 hover:text-blue-300"
                >
                  <Copy className="w-3 h-3" />
                </button>
              </div>

              <button
                type="submit"
                disabled={textLoading || !selectedSessionId}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
              >
                {textLoading ? (
                  <>
                    <Loader size="sm" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Send Text</span>
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Send Media Message</h3>
            <form onSubmit={handleSendMedia} className="space-y-4">
              <div>
                <label htmlFor="media-to" className="block text-sm font-medium text-gray-300 mb-2">
                  To (E.164 format)
                </label>
                <input
                  type="text"
                  id="media-to"
                  value={mediaForm.to}
                  onChange={(e) => setMediaForm({ ...mediaForm, to: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="+5511999999999"
                />
                {mediaErrors.to && <p className="mt-1 text-sm text-red-400">{mediaErrors.to}</p>}
              </div>

              <div>
                <label htmlFor="media-file" className="block text-sm font-medium text-gray-300 mb-2">
                  File
                </label>
                <input
                  type="file"
                  id="media-file"
                  onChange={(e) =>
                    setMediaForm({ ...mediaForm, file: e.target.files?.[0] || null })
                  }
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-blue-600 file:text-white file:cursor-pointer hover:file:bg-blue-700"
                />
                {mediaForm.file && (
                  <p className="mt-1 text-sm text-gray-400">
                    {mediaForm.file.name} ({(mediaForm.file.size / 1024).toFixed(2)} KB)
                  </p>
                )}
                {mediaErrors.file && <p className="mt-1 text-sm text-red-400">{mediaErrors.file}</p>}
              </div>

              <div>
                <label htmlFor="media-caption" className="block text-sm font-medium text-gray-300 mb-2">
                  Caption (optional)
                </label>
                <input
                  type="text"
                  id="media-caption"
                  value={mediaForm.caption}
                  onChange={(e) => setMediaForm({ ...mediaForm, caption: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Optional caption..."
                />
              </div>

              <button
                type="submit"
                disabled={mediaLoading || !selectedSessionId}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
              >
                {mediaLoading ? (
                  <>
                    <Loader size="sm" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>Send Media</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Message History</h3>
        {messages.length === 0 ? (
          <p className="text-gray-400 text-center py-8">No messages sent yet</p>
        ) : (
          <div className="space-y-3">
            {messages.map((message) => (
              <div key={message.id} className="flex items-center gap-4 p-4 bg-gray-700 rounded-lg">
                <div className="flex-shrink-0">
                  {message.status === 'sent' ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  ) : message.status === 'error' ? (
                    <XCircle className="w-5 h-5 text-red-500" />
                  ) : (
                    <Clock className="w-5 h-5 text-yellow-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">To: {message.to}</span>
                    <span className="text-xs text-gray-400">
                      ({message.type})
                    </span>
                  </div>
                  <p className="text-sm text-gray-300 truncate">{message.content}</p>
                  {message.jobId && (
                    <p className="text-xs text-gray-500 mt-1">Job ID: {message.jobId}</p>
                  )}
                </div>
                <div className="text-xs text-gray-400">
                  {new Date(message.sentAt).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};