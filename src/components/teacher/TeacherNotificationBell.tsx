"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  getSavedNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/lib/services/jobs-service";
import { PupilNotificationDocument } from "@/lib/firebase/types";
import { Bell, CheckCheck, Clock, Briefcase, Award, X } from "lucide-react";

interface TeacherNotificationBellProps {
  onNavigateToJobs?: () => void;
  inverted?: boolean;
}

export const TeacherNotificationBell: React.FC<TeacherNotificationBellProps> = ({
  onNavigateToJobs,
  inverted = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<PupilNotificationDocument[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const loadNotifications = () => {
    const list = getSavedNotifications(undefined, true);
    setNotifications(list);
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 5000);
    return () => clearInterval(interval);
  }, []);

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
    markAllNotificationsRead(undefined, true);
    loadNotifications();
  };

  const handleItemClick = (notif: PupilNotificationDocument) => {
    markNotificationRead(notif.notificationId);
    loadNotifications();
    if (onNavigateToJobs) {
      setIsOpen(false);
      onNavigateToJobs();
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Teacher Notifications, ${unreadCount} unread`}
        className={`relative p-2.5 rounded-2xl transition-colors focus-visible:outline focus-visible:outline-2 ${
          inverted
            ? "bg-white/15 hover:bg-white/25 border border-white/25 text-white focus-visible:outline-white"
            : "bg-canvas hover:bg-surface border border-borderMuted text-primaryText focus-visible:outline-focusIndicator"
        }`}
      >
        <Bell className={`w-5 h-5 ${inverted ? "text-white" : "text-primaryText"}`} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-brandSecondary text-white text-[11px] font-bold flex items-center justify-center shadow-xs animate-bounce">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Drawer */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-surface rounded-2xl border border-borderMuted shadow-xl z-50 overflow-hidden text-left animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="p-4 border-b border-borderMuted/70 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-primaryText">Notifications</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-amberSurface text-brandSecondary text-xs font-bold border border-brandSecondary/25">
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
                <span>Mark read</span>
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-borderMuted/50">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-primaryText/55 space-y-1">
                <p className="text-xs font-semibold">No notifications right now.</p>
                <p className="text-[11px]">Applications and job term reminders will appear here.</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.notificationId}
                  onClick={() => handleItemClick(notif)}
                  className={`p-3.5 hover:bg-canvas transition-colors cursor-pointer text-left space-y-1 ${
                    !notif.read ? "bg-tealSurface/30" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5 text-brandPrimary flex-shrink-0" />
                      <span className="text-xs font-bold text-primaryText">
                        {notif.title}
                      </span>
                    </div>
                    {!notif.read && (
                      <span className="w-2 h-2 rounded-full bg-brandSecondary flex-shrink-0 mt-1" />
                    )}
                  </div>
                  <p className="text-xs text-primaryText/80 leading-relaxed font-medium">
                    {notif.message}
                  </p>
                  <span className="text-[10px] text-primaryText/50 block font-mono">
                    {new Date(notif.createdAt).toLocaleTimeString("en-GB", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <div className="p-2.5 bg-canvas border-t border-borderMuted/60 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  if (onNavigateToJobs) onNavigateToJobs();
                }}
                className="text-xs font-bold text-brandPrimary hover:text-teal-800 transition-colors"
              >
                View Jobs Board &rarr;
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
