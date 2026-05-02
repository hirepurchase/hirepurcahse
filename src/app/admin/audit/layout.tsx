import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { PERMISSIONS } from '@/lib/permissions';

export default function AuditLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute permissions={[PERMISSIONS.VIEW_AUDIT_LOGS]}>
      {children}
    </ProtectedRoute>
  );
}
