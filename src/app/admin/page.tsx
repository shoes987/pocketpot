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
import { KeyStageDashboard } from "@/components/ui/KeyStageDashboard";
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
} from "lucide-react";

export default function AdminPortalPage() {
  const [activeTab, setActiveTab] = useState<"class-setup" | "jobs-board" | "bonuses" | "faqs">("class-setup");
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
    setActiveClassId("overview");
  };

  const activeClass = classes.find((c) => c.classId === activeClassId) || null;
  const activePupils = activeClassId === "overview" ? pupils : pupils.filter((p) => p.classId === activeClass?.classId);
  const activePots = activeClassId === "overview" ? pots : pots.filter((p) => p.classId === activeClass?.classId);
  const totalSavings = activePots.reduce((sum, p) => sum + (p.currentAmountCents || 0), 0);

  return (
    <div className="min-h-screen bg-canvas text-primaryText font-lexend text-left flex flex-col">
      {/* 1. TRUE FULL-WIDTH STICKY TOP HEADER IN TEAL */}
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
            {activeClassId !== "overview" && (
              <button
                type="button"
                onClick={() => setActiveClassId("overview")}
                className="px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/20 text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to School Overview</span>
              </button>
            )}

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
      />

      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-6 lg:p-8 space-y-6 text-left">
        {/* 2. ADMIN CONTENT: WHOLE-SCHOOL HUB OR CLASSROOM INSPECTION */}
      {activeClassId === "overview" ? (
        /* WHOLE-SCHOOL GOVERNANCE HUB */
        <SchoolOverviewDashboard
          classes={classes}
          pupils={pupils}
          pots={pots}
          onSelectClassContext={(classId) => setActiveClassId(classId)}
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
      ) : (
        /* CLASSROOM INSPECTION VIEW (ADMIN HAS AUTHORITY TO INSPECT ANY CLASS) */
        <div className="space-y-6">
          <div className="p-4 rounded-2xl bg-indigoSurface/60 border border-focusIndicator/30 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-focusIndicator font-bold">
              <span>👑</span>
              <span>Admin Classroom Inspection: Viewing {activeClass?.className}</span>
            </div>
            <button
              type="button"
              onClick={() => setActiveClassId("overview")}
              className="px-3 py-1.5 rounded-lg bg-surface text-primaryText font-bold border border-borderMuted hover:bg-tealSurface transition-colors"
            >
              ← Back to School Governance
            </button>
          </div>

          <KeyStageDashboard
            totalSavingsCents={totalSavings}
            pupilCount={activePupils.length}
            pots={activePots}
            keyStageLabel={`${activeClass?.className || "Classroom"} Pot`}
          />

          <ClassSetup
            onOpenSetupWizard={() => setIsSetupWizardOpen(true)}
            activeClassId={activeClass?.classId}
            onSelectClassId={(id) => setActiveClassId(id)}
            isAdmin={true}
            onOpenAssignModal={(cls) => {
              setAssignTargetClass(cls);
              setIsAssignModalOpen(true);
            }}
            onPupilsChanged={refreshState}
          />
        </div>
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
