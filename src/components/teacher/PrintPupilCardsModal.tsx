"use client";

import React, { useRef } from "react";
import { PupilDocument } from "@/lib/firebase/types";
import { getPupilDisplayName } from "@/lib/firebase/zero-pii";
import { PocketPotLogoMark } from "@/components/ui/PocketPotLogo";
import { Printer, X, Wifi, KeyRound, Sparkles, CheckCircle2 } from "lucide-react";

export interface PrintPupilCardsModalProps {
  isOpen: boolean;
  onClose: () => void;
  pupils: PupilDocument[];
  className?: string;
  classJoinCode?: string;
  title?: string;
}

export const PrintPupilCardsModal: React.FC<PrintPupilCardsModalProps> = ({
  isOpen,
  onClose,
  pupils,
  className = "Classroom",
  classJoinCode,
  title,
}) => {
  const printAreaRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const resolvedTitle =
    title ||
    (pupils.length === 1
      ? `Print Debit Card for ${pupils[0].localDisplayName || pupils[0].educationalCodename}`
      : `Print Class Debit Cards (${pupils.length} Pupils)`);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="print-modal-title"
      className="fixed inset-0 z-50 bg-primaryText/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in"
    >
      {/* Print Stylesheet injected for exact card reproduction on standard paper */}
      <style jsx global>{`
        @page {
          size: A4 portrait;
          margin: 8mm;
        }
        @media print {
          body * {
            visibility: hidden !important;
          }
          #pocketpot-printable-area,
          #pocketpot-printable-area * {
            visibility: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          #pocketpot-printable-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            background: transparent !important;
            display: grid !important;
            grid-template-columns: repeat(2, 1fr) !important;
            column-gap: 6mm !important;
            row-gap: 6mm !important;
          }
          .no-print {
            display: none !important;
          }
          .printable-card-wrapper {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
          }
        }
      `}</style>

      <div className="bg-surface rounded-[2rem] border border-borderMuted shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden text-left my-auto">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-borderMuted/80 bg-canvas/60 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-tealSurface text-brandPrimary border border-brandPrimary/30">
                <Printer className="w-5 h-5 text-brandPrimary" />
              </span>
              <h2 id="print-modal-title" className="text-xl sm:text-2xl font-black text-primaryText">
                {resolvedTitle}
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-primaryText/70 font-medium">
              Class: <strong>{className}</strong>
              {classJoinCode ? ` • Join Code: ${classJoinCode}` : ""} • Individual PocketPot contactless debit cards with child PINs.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handlePrint}
              className="px-5 py-2.5 rounded-full bg-brandPrimary hover:bg-teal-700 text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brandPrimary active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>Print {pupils.length === 1 ? "Card" : "All Cards"}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full hover:bg-canvas text-primaryText/50 hover:text-primaryText transition-colors"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Instructions banner for educator */}
        <div className="bg-tealSurface/60 px-5 sm:px-6 py-3 border-b border-brandPrimary/20 flex items-center justify-between gap-3 text-xs text-primaryText/80">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brandPrimary shrink-0" />
            <span>
              <strong>Educator Tip:</strong> Print on paper or cardstock. Each child uses their desk codename and <strong>4-digit PIN</strong> to activate their account and make classroom purchases.
            </span>
          </div>
          <span className="font-bold text-brandPrimary hidden md:inline">
            {pupils.length} Card{pupils.length === 1 ? "" : "s"} Ready
          </span>
        </div>

        {/* Scrollable Printable Cards Grid */}
        <div className="p-4 sm:p-8 overflow-y-auto flex-1 bg-slate-50/50">
          <div
            id="pocketpot-printable-area"
            ref={printAreaRef}
            className="grid grid-cols-1 sm:grid-cols-2 gap-6 justify-items-center max-w-4xl mx-auto"
          >
            {pupils.map((pupil) => {
              const displayName = getPupilDisplayName(pupil);
              const pin = pupil.pinNumber || pupil.cardLastFour || "1234";

              return (
                <div
                  key={pupil.pupilId}
                  className="printable-card-wrapper w-full max-w-[380px] text-left"
                >
                  {/* Physical PocketPot Green Debit Card with dotted cutting edge directly on perimeter */}
                  <div
                    className="relative w-full h-[225px] rounded-[1.25rem] p-4 text-white overflow-hidden shadow-lg select-none flex flex-col justify-between text-left border-2 border-dashed border-white/60"
                    style={{
                      background: "linear-gradient(135deg, #0D9488 0%, #115E59 50%, #1E293B 100%)",
                      color: "#FFFFFF",
                      WebkitPrintColorAdjust: "exact",
                      printColorAdjust: "exact",
                    }}
                  >
                    {/* Decorative Holographic Wave Blur Overlays */}
                    <div
                      className="absolute top-0 right-0 w-56 h-56 rounded-full pointer-events-none -mr-16 -mt-16"
                      style={{ background: "rgba(255, 255, 255, 0.12)", filter: "blur(32px)" }}
                    />
                    <div
                      className="absolute bottom-0 left-0 w-44 h-44 rounded-full pointer-events-none -ml-12 -mb-12"
                      style={{ background: "rgba(217, 119, 6, 0.22)", filter: "blur(32px)" }}
                    />

                    {/* Card Top: Logo & Contactless Waves */}
                    <div className="relative z-10 flex items-center justify-between text-left">
                      <div className="flex items-center gap-2 text-left">
                        <PocketPotLogoMark className="w-8 h-8 flex-shrink-0 drop-shadow-sm" withCircle={true} />
                        <div>
                          <span className="font-black text-lg tracking-tight text-white block leading-none">
                            PocketPot
                          </span>
                          <span className="text-[9px] text-teal-200/90 font-medium block">
                            Invest in the Future
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 text-white/90">
                        <Wifi className="w-5 h-5 rotate-90" />
                      </div>
                    </div>

                    {/* Card Middle: Golden EMV Chip & Credentials (Class Join Code + Child PIN) */}
                    <div className="relative z-10 flex items-center justify-between my-auto text-left gap-2">
                      {/* Gold EMV Chip Graphic */}
                      <div
                        aria-label="Smart EMV Debit Chip"
                        className="relative w-11 h-8 rounded-md bg-gradient-to-br from-[#FDE047] via-[#EAB308] to-[#CA8A04] shadow-sm border border-[#FEF08A] overflow-hidden flex flex-col justify-between p-0.5 shrink-0"
                      >
                        <div className="w-full h-[1px] bg-[#1E293B]/25 my-auto" />
                        <div className="w-[1px] h-full bg-[#1E293B]/25 mx-auto absolute inset-0" />
                        <div className="w-4 h-2.5 rounded-sm border border-[#1E293B]/20 mx-auto" />
                      </div>

                      {/* Credentials: Class Code & Child PIN */}
                      <div className="flex items-center gap-2">
                        {classJoinCode && (
                          <div className="bg-white/15 backdrop-blur-xs border border-white/30 rounded-xl px-2.5 py-1 text-left shadow-xs">
                            <span className="text-[7.5px] uppercase tracking-wider font-extrabold text-teal-100 block leading-tight">
                              Class Code
                            </span>
                            <span className="font-mono font-black text-xs tracking-wider text-white block leading-none">
                              {classJoinCode}
                            </span>
                          </div>
                        )}

                        <div className="bg-white/20 backdrop-blur-xs border border-white/35 rounded-xl px-2.5 py-1 text-left shadow-xs">
                          <span className="text-[7.5px] uppercase tracking-wider font-extrabold text-teal-100 block leading-tight">
                            Child PIN
                          </span>
                          <span className="font-mono font-black text-xs tracking-widest text-amber-200 block leading-none">
                            {pin}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Card Bottom: Masked Card Number, Name, Class & Expiry */}
                    <div className="relative z-10 space-y-1 text-left">
                      <div className="text-xs tracking-[0.2em] font-mono text-white/90 text-left">
                        •••• •••• •••• {pupil.cardLastFour}
                      </div>

                      <div className="flex items-end justify-between pt-0.5 text-left">
                        <div className="text-left min-w-0 pr-2">
                          <span className="text-[8px] uppercase tracking-wider text-teal-200/90 block text-left font-bold">
                            Cardholder Name
                          </span>
                          <span className="text-sm font-extrabold tracking-wide text-white block text-left truncate max-w-[200px]">
                            {displayName}
                          </span>
                          {className && (
                            <span className="text-[9px] text-teal-100/90 block truncate">
                              {className}
                            </span>
                          )}
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-[8px] uppercase tracking-wider text-teal-200/90 block text-right font-bold">
                            Valid Thru
                          </span>
                          <span className="text-[11px] font-mono font-bold text-white block text-right">
                            10/28
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-borderMuted bg-canvas/80 flex items-center justify-between gap-3 text-xs">
          <span className="text-primaryText/60 font-medium">
            Ready to print on standard A4 paper with cut lines.
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-primaryText/70 hover:text-primaryText font-bold text-xs"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-5 py-2.5 rounded-full bg-brandPrimary hover:bg-teal-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Now</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
