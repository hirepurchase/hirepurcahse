import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { PERMISSIONS } from '@/lib/permissions';

export default function KnoxGuardSettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute permissions={[PERMISSIONS.MANAGE_DEVICE_CONTROL]}>
      {children}
    </ProtectedRoute>
  );
}
