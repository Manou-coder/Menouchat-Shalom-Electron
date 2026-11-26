import { Dashboard } from '../admin/Dashboard.tsx';
import { Toasts } from '../admin/toasts.tsx';

export function AdminPage() {
  return (
    <>
      <Dashboard />
      <Toasts />
    </>
  );
}
