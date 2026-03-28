import ProtectedRoute from '@/components/shared/ProtectedRoute';

export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute permissions={['VIEW_REPORTS']}>
      {children}
    </ProtectedRoute>
  );
}
