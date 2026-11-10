"use client";

import React, { useState } from "react";
import { PupilDocument } from "@/lib/firebase/types";
import { KeyRound, X, RefreshCw, CheckCircle2, Printer, ShieldCheck } from "lucide-react";

export interface ResetPinModalProps {
  isOpen: boolean;
  pupil: PupilDocument | null;
  onClose: () => void;
  onPinReset: (pupil: PupilDocument, newPin: string) => void;
  onOpenPrintCard?: (pupil: PupilDocument) => void;
}

export const ResetPinModal: React.FC<ResetPinModalProps> = ({
  isOpen,
  pupil,
  onClose,
  onPinReset,
  onOpenPrintCard,
}) => {
  const [newPin, setNewPin] = useState<string>(() => Math.floor(1000 + Math.random() * 9000).toString());
  const [successPin, setSuccessPin] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !pupil) return null;

  const displayName = pupil.localDisplayName || pupil.educationalCodename;
  const currentPin = pupil.pinNumber || pupil.cardLastFour || "1234";

  const handleGenerateRandom = () => {
    const generated = Math.floor(1000 + Math.random() * 9000).toString();
    setNewPin(generated);
    setError(null);
  };

  const handleConfirmReset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{4}$/.test(newPin.trim())) {
      setError("Please enter a valid 4-digit numeric PIN.");
      return;
    }

    onPinReset(pupil, newPin.trim());
    setSuccessPin(newPin.trim());
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="reset-pin-title"
      className="fixed inset-0 z-50 bg-primaryText/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
    >
      <div className="bg-surface rounded-3xl border border-borderMuted shadow-2xl max-w-md w-full p-6 space-y-5 text-left my-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-borderMuted/70 pb-3">
          <div className="flex items-center gap-2.5 text-left">
            <div className="w-10 h-10 rounded-2xl bg-amberSurface text-brandSecondary border border-brandSecondary/30 flex items-center justify-center flex-shrink-0">
              <KeyRound className="w-5 h-5 text-brandSecondary" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-brandSecondary block">
                Security &amp; Card Access
              </span>
              <h3 id="reset-pin-title" className="text-xl font-bold text-primaryText leading-tight">
                Reset Pupil PIN
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-canvas text-primaryText/40 hover:text-primaryText transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success State */}
        {successPin ? (
          <div className="space-y-4 text-left">
            <div className="p-4 rounded-2xl bg-greenSurface border border-positiveState/30 text-left space-y-2">
              <div className="flex items-center gap-2 text-positiveState font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                <span>PIN Successfully Reset!</span>
              </div>
              <p className="text-xs text-primaryText/80">
                The login PIN for <strong>{displayName}</strong> has been updated.
              </p>
              <div className="bg-surface p-3 rounded-xl border border-positiveState/30 flex items-center justify-between">
                <span className="text-xs font-bold text-primaryText/70">New Active PIN:</span>
                <span className="font-mono text-xl font-black text-brandPrimary tracking-widest">
                  {successPin}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-primaryText/70 hover:text-primaryText font-bold text-xs"
              >
                Done
              </button>
              {onOpenPrintCard && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenPrintCard({ ...pupil, pinNumber: successPin });
                  }}
                  className="px-4 py-2 rounded-full bg-brandPrimary hover:bg-teal-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 transition-all"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Updated Card</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <form onSubmit={handleConfirmReset} className="space-y-4 text-left">
            {/* Pupil Info Banner */}
            <div className="p-3.5 rounded-2xl bg-canvas border border-borderMuted flex items-center justify-between text-left">
              <div>
                <strong className="text-sm font-bold text-primaryText block">{displayName}</strong>
                <span className="text-xs text-primaryText/60">
                  Desk #{pupil.deskBadgeNumber} • Card ending in {pupil.cardLastFour}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-primaryText/50 block">Current PIN</span>
                <span className="font-mono font-bold text-sm text-primaryText/75 tracking-wider">
                  {currentPin}
                </span>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-amberSurface text-[#C2410C] border border-amber-300 text-xs font-semibold">
                {error}
              </div>
            )}

            {/* New PIN Input Field */}
            <div className="space-y-1.5 text-left">
              <label htmlFor="new-pin-input" className="text-xs font-bold text-primaryText block">
                New 4-Digit Security PIN <span className="text-brandSecondary">*</span>
              </label>

              <div className="flex items-center gap-2">
                <input
                  id="new-pin-input"
                  type="text"
                  maxLength={4}
                  pattern="\d{4}"
                  required
                  value={newPin}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "").slice(0, 4);
                    setNewPin(val);
                    setError(null);
                  }}
                  className="w-full px-4 py-2.5 rounded-2xl bg-canvas border border-borderMuted text-primaryText font-mono font-black text-xl text-center tracking-[0.3em] focus-visible:outline focus-visible:outline-2 focus-visible:outline-brandSecondary"
                  placeholder="1234"
                />

                <button
                  type="button"
                  onClick={handleGenerateRandom}
                  className="px-3.5 py-2.5 rounded-2xl bg-canvas hover:bg-amberSurface text-primaryText/75 hover:text-brandSecondary border border-borderMuted hover:border-brandSecondary/40 font-bold text-xs flex items-center gap-1.5 transition-all shrink-0"
                  title="Generate random 4-digit PIN"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Random</span>
                </button>
              </div>
              <p className="text-[11px] text-primaryText/60">
                Children enter this 4-digit PIN on tablets or laptops to access their PocketPot card.
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-borderMuted">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-primaryText/70 hover:text-primaryText font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-full bg-brandSecondary hover:bg-amber-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 transition-all"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Confirm PIN Reset</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
