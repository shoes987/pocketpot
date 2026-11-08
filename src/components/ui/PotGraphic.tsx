"use client";

import React from "react";

export interface PotGraphicProps {
  variant?: "single" | "stacked";
  percentageBottom: number;
  percentageTop?: number;
  growthPill?: string; // e.g. "↑ £3.50+" or "↑ £1.00+"
  theme?: "calmingTeal" | "warmAmber";
  className?: string;
  onClick?: () => void;
}

/**
 * PotGraphic Component
 * 
 * Pixel-perfect SVG reproduction of the stacked & single container pots from the PocketPot UI:
 * - Wide rounded rolled rim (lip)
 * - Tapered pot body with rounded bottom corners
 * - Nested top pot for stacked milestone variants
 * - Growth pill badge with arrow
 * - Adheres strictly to PocketPot Brand Guidelines (Lexend, Calming Teal & Sage Green, Slate Navy)
 */
export const PotGraphic: React.FC<PotGraphicProps> = ({
  variant = "single",
  percentageBottom,
  percentageTop = 25,
  growthPill,
  theme = "calmingTeal",
  className = "",
  onClick,
}) => {
  const isTeal = theme === "calmingTeal";

  // Palette from reference image and PocketPot guidelines
  const colors = isTeal
    ? {
        capsuleBg: "#EEF3EF",
        capsuleBorder: "#D8E4DC",
        pillBg: "#E1ECE7",
        pillBorder: "#C4DDD4",
        pillText: "#244B3F",
        topPotRim: "#6C978B",
        topPotBody: "#7EA99D",
        topPotText: "#FFFFFF",
        bottomPotRim: "#3A5E53",
        bottomPotBody: "#477063",
        bottomPotText: "#FFFFFF",
        singlePotRim: "#3A5E53",
        singlePotBody: "#2B473E",
        singlePotFill: "#0D9488",
        singlePotText: "#FFFFFF",
      }
    : {
        capsuleBg: "#FFF7ED",
        capsuleBorder: "#FED7AA",
        pillBg: "#FEF3C7",
        pillBorder: "#FDE68A",
        pillText: "#92400E",
        topPotRim: "#F59E0B",
        topPotBody: "#FBBF24",
        topPotText: "#78350F",
        bottomPotRim: "#92400E",
        bottomPotBody: "#B45309",
        bottomPotText: "#FFFFFF",
        singlePotRim: "#92400E",
        singlePotBody: "#78350F",
        singlePotFill: "#D97706",
        singlePotText: "#FFFFFF",
      };

  const clampedPct = Math.max(0, Math.min(100, percentageBottom));
  const fillHeight = (clampedPct / 100) * 77;
  const fillY = 107 - fillHeight;
  const clipId = React.useId ? React.useId().replace(/:/g, "-") : `clip-${Math.random().toString(36).substr(2, 7)}`;

  return (
    <div
      onClick={onClick}
      className={`relative flex flex-col items-center justify-between w-full h-[220px] rounded-[1.75rem] p-3 transition-transform select-none ${
        onClick ? "cursor-pointer hover:scale-[1.02]" : ""
      } ${className}`}
      style={{
        backgroundColor: colors.capsuleBg,
        borderColor: colors.capsuleBorder,
      }}
    >
      {/* 1. FLOATING GROWTH PILL (AT TOP OF CAPSULE) */}
      <div className="w-full flex justify-center pt-0.5 min-h-[30px] z-20">
        {growthPill ? (
          <div className="flex flex-col items-center select-none">
            <div
              className="px-2.5 py-0.5 rounded-full text-[11px] font-bold border flex items-center gap-1 shadow-xs tracking-tight"
              style={{
                backgroundColor: colors.pillBg,
                borderColor: colors.pillBorder,
                color: colors.pillText,
              }}
            >
              <span>{growthPill}</span>
            </div>
            {/* Downward speech bubble pointer matching reference UI */}
            <div
              className="w-0 h-0 border-x-[4px] border-x-transparent border-t-[4px]"
              style={{ borderTopColor: colors.pillBorder }}
            />
          </div>
        ) : (
          <div className="h-4" />
        )}
      </div>

      {/* 2. POT ILLUSTRATION (BOTTOM SEATED) */}
      <div className="w-full flex justify-center items-end mt-auto pb-1">
        {variant === "stacked" ? (
          /* STACKED POTS: Top pot nested inside bottom pot */
          <svg
            viewBox="0 0 140 145"
            className="w-[125px] h-[130px] overflow-visible drop-shadow-sm"
          >
            {/* --- TOP NESTED POT --- */}
            <g id="top-nested-pot">
              {/* Top Pot Body (Tapered, sitting behind bottom rim) */}
              <path
                d="M 28 40 L 34 85 C 34 89, 40 92, 50 92 L 90 92 C 100 92, 106 89, 106 85 L 112 40 Z"
                fill={colors.topPotBody}
              />
              {/* Top Pot Rim (Rolled pill) */}
              <rect
                x="22"
                y="30"
                width="96"
                height="16"
                rx="8"
                fill={colors.topPotRim}
              />
              {/* Top Pot Rim Highlight */}
              <rect
                x="26"
                y="32"
                width="88"
                height="3"
                rx="1.5"
                fill="rgba(255, 255, 255, 0.25)"
              />
              {/* Top Pot Percentage Text */}
              <text
                x="70"
                y="66"
                textAnchor="middle"
                dominantBaseline="middle"
                fill={colors.topPotText}
                fontSize="15"
                fontWeight="700"
                fontFamily="Lexend, sans-serif"
                className="select-none"
              >
                {percentageTop}%
              </text>
            </g>

            {/* --- BOTTOM SUPPORTING POT --- */}
            <g id="bottom-pot">
              {/* Bottom Pot Body (Tapered with rounded base) */}
              <path
                d="M 18 84 L 26 132 C 27 139, 36 142, 48 142 L 92 142 C 104 142, 113 139, 114 132 L 122 84 Z"
                fill={colors.bottomPotBody}
              />
              {/* Bottom Pot Rim (Rolled pill extending beyond body) */}
              <rect
                x="12"
                y="74"
                width="116"
                height="18"
                rx="9"
                fill={colors.bottomPotRim}
              />
              {/* Bottom Pot Rim Highlight */}
              <rect
                x="16"
                y="76"
                width="108"
                height="3.5"
                rx="1.75"
                fill="rgba(255, 255, 255, 0.2)"
              />
              {/* Bottom Pot Percentage Text */}
              <text
                x="70"
                y="115"
                textAnchor="middle"
                dominantBaseline="middle"
                fill={colors.bottomPotText}
                fontSize="17"
                fontWeight="700"
                fontFamily="Lexend, sans-serif"
                className="select-none"
              >
                {percentageBottom}%
              </text>
            </g>
          </svg>
        ) : (
          /* SINGLE POT: Elegant container pot with dynamic fill level */
          <svg
            viewBox="0 0 140 110"
            className="w-[125px] h-[98px] overflow-visible drop-shadow-sm"
          >
            <defs>
              <clipPath id={clipId}>
                <path d="M 18 30 L 26 94 C 27 103, 36 107, 48 107 L 92 107 C 104 107, 113 103, 114 94 L 122 30 Z" />
              </clipPath>
            </defs>

            {/* Unfilled Pot Interior / Base Chamber */}
            <path
              d="M 18 30 L 26 94 C 27 103, 36 107, 48 107 L 92 107 C 104 107, 113 103, 114 94 L 122 30 Z"
              fill={colors.singlePotBody}
            />

            {/* Dynamic Fill Level: Liquid / Savings Fill that Raises and Falls */}
            <g clipPath={`url(#${clipId})`}>
              <rect
                x="0"
                y={fillY}
                width="140"
                height={fillHeight + 6}
                fill={colors.singlePotFill}
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

            {/* Rolled Pot Rim */}
            <rect
              x="12"
              y="20"
              width="116"
              height="18"
              rx="9"
              fill={colors.singlePotRim}
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
              fill={colors.singlePotText}
              fontSize="20"
              fontWeight="700"
              fontFamily="Lexend, sans-serif"
              className="select-none filter drop-shadow-sm"
            >
              {percentageBottom}%
            </text>
          </svg>
        )}
      </div>
    </div>
  );
};
