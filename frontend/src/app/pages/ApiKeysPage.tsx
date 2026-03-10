import React, { useEffect, useState } from 'react';
import { z } from 'zod';
import { apiClient } from '../../lib/api-client';
import { useApiKeysStore } from '../../stores/api-keys-store';
import { useUiStore } from '../../stores/ui-store';
import { ApiKey, ApiKeyCreated } from '../../types';
import { Modal } from '../components/Modal';
import { Loader } from '../components/Loader';
import { EmptyState } from '../components/EmptyState';
import { TableSkeleton } from '../components/TableSkeleton';
import { Plus, Trash2, Key as KeyIcon, Copy, Eye, EyeOff } from 'lucide-react';

const createApiKeySchema = z.object({
  name: z.string().min(1, 'Nome obrigatorio'),
});

export const ApiKeysPage: React.FC = () => {
  const { apiKeys, setApiKeys, loading, setLoading, removeApiKey } = useApiKeysStore();
  const { addToast } = useUiStore();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [newKeyData, setNewKeyData] = useState<ApiKeyCreated | null>(null);
  const [keyName, setKeyName] = useState('');
  const [creating, setCreating] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPlaintext, setShowPlaintext] = useState(false);

  useEffect(() => {
    loadApiKeys();
  }, []);

  const loadApiKeys = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get<ApiKey[]>('/api-keys');
      setApiKeys(response.data);
    } catch (error: any) {
      addToast('error', error.message || 'Falha ao carregar chaves de API');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    try {
      const validated = createApiKeySchema.parse({ name: keyName });
      setCreating(true);

      const response = await apiClient.post<ApiKeyCreated>('/api-keys', validated);
      setNewKeyData(response.data);
      setApiKeys([{ id: response.data.id, name: response.data.name, createdAt: response.data.createdAt }, ...apiKeys]);
      addToast('success', 'Chave de API criada com sucesso');
      setShowCreateModal(false);
      setShowKeyModal(true);
      setKeyName('');
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
        addToast('error', error.message || 'Falha ao criar chave de API');
      }
    } finally {
      setCreating(false);
    }
  };

  const handleRevokeApiKey = async (id: string) => {
    if (!confirm('Tem certeza que deseja revogar esta chave de API? Esta acao nao pode ser desfeita.')) {
      return;
    }

    setActionLoading(id);
    try {
      await apiClient.delete(`/api-keys/${id}`);
      removeApiKey(id);
      addToast('success', 'Chave de API revogada com sucesso');
    } catch (error: any) {
      addToast('error', error.message || 'Falha ao revogar chave de API');
    } finally {
      setActionLoading(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    addToast('info', 'Copiado para a area de transferencia');
  };

  const closeKeyModal = () => {
    setShowKeyModal(false);
    setNewKeyData(null);
    setShowPlaintext(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Chaves de API</h1>
          <p className="text-gray-400 mt-1">Gerencie as chaves de API para autenticacao</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Criar Chave de API</span>
        </button>
      </div>

      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-6">
            <TableSkeleton rows={5} />
          </div>
        ) : apiKeys.length === 0 ? (
          <EmptyState
            title="Nenhuma chave de API ainda"
            description="Crie uma chave de API para autenticar requisicoes"
            icon={<KeyIcon className="w-12 h-12" />}
            action={
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Criar Chave de API
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
                    Criada Em
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Revogada Em
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Acoes
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {apiKeys.map((key) => (
                  <tr key={key.id} className="hover:bg-gray-700 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-medium text-white">{key.name}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          key.revokedAt
                            ? 'bg-red-600 text-red-200'
                            : 'bg-green-600 text-green-200'
                        }`}
                      >
                        {key.revokedAt ? 'Revogada' : 'Ativa'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-300">
                      {new Date(key.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-300">
                      {key.revokedAt ? new Date(key.revokedAt).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      {!key.revokedAt && (
                        <button
                          onClick={() => handleRevokeApiKey(key.id)}
                          disabled={actionLoading === key.id}
                          className="p-2 text-red-400 hover:text-red-300 hover:bg-gray-600 rounded transition-colors disabled:opacity-50"
                          title="Revogar"
                        >
                          {actionLoading === key.id ? (
                            <Loader size="sm" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      )}
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
        title="Criar Chave de API"
      >
        <form onSubmit={handleCreateApiKey} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
              Nome da Chave de API
            </label>
            <input
              type="text"
              id="name"
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ex: Chave de Producao"
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

      <Modal isOpen={showKeyModal} onClose={closeKeyModal} title="Chave de API Criada">
        {newKeyData && (
          <div className="space-y-4">
            <div className="bg-yellow-900 border border-yellow-700 rounded-lg p-4">
              <p className="text-yellow-200 text-sm font-medium">
                Importante: salve esta chave agora. Voce nao podera visualiza-la novamente.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Nome</label>
              <div className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white">
                {newKeyData.name}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">API Key</label>
              <div className="relative">
                <div className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white font-mono text-sm break-all pr-20">
                  {showPlaintext
                    ? newKeyData.apiKey
                    : '*'.repeat(newKeyData.apiKey.length)}
                </div>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPlaintext(!showPlaintext)}
                    className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-600 rounded transition-colors"
                    title={showPlaintext ? 'Ocultar' : 'Mostrar'}
                  >
                    {showPlaintext ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(newKeyData.apiKey)}
                    className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-600 rounded transition-colors"
                    title="Copiar"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={closeKeyModal}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Concluir
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
