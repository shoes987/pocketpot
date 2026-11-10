"use client";

import React from "react";

interface CoinBuddyMascotProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl" | number;
  animate?: boolean;
  ariaLabel?: string;
}

export const CoinBuddyMascot: React.FC<CoinBuddyMascotProps> = ({
  className = "",
  size = "md",
  animate = false,
  ariaLabel = "Thoughtful PocketPot coin buddy explaining the purpose of savings pots",
}) => {
  let sizeClass = "";
  let explicitWidth: number | undefined;

  if (typeof size === "number") {
    explicitWidth = size;
  } else {
    switch (size) {
      case "sm":
        sizeClass = "w-16 h-auto";
        break;
      case "md":
        sizeClass = "w-20 sm:w-24 h-auto";
        break;
      case "lg":
        sizeClass = "w-28 sm:w-36 h-auto";
        break;
      case "xl":
        sizeClass = "w-40 sm:w-48 h-auto";
        break;
    }
  }

  // Exact brand colors matching official PocketPot coin character artwork:
  // Amber coin core & limbs: #D47C02 (Warm Golden Amber)
  // Royal blue / Indigo ring: #3E46BA
  // 3D blue cylinder edge: #343B9E
  // Outline & features: #253342 (Midnight Navy)
  const strokeColor = "#253342";
  const amberColor = "#D47C02";
  const blueRingColor = "#3E46BA";
  const blueEdgeColor = "#343B9E";
  const innerEngravedColor = "#B86602";

  return (
    <svg
      viewBox="0 0 268 285"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${sizeClass} ${className} ${animate ? "animate-bounce-subtle" : ""} select-none`}
      style={explicitWidth ? { width: explicitWidth, height: "auto" } : undefined}
      aria-label={ariaLabel}
      role="img"
    >
      {/* 1. FEET / LEGS */}
      <path
        d="M 90 220 C 88 238 92 263 108 263 C 124 263 128 238 126 220 Z"
        fill={amberColor}
        stroke={strokeColor}
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M 144 220 C 143 238 147 263 162 263 C 178 263 182 238 180 220 Z"
        fill={amberColor}
        stroke={strokeColor}
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* 2. 3D MILLED COIN EDGE (Left-side extruded cylinder depth) */}
      <path
        d="M 133 16
           C 75 22 20 65 20 126
           C 20 180 75 228 136 236
           C 90 222 51 178 51 126
           C 51 74 90 28 133 16 Z"
        fill={blueEdgeColor}
        stroke={strokeColor}
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Transverse Reeding / Milling Grooves across the edge */}
      <path d="M 60 36 L 80 40" stroke={strokeColor} strokeWidth="5" strokeLinecap="round" />
      <path d="M 41 56 L 66 64" stroke={strokeColor} strokeWidth="5" strokeLinecap="round" />
      <path d="M 28 80 L 56 90" stroke={strokeColor} strokeWidth="5" strokeLinecap="round" />
      <path d="M 22 100 L 51 112" stroke={strokeColor} strokeWidth="5" strokeLinecap="round" />
      <path d="M 20 124 L 51 134" stroke={strokeColor} strokeWidth="5" strokeLinecap="round" />
      <path d="M 21 144 L 52 154" stroke={strokeColor} strokeWidth="5" strokeLinecap="round" />
      <path d="M 26 164 L 57 172" stroke={strokeColor} strokeWidth="5" strokeLinecap="round" />
      <path d="M 36 184 L 68 190" stroke={strokeColor} strokeWidth="5" strokeLinecap="round" />
      <path d="M 51 204 L 80 208" stroke={strokeColor} strokeWidth="5" strokeLinecap="round" />

      {/* 3. FRONT COIN FACE (3D Perspective Ellipse rx=95, ry=110) */}
      {/* Outer Royal Blue Ring */}
      <ellipse
        cx="146"
        cy="126"
        rx="95"
        ry="110"
        fill={blueRingColor}
        stroke={strokeColor}
        strokeWidth="7"
      />

      {/* Inner Amber Golden Coin Core Face */}
      <ellipse
        cx="146"
        cy="126"
        rx="76"
        ry="88"
        fill={amberColor}
        stroke={strokeColor}
        strokeWidth="7"
      />

      {/* Concentric Inner Coin Groove */}
      <ellipse
        cx="146"
        cy="126"
        rx="66"
        ry="77"
        fill="none"
        stroke={innerEngravedColor}
        strokeWidth="3"
        opacity="0.6"
      />

      {/* 4. RIGHT ARM (Hand on Hip) */}
      <path
        d="M 226 162
           C 242 165 248 175 246 186
           C 244 196 235 204 220 202
           C 216 195 218 185 220 174 Z"
        fill={amberColor}
        stroke={strokeColor}
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* 5. FACE FEATURES */}
      {/* Left Eyebrow (Inquisitive / Thinking) */}
      <path
        d="M 106 102 Q 118 90 130 96"
        fill="none"
        stroke={strokeColor}
        strokeWidth="6"
        strokeLinecap="round"
      />

      {/* Right Eyebrow */}
      <path
        d="M 168 96 Q 182 86 194 94"
        fill="none"
        stroke={strokeColor}
        strokeWidth="6"
        strokeLinecap="round"
      />

      {/* Left Eye */}
      <circle cx="122" cy="116" r="8.5" fill={strokeColor} />

      {/* Right Eye */}
      <circle cx="182" cy="112" r="8.5" fill={strokeColor} />

      {/* Thoughtful / Pondering Mouth Arc */}
      <path
        d="M 137 138 Q 153 131 169 137"
        fill="none"
        stroke={strokeColor}
        strokeWidth="6"
        strokeLinecap="round"
      />

      {/* 6. LEFT ARM & THINKING HAND (Curled under chin in thoughtful pose) */}
      <path
        d="M 80 185
           C 95 186 112 185 122 178
           C 127 172 129 164 131 156
           C 132 152 142 151 155 153
           C 168 155 174 162 170 170
           C 165 174 152 174 140 170
           C 128 176 112 186 80 185 Z"
        fill={amberColor}
        stroke={strokeColor}
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default CoinBuddyMascot;
