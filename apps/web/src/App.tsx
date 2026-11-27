import { I18nProvider } from 'react-aria-components';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router';

import { AdminPage } from './pages/AdminPage.tsx';
import { DisplayPage } from './pages/DisplayPage.tsx';
import { NotFoundPage } from './pages/NotFoundPage.tsx';

const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/admin" replace /> },
  { path: '/admin', element: <AdminPage /> },
  { path: '/admin/:section', element: <AdminPage /> },
  { path: '/display/:id', element: <DisplayPage /> },
  { path: '*', element: <NotFoundPage /> },
]);

export function App() {
  return (
    <I18nProvider locale="he-IL">
      <RouterProvider router={router} />
    </I18nProvider>
  );
}
