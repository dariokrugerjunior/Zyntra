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
  name: z.string().min(1, 'Name is required'),
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
      addToast('error', error.message || 'Failed to load API keys');
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
      addToast('success', 'API key created successfully');
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
        addToast('error', error.message || 'Failed to create API key');
      }
    } finally {
      setCreating(false);
    }
  };

  const handleRevokeApiKey = async (id: string) => {
    if (!confirm('Are you sure you want to revoke this API key? This action cannot be undone.')) {
      return;
    }

    setActionLoading(id);
    try {
      await apiClient.delete(`/api-keys/${id}`);
      removeApiKey(id);
      addToast('success', 'API key revoked successfully');
    } catch (error: any) {
      addToast('error', error.message || 'Failed to revoke API key');
    } finally {
      setActionLoading(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    addToast('info', 'Copied to clipboard');
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
          <h1 className="text-2xl font-bold text-white">API Keys</h1>
          <p className="text-gray-400 mt-1">Manage API keys for authentication</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Create API Key</span>
        </button>
      </div>

      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-6">
            <TableSkeleton rows={5} />
          </div>
        ) : apiKeys.length === 0 ? (
          <EmptyState
            title="No API keys yet"
            description="Create an API key to authenticate API requests"
            icon={<KeyIcon className="w-12 h-12" />}
            action={
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Create API Key
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Created At
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Revoked At
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Actions
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
                        {key.revokedAt ? 'Revoked' : 'Active'}
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
                          title="Revoke"
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
        title="Create API Key"
      >
        <form onSubmit={handleCreateApiKey} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
              API Key Name
            </label>
            <input
              type="text"
              id="name"
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Production API Key"
            />
            {errors.name && <p className="mt-1 text-sm text-red-400">{errors.name}</p>}
          </div>

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              {creating ? (
                <>
                  <Loader size="sm" />
                  <span>Creating...</span>
                </>
              ) : (
                <span>Create</span>
              )}
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={showKeyModal} onClose={closeKeyModal} title="API Key Created">
        {newKeyData && (
          <div className="space-y-4">
            <div className="bg-yellow-900 border border-yellow-700 rounded-lg p-4">
              <p className="text-yellow-200 text-sm font-medium">
                Important: Save this API key now. You will not be able to see it again.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Name</label>
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
                    title={showPlaintext ? 'Hide' : 'Show'}
                  >
                    {showPlaintext ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(newKeyData.apiKey)}
                    className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-600 rounded transition-colors"
                    title="Copy"
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
                Done
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
