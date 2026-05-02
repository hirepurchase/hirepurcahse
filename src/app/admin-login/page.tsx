"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertCircle,
  ArrowLeft,
  Eye,
  EyeOff,
  LogIn,
  ShieldCheck,
  Sparkles,
  Workflow,
  ChartNoAxesCombined,
} from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const API_URL =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
      const response = await fetch(`${API_URL}/auth/admin/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Login failed");
      }

      const { token, user } = await response.json();

      // Store auth data
      if (typeof window !== "undefined") {
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(user));
        localStorage.setItem("userType", "admin");
        window.location.href = "/admin/dashboard";
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Invalid credentials";
      setError(message || "Invalid credentials");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f5f3ee]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.18),transparent_28%),radial-gradient(circle_at_88%_16%,rgba(251,146,60,0.20),transparent_22%),linear-gradient(160deg,#f7f4ef_0%,#f8fafc_52%,#eef7f4_100%)]" />
      <div className="absolute -left-24 top-20 h-56 w-56 rounded-full bg-emerald-300/30 blur-3xl" />
      <div className="absolute bottom-12 right-[-2rem] h-64 w-64 rounded-full bg-amber-300/30 blur-3xl" />
      <div className="absolute inset-x-0 top-0 h-64 bg-[linear-gradient(to_bottom,rgba(15,23,42,0.06),transparent)]" />

      <main className="page-shell relative mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-5 flex justify-center sm:mb-6 lg:justify-start">
          <Button
            variant="ghost"
            className="group rounded-full border border-slate-200/70 bg-white/70 px-4 text-sm text-slate-700 backdrop-blur-md transition hover:bg-white"
            onClick={() => router.push("/")}
          >
            <ArrowLeft className="mr-2 h-4 w-4 transition group-hover:-translate-x-0.5" />
            Back to Home
          </Button>
        </div>

        <section className="overflow-hidden rounded-[30px] border border-white/80 bg-white/72 shadow-[0_45px_120px_-55px_rgba(15,23,42,0.5)] backdrop-blur-xl">
          <div className="grid lg:grid-cols-[1.05fr_0.95fr]">
            <div className="relative overflow-hidden bg-[linear-gradient(145deg,#0f172a_0%,#0f766e_48%,#164e63_100%)] px-6 py-8 text-white sm:px-8 sm:py-10 lg:px-10 lg:py-12">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.16),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(251,191,36,0.22),transparent_26%)]" />
              <div className="surface-grid absolute inset-0 opacity-15" />
              <div className="relative flex h-full flex-col items-center justify-center text-center">
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/85 backdrop-blur">
                  <Sparkles className="h-3.5 w-3.5" />
                  Aidoo Tech Solutions
                </div>

                <div className="mb-6 flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-[28px] border border-white/15 bg-white/12 shadow-[0_25px_50px_-30px_rgba(0,0,0,0.7)] sm:h-20 sm:w-20">
                  <ShieldCheck className="h-9 w-9 text-emerald-100 sm:h-10 sm:w-10" />
                </div>

                <p className="mb-3 text-sm font-semibold uppercase tracking-[0.35em] text-emerald-100/80">
                  Secure Admin Access
                </p>
                <h1 className="max-w-md text-3xl font-extrabold leading-tight text-white sm:text-4xl lg:text-[2.7rem]">
                  Aidoo Tech Solutions
                </h1>
                <p className="mt-3 max-w-md text-balance text-sm leading-6 text-cyan-50/82 sm:text-base">
                  Developed by EYO SOLUTIONS
                </p>
              </div>
            </div>

            <div className="flex items-center px-5 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-10">
              <div className="mx-auto w-full max-w-md">
                <div className="mb-6 text-center lg:text-left">
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-teal-700/75">
                    Welcome Back
                  </p>
                  <h2 className="mt-2 text-3xl font-extrabold text-slate-900">
                    Admin Login
                  </h2>
                </div>

                {error && (
                  <Alert className="mb-5 border-red-200 bg-red-50/90 text-red-700">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      {error}
                    </AlertDescription>
                  </Alert>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label
                      htmlFor="email"
                      className="text-sm font-medium text-slate-700"
                    >
                      Email Address
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={isLoading}
                      placeholder="admin@aidootech.com"
                      className="h-12 rounded-2xl border-slate-200 bg-white/90 px-4 text-base shadow-sm transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <Label
                        htmlFor="password"
                        className="text-sm font-medium text-slate-700"
                      >
                        Password
                      </Label>
                      <button
                        type="button"
                        onClick={() => setShowPassword((value) => !value)}
                        className="text-xs font-semibold text-teal-700 transition hover:text-teal-800"
                      >
                        {showPassword ? "Hide password" : "Show password"}
                      </button>
                    </div>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={isLoading}
                        placeholder="Enter your password"
                        className="h-12 rounded-2xl border-slate-200 bg-white/90 px-4 pr-12 text-base shadow-sm transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((value) => !value)}
                        className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-slate-400 transition hover:text-slate-600"
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="h-12 w-full rounded-2xl bg-[linear-gradient(135deg,#0f766e_0%,#115e59_48%,#0f172a_100%)] text-base font-semibold text-white shadow-[0_25px_40px_-24px_rgba(15,118,110,0.9)] transition hover:brightness-110"
                  >
                    {isLoading ? (
                      <>
                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Signing in...
                      </>
                    ) : (
                      <>
                        <LogIn className="mr-2 h-4 w-4" />
                        Enter Dashboard
                      </>
                    )}
                  </Button>
                </form>

                <div className="mt-6 rounded-2xl border border-slate-200/80 bg-slate-50/90 px-4 py-3 text-center text-xs leading-5 text-slate-500 lg:text-left">
                  Protected workspace for authorized Aidoo Tech Solutions staff
                  only.
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-5 text-center text-xs font-medium tracking-[0.12em] text-slate-500 sm:mt-6">
          AIDOO TECH SOLUTIONS
        </div>
      </main>
    </div>
  );
}
