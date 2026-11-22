'use client';

import { Smartphone } from "lucide-react";
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { useToast } from '@/hooks/useToast';
import DeveloperCredit from '@/components/shared/DeveloperCredit';

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
    <main className="min-h-dvh flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <Card className="operations-panel">
          <CardHeader className="space-y-3 sm:space-y-4 pb-4 sm:pb-6 px-4 sm:px-6">
            <div className="text-center">
              <span className="mx-auto mb-4 grid size-11 place-items-center rounded-xl bg-teal-50 text-teal-800">
                <Smartphone aria-hidden="true" className="size-5" />
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-950">
                Your account is ready after purchase
              </h1>
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
              className="w-full h-11 bg-teal-800 hover:bg-teal-900"
            >
              Go to Login
            </Button>
          </CardContent>
        </Card>
        <DeveloperCredit className="mt-4" />
      </div>
    </main>
  );
}
