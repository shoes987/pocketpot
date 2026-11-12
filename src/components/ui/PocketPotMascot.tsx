"use client";

import React from "react";

interface PocketPotMascotProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl" | number;
  animate?: boolean;
  ariaLabel?: string;
}

export const PocketPotMascot: React.FC<PocketPotMascotProps> = ({
  className = "",
  size = "md",
  animate = false,
  ariaLabel = "PocketPot Buddy mascot with seedling sprout",
}) => {
  // Proportional sizing presets
  let sizeClass = "";
  let explicitWidth: number | undefined;

  if (typeof size === "number") {
    explicitWidth = size;
  } else {
    switch (size) {
      case "sm":
        sizeClass = "w-12 h-auto";
        break;
      case "md":
        sizeClass = "w-16 sm:w-20 h-auto";
        break;
      case "lg":
        sizeClass = "w-24 sm:w-28 h-auto";
        break;
      case "xl":
        sizeClass = "w-36 sm:w-44 h-auto";
        break;
    }
  }

  // Exact brand colors matching official PocketPot character illustration:
  // Teal body fill: #169085
  // Sprout green fill: #227D49
  // Outline stroke: #253342
  const strokeColor = "#253342";
  const bodyColor = "#169085";
  const leafColor = "#227D49";

  return (
    <svg
      viewBox="0 0 258 342"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${sizeClass} ${className} ${animate ? "animate-bounce-subtle" : ""} select-none`}
      style={explicitWidth ? { width: explicitWidth, height: "auto" } : undefined}
      aria-label={ariaLabel}
      role="img"
    >
      {/* 1. FEET / LEGS (Layered behind base) */}
      {/* Left Foot */}
      <path
        d="M 86 292 C 84 313 88 333 104 333 C 118 333 122 313 120 292"
        fill={bodyColor}
        stroke={strokeColor}
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Right Foot */}
      <path
        d="M 137 292 C 137 313 142 333 156 333 C 170 333 174 313 172 292"
        fill={bodyColor}
        stroke={strokeColor}
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* 2. MAIN BODY (Rounded pot silhouette tapering slightly outwards towards the bottom) */}
      <path
        d="M 125 96
           C 85 96 46 116 35 158
           C 28 185 32 225 38 255
           C 42 278 50 295 75 295
           L 175 295
           C 195 295 206 278 212 255
           C 219 220 223 185 216 155
           C 208 116 168 96 125 96 Z"
        fill={bodyColor}
        stroke={strokeColor}
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* 3. ARMS (Side resting arms with clean separation seams) */}
      {/* Left Arm */}
      <path
        d="M 37 220
           C 27 228 15 246 14 264
           C 13 278 20 289 32 288
           C 42 287 44 276 43 258
           C 42 246 39 233 37 220"
        fill={bodyColor}
        stroke={strokeColor}
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Right Arm */}
      <path
        d="M 213 220
           C 223 228 238 246 240 264
           C 241 276 233 284 222 283
           C 212 282 210 272 210 254
           C 210 243 211 233 213 220"
        fill={bodyColor}
        stroke={strokeColor}
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* 4. FACE FEATURES */}
      {/* Left Eye */}
      <circle cx="89.5" cy="189" r="10.5" fill={strokeColor} />

      {/* Right Eye (Subtle playful height offset) */}
      <circle cx="157.5" cy="184.5" r="10.5" fill={strokeColor} />

      {/* Cheerful Smile Arc */}
      <path
        d="M 103 207 Q 124 227 146 205"
        fill="none"
        stroke={strokeColor}
        strokeWidth="6"
        strokeLinecap="round"
      />

      {/* 5. SPROUT ON TOP */}
      {/* Central Sprout Stem */}
      <path
        d="M 121 97 L 122 79 C 122 76 128 76 128 79 L 129 97 Z"
        fill={leafColor}
        stroke={strokeColor}
        strokeWidth="6.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Left Sprout Leaf */}
      <path
        d="M 123 78
           C 100 80 65 72 43 38
           C 66 26 102 38 123 78 Z"
        fill={leafColor}
        stroke={strokeColor}
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Left Leaf Center Vein */}
      <path
        d="M 121 75 Q 82 48 45 39"
        fill="none"
        stroke={strokeColor}
        strokeWidth="6"
        strokeLinecap="round"
      />

      {/* Right Sprout Leaf */}
      <path
        d="M 126 78
           C 150 78 178 58 190 28
           C 178 22 144 32 126 78 Z"
        fill={leafColor}
        stroke={strokeColor}
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Right Leaf Center Vein */}
      <path
        d="M 128 75 Q 162 45 188 29"
        fill="none"
        stroke={strokeColor}
        strokeWidth="6"
        strokeLinecap="round"
      />
    </svg>
  );
};

export default PocketPotMascot;
