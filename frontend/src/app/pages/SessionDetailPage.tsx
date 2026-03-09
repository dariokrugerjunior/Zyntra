import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router';
import QRCodeLib from 'qrcode';
import { ArrowLeft, Play, Square, RefreshCw, Trash2, Smartphone, CheckCircle, AlertCircle } from 'lucide-react';
import { apiClient } from '../../lib/api-client';
import { mapSessionQr } from '../../lib/api-mappers';
import { useUiStore } from '../../stores/ui-store';
import { Session, SessionStatus, SessionQR } from '../../types';
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (id) {
      loadSession();
    }
  }, [id]);

  useEffect(() => {
    if (session && shouldPoll(session.status)) {
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

  const shouldPoll = (status: SessionStatus) => {
    return status === 'starting' || status === 'qr';
  };

  const startPolling = () => {
    stopPolling();
    pollingIntervalRef.current = setInterval(() => {
      if (id) {
        pollStatus();
      }
    }, 3000);
  };

  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  const pollStatus = async () => {
    if (!id) return;

    try {
      const statusResponse = await apiClient.get<{ status: SessionStatus; phoneNumber?: string }>(
        `/sessions/${id}/status`
      );
      
      setSession((prev) =>
        prev
          ? {
              ...prev,
              status: statusResponse.data.status,
              phoneNumber: statusResponse.data.phoneNumber || prev.phoneNumber,
            }
          : null
      );

      if (statusResponse.data.status === 'qr') {
        try {
          const qrResponse = await apiClient.get<SessionQR>(`/sessions/${id}/qr`);
          setQrData(mapSessionQr(qrResponse.data as any));
        } catch (error) {
          // QR may not be available yet
        }
      } else {
        setQrData(null);
        setQrImage(null);
      }
    } catch (error: any) {
      // Silently fail during polling
    }
  };

  const loadSession = async () => {
    if (!id) return;

    setLoading(true);
    try {
      const response = await apiClient.get<Session>(`/sessions/${id}`);
      setSession(response.data);

      if (response.data.status === 'qr') {
        try {
          const qrResponse = await apiClient.get<SessionQR>(`/sessions/${id}/qr`);
          setQrData(mapSessionQr(qrResponse.data as any));
        } catch (error) {
          // QR may not be available yet
        }
      }
    } catch (error: any) {
      addToast('error', error.message || 'Failed to load session');
      navigate('/sessions');
    } finally {
      setLoading(false);
    }
  };

  const generateQRCode = async (text: string) => {
    if (!canvasRef.current) return;

    try {
      await QRCodeLib.toCanvas(canvasRef.current, text, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });
    } catch (error) {
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
        <button
          onClick={() => navigate('/sessions')}
          className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">{session.name}</h1>
          <p className="text-gray-400 mt-1">Session Details</p>
        </div>
      </div>

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
              onClick={loadSession}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">QR Code</h2>
          {session.status === 'qr' && (qrData?.qrString || qrData?.qrBase64) ? (
            <div className="flex flex-col items-center">
              {qrData.qrString && (
                <canvas ref={canvasRef} className="bg-white p-4 rounded-lg" />
              )}
              {qrData.qrBase64 && !qrData.qrString && (
                <img src={qrData.qrBase64} alt="QR Code" className="max-w-full h-auto rounded-lg" />
              )}
              <p className="mt-4 text-sm text-gray-400 text-center">
                Scan this QR code with WhatsApp to connect
              </p>
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
          <p>Status polling active: {shouldPoll(session.status) ? 'Yes (every 3s)' : 'No'}</p>
          <p className="mt-2">Last status check: {new Date().toLocaleTimeString()}</p>
        </div>
      </div>
    </div>
  );
};
