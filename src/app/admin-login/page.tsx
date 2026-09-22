"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, AlertCircle, Shield } from "lucide-react";

const SLIDES = [
  {
    url: "/slider1.png",
    headline: "Finance devices.\nManage contracts.\nStay in control.",
    sub: "Track every contract, payment and financed device from one secure dashboard.",
  },
  {
    url: "/slider2.png",
    headline: "Serve customers\nfaster than ever.",
    sub: "Create hire-purchase contracts in minutes with automated installment schedules.",
  },
  {
    url: "/slider3.png",
    headline: "Payments tracked.\nBalances clear.",
    sub: "Every payment recorded, every overdue installment flagged — in real time.",
  },
  {
    url: "/slider4.png",
    headline: "Device control\nat your fingertips.",
    sub: "Lock, unlock and monitor financed devices through Knox Guard integration.",
  },
  {
    url: "/slider5.png",
    headline: "Your team.\nOne platform.",
    sub: "Agents, managers and admins — all working from the same system.",
  },
];

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [slide, setSlide] = useState(0);
  const [fading, setFading] = useState(false);

  // Auto-advance every 5 s with a cross-fade
  useEffect(() => {
    const t = setInterval(() => {
      setFading(true);
      setTimeout(() => {
        setSlide((s) => (s + 1) % SLIDES.length);
        setFading(false);
      }, 400);
    }, 5000);
    return () => clearInterval(t);
  }, []);

  const goTo = (i: number) => {
    if (i === slide) return;
    setFading(true);
    setTimeout(() => {
      setSlide(i);
      setFading(false);
    }, 400);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const API_URL =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
      const res = await fetch(`${API_URL}/auth/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Login failed");
      }
      const { token, user } = await res.json();
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("userType", "admin");
      window.location.href = "/admin/dashboard";
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Invalid credentials");
    } finally {
      setIsLoading(false);
    }
  };

  const current = SLIDES[slide];

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: "#f5f0eb" }}>
      {/* ── Left slider panel ── */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 relative overflow-hidden">
        {/* Preload all slide images so transitions are instant */}
        {SLIDES.map((s, i) => (
          <img
            key={s.url}
            src={s.url}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
            style={{ opacity: i === slide && !fading ? 1 : 0, pointerEvents: 'none' }}
          />
        ))}

        {/* Gradient overlay */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to top, rgba(0,0,0,0.80) 0%, rgba(0,0,0,0.35) 55%, rgba(0,0,0,0.10) 100%)",
          }}
        />

        {/* Content */}
        <div className="relative flex flex-col justify-end h-full p-12 text-white z-10">
          {/* Slide text — dark background for legibility over any image */}
          <div
            className="transition-opacity duration-500"
            style={{ opacity: fading ? 0 : 1 }}
          >
            <div className="inline-block bg-black/60 backdrop-blur-sm px-6 py-5 max-w-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-300 mb-3">
                Hire Purchase Management
              </p>
              <h1 className="text-3xl font-black leading-tight mb-3 whitespace-pre-line">
                {current.headline}
              </h1>
              <p className="text-white/80 text-sm leading-relaxed">
                {current.sub}
              </p>
            </div>
          </div>

          {/* Dot indicators */}
          <div className="flex items-center gap-2">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className="transition-all duration-300"
                style={{
                  width: i === slide ? 24 : 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor:
                    i === slide ? "#3b82f6" : "rgba(255,255,255,0.35)",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                }}
                aria-label={`Slide ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-14 bg-[#f5f0eb]">

        {/* Brand mark above card */}
        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-9 h-9 bg-blue-600 flex items-center justify-center shadow-sm">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900 leading-none tracking-wide">AIDOO TECH</p>
            <p className="text-xs text-gray-400 leading-none mt-0.5">Management System</p>
          </div>
        </div>

        <div className="w-full max-w-[400px]">
          <div className="bg-white border border-gray-200 shadow-sm p-8">

            <div className="mb-7">
              <h2 className="text-2xl font-bold text-gray-900">Welcome back</h2>
              <p className="text-sm text-gray-400 mt-1">Sign in to your staff account</p>
            </div>

            {error && (
              <div className="mb-5 flex items-start gap-2.5 bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  placeholder="you@aidootech.com"
                  className="w-full h-11 px-3.5 border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition disabled:opacity-50"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    placeholder="Enter your password"
                    className="w-full h-11 px-3.5 pr-11 border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-0 w-11 flex items-center justify-center text-gray-400 hover:text-gray-600 transition"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors mt-2"
              >
                {isLoading ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Signing in…
                  </>
                ) : "Sign in"}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-gray-100 flex items-center justify-between">
              <button
                onClick={() => router.push("/")}
                className="text-xs text-gray-400 hover:text-gray-600 transition"
              >
                ← Back to home
              </button>
              <p className="text-xs text-gray-300">Staff access only</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
