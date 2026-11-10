"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ClassSetup } from "@/components/teacher/ClassSetup";
import { TeacherJobsBoard } from "@/components/teacher/TeacherJobsBoard";
import { TeacherBonusesDashboard } from "@/components/teacher/TeacherBonusesDashboard";
import { TeacherMarketplace } from "@/components/teacher/TeacherMarketplace";
import { TeacherFaqs } from "@/components/teacher/TeacherFaqs";
import { TeacherNotificationBell } from "@/components/teacher/TeacherNotificationBell";
import { SetupWizardModal } from "@/components/teacher/SetupWizardModal";
import { AppTopHeader } from "@/components/ui/AppTopHeader";
import { CsvClasslistUploadModal } from "@/components/teacher/CsvClasslistUploadModal";
import {
  getSavedPupils,
  getSavedClasses,
  getSavedClassesForUser,
  getSavedPots,
  autoReconcileAllClassesWeeklyIncome,
  BALANCE_SYNC_EVENT,
} from "@/lib/services/class-service";
import {
  getCurrentTeacherUser,
  setCurrentTeacherUser,
  getTeachersOnly,
} from "@/lib/services/auth-service";
import { PupilDocument, ClassDocument, SavingsPotDocument, UserDocument } from "@/lib/firebase/types";
import { KeyStageDashboard } from "@/components/ui/KeyStageDashboard";
import {
  School,
  CheckCircle2,
  Briefcase,
  Sparkles,
  ShoppingBag,
  HelpCircle,
  Users,
  ChevronDown,
  Shield,
  Lock,
} from "lucide-react";

export default function TeacherPortalPage() {
  const [activeTab, setActiveTab] = useState<"class-setup" | "jobs-board" | "bonuses" | "marketplace" | "faqs">("class-setup");
  const [isSetupWizardOpen, setIsSetupWizardOpen] = useState(false);

  // Authenticated Teacher State (Strictly role === 'teacher')
  const [currentTeacher, setCurrentTeacher] = useState<UserDocument | null>(null);
  const [availableTeachers, setAvailableTeachers] = useState<UserDocument[]>([]);
  const [isTeacherSwitcherOpen, setIsTeacherSwitcherOpen] = useState(false);

  // Active Class Context (Restricted exclusively to classes assigned to this teacher)
  const [activeClassId, setActiveClassId] = useState<string>("");

  // CSV Modal (Scoped strictly to this teacher's active class)
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);

  const [pupils, setPupils] = useState<PupilDocument[]>([]);
  const [classes, setClasses] = useState<ClassDocument[]>([]);
  const [pots, setPots] = useState<SavingsPotDocument[]>([]);

  const refreshState = () => {
    const teacher = getCurrentTeacherUser();
    setCurrentTeacher(teacher);
    setAvailableTeachers(getTeachersOnly());

    const loadedPupils = getSavedPupils();
    const loadedClasses = getSavedClasses();
    const loadedPots = getSavedPots();

    setPupils(loadedPupils);
    setClasses(loadedClasses);
    setPots(loadedPots);

    // Lock context to this teacher's assigned classes only
    const allowed = getSavedClassesForUser(teacher);
    if (allowed.length > 0) {
      setActiveClassId((prev) => (allowed.some((c) => c.classId === prev) ? prev : allowed[0].classId));
    }
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

  const handleSwitchTeacher = (teacherId: string) => {
    const user = setCurrentTeacherUser(teacherId);
    setCurrentTeacher(user);
    setIsTeacherSwitcherOpen(false);
    const allowed = getSavedClassesForUser(user);
    if (allowed.length > 0) {
      setActiveClassId(allowed[0].classId);
    }
  };

  const handleWizardComplete = (newClass: ClassDocument) => {
    refreshState();
    setActiveClassId(newClass.classId);
    setActiveTab("class-setup");
  };

  // Strictly filter classes to those assigned to this educator
  const allowedClasses = currentTeacher ? getSavedClassesForUser(currentTeacher) : [];
  const activeClass = allowedClasses.find((c) => c.classId === activeClassId) || allowedClasses[0] || null;

  // Filter metrics strictly to active classroom
  const classPupils = activeClass ? pupils.filter((p) => p.classId === activeClass.classId) : [];
  const classPots = activeClass ? pots.filter((p) => p.classId === activeClass.classId) : [];
  const totalSavings = classPots.reduce((sum, p) => sum + (p.currentAmountCents || 0), 0);

  return (
    <div className="min-h-screen bg-canvas text-primaryText font-lexend text-left flex flex-col">
      {/* 1. TRUE FULL-WIDTH STICKY TOP HEADER IN TEAL WITH PERMANENT SUB-BAR */}
      <AppTopHeader
        role="teacher"
        userName={currentTeacher?.displayName || "Classroom Teacher"}
        userSubtitle="Classroom Educator"
        mainLinkHref="/teacher"
        notificationBell={
          <TeacherNotificationBell
            onNavigateToJobs={() => setActiveTab("jobs-board")}
            inverted={true}
          />
        }
        rightActions={
          <div className="flex items-center gap-2">
            {/* Multi-Class Tabs for this Teacher (if assigned multiple classrooms) */}
            {allowedClasses.length > 1 ? (
              <div className="flex items-center gap-1 bg-white/15 p-1 rounded-2xl border border-white/20">
                {allowedClasses.map((cls) => (
                  <button
                    type="button"
                    key={cls.classId}
                    onClick={() => setActiveClassId(cls.classId)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      activeClassId === cls.classId
                        ? "bg-white text-brandPrimary shadow-xs font-extrabold"
                        : "text-white/80 hover:text-white"
                    }`}
                  >
                    {cls.className}
                  </button>
                ))}
              </div>
            ) : allowedClasses.length === 1 ? (
              <div className="bg-white/15 px-3 py-1.5 rounded-xl border border-white/20 flex items-center gap-1.5 text-white">
                <School className="w-3.5 h-3.5 text-teal-100" />
                <span className="text-xs font-bold">{allowedClasses[0].className}</span>
              </div>
            ) : null}

            {/* Quick Setup Wizard Launch Button */}
            <button
              type="button"
              onClick={() => setIsSetupWizardOpen(true)}
              className="px-3.5 py-2 rounded-2xl bg-white/15 hover:bg-white/25 text-white border border-white/25 text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
              title="Open Classroom Setup Wizard"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span className="hidden sm:inline">Setup Wizard</span>
            </button>

            {/* Profile Switcher Trigger */}
            <button
              type="button"
              onClick={() => setIsTeacherSwitcherOpen(true)}
              className="p-1.5 rounded-xl bg-white/15 hover:bg-white/25 border border-white/20 text-white transition-all"
              title="Switch teacher profile"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
        }
      >
        {/* PERMANENT HORIZONTAL NAVIGATION MENU UNDERNEATH TOP BANNER */}
        <nav className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-0.5" aria-label="Teacher Dashboard Tabs">
          <button
            type="button"
            onClick={() => setActiveTab("class-setup")}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 ${
              activeTab === "class-setup"
                ? "bg-tealSurface text-brandPrimary border border-brandPrimary/30 shadow-xs font-extrabold"
                : "text-primaryText/70 hover:text-primaryText hover:bg-canvas border border-transparent"
            }`}
          >
            <School className="w-4 h-4" />
            <span>Class Setup</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("jobs-board")}
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
            onClick={() => setActiveTab("bonuses")}
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
            onClick={() => setActiveTab("marketplace")}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 ${
              activeTab === "marketplace"
                ? "bg-tealSurface text-brandPrimary border border-brandPrimary/30 shadow-xs font-extrabold"
                : "text-primaryText/70 hover:text-primaryText hover:bg-canvas border border-transparent"
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Marketplace</span>
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
            <span>FAQs</span>
          </button>
        </nav>

        {/* Right side context: Active Class & Join Code */}
        <div className="flex items-center gap-2 sm:gap-3 text-xs font-semibold shrink-0">
          <span className="text-primaryText/60 hidden md:inline">Active Class:</span>
          <span className="px-2.5 py-1 rounded-lg bg-tealSurface text-brandPrimary border border-brandPrimary/20 font-bold">
            {activeClass?.className || "Classroom"}
          </span>
          {activeClass?.classJoinCode && (
            <span className="px-2.5 py-1 rounded-lg bg-canvas text-primaryText/70 border border-borderMuted font-mono text-[11px]">
              Code: <strong className="text-brandPrimary">{activeClass.classJoinCode}</strong>
            </span>
          )}
        </div>
      </AppTopHeader>

      <main className="flex-1 w-full max-w-7xl p-4 md:p-6 lg:p-8 space-y-6 mx-auto font-lexend text-left">
        {/* TEACHER ACCOUNT SWITCHER MODAL (STRICTLY TEACHERS ONLY - NO ADMIN) */}
        {isTeacherSwitcherOpen && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 bg-primaryText/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          >
            <div className="bg-surface rounded-pot border border-borderMuted shadow-2xl p-5 sm:p-6 md:p-8 space-y-4 max-w-md w-full text-left">
              <div className="flex items-start justify-between border-b border-borderMuted/60 pb-3">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-brandPrimary">
                    Teacher Portal
                  </span>
                  <h3 className="text-xl font-bold text-primaryText">Switch Teacher Account</h3>
                  <p className="text-xs text-primaryText/60">
                    Select an educator profile. Teacher level accounts are scoped strictly to their assigned classes.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsTeacherSwitcherOpen(false)}
                  className="text-primaryText/40 hover:text-primaryText text-2xl font-bold p-1 leading-none"
                >
                  &times;
                </button>
              </div>

              <div className="space-y-2">
                {availableTeachers.map((teacher) => {
                  const isCurrent = teacher.userId === currentTeacher?.userId;
                  return (
                    <button
                      key={teacher.userId}
                      type="button"
                      onClick={() => handleSwitchTeacher(teacher.userId)}
                      className={`w-full p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all ${
                        isCurrent
                          ? "bg-tealSurface border-brandPrimary shadow-xs"
                          : "bg-canvas border-borderMuted hover:border-brandPrimary/40"
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-base">👨‍🏫</span>
                          <strong className="text-sm font-bold text-primaryText">{teacher.displayName}</strong>
                        </div>
                        <span className="text-[11px] text-primaryText/60 block mt-0.5">{teacher.email}</span>
                        <span className="text-[10px] font-semibold text-brandPrimary block mt-0.5">
                          Assigned: {teacher.assignedClassIds?.join(", ") || "No classes"}
                        </span>
                      </div>
                      {isCurrent && <CheckCircle2 className="w-5 h-5 text-brandPrimary shrink-0" />}
                    </button>
                  );
                })}
              </div>

              {/* Note on Admin Isolation */}
              <div className="p-3 rounded-xl bg-canvas border border-borderMuted text-xs text-primaryText/60 flex items-center gap-2">
                <Lock className="w-4 h-4 text-primaryText/40 flex-shrink-0" />
                <span>Admin governance is handled on a separate administrative level.</span>
              </div>
            </div>
          </div>
        )}

        {/* 2. TABBED CLASSROOM CONTENT */}
        {activeTab === "class-setup" ? (
          <>
            {/* KEY STAGE POT DASHBOARD */}
            <KeyStageDashboard
              totalSavingsCents={totalSavings > 0 ? totalSavings : 9741}
              pupilCount={classPupils.length > 0 ? classPupils.length : 10}
              pots={classPots}
              keyStageLabel={`${activeClass?.className || "Key Stage"} Pot`}
            />

            {/* CLASS SETUP & STUDENT ROSTER (TEACHER VIEW: STRICTLY THIS TEACHER'S ASSIGNED CLASSES) */}
            <ClassSetup
              classes={allowedClasses}
              onOpenSetupWizard={() => setIsSetupWizardOpen(true)}
              activeClassId={activeClass?.classId}
              onSelectClassId={(id) => setActiveClassId(id)}
              isAdmin={false}
              onOpenAssignModal={() => {}}
              onPupilsChanged={refreshState}
            />
          </>
        ) : activeTab === "jobs-board" ? (
          <TeacherJobsBoard classes={allowedClasses} activeClassId={activeClass?.classId} />
        ) : activeTab === "bonuses" ? (
          <TeacherBonusesDashboard classes={allowedClasses} activeClassId={activeClass?.classId} />
        ) : activeTab === "marketplace" ? (
          <TeacherMarketplace classId={activeClass?.classId} />
        ) : (
          <TeacherFaqs />
        )}

      {/* 3. MODALS (STRICTLY TEACHER SCOPED) */}
      <SetupWizardModal
        isOpen={isSetupWizardOpen}
        onClose={() => setIsSetupWizardOpen(false)}
        onComplete={handleWizardComplete}
      />

      <CsvClasslistUploadModal
        isOpen={isCsvModalOpen}
        activeClass={activeClass}
        classes={allowedClasses}
        isWholeSchool={false}
        onClose={() => setIsCsvModalOpen(false)}
        onPupilsEnrolled={() => refreshState()}
      />
      </main>
    </div>
  );
}
