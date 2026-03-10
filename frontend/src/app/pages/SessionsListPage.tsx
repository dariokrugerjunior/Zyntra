import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { z } from 'zod';
import { Plus, Eye, Play, Square, Smartphone } from 'lucide-react';
import { apiClient } from '../../lib/api-client';
import { useSessionsStore } from '../../stores/sessions-store';
import { useUiStore } from '../../stores/ui-store';
import { Session } from '../../types';
import { Loader } from '../components/Loader';
import { Modal } from '../components/Modal';
import { StatusBadge } from '../components/StatusBadge';
import { EmptyState } from '../components/EmptyState';
import { TableSkeleton } from '../components/TableSkeleton';

const createSessionSchema = z.object({
  name: z.string().min(1, 'Nome obrigatorio'),
});

export const SessionsListPage: React.FC = () => {
  const { sessions, setSessions, loading, setLoading } = useSessionsStore();
  const { addToast } = useUiStore();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSessionName, setNewSessionName] = useState('');
  const [creating, setCreating] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadSessions();
  }, []);

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

  const handleStartSession = async (sessionId: string) => {
    setActionLoading(sessionId);
    try {
      await apiClient.post(`/sessions/${sessionId}/start`);
      addToast('success', 'Sessao iniciada');
      await loadSessions();
    } catch (error: any) {
      addToast('error', error.message || 'Falha ao iniciar sessao');
    } finally {
      setActionLoading(null);
    }
  };

  const handleStopSession = async (sessionId: string) => {
    setActionLoading(sessionId);
    try {
      await apiClient.post(`/sessions/${sessionId}/stop`);
      addToast('success', 'Sessao parada');
      await loadSessions();
    } catch (error: any) {
      addToast('error', error.message || 'Falha ao parar sessao');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Sessoes</h1>
          <p className="text-gray-400 mt-1">Gerencie suas sessoes de WhatsApp</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Criar Sessao</span>
        </button>
      </div>

      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-6">
            <TableSkeleton rows={5} />
          </div>
        ) : sessions.length === 0 ? (
          <EmptyState
            title="Nenhuma sessao ainda"
            description="Crie sua primeira sessao de WhatsApp para comecar"
            icon={<Smartphone className="w-12 h-12" />}
            action={
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Criar Sessao
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Nome
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Numero de Telefone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Atualizado Em
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Acoes
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {sessions.map((session) => (
                  <tr key={session.id} className="hover:bg-gray-700 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-medium text-white">{session.name}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={session.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-300">
                      {session.phoneNumber || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-300">
                      {new Date(session.updatedAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/sessions/${session.id}`}
                          className="p-2 text-blue-400 hover:text-blue-300 hover:bg-gray-600 rounded transition-colors"
                          title="Ver Detalhes"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        {session.status === 'ready' || session.status === 'qr' ? (
                          <button
                            onClick={() => handleStopSession(session.id)}
                            disabled={actionLoading === session.id}
                            className="p-2 text-red-400 hover:text-red-300 hover:bg-gray-600 rounded transition-colors disabled:opacity-50"
                            title="Parar Sessao"
                          >
                            {actionLoading === session.id ? (
                              <Loader size="sm" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleStartSession(session.id)}
                            disabled={actionLoading === session.id}
                            className="p-2 text-green-400 hover:text-green-300 hover:bg-gray-600 rounded transition-colors disabled:opacity-50"
                            title="Iniciar Sessao"
                          >
                            {actionLoading === session.id ? (
                              <Loader size="sm" />
                            ) : (
                              <Play className="w-4 h-4" />
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
