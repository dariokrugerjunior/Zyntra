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
        'Are you sure you want to clear all local data? You will be logged out and all local settings will be reset.'
      )
    ) {
      return;
    }

    localStorage.clear();
    addToast('success', 'Local data cleared');
    window.location.href = '/login';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-gray-400 mt-1">Manage your application preferences</p>
      </div>

      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">API Configuration</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Base URL</label>
            <div className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white font-mono text-sm">
              {baseURL}
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Configure via VITE_API_BASE_URL environment variable
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Authentication Mode
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
                  <span>JWT Token</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Appearance</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-white">Dark Mode</h3>
              <p className="text-xs text-gray-400 mt-1">
                Toggle between light and dark theme
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
        <h2 className="text-lg font-semibold text-white mb-4">Data Management</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-white">Clear Local Data</h3>
              <p className="text-xs text-gray-400 mt-1">
                Remove all locally stored data including authentication credentials
              </p>
            </div>
            <button
              onClick={handleClearLocalData}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear Data</span>
            </button>
          </div>
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">About</h2>
        <div className="space-y-2 text-sm">
          <p className="text-gray-300">
            <span className="font-medium">Version:</span> 1.0.0
          </p>
          <p className="text-gray-300">
            <span className="font-medium">Build:</span> {new Date().toLocaleDateString()}
          </p>
          <p className="text-gray-300">
            <span className="font-medium">Platform:</span> Zyntra SaaS
          </p>
        </div>
      </div>
    </div>
  );
};