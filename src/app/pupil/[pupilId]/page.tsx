"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  getPupilById,
  getPupilTransactions,
  getPotsForPupil,
  getSavedClasses,
  autoReconcileAllClassesWeeklyIncome,
  getNextScheduledPayoutTime,
  BALANCE_SYNC_EVENT,
} from "@/lib/services/class-service";
import { PupilDocument, PotLedgerEntry, SavingsPotDocument, ClassDocument } from "@/lib/firebase/types";
import {
  formatCurrency,
  getPupilDisplayName,
  createAnonymousPupilProfile,
  createStarterTransactions,
} from "@/lib/firebase/zero-pii";
import { ChildBankCard } from "@/components/ui/ChildBankCard";
import { TerracottaPotMascot } from "@/components/ui/TerracottaPotMascot";
import { PupilBottomNav } from "@/components/ui/PupilBottomNav";
import { PupilNotificationBell } from "@/components/pupil/PupilNotificationBell";
import { AppTopHeader } from "@/components/ui/AppTopHeader";
import { getActiveJobForPupil } from "@/lib/services/jobs-service";
import { subscribeToPupil, subscribeToPots, subscribeToClasses, subscribeToTransactions } from "@/lib/firebase/firestore-service";
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
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export default function PupilAccountPage() {
  const router = useRouter();
  const routeParams = useParams();
  const pupilId: string = typeof routeParams?.pupilId === "string" ? routeParams.pupilId : "";

  const [pupil, setPupil] = useState<PupilDocument | null>(null);
  const [pots, setPots] = useState<SavingsPotDocument[]>([]);
  const [classes, setClasses] = useState<ClassDocument[]>([]);
  const [transactions, setTransactions] = useState<PotLedgerEntry[]>([]);
  const [showAll30Days, setShowAll30Days] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Cross-pupil isolation guard: enforce that logged-in PIN session matches pupilId
    try {
      const activePupilId = localStorage.getItem("pocketpot_active_pupil_id");
      if (activePupilId && pupilId && activePupilId !== pupilId) {
        router.replace(`/pupil/${activePupilId}`);
        return;
      }
    } catch {
      // Ignore storage error
    }

    // Run real-world automated reconciliation check
    autoReconcileAllClassesWeeklyIncome();

    const activeId = pupilId.trim() || "pupil-1";
    let targetRealId = activeId;

    const loadData = () => {
      setClasses(getSavedClasses());
      const foundPupil = getPupilById(activeId);
      if (foundPupil) {
        targetRealId = foundPupil.pupilId;
        setPupil(foundPupil);
        const pupilPots = getPotsForPupil(foundPupil.pupilId);
        const recentTxs = getPupilTransactions(foundPupil.pupilId, 100);
        setPots(pupilPots);
        setTransactions(recentTxs);
        setLoading(false);
      }
    };

    loadData();

    // Real-time Firestore onSnapshot listeners
    const unsubPupil = subscribeToPupil(targetRealId, (livePupil) => {
      if (livePupil) {
        setPupil(livePupil);
      }
      setLoading(false);
    });

    const unsubPots = subscribeToPots((livePots) => {
      setPots(livePots);
    }, targetRealId);

    const unsubClasses = subscribeToClasses((liveClasses) => {
      setClasses(liveClasses);
    });

    const unsubTransactions = subscribeToTransactions(targetRealId, (liveTxs) => {
      if (liveTxs && liveTxs.length > 0) {
        setTransactions((prev) => {
          const map = new Map<string, PotLedgerEntry>();
          liveTxs.forEach((tx) => map.set(tx.transactionId, tx));
          prev.forEach((tx) => {
            if (!map.has(tx.transactionId)) {
              map.set(tx.transactionId, tx);
            }
          });
          const merged = Array.from(map.values());
          merged.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          return merged;
        });
      }
    });

    const handleSync = () => loadData();
    window.addEventListener("storage", handleSync);
    window.addEventListener(BALANCE_SYNC_EVENT, handleSync);

    return () => {
      unsubPupil();
      unsubPots();
      unsubClasses();
      unsubTransactions();
      window.removeEventListener("storage", handleSync);
      window.removeEventListener(BALANCE_SYNC_EVENT, handleSync);
    };
  }, [pupilId]);

  if (loading) {
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

  const pupilClass = (classes.length > 0 ? classes : getSavedClasses()).find((c) => c.classId === pupil?.classId);
  const displayName = getPupilDisplayName(pupil, pupilClass);
  const safePupilId = pupil.pupilId || pupilId || "anonymous";
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

      <main className="flex-1 w-full max-w-5xl mx-auto p-4 md:p-8 pb-56 sm:pb-64 md:pb-72 space-y-7 text-left">
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

      {/* 3. CHILD'S FINTECH BANK CARD SECTION WITH STANDING TERRACOTTA POT BUDDY */}
      <section className="flex flex-col sm:flex-row items-center sm:items-end justify-center gap-4 sm:gap-6 w-full max-w-2xl mx-auto">
        {/* Terracotta Pot Buddy Mascot standing to the left of the card */}
        <div className="shrink-0 flex items-end justify-center pb-2">
          <TerracottaPotMascot
            size="md"
            className="w-24 sm:w-28 md:w-32 h-auto drop-shadow-sm hover:scale-105 transition-transform duration-200 cursor-pointer"
            ariaLabel="PocketPot terracotta pot buddy standing proudly next to your card"
          />
        </div>

        {/* Physical Bank Card */}
        <div className="w-full max-w-md flex justify-center">
          <ChildBankCard
            cardholderName={displayName}
            cardLastFour={pupil.cardLastFour}
          />
        </div>
      </section>

      {/* 4. RECENT ACTIVITY: LAST 3 TRANSACTIONS WITH 'SHOW MORE (LAST 30 DAYS)' */}
      {(() => {
        const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
        const last30DaysTransactions = transactions.filter(
          (tx) => new Date(tx.timestamp).getTime() >= thirtyDaysAgo
        );
        const effective30DayList =
          last30DaysTransactions.length >= 3
            ? last30DaysTransactions
            : transactions;
        const displayedTransactions = showAll30Days
          ? effective30DayList
          : transactions.slice(0, 3);

        return (
          <section className="bg-surface rounded-pot p-4 sm:p-6 md:p-8 border border-borderMuted shadow-islandCard space-y-4 text-left">
            <div className="flex items-center justify-between border-b border-borderMuted pb-3 text-left">
              <div className="space-y-0.5 text-left">
                <h3 className="text-lg font-bold text-primaryText text-left">
                  Recent Activity
                </h3>
                <p className="text-xs text-primaryText/60 text-left">
                  {showAll30Days
                    ? `Showing transactions from the last 30 days (${displayedTransactions.length} total)`
                    : "Showing the last 3 transactions on your card"}
                </p>
              </div>
            </div>

            {/* Transaction List */}
            <div className="divide-y divide-borderMuted text-left">
              {displayedTransactions.length === 0 ? (
                <div className="py-6 text-center text-sm text-primaryText/60">
                  No activity recorded in the last 30 days yet.
                </div>
              ) : (
                displayedTransactions.map((tx) => {
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
                })
              )}
            </div>

            {/* Show More / Show Less Toggle Button */}
            <div className="pt-2 border-t border-borderMuted">
              {!showAll30Days ? (
                <button
                  type="button"
                  onClick={() => setShowAll30Days(true)}
                  className="w-full py-2.5 px-4 rounded-xl border border-brandPrimary/30 bg-tealSurface/70 hover:bg-tealSurface text-brandPrimary font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brandPrimary shadow-2xs"
                >
                  <span>Show More (Last 30 Days)</span>
                  <ChevronDown className="w-4 h-4 stroke-[2.5]" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowAll30Days(false)}
                  className="w-full py-2.5 px-4 rounded-xl border border-borderMuted bg-canvas hover:bg-surface text-primaryText/75 hover:text-primaryText font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brandPrimary shadow-2xs"
                >
                  <span>Show Less (Last 3 Transactions)</span>
                  <ChevronUp className="w-4 h-4 stroke-[2.5]" />
                </button>
              )}
            </div>
          </section>
        );
      })()}

      {/* Extra spacer to guarantee a generous gap above the fixed bottom navigation */}
      <div className="h-10 sm:h-14 w-full" aria-hidden="true" />
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
