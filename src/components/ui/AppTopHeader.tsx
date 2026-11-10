"use client";

import React from "react";
import Link from "next/link";
import { PocketPotLogo } from "./PocketPotLogo";
import { Shield, GraduationCap } from "lucide-react";

export interface AppTopHeaderProps {
  role: "pupil" | "teacher" | "admin";
  userName: string;
  userSubtitle?: string;
  badgeNumber?: number;
  pupilId?: string;
  mainLinkHref?: string;
  notificationBell?: React.ReactNode;
  rightActions?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}

export const AppTopHeader: React.FC<AppTopHeaderProps> = ({
  role,
  userName,
  userSubtitle,
  badgeNumber,
  pupilId,
  mainLinkHref,
  notificationBell,
  rightActions,
  className = "",
  children,
}) => {
  // Determine default return-to link based on role
  const resolvedMainLink =
    mainLinkHref ||
    (role === "pupil"
      ? `/pupil/${pupilId || "pupil-1"}`
      : role === "teacher"
      ? "/teacher"
      : "/admin");

  const linkTooltip =
    role === "pupil"
      ? "PocketPot • Return to My Card"
      : role === "teacher"
      ? "PocketPot • Return to Classroom Portal"
      : "PocketPot • Return to School Overview";

  const roleLabel =
    role === "pupil"
      ? "Pupil View"
      : role === "teacher"
      ? "Teacher Level"
      : "Senior Leadership";

  return (
    <header
      role="banner"
      aria-label="PocketPot Top Header"
      className={`sticky top-0 z-30 w-full bg-brandPrimary text-white shadow-md border-b border-teal-800/40 transition-all ${className}`}
    >
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-3.5 flex flex-wrap items-center justify-between gap-3 sm:gap-4">
        {/* 1. LEFT: App Name & Official Vector Logo (Links to main page of view) */}
        <div className="flex items-center gap-3">
          <Link
            href={resolvedMainLink}
            className="flex items-center gap-2.5 rounded-2xl p-1 -ml-1 transition-all hover:opacity-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
            title={linkTooltip}
            aria-label={linkTooltip}
          >
            <PocketPotLogo variant="horizontal" size="md" inverted={true} />
          </Link>

          {/* View Badge Tag - hidden for pupil view */}
          {role !== "pupil" && (
            <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-white/15 text-white/95 border border-white/20">
              {roleLabel}
            </span>
          )}
        </div>

        {/* 2. RIGHT: Contextual Actions, Notification Bell, and Username */}
        <div className="flex items-center gap-2 sm:gap-3 ml-auto flex-wrap sm:flex-nowrap">
          {/* Contextual Action Slot (e.g. Create Pot, Class Switcher, Setup Wizard) */}
          {rightActions && (
            <div className="flex items-center gap-2">
              {rightActions}
            </div>
          )}

          {/* Notification Bell Slot */}
          {notificationBell && (
            <div className="flex-shrink-0">
              {notificationBell}
            </div>
          )}

          {/* User Badge / Pill */}
          <div
            className="flex items-center gap-2 sm:gap-2.5 bg-white/15 hover:bg-white/20 backdrop-blur-xs px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-2xl border border-white/25 text-white shadow-xs transition-colors"
            title={`Signed in as ${userName} (${roleLabel})`}
          >
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/20 border border-white/30 flex items-center justify-center text-xs font-black text-white flex-shrink-0">
              {role === "pupil" ? (
                <span>{userName.charAt(0).toUpperCase()}</span>
              ) : role === "teacher" ? (
                <GraduationCap className="w-4 h-4 text-white" />
              ) : (
                <Shield className="w-4 h-4 text-white" />
              )}
            </div>

            <div className="flex flex-col text-left leading-tight">
              <span className="text-xs sm:text-sm font-extrabold text-white truncate max-w-[120px] sm:max-w-[180px]">
                {userName}
              </span>
              <span className="text-[10px] text-teal-100/90 font-semibold truncate">
                {userSubtitle ||
                  (badgeNumber !== undefined
                    ? `User No. ${badgeNumber}`
                    : role === "pupil"
                    ? "Learner"
                    : role === "teacher"
                    ? "Educator"
                    : "Headteacher")}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* PERMANENT SECONDARY MENU UNDERNEATH TOP BANNER */}
      {children && (
        <div className="w-full bg-surface text-primaryText border-t border-teal-800/30 border-b border-borderMuted shadow-xs">
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 sm:py-2.5 flex flex-wrap items-center justify-between gap-3">
            {children}
          </div>
        </div>
      )}
    </header>
  );
};
