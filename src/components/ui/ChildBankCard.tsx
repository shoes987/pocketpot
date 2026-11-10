"use client";

import React from "react";
import { Wifi } from "lucide-react";
import { PocketPotLogoMark } from "./PocketPotLogo";

interface ChildBankCardProps {
  cardholderName: string;
  cardLastFour?: string;
  badgeNumber?: number;
  className?: string;
}

export const ChildBankCard: React.FC<ChildBankCardProps> = ({
  cardholderName,
  cardLastFour = "4821",
  badgeNumber = 101,
  className = "",
}) => {
  return (
    <div
      tabIndex={0}
      role="region"
      aria-label={`PocketPot Debit Card for ${cardholderName}`}
      className={`relative w-full max-w-md h-56 rounded-[1.5rem] p-6 text-white overflow-hidden shadow-2xl border border-white/20 select-none transition-all transform hover:scale-[1.01] focus-visible:outline focus-visible:outline-3 focus-visible:outline-focusIndicator text-left ${className}`}
      style={{
        background: "linear-gradient(135deg, #0D9488 0%, #115E59 50%, #1E293B 100%)",
      }}
    >
      {/* Decorative Holographic & Wave Overlays */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none -mr-16 -mt-16" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-brandSecondary/20 rounded-full blur-2xl pointer-events-none -ml-12 -mb-12" />

      {/* Card Content Stack */}
      <div className="relative z-10 flex flex-col justify-between h-full text-left">
        {/* Top Row: Accurate PocketPot Vector Logo & App Name (Learner Debit removed) */}
        <div className="flex items-center justify-between text-left">
          <div className="flex items-center gap-2.5 text-left">
            <PocketPotLogoMark className="w-10 h-10 flex-shrink-0 drop-shadow-sm" withCircle={true} />
            <span className="font-black text-xl tracking-tight text-white block text-left leading-none">
              PocketPot
            </span>
          </div>

          <div className="flex items-center gap-2 text-white/80">
            <Wifi className="w-5 h-5 rotate-90" aria-label="Contactless payment enabled" />
          </div>
        </div>

        {/* Middle Row: Golden EMV Chip */}
        <div className="flex items-center justify-start my-auto text-left">
          {/* Physical Gold EMV Chip Graphic */}
          <div
            aria-label="Smart EMV Debit Chip"
            className="relative w-12 h-9 rounded-md bg-gradient-to-br from-[#FDE047] via-[#EAB308] to-[#CA8A04] shadow-md border border-[#FEF08A] overflow-hidden flex flex-col justify-between p-1"
          >
            {/* Circuit Etch Lines (Slate Navy tint, no black) */}
            <div className="w-full h-[1px] bg-[#1E293B]/25 my-auto" />
            <div className="w-[1px] h-full bg-[#1E293B]/25 mx-auto absolute inset-0" />
            <div className="w-5 h-3 rounded-sm border border-[#1E293B]/20 mx-auto" />
          </div>
        </div>

        {/* Bottom Row: Card Number Snippet, Name, and Expiry */}
        <div className="space-y-1 text-left">
          {/* Card Number Snippet */}
          <div className="text-sm tracking-[0.2em] font-mono text-white/90 text-left">
            •••• •••• •••• {cardLastFour}
          </div>

          <div className="flex items-end justify-between pt-1 text-left">
            <div className="text-left">
              <span className="text-[9px] uppercase tracking-wider text-white/70 block text-left font-semibold">
                Cardholder Name
              </span>
              <span className="text-base font-bold tracking-wide text-white block text-left truncate max-w-[240px]">
                {cardholderName}
              </span>
            </div>

            <div className="text-left">
              <span className="text-[9px] uppercase tracking-wider text-white/70 block text-left font-semibold">
                Valid Thru
              </span>
              <span className="text-xs font-mono font-bold text-white block text-left">
                10/28
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
