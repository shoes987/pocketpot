"use client";

import React, { useState } from "react";
import { formatCurrency } from "@/lib/firebase/zero-pii";
import { X, Layers, ArrowLeft, Sparkles, HelpCircle } from "lucide-react";

interface WithdrawMoneyModalProps {
  isOpen: boolean;
  potTitle: string;
  potCurrentCents: number;
  availableCardBalanceCents: number;
  onClose: () => void;
  onConfirmWithdraw: (amountCents: number) => void;
}

export const WithdrawMoneyModal: React.FC<WithdrawMoneyModalProps> = ({
  isOpen,
  potTitle,
  potCurrentCents,
  availableCardBalanceCents,
  onClose,
  onConfirmWithdraw,
}) => {
  const [inputPounds, setInputPounds] = useState<string>("1.00");

  if (!isOpen) return null;

  const parsedPence = Math.round((parseFloat(inputPounds) || 0) * 100);
  const isValidAmount = parsedPence > 0;
  const hasEnoughFunds = potCurrentCents >= parsedPence;
  const remainingPotCents = Math.max(0, potCurrentCents - parsedPence);
  const newCardBalanceCents = availableCardBalanceCents + parsedPence;

  const handleQuickWithdraw1Pound = () => {
    if (potCurrentCents < 100) return;
    onConfirmWithdraw(100);
    onClose();
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidAmount || !hasEnoughFunds) return;
    onConfirmWithdraw(parsedPence);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="withdraw-money-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primaryText/50 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="bg-surface w-full max-w-lg rounded-[2rem] border-2 border-brandSecondary shadow-2xl overflow-hidden flex flex-col text-left">
        {/* Modal Header in Warm Amber */}
        <div className="bg-amberSurface border-b border-brandSecondary/25 px-4 sm:px-6 py-3.5 sm:py-4 flex items-center justify-between text-left">
          <div className="flex items-center gap-2.5 text-left">
            <div className="w-8 h-8 rounded-full bg-brandSecondary text-white flex items-center justify-center font-bold text-sm">
              -
            </div>
            <div>
              <span className="text-xs font-bold text-brandSecondary uppercase tracking-wider block text-left">
                Withdraw to Debit Card
              </span>
              <h3 id="withdraw-money-title" className="text-xl font-extrabold text-primaryText text-left">
                Withdraw from {potTitle}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-primaryText/60 hover:text-primaryText hover:bg-canvas transition-all"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleCustomSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-5 text-left">
          {/* Pot Balance Information Island */}
          <div className="bg-canvas rounded-2xl p-4 border border-borderMuted flex items-center justify-between text-left">
            <div className="flex items-center gap-3 text-left">
              <Layers className="w-5 h-5 text-brandSecondary" />
              <div>
                <span className="text-xs text-primaryText/60 block font-medium">Currently Stored in Pot:</span>
                <span className="text-lg font-bold text-primaryText block">
                  {formatCurrency(potCurrentCents)}
                </span>
              </div>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-amberSurface text-brandSecondary font-bold border border-brandSecondary/30">
              Savings Pot
            </span>
          </div>

          {/* 1. Quick Withdraw £1 Feature */}
          <div className="space-y-1.5 text-left">
            <span className="text-xs font-bold text-primaryText/70 uppercase tracking-wider block">
              Quick Withdraw:
            </span>
            <button
              type="button"
              onClick={handleQuickWithdraw1Pound}
              disabled={potCurrentCents < 100}
              className="w-full py-3 px-4 rounded-2xl bg-amberSurface hover:bg-[#FEF3C7] text-brandSecondary font-extrabold text-base border-2 border-brandSecondary/40 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
            >
              <Sparkles className="w-5 h-5" />
              <span>- £1.00 Quick Withdraw to Card</span>
            </button>
          </div>

          {/* 2. Custom Amount Box */}
          <div className="space-y-2 text-left pt-2 border-t border-borderMuted">
            <label htmlFor="custom-withdraw-input" className="text-xs font-bold text-primaryText/70 uppercase tracking-wider block">
              Or enter exact amount to withdraw:
            </label>

            <div className="relative rounded-2xl border-2 border-borderMuted focus-within:border-brandSecondary bg-canvas transition-all p-1 flex items-center">
              <span className="pl-4 pr-1 text-2xl font-bold text-primaryText">£</span>
              <input
                id="custom-withdraw-input"
                type="number"
                step="0.01"
                min="0.01"
                value={inputPounds}
                onChange={(e) => setInputPounds(e.target.value)}
                placeholder="0.00"
                className="w-full py-2.5 px-2 text-2xl font-bold text-primaryText bg-transparent focus:outline-none"
              />
            </div>
          </div>

          {/* 3. Live Balance Calculation (Soft Terracotta for spend warnings, no red) */}
          {isValidAmount && (
            <div
              className={`p-4 rounded-2xl border text-left space-y-1.5 transition-all ${
                hasEnoughFunds
                  ? "bg-amberSurface/40 border-brandSecondary/30"
                  : "bg-[#FFF7ED] border-[#FDBA74]"
              }`}
            >
              <div className="flex items-center justify-between text-left">
                <span className="text-xs font-bold text-primaryText/70 uppercase tracking-wide">
                  Pot Balance After Withdrawal:
                </span>
                <span
                  className={`text-base font-extrabold ${
                    hasEnoughFunds ? "text-primaryText" : "text-warningState"
                  }`}
                >
                  {hasEnoughFunds ? formatCurrency(remainingPotCents) : "Amount exceeds pot"}
                </span>
              </div>

              {hasEnoughFunds ? (
                <p className="text-xs text-primaryText/75 text-left">
                  Moving <strong>{formatCurrency(parsedPence)}</strong> back to your card. Your debit card balance will increase to <strong>{formatCurrency(newCardBalanceCents)}</strong>.
                </p>
              ) : (
                <div className="flex items-center gap-1.5 text-xs text-warningState font-bold">
                  <HelpCircle className="w-4 h-4 flex-shrink-0" />
                  <span>Let&apos;s puzzle this out together! This pot currently has {formatCurrency(potCurrentCents)}.</span>
                </div>
              )}
            </div>
          )}

          {/* Action Footer */}
          <div className="pt-2 flex items-center justify-end gap-3 text-left">
            <button
              type="button"
              onClick={onClose}
              className="py-3 px-5 rounded-xl border border-borderMuted hover:bg-canvas text-sm font-bold text-primaryText transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isValidAmount || !hasEnoughFunds}
              className="py-3 px-6 rounded-xl bg-brandSecondary hover:bg-amber-700 text-white text-sm font-extrabold shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <span>Withdraw {isValidAmount ? formatCurrency(parsedPence) : ""} to Card</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
