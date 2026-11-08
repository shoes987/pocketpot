"use client";

import React from "react";
import Link from "next/link";
import { CreditCard, Layers, Briefcase, ShoppingBag } from "lucide-react";

interface PupilBottomNavProps {
  pupilId: string;
  activeTab: "card" | "pots" | "jobs" | "marketplace";
  potsCount?: number;
  availableJobsCount?: number;
  availableRewardsCount?: number;
}

export const PupilBottomNav: React.FC<PupilBottomNavProps> = ({
  pupilId,
  activeTab,
  potsCount = 0,
  availableJobsCount = 0,
  availableRewardsCount = 0,
}) => {
  const isCard = activeTab === "card";
  const isPots = activeTab === "pots";
  const isJobs = activeTab === "jobs";
  const isMarketplace = activeTab === "marketplace";

  return (
    <nav
      role="navigation"
      aria-label="Pupil Banking Navigation"
      className="fixed bottom-0 inset-x-0 z-40 bg-surface/95 backdrop-blur-md border-t border-borderMuted shadow-potBase"
    >
      <div className="max-w-xl mx-auto px-3 sm:px-4 py-2 flex items-center justify-around gap-1.5 sm:gap-3">
        {/* Tab 1: My Card & Account */}
        <Link
          href={`/pupil/${pupilId}`}
          className={`flex-1 flex flex-col items-center justify-center py-2 px-2.5 rounded-island transition-all focus-visible:outline focus-visible:outline-3 focus-visible:outline-focusIndicator ${
            isCard
              ? "bg-tealSurface text-brandPrimary font-bold shadow-xs"
              : "text-primaryText/70 hover:text-brandPrimary hover:bg-canvas"
          }`}
          aria-current={isCard ? "page" : undefined}
        >
          <div className="relative">
            <CreditCard className={`w-5 h-5 sm:w-6 sm:h-6 ${isCard ? "text-brandPrimary stroke-[2.25]" : "text-primaryText/60"}`} />
            {isCard && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-brandPrimary rounded-full" />
            )}
          </div>
          <span className="text-[10px] sm:text-xs mt-1 tracking-tight font-extrabold truncate">
            My Card
          </span>
        </Link>

        {/* Tab 2: Savings Pots */}
        <Link
          href={`/pupil/${pupilId}/pots`}
          className={`flex-1 flex flex-col items-center justify-center py-2 px-2.5 rounded-island transition-all focus-visible:outline focus-visible:outline-3 focus-visible:outline-focusIndicator ${
            isPots
              ? "bg-amberSurface text-brandSecondary font-bold shadow-xs"
              : "text-primaryText/70 hover:text-brandSecondary hover:bg-canvas"
          }`}
          aria-current={isPots ? "page" : undefined}
        >
          <div className="relative">
            <Layers className={`w-5 h-5 sm:w-6 sm:h-6 ${isPots ? "text-brandSecondary stroke-[2.25]" : "text-primaryText/60"}`} />
            {potsCount > 0 && (
              <span
                className={`absolute -top-1.5 -right-2 px-1.5 py-0.2 rounded-full text-[9px] sm:text-[10px] font-bold border ${
                  isPots
                    ? "bg-brandSecondary text-white border-brandSecondary"
                    : "bg-tealSurface text-brandPrimary border-brandPrimary/30"
                }`}
              >
                {potsCount}
              </span>
            )}
            {isPots && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-brandSecondary rounded-full" />
            )}
          </div>
          <span className="text-[10px] sm:text-xs mt-1 tracking-tight font-extrabold truncate">
            Pots
          </span>
        </Link>

        {/* Tab 3: Jobs Board */}
        <Link
          href={`/pupil/${pupilId}/jobs`}
          className={`flex-1 flex flex-col items-center justify-center py-2 px-2.5 rounded-island transition-all focus-visible:outline focus-visible:outline-3 focus-visible:outline-focusIndicator ${
            isJobs
              ? "bg-tealSurface text-brandPrimary font-bold shadow-xs"
              : "text-primaryText/70 hover:text-brandPrimary hover:bg-canvas"
          }`}
          aria-current={isJobs ? "page" : undefined}
        >
          <div className="relative">
            <Briefcase className={`w-5 h-5 sm:w-6 sm:h-6 ${isJobs ? "text-brandPrimary stroke-[2.25]" : "text-primaryText/60"}`} />
            {availableJobsCount > 0 && (
              <span className="absolute -top-1.5 -right-2 px-1.5 py-0.2 rounded-full text-[9px] sm:text-[10px] font-bold bg-brandPrimary text-white border border-brandPrimary">
                {availableJobsCount}
              </span>
            )}
            {isJobs && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-brandPrimary rounded-full" />
            )}
          </div>
          <span className="text-[10px] sm:text-xs mt-1 tracking-tight font-extrabold truncate">
            Jobs
          </span>
        </Link>

        {/* Tab 4: Classroom Market & Rewards */}
        <Link
          href={`/pupil/${pupilId}/marketplace`}
          className={`flex-1 flex flex-col items-center justify-center py-2 px-2.5 rounded-island transition-all focus-visible:outline focus-visible:outline-3 focus-visible:outline-focusIndicator ${
            isMarketplace
              ? "bg-tealSurface text-brandPrimary font-bold shadow-xs"
              : "text-primaryText/70 hover:text-brandPrimary hover:bg-canvas"
          }`}
          aria-current={isMarketplace ? "page" : undefined}
        >
          <div className="relative">
            <ShoppingBag className={`w-5 h-5 sm:w-6 sm:h-6 ${isMarketplace ? "text-brandPrimary stroke-[2.25]" : "text-primaryText/60"}`} />
            {isMarketplace && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-brandPrimary rounded-full" />
            )}
          </div>
          <span className="text-[10px] sm:text-xs mt-1 tracking-tight font-extrabold truncate">
            Market
          </span>
        </Link>
      </div>
    </nav>
  );
};
