"use client";

import React from "react";
import { CheckCircle2, PauseCircle, Sparkles } from "lucide-react";
import { MicrocopyItem } from "@/lib/copy/microcopy";

interface MicrocopyAlertProps {
  type?: "positive" | "pause" | "neutral";
  content: MicrocopyItem;
  className?: string;
}

export const MicrocopyAlert: React.FC<MicrocopyAlertProps> = ({
  type = "pause",
  content,
  className = "",
}) => {
  const isPositive = type === "positive";
  const isPause = type === "pause";

  // Palette compliance:
  // Positive State: #15803D (Sage Green)
  // Warning/Pause State: #C2410C (Soft Terracotta)
  // Focus Indicator: #4338CA (Electric Indigo)
  const borderClass = isPositive
    ? "border-positiveState/30 bg-[#F0FDF4]"
    : isPause
    ? "border-warningState/30 bg-[#FFF7ED]"
    : "border-borderMuted bg-surface";

  const badgeColor = isPositive
    ? "bg-positiveState/10 text-positiveState border-positiveState/20"
    : isPause
    ? "bg-warningState/10 text-warningState border-warningState/20"
    : "bg-tealSurface text-brandPrimary border-brandPrimary/20";

  const iconElement = isPositive ? (
    <CheckCircle2 className="w-6 h-6 text-positiveState flex-shrink-0" />
  ) : isPause ? (
    <PauseCircle className="w-6 h-6 text-warningState flex-shrink-0" />
  ) : (
    <Sparkles className="w-6 h-6 text-brandPrimary flex-shrink-0" />
  );

  return (
    <div
      role="status"
      aria-live="polite"
      tabIndex={0}
      className={`rounded-island border p-4 shadow-islandCard text-left transition-all focus-visible:outline focus-visible:outline-3 focus-visible:outline-focusIndicator ${borderClass} ${className}`}
    >
      <div className="flex items-start gap-3.5 text-left">
        <div className="mt-1">{iconElement}</div>
        <div className="flex-1 text-left space-y-1.5">
          <div className="flex items-center gap-2">
            <span
              className={`text-sm font-semibold px-2.5 py-0.5 rounded-full border ${badgeColor}`}
            >
              {content.badgeText}
            </span>
          </div>

          <h4 className="text-lg font-bold text-primaryText text-left">
            {content.headline}
          </h4>

          {/* Minimum body size 18sp/pt (text-body) */}
          <p className="text-body text-primaryText/90 text-left leading-relaxed">
            {content.body}
          </p>

          {content.actionPrompt && (
            <p className="text-sm font-medium text-primaryText/70 pt-1 text-left">
              • {content.actionPrompt}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
