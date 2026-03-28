import ProtectedRoute from '@/components/shared/ProtectedRoute';

export default function UsersLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute permissions={['MANAGE_USERS']}>
      {children}
    </ProtectedRoute>
  );
}
