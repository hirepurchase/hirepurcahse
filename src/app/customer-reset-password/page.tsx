"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, ArrowLeft, KeyRound } from "lucide-react";

export default function CustomerResetPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<"request" | "reset">("request");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setIsLoading(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
      const response = await fetch(`${API_URL}/auth/customer/password-reset/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to send OTP");
      }
      setMessage("If the account exists, an OTP has been sent.");
      setStep("reset");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to send OTP";
      setError(message || "Failed to send OTP");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setIsLoading(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
      const response = await fetch(`${API_URL}/auth/customer/password-reset/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code, newPassword }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to reset password");
      }
      setMessage("Password reset successful. You can now login.");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to reset password";
      setError(message || "Failed to reset password");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Button variant="ghost" className="mb-4 text-sm sm:text-base" onClick={() => router.push("/customer-login")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Login
        </Button>

        <Card className="border-white/70 bg-white/90 shadow-[0_30px_60px_-36px_rgba(15,23,42,0.7)]">
          <CardHeader className="space-y-3 sm:space-y-4 pb-4 sm:pb-6 px-4 sm:px-6">
            <div className="flex justify-center">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-cyan-700 to-emerald-700 rounded-2xl flex items-center justify-center shadow-[0_20px_30px_-20px_rgba(13,148,136,0.8)]">
                <KeyRound className="h-7 w-7 sm:h-8 sm:w-8 text-white" />
              </div>
            </div>
            <div className="text-center">
              <CardTitle className="text-2xl sm:text-3xl font-bold text-gray-900">
                Reset Password
              </CardTitle>
              <CardDescription className="text-sm sm:text-base mt-2">
                {step === "request" ? "Request an OTP by SMS" : "Enter OTP and set a new password"}
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 sm:space-y-6 px-4 sm:px-6 pb-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">{error}</AlertDescription>
              </Alert>
            )}
            {message && (
              <Alert>
                <AlertDescription className="text-sm">{message}</AlertDescription>
              </Alert>
            )}

            {step === "request" ? (
              <form onSubmit={handleRequest} className="space-y-4">
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
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-10 sm:h-11 text-sm sm:text-base"
                >
                  {isLoading ? "Sending OTP..." : "Send OTP"}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleReset} className="space-y-4">
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
                  <Label htmlFor="code" className="text-sm sm:text-base">OTP Code</Label>
                  <Input
                    id="code"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    required
                    disabled={isLoading}
                    placeholder="123456"
                    className="h-10 sm:h-11 text-sm sm:text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword" className="text-sm sm:text-base">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    placeholder="Enter new password"
                    className="h-10 sm:h-11 text-sm sm:text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm sm:text-base">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    placeholder="Re-enter new password"
                    className="h-10 sm:h-11 text-sm sm:text-base"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-10 sm:h-11 text-sm sm:text-base"
                >
                  {isLoading ? "Resetting..." : "Reset Password"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
