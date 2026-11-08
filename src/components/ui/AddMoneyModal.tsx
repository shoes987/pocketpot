"use client";

import React, { useState } from "react";
import { formatCurrency } from "@/lib/firebase/zero-pii";
import { X, CreditCard, ArrowRight, Sparkles, HelpCircle } from "lucide-react";

interface AddMoneyModalProps {
  isOpen: boolean;
  potTitle: string;
  potCurrentCents: number;
  potTargetCents: number;
  availableCardBalanceCents: number;
  onClose: () => void;
  onConfirmAdd: (amountCents: number) => void;
}

export const AddMoneyModal: React.FC<AddMoneyModalProps> = ({
  isOpen,
  potTitle,
  potCurrentCents,
  potTargetCents,
  availableCardBalanceCents,
  onClose,
  onConfirmAdd,
}) => {
  const [inputPounds, setInputPounds] = useState<string>("1.00");

  if (!isOpen) return null;

  const parsedPence = Math.round((parseFloat(inputPounds) || 0) * 100);
  const isValidAmount = parsedPence > 0;
  const hasEnoughFunds = availableCardBalanceCents >= parsedPence;
  const remainingBalanceCents = availableCardBalanceCents - parsedPence;

  const handleQuickAdd1Pound = () => {
    if (availableCardBalanceCents < 100) return;
    onConfirmAdd(100);
    onClose();
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidAmount || !hasEnoughFunds) return;
    onConfirmAdd(parsedPence);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-money-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primaryText/50 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="bg-surface w-full max-w-lg rounded-[2rem] border-2 border-brandPrimary shadow-2xl overflow-hidden flex flex-col text-left">
        {/* Modal Header */}
        <div className="bg-tealSurface border-b border-brandPrimary/20 px-4 sm:px-6 py-3.5 sm:py-4 flex items-center justify-between text-left">
          <div className="flex items-center gap-2.5 text-left">
            <div className="w-8 h-8 rounded-full bg-brandPrimary text-white flex items-center justify-center font-bold text-sm">
              +
            </div>
            <div>
              <span className="text-xs font-bold text-brandPrimary uppercase tracking-wider block text-left">
                Deposit to Pot
              </span>
              <h3 id="add-money-title" className="text-xl font-extrabold text-primaryText text-left">
                Add to {potTitle}
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
          {/* Card Balance Information Island */}
          <div className="bg-canvas rounded-2xl p-4 border border-borderMuted flex items-center justify-between text-left">
            <div className="flex items-center gap-3 text-left">
              <CreditCard className="w-5 h-5 text-brandPrimary" />
              <div>
                <span className="text-xs text-primaryText/60 block font-medium">Available on your Card:</span>
                <span className="text-lg font-bold text-primaryText block">
                  {formatCurrency(availableCardBalanceCents)}
                </span>
              </div>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-tealSurface text-brandPrimary font-bold border border-brandPrimary/30">
              Debit Card
            </span>
          </div>

          {/* 1. Quick Add £1 Feature */}
          <div className="space-y-1.5 text-left">
            <span className="text-xs font-bold text-primaryText/70 uppercase tracking-wider block">
              Quick Add:
            </span>
            <button
              type="button"
              onClick={handleQuickAdd1Pound}
              disabled={availableCardBalanceCents < 100}
              className="w-full py-3 px-4 rounded-2xl bg-tealSurface hover:bg-[#CCFBF1] text-brandPrimary font-extrabold text-base border-2 border-brandPrimary/40 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
            >
              <Sparkles className="w-5 h-5" />
              <span>+ £1.00 Quick Add to Pot</span>
            </button>
          </div>

          {/* 2. Custom Amount Box (No presets other than the £1) */}
          <div className="space-y-2 text-left pt-2 border-t border-borderMuted">
            <label htmlFor="custom-amount-input" className="text-xs font-bold text-primaryText/70 uppercase tracking-wider block">
              Or enter exact amount to add:
            </label>

            <div className="relative rounded-2xl border-2 border-borderMuted focus-within:border-brandPrimary bg-canvas transition-all p-1 flex items-center">
              <span className="pl-4 pr-1 text-2xl font-bold text-primaryText">£</span>
              <input
                id="custom-amount-input"
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

          {/* 3. Live Balance Calculation: Shows what will be left in main balance (NO RED TEXT - Soft Terracotta #C2410C) */}
          {isValidAmount && (
            <div
              className={`p-4 rounded-2xl border text-left space-y-1.5 transition-all ${
                hasEnoughFunds
                  ? "bg-tealSurface/40 border-brandPrimary/30"
                  : "bg-[#FFF7ED] border-[#FDBA74]"
              }`}
            >
              <div className="flex items-center justify-between text-left">
                <span className="text-xs font-bold text-primaryText/70 uppercase tracking-wide">
                  Card Balance After Adding:
                </span>
                <span
                  className={`text-base font-extrabold ${
                    hasEnoughFunds ? "text-primaryText" : "text-warningState"
                  }`}
                >
                  {hasEnoughFunds ? formatCurrency(remainingBalanceCents) : "Balance insufficient"}
                </span>
              </div>

              {hasEnoughFunds ? (
                <p className="text-xs text-primaryText/75 text-left">
                  Adding <strong>{formatCurrency(parsedPence)}</strong> to your pot. Your card balance will be {formatCurrency(remainingBalanceCents)}.
                </p>
              ) : (
                <div className="flex items-center gap-1.5 text-xs text-warningState font-bold">
                  <HelpCircle className="w-4 h-4 flex-shrink-0" />
                  <span>Let&apos;s puzzle this out together! You currently have {formatCurrency(availableCardBalanceCents)} on your card.</span>
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
              className="py-3 px-6 rounded-xl bg-brandPrimary hover:bg-teal-700 text-white text-sm font-extrabold shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <span>Add {isValidAmount ? formatCurrency(parsedPence) : ""} to Pot</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
