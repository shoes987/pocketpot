"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  getPupilById,
  getPotsForPupil,
  depositToPotFromAccount,
  withdrawFromPotToAccount,
  createPupilPot,
  deleteSavingsPot,
  BALANCE_SYNC_EVENT,
} from "@/lib/services/class-service";
import { PupilDocument, SavingsPotDocument, PotAccentTheme } from "@/lib/firebase/types";
import {
  formatCurrency,
  createAnonymousPupilProfile,
  createStarterPots,
} from "@/lib/firebase/zero-pii";
import { getSimplifiedFraction } from "@/lib/utils/money-breakdown";
import { ChildBankCard } from "@/components/ui/ChildBankCard";
import { SavingsPot } from "@/components/ui/SavingsPot";
import { CreatePotModal } from "@/components/ui/CreatePotModal";
import { PupilBottomNav } from "@/components/ui/PupilBottomNav";
import { PupilNotificationBell } from "@/components/pupil/PupilNotificationBell";
import { AppTopHeader } from "@/components/ui/AppTopHeader";
import { PotGraphic } from "@/components/ui/PotGraphic";
import { CoinBuddyMascot } from "@/components/ui/CoinBuddyMascot";
import {
  Plus,
  Sparkles,
  CreditCard,
  Target,
  ArrowUp,
  ChevronRight,
} from "lucide-react";

interface PotsPageProps {
  params?: Promise<{ pupilId: string }> | { pupilId: string };
}

export default function PupilPotsPage(props: PotsPageProps) {
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
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    const loadPupilData = () => {
      const activeId = pupilId.trim() || "pupil-1";
      const foundPupil = getPupilById(activeId);
      if (foundPupil) {
        setPupil(foundPupil);
        const pupilPots = getPotsForPupil(foundPupil.pupilId);
        setPots(pupilPots);
      } else {
        const fallback = createAnonymousPupilProfile("class-year-4-teal", 1, {
          anonymize: true,
        });
        fallback.pupilId = activeId;
        setPupil(fallback);
        setPots(createStarterPots(activeId, "class-year-4-teal"));
      }
      setLoading(false);
    };

    loadPupilData();

    const handleSync = () => loadPupilData();
    window.addEventListener("storage", handleSync);
    window.addEventListener(BALANCE_SYNC_EVENT, handleSync);

    return () => {
      window.removeEventListener("storage", handleSync);
      window.removeEventListener(BALANCE_SYNC_EVENT, handleSync);
    };
  }, [pupilId]);

  const handleDeposit = (potId: string, amountCents: number) => {
    if (!pupil?.pupilId) return;

    try {
      const { pot: updatedPot, updatedPupil } = depositToPotFromAccount(
        pupil.pupilId,
        potId,
        amountCents
      );
      setPots((prev) => prev.map((p) => (p.potId === potId ? updatedPot : p)));
      setPupil(updatedPupil);
      setFeedbackMessage(
        `Added ${formatCurrency(amountCents)} to ${updatedPot.title}! Remaining on card: ${formatCurrency(updatedPupil.mainBalanceCents)}.`
      );
      setTimeout(() => setFeedbackMessage(null), 4000);
    } catch (err: unknown) {
      setFeedbackMessage(
        err instanceof Error ? err.message : "Unable to add funds to this pot."
      );
      setTimeout(() => setFeedbackMessage(null), 4000);
    }
  };

  const handleWithdraw = (potId: string, amountCents: number) => {
    if (!pupil?.pupilId) return;

    try {
      const { pot: updatedPot, updatedPupil } = withdrawFromPotToAccount(
        pupil.pupilId,
        potId,
        amountCents
      );
      setPots((prev) => prev.map((p) => (p.potId === potId ? updatedPot : p)));
      setPupil(updatedPupil);
      setFeedbackMessage(
        `Withdrew ${formatCurrency(amountCents)} from ${updatedPot.title} back to your card! Card balance: ${formatCurrency(updatedPupil.mainBalanceCents)}.`
      );
      setTimeout(() => setFeedbackMessage(null), 4000);
    } catch (err: unknown) {
      setFeedbackMessage(
        err instanceof Error ? err.message : "Not enough funds in this pot."
      );
      setTimeout(() => setFeedbackMessage(null), 4000);
    }
  };

  const handleCreatePot = (payload: {
    title: string;
    targetAmountCents: number;
    categoryLabel?: string;
    theme?: PotAccentTheme;
  }) => {
    if (!pupil?.pupilId) return;
    try {
      const { pot: newPot, updatedPupil } = createPupilPot(pupil.pupilId, payload);
      setPots((prev) => [...prev, newPot]);
      setPupil(updatedPupil);
      setFeedbackMessage(
        `Created new pot "${newPot.title}" with a target of ${formatCurrency(newPot.targetAmountCents)}!`
      );
      setTimeout(() => setFeedbackMessage(null), 4000);
    } catch (err: unknown) {
      setFeedbackMessage(
        err instanceof Error ? err.message : "Could not create pot."
      );
      setTimeout(() => setFeedbackMessage(null), 4000);
    }
  };

  const handleDeletePot = (potId: string) => {
    if (!pupil?.pupilId) return;
    const target = pots.find((p) => p.potId === potId);
    try {
      const { refundedCents, updatedPupil } = deleteSavingsPot(pupil.pupilId, potId);
      setPots((prev) => prev.filter((p) => p.potId !== potId));
      setPupil(updatedPupil);
      if (refundedCents > 0) {
        setFeedbackMessage(
          `Deleted "${target?.title}". ${formatCurrency(refundedCents)} automatically returned to your card balance!`
        );
      } else {
        setFeedbackMessage(`Deleted "${target?.title}".`);
      }
      setTimeout(() => setFeedbackMessage(null), 5000);
    } catch (err: unknown) {
      setFeedbackMessage(
        err instanceof Error ? err.message : "Could not delete pot."
      );
      setTimeout(() => setFeedbackMessage(null), 4000);
    }
  };

  if (loading || !pupil) {
    return (
      <main className="min-h-screen bg-canvas text-primaryText p-8 flex items-center justify-center font-lexend text-left">
        <div className="bg-surface rounded-2xl p-8 border border-borderMuted shadow-sm space-y-3 text-left">
          <Sparkles className="w-8 h-8 text-brandPrimary animate-spin" />
          <h2 className="text-xl font-bold text-primaryText text-left">
            Opening your Savings Pots...
          </h2>
        </div>
      </main>
    );
  }

  const displayName = pupil.localDisplayName || pupil.educationalCodename;
  const safePupilId = pupil.pupilId || pupilId || "anonymous";

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

      <main className="flex-1 w-full max-w-5xl mx-auto p-4 md:p-8 pb-56 sm:pb-64 md:pb-72 space-y-6 text-left">
        {/* 1.5 PEDAGOGICAL COIN BUDDY SPEECH BUBBLE */}
        <section className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
          {/* Thoughtful Coin Buddy Mascot */}
          <div className="shrink-0 flex items-center justify-center pt-1">
            <CoinBuddyMascot
              size="md"
              className="w-20 sm:w-24 md:w-28 h-auto drop-shadow-sm hover:scale-105 transition-transform duration-200 cursor-pointer"
              ariaLabel="PocketPot coin buddy explaining the purpose of savings pots"
            />
          </div>

          {/* Speech Bubble Container */}
          <div className="relative flex-1 bg-surface border border-teal-200/80 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-islandCard">
            {/* Desktop Speech Bubble Pointer (Left) */}
            <div
              className="hidden sm:block absolute -left-2.5 top-8 w-0 h-0 border-y-8 border-y-transparent border-r-8 border-r-teal-300"
              aria-hidden="true"
            />
            <div
              className="hidden sm:block absolute -left-2 top-8 w-0 h-0 border-y-8 border-y-transparent border-r-8 border-r-surface"
              aria-hidden="true"
            />
            {/* Mobile Speech Bubble Pointer (Top) */}
            <div
              className="sm:hidden absolute -top-2.5 left-1/2 -translate-x-1/2 w-0 h-0 border-x-8 border-x-transparent border-b-8 border-b-teal-300"
              aria-hidden="true"
            />
            <div
              className="sm:hidden absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-x-8 border-x-transparent border-b-8 border-b-surface"
              aria-hidden="true"
            />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs sm:text-sm text-primaryText/85">
              <div className="space-y-1.5 text-left">
                <div className="flex items-center gap-2">
                  <span className="text-base text-brandPrimary leading-none">💡</span>
                  <span className="text-xs sm:text-sm font-extrabold text-brandPrimary uppercase tracking-wider">
                    What are Savings Pots for?
                  </span>
                </div>
                <p className="leading-relaxed text-xs sm:text-sm text-primaryText/80">
                  Your <strong className="font-bold text-primaryText">debit card</strong> is for everyday
                  spending, but <strong className="font-bold text-brandPrimary">Savings Pots</strong> let
                  you lock money safely away for bigger dreams! Stashing coins in a pot stops you from
                  accidentally spending them on quick treats so you can reach rewards like choosing your
                  own desk or special privileges.
                </p>
              </div>

              {/* Action Button: Open Create Pot Modal */}
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-tealSurface hover:bg-brandPrimary hover:text-white text-brandPrimary font-bold text-xs shrink-0 transition-colors border border-brandPrimary/20 self-end sm:self-center shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Pot</span>
              </button>
            </div>
          </div>
        </section>

        {/* 2. OVERVIEW ISLANDS: [DEBIT CARD WITH AMOUNT UNDERNEATH] & [STACKED POTS WITH AMOUNT UNDERNEATH] */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
        {/* Card 1: Available on Debit Card with Debit Card Graphic */}
        <div className="bg-surface rounded-3xl p-6 border border-borderMuted shadow-sm flex flex-col items-center justify-between text-center space-y-4">
          <div className="w-full flex justify-center items-center min-h-[200px]">
            <ChildBankCard
              cardholderName={displayName}
              cardLastFour={pupil.cardLastFour}
              className="max-w-[320px] sm:max-w-[340px] h-48 shadow-lg"
            />
          </div>
          <div className="text-center space-y-1 pt-1">
            <span className="text-xs uppercase font-extrabold tracking-wider text-primaryText/60 block">
              Available on Debit Card
            </span>
            <span className="text-island-32 text-brandPrimary font-bold block">
              {formatCurrency(pupil.mainBalanceCents)}
            </span>
          </div>
        </div>

        {/* Card 2: Total Saved in All Pots with Stacked Pots Graphic */}
        <div className="bg-surface rounded-3xl p-6 border border-borderMuted shadow-sm flex flex-col items-center justify-between text-center space-y-4">
          <div className="w-full flex justify-center items-center min-h-[200px]">
            <div className="w-[180px] h-[192px] rounded-2xl bg-[#EEF3EF] border border-[#D8E4DC] p-3 flex items-center justify-center relative overflow-hidden shadow-xs">
              <svg
                viewBox="0 0 140 150"
                className="w-[130px] h-[140px] overflow-visible drop-shadow-sm my-auto"
              >
                {/* Top Nested Pot */}
                <g id="overview-top-pot">
                  <path
                    d="M 28 40 L 34 85 C 34 89, 40 92, 50 92 L 90 92 C 100 92, 106 89, 106 85 L 112 40 Z"
                    fill="#7EA99D"
                  />
                  <rect
                    x="22"
                    y="30"
                    width="96"
                    height="16"
                    rx="8"
                    fill="#6C978B"
                  />
                  <rect
                    x="26"
                    y="32"
                    width="88"
                    height="3"
                    rx="1.5"
                    fill="rgba(255, 255, 255, 0.25)"
                  />
                  <text
                    x="70"
                    y="66"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#FFFFFF"
                    fontSize="15"
                    fontWeight="700"
                    fontFamily="Lexend, sans-serif"
                    className="select-none"
                  >
                    Pots
                  </text>
                </g>

                {/* Bottom Supporting Pot */}
                <g id="overview-bottom-pot">
                  <path
                    d="M 18 84 L 26 132 C 27 139, 36 142, 48 142 L 92 142 C 104 142, 113 139, 114 132 L 122 84 Z"
                    fill="#477063"
                  />
                  <rect
                    x="12"
                    y="74"
                    width="116"
                    height="18"
                    rx="9"
                    fill="#3A5E53"
                  />
                  <rect
                    x="16"
                    y="76"
                    width="108"
                    height="3.5"
                    rx="1.75"
                    fill="rgba(255, 255, 255, 0.2)"
                  />
                  <text
                    x="70"
                    y="115"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#FFFFFF"
                    fontSize="16"
                    fontWeight="700"
                    fontFamily="Lexend, sans-serif"
                    className="select-none"
                  >
                    Saved
                  </text>
                </g>
              </svg>
            </div>
          </div>
          <div className="text-center space-y-1 pt-1">
            <span className="text-xs uppercase font-extrabold tracking-wider text-primaryText/60 block">
              Total Saved in All Pots
            </span>
            <span className="text-island-32 text-brandSecondary font-bold block">
              {formatCurrency(pupil.totalSavedCents)}
            </span>
          </div>
        </div>
      </section>

      {/* Feedback Toast Alert */}
      {feedbackMessage && (
        <div
          role="status"
          className="p-4 rounded-2xl bg-tealSurface border border-brandPrimary/30 text-primaryText flex items-center gap-3 text-left animate-in fade-in"
        >
          <Sparkles className="w-5 h-5 text-brandPrimary flex-shrink-0" />
          <p className="text-sm font-bold text-left">{feedbackMessage}</p>
        </div>
      )}

      {/* 3. INTERACTIVE POTS GRID: ADD MONEY (TEAL) & WITHDRAW MONEY (AMBER) */}
      <section className="space-y-4 text-left">
        <div className="flex flex-wrap items-center justify-between gap-3 text-left">
          <div>
            <h2 className="text-xl font-bold text-primaryText text-left">
              Your Savings Pots ({pots.length})
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="py-2 px-4 rounded-xl bg-brandPrimary hover:bg-teal-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 focus-visible:outline focus-visible:outline-3 focus-visible:outline-focusIndicator"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>+ Create Pot</span>
          </button>
        </div>

        {pots.length === 0 ? (
          <div className="bg-surface rounded-3xl p-10 border border-borderMuted text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-tealSurface text-brandPrimary mx-auto flex items-center justify-center font-bold text-xl">
              🎯
            </div>
            <h3 className="text-lg font-bold text-primaryText">You don&apos;t have any Savings Pots yet!</h3>
            <p className="text-sm text-primaryText/70 max-w-sm mx-auto">
              Create your first pot to start saving for school trips, books, or exciting projects.
            </p>
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="py-2.5 px-5 rounded-xl bg-brandPrimary text-white font-bold text-sm hover:bg-teal-700 transition-all shadow-sm"
            >
              + Create Your First Pot
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
            {pots.map((pot) => (
              <SavingsPot
                key={pot.potId}
                id={pot.potId}
                title={pot.title}
                theme={pot.theme}
                categoryLabel={pot.categoryLabel}
                targetAmountCents={pot.targetAmountCents}
                initialAmountCents={pot.currentAmountCents}
                availableCardBalanceCents={pupil.mainBalanceCents}
                onAddAmount={(incrementCents) => handleDeposit(pot.potId, incrementCents)}
                onWithdrawAmount={(decrementCents) => handleWithdraw(pot.potId, decrementCents)}
                onDeletePot={(potId) => handleDeletePot(potId)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Extra spacer to guarantee a generous gap above the fixed bottom navigation */}
      <div className="h-10 sm:h-14 w-full" aria-hidden="true" />

      {/* CREATE NEW POT MODAL */}
      <CreatePotModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreatePot={handleCreatePot}
      />
      </main>

      {/* 4. FIXED CHILD-FACING BOTTOM NAVIGATION */}
      <PupilBottomNav
        pupilId={safePupilId}
        activeTab="pots"
        potsCount={pots.length}
      />
    </div>
  );
}