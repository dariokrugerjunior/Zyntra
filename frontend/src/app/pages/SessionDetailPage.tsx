import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import QRCodeLib from 'qrcode';
import { ArrowLeft, Play, Square, MessageSquare, SendHorizontal, Trash2, Bot } from 'lucide-react';
import { apiClient } from '../../lib/api-client';
import { mapSessionQr } from '../../lib/api-mappers';
import { useUiStore } from '../../stores/ui-store';
import { Session, SessionAutoReplyConfig, SessionConversation, SessionMessage, SessionQR, SessionStatus } from '../../types';
import { Loader } from '../components/Loader';
import { StatusBadge } from '../components/StatusBadge';

export const SessionDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToast } = useUiStore();

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [qrData, setQrData] = useState<SessionQR | null>(null);
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<'details' | 'conversation' | 'prompt'>('details');
  const [conversations, setConversations] = useState<SessionConversation[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<SessionConversation | null>(null);
  const [conversationSearch, setConversationSearch] = useState('');
  const [syncState, setSyncState] = useState<'idle' | 'syncing' | 'done' | 'error'>('idle');

  const [messages, setMessages] = useState<SessionMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [conversationSendLoading, setConversationSendLoading] = useState(false);
  const [chatText, setChatText] = useState('');
  const [autoReplyConfig, setAutoReplyConfig] = useState<SessionAutoReplyConfig>({
    enabled: false,
    promptText: '',
    provider: 'mock',
    apiToken: '',
    updatedAt: null
  });
  const [autoReplyLoading, setAutoReplyLoading] = useState(false);
  const [autoReplySaving, setAutoReplySaving] = useState(false);
  const [lastStatusCheckAt, setLastStatusCheckAt] = useState<Date | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const conversationPollingRef = useRef<NodeJS.Timeout | null>(null);
  const autoSyncStartedRef = useRef<Record<string, boolean>>({});

  useEffect(() => {
    if (id) loadSession();
  }, [id]);

  useEffect(() => {
    if (session) {
      startPolling();
    } else {
      stopPolling();
    }

    return () => stopPolling();
  }, [session?.status]);

  useEffect(() => {
    if (qrData?.qrString && canvasRef.current) {
      generateQRCode(qrData.qrString);
    } else if (qrData?.qrBase64) {
      setQrImage(qrData.qrBase64);
    }
  }, [qrData]);

  useEffect(() => {
    if (!id || activeTab !== 'conversation') {
      stopConversationPolling();
      return;
    }

    loadConversations(true);
    startConversationPolling();

    return () => stopConversationPolling();
  }, [id, activeTab, conversationSearch, selectedConversation?.contact]);

  useEffect(() => {
    if (!id || activeTab !== 'conversation') return;
    if (autoSyncStartedRef.current[id]) return;
    autoSyncStartedRef.current[id] = true;
    triggerAutoSyncHistory();
  }, [id, activeTab]);

  useEffect(() => {
    if (activeTab === 'conversation' && selectedConversation) {
      loadMessages(true);
    }
  }, [selectedConversation?.contact]);

  useEffect(() => {
    if (!id || activeTab !== 'prompt') return;
    loadAutoReplyConfig();
  }, [id, activeTab]);

  const shouldPoll = (status: SessionStatus) => status === 'starting' || status === 'qr';

  const startPolling = () => {
    stopPolling();
    const interval = session && shouldPoll(session.status) ? 3000 : 10000;
    pollingIntervalRef.current = setInterval(() => {
      if (id) pollStatus();
    }, interval);
  };

  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  const startConversationPolling = () => {
    stopConversationPolling();
    conversationPollingRef.current = setInterval(() => {
      loadConversations(false);
      loadMessages(false);
    }, 5000);
  };

  const stopConversationPolling = () => {
    if (conversationPollingRef.current) {
      clearInterval(conversationPollingRef.current);
      conversationPollingRef.current = null;
    }
  };

  const pollStatus = async () => {
    if (!id) return;

    try {
      const statusResponse = await apiClient.get<{ status: SessionStatus; phoneNumber?: string }>(`/sessions/${id}/status`);

      setSession((prev) =>
        prev
          ? {
              ...prev,
              status: statusResponse.data.status,
              phoneNumber: statusResponse.data.phoneNumber || prev.phoneNumber
            }
          : null
      );
      setLastStatusCheckAt(new Date());

      if (statusResponse.data.status === 'qr') {
        try {
          const qrResponse = await apiClient.get<SessionQR>(`/sessions/${id}/qr`);
          setQrData(mapSessionQr(qrResponse.data as any));
        } catch {
          // ignore temporary qr fetch errors
        }
      } else {
        setQrData(null);
        setQrImage(null);
      }
    } catch {
      // ignore polling errors
    }
  };

  const loadSession = async () => {
    if (!id) return;

    setLoading(true);
    try {
      const response = await apiClient.get<Session>(`/sessions/${id}`);
      setSession(response.data);
      setLastStatusCheckAt(new Date());

      if (response.data.status === 'qr') {
        try {
          const qrResponse = await apiClient.get<SessionQR>(`/sessions/${id}/qr`);
          setQrData(mapSessionQr(qrResponse.data as any));
        } catch {
          // ignore temporary qr fetch errors
        }
      }
    } catch (error: any) {
      addToast('error', error.message || 'Failed to load session');
      navigate('/sessions');
    } finally {
      setLoading(false);
    }
  };

  const loadConversations = async (showLoader: boolean) => {
    if (!id || activeTab !== 'conversation') return;

    if (showLoader) setConversationsLoading(true);

    try {
      const params = new URLSearchParams();
      params.set('limit', '150');
      if (conversationSearch.trim()) params.set('search', conversationSearch.trim());

      const response = await apiClient.get<SessionConversation[]>(`/sessions/${id}/conversations?${params.toString()}`);
      const list = response.data;
      setConversations(list);
    } catch (error: any) {
      if (showLoader) addToast('error', error.message || 'Failed to load conversations');
    } finally {
      if (showLoader) setConversationsLoading(false);
    }
  };

  const loadMessages = async (showLoader: boolean) => {
    if (!id || !selectedConversation) return;

    if (showLoader) setMessagesLoading(true);

    try {
      const params = new URLSearchParams();
      params.set('limit', '120');
      params.set('with', selectedConversation.contact);

      const response = await apiClient.get<SessionMessage[]>(`/sessions/${id}/messages?${params.toString()}`);
      setMessages(response.data);
    } catch (error: any) {
      if (showLoader) addToast('error', error.message || 'Failed to load messages');
    } finally {
      if (showLoader) setMessagesLoading(false);
    }
  };

  const loadAutoReplyConfig = async () => {
    if (!id) return;
    setAutoReplyLoading(true);
    try {
      const response = await apiClient.get<SessionAutoReplyConfig>(`/sessions/${id}/auto-reply`);
      setAutoReplyConfig({
        enabled: response.data.enabled,
        promptText: response.data.promptText ?? '',
        provider: response.data.provider ?? 'mock',
        apiToken: response.data.apiToken ?? '',
        updatedAt: response.data.updatedAt ?? null
      });
    } catch (error: any) {
      addToast('error', error.message || 'Falha ao carregar configuracao de auto-resposta');
    } finally {
      setAutoReplyLoading(false);
    }
  };

  const handleSaveAutoReplyConfig = async () => {
    if (!id) return;
    if (autoReplyConfig.enabled && !String(autoReplyConfig.promptText ?? '').trim()) {
      addToast('error', 'Informe o texto de resposta quando auto-responder estiver ativo');
      return;
    }

    setAutoReplySaving(true);
    try {
      const response = await apiClient.put<SessionAutoReplyConfig>(`/sessions/${id}/auto-reply`, {
        enabled: autoReplyConfig.enabled,
        promptText: autoReplyConfig.promptText ?? '',
        provider: autoReplyConfig.provider,
        apiToken: autoReplyConfig.apiToken ?? ''
      });
      setAutoReplyConfig({
        enabled: response.data.enabled,
        promptText: response.data.promptText ?? '',
        provider: response.data.provider ?? 'mock',
        apiToken: response.data.apiToken ?? '',
        updatedAt: response.data.updatedAt ?? null
      });
      addToast('success', 'Configuracao de auto-resposta salva');
    } catch (error: any) {
      addToast('error', error.message || 'Falha ao salvar auto-resposta');
    } finally {
      setAutoReplySaving(false);
    }
  };

  const handleSendFromConversation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    if (!selectedConversation?.contact || !chatText.trim()) {
      addToast('error', 'Selecione uma conversa e digite uma mensagem');
      return;
    }

    if (session?.status !== 'ready') {
      addToast('error', 'Session must be ready to send messages');
      return;
    }

    setConversationSendLoading(true);
    try {
      await apiClient.post(
        `/sessions/${id}/messages/text`,
        { to: selectedConversation.contact, text: chatText.trim() },
        {
          headers: {
            'Idempotency-Key': `chat-${Date.now()}-${Math.random().toString(16).slice(2)}`
          }
        }
      );

      setChatText('');
      await loadMessages(false);
      await loadConversations(false);
      addToast('success', 'Mensagem enviada para fila');
    } catch (error: any) {
      addToast('error', error.message || 'Failed to send message');
    } finally {
      setConversationSendLoading(false);
    }
  };

  const triggerAutoSyncHistory = async () => {
    if (!id) return;

    setSyncState('syncing');
    try {
      await apiClient.post(`/sessions/${id}/sync-history`);
      await loadSession();
      await loadConversations(false);
      await loadMessages(false);
      setSyncState('done');
    } catch {
      // Keep UI silent; periodic polling and live events continue even if this call fails
      setSyncState('error');
    }
  };

  const messageBody = (message: SessionMessage) => {
    const payload = message.payload ?? {};
    const text = String(payload.text ?? '').trim();
    if (text) return text;

    const caption = String(payload.caption ?? '').trim();
    if (caption) return caption;

    const messageType = String(payload.messageType ?? '').trim();
    if (messageType === 'media') {
      const fileName = String(payload.fileName ?? '').trim();
      return fileName ? `[midia] ${fileName}` : '[midia]';
    }

    return '[sem texto]';
  };

  const generateQRCode = async (text: string) => {
    if (!canvasRef.current) return;

    try {
      await QRCodeLib.toCanvas(canvasRef.current, text, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
    } catch {
      addToast('error', 'Failed to generate QR code');
    }
  };

  const handleStartSession = async () => {
    if (!id) return;

    setActionLoading(true);
    try {
      await apiClient.post(`/sessions/${id}/start`);
      addToast('success', 'Session started');
      await loadSession();
    } catch (error: any) {
      addToast('error', error.message || 'Failed to start session');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStopSession = async () => {
    if (!id) return;

    setActionLoading(true);
    try {
      await apiClient.post(`/sessions/${id}/stop`);
      addToast('success', 'Session stopped');
      stopPolling();
      await loadSession();
    } catch (error: any) {
      addToast('error', error.message || 'Failed to stop session');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteSession = async () => {
    if (!id) return;
    const confirmed = window.confirm('Excluir esta sessao e todos os dados dela? Esta acao nao pode ser desfeita.');
    if (!confirmed) return;

    setActionLoading(true);
    try {
      await apiClient.delete(`/sessions/${id}`);
      addToast('success', 'Sessao excluida com sucesso');
      navigate('/sessions');
    } catch (error: any) {
      addToast('error', error.message || 'Failed to delete session');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader size="lg" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">Session not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/sessions')} className="p-2 hover:bg-gray-700 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">{session.name}</h1>
          <p className="text-gray-400 mt-1">Session Details</p>
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg border border-gray-700 p-2 inline-flex gap-2">
        <button
          onClick={() => setActiveTab('details')}
          className={`px-4 py-2 rounded-md text-sm ${activeTab === 'details' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
        >
          Detalhes
        </button>
        <button
          onClick={() => setActiveTab('conversation')}
          className={`px-4 py-2 rounded-md text-sm flex items-center gap-2 ${activeTab === 'conversation' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
        >
          <MessageSquare className="w-4 h-4" />
          Conversa
        </button>
        <button
          onClick={() => setActiveTab('prompt')}
          className={`px-4 py-2 rounded-md text-sm flex items-center gap-2 ${activeTab === 'prompt' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
        >
          <Bot className="w-4 h-4" />
          Prompt
        </button>
      </div>

      {activeTab === 'conversation' && (
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-3 space-y-3">
            <input
              type="text"
              value={conversationSearch}
              onChange={(e) => setConversationSearch(e.target.value)}
              placeholder="Buscar contato"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            />
            <p className="text-xs text-gray-400">
              {syncState === 'syncing' && 'Sincronizando conversas automaticamente...'}
              {syncState === 'done' && 'Sincronizacao automatica concluida.'}
              {syncState === 'error' && 'Falha na sincronizacao automatica (seguindo com polling/eventos).'}
              {syncState === 'idle' && 'A sincronizacao inicia automaticamente ao abrir esta aba.'}
            </p>
            {conversationsLoading ? (
              <div className="flex justify-center py-8">
                <Loader size="lg" />
              </div>
            ) : conversations.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Nenhuma conversa sincronizada.</p>
            ) : (
              <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
                {conversations.map((item) => (
                  <button
                    key={item.id}
                    onClick={() =>
                      setSelectedConversation((prev) => (prev?.contact === item.contact ? null : item))
                    }
                    className={`w-full text-left p-3 rounded-lg border ${
                      selectedConversation?.contact === item.contact
                        ? 'bg-blue-600/30 border-blue-500'
                        : 'bg-gray-700 border-gray-600 hover:bg-gray-650'
                    }`}
                  >
                    <p className="text-sm font-medium text-white truncate">{item.contact}</p>
                    <p className="text-xs text-gray-300 truncate mt-1">{item.lastPreview}</p>
                    <p className="text-[11px] text-gray-400 mt-1">
                      {new Date(item.lastMessageAt).toLocaleString()} - {item.totalMessages} msgs
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 flex flex-col">
            {!selectedConversation ? (
              <div className="flex-1 flex items-center justify-center text-gray-400">Selecione uma conversa</div>
            ) : (
              <>
                <div className="pb-3 border-b border-gray-700">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-white font-medium">{selectedConversation.contact}</p>
                      <p className="text-xs text-gray-400">Responda nesta conversa diretamente.</p>
                    </div>
                    <button
                      onClick={() => setSelectedConversation(null)}
                      className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded text-gray-200"
                    >
                      Limpar selecao
                    </button>
                  </div>
                </div>

                <div className="flex-1 py-3 overflow-y-auto space-y-2 max-h-[460px]">
                  {messagesLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader size="lg" />
                    </div>
                  ) : messages.length === 0 ? (
                    <p className="text-gray-400 text-center py-8">Sem mensagens nesta conversa.</p>
                  ) : (
                    [...messages].reverse().map((item) => (
                      <div
                        key={item.id}
                        className={`max-w-[85%] rounded-lg px-3 py-2 ${
                          item.direction === 'out' ? 'ml-auto bg-blue-600 text-white' : 'mr-auto bg-gray-700 text-gray-100'
                        }`}
                      >
                        <p className="text-sm break-words">{messageBody(item)}</p>
                        <p className="text-[11px] mt-1 opacity-80">{new Date(item.createdAt).toLocaleString()}</p>
                      </div>
                    ))
                  )}
                </div>

                <form onSubmit={handleSendFromConversation} className="pt-3 border-t border-gray-700 flex gap-2">
                  <input
                    type="text"
                    value={chatText}
                    onChange={(e) => setChatText(e.target.value)}
                    placeholder="Escreva uma mensagem"
                    className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                  <button
                    type="submit"
                    disabled={conversationSendLoading || session.status !== 'ready'}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-lg text-white flex items-center gap-2"
                  >
                    {conversationSendLoading ? <Loader size="sm" /> : <SendHorizontal className="w-4 h-4" />}
                    <span>Enviar</span>
                  </button>
                </form>
                {session.status !== 'ready' && (
                  <p className="text-xs text-yellow-400 mt-2">A sessao precisa estar ready para enviar mensagens.</p>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {activeTab === 'prompt' && (
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 space-y-4">
          {autoReplyLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader size="lg" />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white">Auto-responder</h2>
                  <p className="text-sm text-gray-400">
                    Quando ativo, toda mensagem recebida na sessao gera resposta automatica (modo mock).
                  </p>
                </div>
                <label className="inline-flex items-center gap-2 text-sm text-gray-200">
                  <input
                    type="checkbox"
                    checked={autoReplyConfig.enabled}
                    onChange={(e) => setAutoReplyConfig((prev) => ({ ...prev, enabled: e.target.checked }))}
                  />
                  Ativo
                </label>
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-2">Texto/Prompt da resposta</label>
                <textarea
                  value={autoReplyConfig.promptText ?? ''}
                  onChange={(e) => setAutoReplyConfig((prev) => ({ ...prev, promptText: e.target.value }))}
                  maxLength={10000}
                  rows={6}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="Ex: Responda de forma cordial em portugues, com no maximo 2 frases..."
                />
                <p className="mt-1 text-xs text-gray-400">
                  {(autoReplyConfig.promptText ?? '').length}/10000 caracteres
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-2">Provedor IA</label>
                  <select
                    value={autoReplyConfig.provider}
                    onChange={(e) =>
                      setAutoReplyConfig((prev) => ({
                        ...prev,
                        provider: (e.target.value as 'mock' | 'openai') ?? 'mock'
                      }))
                    }
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  >
                    <option value="mock">Mock (sem IA real)</option>
                    <option value="openai">OpenAI (placeholder)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-2">Token API (opcional por enquanto)</label>
                  <input
                    type="password"
                    value={autoReplyConfig.apiToken ?? ''}
                    onChange={(e) => setAutoReplyConfig((prev) => ({ ...prev, apiToken: e.target.value }))}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    placeholder="sk-..."
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400">
                  Ultima atualizacao: {autoReplyConfig.updatedAt ? new Date(autoReplyConfig.updatedAt).toLocaleString() : 'nunca'}
                </p>
                <button
                  onClick={handleSaveAutoReplyConfig}
                  disabled={autoReplySaving}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-lg text-white"
                >
                  {autoReplySaving ? 'Salvando...' : 'Salvar Configuracao'}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'details' && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Information</h2>
              <div className="space-y-4">
                <div>
                  <span className="text-sm text-gray-400">Status</span>
                  <div className="mt-1">
                    <StatusBadge status={session.status} />
                  </div>
                </div>
                <div>
                  <span className="text-sm text-gray-400">Phone Number</span>
                  <p className="mt-1 text-white">{session.phoneNumber || 'Not connected'}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-400">Created At</span>
                  <p className="mt-1 text-white">{new Date(session.createdAt).toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-400">Updated At</span>
                  <p className="mt-1 text-white">{new Date(session.updatedAt).toLocaleString()}</p>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                {session.status === 'ready' || session.status === 'qr' || session.status === 'starting' ? (
                  <button
                    onClick={handleStopSession}
                    disabled={actionLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
                  >
                    {actionLoading ? (
                      <>
                        <Loader size="sm" />
                        <span>Stopping...</span>
                      </>
                    ) : (
                      <>
                        <Square className="w-4 h-4" />
                        <span>Stop Session</span>
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={handleStartSession}
                    disabled={actionLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
                  >
                    {actionLoading ? (
                      <>
                        <Loader size="sm" />
                        <span>Starting...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4" />
                        <span>Start Session</span>
                      </>
                    )}
                  </button>
                )}
                <button
                  onClick={handleDeleteSession}
                  disabled={actionLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-red-700 hover:bg-red-800 disabled:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Excluir Sessao</span>
                </button>
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-white mb-4">QR Code</h2>
              {session.status === 'qr' && (qrData?.qrString || qrData?.qrBase64) ? (
                <div className="flex flex-col items-center">
                  {qrData.qrString && <canvas ref={canvasRef} className="bg-white p-4 rounded-lg" />}
                  {qrData.qrBase64 && !qrData.qrString && (
                    <img src={qrData.qrBase64} alt="QR Code" className="max-w-full h-auto rounded-lg" />
                  )}
                  <p className="mt-4 text-sm text-gray-400 text-center">Scan this QR code with WhatsApp to connect</p>
                </div>
              ) : session.status === 'starting' ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader size="lg" />
                  <p className="mt-4 text-sm text-gray-400">Starting session...</p>
                </div>
              ) : session.status === 'ready' ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <p className="text-green-500 font-medium mb-2">Connected</p>
                  <p className="text-sm text-gray-400">Session is ready to send messages</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <p className="text-gray-400 mb-2">No QR code available</p>
                  <p className="text-sm text-gray-500">Start the session to generate QR code</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Recent Events</h2>
            <div className="text-sm text-gray-400">
              <p>Status polling active: Yes ({shouldPoll(session.status) ? 'every 3s' : 'every 10s'})</p>
              <p className="mt-2">Last status check: {lastStatusCheckAt ? lastStatusCheckAt.toLocaleTimeString() : '-'}</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

