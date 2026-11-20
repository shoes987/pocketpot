"use client";

import React, { useRef } from "react";
import { ClassDocument } from "@/lib/firebase/types";
import { PocketPotLogo } from "@/components/ui/PocketPotLogo";
import { CoinBuddyMascot } from "@/components/ui/CoinBuddyMascot";
import { PocketPotMascot } from "@/components/ui/PocketPotMascot";
import { TerracottaPotMascot } from "@/components/ui/TerracottaPotMascot";
import { Printer, X } from "lucide-react";

export interface PrintClassJoinCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  classroom?: ClassDocument | null;
}

export const PrintClassJoinCodeModal: React.FC<PrintClassJoinCodeModalProps> = ({
  isOpen,
  onClose,
  classroom,
}) => {
  const printAreaRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !classroom) return null;

  const handlePrint = () => {
    window.print();
  };

  const joinCode = classroom.classJoinCode || "------";
  const className = classroom.className || "Classroom";
  const yearGroup = classroom.yearGroup || "Key Stage 2";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="print-poster-title"
      className="fixed inset-0 z-50 bg-primaryText/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in"
    >
      {/* Print Stylesheet for full A4 Landscape poster */}
      <style jsx global>{`
        @page {
          size: A4 landscape;
          margin: 8mm;
        }
        @media print {
          body * {
            visibility: hidden !important;
          }
          #pocketpot-poster-area,
          #pocketpot-poster-area * {
            visibility: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          #pocketpot-poster-area {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            max-width: none !important;
            min-height: 0 !important;
            padding: 8mm 12mm !important;
            margin: 0 !important;
            background: white !important;
            border: none !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            box-sizing: border-box !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="bg-surface rounded-[2rem] border border-borderMuted shadow-2xl max-w-5xl w-full max-h-[94vh] flex flex-col overflow-hidden text-left my-auto">
        {/* Modal Controls Header (Screen only) */}
        <div className="no-print p-4 sm:p-5 border-b border-borderMuted/80 bg-canvas/60 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-amberSurface text-brandSecondary border border-brandSecondary/30">
                <Printer className="w-5 h-5 text-brandSecondary" />
              </span>
              <h2 id="print-poster-title" className="text-xl sm:text-2xl font-black text-primaryText">
                Print Class Join Code Poster (Landscape)
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-primaryText/70 font-medium">
              A4 Landscape classroom display poster for <strong>{className}</strong> ({joinCode})
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handlePrint}
              className="px-5 py-2.5 rounded-full bg-brandPrimary hover:bg-teal-700 text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brandPrimary active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>Print Poster</span>
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

        {/* Poster Preview Container (Screen scrollable, in print becomes full A4 landscape) */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-100/70 flex justify-center items-center">
          <div
            id="pocketpot-poster-area"
            ref={printAreaRef}
            className="w-full max-w-[920px] bg-white rounded-3xl border-2 border-brandPrimary/20 shadow-xl p-6 sm:p-8 flex flex-col justify-between text-center relative overflow-hidden"
            style={{ aspectRatio: "297 / 210", minHeight: "540px" }}
          >
            {/* Decorative Corner Watermarks */}
            <div
              className="absolute -top-16 -right-16 w-52 h-52 rounded-full pointer-events-none"
              style={{ background: "rgba(13, 148, 136, 0.08)" }}
            />
            <div
              className="absolute -bottom-16 -left-16 w-52 h-52 rounded-full pointer-events-none"
              style={{ background: "rgba(217, 119, 6, 0.08)" }}
            />

            {/* Poster Header (Landscape: Logo on Left, Class Name on Right) */}
            <div className="flex items-center justify-between gap-4 border-b border-borderMuted/40 pb-4">
              <div className="flex items-center">
                <PocketPotLogo size="lg" variant="horizontal" showTagline={true} />
              </div>

              <div className="flex flex-col items-end text-right">
                <span className="inline-block px-3 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-tealSurface text-brandPrimary border border-brandPrimary/30 mb-1">
                  {yearGroup}
                </span>
                <h1 className="text-2xl sm:text-4xl font-black text-primaryText tracking-tight">
                  {className}
                </h1>
              </div>
            </div>

            {/* Central Giant Join Code Island */}
            <div className="my-auto py-2">
              <div className="bg-gradient-to-br from-teal-50/90 via-white to-amber-50/90 rounded-[2.5rem] border-4 border-brandPrimary/30 p-6 sm:p-8 shadow-lg max-w-xl mx-auto">
                <span className="text-xs sm:text-sm font-extrabold uppercase tracking-[0.28em] text-brandPrimary block mb-2">
                  Classroom Join Code
                </span>
                <div className="font-mono text-6xl sm:text-8xl font-black text-brandPrimary tracking-[0.22em] select-all leading-tight py-1">
                  {joinCode}
                </div>
              </div>
            </div>

            {/* Mascot Trio Row (Characters only - names removed) */}
            <div className="flex items-end justify-center gap-8 sm:gap-14 my-2">
              {/* Coin Buddy */}
              <div className="flex items-center justify-center">
                <CoinBuddyMascot size={110} />
              </div>

              {/* PocketPot Sprout (Center) */}
              <div className="flex items-center justify-center">
                <PocketPotMascot size={95} />
              </div>

              {/* Terracotta Savings Pot */}
              <div className="flex items-center justify-center">
                <TerracottaPotMascot size={100} />
              </div>
            </div>

            {/* 3-Step Pupil Instructions Banner */}
            <div className="bg-canvas/90 rounded-2xl border border-borderMuted p-3 sm:p-4 text-left grid grid-cols-1 sm:grid-cols-3 gap-3 shadow-2xs mt-2">
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-full bg-brandPrimary text-white font-black text-xs flex items-center justify-center shrink-0">
                  1
                </div>
                <div>
                  <span className="font-bold text-xs text-primaryText block">Open App</span>
                  <span className="text-[11px] text-primaryText/70 leading-snug block">
                    Tap Pupil Card on tablet
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-full bg-brandSecondary text-white font-black text-xs flex items-center justify-center shrink-0">
                  2
                </div>
                <div>
                  <span className="font-bold text-xs text-primaryText block">Enter Code</span>
                  <span className="text-[11px] text-primaryText/70 leading-snug block">
                    Type <strong className="text-brandPrimary">{joinCode}</strong>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                  3
                </div>
                <div>
                  <span className="font-bold text-xs text-primaryText block">Enter PIN</span>
                  <span className="text-[11px] text-primaryText/70 leading-snug block">
                    Tap your name & enter PIN
                  </span>
                </div>
              </div>
            </div>

            {/* Poster Footer Brand Note */}
            <div className="pt-2 text-center text-[10px] text-primaryText/50 font-medium">
              PocketPot &bull; Key Stage 2 Financial Education Platform &bull; Classroom Safeguarded
            </div>
          </div>
        </div>

        {/* Modal Footer (Screen only) */}
        <div className="no-print p-3 sm:p-4 border-t border-borderMuted bg-canvas/80 flex items-center justify-between gap-3 text-xs">
          <span className="text-primaryText/60 font-medium">
            Formatted for standard A4 paper (Landscape).
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
              <span>Print Poster</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
