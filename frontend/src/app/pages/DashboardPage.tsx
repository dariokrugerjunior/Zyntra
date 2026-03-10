import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { z } from 'zod';
import { Plus, Smartphone, Activity, QrCode, AlertCircle } from 'lucide-react';
import { apiClient } from '../../lib/api-client';
import { useSessionsStore } from '../../stores/sessions-store';
import { useUiStore } from '../../stores/ui-store';
import { Session } from '../../types';
import { Loader } from '../components/Loader';
import { Modal } from '../components/Modal';
import { StatusBadge } from '../components/StatusBadge';

const createSessionSchema = z.object({
  name: z.string().min(1, 'Nome obrigatorio'),
});

export const DashboardPage: React.FC = () => {
  const { sessions, setSessions, loading, setLoading } = useSessionsStore();
  const { addToast } = useUiStore();
  const [stats, setStats] = useState({
    total: 0,
    ready: 0,
    qr: 0,
    disconnected: 0,
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSessionName, setNewSessionName] = useState('');
  const [creating, setCreating] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    const total = sessions.length;
    const ready = sessions.filter((s) => s.status === 'ready').length;
    const qr = sessions.filter((s) => s.status === 'qr').length;
    const disconnected = sessions.filter((s) => s.status === 'disconnected' || s.status === 'stopped').length;
    setStats({ total, ready, qr, disconnected });
  }, [sessions]);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get<Session[]>('/sessions');
      setSessions(response.data);
    } catch (error: any) {
      addToast('error', error.message || 'Falha ao carregar sessoes');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    try {
      const validated = createSessionSchema.parse({ name: newSessionName });
      setCreating(true);

      const response = await apiClient.post<Session>('/sessions', validated);
      setSessions([response.data, ...sessions]);
      addToast('success', 'Sessao criada com sucesso');
      setShowCreateModal(false);
      setNewSessionName('');
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        const errorList = error.errors || error.issues || [];
        errorList.forEach((err: any) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(fieldErrors);
      } else {
        addToast('error', error.message || 'Falha ao criar sessao');
      }
    } finally {
      setCreating(false);
    }
  };

  const recentSessions = sessions.slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Painel</h1>
          <p className="text-gray-400 mt-1">Visao geral das suas sessoes de WhatsApp</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Criar Sessao</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-400">Total de Sessoes</h3>
            <Smartphone className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-3xl font-bold text-white">{stats.total}</p>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-400">Prontas</h3>
            <Activity className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-3xl font-bold text-white">{stats.ready}</p>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-400">QR Code</h3>
            <QrCode className="w-5 h-5 text-yellow-500" />
          </div>
          <p className="text-3xl font-bold text-white">{stats.qr}</p>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-400">Desconectadas</h3>
            <AlertCircle className="w-5 h-5 text-orange-500" />
          </div>
          <p className="text-3xl font-bold text-white">{stats.disconnected}</p>
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg border border-gray-700">
        <div className="p-6 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">Sessoes Recentes</h2>
        </div>
        <div className="p-6">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader />
            </div>
          ) : recentSessions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400">Nenhuma sessao ainda</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentSessions.map((session) => (
                <Link
                  key={session.id}
                  to={`/sessions/${session.id}`}
                  className="flex items-center justify-between p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  <div className="flex-1">
                    <h3 className="font-medium text-white">{session.name}</h3>
                    {session.phoneNumber && (
                      <p className="text-sm text-gray-400 mt-1">{session.phoneNumber}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <StatusBadge status={session.status} />
                    <p className="text-sm text-gray-400">
                      {new Date(session.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
          {recentSessions.length > 0 && (
            <div className="mt-6 text-center">
              <Link
                to="/sessions"
                className="text-blue-500 hover:text-blue-400 text-sm font-medium"
              >
                Ver todas as sessoes
              </Link>
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Criar Nova Sessao"
      >
        <form onSubmit={handleCreateSession} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
              Nome da Sessao
            </label>
            <input
              type="text"
              id="name"
              value={newSessionName}
              onChange={(e) => setNewSessionName(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ex: Suporte ao Cliente"
            />
            {errors.name && <p className="mt-1 text-sm text-red-400">{errors.name}</p>}
          </div>

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={creating}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              {creating ? (
                <>
                  <Loader size="sm" />
                  <span>Criando...</span>
                </>
              ) : (
                <span>Criar</span>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
