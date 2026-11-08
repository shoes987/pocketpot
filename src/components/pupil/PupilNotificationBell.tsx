"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  getSavedNotifications,
  saveNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  NOTIFICATIONS_SYNC_EVENT,
} from "@/lib/services/jobs-service";
import { PupilNotificationDocument } from "@/lib/firebase/types";
import {
  Bell,
  CheckCheck,
  Award,
  Sparkles,
  Star,
  CheckCircle2,
  X,
  Briefcase,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

interface PupilNotificationBellProps {
  pupilId: string;
  onNavigateToJobs?: () => void;
  inverted?: boolean;
}

export const PupilNotificationBell: React.FC<PupilNotificationBellProps> = ({
  pupilId,
  onNavigateToJobs,
  inverted = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<PupilNotificationDocument[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const loadNotifications = () => {
    const list = getSavedNotifications(pupilId);

    const seededKey = `pocketpot_notifs_seeded_${pupilId || "default"}`;
    const alreadySeeded = typeof window !== "undefined" && localStorage.getItem(seededKey);

    // If notifications haven't been seeded yet for this pupil, seed them ONCE and persist to storage
    if (list.length === 0 && !alreadySeeded) {
      const starterNotifs: PupilNotificationDocument[] = [
        {
          notificationId: `notif-${pupilId || "starter"}-hired`,
          pupilId: pupilId || "pupil-1",
          classId: "class-year-4",
          title: "You Got the Job! 🎉",
          message:
            "Congratulations! You've been hired as the Classroom Librarian! Your weekly wage of £1.50 will be automatically added to your debit card every Monday alongside your basic income.",
          type: "job_hired",
          read: false,
          createdAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
          jobTitle: "Classroom Librarian",
        },
        {
          notificationId: `notif-${pupilId || "starter"}-encouraged`,
          pupilId: pupilId || "pupil-1",
          classId: "class-year-4",
          title: "Thank You for Applying! 🌟",
          message:
            "Thank you for putting yourself forward for Eco Recycling Monitor! A classmate was chosen for this term's rotation, but your teacher was so impressed by your positive qualities. New roles open regularly!",
          type: "job_encouragement_rejection",
          read: false,
          createdAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
          jobTitle: "Eco Recycling Monitor",
        },
      ];

      if (typeof window !== "undefined") {
        localStorage.setItem(seededKey, "true");
      }
      const existing = getSavedNotifications();
      saveNotifications([
        ...starterNotifs,
        ...existing.filter(
          (e) =>
            e.notificationId !== starterNotifs[0].notificationId &&
            e.notificationId !== starterNotifs[1].notificationId
        ),
      ]);
      setNotifications(starterNotifs);
      return;
    }

    setNotifications(list);
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 4000);
    const handleSync = () => loadNotifications();
    window.addEventListener("storage", handleSync);
    window.addEventListener(NOTIFICATIONS_SYNC_EVENT, handleSync);

    return () => {
      clearInterval(interval);
      window.removeEventListener("storage", handleSync);
      window.removeEventListener(NOTIFICATIONS_SYNC_EVENT, handleSync);
    };
  }, [pupilId]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAllRead = () => {
    markAllNotificationsRead(pupilId);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleDismiss = (e: React.MouseEvent, notifId: string) => {
    e.stopPropagation();
    markNotificationRead(notifId);
    setNotifications((prev) => prev.map((n) => (n.notificationId === notifId ? { ...n, read: true } : n)));
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Pupil Notifications, ${unreadCount} unread`}
        className={`relative p-2.5 rounded-2xl transition-all shadow-xs focus-visible:outline focus-visible:outline-2 flex items-center justify-center ${
          inverted
            ? "bg-white/15 hover:bg-white/25 border border-white/25 text-white focus-visible:outline-white"
            : "bg-canvas hover:bg-tealSurface border border-borderMuted text-primaryText focus-visible:outline-brandPrimary"
        }`}
      >
        <Bell className={`w-5 h-5 ${inverted ? "text-white" : "text-primaryText/80"}`} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 rounded-full bg-brandSecondary text-white text-[11px] font-extrabold flex items-center justify-center shadow-xs animate-bounce">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Drawer / Popover */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] max-w-sm sm:w-96 bg-surface rounded-3xl border border-borderMuted shadow-2xl z-50 overflow-hidden text-left animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="p-4 border-b border-borderMuted/70 bg-canvas/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base">🔔</span>
              <h3 className="text-sm font-bold text-primaryText">My Notifications</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-amberSurface text-brandSecondary text-[11px] font-bold border border-brandSecondary/25">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-xs text-brandPrimary hover:text-teal-800 font-bold flex items-center gap-1 transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="p-3 max-h-[380px] overflow-y-auto space-y-2.5 divide-y-0">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-primaryText/60 space-y-1">
                <span className="text-2xl block">📬</span>
                <p className="text-xs font-semibold">No notifications yet!</p>
                <p className="text-[11px] text-primaryText/50">
                  When you apply for classroom jobs, updates will appear right here.
                </p>
              </div>
            ) : (
              notifications.map((notif) => {
                const isHired = notif.type === "job_hired";
                const isRejection = notif.type === "job_encouragement_rejection";
                const isRef = notif.type === "reference_received";

                // Green for hired/successful; Amber for role given to someone else; Teal for general
                const cardStyle = isHired
                  ? "bg-greenSurface border-positiveState/40 text-primaryText"
                  : isRejection
                  ? "bg-amberSurface border-brandSecondary/40 text-primaryText"
                  : isRef
                  ? "bg-indigoSurface border-focusIndicator/30 text-primaryText"
                  : "bg-tealSurface/50 border-brandPrimary/30 text-primaryText";

                const badgePill = isHired ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/90 text-positiveState border border-positiveState/30 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Application Approved</span>
                  </span>
                ) : isRejection ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/90 text-brandSecondary border border-brandSecondary/30 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    <span>Role Given to Classmate</span>
                  </span>
                ) : isRef ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/90 text-focusIndicator border border-focusIndicator/30 flex items-center gap-1">
                    <Star className="w-3 h-3" />
                    <span>Reference Added</span>
                  </span>
                ) : null;

                return (
                  <div
                    key={notif.notificationId}
                    onClick={(e) => {
                      if (!notif.read) {
                        handleDismiss(e, notif.notificationId);
                      }
                    }}
                    className={`p-3.5 rounded-2xl border transition-all text-left relative ${
                      !notif.read ? "cursor-pointer" : ""
                    } ${cardStyle} ${
                      !notif.read ? "shadow-sm ring-1 ring-inset ring-brandPrimary/20" : "opacity-90"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5 min-w-0">
                        {/* Icon Badge */}
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 shadow-xs ${
                            isHired
                              ? "bg-white text-positiveState"
                              : isRejection
                              ? "bg-white text-brandSecondary"
                              : "bg-white text-brandPrimary"
                          }`}
                        >
                          {isHired ? (
                            <Award className="w-4 h-4" />
                          ) : isRejection ? (
                            <Star className="w-4 h-4" />
                          ) : (
                            <Sparkles className="w-4 h-4" />
                          )}
                        </div>

                        {/* Text Content */}
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center flex-wrap gap-1.5">
                            <h4 className="text-xs font-bold text-primaryText leading-snug">
                              {notif.title}
                            </h4>
                            {badgePill}
                          </div>
                          <p className="text-xs text-primaryText/85 leading-relaxed font-medium">
                            {notif.message}
                          </p>
                        </div>
                      </div>

                      {/* Dismiss Button */}
                      {!notif.read && (
                        <button
                          type="button"
                          onClick={(e) => handleDismiss(e, notif.notificationId)}
                          className="p-1 rounded-lg text-primaryText/40 hover:text-primaryText hover:bg-white/50 transition-colors flex-shrink-0"
                          title="Dismiss notification"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Navigation Link */}
          <div className="p-3 border-t border-borderMuted/70 bg-canvas/40 text-center">
            {onNavigateToJobs ? (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onNavigateToJobs();
                }}
                className="w-full py-2 px-3 rounded-xl bg-surface hover:bg-tealSurface text-brandPrimary border border-borderMuted text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs"
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span>Open Jobs Board</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            ) : (
              <Link
                href={`/pupil/${pupilId}/jobs`}
                onClick={() => setIsOpen(false)}
                className="w-full py-2 px-3 rounded-xl bg-surface hover:bg-tealSurface text-brandPrimary border border-borderMuted text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs"
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span>Open Jobs Board</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
