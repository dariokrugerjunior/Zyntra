import { RouterProvider } from 'react-router';
import { useEffect } from 'react';
import { router } from './routes';
import { Toast } from './components/Toast';
import { useUiStore } from '../stores/ui-store';

export default function App() {
  const darkMode = useUiStore((state) => state.darkMode);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', darkMode);
    root.classList.toggle('theme-light', !darkMode);
  }, [darkMode]);

  return (
    <>
      <RouterProvider router={router} />
      <Toast />
    </>
  );
}
