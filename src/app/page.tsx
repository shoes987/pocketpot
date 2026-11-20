"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PocketPotLogo } from "@/components/ui/PocketPotLogo";
import { CoinBuddyMascot } from "@/components/ui/CoinBuddyMascot";
import { PocketPotMascot } from "@/components/ui/PocketPotMascot";
import { TerracottaPotMascot } from "@/components/ui/TerracottaPotMascot";

export default function RootGatewayPage() {
  return (
    <main className="min-h-screen bg-canvas text-primaryText p-4 sm:p-6 md:p-10 font-lexend text-left flex flex-col justify-between">
      <div className="max-w-6xl mx-auto w-full space-y-8">
        {/* Top Header */}
        <header className="flex items-center justify-between border-b border-borderMuted/60 pb-6 text-left">
          <PocketPotLogo variant="horizontal" size="md" showTagline={true} />
        </header>

        {/* Hero Section */}
        <div className="space-y-2 text-left">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-primaryText leading-tight">
            Select Your Account Level Portal
          </h2>
        </div>

        {/* The 3 Separate Levels Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          
          {/* LEVEL 1: SCHOOL ADMIN */}
          <div className="p-6 rounded-pot bg-surface border-2 border-brandSecondary/40 shadow-islandCard flex flex-col justify-between space-y-5 hover:border-brandSecondary transition-all group">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-indigoSurface flex items-center justify-center text-2xl shadow-xs">
                  👑
                </div>
                <span className="text-[11px] px-2.5 py-1 rounded-full bg-indigoSurface text-focusIndicator font-bold border border-focusIndicator/30 uppercase">
                  Level 1: Admin
                </span>
              </div>

              <div>
                <h3 className="text-xl font-bold text-primaryText group-hover:text-brandSecondary transition-colors">
                  School Admin Portal
                </h3>
              </div>

              {/* Character Mascot */}
              <div className="py-4 flex items-center justify-center">
                <CoinBuddyMascot size="md" className="mx-auto drop-shadow-md transition-transform group-hover:scale-105" />
              </div>
            </div>

            <Link
              href="/login"
              className="w-full py-3 px-4 rounded-xl bg-focusIndicator hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              <span>Sign In as School Admin</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* LEVEL 2: CLASSROOM TEACHER */}
          <div className="p-6 rounded-pot bg-surface border-2 border-brandPrimary/40 shadow-islandCard flex flex-col justify-between space-y-5 hover:border-brandPrimary transition-all group">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-tealSurface flex items-center justify-center text-2xl shadow-xs">
                  👨‍🏫
                </div>
                <span className="text-[11px] px-2.5 py-1 rounded-full bg-tealSurface text-brandPrimary font-bold border border-brandPrimary/30 uppercase">
                  Level 2: Teacher
                </span>
              </div>

              <div>
                <h3 className="text-xl font-bold text-primaryText group-hover:text-brandPrimary transition-colors">
                  Teacher Portal
                </h3>
              </div>

              {/* Character Mascot */}
              <div className="py-4 flex items-center justify-center">
                <PocketPotMascot size="lg" className="mx-auto drop-shadow-md transition-transform group-hover:scale-105" />
              </div>
            </div>

            <Link
              href="/login"
              className="w-full py-3 px-4 rounded-xl bg-brandPrimary hover:bg-teal-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              <span>Sign In as Teacher</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* LEVEL 3: PUPIL */}
          <div className="p-6 rounded-pot bg-surface border-2 border-positiveState/40 shadow-islandCard flex flex-col justify-between space-y-5 hover:border-positiveState transition-all group">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-amberSurface flex items-center justify-center text-2xl shadow-xs">
                  🎓
                </div>
                <span className="text-[11px] px-2.5 py-1 rounded-full bg-amberSurface text-brandSecondary font-bold border border-brandSecondary/30 uppercase">
                  Level 3: Pupil
                </span>
              </div>

              <div>
                <h3 className="text-xl font-bold text-primaryText group-hover:text-positiveState transition-colors">
                  Pupil Card Portal
                </h3>
              </div>

              {/* Character Mascot */}
              <div className="py-4 flex items-center justify-center">
                <TerracottaPotMascot size="md" className="mx-auto drop-shadow-md transition-transform group-hover:scale-105" />
              </div>
            </div>

            <Link
              href="/pupil/"
              className="w-full py-3 px-4 rounded-xl bg-positiveState hover:bg-green-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              <span>Enter Pupil Portal</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

        </div>
      </div>

      {/* Footer */}
      <footer className="text-center text-xs text-primaryText/50 pt-8 border-t border-borderMuted/60 mt-8">
        PocketPot Educational Savings &bull; Key Stage 2 Financial Mathematics &bull; Compliant with DfE Safeguarding Standards
      </footer>
    </main>
  );
}
