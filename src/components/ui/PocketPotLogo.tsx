"use client";

import React from "react";

interface PocketPotLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "full" | "mark" | "horizontal";
  inverted?: boolean; // When placed on dark / teal backgrounds (affects text)
  showTagline?: boolean;
  withCircle?: boolean; // Encapsulate in white circle
}

export const PocketPotLogoMark: React.FC<{
  className?: string;
  withCircle?: boolean;
}> = ({ className = "w-10 h-10", withCircle = true }) => {
  // Exact brand colors directly extracted from the official PocketPot artwork:
  // "P" Outer Stroke: #CC7600 (Rich Warm Amber)
  // Pots Outline: #27394D (Midnight Navy)
  // Pots Fill: #188781 (Deep Peacock Sea Teal)
  const pColor = "#CC7600";
  const potOutline = "#27394D";
  const potFill = "#188781";

  return (
    <svg
      viewBox="0 0 240 240"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="PocketPot Official Logo Mark"
      role="img"
    >
      {/* Pristine White Circle Background */}
      {withCircle && <circle cx="120" cy="120" r="114" fill="#FFFFFF" />}

      {/* 1. LAYER 1: More Rounded Stylized "P" Stroke with generous breathing gap from circle */}
      <path
        d="M 96 193
           H 86
           C 70.5 193, 58 180.5, 58 165
           V 75
           C 58 59.5, 70.5 47, 86 47
           H 154
           C 169.5 47, 182 59.5, 182 75
           V 112
           C 182 127.5, 169.5 140, 154 140
           H 142"
        stroke={pColor}
        strokeWidth="11"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* 2. LAYER 2: 3 STACKED POTS (Exact proportions & balanced rim nesting) */}
      {/* TOP POT */}
      <g id="top-pot">
        <path
          d="M 83 79 L 86 99 H 154 L 157 79 Z"
          fill={potFill}
          stroke={potOutline}
          strokeWidth="6"
          strokeLinejoin="round"
        />
        <rect
          x="77"
          y="63"
          width="86"
          height="19"
          rx="9.5"
          fill={potFill}
          stroke={potOutline}
          strokeWidth="6"
        />
      </g>

      {/* MIDDLE POT */}
      <g id="middle-pot">
        <path
          d="M 83 115 L 86 135 H 154 L 157 115 Z"
          fill={potFill}
          stroke={potOutline}
          strokeWidth="6"
          strokeLinejoin="round"
        />
        <rect
          x="77"
          y="99"
          width="86"
          height="19"
          rx="9.5"
          fill={potFill}
          stroke={potOutline}
          strokeWidth="6"
        />
      </g>

      {/* BOTTOM POT (Tallest with flat rounded base) */}
      <g id="bottom-pot">
        <path
          d="M 83 151 L 91 187 C 92.5 192, 96 193.5, 101 193.5 H 139 C 144 193.5, 147.5 192, 149 187 L 157 151 Z"
          fill={potFill}
          stroke={potOutline}
          strokeWidth="6"
          strokeLinejoin="round"
        />
        <rect
          x="77"
          y="135"
          width="86"
          height="19"
          rx="9.5"
          fill={potFill}
          stroke={potOutline}
          strokeWidth="6"
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
  withCircle = true,
}) => {
  const sizeMap = {
    sm: { mark: "w-8 h-8", text: "text-lg", sub: "text-[10px]" },
    md: { mark: "w-10 h-10", text: "text-xl", sub: "text-xs" },
    lg: { mark: "w-14 h-14", text: "text-2xl", sub: "text-sm" },
    xl: { mark: "w-20 h-20", text: "text-3xl", sub: "text-base" },
  };

  const currentSize = sizeMap[size];
  const textColor = inverted ? "text-white" : "text-[#13263E]";
  const subColor = inverted ? "text-teal-100/90" : "text-[#13263E]/80";

  if (variant === "mark") {
    return (
      <PocketPotLogoMark
        className={`${currentSize.mark} ${className}`}
        withCircle={withCircle}
      />
    );
  }

  if (variant === "full") {
    return (
      <div className={`flex flex-col items-center text-center ${className}`}>
        <PocketPotLogoMark className={currentSize.mark} withCircle={withCircle} />
        <span className={`font-black tracking-tight mt-2 ${currentSize.text} ${textColor}`}>
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
    <div className={`flex items-center gap-3 ${className}`}>
      <PocketPotLogoMark
        className={`${currentSize.mark} flex-shrink-0 drop-shadow-xs`}
        withCircle={withCircle}
      />
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
