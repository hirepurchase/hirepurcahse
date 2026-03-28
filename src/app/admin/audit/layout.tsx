import ProtectedRoute from '@/components/shared/ProtectedRoute';

export default function AuditLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute permissions={['VIEW_AUDIT_LOGS']}>
      {children}
    </ProtectedRoute>
  );
}
