"use client";

import React from "react";

interface PocketPotLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "full" | "mark" | "horizontal";
  inverted?: boolean; // When placed on dark / teal backgrounds
  showTagline?: boolean;
}

export const PocketPotLogoMark: React.FC<{
  className?: string;
  inverted?: boolean;
}> = ({ className = "w-8 h-8", inverted = false }) => {
  // Brand colors:
  // Amber / Terracotta: #E57A18 (stroke for "P")
  // Dark navy: #15263A (outline for pots & text)
  // Teal: #0D9488 / #0F766E (pot bodies)
  const pColor = inverted ? "#F59E0B" : "#D97706"; // Warm amber
  const potOutline = inverted ? "#FFFFFF" : "#13263E"; // Dark navy or crisp white on teal
  const potFill = inverted ? "#14B8A6" : "#0D9488"; // Brighter teal when inverted on darker teal

  return (
    <svg
      viewBox="0 0 140 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="PocketPot Logo Mark"
      role="img"
    >
      {/* Outer Stylized "P" Stroke */}
      <path
        d="M 58 142 
           C 42 142, 30 134, 30 118 
           L 30 38 
           C 30 20, 46 14, 68 14 
           L 90 14 
           C 114 14, 126 26, 126 48 
           C 126 70, 114 84, 94 84 
           C 84 84, 76 82, 70 80"
        stroke={pColor}
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* 3 STACKED POTS */}
      {/* Top Pot (Smallest) */}
      <g id="top-pot">
        {/* Pot Body */}
        <path
          d="M 56 34 L 59 48 C 59.5 52, 63 54, 70 54 L 84 54 C 91 54, 94.5 52, 95 48 L 98 34 Z"
          fill={potFill}
          stroke={potOutline}
          strokeWidth="3.2"
          strokeLinejoin="round"
        />
        {/* Pot Rim */}
        <rect
          x="53"
          y="25"
          width="48"
          height="10.5"
          rx="5.25"
          fill={potFill}
          stroke={potOutline}
          strokeWidth="3.2"
        />
      </g>

      {/* Middle Pot */}
      <g id="middle-pot">
        {/* Pot Body */}
        <path
          d="M 53 58 L 57 76 C 57.5 81, 62 83, 70 83 L 84 83 C 92 83, 96.5 81, 97 76 L 101 58 Z"
          fill={potFill}
          stroke={potOutline}
          strokeWidth="3.5"
          strokeLinejoin="round"
        />
        {/* Pot Rim */}
        <rect
          x="50"
          y="49"
          width="54"
          height="11.5"
          rx="5.75"
          fill={potFill}
          stroke={potOutline}
          strokeWidth="3.5"
        />
      </g>

      {/* Bottom Pot (Largest) */}
      <g id="bottom-pot">
        {/* Pot Body */}
        <path
          d="M 50 86 L 55 116 C 55.5 125, 62 129, 70 129 L 84 129 C 92 129, 98.5 125, 99 116 L 104 86 Z"
          fill={potFill}
          stroke={potOutline}
          strokeWidth="3.8"
          strokeLinejoin="round"
        />
        {/* Pot Rim */}
        <rect
          x="47"
          y="76"
          width="60"
          height="12.5"
          rx="6.25"
          fill={potFill}
          stroke={potOutline}
          strokeWidth="3.8"
        />
      </g>
    </svg>
  );
};

export const PocketPotLogo: React.FC<PocketPotLogoProps> = ({
  className = "",
  size = "md",
  variant = "horizontal",
  inverted = false,
  showTagline = false,
}) => {
  const sizeMap = {
    sm: { mark: "w-7 h-7", text: "text-base", sub: "text-[9px]" },
    md: { mark: "w-9 h-9", text: "text-xl", sub: "text-[11px]" },
    lg: { mark: "w-12 h-12", text: "text-2xl", sub: "text-xs" },
    xl: { mark: "w-16 h-16", text: "text-3xl", sub: "text-sm" },
  };

  const currentSize = sizeMap[size];
  const textColor = inverted ? "text-white" : "text-[#13263E]";
  const subColor = inverted ? "text-teal-100/90" : "text-primaryText/70";

  if (variant === "mark") {
    return <PocketPotLogoMark className={`${currentSize.mark} ${className}`} inverted={inverted} />;
  }

  if (variant === "full") {
    return (
      <div className={`flex flex-col items-center text-center ${className}`}>
        <PocketPotLogoMark className={currentSize.mark} inverted={inverted} />
        <span className={`font-extrabold tracking-tight mt-1.5 ${currentSize.text} ${textColor}`}>
          PocketPot
        </span>
        {showTagline && (
          <span className={`font-medium tracking-normal mt-0.5 ${currentSize.sub} ${subColor}`}>
            Invest in the Future.
          </span>
        )}
      </div>
    );
  }

  // Horizontal layout (standard for headers)
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <PocketPotLogoMark className={`${currentSize.mark} flex-shrink-0`} inverted={inverted} />
      <div className="flex flex-col text-left leading-none">
        <span className={`font-black tracking-tight ${currentSize.text} ${textColor}`}>
          PocketPot
        </span>
        {showTagline && (
          <span className={`font-medium tracking-tight mt-1 ${currentSize.sub} ${subColor}`}>
            Invest in the Future.
          </span>
        )}
      </div>
    </div>
  );
};
