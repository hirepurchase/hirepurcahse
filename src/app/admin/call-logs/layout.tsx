import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { PERMISSIONS } from '@/lib/permissions';

export default function CallLogsLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute
      permissions={[
        PERMISSIONS.MANAGE_CONTACT_ATTEMPTS,
        PERMISSIONS.VIEW_AUDIT_LOGS,
        PERMISSIONS.VIEW_REPORTS,
      ]}
    >
      {children}
    </ProtectedRoute>
  );
}
