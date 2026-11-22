"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { AlertCircle, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InstallAppButton } from "./InstallAppButton";
import DeveloperCredit from "./DeveloperCredit";

export default function SignInForm({ portal }: { portal: "admin" | "customer" }) {
  const staff = portal === "admin";
  const { loginAdmin, loginCustomer } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const title = staff ? "Staff sign in" : "Customer sign in";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const result = await (staff ? loginAdmin(identifier, password) : loginCustomer(identifier, password));
    if (result.success) {
      window.location.assign(staff ? "/admin/dashboard" : "/customer/dashboard");
      return;
    }
    setError(result.error || "Unable to sign in");
    setPending(false);
  }

  return (
    <main className="grid min-h-dvh lg:grid-cols-[minmax(20rem,2fr)_3fr]">
      <aside className={`relative hidden overflow-hidden lg:block ${staff ? "bg-slate-950" : "bg-teal-950"}`} aria-hidden="true">
        <Image src={staff ? "/slider1.png" : "/slider2.png"} alt="" fill sizes="40vw" className="object-cover opacity-55" />
        <div className="absolute inset-0 bg-linear-to-t from-slate-950/95 via-slate-950/40 to-slate-950/30" />
        <div className="absolute inset-x-0 bottom-0 p-10 text-white xl:p-14">
          <p className="max-w-md text-4xl font-bold tracking-tight">{staff ? "Hire purchase operations" : "Your hire purchase account"}</p>
          <p className="mt-4 max-w-sm text-base leading-7 text-slate-200">
            {staff ? "Manage customers, contracts, inventory, and collections." : "Check balances, track installments, and make payments."}
          </p>
        </div>
      </aside>
      <div className="flex items-center justify-center px-4 py-10 sm:p-10">
        <div className="w-full max-w-md">
          <Link href="/" className="mb-6 inline-flex items-center gap-3 rounded-lg text-base font-bold text-slate-950">
            <Image src="/logo-mark.png" alt="" width={36} height={36} />
            AidooTech
          </Link>
          <section aria-labelledby="sign-in-title" className="operations-panel p-5 sm:p-8">
            <h1 id="sign-in-title" className="text-3xl font-bold text-slate-950">{title}</h1>
            <form onSubmit={submit} className="mt-6 space-y-5">
              {error && <p role="alert" className="flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"><AlertCircle aria-hidden="true" className="size-4 shrink-0" />{error}</p>}
              <div className="space-y-2">
                <Label htmlFor="identifier">{staff ? "Email address" : "Phone number"}</Label>
                <Input id="identifier" type={staff ? "email" : "tel"} autoComplete="username"
                  value={identifier} onChange={(event) => setIdentifier(event.target.value)} required disabled={pending} />
              </div>
              <div className="space-y-2">
                <div className="flex flex-wrap justify-between gap-2">
                  <Label htmlFor="password">Password</Label>
                  {!staff && <Link href="/customer-reset-password" className="text-sm font-semibold text-teal-800 hover:underline">Forgot password?</Link>}
                </div>
                <div className="relative">
                  <Input id="password" type={showPassword ? "text" : "password"} autoComplete="current-password"
                    value={password} onChange={(event) => setPassword(event.target.value)} required disabled={pending}
                    aria-describedby={staff ? undefined : "first-sign-in"} className="pr-12" />
                  <button type="button" aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-lg text-slate-600 hover:bg-slate-100"
                    onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff aria-hidden="true" className="size-4" /> : <Eye aria-hidden="true" className="size-4" />}
                  </button>
                </div>
                {!staff && <p id="first-sign-in" className="text-sm text-slate-600">On your first sign-in, use your phone number as your password.</p>}
              </div>
              <Button type="submit" size="lg" disabled={pending} className={`w-full ${staff ? "" : "bg-teal-800 hover:bg-teal-900"}`}>
                {pending ? "Signing in…" : "Sign in"}
              </Button>
            </form>
            <Link href={staff ? "/customer-login" : "/admin-login"} className="mt-6 inline-block text-sm font-semibold text-slate-700 hover:underline">
              {staff ? "Switch to the customer portal" : "Switch to the staff portal"}
            </Link>
          </section>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <DeveloperCredit align="left" />
            <InstallAppButton />
          </div>
        </div>
      </div>
    </main>
  );
}
