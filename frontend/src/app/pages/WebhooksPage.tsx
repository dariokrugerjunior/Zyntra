import React, { useEffect, useState } from 'react';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { apiClient } from '../../lib/api-client';
import { mapWebhook } from '../../lib/api-mappers';
import { useWebhooksStore } from '../../stores/webhooks-store';
import { useUiStore } from '../../stores/ui-store';
import { Webhook } from '../../types';
import { Modal } from '../components/Modal';
import { Loader } from '../components/Loader';
import { EmptyState } from '../components/EmptyState';
import { TableSkeleton } from '../components/TableSkeleton';
import { Plus, Edit, Trash2, Power, Webhook as WebhookIcon, Key } from 'lucide-react';

const webhookSchema = z.object({
  url: z.string().url('URL invalida'),
  secret: z.string().min(1, 'Segredo obrigatorio'),
  events: z.array(z.string()).min(1, 'Selecione ao menos um evento'),
});

const availableEvents = [
  'session.qr',
  'session.ready',
  'session.disconnected',
  'message.received',
  'message.sent',
  'message.error',
];

export const WebhooksPage: React.FC = () => {
  const { webhooks, setWebhooks, loading, setLoading, removeWebhook, updateWebhook } =
    useWebhooksStore();
  const { addToast } = useUiStore();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<Webhook | null>(null);
  const [form, setForm] = useState({
    url: '',
    secret: '',
    events: [] as string[],
  });
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadWebhooks();
  }, []);

  const loadWebhooks = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get<Webhook[]>('/webhooks');
      setWebhooks(response.data.map((item: any) => mapWebhook(item)));
    } catch (error: any) {
      addToast('error', error.message || 'Falha ao carregar webhooks');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    try {
      const validated = webhookSchema.parse(form);
      setSubmitting(true);

      const response = await apiClient.post<Webhook>('/webhooks', validated);
      setWebhooks([mapWebhook(response.data as any), ...webhooks]);
      addToast('success', 'Webhook criado com sucesso');
      setShowCreateModal(false);
      resetForm();
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
        addToast('error', error.message || 'Falha ao criar webhook');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWebhook) return;

    setErrors({});

    try {
      const validated = webhookSchema.parse(form);
      setSubmitting(true);

      await apiClient.patch(`/webhooks/${editingWebhook.id}`, validated);
      updateWebhook(editingWebhook.id, validated);
      addToast('success', 'Webhook atualizado com sucesso');
      setShowEditModal(false);
      setEditingWebhook(null);
      resetForm();
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
        addToast('error', error.message || 'Falha ao atualizar webhook');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (webhook: Webhook) => {
    setActionLoading(webhook.id);
    try {
      await apiClient.patch(`/webhooks/${webhook.id}`, {
        isActive: !webhook.isActive,
      });
      updateWebhook(webhook.id, { isActive: !webhook.isActive });
      addToast('success', `Webhook ${webhook.isActive ? 'desativado' : 'ativado'}`);
    } catch (error: any) {
      addToast('error', error.message || 'Falha ao alternar webhook');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteWebhook = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este webhook?')) return;

    setActionLoading(id);
    try {
      await apiClient.delete(`/webhooks/${id}`);
      removeWebhook(id);
      addToast('success', 'Webhook excluido com sucesso');
    } catch (error: any) {
      addToast('error', error.message || 'Falha ao excluir webhook');
    } finally {
      setActionLoading(null);
    }
  };

  const openEditModal = (webhook: Webhook) => {
    setEditingWebhook(webhook);
    setForm({
      url: webhook.url,
      secret: webhook.secret,
      events: webhook.events,
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setForm({ url: '', secret: '', events: [] });
    setErrors({});
  };

  const generateSecret = () => {
    const secret = uuidv4();
    setForm({ ...form, secret });
  };

  const toggleEvent = (event: string) => {
    if (form.events.includes(event)) {
      setForm({ ...form, events: form.events.filter((e) => e !== event) });
    } else {
      setForm({ ...form, events: [...form.events, event] });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Webhooks</h1>
          <p className="text-gray-400 mt-1">Gerencie endpoints de webhook para eventos</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowCreateModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Criar Webhook</span>
        </button>
      </div>

      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-6">
            <TableSkeleton rows={5} />
          </div>
        ) : webhooks.length === 0 ? (
          <EmptyState
            title="Nenhum webhook ainda"
            description="Crie um webhook para receber eventos em tempo real das suas sessoes"
            icon={<WebhookIcon className="w-12 h-12" />}
            action={
              <button
                onClick={() => {
                  resetForm();
                  setShowCreateModal(true);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Criar Webhook
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    URL
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Eventos
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Criado Em
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Acoes
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {webhooks.map((webhook) => (
                  <tr key={webhook.id} className="hover:bg-gray-700 transition-colors">
                    <td className="px-6 py-4">
                      <div className="max-w-xs truncate text-white">{webhook.url}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-300">
                        {webhook.events.length} evento{webhook.events.length !== 1 ? 's' : ''}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          webhook.isActive
                            ? 'bg-green-600 text-green-200'
                            : 'bg-gray-600 text-gray-300'
                        }`}
                      >
                        {webhook.isActive ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-300">
                      {new Date(webhook.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(webhook)}
                          disabled={actionLoading === webhook.id}
                          className="p-2 text-blue-400 hover:text-blue-300 hover:bg-gray-600 rounded transition-colors disabled:opacity-50"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleActive(webhook)}
                          disabled={actionLoading === webhook.id}
                          className={`p-2 hover:bg-gray-600 rounded transition-colors disabled:opacity-50 ${
                            webhook.isActive ? 'text-yellow-400' : 'text-green-400'
                          }`}
                          title={webhook.isActive ? 'Desativar' : 'Ativar'}
                        >
                          {actionLoading === webhook.id ? (
                            <Loader size="sm" />
                          ) : (
                            <Power className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleDeleteWebhook(webhook.id)}
                          disabled={actionLoading === webhook.id}
                          className="p-2 text-red-400 hover:text-red-300 hover:bg-gray-600 rounded transition-colors disabled:opacity-50"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
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
        title="Criar Webhook"
        size="lg"
      >
        <form onSubmit={handleCreateWebhook} className="space-y-4">
          <div>
            <label htmlFor="url" className="block text-sm font-medium text-gray-300 mb-2">
              URL
            </label>
            <input
              type="url"
              id="url"
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://example.com/webhook"
            />
            {errors.url && <p className="mt-1 text-sm text-red-400">{errors.url}</p>}
          </div>

          <div>
            <label htmlFor="secret" className="block text-sm font-medium text-gray-300 mb-2">
              Segredo
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                id="secret"
                value={form.secret}
                onChange={(e) => setForm({ ...form, secret: e.target.value })}
                className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Segredo do webhook"
              />
              <button
                type="button"
                onClick={generateSecret}
                className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                <Key className="w-4 h-4" />
                <span>Gerar</span>
              </button>
            </div>
            {errors.secret && <p className="mt-1 text-sm text-red-400">{errors.secret}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Eventos</label>
            <div className="space-y-2">
              {availableEvents.map((event) => (
                <label key={event} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.events.includes(event)}
                    onChange={() => toggleEvent(event)}
                    className="w-4 h-4 rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-300">{event}</span>
                </label>
              ))}
            </div>
            {errors.events && <p className="mt-1 text-sm text-red-400">{errors.events}</p>}
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
              disabled={submitting}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              {submitting ? (
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

      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Editar Webhook"
        size="lg"
      >
        <form onSubmit={handleUpdateWebhook} className="space-y-4">
          <div>
            <label htmlFor="edit-url" className="block text-sm font-medium text-gray-300 mb-2">
              URL
            </label>
            <input
              type="url"
              id="edit-url"
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://example.com/webhook"
            />
            {errors.url && <p className="mt-1 text-sm text-red-400">{errors.url}</p>}
          </div>

          <div>
            <label htmlFor="edit-secret" className="block text-sm font-medium text-gray-300 mb-2">
              Segredo
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                id="edit-secret"
                value={form.secret}
                onChange={(e) => setForm({ ...form, secret: e.target.value })}
                className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Segredo do webhook"
              />
              <button
                type="button"
                onClick={generateSecret}
                className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                <Key className="w-4 h-4" />
                <span>Gerar</span>
              </button>
            </div>
            {errors.secret && <p className="mt-1 text-sm text-red-400">{errors.secret}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Eventos</label>
            <div className="space-y-2">
              {availableEvents.map((event) => (
                <label key={event} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.events.includes(event)}
                    onChange={() => toggleEvent(event)}
                    className="w-4 h-4 rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-300">{event}</span>
                </label>
              ))}
            </div>
            {errors.events && <p className="mt-1 text-sm text-red-400">{errors.events}</p>}
          </div>

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={() => setShowEditModal(false)}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader size="sm" />
                  <span>Atualizando...</span>
                </>
              ) : (
                <span>Atualizar</span>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
