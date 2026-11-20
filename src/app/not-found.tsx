"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PocketPotLogo } from "@/components/ui/PocketPotLogo";
import { TerracottaPotMascot } from "@/components/ui/TerracottaPotMascot";
import { ArrowLeft, Sparkles, Home, CreditCard } from "lucide-react";

export default function NotFound() {
  const router = useRouter();
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const pathname = window.location.pathname;

    // Smart legacy catch-all for any /pupil/... URLs
    if (pathname.startsWith("/pupil/") || pathname === "/pupil") {
      setRedirecting(true);

      const segments = pathname.split("/").filter(Boolean); // e.g. ["pupil", "<id>", "pots"]

      // Segment 1 is "pupil"
      // If segment 2 is a legacy UUID/ID, extract it
      if (segments.length >= 2) {
        const potentialId = segments[1];
        if (
          potentialId !== "card" &&
          potentialId !== "pots" &&
          potentialId !== "jobs" &&
          potentialId !== "marketplace"
        ) {
          try {
            localStorage.setItem("pocketpot_active_pupil_id", potentialId);
          } catch {
            // Ignore storage error
          }

          // Check if there is a subpage like /pupil/<id>/pots
          if (segments[2] === "pots") {
            window.location.replace(`/pupil/pots/?pupilId=${encodeURIComponent(potentialId)}`);
            return;
          }
          if (segments[2] === "jobs") {
            window.location.replace(`/pupil/jobs/?pupilId=${encodeURIComponent(potentialId)}`);
            return;
          }
          if (segments[2] === "marketplace") {
            window.location.replace(`/pupil/marketplace/?pupilId=${encodeURIComponent(potentialId)}`);
            return;
          }

          // Default legacy root /pupil/<id> -> redirect to /pupil/card/
          window.location.replace(`/pupil/card/?pupilId=${encodeURIComponent(potentialId)}`);
          return;
        }
      }

      // If just generic /pupil or unexpected pupil path
      window.location.replace("/pupil/card/");
    }
  }, [router]);

  if (redirecting) {
    return (
      <main className="min-h-screen bg-canvas text-primaryText p-8 flex items-center justify-center font-lexend text-center">
        <div className="bg-surface rounded-pot p-8 border border-borderMuted shadow-islandCard space-y-3 max-w-sm mx-auto">
          <Sparkles className="w-8 h-8 text-brandPrimary animate-spin mx-auto" />
          <h2 className="text-lg font-bold text-primaryText">Taking you to your PocketPot Card...</h2>
          <p className="text-xs text-primaryText/70">Connecting safely</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-canvas text-primaryText font-lexend flex flex-col justify-between p-4 sm:p-6 md:p-8">
      <header className="max-w-4xl w-full mx-auto flex items-center justify-between pb-6 border-b border-borderMuted/60">
        <Link href="/" className="flex items-center gap-2.5">
          <PocketPotLogo className="w-9 h-9" />
          <span className="font-black text-xl tracking-tight text-primaryText">PocketPot</span>
        </Link>
      </header>

      <div className="max-w-md w-full mx-auto my-auto py-8 text-center space-y-5">
        <div className="flex justify-center">
          <TerracottaPotMascot size="lg" />
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-black text-primaryText">Page Not Found</h1>
          <p className="text-sm text-primaryText/70 max-w-xs mx-auto leading-relaxed">
            We couldn&apos;t find this page, but your PocketPot seeds and savings are safe!
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            href="/pupil"
            className="w-full sm:w-auto px-5 py-2.5 rounded-full bg-brandPrimary hover:bg-teal-700 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-2 transition-all"
          >
            <CreditCard className="w-4 h-4" />
            <span>Pupil Login</span>
          </Link>
          <Link
            href="/"
            className="w-full sm:w-auto px-5 py-2.5 rounded-full bg-surface hover:bg-canvas border border-borderMuted text-primaryText font-bold text-xs shadow-xs flex items-center justify-center gap-2 transition-all"
          >
            <Home className="w-4 h-4" />
            <span>Return Home</span>
          </Link>
        </div>
      </div>

      <footer className="text-center py-4 text-xs text-primaryText/50">
        PocketPot &bull; Invest in the Future
      </footer>
    </main>
  );
}
