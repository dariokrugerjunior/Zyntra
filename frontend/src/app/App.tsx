import { RouterProvider } from 'react-router';
import { router } from './routes';
import { Toast } from './components/Toast';

export default function App() {
  return (
    <>
      <RouterProvider router={router} />
      <Toast />
    </>
  );
}
