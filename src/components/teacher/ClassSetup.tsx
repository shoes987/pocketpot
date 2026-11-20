"use client";

import React, { useState, useEffect } from "react";
import {
  ClassDocument,
  PupilDocument,
  SavingsPotDocument,
} from "@/lib/firebase/types";
import {
  getSavedClasses,
  getSavedPupils,
  getSavedPots,
  createClassWithQuickAdd,
  deletePupil,
  deleteClass,
  updateClassSettings,
  autoReconcileAllClassesWeeklyIncome,
  getNextScheduledPayoutTime,
  getSavedClassesForUser,
  resetPupilPin,
  BALANCE_SYNC_EVENT,
} from "@/lib/services/class-service";
import { getCurrentTeacherUser } from "@/lib/services/auth-service";
import { formatCurrency, getPupilDisplayName } from "@/lib/firebase/zero-pii";
import {
  subscribeToClasses,
  subscribeToPupils,
  subscribeToPots,
} from "@/lib/firebase/firestore-service";
import {
  getActiveJobForPupil,
  getCompletedJobsForPupil,
} from "@/lib/services/jobs-service";
import { PupilInspectModal } from "./PupilInspectModal";
import { PrintPupilCardsModal } from "./PrintPupilCardsModal";
import { PrintClassJoinCodeModal } from "./PrintClassJoinCodeModal";
import { ResetPinModal } from "./ResetPinModal";
import {
  PlusCircle,
  Plus,
  Trash2,
  Eye,
  CheckCircle2,
  Check,
  ExternalLink,
  School,
  ShieldCheck,
  ShieldAlert,
  Copy,
  AlertCircle,
  UserCheck,
  VenetianMask,
  Coins,
  Clock,
  Calendar,
  Sparkles,
  Sliders,
  Briefcase,
  ArrowRight,
  UserPlus,
  FileSpreadsheet,
  Users,
  Printer,
  KeyRound,
  CreditCard,
  ChevronDown,
  X,
  Pencil,
} from "lucide-react";
import { SinglePupilAddModal } from "./SinglePupilAddModal";
import { CsvClasslistUploadModal } from "./CsvClasslistUploadModal";

interface ClassSetupProps {
  classes?: ClassDocument[];
  pupils?: PupilDocument[];
  pots?: SavingsPotDocument[];
  onOpenSetupWizard?: () => void;
  activeClassId?: string;
  onSelectClassId?: (classId: string) => void;
  isAdmin?: boolean;
  onOpenAssignModal?: (cls: ClassDocument) => void;
  onPupilsChanged?: () => void;
  onClassesChanged?: () => void;
  onClassCreated?: (newClass: ClassDocument) => void;
}

export const ClassSetup: React.FC<ClassSetupProps> = ({
  classes: propsClasses,
  pupils: propsPupils,
  pots: propsPots,
  onOpenSetupWizard,
  activeClassId,
  onSelectClassId,
  isAdmin = false,
  onOpenAssignModal,
  onPupilsChanged,
  onClassesChanged,
  onClassCreated,
}) => {
  const [isMounted, setIsMounted] = useState(false);
  const [classes, setClasses] = useState<ClassDocument[]>(propsClasses || []);
  const [pupils, setPupils] = useState<PupilDocument[]>(propsPupils || []);
  const [pots, setPots] = useState<SavingsPotDocument[]>(propsPots || []);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [isSingleAddOpen, setIsSingleAddOpen] = useState(false);
  const [isCsvUploadOpen, setIsCsvUploadOpen] = useState(false);
  const [isCreateClassModalOpen, setIsCreateClassModalOpen] = useState(false);
  const [isEnrollSuccessModalOpen, setIsEnrollSuccessModalOpen] = useState(false);
  const [enrolledSuccessCount, setEnrolledSuccessCount] = useState<number>(0);

  // Print Debit Cards Modal state (Requirement 2 & 3)
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printTargetPupils, setPrintTargetPupils] = useState<PupilDocument[]>([]);
  const [printModalTitle, setPrintModalTitle] = useState<string | undefined>(undefined);

  // Print Class Join Code Poster Modal state
  const [isPrintJoinCodeModalOpen, setIsPrintJoinCodeModalOpen] = useState(false);

  // Reset PIN Modal state (Requirement 3)
  const [resettingPupil, setResettingPupil] = useState<PupilDocument | null>(null);

  // Sync when propsClasses updates from parent teacher page
  useEffect(() => {
    if (propsClasses !== undefined) {
      setClasses(propsClasses);
      if (propsClasses.length === 0) {
        setSelectedClassId("");
      } else if (!propsClasses.some((c) => c.classId === selectedClassId)) {
        setSelectedClassId(
          activeClassId && propsClasses.some((c) => c.classId === activeClassId)
            ? activeClassId
            : propsClasses[0].classId
        );
      }
    }
  }, [propsClasses, activeClassId, selectedClassId]);

  useEffect(() => {
    if (propsPupils !== undefined) {
      setPupils(propsPupils);
    }
  }, [propsPupils]);

  useEffect(() => {
    if (propsPots !== undefined) {
      setPots(propsPots);
    }
  }, [propsPots]);

  // Form states - Start blank without pre-populated class or student names
  const [classNameInput, setClassNameInput] = useState<string>("");
  const [yearGroup, setYearGroup] = useState<
    "Year 3" | "Year 4" | "Year 5" | "Year 6"
  >("Year 4");

  // Separate boxes for each child's name: Begin with 5 clean empty boxes
  const [pupilNameBoxes, setPupilNameBoxes] = useState<string[]>([
    "",
    "",
    "",
    "",
    "",
  ]);

  // Naming option: "anonymize" (Zero-PII codename only) vs "first_name" (stored locally only)
  const [namingOption, setNamingOption] = useState<"anonymize" | "first_name">(
    "anonymize"
  );

  const [formError, setFormError] = useState<string | null>(null);
  const [showCreationSuccess, setShowCreationSuccess] = useState<boolean>(false);
  const [copyCodeSuccess, setCopyCodeSuccess] = useState<boolean>(false);

  // Inspection modal state
  const [inspectingPupil, setInspectingPupil] = useState<PupilDocument | null>(
    null
  );

  // Deletion state
  const [pupilToDelete, setPupilToDelete] = useState<PupilDocument | null>(null);
  const [isDeletingClass, setIsDeletingClass] = useState<boolean>(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // 1. Account Opening Balance (applied across all new pupil accounts)
  const [openingBalanceInput, setOpeningBalanceInput] = useState<string>("5.00");

  // 2. Minimum Basic Income & Weekly Payout Day
  const [weeklyIncomeInput, setWeeklyIncomeInput] = useState<string>("2.00");
  const [payoutDayInput, setPayoutDayInput] = useState<
    "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday"
  >("Monday");

  // Policy adjustment modal state for active class
  const [isAdjustingIncomeModalOpen, setIsAdjustingIncomeModalOpen] = useState(false);
  const [editClassNameInput, setEditClassNameInput] = useState<string>("");
  const [editYearGroupInput, setEditYearGroupInput] = useState<"Year 3" | "Year 4" | "Year 5" | "Year 6">("Year 4");
  const [editWeeklyAmount, setEditWeeklyAmount] = useState<string>("2.00");
  const [editPayoutDay, setEditPayoutDay] = useState<
    "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday"
  >("Monday");
  const [editAnonymizeOption, setEditAnonymizeOption] = useState<boolean>(true);

  // Initialize data on mount & run real-world automated income reconciliation
  useEffect(() => {
    setIsMounted(true);
    // Automated check: credits pupils idempotently if payout day has occurred
    autoReconcileAllClassesWeeklyIncome();

    const refreshData = () => {
      // Requirement 1: In teacher view, strictly scope to classes assigned to this educator. In admin view, show all classes.
      const currentTeacher = getCurrentTeacherUser();
      const loadedClasses =
        propsClasses !== undefined
          ? propsClasses
          : isAdmin
          ? getSavedClasses()
          : getSavedClassesForUser(currentTeacher);

      setClasses(loadedClasses);

      if (propsPupils === undefined) {
        setPupils(getSavedPupils());
      }
      if (propsPots === undefined) {
        setPots(getSavedPots());
      }

      if (loadedClasses.length > 0) {
        setSelectedClassId((prev) => {
          if (prev && loadedClasses.some((c) => c.classId === prev)) {
            return prev;
          }
          if (activeClassId && loadedClasses.some((c) => c.classId === activeClassId)) {
            return activeClassId;
          }
          return loadedClasses[0].classId;
        });
      } else {
        setSelectedClassId("");
      }
    };

    refreshData();

    // Real-time Firestore listeners only if parent does not manage state
    let unsubClasses = () => {};
    if (propsClasses === undefined) {
      unsubClasses = subscribeToClasses((liveClasses) => {
        const currentTeacher = getCurrentTeacherUser();
        const filtered = isAdmin
          ? liveClasses
          : liveClasses.filter((c) => {
              if (currentTeacher?.role === "admin") return true;
              return (
                c.teacherId === currentTeacher?.userId ||
                c.leadTeacherId === currentTeacher?.userId ||
                c.assignedTeacherIds?.includes(currentTeacher?.userId || "") ||
                currentTeacher?.assignedClassIds?.includes(c.classId)
              );
            });
        setClasses(filtered);
        if (filtered.length === 0) {
          setSelectedClassId("");
        } else if (!filtered.some((c) => c.classId === selectedClassId)) {
          setSelectedClassId(filtered[0].classId);
        }
      });
    }

    let unsubPupils = () => {};
    if (propsPupils === undefined) {
      unsubPupils = subscribeToPupils((livePupils) => {
        setPupils(livePupils);
      });
    }

    let unsubPots = () => {};
    if (propsPots === undefined) {
      unsubPots = subscribeToPots((livePots) => {
        setPots(livePots);
      });
    }

    const handleSync = () => {
      refreshData();
    };

    window.addEventListener("storage", handleSync);
    window.addEventListener(BALANCE_SYNC_EVENT, handleSync);

    return () => {
      unsubClasses();
      unsubPupils();
      unsubPots();
      window.removeEventListener("storage", handleSync);
      window.removeEventListener(BALANCE_SYNC_EVENT, handleSync);
    };
  }, [isAdmin, activeClassId, propsClasses !== undefined, propsPupils !== undefined, propsPots !== undefined]);

  useEffect(() => {
    if (activeClassId && classes.some((c) => c.classId === activeClassId)) {
      setSelectedClassId(activeClassId);
    }
  }, [activeClassId, classes]);

  // Validation: Check if class name is duplicated
  const isDuplicateName = classes.some(
    (c) =>
      c.className.trim().toLowerCase() === classNameInput.trim().toLowerCase()
  );

  // Box management handlers
  const handleBoxChange = (index: number, value: string) => {
    setPupilNameBoxes((prev) => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
    if (value.trim().length > 0 && namingOption === "anonymize") {
      setNamingOption("first_name");
    }
  };

  const handleAddMoreBoxes = () => {
    setPupilNameBoxes((prev) => [...prev, ""]);
  };

  const handleRemoveBox = (index: number) => {
    if (pupilNameBoxes.length <= 1) return;
    setPupilNameBoxes((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleCreateClass = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedName = classNameInput.trim();
    if (!trimmedName) {
      setFormError("Please enter a class name.");
      return;
    }

    if (isDuplicateName) {
      setFormError(
        `A class named "${trimmedName}" already exists. Please choose a unique name.`
      );
      return;
    }

    const openingCents = Math.round((parseFloat(openingBalanceInput) || 5) * 100);
    const weeklyCents = Math.round((parseFloat(weeklyIncomeInput) || 2) * 100);

    const currentTeacher = getCurrentTeacherUser();
    const enteredNames = pupilNameBoxes.map((n) => n.trim()).filter((n) => n.length > 0);

    try {
      const { newClass, pupils: newPupils, pots: newPots } =
        createClassWithQuickAdd({
          className: trimmedName,
          yearGroup,
          studentNames: pupilNameBoxes,
          anonymizeNames: namingOption === "anonymize",
          initialOpeningBalanceCents: openingCents,
          weeklyBasicIncomeCents: weeklyCents,
          payoutDay: payoutDayInput,
          leadTeacherId: currentTeacher?.userId,
          assignedTeacherIds: currentTeacher ? [currentTeacher.userId] : undefined,
        });

      setClasses((prev) => [newClass, ...prev.filter((c) => c.classId !== newClass.classId)]);
      setPupils((prev) => {
        const newIds = new Set(newPupils.map((p) => p.pupilId));
        return [...newPupils, ...prev.filter((p) => !newIds.has(p.pupilId))];
      });
      setPots((prev) => {
        const newIds = new Set(newPots.map((p) => p.potId));
        return [...newPots, ...prev.filter((p) => !newIds.has(p.potId))];
      });
      setSelectedClassId(newClass.classId);
      if (onSelectClassId) onSelectClassId(newClass.classId);
      if (onClassCreated) onClassCreated(newClass);
      setShowCreationSuccess(true);
      setTimeout(() => setShowCreationSuccess(false), 4000);

      // Reset pupil boxes to 5 fresh slots for next class
      setPupilNameBoxes(["", "", "", "", ""]);
      setClassNameInput("");
      setIsCreateClassModalOpen(false);
      setActionSuccessMessage(`Class "${newClass.className}" created with ${newPupils.length} pupils!`);
      setTimeout(() => setActionSuccessMessage(null), 5000);
      onPupilsChanged?.();
    } catch (err: unknown) {
      setFormError(
        err instanceof Error ? err.message : "Failed to create class."
      );
    }
  };

  const activeClass =
    classes.find((c) => c.classId === selectedClassId) || classes[0];

  const rawClassPupils = pupils.filter((p) => p.classId === activeClass?.classId);
  const classPupils = rawClassPupils.filter(
    (p, index, self) => index === self.findIndex((t) => t.pupilId === p.pupilId)
  );

  const handleCopyCode = () => {
    if (!activeClass?.classJoinCode) return;
    navigator.clipboard.writeText(activeClass.classJoinCode);
    setCopyCodeSuccess(true);
    setTimeout(() => setCopyCodeSuccess(false), 2500);
  };

  const handleConfirmDeletePupil = () => {
    if (!pupilToDelete) return;
    const targetId = pupilToDelete.pupilId;
    const targetName = getPupilDisplayName(pupilToDelete, activeClass);
    setPupilToDelete(null);

    try {
      deletePupil(targetId);
      setPupils((prev) => prev.filter((p) => p.pupilId !== targetId));
      setPots((prev) => prev.filter((p) => p.pupilId !== targetId));
      setActionSuccessMessage(
        `Pupil account "${targetName}" has been removed.`
      );
      setTimeout(() => setActionSuccessMessage(null), 4000);
      onPupilsChanged?.();
    } catch (err: unknown) {
      console.warn("Delete pupil error:", err);
      setPupils((prev) => prev.filter((p) => p.pupilId !== targetId));
      setPots((prev) => prev.filter((p) => p.pupilId !== targetId));
      setActionSuccessMessage(
        `Pupil account "${targetName}" has been removed.`
      );
      setTimeout(() => setActionSuccessMessage(null), 4000);
      onPupilsChanged?.();
    }
  };

  const handleConfirmDeleteClass = () => {
    if (!activeClass) return;
    const targetClassId = activeClass.classId;
    const targetClassName = activeClass.className;
    try {
      deleteClass(targetClassId);
      const remainingClasses = classes.filter((c) => c.classId !== targetClassId);
      setClasses(remainingClasses);
      setPupils((prev) => prev.filter((p) => p.classId !== targetClassId));
      setPots((prev) => prev.filter((p) => p.classId !== targetClassId));
      if (remainingClasses.length > 0) {
        setSelectedClassId(remainingClasses[0].classId);
      } else {
        setSelectedClassId("");
      }
      setActionSuccessMessage(
        `Class "${targetClassName}" and all its student accounts have been deleted.`
      );
      setTimeout(() => setActionSuccessMessage(null), 4000);
      setIsDeletingClass(false);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed to delete class.");
    }
  };

  const handleOpenEditIncomeModal = () => {
    if (!activeClass) return;
    setEditClassNameInput(activeClass.className);
    setEditYearGroupInput((activeClass.yearGroup as any) || "Year 4");
    setEditWeeklyAmount(((activeClass.weeklyBasicIncomeCents ?? 200) / 100).toFixed(2));
    setEditPayoutDay(activeClass.payoutDay ?? "Monday");
    setEditAnonymizeOption(activeClass.anonymizeNames ?? true);
    setIsAdjustingIncomeModalOpen(true);
  };

  const handleSaveClassIncomeSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeClass) return;
    try {
      const trimmedName = editClassNameInput.trim();
      if (!trimmedName) {
        setFormError("Class name cannot be empty.");
        return;
      }
      const weeklyCents = Math.round((parseFloat(editWeeklyAmount) || 2) * 100);
      updateClassSettings(activeClass.classId, {
        className: trimmedName,
        yearGroup: editYearGroupInput,
        weeklyBasicIncomeCents: weeklyCents,
        payoutDay: editPayoutDay,
        paydayOfWeek: editPayoutDay,
        anonymizeNames: editAnonymizeOption,
      });
      setClasses(getSavedClasses());
      setIsAdjustingIncomeModalOpen(false);
      setActionSuccessMessage(
        `Class "${trimmedName}" settings updated successfully.`
      );
      setTimeout(() => setActionSuccessMessage(null), 4000);
      onClassesChanged?.();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed to update class settings.");
    }
  };

  const handleOpenPrintClassCards = () => {
    setPrintTargetPupils(classPupils);
    setPrintModalTitle(`Print Debit Cards • ${activeClass?.className || "Class"} (${classPupils.length} Pupils)`);
    setIsPrintModalOpen(true);
  };

  const handleOpenPrintSingleCard = (pupil: PupilDocument) => {
    setPrintTargetPupils([pupil]);
    setPrintModalTitle(`Print Debit Card • ${getPupilDisplayName(pupil, activeClass)}`);
    setIsPrintModalOpen(true);
  };

  const handlePinResetConfirm = (pupil: PupilDocument, newPin: string) => {
    const res = resetPupilPin(pupil.pupilId, newPin);
    setPupils((prev) =>
      prev.map((p) => (p.pupilId === pupil.pupilId ? res.pupil : p))
    );
    setActionSuccessMessage(`PIN for ${getPupilDisplayName(pupil, activeClass)} has been reset to ${res.newPin}.`);
    setTimeout(() => setActionSuccessMessage(null), 5000);
    onPupilsChanged?.();
  };

  return (
    <div className="space-y-8 text-left">
      {/* ZERO CLASSES EMPTY STATE & MOUNT SKELETON */}
      {!isMounted ? (
        <section className="bg-surface rounded-3xl border border-borderMuted p-8 sm:p-12 text-center space-y-5 shadow-islandCard animate-pulse">
          <div className="w-16 h-16 rounded-2xl bg-tealSurface/60 border border-brandPrimary/20 mx-auto flex items-center justify-center text-3xl">
            🏫
          </div>
          <div className="max-w-md mx-auto space-y-3">
            <div className="h-6 bg-borderMuted/60 rounded-xl w-48 mx-auto" />
            <div className="h-4 bg-borderMuted/40 rounded-xl w-80 mx-auto" />
            <div className="h-4 bg-borderMuted/30 rounded-xl w-64 mx-auto" />
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <div className="h-11 bg-borderMuted/50 rounded-island w-40" />
            <div className="h-11 bg-borderMuted/30 rounded-island w-44" />
          </div>
        </section>
      ) : classes.length === 0 ? (
        <section className="bg-surface rounded-3xl border border-dashed border-borderMuted p-8 sm:p-12 text-center space-y-5 shadow-islandCard">
          <div className="w-16 h-16 rounded-2xl bg-tealSurface border border-brandPrimary/30 text-brandPrimary flex items-center justify-center mx-auto text-3xl shadow-xs">
            🏫
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <h3 className="text-xl font-extrabold text-primaryText">
              {isAdmin ? "No Classes Created Yet" : "No Classes Assigned Yet"}
            </h3>
            <p className="text-sm text-primaryText/75 leading-relaxed">
              {isAdmin
                ? "Get started by creating your first KS2 class roster with zero-PII privacy options, starter savings pots, and student PIN cards."
                : "Your teacher account is ready, but no KS2 classrooms have been assigned to you yet. You can launch a class with the 60-Second Setup Wizard or ask your school administrator."}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsCreateClassModalOpen(true)}
              className="px-5 py-3 rounded-island bg-brandPrimary hover:bg-teal-700 text-white font-bold text-sm flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <PlusCircle className="w-5 h-5" />
              <span>+ Create First Class</span>
            </button>
            {onOpenSetupWizard && (
              <button
                type="button"
                onClick={onOpenSetupWizard}
                className="px-5 py-3 rounded-island bg-tealSurface hover:bg-tealSurface/80 text-brandPrimary border border-brandPrimary/30 font-bold text-sm flex items-center gap-2 shadow-2xs transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Launch Setup Wizard</span>
              </button>
            )}
          </div>
        </section>
      ) : null}

      {/* 4. CLASS SETUP AND LIST: 6-DIGIT JOIN CODE BANNER & CLASS ACTIONS (MARKETPLACE CARD UI) */}
      {activeClass && (
        <section className="bg-surface rounded-3xl border border-borderMuted shadow-islandCard overflow-hidden space-y-6 text-left">
          {/* Header Band: Teal #0D9488 with School Icon, Class Name, Year Group Pill, Join Code Pill & Delete Action */}
          <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs text-white bg-brandPrimary">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-white/20 border border-white/25 flex items-center justify-center flex-shrink-0 text-xl text-white shadow-2xs">
                🏫
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg sm:text-xl font-extrabold text-white leading-tight truncate">
                    {activeClass.className}
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-white/20 text-white border border-white/30 shrink-0">
                    {activeClass.yearGroup}
                  </span>
                </div>
                <p className="text-xs text-white/80 font-medium mt-0.5">
                  Class Setup and List &bull; {classPupils.length} Enrolled Pupils
                </p>
              </div>
            </div>

            {/* Right: Join Code Pill & Delete Action */}
            <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto shrink-0">
              {/* 6-Digit Join Code Pill with Copy */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/20 border border-white/30 text-white font-mono text-xs font-bold shadow-2xs">
                <span>Code: {activeClass.classJoinCode}</span>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  title="Copy 6-digit Join Code"
                  className="p-1 rounded-lg hover:bg-white/20 text-white transition-colors"
                >
                  {copyCodeSuccess ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              {/* Print Class Join Code Poster */}
              <button
                type="button"
                onClick={() => setIsPrintJoinCodeModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white border border-white/30 text-xs font-bold shadow-2xs transition-all"
                title="Print A4 Join Code Poster for the Classroom"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Poster</span>
              </button>

              {/* Edit Class Button */}
              <button
                type="button"
                onClick={handleOpenEditIncomeModal}
                className="p-1.5 px-2.5 rounded-xl bg-white/10 hover:bg-white/25 text-white/90 hover:text-white border border-white/25 transition-all text-xs flex items-center gap-1 shadow-2xs cursor-pointer"
                title={`Edit class ${activeClass.className}`}
              >
                <Pencil className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-[11px] font-bold">Edit Class</span>
              </button>

              {/* Delete Class Button */}
              <button
                type="button"
                onClick={() => setIsDeletingClass(true)}
                className="p-1.5 px-2.5 rounded-xl bg-white/10 hover:bg-red-600 text-white/90 hover:text-white border border-white/25 transition-all text-xs flex items-center gap-1 shadow-2xs cursor-pointer"
                title={`Delete class ${activeClass.className}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-[11px] font-bold">Delete Class</span>
              </button>
            </div>
          </div>

          <div className="p-5 sm:p-6 md:p-8 pt-0 space-y-6">
            {/* Action Success Toast */}
            {actionSuccessMessage && (
              <div
                role="status"
                className="p-4 rounded-2xl bg-amberSurface border border-brandSecondary/30 text-primaryText flex items-center gap-3 text-left animate-in fade-in"
              >
                <CheckCircle2 className="w-5 h-5 text-brandSecondary flex-shrink-0" />
                <p className="text-sm font-bold text-left">{actionSuccessMessage}</p>
              </div>
            )}

            {/* SWITCH CLASS DROPDOWN MENU (Requirement 3: Dropdown menu instead of header with class names) & FINANCIAL POLICIES */}
            <div className="p-4 sm:p-5 rounded-2xl bg-canvas border border-borderMuted flex flex-col lg:flex-row lg:items-center justify-between gap-4 text-left">
              {/* Dropdown Menu for Class Switching */}
              <div className="flex flex-wrap items-center gap-3">
                <label
                  htmlFor="switch-class-dropdown"
                  className="text-xs font-extrabold uppercase tracking-wider text-primaryText/70 flex-shrink-0"
                >
                  Switch Class:
                </label>
                <div className="relative min-w-[220px]">
                  <select
                    id="switch-class-dropdown"
                    value={activeClass.classId}
                    onChange={(e) => {
                      setSelectedClassId(e.target.value);
                      if (onSelectClassId) onSelectClassId(e.target.value);
                    }}
                    className="w-full pl-3.5 pr-8 py-2 rounded-xl bg-surface border border-borderMuted text-primaryText font-extrabold text-xs shadow-2xs focus:outline-hidden focus:border-brandPrimary focus:ring-1 focus:ring-brandPrimary transition-all cursor-pointer appearance-none"
                  >
                    {classes.map((c) => (
                      <option key={c.classId} value={c.classId}>
                        {c.className} ({c.yearGroup}) • Join Code: {c.classJoinCode}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-primaryText/60 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                <button
                  type="button"
                  onClick={() => setIsCreateClassModalOpen(true)}
                  className="px-3 py-2 rounded-xl bg-brandPrimary hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all shrink-0 cursor-pointer"
                  title="Create a new class"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ New Class</span>
                </button>
              </div>

              {/* Financial Policy Pills */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold bg-amber-50 text-[#C2410C] border border-[#C2410C]/30 shadow-2xs">
                  <Coins className="w-3.5 h-3.5" />
                  <span>Basic Income: {formatCurrency(activeClass.weeklyBasicIncomeCents ?? 200)} / week</span>
                </span>

                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold bg-surface text-primaryText/75 border border-borderMuted shadow-2xs">
                  <Calendar className="w-3.5 h-3.5 text-primaryText/60" />
                  <span>Paid: Every {activeClass.payoutDay ?? "Monday"} at 08:00</span>
                </span>

                <button
                  type="button"
                  onClick={handleOpenEditIncomeModal}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface hover:bg-canvas border border-borderMuted text-primaryText font-bold text-xs transition-colors shadow-2xs"
                  title="Adjust weekly allowance amount or payout day"
                >
                  <Sliders className="w-3.5 h-3.5 text-primaryText/70" />
                  <span>Adjust Policy</span>
                </button>
              </div>
            </div>

            {/* 5. ENROLLED STUDENT ACCOUNTS / CLASS SETUP AND LIST */}
            <div id="class-list-section" className="space-y-4 text-left">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left">
                <div>
                  <h4 className="text-lg font-extrabold text-primaryText text-left">
                    Class List ({classPupils.length} Enrolled)
                  </h4>
                  <span className="text-xs text-primaryText/60 text-left font-medium">
                    Zero-PII Safeguarded &bull; Manage student accounts, live balances, savings pots and employment
                  </span>
                </div>

                {/* Requirement 2: Option to upload CSV as well as add individual names */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Upload CSV Option */}
                  <button
                    type="button"
                    onClick={() => setIsCsvUploadOpen(true)}
                    className="px-3.5 py-2 rounded-xl bg-positiveState hover:bg-green-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all"
                    title="Upload CSV classlist from school MIS (SIMS, Arbor, Bromcom)"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Upload CSV Classlist</span>
                  </button>

                  {/* Add Individual Names Option */}
                  <button
                    type="button"
                    onClick={() => setIsSingleAddOpen(true)}
                    className="px-3.5 py-2 rounded-xl bg-brandPrimary hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all"
                    title="Add pupils individually by name or codename"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>+ Add Individual Names</span>
                  </button>

                  {/* Print Class Cards */}
                  <button
                    type="button"
                    onClick={handleOpenPrintClassCards}
                    disabled={classPupils.length === 0}
                    className="px-3.5 py-2 rounded-xl bg-tealSurface hover:bg-tealSurface/80 text-brandPrimary border border-brandPrimary/30 font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Print individual PocketPot debit cards with child PINs for all pupils in this class"
                  >
                    <Printer className="w-4 h-4 text-brandPrimary" />
                    <span>Print Class Cards</span>
                  </button>

                  {/* Print Class Join Code Poster */}
                  <button
                    type="button"
                    onClick={() => setIsPrintJoinCodeModalOpen(true)}
                    className="px-3.5 py-2 rounded-xl bg-amberSurface hover:bg-amberSurface/80 text-brandSecondary border border-brandSecondary/30 font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all"
                    title="Print an A4 branded poster with the class name, join code, and PocketPot mascots for the classroom wall"
                  >
                    <Printer className="w-4 h-4 text-brandSecondary" />
                    <span>Print Class Join Code</span>
                  </button>

                  {isAdmin && onOpenAssignModal && (
                    <button
                      type="button"
                      onClick={() => onOpenAssignModal(activeClass)}
                      className="px-3.5 py-2 rounded-xl bg-surface hover:bg-tealSurface text-primaryText/80 hover:text-brandPrimary border border-borderMuted hover:border-brandPrimary/30 font-bold text-xs flex items-center gap-1.5 transition-all shadow-2xs"
                      title="Assign teachers to this class"
                    >
                      <Users className="w-4 h-4 text-focusIndicator" />
                      <span>Assign Staff</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Pupil List Empty State */}
              {classPupils.length === 0 ? (
                <div className="p-6 sm:p-8 rounded-3xl bg-canvas border-2 border-dashed border-brandPrimary/30 text-left space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-brandPrimary" />
                        <h5 className="text-lg font-bold text-primaryText">
                          Welcome to {activeClass.className}! Your Classroom is Ready to Setup
                        </h5>
                      </div>
                      <p className="text-xs text-primaryText/70">
                        Choose your preferred method to populate your class list:
                      </p>
                    </div>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-tealSurface text-brandPrimary font-bold border border-brandPrimary/30 shrink-0 self-start">
                      Join Code: {activeClass.classJoinCode}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsCsvUploadOpen(true)}
                      className="p-5 rounded-2xl bg-surface border border-borderMuted hover:border-positiveState/60 hover:bg-greenSurface/30 transition-all text-left space-y-2 shadow-islandCard group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-positiveState/10 flex items-center justify-center">
                          <FileSpreadsheet className="w-4 h-4 text-positiveState" />
                        </div>
                        <strong className="text-sm font-bold text-primaryText group-hover:text-positiveState">
                          Option 1: Upload CSV Classlist
                        </strong>
                      </div>
                      <p className="text-xs text-primaryText/70 leading-relaxed">
                        Export your class from your school MIS (SIMS, Arbor, Bromcom). PocketPot scrubs all PII and sets up pupil cards instantly.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsSingleAddOpen(true)}
                      className="p-5 rounded-2xl bg-surface border border-borderMuted hover:border-brandPrimary/60 hover:bg-tealSurface/30 transition-all text-left space-y-2 shadow-islandCard group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-tealSurface flex items-center justify-center">
                          <UserPlus className="w-4 h-4 text-brandPrimary" />
                        </div>
                        <strong className="text-sm font-bold text-primaryText group-hover:text-brandPrimary">
                          Option 2: Add Individual Names
                        </strong>
                      </div>
                      <p className="text-xs text-primaryText/70 leading-relaxed">
                        Quickly type student names one by one with customizable desk badges and starting balances.
                      </p>
                    </button>
                  </div>
                </div>
              ) : (
                /* RECONFIGURED ENROLLED STUDENT ROWS (Requirement 4 & 5) */
                <div className="space-y-2.5">
                  {classPupils.map((pupil, index) => {
                    const pupilPots = pots.filter((p) => p.pupilId === pupil.pupilId);
                    const displayName = getPupilDisplayName(pupil, activeClass);

                    const activeJob = getActiveJobForPupil(pupil.pupilId);

                    return (
                      <div
                        key={pupil.pupilId || `pupil-${index}`}
                        className="p-3 sm:p-3.5 rounded-2xl bg-surface border border-borderMuted hover:border-brandPrimary/40 transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs text-left"
                      >
                        {/* 1. Identity: Only Name OR Codename, NO UUID */}
                        <div className="flex items-center gap-3 min-w-[190px] text-left">
                          <div className="w-8 h-8 rounded-xl bg-tealSurface border border-brandPrimary/30 flex items-center justify-center text-brandPrimary font-extrabold text-xs shrink-0 shadow-2xs">
                            #{pupil.deskBadgeNumber}
                          </div>

                          <div className="space-y-0.5 truncate text-left">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-extrabold text-primaryText truncate">
                                {displayName}
                              </span>
                              <span
                                className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${
                                  pupil.anonymized === false && (pupil.displayName || pupil.localDisplayName)
                                    ? "bg-amberSurface text-brandSecondary border border-brandSecondary/30"
                                    : "bg-tealSurface text-brandPrimary border border-brandPrimary/30"
                                }`}
                              >
                                {pupil.anonymized === false && (pupil.displayName || pupil.localDisplayName) ? "First Name" : "Codename"}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 text-[10px] text-primaryText/60 font-medium">
                              <span className="inline-flex items-center gap-1 font-mono text-[10px] text-primaryText/70">
                                <KeyRound className="w-3 h-3 text-amber-500" />
                                <span>PIN: {pupil.pinNumber || pupil.cardLastFour || "1234"}</span>
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* 2. Inline Metrics in Desktop Mode (Live Balance, Savings Pots, Job Role) */}
                        <div className="flex flex-wrap md:flex-nowrap items-center gap-2 text-xs">
                          {/* Live Card Balance Pill */}
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-bold bg-tealSurface text-brandPrimary border border-brandPrimary/30 shadow-2xs shrink-0">
                            <CreditCard className="w-3.5 h-3.5 text-brandPrimary" />
                            <span>{formatCurrency(pupil.mainBalanceCents ?? 0)} Card</span>
                          </span>

                          {/* In Savings Pots Pill */}
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-bold bg-amber-50 text-[#C2410C] border border-[#C2410C]/30 shadow-2xs shrink-0">
                            <Coins className="w-3.5 h-3.5 text-[#C2410C]" />
                            <span>{formatCurrency(pupil.totalSavedCents ?? 0)} in Pots ({pupilPots.length})</span>
                          </span>

                          {/* Classroom Employment Pill */}
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-bold text-xs border shadow-2xs shrink-0 max-w-[210px] truncate ${
                              activeJob
                                ? "bg-greenSurface text-positiveState border-positiveState/30"
                                : "bg-canvas text-primaryText/60 border-borderMuted"
                            }`}
                            title={activeJob ? activeJob.title : "No active job role"}
                          >
                            <Briefcase className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{activeJob ? activeJob.title : "No Role"}</span>
                          </span>
                        </div>

                        {/* 3. Vertical Action Column (Print Card, Reset PIN, Inspect, Open Tab, Delete) */}
                        <div className="flex flex-col gap-1 items-stretch md:items-end shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-borderMuted/60 min-w-[130px]">
                          <div className="flex items-center gap-1 w-full justify-end">
                            <button
                              type="button"
                              onClick={() => handleOpenPrintSingleCard(pupil)}
                              className="flex-1 md:flex-initial px-2 py-0.5 rounded-lg text-[10px] font-bold text-brandPrimary bg-tealSurface hover:bg-tealSurface/80 border border-brandPrimary/25 flex items-center justify-center gap-1 transition-all"
                              title="Print Debit Card"
                            >
                              <Printer className="w-3 h-3" />
                              <span>Print Card</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setResettingPupil(pupil)}
                              className="flex-1 md:flex-initial px-2 py-0.5 rounded-lg text-[10px] font-bold text-brandSecondary bg-amberSurface hover:bg-amber-100 border border-brandSecondary/25 flex items-center justify-center gap-1 transition-all"
                              title="Reset 4-digit PIN"
                            >
                              <KeyRound className="w-3 h-3" />
                              <span>Reset PIN</span>
                            </button>
                          </div>

                          <div className="flex items-center gap-1 w-full justify-end">
                            <button
                              type="button"
                              onClick={() => setInspectingPupil(pupil)}
                              className="flex-1 md:flex-initial px-2 py-0.5 rounded-lg text-[10px] font-bold text-primaryText bg-surface hover:bg-canvas border border-borderMuted flex items-center justify-center gap-1 transition-all"
                              title="Inspect pupil account"
                            >
                              <Eye className="w-3 h-3 text-brandPrimary" />
                              <span>Inspect</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setPupilToDelete(pupil)}
                              className="flex-1 md:flex-initial px-2 py-0.5 rounded-lg text-[10px] font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 flex items-center justify-center gap-1 transition-all cursor-pointer"
                              title="Delete student"
                              aria-label={`Delete student ${displayName}`}
                            >
                              <Trash2 className="w-3 h-3 text-red-600" />
                              <span>Delete</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* 6. MODAL FOR TEACHER OBSERVATION / INSPECTION MODE */}
      {inspectingPupil && (
        <PupilInspectModal
          pupil={inspectingPupil}
          pots={pots.filter((p) => p.pupilId === inspectingPupil.pupilId)}
          className={activeClass?.className || "Class"}
          onClose={() => setInspectingPupil(null)}
          onDeletePupil={(pupil) => {
            setInspectingPupil(null);
            setPupilToDelete(pupil);
          }}
        />
      )}

      {/* 7. DELETE PUPIL CONFIRMATION MODAL (Soft Terracotta, Warm Amber, Slate Navy) */}
      {pupilToDelete && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primaryText/50 backdrop-blur-sm animate-in fade-in"
        >
          <div className="bg-surface w-full max-w-md rounded-[2rem] border-2 border-brandSecondary/40 p-5 sm:p-6 md:p-8 shadow-2xl text-left space-y-4">
            <div className="flex items-center gap-2.5 text-warningState">
              <AlertCircle className="w-6 h-6 text-warningState flex-shrink-0" />
              <h4 className="text-xl font-bold text-primaryText text-left">
                Delete Student Account?
              </h4>
            </div>

            <p className="text-sm text-primaryText/85 text-left leading-relaxed">
              Are you sure you want to remove{" "}
              <strong className="text-primaryText font-bold">
                {getPupilDisplayName(pupilToDelete, activeClass)}
              </strong>{" "}
              (Desk Badge #{pupilToDelete.deskBadgeNumber})?
            </p>

            <div className="bg-canvas p-3.5 rounded-island border border-borderMuted text-xs space-y-1.5 text-left">
              <div className="flex justify-between text-left">
                <span className="text-primaryText/70">Live Card Balance:</span>
                <span className="font-bold text-brandPrimary">
                  {formatCurrency(pupilToDelete.mainBalanceCents || 0)}
                </span>
              </div>
              <div className="flex justify-between text-left">
                <span className="text-primaryText/70">Money in Pots:</span>
                <span className="font-bold text-brandSecondary">
                  {formatCurrency(pupilToDelete.totalSavedCents || 0)}
                </span>
              </div>
              <div className="flex justify-between text-left">
                <span className="text-primaryText/70">Savings Pots:</span>
                <span className="font-bold text-primaryText">
                  {pots.filter((p) => p.pupilId === pupilToDelete.pupilId).length} active pots
                </span>
              </div>
            </div>

            <p className="text-xs text-primaryText/70 text-left">
              This pupil&apos;s records and savings pots will be removed from this classroom.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2 text-left">
              <button
                type="button"
                onClick={() => setPupilToDelete(null)}
                className="py-2.5 px-4 rounded-island border border-borderMuted text-primaryText text-xs font-bold hover:bg-canvas transition-colors"
              >
                Keep Student
              </button>
              <button
                type="button"
                onClick={handleConfirmDeletePupil}
                className="py-2.5 px-4 rounded-island bg-warningState hover:bg-[#9A3412] text-white text-xs font-bold shadow-sm transition-all"
              >
                Delete Student
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. DELETE ENTIRE CLASS CONFIRMATION MODAL */}
      {isDeletingClass && activeClass && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primaryText/50 backdrop-blur-sm animate-in fade-in"
        >
          <div className="bg-surface w-full max-w-md rounded-[2rem] border-2 border-brandSecondary/40 p-5 sm:p-6 md:p-8 shadow-2xl text-left space-y-4">
            <div className="flex items-center gap-2.5 text-warningState">
              <AlertCircle className="w-6 h-6 text-warningState flex-shrink-0" />
              <h4 className="text-xl font-bold text-primaryText text-left">
                Delete Entire Class?
              </h4>
            </div>

            <p className="text-sm text-primaryText/85 text-left leading-relaxed">
              Are you sure you want to permanently delete{" "}
              <strong className="text-primaryText font-bold">
                {activeClass.className}
              </strong>{" "}
              ({activeClass.yearGroup})?
            </p>

            <div className="bg-canvas p-3.5 rounded-island border border-borderMuted text-xs space-y-1.5 text-left">
              <div className="flex justify-between text-left">
                <span className="text-primaryText/70">Join Code:</span>
                <span className="font-mono font-bold text-brandPrimary">
                  {activeClass.classJoinCode}
                </span>
              </div>
              <div className="flex justify-between text-left">
                <span className="text-primaryText/70">Enrolled Pupils:</span>
                <span className="font-bold text-primaryText">
                  {classPupils.length} pupils
                </span>
              </div>
            </div>

            <p className="text-xs text-primaryText/70 text-left">
              Deleting this class will permanently remove all enrolled pupil profiles, desk badges, and associated savings pots.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2 text-left">
              <button
                type="button"
                onClick={() => setIsDeletingClass(false)}
                className="py-2.5 px-4 rounded-island border border-borderMuted text-primaryText text-xs font-bold hover:bg-canvas transition-colors"
              >
                Keep Class
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteClass}
                className="py-2.5 px-4 rounded-island bg-warningState hover:bg-[#9A3412] text-white text-xs font-bold shadow-sm transition-all"
              >
                Delete Entire Class
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. EDIT CLASS SETTINGS MODAL */}
      {isAdjustingIncomeModalOpen && activeClass && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primaryText/50 backdrop-blur-sm animate-in fade-in"
        >
          <div className="bg-surface w-full max-w-lg rounded-[2rem] border-2 border-brandPrimary/40 p-5 sm:p-6 md:p-8 shadow-2xl text-left space-y-4">
            <div className="flex items-center justify-between border-b border-borderMuted/60 pb-3">
              <div className="flex items-center gap-2.5 text-brandPrimary">
                <Pencil className="w-6 h-6 text-brandPrimary flex-shrink-0" />
                <div>
                  <h4 className="text-xl font-bold text-primaryText text-left">
                    Edit Class Settings
                  </h4>
                  <p className="text-xs text-primaryText/70">
                    {activeClass.className} ({activeClass.yearGroup})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAdjustingIncomeModalOpen(false)}
                className="text-primaryText/40 hover:text-primaryText text-2xl font-bold p-1 leading-none cursor-pointer"
                title="Close modal"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveClassIncomeSettings} className="space-y-4 text-left">
              {/* Class Name */}
              <div className="space-y-1">
                <label htmlFor="edit-class-name-input" className="text-xs font-bold text-primaryText uppercase block">
                  Class Name:
                </label>
                <input
                  id="edit-class-name-input"
                  type="text"
                  required
                  value={editClassNameInput}
                  onChange={(e) => setEditClassNameInput(e.target.value)}
                  placeholder="e.g. Year 4 Oak"
                  className="w-full px-3 py-2 rounded-island bg-canvas border border-borderMuted text-primaryText font-bold text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-brandPrimary"
                />
              </div>

              {/* Year Group */}
              <div className="space-y-1">
                <label htmlFor="edit-year-group-input" className="text-xs font-bold text-primaryText uppercase block">
                  KS2 Year Group:
                </label>
                <div className="relative">
                  <select
                    id="edit-year-group-input"
                    value={editYearGroupInput}
                    onChange={(e) => setEditYearGroupInput(e.target.value as "Year 3" | "Year 4" | "Year 5" | "Year 6")}
                    className="w-full px-3 pr-8 py-2 rounded-island bg-canvas border border-borderMuted text-primaryText font-bold text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-brandPrimary appearance-none cursor-pointer"
                  >
                    <option value="Year 3">Year 3 (Ages 7–8)</option>
                    <option value="Year 4">Year 4 (Ages 8–9)</option>
                    <option value="Year 5">Year 5 (Ages 9–10)</option>
                    <option value="Year 6">Year 6 (Ages 10–11)</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-primaryText/60 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Basic Income */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label htmlFor="edit-weekly-amount" className="text-xs font-bold text-primaryText uppercase block">
                    Weekly Allowance (£):
                  </label>
                  <div className="flex items-center gap-1.5">
                    <span className="text-base font-bold text-brandSecondary">£</span>
                    <input
                      id="edit-weekly-amount"
                      type="number"
                      step="0.50"
                      min="0"
                      required
                      value={editWeeklyAmount}
                      onChange={(e) => setEditWeeklyAmount(e.target.value)}
                      className="w-full px-3 py-2 rounded-island bg-canvas border border-borderMuted text-primaryText font-bold text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-brandSecondary"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label htmlFor="edit-payout-day" className="text-xs font-bold text-primaryText uppercase block">
                    Weekly Payout Day:
                  </label>
                  <div className="relative">
                    <select
                      id="edit-payout-day"
                      value={editPayoutDay}
                      onChange={(e) =>
                        setEditPayoutDay(
                          e.target.value as "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday"
                        )
                      }
                      className="w-full px-3 pr-8 py-2 rounded-island bg-canvas border border-borderMuted text-primaryText font-bold text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-brandSecondary appearance-none cursor-pointer"
                    >
                      <option value="Monday">Monday</option>
                      <option value="Tuesday">Tuesday</option>
                      <option value="Wednesday">Wednesday</option>
                      <option value="Thursday">Thursday</option>
                      <option value="Friday">Friday</option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-primaryText/60 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-borderMuted text-left">
                <button
                  type="button"
                  onClick={() => setIsAdjustingIncomeModalOpen(false)}
                  className="py-2.5 px-4 rounded-island border border-borderMuted text-primaryText text-xs font-bold hover:bg-canvas transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-2.5 px-5 rounded-island bg-brandPrimary hover:bg-teal-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. SINGLE PUPIL ADD MODAL (Requirement 1c) */}
      <SinglePupilAddModal
        isOpen={isSingleAddOpen}
        activeClass={activeClass}
        onClose={() => setIsSingleAddOpen(false)}
        onPupilAdded={(newPupil) => {
          setPupils((prev) => [newPupil, ...prev.filter((p) => p.pupilId !== newPupil.pupilId)]);
          setClasses(getSavedClasses());
          onPupilsChanged?.();
          setEnrolledSuccessCount(1);
          setIsEnrollSuccessModalOpen(true);
        }}
      />

      {/* 5. CSV CLASSLIST UPLOAD MODAL (Requirement 1d) */}
      <CsvClasslistUploadModal
        isOpen={isCsvUploadOpen}
        activeClass={activeClass}
        classes={classes}
        onClose={() => setIsCsvUploadOpen(false)}
        onPupilsEnrolled={(newPupils) => {
          setPupils((prev) => {
            const newIds = new Set(newPupils.map((p) => p.pupilId));
            return [...newPupils, ...prev.filter((p) => !newIds.has(p.pupilId))];
          });
          setClasses(getSavedClasses());
          onPupilsChanged?.();
          setEnrolledSuccessCount(newPupils.length);
          setIsEnrollSuccessModalOpen(true);
        }}
      />

      {/* 5B. PUPILS ADDED CONFIRMATION POP-UP MODAL */}
      {isEnrollSuccessModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="pupils-added-heading"
          className="fixed inset-0 z-50 bg-primaryText/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200"
        >
          <div className="bg-surface rounded-3xl border border-borderMuted shadow-2xl p-6 sm:p-8 space-y-5 text-center max-w-md w-full animate-in zoom-in-95 duration-200 font-lexend">
            <div className="w-16 h-16 rounded-2xl bg-tealSurface text-brandPrimary border border-brandPrimary/30 mx-auto flex items-center justify-center text-3xl shadow-xs">
              🎉
            </div>

            <div className="space-y-2">
              <h3 id="pupils-added-heading" className="text-xl font-black text-primaryText">
                Your pupils have been added
              </h3>
              <p className="text-xs text-primaryText/70 leading-relaxed">
                {enrolledSuccessCount > 1
                  ? `${enrolledSuccessCount} pupils have been successfully added to ${activeClass?.className || "your class"}. Their debit cards and savings pots are ready.`
                  : `Your pupils have been successfully added to ${activeClass?.className || "your class"}. Their debit cards and savings pots are ready.`}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsEnrollSuccessModalOpen(false);
                  const el = document.getElementById("class-list-section");
                  if (el) {
                    el.scrollIntoView({ behavior: "smooth", block: "start" });
                  }
                }}
                className="w-full sm:w-auto px-6 py-2.5 rounded-full bg-brandPrimary hover:bg-teal-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Users className="w-4 h-4" />
                <span>Go to class</span>
              </button>
              <button
                type="button"
                onClick={() => setIsEnrollSuccessModalOpen(false)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-full border border-borderMuted hover:bg-canvas text-primaryText font-bold text-xs transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. PRINT CLASS DEBIT CARDS MODAL (Requirement 2 & 3) */}
      <PrintPupilCardsModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        pupils={printTargetPupils}
        className={activeClass?.className}
        classJoinCode={activeClass?.classJoinCode}
        title={printModalTitle}
      />

      {/* 6B. PRINT CLASS JOIN CODE POSTER MODAL */}
      <PrintClassJoinCodeModal
        isOpen={isPrintJoinCodeModalOpen}
        onClose={() => setIsPrintJoinCodeModalOpen(false)}
        classroom={activeClass}
      />

      {/* 7. RESET PUPIL PIN MODAL (Requirement 3) */}
      <ResetPinModal
        isOpen={Boolean(resettingPupil)}
        pupil={resettingPupil}
        onClose={() => setResettingPupil(null)}
        onPinReset={handlePinResetConfirm}
        onOpenPrintCard={(updatedPupil) => {
          handleOpenPrintSingleCard(updatedPupil);
        }}
      />

      {/* 8. CREATE NEW CLASS MODAL (Collapsed from inline section) */}
      {isCreateClassModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-primaryText/50 backdrop-blur-sm animate-in fade-in"
        >
          <div className="bg-surface w-full max-w-2xl max-h-[90vh] rounded-[2rem] border border-borderMuted shadow-2xl flex flex-col overflow-hidden text-left">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-borderMuted flex items-center justify-between gap-4 bg-tealSurface/40 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-brandPrimary text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                  <School className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-primaryText">
                    Create New Class
                  </h3>
                  <p className="text-xs text-primaryText/70">
                    Set up your class roster, privacy options, and basic income policy.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCreateClassModalOpen(false);
                  setFormError(null);
                }}
                className="p-1.5 rounded-xl hover:bg-canvas text-primaryText/60 hover:text-primaryText transition-colors cursor-pointer"
                title="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body (Scrollable Form) */}
            <form onSubmit={handleCreateClass} className="p-5 sm:p-6 overflow-y-auto space-y-5 text-left flex-1">
              {/* Class Name & KS2 Year Group */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="modal-class-name" className="text-xs font-bold text-primaryText uppercase tracking-wider block">
                    Class Name <span className="text-brandPrimary">*</span>
                  </label>
                  <input
                    id="modal-class-name"
                    type="text"
                    required
                    value={classNameInput}
                    onChange={(e) => {
                      setClassNameInput(e.target.value);
                      if (formError) setFormError(null);
                    }}
                    placeholder="e.g. Year 4 Teal, Oak Year 5"
                    className={`w-full px-3.5 py-2.5 rounded-xl bg-canvas border text-primaryText font-medium text-sm transition-colors focus:outline-hidden focus:border-brandPrimary focus:ring-1 focus:ring-brandPrimary ${
                      isDuplicateName ? "border-brandSecondary bg-amberSurface" : "border-borderMuted"
                    }`}
                  />
                  {isDuplicateName && (
                    <p className="text-xs font-semibold text-brandSecondary flex items-center gap-1.5 pt-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>A class named &quot;{classNameInput}&quot; already exists.</span>
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="modal-year-group" className="text-xs font-bold text-primaryText uppercase tracking-wider block">
                    KS2 Year Group
                  </label>
                  <div className="relative">
                    <select
                      id="modal-year-group"
                      value={yearGroup}
                      onChange={(e) => setYearGroup(e.target.value as "Year 3" | "Year 4" | "Year 5" | "Year 6")}
                      className="w-full px-3.5 pr-8 py-2.5 rounded-xl bg-canvas border border-borderMuted text-primaryText font-medium text-sm focus:outline-hidden focus:border-brandPrimary focus:ring-1 focus:ring-brandPrimary appearance-none cursor-pointer"
                    >
                      <option value="Year 3">Year 3 (Ages 7–8)</option>
                      <option value="Year 4">Year 4 (Ages 8–9)</option>
                      <option value="Year 5">Year 5 (Ages 9–10)</option>
                      <option value="Year 6">Year 6 (Ages 10–11)</option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-primaryText/60 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Financial Policies: Opening Balance & Basic Income */}
              <div className="p-4 rounded-2xl bg-canvas border border-borderMuted space-y-4">
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-brandPrimary shrink-0" />
                  <span className="text-xs font-extrabold uppercase tracking-wider text-primaryText">
                    Financial Policies
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Account Opening Balance */}
                  <div className="p-3 rounded-xl bg-surface border border-borderMuted space-y-2">
                    <div className="flex justify-between items-baseline">
                      <label htmlFor="modal-opening-balance" className="text-xs font-bold text-primaryText">
                        Opening Balance
                      </label>
                      <span className="text-[11px] text-primaryText/60">One-time credit</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-brandPrimary">£</span>
                      <input
                        id="modal-opening-balance"
                        type="number"
                        step="0.50"
                        min="0"
                        required
                        value={openingBalanceInput}
                        onChange={(e) => setOpeningBalanceInput(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg bg-canvas border border-borderMuted text-primaryText font-bold text-sm focus:outline-hidden focus:border-brandPrimary"
                        placeholder="5.00"
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      {["0.00", "2.00", "5.00", "10.00"].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setOpeningBalanceInput(preset)}
                          className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
                            openingBalanceInput === preset
                              ? "bg-brandPrimary text-white shadow-2xs"
                              : "bg-canvas text-primaryText/70 hover:bg-tealSurface border border-borderMuted"
                          }`}
                        >
                          £{preset}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Minimum Basic Income */}
                  <div className="p-3 rounded-xl bg-surface border border-borderMuted space-y-2">
                    <div className="flex justify-between items-baseline">
                      <label htmlFor="modal-weekly-income" className="text-xs font-bold text-primaryText">
                        Weekly Basic Income
                      </label>
                      <span className="text-[11px] text-brandSecondary font-bold">Guaranteed</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-base font-bold text-brandSecondary">£</span>
                        <input
                          id="modal-weekly-income"
                          type="number"
                          step="0.50"
                          min="0"
                          required
                          value={weeklyIncomeInput}
                          onChange={(e) => setWeeklyIncomeInput(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-canvas border border-borderMuted text-primaryText font-bold text-sm focus:outline-hidden focus:border-brandSecondary"
                          placeholder="2.00"
                        />
                      </div>
                      <select
                        id="modal-payout-day"
                        value={payoutDayInput}
                        onChange={(e) =>
                          setPayoutDayInput(e.target.value as "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday")
                        }
                        className="w-full px-2 py-1.5 rounded-lg bg-canvas border border-borderMuted text-primaryText font-bold text-xs focus:outline-hidden focus:border-brandSecondary cursor-pointer"
                      >
                        <option value="Monday">Monday</option>
                        <option value="Tuesday">Tuesday</option>
                        <option value="Wednesday">Wednesday</option>
                        <option value="Thursday">Thursday</option>
                        <option value="Friday">Friday</option>
                      </select>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      {["1.00", "2.00", "3.00", "5.00"].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setWeeklyIncomeInput(preset)}
                          className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
                            weeklyIncomeInput === preset
                              ? "bg-brandSecondary text-white shadow-2xs"
                              : "bg-canvas text-primaryText/70 hover:bg-amberSurface border border-borderMuted"
                          }`}
                        >
                          £{preset}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Roster Privacy & Display Mode (Streamlined 2-Option Choice, 1A Item 5) */}
              <div className="p-4 rounded-2xl bg-canvas border border-borderMuted space-y-3">
                <span className="text-xs font-extrabold uppercase tracking-wider text-primaryText block">
                  Roster Privacy &amp; Display Mode
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label
                    className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-2.5 ${
                      namingOption === "anonymize"
                        ? "border-brandPrimary bg-surface shadow-xs"
                        : "border-borderMuted bg-surface/60 hover:bg-surface"
                    }`}
                  >
                    <input
                      type="radio"
                      name="modal-naming-option"
                      value="anonymize"
                      checked={namingOption === "anonymize"}
                      onChange={() => setNamingOption("anonymize")}
                      className="mt-0.5 text-brandPrimary focus:ring-brandPrimary"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <VenetianMask className="w-4 h-4 text-brandPrimary" />
                        <span className="text-xs font-bold text-primaryText">Nature Codenames (Zero-PII)</span>
                      </div>
                      <p className="text-[11px] text-primaryText/70 mt-0.5 leading-snug">
                        Pupils receive wildlife codenames (e.g. <em>Calm River Otter #101</em>). Zero real names saved.
                      </p>
                    </div>
                  </label>

                  <label
                    className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-2.5 ${
                      namingOption === "first_name"
                        ? "border-brandSecondary bg-surface shadow-xs"
                        : "border-borderMuted bg-surface/60 hover:bg-surface"
                    }`}
                  >
                    <input
                      type="radio"
                      name="modal-naming-option"
                      value="first_name"
                      checked={namingOption === "first_name"}
                      onChange={() => setNamingOption("first_name")}
                      className="mt-0.5 text-brandSecondary focus:ring-brandSecondary"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <UserCheck className="w-4 h-4 text-brandSecondary" />
                        <span className="text-xs font-bold text-primaryText">First Names (Local Device Only)</span>
                      </div>
                      <p className="text-[11px] text-primaryText/70 mt-0.5 leading-snug">
                        Displays entered first names on desk cards and screen; stored locally on this machine.
                      </p>
                    </div>
                  </label>
                </div>

                <div className="p-3 rounded-xl bg-amberSurface border border-brandSecondary/25 flex items-start gap-2.5 text-xs">
                  <ShieldAlert className="w-4 h-4 text-brandSecondary mt-0.5 shrink-0" />
                  <p className="text-primaryText/85 text-[11px] leading-relaxed">
                    {namingOption === "first_name"
                      ? "First names are kept strictly on your local browser/device for classroom recognition. Zero PII is transmitted to cloud services."
                      : "Zero-PII Safeguarded: Nature codenames ensure full privacy protection for your classroom."}
                  </p>
                </div>
              </div>

              {/* Student Name Boxes */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold text-primaryText uppercase tracking-wider block">
                      Student Name Boxes ({pupilNameBoxes.length} Slots)
                    </label>
                    <p className="text-[11px] text-primaryText/70">
                      Enter names or nicknames. Leave blank to generate codenames automatically.
                    </p>
                  </div>
                  <span className="text-[11px] font-bold text-brandPrimary bg-tealSurface px-2.5 py-0.5 rounded-full border border-brandPrimary/25">
                    {pupilNameBoxes.filter((n) => n.trim().length > 0).length} Named
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto p-1">
                  {pupilNameBoxes.map((name, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-1.5 px-2.5 rounded-xl bg-canvas border border-borderMuted hover:border-brandPrimary/50 transition-colors"
                    >
                      <span className="w-6 h-6 rounded-lg bg-surface text-primaryText/70 font-bold text-[11px] flex items-center justify-center border border-borderMuted shrink-0">
                        #{index + 1}
                      </span>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => handleBoxChange(index, e.target.value)}
                        placeholder={`Child ${index + 1}`}
                        className="flex-1 bg-transparent border-none text-primaryText text-xs font-medium focus:ring-0 focus:outline-none placeholder:text-primaryText/40"
                      />
                      {pupilNameBoxes.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveBox(index)}
                          title={`Remove Box ${index + 1}`}
                          className="p-1 rounded text-primaryText/40 hover:text-red-600 hover:bg-surface transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleAddMoreBoxes}
                    className="px-3 py-1.5 rounded-xl bg-surface hover:bg-canvas border border-borderMuted hover:border-brandPrimary text-primaryText font-bold text-xs flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-brandPrimary" />
                    <span>+ Add More Pupils</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPupilNameBoxes((prev) => [...prev, "", "", "", "", ""])}
                    className="text-xs font-bold text-brandPrimary hover:underline px-2 py-1 cursor-pointer"
                  >
                    + Add 5 Slots
                  </button>
                </div>
              </div>

              {formError && (
                <div role="alert" className="p-3.5 rounded-xl bg-amberSurface border border-brandSecondary/40 text-primaryText flex items-center gap-2.5 text-xs">
                  <AlertCircle className="w-4 h-4 text-brandSecondary shrink-0" />
                  <p className="font-bold">{formError}</p>
                </div>
              )}

              {/* Modal Footer Actions */}
              <div className="border-t border-borderMuted pt-4 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateClassModalOpen(false);
                    setFormError(null);
                  }}
                  className="px-4 py-2.5 rounded-xl border border-borderMuted text-primaryText text-xs font-bold hover:bg-canvas transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isDuplicateName || !classNameInput.trim()}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs shadow-sm transition-all cursor-pointer ${
                    isDuplicateName || !classNameInput.trim()
                      ? "bg-canvas text-primaryText/40 cursor-not-allowed border border-borderMuted"
                      : "bg-brandPrimary hover:bg-teal-700 text-white"
                  }`}
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Create Class &amp; Generate Roster</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
