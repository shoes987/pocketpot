"use client";

import React from "react";

interface TerracottaPotMascotProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl" | number;
  animate?: boolean;
  ariaLabel?: string;
}

export const TerracottaPotMascot: React.FC<TerracottaPotMascotProps> = ({
  className = "",
  size = "md",
  animate = false,
  ariaLabel = "PocketPot Terracotta Pot Buddy mascot",
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
        sizeClass = "w-24 sm:w-28 h-auto";
        break;
      case "lg":
        sizeClass = "w-32 sm:w-40 h-auto";
        break;
      case "xl":
        sizeClass = "w-48 sm:w-56 h-auto";
        break;
    }
  }

  // Exact brand colors matching official PocketPot terracotta character artwork:
  // Body fill: #D47501 (Warm Golden Amber Terracotta)
  // Rim collar fill: #BA4710 (Rich Terracotta Lip & Collar)
  // Outline & features: #253342 (Midnight Navy)
  const strokeColor = "#253342";
  const bodyColor = "#D47501";
  const rimColor = "#BA4710";

  return (
    <svg
      viewBox="0 0 270 265"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${sizeClass} ${className} ${animate ? "animate-bounce-subtle" : ""} select-none`}
      style={explicitWidth ? { width: explicitWidth, height: "auto" } : undefined}
      aria-label={ariaLabel}
      role="img"
    >
      {/* 1. FEET / LEGS (Attached at baseline) */}
      <path
        d="M 95 214 C 95 232 98 252 115 252 C 131 252 135 232 134 214 Z"
        fill={bodyColor}
        stroke={strokeColor}
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M 148 211 C 147 232 150 252 167 252 C 184 252 187 232 186 210 Z"
        fill={bodyColor}
        stroke={strokeColor}
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* 2. MAIN BODY: Flower pot trapezoid tapering inwards from collar down to base (width 203 to 139) */}
      <path
        d="M 32 75
           L 38 122
           L 45 154
           L 54 186
           C 56 200 60 214 65 214
           L 204 210
           C 212 210 218 200 222 186
           L 224 154
           L 231 122
           L 235 62
           Z"
        fill={bodyColor}
        stroke={strokeColor}
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* 3. ARMS: Hanging stubby side arms */}
      {/* Left Arm */}
      <path
        d="M 40 138
           C 26 150 22 168 24 186
           C 25 198 29 208 36 207
           C 45 206 48 196 50 182
           C 52 168 48 152 40 138 Z"
        fill={bodyColor}
        stroke={strokeColor}
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Right Arm */}
      <path
        d="M 225 138
           C 240 150 254 168 255 186
           C 255 198 248 204 238 202
           C 229 200 224 192 222 180
           C 220 166 222 152 225 138 Z"
        fill={bodyColor}
        stroke={strokeColor}
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* 4. FACE FEATURES */}
      {/* Left Eye */}
      <circle cx="101.5" cy="105" r="9.5" fill={strokeColor} />

      {/* Right Eye */}
      <circle cx="169" cy="102" r="9.5" fill={strokeColor} />

      {/* Cheerful Smile Mouth Arc */}
      <path
        d="M 115 125 Q 136 143 156 124"
        fill="none"
        stroke={strokeColor}
        strokeWidth="6"
        strokeLinecap="round"
      />

      {/* 5. TOP RIM & COLLAR: Wide tilted terracotta band sitting on top */}
      <path
        d="M 16 42
       C 60 16 120 10 180 9
       C 215 9 235 13 245 18
       C 248 28 246 45 235 62
       C 215 65 180 68 120 73
       C 70 75 35 75 25 75
       C 18 68 14 55 16 42 Z"
        fill={rimColor}
        stroke={strokeColor}
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Rim Front Edge Ridge Line (3D perspective separator) */}
      <path
        d="M 16 42
       C 55 42 115 41 175 36
       C 210 32 235 26 245 18"
        fill="none"
        stroke={strokeColor}
        strokeWidth="6.5"
        strokeLinecap="round"
      />
    </svg>
  );
};

export default TerracottaPotMascot;
