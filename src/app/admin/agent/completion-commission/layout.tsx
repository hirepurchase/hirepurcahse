import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { PERMISSIONS } from '@/lib/permissions';

export default function CompletionCommissionLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute permissions={[PERMISSIONS.MANAGE_AGENT_LEDGER]}>{children}</ProtectedRoute>;
}
