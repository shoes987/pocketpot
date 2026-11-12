"use client";

import React from "react";
import { PupilDocument, SavingsPotDocument } from "@/lib/firebase/types";
import { formatCurrency } from "@/lib/firebase/zero-pii";
import { getSimplifiedFraction } from "@/lib/utils/money-breakdown";
import { BritishMoneyView } from "../ui/BritishMoneyView";
import {
  X,
  Eye,
  ShieldCheck,
  Lock,
  ExternalLink,
  Target,
  Check,
  FileText,
} from "lucide-react";

interface PupilInspectModalProps {
  pupil: PupilDocument | null;
  pots: SavingsPotDocument[];
  className: string;
  onClose: () => void;
}

export const PupilInspectModal: React.FC<PupilInspectModalProps> = ({
  pupil,
  pots,
  className: classTitle,
  onClose,
}) => {
  if (!pupil) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="inspect-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primaryText/50 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="bg-canvas w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl border-2 border-brandPrimary shadow-2xl flex flex-col text-left">
        {/* 1. INSPECTOR OVERSIGHT BANNER */}
        <div className="bg-brandPrimary text-white px-6 py-4 flex items-center justify-between gap-4 text-left">
          <div className="flex items-center gap-3 text-left">
            <div className="p-2 rounded-lg bg-white/10 text-white flex-shrink-0">
              <Eye className="w-5 h-5" />
            </div>
            <div className="text-left">
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider font-bold bg-white/20 px-2.5 py-0.5 rounded-full text-white">
                  Teacher Inspection Mode • Read-Only
                </span>
                <span className="text-xs text-white/80">Class: {classTitle}</span>
              </div>
              <h2
                id="inspect-modal-title"
                className="text-xl font-bold text-white text-left mt-0.5"
              >
                Observing {pupil.localDisplayName ? `${pupil.localDisplayName} (${pupil.educationalCodename})` : pupil.educationalCodename}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Inspection Modal"
            className="p-2 rounded-lg hover:bg-white/10 text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* 2. GUARANTEED ZERO-PII NOTICE & DIRECT ACCESS LINK */}
        <div className="bg-surface px-6 py-3 border-b border-borderMuted flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left">
          <div className="flex items-center gap-2.5 text-xs font-semibold text-primaryText/75 text-left">
            <span className="px-2.5 py-1 rounded-full bg-tealSurface text-brandPrimary border border-brandPrimary/30 text-xs font-bold flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-brandPrimary" /> 100% Zero-PII Safeguarded
            </span>
            <span className="text-xs text-primaryText/60 font-medium">Desk #{pupil.deskBadgeNumber}</span>
          </div>

          <a
            href={`/pupil/${pupil.pupilId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-brandPrimary hover:underline text-left"
          >
            <span>Open Pupil Card View</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* 3. PUPIL PEEK VIEW CONTENT */}
        <div className="p-6 space-y-6 text-left">
          {/* Read-Only State Disclaimer */}
          <div className="p-3.5 rounded-2xl bg-indigoSurface border border-focusIndicator/30 flex items-center gap-3 text-left">
            <Lock className="w-5 h-5 text-focusIndicator flex-shrink-0" />
            <p className="text-sm text-primaryText/90 text-left font-medium">
              You are viewing this student&apos;s live account in <strong>read-only oversight</strong>. Modifications and deposit buttons are disabled to protect the child&apos;s live state.
            </p>
          </div>

          {/* Numerical Balance Islands (>= 24sp / text-island) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
            <div className="bg-surface rounded-2xl p-5 border border-borderMuted shadow-sm text-left">
              <span className="text-xs font-semibold uppercase tracking-wider text-primaryText/60 block text-left">
                Available Card Balance
              </span>
              <div className="mt-2 text-left">
                <span className="text-island-32 text-brandPrimary font-bold block text-left">
                  {formatCurrency(pupil.mainBalanceCents || 0)}
                </span>
              </div>
              <p className="text-xs text-primaryText/60 mt-1 text-left">
                Debit card balance
              </p>
            </div>

            <div className="bg-surface rounded-2xl p-5 border border-borderMuted shadow-sm text-left">
              <span className="text-xs font-semibold uppercase tracking-wider text-primaryText/60 block text-left">
                Total In Savings Pots
              </span>
              <div className="mt-2 text-left">
                <span className="text-island-32 text-brandSecondary font-bold block text-left">
                  {formatCurrency(pupil.totalSavedCents)}
                </span>
              </div>
              <p className="text-xs text-positiveState font-semibold mt-1 text-left">
                Across {pots.length} active Savings Pots
              </p>
            </div>
          </div>

          {/* Active Savings Pots */}
          <div className="space-y-4 text-left">
            <h3 className="text-lg font-bold text-primaryText text-left">
              Student&apos;s Active Savings Pots ({pots.length})
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-left">
              {pots.map((pot) => {
                const isTeal = pot.theme === "calmingTeal";
                const potBaseColor = isTeal ? "#3F7062" : "#B45309";
                const potRimColor = isTeal ? "#2F574C" : "#92400E";
                const capsuleBg = isTeal ? "#F0F4F2" : "#FFF7ED";

                const fractionResult = getSimplifiedFraction(pot.currentAmountCents, pot.targetAmountCents);
                const isComplete = pot.currentAmountCents >= pot.targetAmountCents;

                return (
                  <div
                    key={pot.potId}
                    className="bg-surface rounded-3xl border border-borderMuted shadow-sm p-5 space-y-4 text-left overflow-hidden"
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between text-left">
                      <div>
                        <span className="text-xs font-semibold uppercase text-primaryText/60 block text-left">
                          {pot.categoryLabel}
                        </span>
                        <h4 className="text-base font-bold text-primaryText text-left">
                          {pot.title}
                        </h4>
                      </div>

                      {isComplete && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#F0FDF4] text-positiveState border border-positiveState/30 text-left">
                          <Check className="w-3 h-3" /> Goal Reached
                        </span>
                      )}
                    </div>

                    {/* Plant Pot Silhouette */}
                    <div
                      className="relative rounded-2xl p-4 flex flex-col items-center justify-between min-h-[160px] overflow-hidden"
                      style={{ backgroundColor: capsuleBg }}
                    >
                      <div className="w-full max-w-[150px] relative mt-auto flex flex-col items-center">
                        <div
                          className="w-full h-6 rounded-full shadow-sm z-10 border-t border-white/20"
                          style={{ backgroundColor: potRimColor }}
                        />
                        <div
                          className="w-[88%] h-18 rounded-b-2xl shadow-sm flex flex-col items-center justify-center p-2 relative overflow-hidden"
                          style={{ backgroundColor: potBaseColor }}
                        >
                          <div
                            className="absolute inset-x-0 bottom-0 bg-white/25 pointer-events-none"
                            style={{ height: `${fractionResult.percentage}%` }}
                          />
                          <span className="text-2xl font-bold text-white relative z-10">
                            {fractionResult.fractionString}
                          </span>
                          <span className="text-[9px] font-bold text-white/90 uppercase block">
                            progress towards goal
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Pictorial Segmented Bar */}
                    <div className="w-full flex items-center gap-1 h-3 bg-canvas p-1 rounded-lg border border-borderMuted">
                      {fractionResult.segments.map((isFilled, idx) => (
                        <div
                          key={idx}
                          className={`flex-1 h-full rounded-sm ${
                            isFilled
                              ? isTeal ? "bg-brandPrimary" : "bg-brandSecondary"
                              : "bg-slate-200"
                          }`}
                        />
                      ))}
                    </div>

                    {/* Actual British Money in Pot */}
                    <div className="p-3 rounded-xl bg-canvas border border-borderMuted text-left">
                      <BritishMoneyView amountPence={pot.currentAmountCents} compact />
                    </div>

                    {/* Numerical Data Islands */}
                    <div className="grid grid-cols-2 gap-3 text-left">
                      <div className="bg-canvas rounded-xl p-3 border border-borderMuted text-left">
                        <span className="text-xs text-primaryText/70 block text-left font-semibold">
                          Stored In Pot
                        </span>
                        <span className="text-island-24 text-primaryText font-bold block text-left mt-1">
                          {formatCurrency(pot.currentAmountCents)}
                        </span>
                      </div>

                      <div className="bg-canvas rounded-xl p-3 border border-borderMuted text-left">
                        <span className="text-xs text-primaryText/70 block text-left font-semibold">
                          Goal Target
                        </span>
                        <span className="text-island-24 text-primaryText font-bold block text-left mt-1">
                          {formatCurrency(pot.targetAmountCents)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 4. FOOTER CONTROLS */}
        <div className="bg-surface px-6 py-4 rounded-b-3xl border-t border-borderMuted flex items-center justify-between text-left">
          <span className="text-xs text-primaryText/60 text-left font-medium">
            PocketPot Inspection Mode • Zero-PII Protected
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-surface hover:bg-canvas border border-borderMuted text-primaryText font-semibold text-sm transition-all text-left"
          >
            Close Observation
          </button>
        </div>
      </div>
    </div>
  );
};
