"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { SchoolOverviewDashboard } from "@/components/teacher/SchoolOverviewDashboard";
import { ClassSetup } from "@/components/teacher/ClassSetup";
import { TeacherJobsBoard } from "@/components/teacher/TeacherJobsBoard";
import { TeacherBonusesDashboard } from "@/components/teacher/TeacherBonusesDashboard";
import { TeacherFaqs } from "@/components/teacher/TeacherFaqs";
import { TeacherNotificationBell } from "@/components/teacher/TeacherNotificationBell";
import { SetupWizardModal } from "@/components/teacher/SetupWizardModal";
import { TeacherAssignmentModal } from "@/components/teacher/TeacherAssignmentModal";
import { CsvClasslistUploadModal } from "@/components/teacher/CsvClasslistUploadModal";
import { InviteTeacherModal } from "@/components/teacher/InviteTeacherModal";
import { AppTopHeader } from "@/components/ui/AppTopHeader";
import {
  getSavedPupils,
  getSavedClasses,
  getSavedPots,
  autoReconcileAllClassesWeeklyIncome,
  BALANCE_SYNC_EVENT,
} from "@/lib/services/class-service";
import {
  getCurrentStaffUser,
  setCurrentStaffUser,
  getStaffUsers,
  isUserAdmin,
} from "@/lib/services/auth-service";
import { PupilDocument, ClassDocument, SavingsPotDocument, UserDocument } from "@/lib/firebase/types";
import {
  School,
  CheckCircle2,
  Briefcase,
  Sparkles,
  HelpCircle,
  Shield,
  Lock,
  ArrowLeft,
  ChevronDown,
  Users,
} from "lucide-react";

export default function AdminPortalPage() {
  const [activeTab, setActiveTab] = useState<"overview" | "class-setup" | "jobs-board" | "bonuses" | "faqs">("overview");
  const [activeClassId, setActiveClassId] = useState<string>("overview"); // "overview" or specific classId
  const [isSetupWizardOpen, setIsSetupWizardOpen] = useState(false);

  // Modals for Admin Actions
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignTargetClass, setAssignTargetClass] = useState<ClassDocument | null>(null);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [isWholeSchoolCsv, setIsWholeSchoolCsv] = useState(false);
  const [csvTargetClass, setCsvTargetClass] = useState<ClassDocument | null>(null);
  const [isInviteTeacherModalOpen, setIsInviteTeacherModalOpen] = useState(false);

  // Authenticated Admin User (Defaults to headteacher Mrs Henderson)
  const [currentAdmin, setCurrentAdmin] = useState<UserDocument | null>(null);

  const [pupils, setPupils] = useState<PupilDocument[]>([]);
  const [classes, setClasses] = useState<ClassDocument[]>([]);
  const [pots, setPots] = useState<SavingsPotDocument[]>([]);

  const refreshState = () => {
    const staff = getStaffUsers();
    const adminUser = staff.find((u) => u.role === "admin") || staff[0];
    setCurrentAdmin(adminUser);
    setCurrentStaffUser(adminUser.userId);

    const loadedPupils = getSavedPupils();
    const loadedClasses = getSavedClasses();
    const loadedPots = getSavedPots();

    setPupils(loadedPupils);
    setClasses(loadedClasses);
    setPots(loadedPots);
  };

  useEffect(() => {
    autoReconcileAllClassesWeeklyIncome();
    refreshState();

    const handleSync = () => refreshState();
    window.addEventListener("storage", handleSync);
    window.addEventListener(BALANCE_SYNC_EVENT, handleSync);

    return () => {
      window.removeEventListener("storage", handleSync);
      window.removeEventListener(BALANCE_SYNC_EVENT, handleSync);
    };
  }, []);

  const handleWizardComplete = (newClass: ClassDocument) => {
    refreshState();
    setActiveClassId(newClass.classId);
    setActiveTab("class-setup");
  };

  const handleClassCreated = (newClass: ClassDocument) => {
    setActiveClassId(newClass.classId);
    refreshState();
  };

  const activeClass = classes.find((c) => c.classId === activeClassId) || (classes.length > 0 ? classes[0] : null);
  const rawActivePupils = activeClassId === "overview" ? pupils : pupils.filter((p) => p.classId === activeClass?.classId);
  const activePupils = rawActivePupils.filter(
    (p, index, self) => index === self.findIndex((t) => t.pupilId === p.pupilId)
  );
  const activePots = activeClassId === "overview" ? pots : pots.filter((p) => p.classId === activeClass?.classId);
  const totalSavings = activePots.reduce((sum, p) => sum + (p.currentAmountCents || 0), 0);

  return (
    <div className="min-h-screen bg-canvas text-primaryText font-lexend text-left flex flex-col">
      {/* 1. TRUE FULL-WIDTH STICKY TOP HEADER IN TEAL WITH PERMANENT SUB-BAR */}
      <AppTopHeader
        role="admin"
        userName={currentAdmin?.displayName || "Headteacher / Admin"}
        userSubtitle="Senior Leadership Level"
        mainLinkHref="/admin"
        notificationBell={
          <TeacherNotificationBell
            onNavigateToJobs={() => setActiveTab("jobs-board")}
            inverted={true}
          />
        }
        rightActions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsSetupWizardOpen(true)}
              className="px-3.5 py-2 rounded-2xl bg-white/15 hover:bg-white/25 text-white border border-white/25 text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
              title="Open Classroom Setup Wizard"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>+ Classroom Setup</span>
            </button>
          </div>
        }
      >
        {/* PERMANENT HORIZONTAL NAVIGATION MENU UNDERNEATH TOP BANNER */}
        <nav className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-0.5" aria-label="Admin Dashboard Tabs">
          <button
            type="button"
            onClick={() => {
              setActiveTab("overview");
              setActiveClassId("overview");
            }}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 ${
              activeTab === "overview"
                ? "bg-tealSurface text-brandPrimary border border-brandPrimary/30 shadow-xs font-extrabold"
                : "text-primaryText/70 hover:text-primaryText hover:bg-canvas border border-transparent"
            }`}
          >
            <School className="w-4 h-4" />
            <span>School Overview</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("class-setup");
              if (activeClassId === "overview" && classes.length > 0) {
                setActiveClassId(classes[0].classId);
              }
            }}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 ${
              activeTab === "class-setup"
                ? "bg-tealSurface text-brandPrimary border border-brandPrimary/30 shadow-xs font-extrabold"
                : "text-primaryText/70 hover:text-primaryText hover:bg-canvas border border-transparent"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Class Setup and List</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("jobs-board");
              if (activeClassId === "overview" && classes.length > 0) {
                setActiveClassId(classes[0].classId);
              }
            }}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 ${
              activeTab === "jobs-board"
                ? "bg-tealSurface text-brandPrimary border border-brandPrimary/30 shadow-xs font-extrabold"
                : "text-primaryText/70 hover:text-primaryText hover:bg-canvas border border-transparent"
            }`}
          >
            <Briefcase className="w-4 h-4" />
            <span>Jobs Board</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("bonuses");
              if (activeClassId === "overview" && classes.length > 0) {
                setActiveClassId(classes[0].classId);
              }
            }}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 ${
              activeTab === "bonuses"
                ? "bg-tealSurface text-brandPrimary border border-brandPrimary/30 shadow-xs font-extrabold"
                : "text-primaryText/70 hover:text-primaryText hover:bg-canvas border border-transparent"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Bonuses</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("faqs")}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 ${
              activeTab === "faqs"
                ? "bg-tealSurface text-brandPrimary border border-brandPrimary/30 shadow-xs font-extrabold"
                : "text-primaryText/70 hover:text-primaryText hover:bg-canvas border border-transparent"
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>Safeguarding &amp; FAQs</span>
          </button>
        </nav>

        {/* Right side context: Class Scope Selector */}
        <div className="flex items-center gap-2 text-xs font-semibold shrink-0">
          <span className="text-primaryText/60 hidden sm:inline">Scope:</span>
          <select
            value={activeTab === "overview" ? "overview" : (activeClass?.classId || "overview")}
            onChange={(e) => {
              const val = e.target.value;
              if (val === "overview") {
                setActiveClassId("overview");
                setActiveTab("overview");
              } else {
                setActiveClassId(val);
                if (activeTab === "overview") {
                  setActiveTab("class-setup");
                }
              }
            }}
            aria-label="Select classroom scope"
            className="bg-canvas border border-borderMuted rounded-xl px-2.5 py-1.5 text-xs font-bold text-primaryText focus:outline-brandPrimary cursor-pointer shadow-2xs"
          >
            <option value="overview">🏛️ All Classes (Whole School)</option>
            {classes.map((cls) => (
              <option key={cls.classId} value={cls.classId}>
                🏫 {cls.className} ({cls.yearGroup || "KS2"})
              </option>
            ))}
          </select>
        </div>
      </AppTopHeader>

      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-6 lg:p-8 space-y-6 text-left">
        {activeTab === "overview" ? (
          /* WHOLE-SCHOOL GOVERNANCE HUB */
          <SchoolOverviewDashboard
            classes={classes}
            pupils={pupils}
            pots={pots}
            onSelectClassContext={(classId) => {
              setActiveClassId(classId);
              setActiveTab("class-setup");
            }}
            onOpenAssignModal={(cls) => {
              setAssignTargetClass(cls);
              setIsAssignModalOpen(true);
            }}
            onOpenCsvModal={(cls, isWhole) => {
              setCsvTargetClass(cls);
              setIsWholeSchoolCsv(Boolean(isWhole));
              setIsCsvModalOpen(true);
            }}
            onOpenWizard={() => setIsSetupWizardOpen(true)}
            onOpenInviteTeacherModal={() => setIsInviteTeacherModalOpen(true)}
          />
        ) : activeTab === "class-setup" ? (
          /* CLASSROOM INSPECTION & ROSTERS VIEW */
          <div className="space-y-6">
            <div className="bg-surface rounded-2xl border border-borderMuted shadow-sm p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-focusIndicator/15 border border-focusIndicator/25 flex items-center justify-center text-focusIndicator font-bold text-sm">
                  👑
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-primaryText">Class Setup and List</h3>
                  <p className="text-xs text-primaryText/60">Viewing and managing roster for <strong className="text-brandPrimary">{activeClass?.className || "Classroom"}</strong></p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("overview");
                  setActiveClassId("overview");
                }}
                className="px-3.5 py-2 rounded-xl bg-canvas hover:bg-tealSurface text-primaryText font-bold border border-borderMuted transition-colors flex items-center gap-1.5 self-start sm:self-auto"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-brandPrimary" />
                <span>Back to School Governance</span>
              </button>
            </div>

            <ClassSetup
              classes={classes}
              onOpenSetupWizard={() => setIsSetupWizardOpen(true)}
              activeClassId={activeClass?.classId}
              onSelectClassId={(id) => setActiveClassId(id)}
              isAdmin={true}
              onOpenAssignModal={(cls) => {
                setAssignTargetClass(cls);
                setIsAssignModalOpen(true);
              }}
              onPupilsChanged={refreshState}
              onClassCreated={handleClassCreated}
            />
          </div>
        ) : activeTab === "jobs-board" ? (
          <TeacherJobsBoard
            classes={classes}
            activeClassId={activeClass ? activeClass.classId : classes[0]?.classId}
          />
        ) : activeTab === "bonuses" ? (
          <TeacherBonusesDashboard
            classes={classes}
            activeClassId={activeClass ? activeClass.classId : classes[0]?.classId}
          />
        ) : (
          <TeacherFaqs />
        )}

      {/* 3. ADMIN MODALS */}
      <SetupWizardModal
        isOpen={isSetupWizardOpen}
        onClose={() => setIsSetupWizardOpen(false)}
        onComplete={handleWizardComplete}
      />

      <TeacherAssignmentModal
        isOpen={isAssignModalOpen}
        targetClass={assignTargetClass}
        onClose={() => {
          setIsAssignModalOpen(false);
          setAssignTargetClass(null);
        }}
        onAssignmentUpdated={() => refreshState()}
      />

      <CsvClasslistUploadModal
        isOpen={isCsvModalOpen}
        activeClass={csvTargetClass || classes[0]}
        classes={classes}
        isWholeSchool={isWholeSchoolCsv}
        onClose={() => {
          setIsCsvModalOpen(false);
          setCsvTargetClass(null);
          setIsWholeSchoolCsv(false);
        }}
        onPupilsEnrolled={() => refreshState()}
      />

      <InviteTeacherModal
        isOpen={isInviteTeacherModalOpen}
        onClose={() => setIsInviteTeacherModalOpen(false)}
        classes={classes}
        onTeacherInvited={() => refreshState()}
      />
      </main>
    </div>
  );
}
