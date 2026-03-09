import { createBrowserRouter, Navigate } from 'react-router';
import { useAuthStore } from '../stores/auth-store';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { SessionsListPage } from './pages/SessionsListPage';
import { SessionDetailPage } from './pages/SessionDetailPage';
import { MessagesPage } from './pages/MessagesPage';
import { WebhooksPage } from './pages/WebhooksPage';
import { ApiKeysPage } from './pages/ApiKeysPage';
import { SettingsPage } from './pages/SettingsPage';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuthStore();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <DashboardPage />,
      },
      {
        path: 'sessions',
        element: <SessionsListPage />,
      },
      {
        path: 'sessions/:id',
        element: <SessionDetailPage />,
      },
      {
        path: 'messages',
        element: <MessagesPage />,
      },
      {
        path: 'webhooks',
        element: <WebhooksPage />,
      },
      {
        path: 'api-keys',
        element: <ApiKeysPage />,
      },
      {
        path: 'settings',
        element: <SettingsPage />,
      },
    ],
  },
]);