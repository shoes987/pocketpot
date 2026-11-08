"use client";

import React, { useState, useRef } from "react";
import { SavingsPotDocument } from "@/lib/firebase/types";
import { formatCurrency } from "@/lib/firebase/zero-pii";
import { PotGraphic } from "./PotGraphic";
import { Search, ChevronRight, ChevronLeft, Eye, Sparkles } from "lucide-react";

export interface KeyStageDashboardProps {
  totalSavingsCents?: number;
  pupilCount?: number;
  pots?: SavingsPotDocument[];
  keyStageLabel?: string;
  className?: string;
  onSelectPot?: (pot: SavingsPotDocument) => void;
  onViewAllClick?: () => void;
}

interface DemoPotItem {
  id: string;
  title: string;
  variant: "single" | "stacked";
  percentageBottom: number;
  percentageTop?: number;
  growthPill?: string;
  theme?: "calmingTeal" | "warmAmber";
  amountSavedCents: number;
  targetCents: number;
}

export const KeyStageDashboard: React.FC<KeyStageDashboardProps> = ({
  totalSavingsCents,
  pupilCount = 10,
  pots = [],
  keyStageLabel = "Key Stage Pot",
  className = "",
  onSelectPot,
  onViewAllClick,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const carouselRef = useRef<HTMLDivElement>(null);
  const [selectedPotModal, setSelectedPotModal] = useState<DemoPotItem | null>(null);

  // Default demo items matching single garden pot layout
  const defaultItems: DemoPotItem[] = [
    {
      id: "demo-pot-1",
      title: "Class Zoo Wildlife Pot",
      variant: "single",
      percentageBottom: 45,
      growthPill: "↑ £3.50+",
      theme: "calmingTeal",
      amountSavedCents: 4500,
      targetCents: 10000,
    },
    {
      id: "demo-pot-2",
      title: "Planetarium Science Trip",
      variant: "single",
      percentageBottom: 46,
      growthPill: "↑ £1.00+",
      theme: "calmingTeal",
      amountSavedCents: 3680,
      targetCents: 8000,
    },
    {
      id: "demo-pot-3",
      title: "School Garden Pot",
      variant: "single",
      percentageBottom: 25,
      growthPill: "↑ 25%",
      theme: "calmingTeal",
      amountSavedCents: 1250,
      targetCents: 5000,
    },
    {
      id: "demo-pot-4",
      title: "Class Library Books Pot",
      variant: "single",
      percentageBottom: 75,
      growthPill: "↑ 75%",
      theme: "calmingTeal",
      amountSavedCents: 3750,
      targetCents: 5000,
    },
    {
      id: "demo-pot-5",
      title: "Sports Day Equipment",
      variant: "single",
      percentageBottom: 60,
      growthPill: "↑ £2.00+",
      theme: "warmAmber",
      amountSavedCents: 3000,
      targetCents: 5000,
    },
  ];

  // Merge real pots if provided, or map to display items
  const displayItems: DemoPotItem[] =
    pots.length > 0
      ? pots.map((p, idx) => {
          const pct = Math.min(
            100,
            Math.round((p.currentAmountCents / (p.targetAmountCents || 1000)) * 100)
          );
          return {
            id: p.potId,
            title: p.title,
            variant: "single" as const,
            percentageBottom: pct,
            growthPill: idx === 0 ? "↑ £3.50+" : idx === 1 ? "↑ £1.00+" : `↑ ${pct}%`,
            theme: (p.theme as "calmingTeal" | "warmAmber") || "calmingTeal",
            amountSavedCents: p.currentAmountCents,
            targetCents: p.targetAmountCents,
          };
        })
      : defaultItems;

  // Filter items by search query
  const filteredItems = displayItems.filter((item) =>
    item.title.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  // Compute total savings
  const computedTotalCents =
    totalSavingsCents !== undefined
      ? totalSavingsCents
      : displayItems.reduce((acc, curr) => acc + curr.amountSavedCents, 0);

  // Carousel scroll controls
  const handleScroll = (direction: "left" | "right") => {
    if (!carouselRef.current) return;
    const scrollAmount = 260;
    carouselRef.current.scrollBy({
      left: direction === "right" ? scrollAmount : -scrollAmount,
      behavior: "smooth",
    });
  };

  return (
    <article
      aria-label="Key Stage Dashboard Overview"
      className={`relative bg-surface rounded-[2rem] p-6 md:p-8 border border-borderMuted shadow-sm space-y-6 text-left ${className}`}
    >
      {/* 1. TOP HEADER & SEARCH BAR (Exact match to reference UI) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-borderMuted/60 pb-5 text-left">
        <div className="space-y-0.5 text-left">
          <h2 className="text-3xl font-bold tracking-tight text-primaryText text-left">
            Dashboard
          </h2>
          <span className="text-xs font-bold uppercase tracking-wider text-primaryText/60 block text-left">
            {keyStageLabel}
          </span>
        </div>

        {/* Search Pill Input with Magnifying Glass */}
        <div className="relative min-w-[240px] max-w-sm">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search pupils or pots..."
            className="w-full pl-4 pr-10 py-2.5 text-sm bg-canvas rounded-full border border-borderMuted text-primaryText placeholder:text-primaryText/45 focus:outline-none focus:ring-2 focus:ring-brandPrimary focus:bg-surface transition-all font-medium"
          />
          <Search className="w-4 h-4 text-primaryText/45 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* 2. STATS & ACTION ROW */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 text-left">
        <div className="space-y-1 text-left">
          <div className="flex items-baseline gap-2.5 text-left">
            <span className="text-3xl md:text-4xl font-bold text-primaryText tracking-tight block">
              {formatCurrency(computedTotalCents)}
            </span>
            <span className="text-sm font-bold text-brandPrimary tracking-wide">
              + Total Class Savings
            </span>
          </div>
          <p className="text-body text-primaryText/75 text-left font-medium">
            Invest in the future &bull; Savings includes {pupilCount} of your pupils&apos; pots on savings.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onViewAllClick || (() => handleScroll("right"))}
            className="px-6 py-2.5 rounded-full bg-brandPrimary hover:bg-teal-700 active:scale-95 text-white font-bold text-sm shadow-sm transition-all flex items-center gap-2 focus-visible:outline focus-visible:outline-3 focus-visible:outline-focusIndicator"
          >
            <span>View All Pots</span>
            <Eye className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 3. HORIZONTAL POTS CAROUSEL (Mimicking 4 pots + Right Arrow) */}
      <div className="relative group pt-1">
        {/* Scroll Left Button (hidden if at start) */}
        <button
          type="button"
          onClick={() => handleScroll("left")}
          aria-label="Scroll left in pots carousel"
          className="absolute -left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-surface border border-borderMuted shadow-md flex items-center justify-center text-primaryText/70 hover:text-brandPrimary hover:bg-canvas transition-all"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Scrollable Container */}
        <div
          ref={carouselRef}
          tabIndex={0}
          role="region"
          aria-label="Key stage savings pots horizontal carousel"
          className="flex items-stretch gap-5 overflow-x-auto pb-4 pt-1 px-1 scroll-smooth scrollbar-none"
        >
          {filteredItems.length === 0 ? (
            <div className="w-full py-10 text-center text-primaryText/60 bg-canvas rounded-2xl border border-dashed border-borderMuted">
              <p className="text-sm font-semibold">
                No pots match &quot;{searchQuery}&quot;. Let&apos;s puzzle this out together!
              </p>
            </div>
          ) : (
            filteredItems.map((item) => (
              <div
                key={item.id}
                className="flex-shrink-0 flex flex-col items-center w-[155px] text-center select-none"
              >
                {/* Visual Container with SVG Pot */}
                <PotGraphic
                  variant={item.variant}
                  percentageBottom={item.percentageBottom}
                  percentageTop={item.percentageTop}
                  growthPill={item.growthPill}
                  theme={item.theme}
                  onClick={() => setSelectedPotModal(item)}
                />

                {/* Pot Name & Progress Subtitle */}
                <div className="mt-2.5 text-center w-full px-1">
                  <span
                    title={item.title}
                    className="text-xs font-bold text-primaryText block truncate leading-tight"
                  >
                    {item.title}
                  </span>
                  <span className="text-[11px] text-primaryText/60 font-medium block mt-0.5">
                    {formatCurrency(item.amountSavedCents)} saved
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Scroll Right Button (Floating circular arrow matching image) */}
        <button
          type="button"
          onClick={() => handleScroll("right")}
          aria-label="Scroll right in pots carousel"
          className="absolute -right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-surface border border-borderMuted shadow-md flex items-center justify-center text-primaryText/70 hover:text-brandPrimary hover:bg-canvas transition-all"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* 4. INTERACTIVE INSPECTION MODAL (When pot is clicked) */}
      {selectedPotModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-primaryText/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div className="bg-surface rounded-[2rem] p-6 max-w-sm w-full border border-borderMuted shadow-xl space-y-4 text-left">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-brandPrimary block">
                  Pot Inspection
                </span>
                <h3 className="text-xl font-bold text-primaryText">
                  {selectedPotModal.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPotModal(null)}
                className="text-primaryText/50 hover:text-primaryText p-1.5 rounded-lg text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <div className="flex justify-center py-2">
              <div className="w-[180px]">
                <PotGraphic
                  variant={selectedPotModal.variant}
                  percentageBottom={selectedPotModal.percentageBottom}
                  percentageTop={selectedPotModal.percentageTop}
                  growthPill={selectedPotModal.growthPill}
                  theme={selectedPotModal.theme}
                />
              </div>
            </div>

            <div className="bg-canvas p-4 rounded-2xl border border-borderMuted space-y-2 text-left">
              <div className="flex justify-between text-xs font-bold text-primaryText">
                <span>Current Saved:</span>
                <span className="text-brandPrimary font-extrabold">
                  {formatCurrency(selectedPotModal.amountSavedCents)}
                </span>
              </div>
              <div className="flex justify-between text-xs font-bold text-primaryText">
                <span>Goal Target:</span>
                <span>{formatCurrency(selectedPotModal.targetCents)}</span>
              </div>
              <div className="flex justify-between text-xs font-bold text-primaryText">
                <span>Status:</span>
                <span className="text-positiveState">Growing steadily</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedPotModal(null)}
              className="w-full py-2.5 rounded-full bg-brandPrimary text-white font-bold text-sm shadow-sm hover:bg-teal-700 transition-all"
            >
              Close Peek
            </button>
          </div>
        </div>
      )}
    </article>
  );
};
