"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  getPupilById,
  getPotsForPupil,
} from "@/lib/services/class-service";
import { PupilDocument, SavingsPotDocument } from "@/lib/firebase/types";
import {
  createAnonymousPupilProfile,
  createStarterPots,
} from "@/lib/firebase/zero-pii";
import { PupilMarketplace } from "@/components/pupil/PupilMarketplace";
import { PupilBottomNav } from "@/components/ui/PupilBottomNav";
import { PupilNotificationBell } from "@/components/pupil/PupilNotificationBell";
import { AppTopHeader } from "@/components/ui/AppTopHeader";
import { Sparkles, ShieldCheck, ArrowLeft, ShoppingBag } from "lucide-react";

interface MarketplacePageProps {
  params?: Promise<{ pupilId: string }> | { pupilId: string };
}

export default function PupilMarketplacePage(props: MarketplacePageProps) {
  const unwrappedParams =
    props?.params &&
    typeof (React as unknown as { use?: (p: unknown) => { pupilId?: string } }).use === "function"
      ? (React as unknown as { use: (p: unknown) => { pupilId?: string } }).use(props.params)
      : null;

  const routeParams = useParams();

  const pupilId: string =
    unwrappedParams?.pupilId ||
    (typeof routeParams?.pupilId === "string" ? routeParams.pupilId : "") ||
    "";

  const [pupil, setPupil] = useState<PupilDocument | null>(null);
  const [pots, setPots] = useState<SavingsPotDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const activeId = pupilId.trim() || crypto.randomUUID();
    let foundPupil = pupilId.trim() ? getPupilById(pupilId.trim()) : null;
    let pupilPots = pupilId.trim() ? getPotsForPupil(pupilId.trim()) : [];

    if (!foundPupil) {
      foundPupil = createAnonymousPupilProfile("class-year-4-teal", 1, {
        anonymize: true,
      });
      foundPupil.pupilId = activeId;
      pupilPots = createStarterPots(activeId, "class-year-4-teal");
    }

    setPupil(foundPupil);
    setPots(pupilPots);
    setLoading(false);
  }, [pupilId]);

  if (loading || !pupil) {
    return (
      <main className="min-h-screen bg-canvas text-primaryText p-8 flex items-center justify-center font-lexend text-left">
        <div className="bg-surface rounded-pot p-8 border border-borderMuted shadow-islandCard space-y-3 text-left">
          <Sparkles className="w-8 h-8 text-brandPrimary animate-spin" />
          <h2 className="text-xl font-bold text-primaryText">Opening Classroom Market...</h2>
        </div>
      </main>
    );
  }

  const displayName = pupil.localDisplayName || pupil.educationalCodename;

  return (
    <div className="min-h-screen bg-canvas text-primaryText font-lexend text-left flex flex-col">
      {/* 1. TRUE FULL-WIDTH STICKY TOP HEADER IN TEAL */}
      <AppTopHeader
        role="pupil"
        pupilId={pupil.pupilId}
        userName={displayName}
        badgeNumber={pupil.deskBadgeNumber}
        notificationBell={<PupilNotificationBell pupilId={pupil.pupilId} inverted={true} />}
      />

      <main className="flex-1 w-full max-w-5xl mx-auto p-4 sm:p-6 md:p-8 pb-56 sm:pb-64 md:pb-72 text-left">
        {/* Pupil Marketplace Component */}
        <PupilMarketplace pupilId={pupil.pupilId} />

        {/* Extra spacer to guarantee a generous gap above the fixed bottom navigation */}
        <div className="h-10 sm:h-14 w-full" aria-hidden="true" />
      </main>

      {/* Pupil Bottom Navigation */}
      <PupilBottomNav
        pupilId={pupil.pupilId}
        activeTab="marketplace"
        potsCount={pots.length}
      />
    </div>
  );
}
