import ProtectedRoute from '@/components/shared/ProtectedRoute';

export default function RolesLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute permissions={['MANAGE_ROLES']}>
      {children}
    </ProtectedRoute>
  );
}
