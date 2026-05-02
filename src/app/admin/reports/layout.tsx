import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { PERMISSIONS } from '@/lib/permissions';

export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute permissions={[PERMISSIONS.VIEW_REPORTS]}>
      {children}
    </ProtectedRoute>
  );
}
