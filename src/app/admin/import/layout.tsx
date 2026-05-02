import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { PERMISSIONS } from '@/lib/permissions';

export default function ImportLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute permissions={[PERMISSIONS.MANAGE_SETTINGS]}>
      {children}
    </ProtectedRoute>
  );
}
