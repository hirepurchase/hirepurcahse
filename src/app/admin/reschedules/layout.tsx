import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { PERMISSIONS } from '@/lib/permissions';

export default function ReschedulesLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute permissions={[PERMISSIONS.EDIT_CONTRACT_VALUES]}>{children}</ProtectedRoute>;
}
