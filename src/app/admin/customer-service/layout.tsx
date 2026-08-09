import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { PERMISSIONS } from '@/lib/permissions';

export default function CustomerServiceLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute
      permissions={[PERMISSIONS.VERIFY_CUSTOMER, PERMISSIONS.MANAGE_CONTACT_ATTEMPTS]}
    >
      {children}
    </ProtectedRoute>
  );
}
