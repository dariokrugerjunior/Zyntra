import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { z } from 'zod';
import { Key, Lock } from 'lucide-react';
import { useAuthStore } from '../../stores/auth-store';
import { useUiStore } from '../../stores/ui-store';
import { apiClient } from '../../lib/api-client';
import { AuthMode } from '../../types';
import { Loader } from '../components/Loader';

const loginSchema = z.object({
  mode: z.enum(['api-key', 'jwt']),
  credential: z.string().min(1, 'Credential is required'),
});

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const { addToast } = useUiStore();

  const [mode, setMode] = useState<AuthMode>('api-key');
  const [credential, setCredential] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    try {
      const validated = loginSchema.parse({ mode, credential });
      setLoading(true);

      const response = await apiClient.post('/auth/login', {
        mode: validated.mode,
        credential: validated.credential,
      });

      const companyId = typeof response.data?.companyId === 'string' ? response.data.companyId : null;
      const companyName = typeof response.data?.companyName === 'string' ? response.data.companyName : null;
      login(validated.mode, validated.credential, companyId, companyName);
      addToast('success', 'Successfully authenticated');
      navigate('/');
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
        addToast('error', error.message || 'Authentication failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Zyntra</h1>
          <p className="text-gray-400">Multi-tenant SaaS Platform</p>
        </div>

        <div className="bg-gray-800 rounded-lg shadow-xl p-8">
          <h2 className="text-xl font-semibold text-white mb-6">Sign In</h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Authentication Mode
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setMode('api-key')}
                  className={`
                    flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-all
                    ${
                      mode === 'api-key'
                        ? 'bg-blue-600 border-blue-500 text-white'
                        : 'bg-gray-700 border-gray-600 text-gray-300 hover:border-gray-500'
                    }
                  `}
                >
                  <Key className="w-4 h-4" />
                  <span className="text-sm font-medium">API Key</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMode('jwt')}
                  className={`
                    flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-all
                    ${
                      mode === 'jwt'
                        ? 'bg-blue-600 border-blue-500 text-white'
                        : 'bg-gray-700 border-gray-600 text-gray-300 hover:border-gray-500'
                    }
                  `}
                >
                  <Lock className="w-4 h-4" />
                  <span className="text-sm font-medium">JWT</span>
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="credential" className="block text-sm font-medium text-gray-300 mb-2">
                {mode === 'api-key' ? 'API Key' : 'JWT Token'}
              </label>
              <input
                type="password"
                id="credential"
                value={credential}
                onChange={(e) => setCredential(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={mode === 'api-key' ? 'Paste your API key' : 'Paste your JWT token'}
              />
              {errors.credential && (
                <p className="mt-1 text-sm text-red-400">{errors.credential}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader size="sm" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <span>Sign In</span>
              )}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-gray-500">
          Secure authentication via API Key or JWT
        </p>
      </div>
    </div>
  );
};
