import ProtectedRoute from '@/components/shared/ProtectedRoute';

export default function ImportLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute permissions={['MANAGE_SETTINGS']}>
      {children}
    </ProtectedRoute>
  );
}
