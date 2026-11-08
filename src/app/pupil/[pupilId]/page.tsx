"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  getPupilById,
  getPupilTransactions,
  getPotsForPupil,
  getSavedClasses,
  autoReconcileAllClassesWeeklyIncome,
  getNextScheduledPayoutTime,
  BALANCE_SYNC_EVENT,
} from "@/lib/services/class-service";
import { PupilDocument, PotLedgerEntry, SavingsPotDocument } from "@/lib/firebase/types";
import {
  formatCurrency,
  createAnonymousPupilProfile,
  createStarterPots,
  createStarterTransactions,
} from "@/lib/firebase/zero-pii";
import { ChildBankCard } from "@/components/ui/ChildBankCard";
import { PupilBottomNav } from "@/components/ui/PupilBottomNav";
import { PupilNotificationBell } from "@/components/pupil/PupilNotificationBell";
import { AppTopHeader } from "@/components/ui/AppTopHeader";
import { getActiveJobForPupil } from "@/lib/services/jobs-service";
import {
  ShieldCheck,
  Sparkles,
  Layers,
  ArrowUpRight,
  ArrowDownLeft,
  Lock,
  Coins,
  Clock,
  Calendar,
  PlusCircle,
  ExternalLink,
} from "lucide-react";

interface PupilDashboardProps {
  params?: Promise<{ pupilId: string }> | { pupilId: string };
}

export default function PupilAccountPage(props: PupilDashboardProps) {
  // Safe resolution for Next.js 15+ / 16 dynamic route Promise unwrapping
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
  const [transactions, setTransactions] = useState<PotLedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Run real-world automated reconciliation check
    autoReconcileAllClassesWeeklyIncome();

    const loadData = () => {
      const activeId = pupilId.trim() || "pupil-1";
      const foundPupil = getPupilById(activeId);
      if (foundPupil) {
        setPupil(foundPupil);
        const pupilPots = getPotsForPupil(foundPupil.pupilId);
        const recentTxs = getPupilTransactions(foundPupil.pupilId, 3);
        setPots(pupilPots);
        setTransactions(recentTxs);
      } else {
        const fallback = createAnonymousPupilProfile("class-year-4-teal", 1, {
          anonymize: true,
        });
        fallback.pupilId = activeId;
        setPupil(fallback);
        setPots(createStarterPots(activeId, "class-year-4-teal"));
        setTransactions(createStarterTransactions(activeId, "class-year-4-teal").slice(0, 3));
      }
      setLoading(false);
    };

    loadData();

    const handleSync = () => loadData();
    window.addEventListener("storage", handleSync);
    window.addEventListener(BALANCE_SYNC_EVENT, handleSync);

    return () => {
      window.removeEventListener("storage", handleSync);
      window.removeEventListener(BALANCE_SYNC_EVENT, handleSync);
    };
  }, [pupilId]);

  if (loading || !pupil) {
    return (
      <main className="min-h-screen bg-canvas text-primaryText p-8 flex items-center justify-center font-lexend text-left">
        <div className="bg-surface rounded-pot p-8 border border-borderMuted shadow-islandCard space-y-3 text-left">
          <Sparkles className="w-8 h-8 text-brandPrimary animate-spin" />
          <h2 className="text-xl font-bold text-primaryText text-left">
            Opening your PocketPot Card...
          </h2>
          <p className="text-body text-primaryText/70 text-left">
            Loading your fintech account safely.
          </p>
        </div>
      </main>
    );
  }

  const displayName = pupil.localDisplayName || pupil.educationalCodename;
  const safePupilId = pupil.pupilId || pupilId || "anonymous";

  const classes = getSavedClasses();
  const pupilClass = classes.find((c) => c.classId === pupil?.classId);
  const weeklyIncomeCents = pupilClass?.weeklyBasicIncomeCents ?? 200;
  const payoutDay = pupilClass?.payoutDay ?? "Monday";
  const activeJob = getActiveJobForPupil(safePupilId);
  const activeJobWageCents = activeJob?.wageCents ?? 0;
  const totalWeeklyEarningsCents = weeklyIncomeCents + activeJobWageCents;

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

      <main className="flex-1 w-full max-w-5xl mx-auto p-4 md:p-8 pb-36 sm:pb-40 space-y-7 text-left">
        {/* 2. ACCOUNT BALANCE CARD WITH SIMPLIFIED WEEKLY EARNINGS */}
      <section className="bg-surface rounded-pot p-4 sm:p-6 md:p-8 border border-borderMuted shadow-islandCard text-left">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 text-left">
          <div className="space-y-1 text-left">
            <span className="text-xs uppercase tracking-wider font-bold text-primaryText/60 block text-left">
              Available Card Balance
            </span>
            <div className="mt-1 text-left">
              <span className="text-island-lg text-primaryText font-bold tracking-tight block text-left">
                {formatCurrency(pupil.mainBalanceCents)}
              </span>
            </div>
          </div>

          {/* Simplified Weekly Earnings Container */}
          <div className="bg-canvas p-4 rounded-island border border-borderMuted text-left min-w-[240px] flex items-center justify-between gap-4 shadow-xs">
            <div>
              <span className="text-xs font-bold text-primaryText block">
                Weekly Earnings
              </span>
              <span className="text-[11px] text-primaryText/60 block">
                Paid every {payoutDay} at 08:00
              </span>
            </div>
            <span className="text-lg font-bold text-positiveState">
              +{formatCurrency(totalWeeklyEarningsCents)}/wk
            </span>
          </div>
        </div>
      </section>

      {/* 3. CHILD'S FINTECH BANK CARD SECTION (Centered) */}
      <section className="flex justify-center w-full">
        <ChildBankCard
          cardholderName={displayName}
          cardLastFour={pupil.cardLastFour}
        />
      </section>

      {/* 4. RECENT ACTIVITY: LAST 3 TRANSACTIONS */}
      <section className="bg-surface rounded-pot p-4 sm:p-6 md:p-8 border border-borderMuted shadow-islandCard space-y-4 text-left">
        <div className="flex items-center justify-between border-b border-borderMuted pb-3 text-left">
          <div className="space-y-0.5 text-left">
            <h3 className="text-lg font-bold text-primaryText text-left">
              Recent Activity
            </h3>
            <p className="text-xs text-primaryText/60 text-left">
              Last 3 transactions on your card
            </p>
          </div>
        </div>

        {/* Exactly Last 3 Transactions */}
        <div className="divide-y divide-borderMuted text-left">
          {transactions.slice(0, 3).map((tx) => {
            const isInflow = tx.deltaCents > 0;
            const formattedDate = new Date(tx.timestamp).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <div
                key={tx.transactionId}
                className="py-3.5 flex items-center justify-between gap-4 hover:bg-canvas/50 px-2 rounded-island transition-colors text-left"
              >
                <div className="flex items-center gap-3.5 text-left">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      tx.type === "bonus"
                        ? "bg-tealSurface text-brandPrimary border border-brandPrimary/30"
                        : isInflow
                        ? "bg-greenSurface text-positiveState border border-positiveState/30"
                        : "bg-amberSurface text-brandSecondary border border-brandSecondary/30"
                    }`}
                  >
                    {tx.type === "bonus" ? (
                      <Sparkles className="w-5 h-5 text-brandPrimary" />
                    ) : isInflow ? (
                      <ArrowDownLeft className="w-5 h-5" />
                    ) : (
                      <ArrowUpRight className="w-5 h-5" />
                    )}
                  </div>

                  <div className="text-left space-y-0.5">
                    <h4 className="text-base font-bold text-primaryText text-left">
                      {tx.title}
                    </h4>
                    <p className="text-xs text-primaryText/70 text-left">
                      {tx.nonPunitiveNote} • {formattedDate}
                    </p>
                  </div>
                </div>

                {/* Amount in numerical format */}
                <div className="text-left flex-shrink-0">
                  <span
                    className={`text-lg font-bold block text-left ${
                      isInflow ? "text-positiveState" : "text-primaryText"
                    }`}
                  >
                    {isInflow ? "+" : ""}
                    {formatCurrency(tx.deltaCents)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>
      </main>

      {/* 5. CHILD-FACING BOTTOM NAVIGATION */}
      <PupilBottomNav
        pupilId={safePupilId}
        activeTab="card"
        potsCount={pots.length}
      />
    </div>
  );
}
