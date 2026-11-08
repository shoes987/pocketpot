"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  MarketplaceRewardDocument,
  MarketplacePurchaseDocument,
  PupilDocument,
  SavingsPotDocument,
} from "@/lib/firebase/types";
import {
  getSavedRewards,
  getSavedPurchases,
  purchaseReward,
  createPotForReward,
  normalizeClassId,
} from "@/lib/services/marketplace-service";
import { getPupilById, getPotsForPupil, getSavedPupils, BALANCE_SYNC_EVENT } from "@/lib/services/class-service";
import { formatCurrency } from "@/lib/firebase/zero-pii";
import {
  ShoppingBag,
  Sparkles,
  Layers,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  CreditCard,
  PoundSterling,
  AlertCircle,
} from "lucide-react";

interface PupilMarketplaceProps {
  pupilId: string;
}

export const PupilMarketplace: React.FC<PupilMarketplaceProps> = ({ pupilId }) => {
  const [pupil, setPupil] = useState<PupilDocument | null>(null);
  const [rewards, setRewards] = useState<MarketplaceRewardDocument[]>([]);
  const [myPurchases, setMyPurchases] = useState<MarketplacePurchaseDocument[]>([]);
  const [myPots, setMyPots] = useState<SavingsPotDocument[]>([]);

  // Mindful Spending Pause Modal State
  const [selectedRewardToBuy, setSelectedRewardToBuy] = useState<MarketplaceRewardDocument | null>(null);
  const [mindfulCountdown, setMindfulCountdown] = useState<number>(3);
  const [isPauseActive, setIsPauseActive] = useState<boolean>(false);

  // New Pot Created Success Modal
  const [createdPot, setCreatedPot] = useState<SavingsPotDocument | null>(null);

  // Success Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = () => {
    let p = getPupilById(pupilId);
    if (!p) {
      const allPupils = getSavedPupils();
      p = allPupils.find((pup) => pup.pupilId === pupilId) || allPupils[0] || null;
    }
    setPupil(p || null);

    const targetClassId = p?.classId ? normalizeClassId(p.classId) : "class-year-4-teal";
    const allRewards = getSavedRewards(targetClassId);
    // Strict requirement: Only display items activated by the teacher
    const activeRewards = allRewards.filter((r) => r.isAvailable);
    setRewards(activeRewards);

    const effectivePupilId = p?.pupilId || pupilId;
    setMyPurchases(getSavedPurchases(targetClassId, effectivePupilId));
    setMyPots(getPotsForPupil(effectivePupilId));
  };

  useEffect(() => {
    loadData();

    // Real-time link between teacher setup and pupil account
    const handleSync = () => loadData();
    window.addEventListener("pocketpot_marketplace_updated", handleSync);
    window.addEventListener("storage", handleSync);
    window.addEventListener(BALANCE_SYNC_EVENT, handleSync);

    return () => {
      window.removeEventListener("pocketpot_marketplace_updated", handleSync);
      window.removeEventListener("storage", handleSync);
      window.removeEventListener(BALANCE_SYNC_EVENT, handleSync);
    };
  }, [pupilId]);

  // Handle Mindful Spending Pause countdown
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (selectedRewardToBuy && isPauseActive && mindfulCountdown > 0) {
      timer = setTimeout(() => {
        setMindfulCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearTimeout(timer);
  }, [selectedRewardToBuy, isPauseActive, mindfulCountdown]);

  const handleStartPurchasePause = (reward: MarketplaceRewardDocument) => {
    setSelectedRewardToBuy(reward);
    setMindfulCountdown(3);
    setIsPauseActive(true);
  };

  const handleConfirmPurchase = () => {
    if (!selectedRewardToBuy || !pupil) return;

    const res = purchaseReward(pupil.pupilId, selectedRewardToBuy.rewardId);
    if (res.success) {
      showToast(`🎉 You unlocked "${selectedRewardToBuy.title}"! Enjoy your privilege.`);
      setSelectedRewardToBuy(null);
      setIsPauseActive(false);
      loadData();
    } else {
      showToast(res.error || "Unable to complete purchase right now.");
      setSelectedRewardToBuy(null);
      setIsPauseActive(false);
    }
  };

  const handleCancelPurchase = () => {
    setSelectedRewardToBuy(null);
    setIsPauseActive(false);
    showToast("Good thinking! Keeping your money safe to keep growing.");
  };

  const handleSetUpPot = (reward: MarketplaceRewardDocument) => {
    if (!pupil) return;
    const newPot = createPotForReward(pupil.pupilId, pupil.classId, reward);
    setCreatedPot(newPot);
    loadData();
  };

  const cardBalance = pupil?.mainBalanceCents || 0;

  return (
    <div className="space-y-6 text-left font-lexend max-w-5xl mx-auto pb-16">
      {/* 1. TOP BALANCE BAR */}
      <div className="p-5 sm:p-6 rounded-pot bg-surface border border-borderMuted shadow-islandCard flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-brandPrimary" />
            <span className="text-xs font-extrabold uppercase tracking-wider text-brandPrimary">
              Classroom Market
            </span>
          </div>
          <h2 className="text-2xl font-bold text-primaryText">Market Privileges &amp; Rewards</h2>
          <p className="text-xs sm:text-sm text-primaryText/70 font-medium">
            Spend your card earnings on classroom privileges, or set up a Savings Pot for larger goals!
          </p>
        </div>

        {/* Current Available Balance Card */}
        <div className="bg-canvas p-3.5 sm:p-4 rounded-2xl border border-borderMuted flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-tealSurface text-brandPrimary flex items-center justify-center text-xl shadow-xs">
            <CreditCard className="w-5 h-5 text-brandPrimary" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-primaryText/60 block">Available on Your Card</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-extrabold text-primaryText">{formatCurrency(cardBalance)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. PEDAGOGICAL ENCOURAGEMENT CARD */}
      <div className="p-4 rounded-2xl bg-tealSurface/60 border border-brandPrimary/20 flex items-center justify-between gap-3 text-xs text-primaryText/80 font-medium">
        <div className="flex items-center gap-2.5">
          <Sparkles className="w-4 h-4 text-brandPrimary shrink-0" />
          <span>
            <strong>Smart Saving Tip:</strong> Quick rewards are fun today, but saving in a <strong>Savings Pot</strong> lets you achieve big dreams like choosing your own desk!
          </span>
        </div>
        <Link
          href={`/pupil/${pupilId}/pots`}
          className="text-xs font-bold text-brandPrimary hover:underline shrink-0 hidden sm:inline"
        >
          View My Pots &rarr;
        </Link>
      </div>

      {/* 3. REWARD MARKET GRID */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-primaryText flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-brandPrimary" />
            <span>Available Privileges ({rewards.length})</span>
          </h3>
          <span className="text-xs text-primaryText/60">
            {myPurchases.length} Privileges Enjoyed
          </span>
        </div>

        {rewards.length === 0 ? (
          <div className="p-10 rounded-pot bg-surface border border-dashed border-borderMuted text-center space-y-3 shadow-islandCard">
            <div className="w-14 h-14 rounded-2xl bg-tealSurface text-brandPrimary mx-auto flex items-center justify-center text-2xl shadow-xs">
              🌱
            </div>
            <div className="space-y-1">
              <h4 className="text-base font-bold text-primaryText">
                No active rewards in the Market right now
              </h4>
              <p className="text-xs text-primaryText/70 max-w-md mx-auto leading-relaxed">
                Your teacher will activate class rewards soon. In the meantime, keep saving your earnings on your card and in your Savings Pots!
              </p>
            </div>
            <Link
              href={`/pupil/${pupilId}/pots`}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-tealSurface text-brandPrimary font-bold text-xs hover:bg-tealSurface/80 transition-colors"
            >
              <Layers className="w-4 h-4" />
              <span>Explore My Savings Pots</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {rewards.map((reward) => {
              const isAffordable = cardBalance >= reward.priceCoins;
              const isShortTerm = reward.tier === "short_term";
              const neededCents = reward.priceCoins - cardBalance;

              // Check if pupil already has a pot for this goal
              const potTitle = `Goal: ${reward.title}`;
              const existingPot = myPots.find(
                (p) => p.title.toLowerCase() === potTitle.toLowerCase() && p.status !== "taking_a_pause"
              );

              return (
                <div
                  key={reward.rewardId}
                  className="p-5 rounded-pot bg-surface border border-borderMuted shadow-islandCard flex flex-col justify-between space-y-4 hover:border-brandPrimary/30 transition-all text-left group"
                >
                  <div className="space-y-3">
                    {/* Top Bar: Icon & Tier Tag */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="w-14 h-14 rounded-2xl bg-canvas border border-borderMuted flex items-center justify-center text-3xl shadow-xs group-hover:scale-105 transition-transform">
                        {reward.icon}
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase border ${
                            isShortTerm
                              ? "bg-tealSurface text-brandPrimary border-brandPrimary/30"
                              : "bg-amberSurface text-brandSecondary border-brandSecondary/30"
                          }`}
                        >
                          {isShortTerm ? "⚡ Quick Treat" : "🏔️ Big Goal"}
                        </span>

                        <div className="flex items-center gap-1 text-sm font-extrabold text-primaryText">
                          <span>{formatCurrency(reward.priceCoins)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Title & Description */}
                    <div>
                      <h4 className="text-base font-bold text-primaryText group-hover:text-brandPrimary transition-colors">
                        {reward.title}
                      </h4>
                      <p className="text-xs text-primaryText/75 mt-1 leading-relaxed">
                        {reward.description}
                      </p>
                    </div>
                  </div>

                  {/* ACTION BUTTON SECTION: Mindful Purchase OR Set Up a Pot */}
                  <div className="pt-3 border-t border-borderMuted/60 space-y-2">
                    {isAffordable ? (
                      /* AFFORDABLE ITEM: Mindful Direct Purchase */
                      <div>
                        <button
                          type="button"
                          onClick={() => handleStartPurchasePause(reward)}
                          className="w-full py-2.5 px-4 rounded-xl bg-brandPrimary hover:bg-teal-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all"
                        >
                          <Sparkles className="w-4 h-4 text-white" />
                          <span>Buy Reward ({formatCurrency(reward.priceCoins)})</span>
                        </button>
                        <span className="text-[10px] text-positiveState font-semibold block text-center mt-1">
                          ✓ Ready on your card balance
                        </span>
                      </div>
                    ) : (
                      /* UNAFFORDABLE ITEM: Set Up a Pot (Delayed Gratification) */
                      <div className="space-y-1.5">
                        {existingPot ? (
                          <Link
                            href={`/pupil/${pupilId}/pots`}
                            className="w-full py-2.5 px-4 rounded-xl bg-amberSurface hover:bg-amberSurface/80 text-brandSecondary border border-brandSecondary/30 font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all"
                          >
                            <Layers className="w-4 h-4 text-brandSecondary" />
                            <span>
                              View Your Savings Pot ({formatCurrency(existingPot.currentAmountCents || 0)} / {formatCurrency(reward.priceCoins)})
                            </span>
                          </Link>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSetUpPot(reward)}
                            className="w-full py-2.5 px-4 rounded-xl bg-amberSurface hover:bg-amberSurface/80 text-brandSecondary border border-brandSecondary/30 font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all"
                          >
                            <Layers className="w-4 h-4 text-brandSecondary" />
                            <span>Set Up a Pot for This!</span>
                          </button>
                        )}

                        {/* Encouraging Non-Punitive Microcopy (Cash representation only) */}
                        <p className="text-[11px] text-primaryText/70 text-center font-medium leading-tight">
                          Taking a quiet moment: you're <strong>{formatCurrency(neededCents)} away</strong>. Let's puzzle this out by saving!
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. REDEEMED VOUCHERS & HISTORY */}
      {myPurchases.length > 0 && (
        <div className="pt-4 space-y-3">
          <h3 className="text-lg font-bold text-primaryText flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-positiveState" />
            <span>My Active Privileges &amp; History ({myPurchases.length})</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {myPurchases.map((p) => {
              const isFulfilled = p.status === "fulfilled";
              const isRefunded = p.status === "refunded";

              return (
                <div
                  key={p.purchaseId}
                  className="p-4 rounded-2xl bg-surface border border-borderMuted shadow-xs flex items-start gap-3"
                >
                  <div className="w-10 h-10 rounded-xl bg-canvas flex items-center justify-center text-xl shrink-0">
                    {p.rewardIcon}
                  </div>
                  <div className="space-y-1 flex-1">
                    <span className="text-xs font-bold text-primaryText block leading-tight">
                      {p.rewardTitle}
                    </span>
                    <span className="text-[11px] text-brandSecondary font-semibold block">
                      {formatCurrency(p.priceCoins)}
                    </span>
                    <div>
                      {isFulfilled ? (
                        <span className="text-[10px] text-positiveState font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Enjoyed in class
                        </span>
                      ) : isRefunded ? (
                        <span className="text-[10px] text-primaryText/50 font-bold">
                          Refunded to card
                        </span>
                      ) : (
                        <span className="text-[10px] text-brandSecondary font-bold flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Ready to enjoy with teacher
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MINDFUL SPENDING PAUSE MODAL */}
      {selectedRewardToBuy && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-primaryText/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
        >
          <div className="bg-surface rounded-pot border border-borderMuted shadow-2xl p-6 sm:p-8 space-y-5 max-w-md w-full text-center">
            {/* Mindful Breathing Graphic */}
            <div className="w-20 h-20 rounded-full bg-tealSurface text-brandPrimary mx-auto flex items-center justify-center text-3xl border-4 border-brandPrimary/30 animate-pulse shadow-sm">
              {selectedRewardToBuy.icon}
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-extrabold uppercase tracking-wider text-brandPrimary block">
                Mindful Spending Moment
              </span>
              <h3 className="text-xl font-bold text-primaryText">
                Take a Quiet Breath...
              </h3>
              <p className="text-xs sm:text-sm text-primaryText/75 leading-relaxed font-medium">
                You are about to spend <strong>{formatCurrency(selectedRewardToBuy.priceCoins)}</strong> on <strong>"{selectedRewardToBuy.title}"</strong>.
              </p>
            </div>

            {/* Reflection Balance Check */}
            <div className="p-3.5 rounded-2xl bg-canvas border border-borderMuted text-xs flex items-center justify-around font-medium">
              <div>
                <span className="text-primaryText/60 block text-[10px]">Your Card Now</span>
                <strong className="text-sm text-primaryText">{formatCurrency(cardBalance)}</strong>
              </div>
              <ArrowRight className="w-4 h-4 text-primaryText/40" />
              <div>
                <span className="text-primaryText/60 block text-[10px]">After Buying</span>
                <strong className="text-sm text-brandPrimary">
                  {formatCurrency(cardBalance - selectedRewardToBuy.priceCoins)}
                </strong>
              </div>
            </div>

            <p className="text-xs text-primaryText/70 italic">
              Is this something you really want right now, or would you like to keep growing your card balance for an even bigger goal?
            </p>

            {/* Countdown / Confirmation Buttons */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleConfirmPurchase}
                disabled={mindfulCountdown > 0}
                className={`w-full py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs ${
                  mindfulCountdown > 0
                    ? "bg-canvas text-primaryText/40 border border-borderMuted cursor-not-allowed"
                    : "bg-brandPrimary hover:bg-teal-700 text-white"
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>
                  {mindfulCountdown > 0
                    ? `Pausing to think... (${mindfulCountdown}s)`
                    : `Yes, I'm Ready to Buy (${formatCurrency(selectedRewardToBuy.priceCoins)})`}
                </span>
              </button>

              <button
                type="button"
                onClick={handleCancelPurchase}
                className="w-full py-2.5 px-4 rounded-xl bg-canvas hover:bg-tealSurface text-primaryText/80 hover:text-brandPrimary font-bold text-xs border border-borderMuted transition-colors"
              >
                🌱 Keep Saving For Later
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NEW SAVINGS POT CREATED CELEBRATION MODAL */}
      {createdPot && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-primaryText/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
        >
          <div className="bg-surface rounded-pot border border-borderMuted shadow-2xl p-6 sm:p-8 space-y-5 max-w-md w-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-amberSurface text-brandSecondary mx-auto flex items-center justify-center text-3xl shadow-sm border border-brandSecondary/20">
              🏺
            </div>

            <div className="space-y-1">
              <span className="text-xs font-extrabold uppercase tracking-wider text-brandSecondary">
                Goal Set Up!
              </span>
              <h3 className="text-xl font-bold text-primaryText">
                Your New Savings Pot is Ready!
              </h3>
              <p className="text-xs sm:text-sm text-primaryText/75 leading-relaxed font-medium">
                We've created a dedicated Savings Pot: <strong>"{createdPot.title}"</strong> with a target of <strong>{formatCurrency(createdPot.targetAmountCents)}</strong>.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-canvas border border-borderMuted text-xs space-y-1 text-left font-medium">
              <div className="flex items-center justify-between">
                <span className="text-primaryText/60">Target Goal:</span>
                <strong className="text-primaryText">{formatCurrency(createdPot.targetAmountCents)}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-primaryText/60">Current Amount:</span>
                <strong className="text-positiveState">£0.00 (Ready for seeds!)</strong>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <Link
                href={`/pupil/${pupilId}/pots`}
                className="w-full py-3 px-4 rounded-xl bg-brandPrimary hover:bg-teal-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all"
              >
                <Layers className="w-4 h-4" />
                <span>Go to My Savings Pots &rarr;</span>
              </Link>
              <button
                type="button"
                onClick={() => setCreatedPot(null)}
                className="w-full py-2.5 px-4 rounded-xl bg-canvas hover:bg-borderMuted text-primaryText/70 font-bold text-xs transition-colors"
              >
                Keep Exploring the Market
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification (Floating above PupilBottomNav) */}
      {toastMessage && (
        <div className="fixed bottom-24 right-4 sm:right-6 z-50 bg-primaryText text-white px-4 py-3 rounded-2xl shadow-xl border border-white/10 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <Sparkles className="w-4 h-4 text-brandSecondary" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
