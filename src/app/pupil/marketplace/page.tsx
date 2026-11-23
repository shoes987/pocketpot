"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  getPupilById,
  getPotsForPupil,
} from "@/lib/services/class-service";
import { PupilDocument, SavingsPotDocument } from "@/lib/firebase/types";
import { getPupilDisplayName } from "@/lib/firebase/zero-pii";
import { subscribeToPupil, subscribeToPots } from "@/lib/firebase/firestore-service";
import { PupilMarketplace } from "@/components/pupil/PupilMarketplace";
import { PupilBottomNav } from "@/components/ui/PupilBottomNav";
import { PupilNotificationBell } from "@/components/pupil/PupilNotificationBell";
import { AppTopHeader } from "@/components/ui/AppTopHeader";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { Sparkles } from "lucide-react";

function PupilMarketplaceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryPupilId = searchParams.get("pupilId");

  const [activeId, setActiveId] = useState<string>("");
  const [pupil, setPupil] = useState<PupilDocument | null>(null);
  const [pots, setPots] = useState<SavingsPotDocument[]>([]);
  const [loading, setLoading] = useState(true);

  // Resolve active pupil ID from query param or session storage
  useEffect(() => {
    let resolvedId = queryPupilId?.trim();
    if (!resolvedId) {
      try {
        resolvedId = localStorage.getItem("pocketpot_active_pupil_id") || "";
      } catch {
        // Ignore storage error
      }
    }

    if (!resolvedId) {
      router.replace("/pupil");
      return;
    }

    setActiveId(resolvedId);
  }, [queryPupilId, router]);

  useEffect(() => {
    if (!activeId) return;

    let targetRealId = activeId;
    const foundPupil = getPupilById(activeId);
    if (foundPupil) {
      targetRealId = foundPupil.pupilId;
      setPupil(foundPupil);
      setPots(getPotsForPupil(foundPupil.pupilId));
      setLoading(false);
    }

    const unsubPupil = subscribeToPupil(targetRealId, (livePupil) => {
      if (livePupil) {
        setPupil(livePupil);
      }
      setLoading(false);
    });

    const unsubPots = subscribeToPots((livePots) => {
      setPots(livePots);
    }, targetRealId);

    return () => {
      unsubPupil();
      unsubPots();
    };
  }, [activeId]);

  if (loading) {
    return (
      <main className="min-h-screen bg-canvas text-primaryText p-8 flex items-center justify-center font-lexend text-left">
        <div className="bg-surface rounded-pot p-8 border border-borderMuted shadow-islandCard space-y-3 text-left">
          <Sparkles className="w-8 h-8 text-brandPrimary animate-spin" />
          <h2 className="text-xl font-bold text-primaryText">Opening Classroom Market...</h2>
        </div>
      </main>
    );
  }

  if (!pupil) {
    return (
      <main className="min-h-screen bg-canvas text-primaryText p-8 flex items-center justify-center font-lexend text-center">
        <div className="bg-surface rounded-pot p-8 border border-borderMuted shadow-islandCard space-y-4 max-w-md mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-amberSurface text-brandSecondary mx-auto flex items-center justify-center text-2xl font-bold">
            🌱
          </div>
          <h2 className="text-xl font-bold text-primaryText">
            Let&apos;s puzzle this out together!
          </h2>
          <p className="text-body text-primaryText/70 text-sm">
            We couldn&apos;t find an active desk card for this link. Check your desk card code and PIN, or ask your teacher to check the class roster.
          </p>
          <Link
            href="/pupil"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-brandPrimary text-white font-bold text-xs"
          >
            Go to Pupil Login
          </Link>
        </div>
      </main>
    );
  }

  const displayName = getPupilDisplayName(pupil);
  const safePupilId = pupil.pupilId || activeId || "anonymous";

  return (
    <div className="min-h-screen bg-canvas text-primaryText font-lexend text-left flex flex-col">
      {/* 1. TRUE FULL-WIDTH STICKY TOP HEADER IN TEAL */}
      <AppTopHeader
        role="pupil"
        pupilId={safePupilId}
        userName={displayName}
        badgeNumber={pupil.deskBadgeNumber}
        notificationBell={<PupilNotificationBell pupilId={safePupilId} inverted={true} />}
      />

      <main className="flex-1 w-full max-w-5xl mx-auto p-4 sm:p-6 md:p-8 pb-56 sm:pb-64 md:pb-72 text-left">
        {/* Pupil Marketplace Component */}
        <PupilMarketplace pupilId={safePupilId} />

        {/* Extra spacer to guarantee a generous gap above the fixed bottom navigation */}
        <div className="h-10 sm:h-14 w-full" aria-hidden="true" />
      </main>

      {/* Pupil Bottom Navigation */}
      <PupilBottomNav
        pupilId={safePupilId}
        activeTab="marketplace"
        potsCount={pots.length}
      />
    </div>
  );
}

export default function PupilMarketplacePage() {
  return (
    <ErrorBoundary
      fallbackTitle="Opening Classroom Market"
      fallbackMessage="We encountered a quick hiccup loading your marketplace. Tap below to reload."
    >
      <Suspense
        fallback={
          <main className="min-h-screen bg-canvas text-primaryText p-8 flex items-center justify-center font-lexend text-left">
            <div className="bg-surface rounded-pot p-8 border border-borderMuted shadow-islandCard space-y-3 text-left">
              <Sparkles className="w-8 h-8 text-brandPrimary animate-spin" />
              <h2 className="text-xl font-bold text-primaryText">Opening Classroom Market...</h2>
            </div>
          </main>
        }
      >
        <PupilMarketplaceContent />
      </Suspense>
    </ErrorBoundary>
  );
}
