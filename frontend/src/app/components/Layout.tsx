import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router';
import { useAuthStore } from '../../stores/auth-store';
import { useUiStore } from '../../stores/ui-store';
import zyntraLogo from '../../assets/zyntra-logo.svg';
import {
  LayoutDashboard,
  MessageSquare,
  Smartphone,
  Key,
  Settings,
  LogOut,
  Menu,
  X,
  Moon,
  Sun,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

const navItems = [
  { path: '/', label: 'Painel', icon: LayoutDashboard },
  { path: '/sessions', label: 'Sessoes', icon: Smartphone },
  { path: '/messages', label: 'Mensagens', icon: MessageSquare },
  { path: '/api-keys', label: 'Chaves de API', icon: Key },
  { path: '/settings', label: 'Configuracoes', icon: Settings },
];

export const Layout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, companyId, companyName } = useAuthStore();
  const { darkMode, toggleDarkMode, sidebarCollapsed, setSidebarCollapsed } = useUiStore();
  const [connected] = React.useState(true);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <aside
        className={`
          fixed left-0 top-0 h-full bg-gray-800 border-r border-gray-700 transition-all duration-300 z-40
          ${sidebarCollapsed ? 'w-16' : 'w-64'}
        `}
      >
        <div className={`border-b border-gray-700 ${sidebarCollapsed ? 'p-2' : 'p-4'}`}>
          <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between'} gap-2`}>
            {!sidebarCollapsed && (
              <div className="flex items-center gap-3 min-w-0">
                <img src={zyntraLogo} alt="Zyntra logo" className="w-8 h-8 rounded-lg flex-shrink-0" />
                <h1 className="text-lg font-bold text-white truncate">Zyntra</h1>
              </div>
            )}
            {sidebarCollapsed && <img src={zyntraLogo} alt="Zyntra logo" className="w-8 h-8 rounded-lg" />}
          </div>
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="mt-2 w-full flex items-center justify-center p-1.5 hover:bg-gray-700 rounded transition-colors"
            title={sidebarCollapsed ? 'Expandir menu' : 'Recolher menu'}
          >
            {sidebarCollapsed ? <Menu className="w-5 h-5" /> : <X className="w-5 h-5" />}
          </button>
        </div>

        {!sidebarCollapsed && (
          <div className="px-4 py-3 border-b border-gray-700">
            <p className="text-[11px] uppercase tracking-wider text-gray-400">Empresa logada</p>
            <p className="text-sm text-gray-200 mt-1 break-all">{companyName || companyId || 'nao identificada'}</p>
          </div>
        )}

        <nav className="p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  flex items-center rounded-lg transition-colors
                  ${sidebarCollapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2'}
                  ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }
                `}
                title={sidebarCollapsed ? item.label : ''}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!sidebarCollapsed && <span className="text-sm font-medium">{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div
        className={`
          transition-all duration-300
          ${sidebarCollapsed ? 'ml-16' : 'ml-64'}
        `}
      >
        <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-semibold">
                {navItems.find((item) => item.path === location.pathname)?.label || 'Painel'}
              </h2>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 rounded-lg">
                {connected ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span className="text-xs text-gray-300">Conectado</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 text-red-500" />
                    <span className="text-xs text-gray-300">Desconectado</span>
                  </>
                )}
              </div>

              <button
                onClick={toggleDarkMode}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                title={darkMode ? 'Modo claro' : 'Modo escuro'}
              >
                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>

              <div className="h-6 w-px bg-gray-700" />

              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 hover:bg-gray-700 rounded-lg transition-colors text-gray-300 hover:text-white"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm">Sair</span>
              </button>
            </div>
          </div>
        </header>

        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
