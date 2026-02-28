'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/useToast';

export default function CustomerActivationPage() {
  const router = useRouter();
  const { toast } = useToast();

  const handleGoToLogin = () => {
    toast({
      title: 'Activation Not Required',
      description: 'Login with your phone number and password.',
    });
    router.push('/customer-login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-2xl border-0">
          <CardHeader className="space-y-3 sm:space-y-4 pb-4 sm:pb-6 px-4 sm:px-6">
            <div className="text-center">
              <CardTitle className="text-2xl sm:text-3xl font-bold text-gray-900">
                Activation Not Required
              </CardTitle>
              <CardDescription className="text-sm sm:text-base mt-2">
                Your account is activated automatically after contract creation.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 sm:space-y-6 px-4 sm:px-6 pb-6">
            <p className="text-sm text-gray-700 text-center">
              Use your phone number as both username and initial password.
            </p>
            <Button
              onClick={handleGoToLogin}
              className="w-full h-11 bg-gradient-to-r from-green-600 to-emerald-600"
            >
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
