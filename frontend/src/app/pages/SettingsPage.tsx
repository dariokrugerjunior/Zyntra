import React from 'react';
import { useAuthStore } from '../../stores/auth-store';
import { useUiStore } from '../../stores/ui-store';
import { Moon, Sun, Trash2, Key, Lock } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { mode } = useAuthStore();
  const { darkMode, toggleDarkMode, addToast } = useUiStore();

  const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

  const handleClearLocalData = () => {
    if (
      !confirm(
        'Tem certeza que deseja limpar todos os dados locais? Voce sera desconectado e todas as configuracoes locais serao resetadas.'
      )
    ) {
      return;
    }

    localStorage.clear();
    addToast('success', 'Dados locais limpos');
    window.location.href = '/login';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Configuracoes</h1>
        <p className="text-gray-400 mt-1">Gerencie as preferencias da aplicacao</p>
      </div>

      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Configuracao da API</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Base URL</label>
            <div className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white font-mono text-sm">
              {baseURL}
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Configure via variavel de ambiente VITE_API_BASE_URL
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Modo de Autenticacao
            </label>
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white">
              {mode === 'api-key' ? (
                <>
                  <Key className="w-4 h-4 text-blue-400" />
                  <span>API Key</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 text-blue-400" />
                  <span>Usuario/Senha da companhia</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Aparencia</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-white">Modo Escuro</h3>
              <p className="text-xs text-gray-400 mt-1">
                Alterna entre tema claro e escuro
              </p>
            </div>
            <button
              onClick={toggleDarkMode}
              className={`
                relative inline-flex h-8 w-14 items-center rounded-full transition-colors
                ${darkMode ? 'bg-blue-600' : 'bg-gray-600'}
              `}
            >
              <span
                className={`
                  inline-block h-6 w-6 transform rounded-full bg-white transition-transform flex items-center justify-center
                  ${darkMode ? 'translate-x-7' : 'translate-x-1'}
                `}
              >
                {darkMode ? (
                  <Moon className="w-3 h-3 text-gray-900" />
                ) : (
                  <Sun className="w-3 h-3 text-gray-900" />
                )}
              </span>
            </button>
          </div>
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Gerenciamento de Dados</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-white">Limpar Dados Locais</h3>
              <p className="text-xs text-gray-400 mt-1">
                Remove todos os dados armazenados localmente, incluindo credenciais de autenticacao
              </p>
            </div>
            <button
              onClick={handleClearLocalData}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>Limpar Dados</span>
            </button>
          </div>
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Sobre</h2>
        <div className="space-y-2 text-sm">
          <p className="text-gray-300">
            <span className="font-medium">Versao:</span> 1.0.0
          </p>
          <p className="text-gray-300">
            <span className="font-medium">Compilacao:</span> {new Date().toLocaleDateString()}
          </p>
          <p className="text-gray-300">
            <span className="font-medium">Plataforma:</span> Zyntra SaaS
          </p>
        </div>
      </div>
    </div>
  );
};
