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
import { PocketPotMascot } from "@/components/ui/PocketPotMascot";
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
  Coins,
  Check,
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

      {/* 2. PEDAGOGICAL ENCOURAGEMENT: MASCOT SPEECH BUBBLE */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
        {/* PocketPot Mascot Avatar */}
        <div className="shrink-0 flex items-center justify-center pt-1">
          <PocketPotMascot
            size="md"
            className="w-16 sm:w-20 drop-shadow-sm hover:scale-105 transition-transform duration-200 cursor-pointer"
            ariaLabel="PocketPot seedling buddy giving a smart savings tip"
          />
        </div>

        {/* Speech Bubble Container */}
        <div className="relative flex-1 bg-surface border border-teal-200/80 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-islandCard">
          {/* Speech bubble pointer / tail pointing towards mascot */}
          {/* Desktop pointer on the left */}
          <div
            className="hidden sm:block absolute -left-2.5 top-6 w-0 h-0 border-y-8 border-y-transparent border-r-8 border-r-teal-300"
            aria-hidden="true"
          />
          <div
            className="hidden sm:block absolute -left-2 top-6 w-0 h-0 border-y-8 border-y-transparent border-r-8 border-r-surface"
            aria-hidden="true"
          />
          {/* Mobile pointer on top */}
          <div
            className="sm:hidden absolute -top-2.5 left-1/2 -translate-x-1/2 w-0 h-0 border-x-8 border-x-transparent border-b-8 border-b-teal-300"
            aria-hidden="true"
          />
          <div
            className="sm:hidden absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-x-8 border-x-transparent border-b-8 border-b-surface"
            aria-hidden="true"
          />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm text-primaryText/85">
            <div className="flex items-start gap-2.5">
              <span className="text-base text-brandPrimary leading-none shrink-0 mt-0.5">✨</span>
              <p className="leading-relaxed">
                <strong className="font-extrabold text-brandPrimary">Smart Saving Tip:</strong>{" "}
                Quick rewards are fun today, but saving in a{" "}
                <strong className="font-bold text-primaryText">Savings Pot</strong> lets you achieve big
                dreams like choosing your own desk!
              </p>
            </div>
            <Link
              href={`/pupil/${pupilId}/pots`}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-full bg-tealSurface text-brandPrimary hover:bg-brandPrimary hover:text-white font-bold text-xs shrink-0 transition-colors border border-brandPrimary/20 self-end sm:self-center"
            >
              <span>View My Pots</span>
              <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>
        </div>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                  className={`bg-surface rounded-3xl border border-borderMuted shadow-islandCard flex flex-col justify-between overflow-hidden hover:shadow-md transition-all text-left ${
                    !isAffordable ? "opacity-90" : ""
                  }`}
                >
                  {/* Header Band: Terracotta for Short Quick Wins (#C2410C), Teal for Long Term Goals (#0D9488) */}
                  <div
                    className={`px-5 py-3.5 flex items-center justify-between gap-3 shadow-xs text-white ${
                      isShortTerm ? "bg-[#C2410C]" : "bg-brandPrimary"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-white/20 border border-white/25 flex items-center justify-center flex-shrink-0 text-lg">
                        {reward.icon}
                      </div>
                      <h3 className="text-base sm:text-lg font-extrabold text-white leading-tight truncate">
                        {reward.title}
                      </h3>
                    </div>

                    {/* Tier Badge in Header */}
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-white/20 text-white border border-white/30 flex-shrink-0">
                      {isShortTerm ? "⚡ Quick Win" : "🎯 Long-Term Goal"}
                    </span>
                  </div>

                  {/* Card Body with Component Information in Clean Pills */}
                  <div className="p-5 sm:p-6 space-y-4 flex-1 flex flex-col justify-between text-left">
                    <div className="space-y-4 text-left">
                      {/* 1. Component Information Pills */}
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Price Pill */}
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border shadow-2xs ${
                            isShortTerm
                              ? "bg-amber-50 text-[#C2410C] border-[#C2410C]/30"
                              : "bg-tealSurface text-brandPrimary border-brandPrimary/30"
                          }`}
                        >
                          <Coins className="w-3.5 h-3.5" />
                          <span>{formatCurrency(reward.priceCoins)}</span>
                        </span>

                        {/* Goal Type Pill */}
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border shadow-2xs ${
                            isShortTerm
                              ? "bg-orange-50 text-orange-800 border-orange-200/80"
                              : "bg-teal-50 text-teal-800 border-teal-200/80"
                          }`}
                        >
                          {isShortTerm ? (
                            <>
                              <Sparkles className="w-3.5 h-3.5 text-orange-600" />
                              <span>Instant Treat</span>
                            </>
                          ) : (
                            <>
                              <Layers className="w-3.5 h-3.5 text-teal-600" />
                              <span>Save in Pot</span>
                            </>
                          )}
                        </span>

                        {/* Affordability Status Pill */}
                        {isAffordable ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
                            <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                            <span>Ready on Card</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs">
                            <Clock className="w-3.5 h-3.5 text-slate-500" />
                            <span>{formatCurrency(neededCents)} away</span>
                          </span>
                        )}
                      </div>

                      {/* 2. Privilege Description */}
                      <div className="space-y-1 text-left">
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-primaryText/50 block">
                          Privilege Details
                        </span>
                        <p className="text-sm text-primaryText/85 leading-relaxed font-normal">
                          {reward.description}
                        </p>
                      </div>

                      {/* 3. Existing Savings Pot Progress Bar (if applicable) */}
                      {existingPot && (
                        <div className="p-3.5 rounded-2xl bg-tealSurface/60 border border-brandPrimary/20 space-y-1.5 text-left">
                          <div className="flex items-center justify-between text-xs font-bold text-brandPrimary">
                            <span className="flex items-center gap-1.5">
                              <Layers className="w-3.5 h-3.5" />
                              <span>Active Savings Pot</span>
                            </span>
                            <span>
                              {formatCurrency(existingPot.currentAmountCents || 0)} / {formatCurrency(reward.priceCoins)}
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-canvas overflow-hidden border border-borderMuted/40">
                            <div
                              className="h-full bg-brandPrimary rounded-full transition-all"
                              style={{
                                width: `${Math.min(
                                  100,
                                  Math.round(((existingPot.currentAmountCents || 0) / reward.priceCoins) * 100)
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 4. Action Footer */}
                    <div className="pt-4 mt-2 border-t border-borderMuted/70 space-y-2 text-left">
                      {isAffordable ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleStartPurchasePause(reward)}
                            className="w-full py-2.5 px-4 rounded-xl bg-brandPrimary hover:bg-teal-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
                          >
                            <Sparkles className="w-4 h-4 text-white" />
                            <span>Buy Reward ({formatCurrency(reward.priceCoins)})</span>
                          </button>
                          <span className="text-[10px] text-positiveState font-semibold block text-center">
                            ✓ Ready to unlock from card balance
                          </span>
                        </>
                      ) : (
                        <>
                          {existingPot ? (
                            <Link
                              href={`/pupil/${pupilId}/pots`}
                              className="w-full py-2.5 px-4 rounded-xl bg-amberSurface hover:bg-amberSurface/80 text-brandSecondary border border-brandSecondary/30 font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all"
                            >
                              <Layers className="w-4 h-4 text-brandSecondary" />
                              <span>
                                View Savings Pot ({formatCurrency(existingPot.currentAmountCents || 0)})
                              </span>
                            </Link>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSetUpPot(reward)}
                              className="w-full py-2.5 px-4 rounded-xl bg-tealSurface hover:bg-tealSurface/80 text-brandPrimary border border-brandPrimary/30 font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
                            >
                              <Layers className="w-4 h-4 text-brandPrimary" />
                              <span>🌱 Save for this with a new Pot!</span>
                            </button>
                          )}
                          <span className="text-[10px] text-primaryText/60 font-medium block text-center">
                            {existingPot
                              ? "Keep contributing weekly to reach your goal!"
                              : "Tuck money into a Pot to work towards this reward"}
                          </span>
                        </>
                      )}
                    </div>
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
