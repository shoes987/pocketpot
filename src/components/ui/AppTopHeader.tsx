"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { safeLocalStorageRemoveItem } from "@/lib/services/storage-helper";
import { PocketPotLogo } from "./PocketPotLogo";
import { Shield, GraduationCap, ChevronDown, LogOut } from "lucide-react";

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
  onLogout?: () => void | Promise<void>;
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
  onLogout,
}) => {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown menu when clicking outside or pressing Escape
  useEffect(() => {
    if (!isMenuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMenuOpen]);

  // Handle portal-specific logout flow
  const handleLogout = async () => {
    setIsMenuOpen(false);
    setIsLoggingOut(true);

    try {
      if (onLogout) {
        await onLogout();
      }

      if (role === "pupil") {
        // Clear pupil zero-PII session keys
        safeLocalStorageRemoveItem("pocketpot_active_pupil_id");
        safeLocalStorageRemoveItem("pocketpot_active_pupil_codename");
        safeLocalStorageRemoveItem("pocketpot_active_pupil_badge");
        safeLocalStorageRemoveItem("pocketpot_active_pupil_class_id");
        router.push("/pupil");
      } else {
        // Adult portal (teacher or admin)
        safeLocalStorageRemoveItem("pocketpot_current_staff_id_v1");
        safeLocalStorageRemoveItem("pocketpot_current_teacher_id_v1");

        try {
          if (auth) {
            await signOut(auth);
          }
        } catch (authErr) {
          console.warn("Firebase sign out warning:", authErr);
        }

        router.push("/login");
      }
    } catch (err) {
      console.error("Logout encounter:", err);
      // Fallback destination redirect
      if (role === "pupil") {
        router.push("/pupil");
      } else {
        router.push("/login");
      }
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Determine default return-to link based on role
  const resolvedMainLink =
    mainLinkHref ||
    (role === "pupil"
      ? (pupilId && pupilId !== "pupil-1" && pupilId !== "anonymous"
          ? `/pupil/card/?pupilId=${encodeURIComponent(pupilId)}`
          : "/pupil/card/")
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

          {/* View Badge Tag - hidden for pupil and admin view */}
          {role !== "pupil" && role !== "admin" && (
            <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-white/15 text-white/95 border border-white/20">
              {roleLabel}
            </span>
          )}
        </div>

        {/* 2. RIGHT: Contextual Actions, Notification Bell, and Username with Logout Menu */}
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

          {/* User Badge / Pill with Interactive Logout Dropdown */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setIsMenuOpen((prev) => !prev)}
              aria-haspopup="menu"
              aria-expanded={isMenuOpen}
              aria-label={`User menu for ${userName}`}
              className={`flex items-center gap-2 sm:gap-2.5 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-2xl border text-white shadow-xs transition-all cursor-pointer select-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-white ${
                isMenuOpen
                  ? "bg-white/25 border-white/40 ring-2 ring-white/30"
                  : "bg-white/15 hover:bg-white/25 border-white/25"
              }`}
              title={`Signed in as ${userName} (${roleLabel}) - Click to open menu`}
            >
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/20 border border-white/30 flex items-center justify-center text-xs font-black text-white flex-shrink-0 transition-transform group-hover:scale-105">
                {role === "pupil" ? (
                  <span>{userName.charAt(0).toUpperCase()}</span>
                ) : role === "teacher" ? (
                  <GraduationCap className="w-4 h-4 text-white" />
                ) : (
                  <Shield className="w-4 h-4 text-white" />
                )}
              </div>

              <div className="flex flex-col text-left leading-tight">
                <span className="text-xs sm:text-sm font-extrabold text-white truncate max-w-[110px] sm:max-w-[170px]">
                  {userName}
                </span>
                {userSubtitle ? (
                  <span className="text-[10px] text-teal-100/90 font-semibold truncate max-w-[110px] sm:max-w-[170px]">
                    {userSubtitle}
                  </span>
                ) : role !== "admin" ? (
                  <span className="text-[10px] text-teal-100/90 font-semibold truncate">
                    {badgeNumber !== undefined
                      ? `User No. ${badgeNumber}`
                      : role === "pupil"
                      ? "Learner"
                      : "Educator"}
                  </span>
                ) : null}
              </div>

              <ChevronDown
                className={`w-3.5 h-3.5 text-teal-100 transition-transform duration-200 ml-0.5 ${
                  isMenuOpen ? "rotate-180 text-white" : ""
                }`}
                aria-hidden="true"
              />
            </button>

            {/* Floating Dropdown Menu */}
            {isMenuOpen && (
              <div
                role="menu"
                aria-orientation="vertical"
                className="absolute right-0 mt-2 w-64 sm:w-72 bg-surface text-primaryText rounded-2xl shadow-2xl border border-borderMuted p-2.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
              >
                {/* User Identity Header */}
                <div className="px-3 py-2.5 rounded-xl bg-canvas/70 border border-borderMuted/60 mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-brandPrimary/15 text-brandPrimary border border-brandPrimary/30 flex items-center justify-center text-xs font-black flex-shrink-0">
                      {role === "pupil" ? (
                        <span>{userName.charAt(0).toUpperCase()}</span>
                      ) : role === "teacher" ? (
                        <GraduationCap className="w-4 h-4" />
                      ) : (
                        <Shield className="w-4 h-4" />
                      )}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs sm:text-sm font-extrabold text-primaryText truncate">
                        {userName}
                      </span>
                      <span className="text-[11px] text-primaryText/60 font-medium truncate">
                        {userSubtitle ||
                          (badgeNumber !== undefined
                            ? `Desk Badge #${badgeNumber}`
                            : roleLabel)}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2.5 pt-2 border-t border-borderMuted/50 flex items-center justify-between text-[10px] font-semibold text-primaryText/60">
                    <span>Portal Status:</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold uppercase tracking-wider text-[9px] border border-emerald-200">
                      Active
                    </span>
                  </div>
                </div>

                <div className="my-1 border-t border-borderMuted/60" />

                {/* Log Out Action Item */}
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors text-left cursor-pointer group disabled:opacity-50"
                >
                  <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center text-red-600 group-hover:bg-red-200 transition-colors flex-shrink-0">
                    <LogOut className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="leading-tight font-extrabold">
                      {isLoggingOut ? "Logging out..." : "Log Out"}
                    </span>
                    <span className="text-[10px] font-normal text-red-500/80 leading-tight">
                      {role === "pupil"
                        ? "Return to pupil sign in"
                        : "Return to educator login"}
                    </span>
                  </div>
                </button>
              </div>
            )}
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
