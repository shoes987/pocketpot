"use client";

import React from "react";
import { breakdownBritishCurrency, CurrencyItem } from "@/lib/utils/money-breakdown";

interface BritishMoneyViewProps {
  amountPence: number;
  compact?: boolean;
}

export const BritishMoneyView: React.FC<BritishMoneyViewProps> = ({
  amountPence,
  compact = false,
}) => {
  const items = breakdownBritishCurrency(amountPence);

  if (items.length === 0) {
    return (
      <div className="space-y-1 text-left">
        <h4 className="text-xs font-bold uppercase tracking-wider text-primaryText/60 block text-left">
          What this looks like
        </h4>
        <p className="text-xs text-primaryText/50 font-medium py-1 text-left">
          Pot is empty • Ready for coins or notes
        </p>
      </div>
    );
  }

  // Render individual realistic coin
  const renderCoin = (item: CurrencyItem, keySuffix: number) => {
    const isPound2 = item.valuePence === 200;
    const isPound1 = item.valuePence === 100;
    const is50p = item.valuePence === 50;
    const is20p = item.valuePence === 20;
    const is10p = item.valuePence === 10;
    const is5p = item.valuePence === 5;
    const isCopper = item.valuePence <= 2;

    // Outer diameter
    const sizeClasses = isPound2
      ? "w-10 h-10 text-xs"
      : isPound1
      ? "w-9 h-9 text-xs"
      : is50p
      ? "w-9 h-9 text-xs"
      : is20p
      ? "w-8 h-8 text-[11px]"
      : is10p
      ? "w-8 h-8 text-[11px]"
      : is5p
      ? "w-7 h-7 text-[10px]"
      : isCopper && item.valuePence === 2
      ? "w-9 h-9 text-xs"
      : "w-7 h-7 text-[10px]";

    // £2 Bimetallic Coin
    if (isPound2) {
      return (
        <div
          key={`coin-${item.label}-${keySuffix}`}
          title="£2 Coin"
          className={`${sizeClasses} rounded-full bg-gradient-to-tr from-amber-500 via-amber-300 to-amber-500 border-2 border-amber-600 shadow-md p-1 flex items-center justify-center flex-shrink-0 transition-transform hover:scale-110`}
        >
          <div className="w-full h-full rounded-full bg-gradient-to-tr from-slate-300 via-slate-100 to-slate-300 border border-slate-400 flex items-center justify-center font-bold text-primaryText shadow-inner">
            £2
          </div>
        </div>
      );
    }

    // £1 Bimetallic 12-sided Coin
    if (isPound1) {
      return (
        <div
          key={`coin-${item.label}-${keySuffix}`}
          title="£1 Coin"
          className={`${sizeClasses} rounded-full bg-gradient-to-tr from-amber-500 via-amber-200 to-amber-500 border-2 border-amber-600 shadow-md p-1 flex items-center justify-center flex-shrink-0 transition-transform hover:scale-110`}
        >
          <div className="w-full h-full rounded-full bg-gradient-to-tr from-slate-200 via-slate-50 to-slate-200 border border-slate-400 flex items-center justify-center font-bold text-primaryText shadow-inner">
            £1
          </div>
        </div>
      );
    }

    // 50p Heptagon-styled Coin
    if (is50p) {
      return (
        <div
          key={`coin-${item.label}-${keySuffix}`}
          title="50p Coin"
          className={`${sizeClasses} rounded-xl bg-gradient-to-tr from-slate-300 via-slate-100 to-slate-300 border-2 border-slate-400 shadow-md flex items-center justify-center font-bold text-primaryText flex-shrink-0 transition-transform hover:scale-110`}
          style={{ clipPath: "polygon(50% 0%, 90% 20%, 100% 60%, 75% 100%, 25% 100%, 0% 60%, 10% 20%)" }}
        >
          50p
        </div>
      );
    }

    // 20p Heptagon-styled Coin
    if (is20p) {
      return (
        <div
          key={`coin-${item.label}-${keySuffix}`}
          title="20p Coin"
          className={`${sizeClasses} rounded-xl bg-gradient-to-tr from-slate-300 via-slate-100 to-slate-300 border-2 border-slate-400 shadow-md flex items-center justify-center font-bold text-primaryText flex-shrink-0 transition-transform hover:scale-110`}
          style={{ clipPath: "polygon(50% 0%, 90% 20%, 100% 60%, 75% 100%, 25% 100%, 0% 60%, 10% 20%)" }}
        >
          20p
        </div>
      );
    }

    // 10p & 5p Silver Round Coins
    if (is10p || is5p) {
      return (
        <div
          key={`coin-${item.label}-${keySuffix}`}
          title={item.label}
          className={`${sizeClasses} rounded-full bg-gradient-to-tr from-slate-400 via-slate-100 to-slate-300 border-2 border-slate-400 shadow-md flex items-center justify-center font-bold text-primaryText flex-shrink-0 transition-transform hover:scale-110`}
        >
          {item.label}
        </div>
      );
    }

    // 2p & 1p Bronze Copper Coins
    return (
      <div
        key={`coin-${item.label}-${keySuffix}`}
        title={item.label}
        className={`${sizeClasses} rounded-full bg-gradient-to-tr from-amber-800 via-amber-600 to-amber-700 border-2 border-amber-900 shadow-md flex items-center justify-center font-bold text-amber-100 flex-shrink-0 transition-transform hover:scale-110`}
      >
        {item.label}
      </div>
    );
  };

  // Render individual realistic banknote
  const renderNote = (item: CurrencyItem, keySuffix: number) => {
    const isPound20 = item.valuePence === 2000;
    const isPound10 = item.valuePence === 1000;
    const isPound5 = item.valuePence === 500;

    const bgGradient = isPound20
      ? "from-[#E9D5FF] via-[#F3E8FF] to-[#D8B4FE] border-[#4338CA] text-focusIndicator"
      : isPound10
      ? "from-[#FEF3C7] via-[#FFFBEB] to-[#FDE68A] border-brandSecondary text-brandSecondary"
      : "from-[#CCFBF1] via-[#F0FDFA] to-[#99F6E4] border-brandPrimary text-brandPrimary";

    const noteLabel = isPound20 ? "£20" : isPound10 ? "£10" : "£5";

    return (
      <div
        key={`note-${item.label}-${keySuffix}`}
        title={`${noteLabel} Banknote`}
        className={`w-20 h-11 rounded-md bg-gradient-to-r ${bgGradient} border-2 shadow-md p-1.5 flex flex-col justify-between flex-shrink-0 relative overflow-hidden transition-transform hover:scale-105`}
      >
        {/* Subtle Banknote Guilloche Pattern Watermark */}
        <div className="absolute right-1 top-1 w-6 h-6 rounded-full border border-current/20 opacity-30 flex items-center justify-center font-serif text-[8px] pointer-events-none">
          ♔
        </div>
        <div className="flex items-center justify-between text-[10px] font-bold tracking-tight leading-none">
          <span>{noteLabel}</span>
          <span className="text-[7px] uppercase font-bold tracking-widest opacity-70">BANK</span>
        </div>
        <div className="flex items-end justify-between leading-none">
          <span className="text-[6px] uppercase font-bold tracking-wider opacity-60">PROMISE TO PAY</span>
          <span className="text-sm font-bold tracking-tighter drop-shadow-xs">{noteLabel}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-2 text-left">
      {/* 1. Header: Strictly "What this looks like" */}
      <h4 className="text-xs font-bold uppercase tracking-wider text-primaryText/60 block text-left">
        What this looks like
      </h4>

      {/* 2. Free-floating physical notes and coins (NO container boxes or label explainers next to them) */}
      <div className="flex flex-wrap items-center gap-3 pt-1 text-left">
        {items.map((item) => {
          // Render each individual note or coin according to its count
          const renderedElements: React.ReactNode[] = [];
          for (let i = 0; i < item.count; i++) {
            if (item.type === "note") {
              renderedElements.push(renderNote(item, i));
            } else {
              renderedElements.push(renderCoin(item, i));
            }
          }
          return (
            <React.Fragment key={`group-${item.label}`}>
              {renderedElements}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
