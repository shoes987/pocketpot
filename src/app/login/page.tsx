"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getStaffUsers, setCurrentStaffUser } from "@/lib/services/auth-service";
import { PocketPotLogo } from "@/components/ui/PocketPotLogo";
import {
  ShieldCheck,
  Lock,
  Mail,
  KeyRound,
  ArrowRight,
  AlertCircle,
  School,
  Sparkles,
  ArrowLeft,
  Eye,
  EyeOff,
  GraduationCap,
} from "lucide-react";

export default function AdultLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setErrorMessage("Please enter both your school email address and password to continue.");
      return;
    }

    setIsLoading(true);

    try {
      // 1. Sign in with Firebase Authentication
      const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
      const user = userCredential.user;

      // 2. Inspect custom token claims to determine educator role
      const tokenResult = await user.getIdTokenResult();
      const roleClaim = tokenResult.claims.role;

      // Sync local staff user profile if a matching email exists in the school directory
      try {
        const staff = getStaffUsers();
        const matchedStaff = staff.find(
          (u) => typeof u.email === "string" && u.email.toLowerCase() === (user.email || cleanEmail).toLowerCase()
        );
        if (matchedStaff) {
          setCurrentStaffUser(matchedStaff.userId);
        }
      } catch {
        // Fallback gracefully
      }

      // Route based on custom token claim
      if (roleClaim === "school_admin") {
        router.push("/admin");
      } else {
        // Otherwise (or if role === 'teacher')
        router.push("/teacher");
      }
    } catch (err: unknown) {
      setIsLoading(false);

      // Friendly, non-punitive error messaging using Lexend typography
      const firebaseError = err as { code?: string; message?: string };
      const code = firebaseError?.code || "";

      if (
        code === "auth/invalid-credential" ||
        code === "auth/wrong-password" ||
        code === "auth/user-not-found"
      ) {
        setErrorMessage(
          "We couldn't match that email address and password combination. Please double-check your school login details and try again."
        );
      } else if (code === "auth/invalid-email") {
        setErrorMessage(
          "Please enter a valid school email address (for example: educator@stmarys-primary.sch.uk)."
        );
      } else if (code === "auth/too-many-requests") {
        setErrorMessage(
          "Too many sign-in attempts have occurred. Please take a quick breather and try again in a few moments."
        );
      } else if (code === "auth/network-request-failed") {
        setErrorMessage(
          "We're having trouble connecting to the school network. Please check your Wi-Fi or internet connection and try again."
        );
      } else {
        setErrorMessage(
          "We encountered a hiccup while signing you in. Please check your credentials and try again."
        );
      }
    }
  };

  return (
    <main className="min-h-screen bg-canvas text-primaryText p-4 sm:p-6 md:p-10 font-lexend text-left flex flex-col justify-between">
      <div className="max-w-md mx-auto w-full my-auto space-y-6">
        {/* Back Link to Gateway */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-primaryText/60 hover:text-brandPrimary transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to Portal Overview</span>
        </Link>

        {/* Brand Card Container */}
        <div className="bg-surface rounded-3xl border border-borderMuted shadow-2xl p-6 sm:p-8 space-y-6 text-left">
          {/* Header Branding */}
          <div className="space-y-3 text-left">
            <div className="flex items-center justify-between">
              <PocketPotLogo variant="horizontal" size="md" />
              <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-tealSurface text-brandPrimary border border-brandPrimary/30">
                Staff Sign In
              </span>
            </div>

            <div>
              <h1 className="text-2xl font-black text-primaryText leading-tight">
                Educator Portal Login
              </h1>
              <p className="text-xs text-primaryText/70 font-medium mt-1">
                For Teachers, Teaching Assistants, and School Administrators.
              </p>
            </div>
          </div>

          {/* Friendly Non-Punitive Error Notice */}
          {errorMessage && (
            <div
              role="alert"
              className="p-3.5 rounded-2xl bg-amberSurface/80 text-brandSecondary border border-amber-300 text-xs font-medium flex items-start gap-2.5 animate-in fade-in"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-brandSecondary" />
              <div className="space-y-0.5">
                <strong className="block font-bold">Sign-in Notice</strong>
                <p className="leading-relaxed">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 text-left">
            {/* Email Field */}
            <div className="space-y-1.5 text-left">
              <label
                htmlFor="staff-email"
                className="block text-xs font-bold uppercase tracking-wider text-primaryText/70"
              >
                School Email Address
              </label>
              <div className="relative rounded-2xl border border-borderMuted focus-within:border-brandPrimary bg-canvas transition-colors">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-primaryText/40">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="staff-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="educator@stmarys-primary.sch.uk"
                  className="w-full pl-10 pr-4 py-3 text-sm bg-transparent rounded-2xl font-bold text-primaryText placeholder:text-primaryText/35 focus:outline-none"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5 text-left">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="staff-password"
                  className="block text-xs font-bold uppercase tracking-wider text-primaryText/70"
                >
                  Password
                </label>
              </div>
              <div className="relative rounded-2xl border border-borderMuted focus-within:border-brandPrimary bg-canvas transition-colors">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-primaryText/40">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="staff-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-11 py-3 text-sm bg-transparent rounded-2xl font-bold text-primaryText placeholder:text-primaryText/35 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-primaryText/40 hover:text-primaryText"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-5 rounded-2xl bg-brandPrimary hover:bg-teal-700 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer active:scale-98"
            >
              {isLoading ? (
                <span>Signing in...</span>
              ) : (
                <>
                  <span>Sign In to Educator Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Zero-PII Safeguarding Assurance */}
          <div className="p-3.5 rounded-2xl bg-canvas border border-borderMuted text-xs space-y-1 text-left">
            <div className="flex items-center gap-1.5 text-brandPrimary font-bold">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Strict Role-Based Routing</span>
            </div>
            <p className="text-primaryText/70 text-[11px] leading-relaxed">
              School Administrators are routed to Whole-School Governance (<code className="font-mono">/admin</code>). Teachers are routed strictly to classroom rosters (<code className="font-mono">/teacher</code>).
            </p>
          </div>
        </div>

        {/* Pupil Zero-PII Safeguard Notice */}
        <div className="p-4 rounded-2xl bg-surface/80 border border-borderMuted/80 text-xs text-left space-y-1">
          <div className="flex items-center gap-2 text-positiveState font-bold">
            <GraduationCap className="w-4 h-4 shrink-0" />
            <span>Are you a pupil?</span>
          </div>
          <p className="text-primaryText/70 text-[11px]">
            Pupils do not use passwords. To access your PocketPot debit card, use your classroom tablet with your <strong>Class Join Code &amp; 4-digit Desk PIN</strong>.
          </p>
          <Link
            href="/pupil/pupil-1"
            className="inline-flex items-center gap-1 font-bold text-positiveState hover:underline text-xs pt-1"
          >
            <span>Open Pupil Tablet View</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center text-xs text-primaryText/50 pt-6">
        PocketPot Educational Savings &bull; Key Stage 2 Safeguarded &bull; Compliant with DfE Standards
      </footer>
    </main>
  );
}
