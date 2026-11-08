"use client";

import React, { useState } from "react";
import { UserPlus, ShieldCheck, Check, AlertCircle } from "lucide-react";
import { enrollSinglePupil } from "@/lib/services/class-service";
import { ClassDocument, PupilDocument } from "@/lib/firebase/types";

interface SinglePupilAddModalProps {
  isOpen: boolean;
  activeClass: ClassDocument | null;
  onClose: () => void;
  onPupilAdded: (pupil: PupilDocument) => void;
}

export function SinglePupilAddModal({
  isOpen,
  activeClass,
  onClose,
  onPupilAdded,
}: SinglePupilAddModalProps) {
  const [anonymize, setAnonymize] = useState(true);
  const [firstName, setFirstName] = useState("");
  const [openingBalance, setOpeningBalance] = useState("5.00");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !activeClass) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    let cleanName: string | undefined = undefined;
    if (!anonymize) {
      const trimmed = firstName.trim();
      if (!trimmed) {
        setErrorMessage("Please enter a first name or switch to animal codename.");
        return;
      }
      if (trimmed.includes(" ")) {
        setErrorMessage("Please enter single first name only (surnames are prohibited).");
        return;
      }
      cleanName = trimmed;
    }

    const balanceCents = Math.round(parseFloat(openingBalance || "0") * 100);

    try {
      const pupil = enrollSinglePupil(activeClass.classId, {
        localDisplayName: cleanName,
        anonymize,
        initialBalanceCents: balanceCents,
      });
      onPupilAdded(pupil);
      onClose();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to add student.");
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-primaryText/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
    >
      <div className="bg-surface rounded-pot border border-borderMuted shadow-2xl p-5 sm:p-6 md:p-8 space-y-5 text-left my-4 max-w-lg w-full max-h-[92vh] overflow-y-auto font-lexend">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-borderMuted/60 pb-3 text-left">
          <div>
            <div className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-brandPrimary" />
              <span className="text-xs font-bold uppercase tracking-wider text-brandPrimary">
                Enroll Pupil Account
              </span>
            </div>
            <h3 className="text-xl font-bold text-primaryText mt-0.5">
              Add Student to {activeClass.className}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-primaryText/40 hover:text-primaryText text-2xl font-bold p-1 leading-none"
          >
            &times;
          </button>
        </div>

        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-amberSurface text-warningState border border-amber-300 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          {/* Privacy Option */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase text-primaryText/70">
              Identity &amp; Safeguarding Mode
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setAnonymize(true)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  anonymize
                    ? "bg-tealSurface border-brandPrimary shadow-xs"
                    : "bg-canvas border-borderMuted hover:border-brandPrimary/40"
                }`}
              >
                <strong className="text-xs font-bold text-primaryText block">Animal Codename</strong>
                <span className="text-[11px] text-primaryText/60">Auto-generated (*"Clever Badger"*).</span>
              </button>
              <button
                type="button"
                onClick={() => setAnonymize(false)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  !anonymize
                    ? "bg-tealSurface border-brandPrimary shadow-xs"
                    : "bg-canvas border-borderMuted hover:border-brandPrimary/40"
                }`}
              >
                <strong className="text-xs font-bold text-primaryText block">First Name Only</strong>
                <span className="text-[11px] text-primaryText/60">Classroom display name.</span>
              </button>
            </div>
          </div>

          {!anonymize && (
            <div>
              <label className="block text-xs font-bold uppercase text-primaryText/70 mb-1">
                Student First Name
              </label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="e.g. Maya (single first name only)"
                className="w-full px-3.5 py-2 text-sm bg-canvas rounded-xl border border-borderMuted font-bold text-primaryText focus:ring-2 focus:ring-brandPrimary"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase text-primaryText/70 mb-1">
              Account Opening Balance (£)
            </label>
            <input
              type="number"
              step="0.50"
              min="0"
              value={openingBalance}
              onChange={(e) => setOpeningBalance(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-canvas rounded-xl border border-borderMuted font-bold text-primaryText focus:ring-2 focus:ring-brandPrimary"
            />
            <span className="text-[11px] text-primaryText/60 block mt-1">
              Opening credit for child&apos;s new fintech card.
            </span>
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-borderMuted/60">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-primaryText/60 hover:text-primaryText"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-full bg-brandPrimary hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Check className="w-4 h-4" />
              <span>Enroll Student Account</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
