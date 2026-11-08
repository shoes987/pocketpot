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
  BALANCE_SYNC_EVENT,
} from "@/lib/services/class-service";
import { formatCurrency } from "@/lib/firebase/zero-pii";
import {
  getActiveJobForPupil,
  getCompletedJobsForPupil,
} from "@/lib/services/jobs-service";
import { PupilInspectModal } from "./PupilInspectModal";
import {
  PlusCircle,
  Plus,
  Trash2,
  Eye,
  CheckCircle2,
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
} from "lucide-react";
import { SinglePupilAddModal } from "./SinglePupilAddModal";
import { CsvClasslistUploadModal } from "./CsvClasslistUploadModal";

interface ClassSetupProps {
  onOpenSetupWizard?: () => void;
  activeClassId?: string;
  onSelectClassId?: (classId: string) => void;
  isAdmin?: boolean;
  onOpenAssignModal?: (cls: ClassDocument) => void;
  onPupilsChanged?: () => void;
}

export const ClassSetup: React.FC<ClassSetupProps> = ({
  onOpenSetupWizard,
  activeClassId,
  onSelectClassId,
  isAdmin,
  onOpenAssignModal,
  onPupilsChanged,
}) => {
  const [classes, setClasses] = useState<ClassDocument[]>([]);
  const [pupils, setPupils] = useState<PupilDocument[]>([]);
  const [pots, setPots] = useState<SavingsPotDocument[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [isSingleAddOpen, setIsSingleAddOpen] = useState(false);
  const [isCsvUploadOpen, setIsCsvUploadOpen] = useState(false);

  // Form states
  const [classNameInput, setClassNameInput] = useState<string>("Year 4 Teal");
  const [yearGroup, setYearGroup] = useState<
    "Year 3" | "Year 4" | "Year 5" | "Year 6"
  >("Year 4");

  // Separate boxes for each child's name: Begin with 5 separate boxes
  const [pupilNameBoxes, setPupilNameBoxes] = useState<string[]>([
    "Alex",
    "Sam",
    "Jordan",
    "Taylor",
    "Riley",
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
  const [editWeeklyAmount, setEditWeeklyAmount] = useState<string>("2.00");
  const [editPayoutDay, setEditPayoutDay] = useState<
    "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday"
  >("Monday");

  // Initialize data on mount & run real-world automated income reconciliation
  useEffect(() => {
    // Automated check: credits pupils idempotently if payout day has occurred
    autoReconcileAllClassesWeeklyIncome();

    const refreshData = () => {
      const loadedClasses = getSavedClasses();
      const loadedPupils = getSavedPupils();
      const loadedPots = getSavedPots();

      setClasses(loadedClasses);
      setPupils(loadedPupils);
      setPots(loadedPots);

      if (loadedClasses.length > 0) {
        setSelectedClassId((prev) => activeClassId || prev || loadedClasses[0].classId);
      }
    };

    refreshData();

    const handleSync = () => {
      refreshData();
    };

    window.addEventListener("storage", handleSync);
    window.addEventListener(BALANCE_SYNC_EVENT, handleSync);

    return () => {
      window.removeEventListener("storage", handleSync);
      window.removeEventListener(BALANCE_SYNC_EVENT, handleSync);
    };
  }, []);

  useEffect(() => {
    if (activeClassId) {
      setSelectedClassId(activeClassId);
    }
  }, [activeClassId]);

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
        });

      setClasses((prev) => [newClass, ...prev]);
      setPupils((prev) => [...newPupils, ...prev]);
      setPots((prev) => [...newPots, ...prev]);
      setSelectedClassId(newClass.classId);
      setShowCreationSuccess(true);
      setTimeout(() => setShowCreationSuccess(false), 4000);

      // Reset pupil boxes to 5 fresh slots for next class
      setPupilNameBoxes(["", "", "", "", ""]);
      setClassNameInput("");
    } catch (err: unknown) {
      setFormError(
        err instanceof Error ? err.message : "Failed to create class."
      );
    }
  };

  const activeClass =
    classes.find((c) => c.classId === selectedClassId) || classes[0];

  const classPupils = pupils.filter((p) => p.classId === activeClass?.classId);

  const handleCopyCode = () => {
    if (!activeClass?.classJoinCode) return;
    navigator.clipboard.writeText(activeClass.classJoinCode);
    setCopyCodeSuccess(true);
    setTimeout(() => setCopyCodeSuccess(false), 2500);
  };

  const handleConfirmDeletePupil = () => {
    if (!pupilToDelete) return;
    try {
      const targetId = pupilToDelete.pupilId;
      const targetName = pupilToDelete.localDisplayName || pupilToDelete.educationalCodename;
      deletePupil(targetId);
      setPupils((prev) => prev.filter((p) => p.pupilId !== targetId));
      setPots((prev) => prev.filter((p) => p.pupilId !== targetId));
      onPupilsChanged?.();
      setActionSuccessMessage(
        `Pupil account "${targetName}" has been removed.`
      );
      setTimeout(() => setActionSuccessMessage(null), 4000);
      setPupilToDelete(null);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed to delete student account.");
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
    setEditWeeklyAmount(((activeClass.weeklyBasicIncomeCents ?? 200) / 100).toFixed(2));
    setEditPayoutDay(activeClass.payoutDay ?? "Monday");
    setIsAdjustingIncomeModalOpen(true);
  };

  const handleSaveClassIncomeSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeClass) return;
    try {
      const weeklyCents = Math.round((parseFloat(editWeeklyAmount) || 2) * 100);
      updateClassSettings(activeClass.classId, {
        weeklyBasicIncomeCents: weeklyCents,
        payoutDay: editPayoutDay,
      });
      setClasses(getSavedClasses());
      setIsAdjustingIncomeModalOpen(false);
      setActionSuccessMessage(
        `Class allowance updated: ${formatCurrency(weeklyCents)} weekly on ${editPayoutDay}s.`
      );
      setTimeout(() => setActionSuccessMessage(null), 4000);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed to update allowance settings.");
    }
  };

  return (
    <div className="space-y-8 text-left">
      {/* FAST-TRACK SETUP WIZARD BANNER */}
      {onOpenSetupWizard && (
        <div className="p-4 sm:p-5 rounded-pot bg-gradient-to-r from-tealSurface via-surface to-amberSurface border border-brandPrimary/30 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-brandPrimary text-white flex items-center justify-center flex-shrink-0 shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <strong className="text-sm font-bold text-primaryText block">
                Classroom Setup Wizard
              </strong>
              <p className="text-xs text-primaryText/75 font-medium mt-0.5">
                Fast-track your class roster, starter savings pots, classroom jobs, and whiteboard bonuses in 60s.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenSetupWizard}
            className="px-4 py-2.5 rounded-xl bg-brandPrimary hover:bg-teal-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all self-start sm:self-center shrink-0"
          >
            <span>Launch Setup Wizard</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 1. TEACHER CLASS CREATION & SETUP FORM */}
      <section className="bg-surface rounded-pot p-4 sm:p-6 md:p-8 border border-borderMuted shadow-islandCard space-y-6 text-left">
        <div className="border-b border-borderMuted pb-4 text-left">
          <div className="flex items-center gap-2.5 text-left">
            <School className="w-6 h-6 text-brandPrimary flex-shrink-0" />
            <h2 className="text-xl font-bold text-primaryText text-left">
              Create New Class &amp; Student Roster
            </h2>
          </div>
          <p className="text-body text-primaryText/75 text-left mt-1">
            Set up your classroom with separate student boxes, privacy options, and duplicate prevention.
          </p>
        </div>

        <form onSubmit={handleCreateClass} className="space-y-6 text-left">
          {/* Class Name & Year Group */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
            {/* Class Name with Duplicate Validation */}
            <div className="space-y-1.5 text-left">
              <label
                htmlFor="class-name-input"
                className="text-sm font-semibold text-primaryText block text-left"
              >
                Class Name <span className="text-brandPrimary">*</span>
              </label>
              <input
                id="class-name-input"
                type="text"
                required
                value={classNameInput}
                onChange={(e) => {
                  setClassNameInput(e.target.value);
                  if (formError) setFormError(null);
                }}
                placeholder="e.g., Year 4 Teal, Oak Year 5"
                className={`w-full px-4 py-2.5 rounded-island bg-canvas border text-primaryText font-medium text-base transition-colors focus-visible:outline focus-visible:outline-3 focus-visible:outline-focusIndicator ${
                  isDuplicateName
                    ? "border-brandSecondary bg-amberSurface"
                    : "border-borderMuted"
                }`}
              />
              {/* Duplicate Prevention Notice (Warm Amber & Slate Navy, No Red) */}
              {isDuplicateName && (
                <div className="flex items-center gap-2 text-xs font-semibold text-primaryText bg-amberSurface p-2.5 rounded-island border border-brandSecondary/30 text-left pt-1">
                  <AlertCircle className="w-4 h-4 text-brandSecondary flex-shrink-0" />
                  <span>
                    Let&apos;s puzzle this out together: a class named &quot;{classNameInput}&quot; already exists. Please choose a unique name.
                  </span>
                </div>
              )}
            </div>

            {/* KS2 Year Group */}
            <div className="space-y-1.5 text-left">
              <label
                htmlFor="year-group-select"
                className="text-sm font-semibold text-primaryText block text-left"
              >
                KS2 Year Group
              </label>
              <select
                id="year-group-select"
                value={yearGroup}
                onChange={(e) =>
                  setYearGroup(
                    e.target.value as "Year 3" | "Year 4" | "Year 5" | "Year 6"
                  )
                }
                className="w-full px-4 py-2.5 rounded-island bg-canvas border border-borderMuted text-primaryText font-medium text-base focus-visible:outline focus-visible:outline-3 focus-visible:outline-focusIndicator"
              >
                <option value="Year 3">Year 3 (Ages 7–8)</option>
                <option value="Year 4">Year 4 (Ages 8–9)</option>
                <option value="Year 5">Year 5 (Ages 9–10)</option>
                <option value="Year 6">Year 6 (Ages 10–11)</option>
              </select>
            </div>
          </div>

          {/* 2. PUPIL ACCOUNT FINANCIAL SETTINGS: OPENING BALANCE & MINIMUM BASIC INCOME */}
          <div className="bg-canvas p-5 rounded-island border border-borderMuted space-y-4 text-left">
            <div className="flex items-center gap-2 text-left">
              <Coins className="w-5 h-5 text-brandPrimary flex-shrink-0" />
              <div>
                <h3 className="text-base font-bold text-primaryText text-left">
                  Account Opening Balance &amp; Minimum Basic Income
                </h3>
                <p className="text-xs text-primaryText/70 text-left">
                  Set starting card funds and weekly allowance schedule applied across all new student accounts.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
              {/* A. Account Opening Balance */}
              <div className="bg-surface p-4 rounded-island border border-borderMuted space-y-2.5 text-left">
                <div className="space-y-0.5 text-left">
                  <label
                    htmlFor="opening-balance-input"
                    className="text-sm font-bold text-primaryText block text-left"
                  >
                    Account Opening Balance <span className="text-brandPrimary">*</span>
                  </label>
                  <p className="text-xs text-primaryText/70 text-left">
                    Starting card balance given to children upon account creation.
                  </p>
                </div>

                <div className="flex items-center gap-2 text-left">
                  <span className="text-lg font-bold text-brandPrimary">£</span>
                  <input
                    id="opening-balance-input"
                    type="number"
                    step="0.50"
                    min="0"
                    required
                    value={openingBalanceInput}
                    onChange={(e) => setOpeningBalanceInput(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-island bg-canvas border border-borderMuted text-primaryText font-bold text-base focus-visible:outline focus-visible:outline-3 focus-visible:outline-focusIndicator"
                    placeholder="5.00"
                  />
                </div>

                {/* Quick preset chips */}
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-left">
                  <span className="text-[11px] font-semibold text-primaryText/60">Presets:</span>
                  {["0.00", "2.00", "5.00", "10.00"].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setOpeningBalanceInput(preset)}
                      className={`px-2.5 py-0.5 rounded-lg text-xs font-bold transition-all ${
                        openingBalanceInput === preset
                          ? "bg-brandPrimary text-white shadow-xs"
                          : "bg-canvas text-primaryText/70 hover:bg-tealSurface border border-borderMuted"
                      }`}
                    >
                      £{preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* B. Minimum Basic Income & Payout Day */}
              <div className="bg-surface p-4 rounded-island border border-borderMuted space-y-2.5 text-left">
                <div className="space-y-0.5 text-left">
                  <label
                    htmlFor="weekly-income-input"
                    className="text-sm font-bold text-primaryText block text-left"
                  >
                    Minimum Basic Income (Weekly) <span className="text-brandSecondary">*</span>
                  </label>
                  <p className="text-xs text-primaryText/70 text-left">
                    Guaranteed weekly allowance credited to each child&apos;s card.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-left">
                  {/* Amount Input */}
                  <div>
                    <label htmlFor="weekly-income-input" className="text-[11px] font-bold text-primaryText/60 block mb-1">
                      Weekly Amount (£)
                    </label>
                    <div className="flex items-center gap-1.5">
                      <span className="text-base font-bold text-brandSecondary">£</span>
                      <input
                        id="weekly-income-input"
                        type="number"
                        step="0.50"
                        min="0"
                        required
                        value={weeklyIncomeInput}
                        onChange={(e) => setWeeklyIncomeInput(e.target.value)}
                        className="w-full px-3 py-2 rounded-island bg-canvas border border-borderMuted text-primaryText font-bold text-base focus-visible:outline focus-visible:outline-3 focus-visible:outline-focusIndicator"
                        placeholder="2.00"
                      />
                    </div>
                  </div>

                  {/* Payout Day Selector */}
                  <div>
                    <label htmlFor="payout-day-select" className="text-[11px] font-bold text-primaryText/60 block mb-1">
                      Paid Every
                    </label>
                    <select
                      id="payout-day-select"
                      value={payoutDayInput}
                      onChange={(e) =>
                        setPayoutDayInput(
                          e.target.value as "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday"
                        )
                      }
                      className="w-full px-3 py-2 rounded-island bg-canvas border border-borderMuted text-primaryText font-bold text-sm focus-visible:outline focus-visible:outline-3 focus-visible:outline-focusIndicator"
                    >
                      <option value="Monday">Monday</option>
                      <option value="Tuesday">Tuesday</option>
                      <option value="Wednesday">Wednesday</option>
                      <option value="Thursday">Thursday</option>
                      <option value="Friday">Friday</option>
                    </select>
                  </div>
                </div>

                {/* Quick preset chips */}
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-left">
                  <span className="text-[11px] font-semibold text-primaryText/60">Presets:</span>
                  {["1.00", "2.00", "3.00", "5.00"].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setWeeklyIncomeInput(preset)}
                      className={`px-2.5 py-0.5 rounded-lg text-xs font-bold transition-all ${
                        weeklyIncomeInput === preset
                          ? "bg-brandSecondary text-white shadow-xs"
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

          {/* 3. ANONYMISATION / FIRST NAME OPTION */}
          <div className="space-y-3 text-left bg-canvas p-5 rounded-island border border-borderMuted">
            <span className="text-sm font-bold text-primaryText block text-left">
              Roster Privacy &amp; Display Mode
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
              {/* Option A: Full Anonymization */}
              <label
                className={`p-4 rounded-island border-2 cursor-pointer transition-all flex items-start gap-3 text-left ${
                  namingOption === "anonymize"
                    ? "border-brandPrimary bg-surface shadow-sm"
                    : "border-borderMuted bg-surface/60 hover:bg-surface"
                }`}
              >
                <input
                  type="radio"
                  name="naming-option"
                  value="anonymize"
                  checked={namingOption === "anonymize"}
                  onChange={() => setNamingOption("anonymize")}
                  className="mt-1 text-brandPrimary focus:ring-brandPrimary"
                />
                <div className="space-y-1 text-left">
                  <div className="flex items-center gap-1.5 text-left">
                    <VenetianMask className="w-4 h-4 text-brandPrimary" />
                    <span className="text-sm font-bold text-primaryText text-left">
                      Anonymise Names (Recommended)
                    </span>
                  </div>
                  <p className="text-xs text-primaryText/75 text-left leading-relaxed">
                    Pupils receive fun animal codenames (e.g. <em>Calm River Otter #101</em>). Zero real names are saved.
                  </p>
                </div>
              </label>

              {/* Option B: Use First Name */}
              <label
                className={`p-4 rounded-island border-2 cursor-pointer transition-all flex items-start gap-3 text-left ${
                  namingOption === "first_name"
                    ? "border-brandSecondary bg-surface shadow-sm"
                    : "border-borderMuted bg-surface/60 hover:bg-surface"
                }`}
              >
                <input
                  type="radio"
                  name="naming-option"
                  value="first_name"
                  checked={namingOption === "first_name"}
                  onChange={() => setNamingOption("first_name")}
                  className="mt-1 text-brandSecondary focus:ring-brandSecondary"
                />
                <div className="space-y-1 text-left">
                  <div className="flex items-center gap-1.5 text-left">
                    <UserCheck className="w-4 h-4 text-brandSecondary" />
                    <span className="text-sm font-bold text-primaryText text-left">
                      Use First Name (Local Device Only)
                    </span>
                  </div>
                  <p className="text-xs text-primaryText/75 text-left leading-relaxed">
                    Displays entered first names on your screen and pupil desk cards for classroom recognition.
                  </p>
                </div>
              </label>
            </div>

            {/* MANDATORY TEACHER REMINDER BANNER */}
            <div className="p-4 rounded-island bg-amberSurface border border-brandSecondary/30 flex items-start gap-3 text-left">
              <ShieldAlert className="w-5 h-5 text-brandSecondary mt-0.5 flex-shrink-0" />
              <div className="space-y-1 text-left">
                <span className="text-xs font-bold uppercase tracking-wider text-brandSecondary block text-left">
                  Classroom Privacy Notice
                </span>
                <p className="text-sm text-primaryText/90 text-left leading-relaxed">
                  {namingOption === "first_name" ? (
                    <>
                      First names are stored <strong>strictly on your local device</strong> on this computer for easy classroom recognition. See the <strong>FAQs</strong> section for full safeguarding details.
                    </>
                  ) : (
                    <>
                      Full anonymization active. All pupil accounts use friendly nature codenames.
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* 3. SEPARATE BOXES FOR EACH CHILD'S NAME (STARTS WITH 5 + ADD MORE) */}
          <div className="space-y-3 text-left">
            <div className="flex items-center justify-between text-left">
              <div>
                <label className="text-sm font-bold text-primaryText block text-left">
                  Student Name Boxes ({pupilNameBoxes.length} Slots)
                </label>
                <p className="text-xs text-primaryText/70 text-left">
                  Enter a first name or nickname in each box. You can add more boxes as needed.
                </p>
              </div>
              <span className="text-xs font-semibold text-brandPrimary bg-tealSurface px-2.5 py-1 rounded-full border border-brandPrimary/25">
                {pupilNameBoxes.filter((n) => n.trim().length > 0).length} Named
              </span>
            </div>

            {/* Grid of Individual Name Boxes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-left">
              {pupilNameBoxes.map((name, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 p-2 rounded-island bg-canvas border border-borderMuted hover:border-brandPrimary/50 transition-colors text-left"
                >
                  <span className="w-7 h-7 rounded-lg bg-surface text-primaryText/70 font-bold text-xs flex items-center justify-center border border-borderMuted flex-shrink-0">
                    #{index + 1}
                  </span>

                  <input
                    type="text"
                    value={name}
                    onChange={(e) => handleBoxChange(index, e.target.value)}
                    placeholder={`Child ${index + 1} Name`}
                    aria-label={`Child ${index + 1} Name`}
                    className="flex-1 bg-transparent border-none text-primaryText text-sm font-medium focus:ring-0 focus:outline-none placeholder:text-primaryText/40 text-left"
                  />

                  {pupilNameBoxes.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveBox(index)}
                      title={`Remove Box ${index + 1}`}
                      className="p-1.5 rounded text-primaryText/50 hover:text-brandSecondary hover:bg-surface transition-colors focus-visible:outline focus-visible:outline-3 focus-visible:outline-focusIndicator"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* ADD MORE BUTTON */}
            <div className="flex items-center gap-3 pt-1 text-left">
              <button
                type="button"
                onClick={handleAddMoreBoxes}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-island bg-surface hover:bg-canvas border border-borderMuted hover:border-brandPrimary text-primaryText font-semibold text-sm transition-all focus-visible:outline focus-visible:outline-3 focus-visible:outline-focusIndicator active:scale-98 text-left"
              >
                <Plus className="w-4 h-4 text-brandPrimary" />
                <span>+ Add More Pupils</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  setPupilNameBoxes((prev) => [...prev, "", "", "", "", ""])
                }
                className="text-xs font-semibold text-primaryText/70 hover:text-brandPrimary underline text-left"
              >
                + Add 5 Boxes
              </button>
            </div>
          </div>

          {/* Form Error Notice (Warm Amber & Slate Navy, No Alarmist Red) */}
          {formError && (
            <div
              role="alert"
              className="p-4 rounded-island bg-amberSurface border border-brandSecondary/40 text-primaryText flex items-center gap-3 text-left"
            >
              <AlertCircle className="w-5 h-5 text-brandSecondary flex-shrink-0" />
              <p className="text-sm font-bold text-left">{formError}</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isDuplicateName || !classNameInput.trim()}
            className={`flex items-center gap-2 px-6 py-3.5 rounded-island font-bold text-base shadow-sm transition-all text-left focus-visible:outline focus-visible:outline-3 focus-visible:outline-focusIndicator active:scale-98 ${
              isDuplicateName || !classNameInput.trim()
                ? "bg-canvas text-primaryText/40 cursor-not-allowed border border-borderMuted"
                : "bg-brandPrimary hover:bg-brandPrimary/90 text-white"
            }`}
          >
            <PlusCircle className="w-5 h-5" />
            <span>Create Class &amp; Generate Roster</span>
          </button>
        </form>

        {showCreationSuccess && (
          <div
            role="status"
            className="p-4 rounded-island bg-greenSurface border border-positiveState/30 text-positiveState flex items-center gap-3 text-left animate-in fade-in"
          >
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-bold text-left">
              Class &amp; Roster successfully created! Unique 6-digit Join Code assigned.
            </p>
          </div>
        )}
      </section>

      {/* 4. CLASS SELECTOR, 6-DIGIT JOIN CODE BANNER & CLASS ACTIONS */}
      {activeClass && (
        <section className="bg-surface rounded-pot p-4 sm:p-6 md:p-8 border border-borderMuted shadow-islandCard space-y-6 text-left">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-borderMuted pb-5 text-left">
            <div className="space-y-1 text-left">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-brandSecondary bg-amberSurface px-2.5 py-0.5 rounded-full border border-brandSecondary/25">
                  {activeClass.yearGroup}
                </span>
                <span className="text-xs text-primaryText/60">
                  {classPupils.length} Enrolled Pupils
                </span>
              </div>
              <h3 className="text-2xl font-bold text-primaryText text-left">
                {activeClass.className} Roster
              </h3>
            </div>

            {/* Class Actions & Join Code Island */}
            <div className="flex flex-wrap items-center gap-3 text-left">
              {/* 6-DIGIT JOIN CODE ISLAND */}
              <div className="flex items-center gap-3 bg-canvas p-3 rounded-island border border-borderMuted text-left">
                <div className="text-left">
                  <span className="text-[11px] uppercase tracking-wider font-bold text-primaryText/60 block text-left">
                    6-Digit Join Code
                  </span>
                  {/* Isolated 24sp numerical island */}
                  <span className="text-island text-brandPrimary tracking-wider font-mono block text-left">
                    {activeClass.classJoinCode}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleCopyCode}
                  title="Copy Join Code"
                  className="p-2.5 rounded-lg bg-surface hover:bg-canvas text-primaryText/80 hover:text-brandPrimary border border-borderMuted transition-colors focus-visible:outline focus-visible:outline-3 focus-visible:outline-focusIndicator text-left"
                >
                  {copyCodeSuccess ? (
                    <CheckCircle2 className="w-5 h-5 text-positiveState" />
                  ) : (
                    <Copy className="w-5 h-5" />
                  )}
                </button>
              </div>

              {/* DELETE CLASS ACTION BUTTON */}
              <button
                type="button"
                onClick={() => setIsDeletingClass(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-3 rounded-island bg-amberSurface hover:bg-[#FEF3C7] text-warningState border border-brandSecondary/30 font-bold text-xs transition-all shadow-xs focus-visible:outline focus-visible:outline-3 focus-visible:outline-focusIndicator active:scale-98 text-left"
                title={`Delete entire class ${activeClass.className}`}
              >
                <Trash2 className="w-4 h-4 text-warningState" />
                <span>Delete Class</span>
              </button>
            </div>
          </div>

          {/* Quick Class Switcher tabs if multiple exist */}
          {classes.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-left">
              <span className="text-xs font-semibold text-primaryText/60 flex-shrink-0">
                Switch Class:
              </span>
              {classes.map((c) => (
                <button
                  key={c.classId}
                  type="button"
                  onClick={() => {
                    setSelectedClassId(c.classId);
                    if (onSelectClassId) onSelectClassId(c.classId);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all text-left focus-visible:outline focus-visible:outline-3 focus-visible:outline-focusIndicator ${
                    c.classId === activeClass.classId
                      ? "bg-brandPrimary text-white shadow-sm"
                      : "bg-canvas text-primaryText/70 hover:bg-surface border border-borderMuted"
                  }`}
                >
                  {c.className} ({c.classJoinCode})
                </button>
              ))}
            </div>
          )}

          {/* Action Success Toast */}
          {actionSuccessMessage && (
            <div
              role="status"
              className="p-4 rounded-island bg-amberSurface border border-brandSecondary/30 text-primaryText flex items-center gap-3 text-left animate-in fade-in"
            >
              <CheckCircle2 className="w-5 h-5 text-brandSecondary flex-shrink-0" />
              <p className="text-sm font-bold text-left">{actionSuccessMessage}</p>
            </div>
          )}

          {/* CLASS FINANCIAL POLICIES & MINIMUM BASIC INCOME PANEL */}
          <div className="bg-canvas p-5 rounded-island border border-borderMuted flex flex-col md:flex-row md:items-center justify-between gap-4 text-left">
            <div className="space-y-1.5 text-left">
              <div className="flex flex-wrap items-center gap-2 text-left">
                <Coins className="w-5 h-5 text-brandSecondary flex-shrink-0" />
                <h4 className="text-base font-bold text-primaryText text-left">
                  Minimum Basic Income: {formatCurrency(activeClass.weeklyBasicIncomeCents ?? 200)} / week
                </h4>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amberSurface text-brandSecondary font-bold border border-brandSecondary/30">
                  Every {activeClass.payoutDay ?? "Monday"}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-primaryText/70 text-left">
                <span>
                  Initial Opening Deposit: <strong className="text-primaryText">{formatCurrency(activeClass.initialOpeningBalanceCents ?? 500)}</strong>
                </span>
                <span>•</span>
                <span>
                  {activeClass.lastPayoutTimestamp ? (
                    <>
                      Last automated payout:{" "}
                      <strong className="text-primaryText">
                        {new Date(activeClass.lastPayoutTimestamp).toLocaleDateString("en-GB", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </strong>
                    </>
                  ) : (
                    <>
                      Next automated payout:{" "}
                      <strong className="text-brandSecondary">
                        {getNextScheduledPayoutTime(activeClass.payoutDay ?? "Monday").toLocaleDateString("en-GB", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                        })}{" "}
                        at 08:00
                      </strong>
                    </>
                  )}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 text-left">
              {/* Automated Cloud Scheduler Active Pill (No Manual Button) */}
              <div
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-island bg-tealSurface border border-brandPrimary/30 text-brandPrimary font-bold text-xs shadow-xs text-left"
                title={`Fully automated: ${formatCurrency(activeClass.weeklyBasicIncomeCents ?? 200)} deposited to all pupils every ${activeClass.payoutDay ?? "Monday"} at 08:00`}
              >
                <Clock className="w-3.5 h-3.5 text-brandPrimary animate-pulse" />
                <span>Automated: Every {activeClass.payoutDay ?? "Monday"} at 08:00</span>
              </div>

              {/* Adjust Policy Button */}
              <button
                type="button"
                onClick={handleOpenEditIncomeModal}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-island bg-surface hover:bg-canvas border border-borderMuted text-primaryText font-bold text-xs transition-colors focus-visible:outline focus-visible:outline-3 focus-visible:outline-focusIndicator text-left"
                title="Adjust weekly allowance amount or payout day"
              >
                <Sliders className="w-4 h-4 text-primaryText/70" />
                <span>Adjust Policy</span>
              </button>
            </div>
          </div>

          {/* 5. ENROLLED STUDENT ROSTER WITH PRIVACY BADGES & DUAL BALANCES */}
          <div className="space-y-4 text-left">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left">
              <div>
                <h4 className="text-base font-bold text-primaryText text-left">
                  Enrolled Student Accounts ({classPupils.length})
                </h4>
                <span className="text-xs text-primaryText/60 text-left">
                  Strict Zero-PII on Cloud Servers &bull; UUID v4 Isolated
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsSingleAddOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-tealSurface hover:bg-tealSurface/80 text-brandPrimary border border-brandPrimary/30 font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all"
                  title="Add single student account to this class"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>+ Add Student</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsCsvUploadOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-canvas hover:bg-tealSurface text-primaryText/80 hover:text-brandPrimary border border-borderMuted hover:border-brandPrimary/30 font-bold text-xs flex items-center gap-1.5 transition-all"
                  title="Upload CSV classlist from school MIS"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-positiveState" />
                  <span>Upload CSV Classlist</span>
                </button>

                {isAdmin && onOpenAssignModal && (
                  <button
                    type="button"
                    onClick={() => onOpenAssignModal(activeClass)}
                    className="px-3 py-1.5 rounded-xl bg-canvas hover:bg-tealSurface text-primaryText/80 hover:text-brandPrimary border border-borderMuted hover:border-brandPrimary/30 font-bold text-xs flex items-center gap-1.5 transition-all"
                    title="Assign teachers to this class"
                  >
                    <Users className="w-3.5 h-3.5 text-focusIndicator" />
                    <span>Assign Staff</span>
                  </button>
                )}
              </div>
            </div>

            {classPupils.length === 0 ? (
              <div className="p-6 sm:p-8 rounded-2xl bg-canvas border-2 border-dashed border-brandPrimary/30 text-left space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-brandPrimary" />
                      <h5 className="text-lg font-bold text-primaryText">
                        Welcome to {activeClass.className}! Your Classroom is Ready to Setup
                      </h5>
                    </div>
                    <p className="text-xs text-primaryText/70">
                      As the classroom teacher, you can generate your pupil roster in whichever format suits you best.
                    </p>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-tealSurface text-brandPrimary font-bold border border-brandPrimary/30 shrink-0 self-start">
                    Join Code: {activeClass.classJoinCode}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCsvUploadOpen(true)}
                    className="p-4 rounded-xl bg-surface border border-borderMuted hover:border-positiveState/60 hover:bg-greenSurface/30 transition-all text-left space-y-1 shadow-2xs group"
                  >
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-positiveState" />
                      <strong className="text-xs font-bold text-primaryText group-hover:text-positiveState">
                        Upload Classlist CSV
                      </strong>
                    </div>
                    <p className="text-[11px] text-primaryText/60">
                      Export your class from your school MIS (SIMS, Arbor, Bromcom) with zero PII retained.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsSingleAddOpen(true)}
                    className="p-4 rounded-xl bg-surface border border-borderMuted hover:border-brandPrimary/60 hover:bg-tealSurface/30 transition-all text-left space-y-1 shadow-2xs group"
                  >
                    <div className="flex items-center gap-2">
                      <UserPlus className="w-4 h-4 text-brandPrimary" />
                      <strong className="text-xs font-bold text-primaryText group-hover:text-brandPrimary">
                        Add Pupils Individually
                      </strong>
                    </div>
                    <p className="text-[11px] text-primaryText/60">
                      Quickly type child names or codenames one by one with desk badges and opening balances.
                    </p>
                  </button>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-borderMuted border border-borderMuted rounded-island overflow-hidden bg-surface">
                {classPupils.map((pupil) => {
                  const pupilPots = pots.filter((p) => p.pupilId === pupil.pupilId);
                  const hasLocalName = Boolean(pupil.localDisplayName);

                  return (
                    <div
                      key={pupil.pupilId}
                      className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-canvas/50 transition-colors text-left"
                    >
                      {/* Pupil Identity with Local Name & Animal Codename */}
                      <div className="flex items-center gap-3.5 text-left">
                        <div className="w-10 h-10 rounded-full bg-tealSurface border border-brandPrimary/30 flex items-center justify-center text-brandPrimary font-bold text-sm flex-shrink-0">
                          #{pupil.deskBadgeNumber}
                        </div>

                        <div className="text-left space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-base font-bold text-primaryText text-left">
                              {hasLocalName
                                ? pupil.localDisplayName
                                : pupil.educationalCodename}
                            </span>

                            {hasLocalName ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amberSurface text-brandSecondary border border-brandSecondary/30">
                                Local Name
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-tealSurface text-brandPrimary border border-brandPrimary/30">
                                Anonymised
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-xs text-primaryText/60">
                            {hasLocalName && (
                              <span className="font-medium text-primaryText/70">
                                Codename: {pupil.educationalCodename} •{" "}
                              </span>
                            )}
                            <span className="font-mono">
                              UUID: {pupil.pupilId.slice(0, 8)}...
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Stored Balances: Live Card Balance alongside Money in Savings Pots & Employment */}
                      <div className="flex flex-wrap items-center gap-2.5 text-left">
                        {/* 1. Live Card Balance Island (>= 24sp / text-island) */}
                        <div className="bg-canvas px-3.5 py-2 rounded-island border border-borderMuted text-left min-w-[120px]">
                          <span className="text-[10px] uppercase font-bold text-primaryText/60 block text-left">
                            Live Balance
                          </span>
                          <span className="text-island text-brandPrimary font-bold block text-left">
                            {formatCurrency(pupil.mainBalanceCents ?? 0)}
                          </span>
                        </div>

                        {/* 2. Money Saved in Pots Island (>= 24sp / text-island) */}
                        <div className="bg-canvas px-3.5 py-2 rounded-island border border-borderMuted text-left min-w-[120px]">
                          <span className="text-[10px] uppercase font-bold text-primaryText/60 block text-left">
                            In Savings Pots
                          </span>
                          <span className="text-island text-brandSecondary font-bold block text-left">
                            {formatCurrency(pupil.totalSavedCents ?? 0)}
                          </span>
                        </div>

                        {/* 3. Employment & Job History Island */}
                        {(() => {
                          const activeJob = getActiveJobForPupil(pupil.pupilId);
                          const completedJobs = getCompletedJobsForPupil(pupil.pupilId);
                          const hasHadOrHasJob = Boolean(activeJob || (completedJobs && completedJobs.length > 0));

                          return (
                            <div
                              className={`px-3.5 py-2 rounded-island border text-left min-w-[175px] max-w-[240px] flex flex-col justify-between ${
                                hasHadOrHasJob
                                  ? "bg-greenSurface/40 border-positiveState/30"
                                  : "bg-amberSurface/40 border-brandSecondary/30"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1.5">
                                <span className="text-[10px] uppercase font-bold text-primaryText/60 block text-left">
                                  Classroom Role
                                </span>
                                {activeJob ? (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-greenSurface text-positiveState border border-positiveState/30">
                                    Active
                                  </span>
                                ) : completedJobs.length > 0 ? (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-tealSurface text-brandPrimary border border-brandPrimary/30">
                                    Alum
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amberSurface text-brandSecondary border border-brandSecondary/30">
                                    Available
                                  </span>
                                )}
                              </div>
                              <div className="mt-1 space-y-0.5">
                                <div
                                  className="text-xs font-bold text-primaryText truncate"
                                  title={activeJob ? activeJob.title : "No active role"}
                                >
                                  {activeJob ? (
                                    <span className="text-positiveState font-bold flex items-center gap-1">
                                      <Briefcase className="w-3 h-3 flex-shrink-0" />
                                      <span className="truncate">{activeJob.title}</span>
                                    </span>
                                  ) : (
                                    <span className="text-primaryText/55">No active role</span>
                                  )}
                                </div>
                                <div
                                  className="text-[10px] text-primaryText/65 truncate"
                                  title={
                                    completedJobs.length > 0
                                      ? completedJobs.map((j) => j.title).join(", ")
                                      : "No prior roles"
                                  }
                                >
                                  {completedJobs.length > 0 ? (
                                    <span>
                                      <strong>Prev:</strong> {completedJobs.map((j) => j.title).join(", ")}
                                    </span>
                                  ) : (
                                    <span className="italic text-primaryText/50">Prev: None</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Action Buttons: Inspect View, Open Child View & Delete Pupil */}
                      <div className="flex items-center gap-2 text-left">
                        <button
                          type="button"
                          onClick={() => setInspectingPupil(pupil)}
                          className="flex items-center gap-1.5 px-3.5 py-2 rounded-island bg-tealSurface hover:bg-tealSurface/80 text-brandPrimary border border-brandPrimary/30 font-bold text-xs transition-all shadow-sm focus-visible:outline focus-visible:outline-3 focus-visible:outline-focusIndicator active:scale-98 text-left"
                          title="Open read-only inspection modal"
                        >
                          <Eye className="w-4 h-4" />
                          <span>Inspect</span>
                        </button>

                        <a
                          href={`/pupil/${pupil.pupilId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-island bg-surface hover:bg-canvas border border-borderMuted text-primaryText/70 hover:text-brandPrimary transition-colors focus-visible:outline focus-visible:outline-3 focus-visible:outline-focusIndicator text-left"
                          title="Open Child Fintech Card View in New Tab"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>

                        <button
                          type="button"
                          onClick={() => setPupilToDelete(pupil)}
                          className="p-2 rounded-island bg-surface hover:bg-amberSurface border border-borderMuted hover:border-brandSecondary/40 text-warningState transition-colors focus-visible:outline focus-visible:outline-3 focus-visible:outline-focusIndicator text-left"
                          title={`Delete pupil ${hasLocalName ? pupil.localDisplayName : pupil.educationalCodename}`}
                          aria-label={`Delete pupil ${hasLocalName ? pupil.localDisplayName : pupil.educationalCodename}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
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
                {pupilToDelete.localDisplayName || pupilToDelete.educationalCodename}
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

      {/* 9. ADJUST MINIMUM BASIC INCOME & PAYOUT DAY MODAL */}
      {isAdjustingIncomeModalOpen && activeClass && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primaryText/50 backdrop-blur-sm animate-in fade-in"
        >
          <div className="bg-surface w-full max-w-md rounded-[2rem] border-2 border-brandSecondary/40 p-5 sm:p-6 md:p-8 shadow-2xl text-left space-y-4">
            <div className="flex items-center gap-2.5 text-brandSecondary">
              <Sliders className="w-6 h-6 text-brandSecondary flex-shrink-0" />
              <h4 className="text-xl font-bold text-primaryText text-left">
                Adjust Minimum Basic Income
              </h4>
            </div>

            <p className="text-sm text-primaryText/85 text-left leading-relaxed">
              Update the guaranteed weekly basic income and payout schedule for{" "}
              <strong className="text-primaryText font-bold">
                {activeClass.className}
              </strong>.
            </p>

            <form onSubmit={handleSaveClassIncomeSettings} className="space-y-4 text-left">
              <div>
                <label htmlFor="edit-weekly-amount" className="text-xs font-bold text-primaryText/70 uppercase block mb-1">
                  Weekly Basic Income (£):
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
                    className="w-full px-3 py-2 rounded-island bg-canvas border border-borderMuted text-primaryText font-bold text-base focus-visible:outline focus-visible:outline-3 focus-visible:outline-focusIndicator"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="edit-payout-day" className="text-xs font-bold text-primaryText/70 uppercase block mb-1">
                  Weekly Payout Day:
                </label>
                <select
                  id="edit-payout-day"
                  value={editPayoutDay}
                  onChange={(e) =>
                    setEditPayoutDay(
                      e.target.value as "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday"
                    )
                  }
                  className="w-full px-3 py-2 rounded-island bg-canvas border border-borderMuted text-primaryText font-bold text-sm focus-visible:outline focus-visible:outline-3 focus-visible:outline-focusIndicator"
                >
                  <option value="Monday">Monday</option>
                  <option value="Tuesday">Tuesday</option>
                  <option value="Wednesday">Wednesday</option>
                  <option value="Thursday">Thursday</option>
                  <option value="Friday">Friday</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 text-left">
                <button
                  type="button"
                  onClick={() => setIsAdjustingIncomeModalOpen(false)}
                  className="py-2.5 px-4 rounded-island border border-borderMuted text-primaryText text-xs font-bold hover:bg-canvas transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-2.5 px-4 rounded-island bg-brandSecondary hover:bg-amber-700 text-white text-xs font-bold shadow-sm transition-all"
                >
                  Save Policy
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
          setPupils((prev) => [newPupil, ...prev]);
          onPupilsChanged?.();
          setActionSuccessMessage(`Student ${newPupil.localDisplayName || newPupil.educationalCodename} enrolled!`);
          setTimeout(() => setActionSuccessMessage(null), 4000);
        }}
      />

      {/* 5. CSV CLASSLIST UPLOAD MODAL (Requirement 1d) */}
      <CsvClasslistUploadModal
        isOpen={isCsvUploadOpen}
        activeClass={activeClass}
        onClose={() => setIsCsvUploadOpen(false)}
        onPupilsEnrolled={(newPupils) => {
          setPupils((prev) => [...newPupils, ...prev]);
          onPupilsChanged?.();
          setActionSuccessMessage(`${newPupils.length} students enrolled via CSV!`);
          setTimeout(() => setActionSuccessMessage(null), 4000);
        }}
      />
    </div>
  );
};
