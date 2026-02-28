"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ShoppingCart, ArrowLeft, LogIn, AlertCircle } from "lucide-react";

export default function CustomerLoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${API_URL}/auth/customer/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone, password }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Login failed");
      }

      const { token, user } = await response.json();

      // Store auth data
      if (typeof window !== 'undefined') {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('userType', 'customer');
        window.location.href = '/customer/dashboard';
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Invalid credentials";
      setError(message || "Invalid credentials");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back to Home Button */}
        <Button
          variant="ghost"
          className="mb-4 text-sm sm:text-base text-slate-700"
          onClick={() => router.push('/')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Button>

        <Card className="border-white/70 bg-white/90 shadow-[0_30px_60px_-36px_rgba(15,23,42,0.7)]">
          <CardHeader className="space-y-3 sm:space-y-4 pb-4 sm:pb-6 px-4 sm:px-6">
            <div className="flex justify-center">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-cyan-700 to-emerald-700 rounded-2xl flex items-center justify-center shadow-[0_20px_30px_-20px_rgba(13,148,136,0.8)]">
                <ShoppingCart className="h-7 w-7 sm:h-8 sm:w-8 text-white" />
              </div>
            </div>
            <div className="text-center">
              <CardTitle className="text-2xl sm:text-3xl font-bold text-gray-900">
                Customer Portal
              </CardTitle>
              <CardDescription className="text-sm sm:text-base mt-2">
                Sign in to view your contracts and make payments
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 sm:space-y-6 px-4 sm:px-6 pb-6">
            {/* Error Message */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">{error}</AlertDescription>
              </Alert>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm sm:text-base">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  disabled={isLoading}
                  placeholder="0246462398"
                  className="h-10 sm:h-11 text-sm sm:text-base"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm sm:text-base">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  placeholder="Enter your password"
                  className="h-10 sm:h-11 text-sm sm:text-base"
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-10 sm:h-11 text-sm sm:text-base"
              >
                {isLoading ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <LogIn className="mr-2 h-4 w-4" />
                    Sign In
                  </>
                )}
              </Button>
            </form>

            <div className="text-center text-xs sm:text-sm text-gray-600 space-y-2">
              <p>Your login username and initial password are your phone number.</p>
              <Button
                variant="link"
                className="h-auto p-0 text-primary"
                onClick={() => router.push('/customer-reset-password')}
              >
                Forgot password?
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-4 sm:mt-6 text-center text-xs sm:text-sm text-gray-600 px-4">
          <p>&copy; 2025 AIDOO TECH. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
