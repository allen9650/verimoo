"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { Lock, Mail, Eye, EyeOff, AlertCircle, ArrowLeft } from "lucide-react";
import { Button, Input, Card } from "@/components/ui";
import { ThemeToggle } from "@/components/theme-toggle";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await signIn("credentials", { email, password, redirect: false });
      setLoading(false);
      if (res?.error) {
        setError("Invalid email address or password.");
      } else {
        router.push("/admin");
      }
    } catch {
      setLoading(false);
      setError("An unexpected authentication error occurred.");
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#F8FAFC] dark:bg-black">
      {/* Top Bar with Back Link & Theme Toggle */}
      <header className="p-4 sm:p-6 flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-[#64748B] hover:text-[#2563EB] transition dark:text-[#94A3B8] dark:hover:text-white"
        >
          <ArrowLeft size={14} />
          <span>Back to Verification Search</span>
        </Link>
        <ThemeToggle />
      </header>

      {/* Main Login Card */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="w-full max-w-sm"
        >
          <Card className="p-6 sm:p-8 shadow-xl border-[#E2E8F0] dark:border-[#27272a] dark:bg-[#0e0e12]">
            {/* Header Icon with Transparent Logo */}
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2563EB]/10 via-[#4F46E5]/10 to-[#7C3AED]/10 dark:from-[#2563EB]/20 dark:to-[#7C3AED]/20 p-2.5 shadow-xs border border-indigo-100 dark:border-indigo-900/40">
                <Image
                  src="/verimoo.png"
                  alt="VeriMoo"
                  width={44}
                  height={44}
                  priority
                  className="h-10 w-auto object-contain"
                />
              </div>
              <h1 className="mt-4 text-xl font-bold tracking-tight text-[#111827] dark:text-[#F8FAFC]">
                Admin Portal
              </h1>
              <p className="mt-1 text-xs text-[#64748B] dark:text-[#94A3B8]">
                Sign in to manage and issue digital certificates.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-[#111827] dark:text-slate-300">
                  Email Address
                </label>
                <div className="relative">
                  <Mail
                    size={16}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@verimoo.com"
                    required
                    className="pl-9 h-10 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-[#111827] dark:text-slate-300">
                  Password
                </label>
                <div className="relative">
                  <Lock
                    size={16}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="pl-9 pr-9 h-10 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-lg bg-rose-50 p-2.5 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200/60 dark:border-rose-900/40">
                  <AlertCircle size={14} className="shrink-0 text-[#EF4444]" />
                  <span>{error}</span>
                </div>
              )}

              <Button type="submit" className="w-full h-10 text-sm font-semibold" loading={loading}>
                {loading ? "Authenticating..." : "Sign In"}
              </Button>
            </form>
          </Card>
        </motion.div>
      </main>

      <footer className="py-4 text-center text-xs text-[#64748B] dark:text-[#94A3B8]">
        <p>© {new Date().getFullYear()} VeriMoo Certificate Studio</p>
      </footer>
    </div>
  );
}
