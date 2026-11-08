"use client";

import React, { useState } from "react";
import { formatCurrency } from "@/lib/firebase/zero-pii";
import { PotAccentTheme } from "@/lib/firebase/types";
import { getSimplifiedFraction } from "@/lib/utils/money-breakdown";
import { BritishMoneyView } from "./BritishMoneyView";
import { AddMoneyModal } from "./AddMoneyModal";
import { WithdrawMoneyModal } from "./WithdrawMoneyModal";
import {
  Plus,
  Minus,
  Trash2,
  Check,
  HelpCircle,
} from "lucide-react";

export interface SavingsPotProps {
  id: string;
  title: string;
  theme?: PotAccentTheme;
  targetAmountCents: number;
  initialAmountCents?: number;
  categoryLabel?: string;
  availableCardBalanceCents?: number;
  onAddAmount?: (incrementCents: number) => void;
  onWithdrawAmount?: (decrementCents: number) => void;
  onDeletePot?: (potId: string) => void;
}

export const SavingsPot: React.FC<SavingsPotProps> = ({
  id,
  title,
  theme = "calmingTeal",
  targetAmountCents,
  initialAmountCents = 0,
  categoryLabel = "Personal Goal",
  availableCardBalanceCents = 0,
  onAddAmount,
  onWithdrawAmount,
  onDeletePot,
}) => {
  const [currentAmountCents, setCurrentAmountCents] = useState(initialAmountCents);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  
  // Progress Display Mode: "fraction" vs "percentage"
  const [displayMode, setDisplayMode] = useState<"fraction" | "percentage">("fraction");

  React.useEffect(() => {
    setCurrentAmountCents(initialAmountCents);
  }, [initialAmountCents]);

  const isTeal = theme === "calmingTeal";
  const potBaseColor = isTeal ? "#2B473E" : "#78350F"; // Deeper unfilled container body
  const potFillColor = isTeal ? "#0D9488" : "#D97706"; // Vibrant brand fill that rises & falls
  const potRimColor = isTeal ? "#3A5E53" : "#92400E";
  const capsuleBg = isTeal ? "#EEF3EF" : "#FFF7ED";
  const capsuleBorder = isTeal ? "#D8E4DC" : "#FED7AA";

  const fractionResult = getSimplifiedFraction(currentAmountCents, targetAmountCents);
  const isComplete = currentAmountCents >= targetAmountCents;

  const clampedPct = Math.max(0, Math.min(100, fractionResult.percentage));
  const fillHeight = (clampedPct / 100) * 77;
  const fillY = 107 - fillHeight;
  const clipId = `pot-clip-${id.replace(/[^a-zA-Z0-9_-]/g, "")}`;

  const handleConfirmAdd = (incrementCents: number) => {
    const nextAmount = currentAmountCents + incrementCents;
    setCurrentAmountCents(nextAmount);
    if (onAddAmount) onAddAmount(incrementCents);
  };

  const handleConfirmWithdraw = (decrementCents: number) => {
    if (currentAmountCents < decrementCents) return;
    const nextAmount = Math.max(0, currentAmountCents - decrementCents);
    setCurrentAmountCents(nextAmount);
    if (onWithdrawAmount) onWithdrawAmount(decrementCents);
  };

  const handleDelete = () => {
    if (onDeletePot) onDeletePot(id);
    setIsDeleteConfirmOpen(false);
  };

  return (
    <article
      aria-labelledby={`pot-heading-${id}`}
      tabIndex={0}
      className="relative flex flex-col w-full bg-surface rounded-[2rem] border border-borderMuted shadow-sm hover:shadow-md transition-all text-left overflow-hidden focus-visible:outline focus-visible:outline-3 focus-visible:outline-focusIndicator"
    >
      {/* 1. CLEAN CARD HEADER (Single Heading) */}
      <header className="p-5 pb-3 flex items-start justify-between gap-3 text-left border-b border-borderMuted/60">
        <div className="text-left">
          <h3
            id={`pot-heading-${id}`}
            className="text-xl font-bold text-primaryText text-left leading-tight"
          >
            {title}
          </h3>
        </div>

        {/* Delete Pot Button (Decluttered) */}
        <div className="text-left flex items-center gap-1.5">
          {isComplete && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-greenSurface text-positiveState border border-positiveState/30">
              <Check className="w-3.5 h-3.5" /> Goal Reached!
            </span>
          )}
          <button
            type="button"
            onClick={() => setIsDeleteConfirmOpen(true)}
            title="Delete this Pot (Funds return to card)"
            className="p-2 rounded-xl text-primaryText/40 hover:text-warningState hover:bg-[#FFF7ED] transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 2. SINGLE PLANT POT SILHOUETTE & VISUAL PROGRESS */}
      <div className="p-5 space-y-4 text-left">
        {/* Pot Visual Container (Matches Carousel Pot) */}
        <div
          className="rounded-[1.75rem] p-4 flex flex-col items-center justify-center min-h-[170px] relative overflow-hidden border"
          style={{ backgroundColor: capsuleBg, borderColor: capsuleBorder }}
        >
          {/* Main Pot Graphic: Exact match with carousel pot SVG + Dynamic Fill Level */}
          <div className="w-full flex justify-center items-center mt-3 mb-1">
            <svg
              viewBox="0 0 140 110"
              className="w-[150px] h-[118px] overflow-visible drop-shadow-sm"
            >
              <defs>
                <clipPath id={clipId}>
                  <path d="M 18 30 L 26 94 C 27 103, 36 107, 48 107 L 92 107 C 104 107, 113 103, 114 94 L 122 30 Z" />
                </clipPath>
              </defs>

              {/* Unfilled Pot Interior / Base Chamber */}
              <path
                d="M 18 30 L 26 94 C 27 103, 36 107, 48 107 L 92 107 C 104 107, 113 103, 114 94 L 122 30 Z"
                fill={potBaseColor}
              />

              {/* Dynamic Fill Level: Liquid / Savings Fill that Raises and Falls */}
              <g clipPath={`url(#${clipId})`}>
                <rect
                  x="0"
                  y={fillY}
                  width="140"
                  height={fillHeight + 6}
                  fill={potFillColor}
                  className="transition-all duration-700 ease-out"
                />
                {/* Surface Meniscus Highlight */}
                {clampedPct > 0 && clampedPct < 100 && (
                  <line
                    x1="0"
                    y1={fillY}
                    x2="140"
                    y2={fillY}
                    stroke="rgba(255, 255, 255, 0.55)"
                    strokeWidth="2.5"
                    className="transition-all duration-700 ease-out"
                  />
                )}
              </g>

              {/* Rolled Pot Rim (Sits on top of pot body & fill) */}
              <rect
                x="12"
                y="20"
                width="116"
                height="18"
                rx="9"
                fill={potRimColor}
              />
              {/* Rim Highlight */}
              <rect
                x="16"
                y="22"
                width="108"
                height="3.5"
                rx="1.75"
                fill="rgba(255, 255, 255, 0.25)"
              />
              {/* Single Pot Percentage Text */}
              <text
                x="70"
                y="68"
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#FFFFFF"
                fontSize="22"
                fontWeight="700"
                fontFamily="Lexend, sans-serif"
                className="select-none filter drop-shadow-sm"
              >
                {displayMode === "fraction"
                  ? fractionResult.fractionString
                  : `${fractionResult.percentage}%`}
              </text>
            </svg>
          </div>

          {/* Fraction vs Percentage Mode Switcher */}
          <div className="absolute top-3 right-3 flex items-center bg-white/90 p-1 rounded-xl shadow-xs border border-borderMuted z-20">
            <button
              type="button"
              onClick={() => setDisplayMode("fraction")}
              className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-all ${
                displayMode === "fraction"
                  ? "bg-brandPrimary text-white shadow-xs"
                  : "text-primaryText/60 hover:text-primaryText"
              }`}
              title="Show as Simplified Fraction"
            >
              ½ Fraction
            </button>
            <button
              type="button"
              onClick={() => setDisplayMode("percentage")}
              className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-all ${
                displayMode === "percentage"
                  ? "bg-brandPrimary text-white shadow-xs"
                  : "text-primaryText/60 hover:text-primaryText"
              }`}
              title="Show as Percentage"
            >
              % Percent
            </button>
          </div>
        </div>

        {/* 3. UNIFIED PROGRESS & FINANCIAL SUMMARY */}
        <div className="space-y-2 text-left pt-1">
          <div className="flex items-baseline justify-between gap-3 text-left">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-primaryText/50 block">
                Saved in Pot
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl sm:text-3xl font-extrabold text-[#15803D] tracking-tight">
                  {formatCurrency(currentAmountCents)}
                </span>
                <span className="text-xs font-semibold text-primaryText/50">
                  of {formatCurrency(targetAmountCents)}
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-sm font-bold text-[#C2410C] block">
                {isComplete
                  ? "Goal Reached! 🎉"
                  : `${formatCurrency(Math.max(0, targetAmountCents - currentAmountCents))} left`}
              </span>
            </div>
          </div>

          {/* Progress Bar: Actual progress in Green, Remaining in Terracotta */}
          <div className="w-full h-3 bg-[#FFEDD5] rounded-full overflow-hidden border border-[#FDBA74]/60 flex">
            <div
              className="h-full bg-[#15803D] rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, fractionResult.percentage))}%` }}
            />
            <div
              className="h-full bg-[#C2410C]/35 flex-1 transition-all duration-500"
            />
          </div>
        </div>

        {/* 4. ACTUAL MONEY IN POT: "What this looks like" (COMPACT REALISTIC CASH) */}
        {currentAmountCents > 0 && (
          <div className="p-3.5 rounded-2xl bg-canvas border border-borderMuted text-left">
            <BritishMoneyView amountPence={currentAmountCents} />
          </div>
        )}

        {/* 6. PRIMARY ACTION BUTTONS: [ADD MONEY (TEAL)] & [WITHDRAW MONEY (AMBER)] */}
        <div className="pt-2 flex items-center gap-3 text-left">
          {/* Add Money Button in Brand Primary Calming Teal */}
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="flex-1 py-3 px-4 rounded-2xl bg-brandPrimary hover:bg-teal-700 text-white font-extrabold text-sm shadow-sm transition-all flex items-center justify-center gap-1.5 focus-visible:outline focus-visible:outline-3 focus-visible:outline-focusIndicator"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Add Money</span>
          </button>

          {/* Withdraw Money Button in Brand Secondary Warm Amber */}
          <button
            type="button"
            onClick={() => setIsWithdrawModalOpen(true)}
            disabled={currentAmountCents <= 0}
            className="flex-1 py-3 px-4 rounded-2xl bg-brandSecondary hover:bg-amber-700 text-white font-extrabold text-sm shadow-sm transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-3 focus-visible:outline-focusIndicator"
          >
            <Minus className="w-4 h-4 stroke-[3]" />
            <span>Withdraw Money</span>
          </button>
        </div>
      </div>

      {/* ADD MONEY POP-UP MODAL (TEAL) */}
      <AddMoneyModal
        isOpen={isAddModalOpen}
        potTitle={title}
        potCurrentCents={currentAmountCents}
        potTargetCents={targetAmountCents}
        availableCardBalanceCents={availableCardBalanceCents}
        onClose={() => setIsAddModalOpen(false)}
        onConfirmAdd={handleConfirmAdd}
      />

      {/* WITHDRAW MONEY POP-UP MODAL (AMBER) */}
      <WithdrawMoneyModal
        isOpen={isWithdrawModalOpen}
        potTitle={title}
        potCurrentCents={currentAmountCents}
        availableCardBalanceCents={availableCardBalanceCents}
        onClose={() => setIsWithdrawModalOpen(false)}
        onConfirmWithdraw={handleConfirmWithdraw}
      />

      {/* DELETE POT CONFIRMATION MODAL (Soft Terracotta #C2410C, No Red) */}
      {isDeleteConfirmOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primaryText/50 backdrop-blur-sm animate-in fade-in"
        >
          <div className="bg-surface w-full max-w-sm rounded-[2rem] border-2 border-warningState/40 p-6 shadow-2xl text-left space-y-4">
            <div className="flex items-center gap-2 text-warningState">
              <HelpCircle className="w-5 h-5" />
              <h4 className="text-lg font-bold text-primaryText text-left">
                Delete &quot;{title}&quot;?
              </h4>
            </div>
            <p className="text-sm text-primaryText/80 text-left leading-relaxed">
              If you delete this pot, any stored funds (
              <strong className="text-positiveState">
                {formatCurrency(currentAmountCents)}
              </strong>
              ) will automatically return to your Debit Card Balance.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2 text-left">
              <button
                type="button"
                onClick={() => setIsDeleteConfirmOpen(false)}
                className="py-2.5 px-4 rounded-xl border border-borderMuted text-xs font-bold hover:bg-canvas"
              >
                Keep Pot
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="py-2.5 px-4 rounded-xl bg-warningState hover:bg-[#9A3412] text-white text-xs font-bold shadow-sm"
              >
                Delete &amp; Refund Funds
              </button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
};
