"use client";

import React, { useState, useEffect, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  getSavedClasses,
  getSavedPupils,
  savePupils,
} from "@/lib/services/class-service";
import { PupilDocument, ClassDocument } from "@/lib/firebase/types";
import { PocketPotLogo } from "@/components/ui/PocketPotLogo";
import { TerracottaPotMascot } from "@/components/ui/TerracottaPotMascot";
import {
  CreditCard,
  Lock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  HelpCircle,
  KeyRound,
  CheckCircle2,
  LogOut,
  RefreshCw,
  Coins,
} from "lucide-react";

export default function PupilLoginPage() {
  const router = useRouter();

  const [joinCode, setJoinCode] = useState("");
  const [pin, setPin] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Check for existing active session stored in localStorage (Zero-PII)
  const [activeSession, setActiveSession] = useState<{
    pupilId: string;
    codename: string;
    badge?: string;
  } | null>(null);

  useEffect(() => {
    try {
      const savedId = localStorage.getItem("pocketpot_active_pupil_id");
      const savedName = localStorage.getItem("pocketpot_active_pupil_codename");
      const savedBadge = localStorage.getItem("pocketpot_active_pupil_badge");
      if (savedId && savedName) {
        setActiveSession({
          pupilId: savedId,
          codename: savedName,
          badge: savedBadge || undefined,
        });
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  const handleClearSession = () => {
    try {
      localStorage.removeItem("pocketpot_active_pupil_id");
      localStorage.removeItem("pocketpot_active_pupil_codename");
      localStorage.removeItem("pocketpot_active_pupil_badge");
      localStorage.removeItem("pocketpot_active_pupil_class_id");
      setActiveSession(null);
    } catch {
      // Ignore
    }
  };

  const handleQuickFill = (code: string, cardPin: string) => {
    setJoinCode(code);
    setPin(cardPin);
    setErrorMessage(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const enteredCode = joinCode.trim().toUpperCase();
    const enteredPin = pin.trim();

    if (!enteredCode || enteredPin.length !== 4) {
      setErrorMessage("Let's puzzle this out together! Check your desk card code and PIN.");
      return;
    }

    setIsLoading(true);

    try {
      let matchedPupil: PupilDocument | null = null;
      let matchedClassId: string | null = null;

      // 1. Query Cloud Firestore /classes collection for matching active joinCode / classJoinCode
      try {
        const classesRef = collection(db, "classes");
        let classSnap = await getDocs(
          query(classesRef, where("joinCode", "==", enteredCode), limit(1))
        );
        if (classSnap.empty) {
          classSnap = await getDocs(
            query(classesRef, where("classJoinCode", "==", enteredCode), limit(1))
          );
        }

        if (!classSnap.empty) {
          const classDoc = classSnap.docs[0];
          matchedClassId = classDoc.id || (classDoc.data() as ClassDocument).classId;

          // 2. Query /pupils matching that classId and pin (or cardLastFour)
          const pupilsRef = collection(db, "pupils");
          let pupilSnap = await getDocs(
            query(
              pupilsRef,
              where("classId", "==", matchedClassId),
              where("pinNumber", "==", enteredPin),
              limit(1)
            )
          );

          if (pupilSnap.empty) {
            pupilSnap = await getDocs(
              query(
                pupilsRef,
                where("classId", "==", matchedClassId),
                where("pin", "==", enteredPin),
                limit(1)
              )
            );
          }

          if (pupilSnap.empty) {
            pupilSnap = await getDocs(
              query(
                pupilsRef,
                where("classId", "==", matchedClassId),
                where("cardLastFour", "==", enteredPin),
                limit(1)
              )
            );
          }

          // 3. Fallback to subcollection: /classes/{classId}/pupils
          if (pupilSnap.empty && matchedClassId) {
            const subPupilsRef = collection(db, "classes", matchedClassId, "pupils");
            pupilSnap = await getDocs(
              query(subPupilsRef, where("pinNumber", "==", enteredPin), limit(1))
            );
            if (pupilSnap.empty) {
              pupilSnap = await getDocs(
                query(subPupilsRef, where("pin", "==", enteredPin), limit(1))
              );
            }
            if (pupilSnap.empty) {
              pupilSnap = await getDocs(
                query(subPupilsRef, where("cardLastFour", "==", enteredPin), limit(1))
              );
            }
          }

          if (!pupilSnap.empty) {
            const pDoc = pupilSnap.docs[0];
            matchedPupil = {
              pupilId: pDoc.id,
              ...(pDoc.data() as Omit<PupilDocument, "pupilId">),
            };
          }
        }
      } catch (firestoreErr) {
        // Offline IndexedDB or unauthenticated pupil fallback
        console.warn("Firestore query fallback to local cache:", firestoreErr);
      }

      // Offline / Local Mock Fallback (ensures classroom iPads work without internet)
      if (!matchedPupil) {
        const localClasses = getSavedClasses();
        const localClass = localClasses.find(
          (c) =>
            c.classJoinCode?.trim().toUpperCase() === enteredCode ||
            c.joinCode?.trim().toUpperCase() === enteredCode
        );

        if (localClass) {
          const localPupils = getSavedPupils();
          const localPupil = localPupils.find(
            (p) =>
              p.classId === localClass.classId &&
              (p.pinNumber === enteredPin || p.cardLastFour === enteredPin)
          );

          if (localPupil) {
            matchedPupil = localPupil;
            matchedClassId = localClass.classId;
          }
        }
      }

      // If credentials do not match any class/pupil
      if (!matchedPupil) {
        setErrorMessage("Let's puzzle this out together! Check your desk card code and PIN.");
        setIsLoading(false);
        return;
      }

      // Zero-PII session storage: Purely stored in React state & localStorage
      // Strictly avoid Firebase Authentication for pupils
      localStorage.setItem("pocketpot_active_pupil_id", matchedPupil.pupilId);
      localStorage.setItem(
        "pocketpot_active_pupil_codename",
        matchedPupil.educationalCodename ||
          `Pupil #${matchedPupil.deskBadgeNumber || "101"}`
      );
      if (matchedPupil.deskBadgeNumber) {
        localStorage.setItem(
          "pocketpot_active_pupil_badge",
          String(matchedPupil.deskBadgeNumber)
        );
      }
      if (matchedClassId || matchedPupil.classId) {
        localStorage.setItem(
          "pocketpot_active_pupil_class_id",
          matchedClassId || matchedPupil.classId
        );
      }

      // Ensure pupil document exists in local cache so [pupilId] page resolves immediately
      const currentPupils = getSavedPupils();
      if (!currentPupils.some((p) => p.pupilId === matchedPupil?.pupilId)) {
        savePupils([...currentPupils, matchedPupil]);
      }

      // Route directly to the pupil dashboard card (full navigation to bypass stale in-memory client router)
      if (typeof window !== "undefined") {
        window.location.assign("/pupil/card/");
      } else {
        router.push("/pupil/card/");
      }
    } catch {
      setErrorMessage("Let's puzzle this out together! Check your desk card code and PIN.");
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-canvas text-primaryText font-lexend flex flex-col justify-between p-4 sm:p-6 md:p-8">
      {/* Top Navbar */}
      <header className="max-w-4xl w-full mx-auto flex items-center justify-between pb-6 border-b border-borderMuted/60">
        <Link href="/" className="flex items-center gap-2.5 group">
          <PocketPotLogo className="w-9 h-9" />
          <div className="text-left">
            <span className="font-black text-xl tracking-tight text-primaryText block leading-tight">
              PocketPot
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-brandPrimary block">
              Pupil Tablet Portal
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-tealSurface text-brandPrimary text-xs font-bold border border-brandPrimary/20">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            <span>Zero-PII Safeguarded</span>
          </div>
          <Link
            href="/login"
            className="text-xs font-bold text-primaryText/60 hover:text-brandPrimary transition-colors flex items-center gap-1"
          >
            <span>Educator Login</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      {/* Main Login Card Container */}
      <div className="max-w-md w-full mx-auto my-auto py-6 space-y-5 text-left">
        {/* Active Session Resume Card (if child already signed in on this tablet) */}
        {activeSession && (
          <div className="p-4 rounded-2xl bg-tealSurface/70 border border-brandPrimary/40 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-brandPrimary font-bold text-xs uppercase tracking-wider">
                <Sparkles className="w-4 h-4 shrink-0" />
                <span>Active Tablet Session</span>
              </div>
              <button
                type="button"
                onClick={handleClearSession}
                className="text-[11px] font-bold text-primaryText/50 hover:text-primaryText flex items-center gap-1 transition-colors"
                title="Switch card"
              >
                <LogOut className="w-3 h-3" />
                <span>Switch Pupil</span>
              </button>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <strong className="text-base font-bold text-primaryText block">
                  {activeSession.codename}
                </strong>
                <span className="text-xs text-primaryText/70">
                  {activeSession.badge ? `Desk Badge #${activeSession.badge}` : "Classroom Card"} &bull; Ready to explore
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (typeof window !== "undefined") {
                    window.location.assign("/pupil/card/");
                  } else {
                    router.push("/pupil/card/");
                  }
                }}
                className="px-4 py-2 rounded-xl bg-brandPrimary hover:bg-teal-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 transition-all active:scale-95 shrink-0"
              >
                <span>Continue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Mascot & Portal Introduction */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="relative">
              <TerracottaPotMascot size="md" />
              <div className="absolute -bottom-1 -right-1 p-1 bg-surface rounded-full shadow-xs border border-borderMuted">
                <CreditCard className="w-4 h-4 text-brandPrimary" />
              </div>
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-primaryText">
            Welcome to PocketPot!
          </h1>
          <p className="text-xs sm:text-sm text-primaryText/70 max-w-sm mx-auto font-medium">
            Enter your 6-digit Class Join Code and secret 4-digit card PIN from your desk card.
          </p>
        </div>

        {/* Friendly Lexend Error Message */}
        {errorMessage && (
          <div
            role="alert"
            className="p-4 rounded-2xl bg-amberSurface border border-amber-300 text-warningState flex items-start gap-3 shadow-xs animate-in fade-in slide-in-from-top-1"
          >
            <Sparkles className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <strong className="text-xs font-bold uppercase tracking-wider block text-amber-900">
                Let&apos;s check your details
              </strong>
              <p className="text-xs font-semibold text-primaryText/90 leading-relaxed font-lexend">
                {errorMessage}
              </p>
            </div>
          </div>
        )}

        {/* Form Card */}
        <div className="p-6 sm:p-7 rounded-3xl bg-surface border border-borderMuted shadow-islandCard space-y-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Class Join Code Input */}
            <div className="space-y-1.5">
              <label
                htmlFor="pupil-join-code"
                className="block text-xs font-bold uppercase tracking-wider text-primaryText/70"
              >
                Class Join Code
              </label>
              <div className="relative rounded-2xl border border-borderMuted focus-within:border-brandPrimary bg-canvas transition-colors">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-primaryText/40">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  id="pupil-join-code"
                  type="text"
                  maxLength={10}
                  required
                  autoCapitalize="characters"
                  autoComplete="off"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="e.g. 749281"
                  className="w-full pl-10 pr-4 py-3 text-base sm:text-lg bg-transparent rounded-2xl font-mono font-bold tracking-widest text-primaryText placeholder:text-primaryText/30 uppercase focus:outline-none"
                />
              </div>
              <span className="text-[11px] text-primaryText/50 font-medium block">
                Found on your classroom desk card or teacher&apos;s smartboard.
              </span>
            </div>

            {/* 4-Digit Secret PIN Input */}
            <div className="space-y-1.5">
              <label
                htmlFor="pupil-pin"
                className="block text-xs font-bold uppercase tracking-wider text-primaryText/70"
              >
                4-Digit Secret Card PIN
              </label>
              <div className="relative rounded-2xl border border-borderMuted focus-within:border-brandPrimary bg-canvas transition-colors">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-primaryText/40">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="pupil-pin"
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  required
                  autoComplete="off"
                  value={pin}
                  onChange={(e) => {
                    const clean = e.target.value.replace(/\D/g, "");
                    setPin(clean);
                  }}
                  placeholder="••••"
                  className="w-full pl-10 pr-4 py-3 text-lg sm:text-xl bg-transparent rounded-2xl font-mono font-bold tracking-widest text-primaryText placeholder:text-primaryText/30 focus:outline-none"
                />
              </div>
              <span className="text-[11px] text-primaryText/50 font-medium block">
                The 4-digit secret PIN from your PocketPot debit card.
              </span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !joinCode || pin.length !== 4}
              className="w-full py-3.5 px-5 rounded-2xl bg-brandPrimary hover:bg-teal-700 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Checking your card...</span>
                </>
              ) : (
                <>
                  <span>Open My PocketPot Card</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Assist for Classroom & Offline Testing */}
          <div className="pt-3 border-t border-borderMuted/60 space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-primaryText/50 block">
              Quick Demo Classroom Fill:
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleQuickFill("749281", "3611")}
                className="px-2.5 py-1.5 rounded-lg bg-canvas hover:bg-tealSurface border border-borderMuted hover:border-brandPrimary/40 text-[11px] font-bold text-primaryText/80 transition-colors flex items-center gap-1.5"
              >
                <span className="w-2 h-2 rounded-full bg-brandPrimary" />
                <span>Year 4 Teal (Code: 749281 &bull; PIN: 3611)</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill("831902", "4821")}
                className="px-2.5 py-1.5 rounded-lg bg-canvas hover:bg-amberSurface border border-borderMuted hover:border-amber-400 text-[11px] font-bold text-primaryText/80 transition-colors flex items-center gap-1.5"
              >
                <span className="w-2 h-2 rounded-full bg-brandSecondary" />
                <span>Year 4 Amber (Code: 831902 &bull; PIN: 4821)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Desk Card Helper Guide */}
        <div className="p-4 rounded-2xl bg-canvas border border-borderMuted text-xs space-y-1.5 text-left">
          <div className="flex items-center gap-1.5 text-brandPrimary font-bold">
            <HelpCircle className="w-4 h-4 shrink-0" />
            <span>Need help finding your card code?</span>
          </div>
          <p className="text-primaryText/70 text-[11px] leading-relaxed font-medium">
            Look at the physical PocketPot card on your classroom desk. Your 6-digit Join Code is printed on the top corner, and your 4-digit PIN is under the security box. If you cannot find it, ask your teacher!
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="max-w-4xl w-full mx-auto text-center text-xs text-primaryText/50 pt-6 border-t border-borderMuted/60">
        PocketPot Educational Savings &bull; Key Stage 2 Safeguarded &bull; Strictly Zero-PII Classroom Sessions
      </footer>
    </main>
  );
}
