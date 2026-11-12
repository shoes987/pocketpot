"use client";

import React, { useState } from "react";
import {
  Sparkles,
  School,
  Users,
  Coins,
  Briefcase,
  Award,
  Check,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  X,
  Copy,
  Printer,
  Monitor,
  ShieldCheck,
  ArrowRight,
  AlertCircle,
  FileSpreadsheet,
  Upload,
} from "lucide-react";
import {
  setupClassroomWithWizard,
  ClassroomWizardConfig,
  StarterPotOption,
  StarterJobOption,
  StarterBehaviourOption,
  isClassNameDuplicate,
} from "@/lib/services/class-service";
import { formatCurrency } from "@/lib/firebase/zero-pii";
import { ClassDocument, PupilDocument, UserDocument } from "@/lib/firebase/types";
import { getStaffUsers } from "@/lib/services/auth-service";
import {
  sanitizeClasslistCsv,
  CsvSafeguardingAuditResult,
} from "@/lib/services/csv-sanitizer";

interface SetupWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (newClass: ClassDocument, pupils: PupilDocument[], openWhiteboard?: boolean) => void;
}

const PRESET_POTS: StarterPotOption[] = [
  {
    title: "Zoo Wildlife Trip Pot",
    categoryLabel: "Nature & Animals",
    targetAmountCents: 2000,
    theme: "calmingTeal",
  },
  {
    title: "Class Planetarium Trip Pot",
    categoryLabel: "School Adventures",
    targetAmountCents: 2500,
    theme: "warmAmber",
  },
  {
    title: "Book Fair Reading Pot",
    categoryLabel: "Literacy & Books",
    targetAmountCents: 1500,
    theme: "sageGreen",
  },
  {
    title: "End-of-Term Celebration Pot",
    categoryLabel: "Class Milestones",
    targetAmountCents: 3000,
    theme: "calmingTeal",
  },
];

const PRESET_JOBS: StarterJobOption[] = [
  {
    title: "Classroom Librarian",
    description: "Organise reading corners, recommend books to classmates, and track loaned titles.",
    wageCents: 150,
    termWeeks: 4,
    requiredQualities: ["Reliable", "Organised"],
    cvPrompt: "Why would you be wonderful as our Classroom Librarian? Mention any favourite books!",
  },
  {
    title: "Plant & Nature Monitor",
    description: "Water classroom plants, ensure proper sunlight, and care for our science terrarium.",
    wageCents: 120,
    termWeeks: 4,
    requiredQualities: ["Caring", "Attentive"],
    cvPrompt: "Tell us how you will care for our living plants and why regular care matters!",
  },
  {
    title: "Tech & Tablet Helper",
    description: "Plug in classroom Chromebooks/tablets, verify charges, and keep headphones tidy.",
    wageCents: 150,
    termWeeks: 4,
    requiredQualities: ["Helpful", "Responsible"],
    cvPrompt: "Explain how you will look after our classroom tech devices safely and reliably.",
  },
  {
    title: "Door & Line Ambassador",
    description: "Greet visitors, hold doors safely during transitions, and lead line walking.",
    wageCents: 100,
    termWeeks: 4,
    requiredQualities: ["Polite", "Role Model"],
    cvPrompt: "How will you model polite, calm behaviour as our classroom ambassador?",
  },
];

const PRESET_BEHAVIOURS: StarterBehaviourOption[] = [
  {
    title: "Kind Helper",
    definition: "Kindness",
    amountCents: 10,
    icon: "🤝",
    colorTheme: "sageGreen",
  },
  {
    title: "Great Focus",
    definition: "Focus",
    amountCents: 15,
    icon: "🎯",
    colorTheme: "calmingTeal",
  },
  {
    title: "Team Player",
    definition: "Teamwork",
    amountCents: 20,
    icon: "⭐",
    colorTheme: "warmAmber",
  },
  {
    title: "Tidy Space",
    definition: "Responsibility",
    amountCents: 10,
    icon: "🧹",
    colorTheme: "sageGreen",
  },
  {
    title: "Creative Spark",
    definition: "Creativity",
    amountCents: 15,
    icon: "💡",
    colorTheme: "electricIndigo",
  },
  {
    title: "Kept Trying",
    definition: "Perseverance",
    amountCents: 20,
    icon: "🌱",
    colorTheme: "calmingTeal",
  },
];

export function SetupWizardModal({ isOpen, onClose, onComplete }: SetupWizardModalProps) {
  // Current Step (1 to 6)
  const [step, setStep] = useState<number>(1);

  // Form State - Start blank without pre-populated class name
  const [className, setClassName] = useState("");
  const [yearGroup, setYearGroup] = useState<"Year 3" | "Year 4" | "Year 5" | "Year 6">("Year 4");
  const [weeklyBasicIncomeCents, setWeeklyBasicIncomeCents] = useState<number>(500); // £5.00
  const [payoutDay, setPayoutDay] = useState<"Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday">("Friday");
  const [initialOpeningBalanceCents, setInitialOpeningBalanceCents] = useState<number>(500); // £5.00

  // Staff Assignment State (Requirement 2 & 3: Assign teacher as part of classroom setup)
  const [staffList] = useState<UserDocument[]>(() => {
    try {
      return getStaffUsers();
    } catch {
      return [];
    }
  });
  const [selectedLeadTeacherId, setSelectedLeadTeacherId] = useState<string>("");
  const [isNewTeacherMode, setIsNewTeacherMode] = useState<boolean>(false);
  const [newTeacherEmail, setNewTeacherEmail] = useState<string>("");
  const [newTeacherName, setNewTeacherName] = useState<string>("");

  // Step 2: Roster & CSV Ingestion
  const [studentCount, setStudentCount] = useState<number>(24);
  const [anonymizeNames, setAnonymizeNames] = useState<boolean>(true);
  const [pastedNames, setPastedNames] = useState<string>("Leo, Maya, Sam, Sophie, Jordan, Chloe, Liam, Emma");
  const [csvAuditResult, setCsvAuditResult] = useState<CsvSafeguardingAuditResult | null>(null);
  const [csvFileName, setCsvFileName] = useState<string | null>(null);

  const handleCsvUpload = (file: File) => {
    if (!file.name.endsWith(".csv") && !file.name.endsWith(".txt")) {
      setErrorMsg("Please upload a valid .csv spreadsheet file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = (e.target?.result as string) || "";
      const result = sanitizeClasslistCsv(content, file.name);
      if (!result.isValid) {
        setErrorMsg(result.errorMessage || "Unable to read rows from CSV.");
        setCsvAuditResult(null);
      } else {
        setCsvAuditResult(result);
        setCsvFileName(file.name);
        setStudentCount(result.extractedFirstNames.length);
        setPastedNames(result.extractedFirstNames.join(", "));
        setErrorMsg(null);
      }
    };
    reader.readAsText(file);
  };

  const handleLoadSampleMis = () => {
    const sample =
      "Surname,Forename,DOB,UPN,Home_Address,Medical_Flag\n" +
      "Smith,Lucas,12/04/2015,E801234567,14 High Street,No\n" +
      "Patel,Aaliyah,05/09/2014,E801987654,22 Church Road,Asthma\n" +
      "Davies,Noah,23/01/2015,E801456123,8 Park Avenue,No\n" +
      "Taylor,Chloe,17/07/2014,E801654987,5 Station Road,No\n" +
      "Wilson,Ethan,19/11/2014,E801789123,12 Meadow Way,No\n" +
      "Brown,Freya,02/03/2015,E801321654,7 Elm Close,No";
    const result = sanitizeClasslistCsv(sample, "sample-mis-export.csv");
    if (result.isValid) {
      setCsvAuditResult(result);
      setCsvFileName("sample-mis-export.csv");
      setStudentCount(result.extractedFirstNames.length);
      setPastedNames(result.extractedFirstNames.join(", "));
      setErrorMsg(null);
    }
  };

  // Step 3: Starter Pots Selection
  const [selectedPots, setSelectedPots] = useState<StarterPotOption[]>([
    PRESET_POTS[0],
    PRESET_POTS[1],
  ]);

  // Step 4: Starter Jobs Selection
  const [selectedJobs, setSelectedJobs] = useState<StarterJobOption[]>([
    PRESET_JOBS[0],
    PRESET_JOBS[1],
    PRESET_JOBS[2],
  ]);

  // Step 5: Starter Behaviours Selection
  const [selectedBehaviours, setSelectedBehaviours] = useState<StarterBehaviourOption[]>([
    PRESET_BEHAVIOURS[0],
    PRESET_BEHAVIOURS[1],
    PRESET_BEHAVIOURS[2],
    PRESET_BEHAVIOURS[3],
  ]);

  // Launch Results State
  const [createdClass, setCreatedClass] = useState<ClassDocument | null>(null);
  const [createdPupils, setCreatedPupils] = useState<PupilDocument[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [showPrintView, setShowPrintView] = useState<boolean>(false);

  if (!isOpen) return null;

  // Execute Complete Classroom Provisioning
  const handleFinalize = () => {
    setErrorMsg(null);
    const trimmedName = className.trim();
    if (!trimmedName) {
      setErrorMsg("Please enter a class name (e.g. Year 4 Teal).");
      setStep(1);
      return;
    }

    if (isClassNameDuplicate(trimmedName)) {
      setErrorMsg(`A class named "${trimmedName}" already exists. Please choose a different name.`);
      setStep(1);
      return;
    }

    try {
      const parsedNames = pastedNames
        .split(/[,\n]/)
        .map((n) => n.trim())
        .filter((n) => n.length > 0);

      const config: ClassroomWizardConfig = {
        className: trimmedName,
        yearGroup,
        leadTeacherId: !isNewTeacherMode && selectedLeadTeacherId ? selectedLeadTeacherId : undefined,
        newTeacherEmail: isNewTeacherMode && newTeacherEmail.trim() ? newTeacherEmail.trim().toLowerCase() : undefined,
        newTeacherDisplayName: isNewTeacherMode && newTeacherName.trim() ? newTeacherName.trim() : undefined,
        studentCount,
        studentNames: anonymizeNames ? [] : parsedNames,
        anonymizeNames,
        initialOpeningBalanceCents,
        weeklyBasicIncomeCents,
        payoutDay,
        starterPots: selectedPots,
        starterJobs: selectedJobs,
        starterBehaviours: selectedBehaviours,
      };

      const result = setupClassroomWithWizard(config);
      setCreatedClass(result.newClass);
      setCreatedPupils(result.pupils);
      setStep(6); // Go to Launchpad
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to set up class.";
      setErrorMsg(msg);
    }
  };

  // 1-Click Fast Track with Recommended KS2 Defaults
  const handleFastTrack1Click = () => {
    setClassName("Year 4 Teal");
    setYearGroup("Year 4");
    setStudentCount(24);
    setAnonymizeNames(true);
    setWeeklyBasicIncomeCents(500);
    setPayoutDay("Friday");
    setInitialOpeningBalanceCents(500);
    setSelectedPots([PRESET_POTS[0], PRESET_POTS[1]]);
    setSelectedJobs([PRESET_JOBS[0], PRESET_JOBS[1], PRESET_JOBS[2]]);
    setSelectedBehaviours([PRESET_BEHAVIOURS[0], PRESET_BEHAVIOURS[1], PRESET_BEHAVIOURS[2], PRESET_BEHAVIOURS[3]]);

    try {
      // If "Year 4 Teal" is duplicate, generate a unique variant
      let finalName = "Year 4 Teal";
      if (isClassNameDuplicate(finalName)) {
        finalName = `Year 4 Teal (${Math.floor(10 + Math.random() * 90)})`;
      }

      const result = setupClassroomWithWizard({
        className: finalName,
        yearGroup: "Year 4",
        studentCount: 24,
        anonymizeNames: true,
        initialOpeningBalanceCents: 500,
        weeklyBasicIncomeCents: 500,
        payoutDay: "Friday",
        starterPots: [PRESET_POTS[0], PRESET_POTS[1]],
        starterJobs: [PRESET_JOBS[0], PRESET_JOBS[1], PRESET_JOBS[2]],
        starterBehaviours: [PRESET_BEHAVIOURS[0], PRESET_BEHAVIOURS[1], PRESET_BEHAVIOURS[2], PRESET_BEHAVIOURS[3]],
      });

      setCreatedClass(result.newClass);
      setCreatedPupils(result.pupils);
      setStep(6);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Quick setup encountered an issue.";
      setErrorMsg(msg);
    }
  };

  const copyJoinCode = () => {
    if (!createdClass) return;
    const code = createdClass.classJoinCode || createdClass.joinCode || "";
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-primaryText/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
    >
      <div className="bg-surface rounded-pot border border-borderMuted shadow-2xl p-5 sm:p-6 md:p-8 space-y-5 text-left my-4 sm:my-8 max-w-3xl w-full max-h-[92vh] overflow-y-auto font-lexend">
        {/* TOP HEADER & FAST-TRACK OPTION */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-borderMuted/60 pb-4 text-left">
          <div className="space-y-0.5 text-left">
            <div className="flex items-center gap-2 text-left">
              <span className="w-2.5 h-2.5 rounded-full bg-brandPrimary inline-block" />
              <span className="text-xs font-bold uppercase tracking-wider text-brandPrimary">
                PocketPot Setup Wizard
              </span>
            </div>
            <h2 className="text-2xl font-bold text-primaryText text-left">
              Classroom Onboarding
            </h2>
            <p className="text-xs text-primaryText/70 font-medium">
              Fast-track your class economy, jobs board, and reward cards in 60 seconds
            </p>
          </div>

          <div className="flex items-center gap-2">
            {step < 6 && (
              <button
                type="button"
                onClick={handleFastTrack1Click}
                className="px-3 py-1.5 rounded-xl bg-tealSurface hover:bg-tealSurface/80 text-brandPrimary border border-brandPrimary/30 text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
                title="Populate recommended KS2 defaults instantly"
              >
                <Sparkles className="w-3.5 h-3.5 text-brandPrimary" />
                <span>1-Click Quick Setup</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="text-primaryText/50 hover:text-primaryText text-2xl font-bold p-1 leading-none rounded-lg"
              aria-label="Close setup wizard"
            >
              &times;
            </button>
          </div>
        </div>

        {/* STEP PROGRESS INDICATOR (1-5) */}
        {step < 6 && (
          <div className="py-1">
            <div className="flex items-center justify-between text-xs font-bold mb-2">
              <span className="text-brandPrimary">
                Step {step} of 5:{" "}
                {step === 1 && "Class Identity & Schedule"}
                {step === 2 && "Pupil Roster & Safeguarding"}
                {step === 3 && "Starter Savings Pots"}
                {step === 4 && "Classroom Jobs Board"}
                {step === 5 && "Whiteboard Bonuses"}
              </span>
              <span className="text-primaryText/50">{Math.round((step / 5) * 100)}% Complete</span>
            </div>
            <div className="w-full bg-canvas rounded-full h-2 overflow-hidden border border-borderMuted">
              <div
                className="bg-brandPrimary h-full transition-all duration-300 rounded-full"
                style={{ width: `${(step / 5) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* ERROR BANNER */}
        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-amberSurface text-warningState border border-amber-300 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* STEP 1: CLASS IDENTITY & SCHEDULE */}
        {step === 1 && (
          <div className="space-y-4 text-left animate-in fade-in duration-150">
            <div>
              <label className="block text-xs font-bold uppercase text-primaryText/70 mb-1">
                Class Name
              </label>
              <input
                type="text"
                required
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                placeholder="e.g. Year 4 Teal, Year 5 Oak"
                className="w-full px-4 py-2.5 text-sm bg-canvas rounded-xl border border-borderMuted text-primaryText focus:outline-none focus:ring-2 focus:ring-brandPrimary font-bold"
              />
              <div className="flex flex-wrap gap-1.5 mt-2">
                <span className="text-[11px] text-primaryText/60 font-semibold self-center">Suggestions:</span>
                {["Year 4 Teal", "Year 5 Oak", "Year 6 Willow", "Sapphire Class"].map((name) => (
                  <button
                    type="button"
                    key={name}
                    onClick={() => setClassName(name)}
                    className="px-2 py-0.5 rounded-lg bg-canvas hover:bg-tealSurface text-xs font-medium text-primaryText/80 border border-borderMuted"
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-primaryText/70 mb-1">
                  Key Stage 2 Year Group
                </label>
                <select
                  value={yearGroup}
                  onChange={(e) => setYearGroup(e.target.value as any)}
                  className="w-full px-4 py-2.5 text-sm bg-canvas rounded-xl border border-borderMuted text-primaryText focus:outline-none focus:ring-2 focus:ring-brandPrimary font-bold"
                >
                  <option value="Year 3">Year 3 (Ages 7–8)</option>
                  <option value="Year 4">Year 4 (Ages 8–9)</option>
                  <option value="Year 5">Year 5 (Ages 9–10)</option>
                  <option value="Year 6">Year 6 (Ages 10–11)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-primaryText/70 mb-1">
                  Weekly Class Payout Day
                </label>
                <select
                  value={payoutDay}
                  onChange={(e) => setPayoutDay(e.target.value as any)}
                  className="w-full px-4 py-2.5 text-sm bg-canvas rounded-xl border border-borderMuted text-primaryText focus:outline-none focus:ring-2 focus:ring-brandPrimary font-bold"
                >
                  <option value="Friday">Friday (Recommended)</option>
                  <option value="Monday">Monday</option>
                  <option value="Wednesday">Wednesday</option>
                  <option value="Thursday">Thursday</option>
                  <option value="Tuesday">Tuesday</option>
                </select>
              </div>
            </div>

            {/* TEACHER ASSIGNMENT AS PART OF CLASSROOM SETUP (Requirement 2 & 3) */}
            <div className="p-4 rounded-2xl bg-canvas border border-borderMuted space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold uppercase text-primaryText/70">
                  Assign Classroom Teacher
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setIsNewTeacherMode(!isNewTeacherMode);
                    setErrorMsg(null);
                  }}
                  className="text-xs font-bold text-brandPrimary hover:underline"
                >
                  {isNewTeacherMode ? "← Choose Existing Staff" : "+ Assign New Teacher via Email"}
                </button>
              </div>

              {!isNewTeacherMode ? (
                <div>
                  <select
                    value={selectedLeadTeacherId}
                    onChange={(e) => setSelectedLeadTeacherId(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm bg-surface rounded-xl border border-borderMuted text-primaryText focus:outline-none focus:ring-2 focus:ring-brandPrimary font-medium"
                  >
                    <option value="">-- Select Teacher to Assign --</option>
                    {staffList
                      .filter((s) => s.role === "teacher" || s.role === "admin")
                      .map((member) => (
                        <option key={member.userId} value={member.userId}>
                          {member.displayName} ({member.email}) &bull;{" "}
                          {member.assignedClassIds?.includes("*")
                            ? "All Classes"
                            : `${member.assignedClassIds?.length || 0} class(es)`}
                        </option>
                      ))}
                  </select>
                  <span className="text-[11px] text-primaryText/60 block mt-1">
                    Once created, the teacher will receive an email linking them to this classroom.
                  </span>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <input
                        type="email"
                        value={newTeacherEmail}
                        onChange={(e) => setNewTeacherEmail(e.target.value)}
                        placeholder="teacher@stmarys-primary.sch.uk"
                        className="w-full px-3 py-2 text-xs bg-surface rounded-xl border border-borderMuted text-primaryText focus:outline-none focus:ring-2 focus:ring-brandPrimary font-medium"
                      />
                      <span className="text-[10px] text-primaryText/50 block mt-0.5">
                        School domain (@stmarys-primary.sch.uk)
                      </span>
                    </div>
                    <div>
                      <input
                        type="text"
                        value={newTeacherName}
                        onChange={(e) => setNewTeacherName(e.target.value)}
                        placeholder="Teacher Name (e.g. Mrs Evans)"
                        className="w-full px-3 py-2 text-xs bg-surface rounded-xl border border-borderMuted text-primaryText focus:outline-none focus:ring-2 focus:ring-brandPrimary font-medium"
                      />
                      <span className="text-[10px] text-primaryText/50 block mt-0.5">
                        Display name shown on student cards
                      </span>
                    </div>
                  </div>
                  <span className="text-[11px] text-brandPrimary font-semibold block">
                    ✨ Account &amp; invite will be dispatched only after this classroom is created.
                  </span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-canvas border border-borderMuted">
              <div>
                <label className="block text-xs font-bold uppercase text-primaryText/70 mb-1">
                  Weekly Basic Income (£)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.50"
                    min="1.00"
                    value={(weeklyBasicIncomeCents / 100).toFixed(2)}
                    onChange={(e) => setWeeklyBasicIncomeCents(Math.round(parseFloat(e.target.value || "0") * 100))}
                    className="w-32 px-3 py-2 text-sm bg-surface rounded-xl border border-borderMuted font-bold text-primaryText focus:ring-2 focus:ring-brandPrimary"
                  />
                  <div className="flex gap-1">
                    {[200, 300, 500].map((cents) => (
                      <button
                        type="button"
                        key={cents}
                        onClick={() => setWeeklyBasicIncomeCents(cents)}
                        className={`px-2 py-1 text-xs font-bold rounded-lg border ${
                          weeklyBasicIncomeCents === cents
                            ? "bg-brandPrimary text-white border-brandPrimary"
                            : "bg-surface text-primaryText/70 border-borderMuted hover:bg-tealSurface"
                        }`}
                      >
                        {formatCurrency(cents)}
                      </button>
                    ))}
                  </div>
                </div>
                <span className="text-[11px] text-primaryText/60 block mt-1">
                  Automated weekly learning allowance paid every {payoutDay}.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-primaryText/70 mb-1">
                  Account Opening Balance (£)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="1.00"
                    min="0"
                    value={(initialOpeningBalanceCents / 100).toFixed(2)}
                    onChange={(e) => setInitialOpeningBalanceCents(Math.round(parseFloat(e.target.value || "0") * 100))}
                    className="w-32 px-3 py-2 text-sm bg-surface rounded-xl border border-borderMuted font-bold text-primaryText focus:ring-2 focus:ring-brandPrimary"
                  />
                  <div className="flex gap-1">
                    {[0, 500, 1000].map((cents) => (
                      <button
                        type="button"
                        key={cents}
                        onClick={() => setInitialOpeningBalanceCents(cents)}
                        className={`px-2 py-1 text-xs font-bold rounded-lg border ${
                          initialOpeningBalanceCents === cents
                            ? "bg-brandPrimary text-white border-brandPrimary"
                            : "bg-surface text-primaryText/70 border-borderMuted hover:bg-tealSurface"
                        }`}
                      >
                        {cents === 0 ? "£0.00" : formatCurrency(cents)}
                      </button>
                    ))}
                  </div>
                </div>
                <span className="text-[11px] text-primaryText/60 block mt-1">
                  Welcome balance credited when student accounts are generated.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: PUPIL ROSTER & SAFEGUARDING */}
        {step === 2 && (
          <div className="space-y-4 text-left animate-in fade-in duration-150">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold uppercase text-primaryText/70">
                  Number of Pupils in Class
                </label>
                <span className="text-sm font-bold text-brandPrimary">{studentCount} Pupils</span>
              </div>
              <input
                type="range"
                min="4"
                max="32"
                step="1"
                value={studentCount}
                onChange={(e) => setStudentCount(parseInt(e.target.value, 10))}
                className="w-full accent-brandPrimary cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-primaryText/50 font-medium">
                <span>Small Group (4)</span>
                <span>Average KS2 Class (24)</span>
                <span>Large Class (32)</span>
              </div>
            </div>

            {/* Safeguarding Preference */}
            <div className="p-4 rounded-2xl bg-canvas border border-borderMuted space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-primaryText/80 block">
                Classroom Privacy &amp; Safeguarding Mode
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setAnonymizeNames(true)}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    anonymizeNames
                      ? "bg-tealSurface border-brandPrimary shadow-xs"
                      : "bg-surface border-borderMuted hover:border-brandPrimary/40"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <ShieldCheck className="w-4 h-4 text-brandPrimary" />
                    <strong className="text-xs font-bold text-primaryText">Strict Animal Codenames</strong>
                  </div>
                  <p className="text-[11px] text-primaryText/70 leading-relaxed">
                    Auto-generates friendly educational pseudonyms like <em>"Clever Badger #101"</em>. 100% Zero-PII.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setAnonymizeNames(false)}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    !anonymizeNames
                      ? "bg-tealSurface border-brandPrimary shadow-xs"
                      : "bg-surface border-borderMuted hover:border-brandPrimary/40"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="w-4 h-4 text-brandPrimary" />
                    <strong className="text-xs font-bold text-primaryText">Classroom First Names</strong>
                  </div>
                  <p className="text-[11px] text-primaryText/70 leading-relaxed">
                    Use first names or pseudonyms locally in this browser. Surnames are strictly forbidden.
                  </p>
                </button>
              </div>

              {!anonymizeNames && (
                <div className="pt-2">
                  <label className="block text-xs font-bold text-primaryText/70 mb-1">
                    Paste or Type First Names (comma or line separated):
                  </label>
                  <textarea
                    rows={3}
                    value={pastedNames}
                    onChange={(e) => setPastedNames(e.target.value)}
                    placeholder="Leo, Maya, Sam, Sophie, Jordan, Chloe..."
                    className="w-full px-3.5 py-2 text-xs bg-surface rounded-xl border border-borderMuted font-medium text-primaryText focus:ring-2 focus:ring-brandPrimary"
                  />
                </div>
              )}
            </div>

            {/* Optional CSV Classlist Ingestion with Pre-Flight Safeguarding Audit */}
            <div className="p-4 rounded-2xl bg-canvas border border-borderMuted space-y-3 text-left">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-brandPrimary" />
                  <span className="text-xs font-bold uppercase tracking-wider text-primaryText/80">
                    Optional: Ingest Classlist via CSV (Zero-PII Scanner)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleLoadSampleMis}
                  className="text-xs font-bold text-brandPrimary hover:underline flex items-center gap-1 self-start sm:self-center"
                >
                  <span>📋 Load Sample MIS Export</span>
                </button>
              </div>

              <label className="border-2 border-dashed border-brandPrimary/30 rounded-2xl p-4 text-center bg-tealSurface/30 hover:bg-tealSurface/50 transition-colors cursor-pointer flex flex-col items-center justify-center gap-1.5 block">
                <input
                  type="file"
                  accept=".csv,.txt"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleCsvUpload(e.target.files[0]);
                    }
                  }}
                />
                <div className="flex items-center gap-2 text-xs font-bold text-primaryText">
                  <Upload className="w-4 h-4 text-brandPrimary" />
                  <span>{csvFileName ? `File Selected: ${csvFileName}` : "Click to select or drag spreadsheet (.csv)"}</span>
                </div>
                <span className="text-[11px] text-primaryText/60">
                  Zero-PII guarantee: Surnames, DOBs, UPNs, and addresses are automatically purged in browser memory.
                </span>
              </label>

              {csvAuditResult && (
                <div className="space-y-2.5 pt-1 animate-in fade-in duration-150">
                  <div className="p-3 rounded-xl bg-positiveState/10 border border-positiveState/30 text-xs text-positiveState flex items-center gap-2 font-semibold">
                    <ShieldCheck className="w-4 h-4 flex-shrink-0" />
                    <span>
                      Safeguarding Pre-Flight Audit Passed! Extracted <strong>{csvAuditResult.extractedFirstNames.length} safe pupil forenames</strong>.
                    </span>
                  </div>

                  {csvAuditResult.strippedColumns.length > 0 && (
                    <div className="p-3 rounded-xl bg-amberSurface text-warningState border border-amber-300 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 font-bold">
                        <AlertCircle className="w-4 h-4" />
                        <span>Sensitive PII Columns Discarded:</span>
                      </div>
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {csvAuditResult.strippedColumns.map((col) => (
                          <span key={col} className="px-2 py-0.5 rounded-md bg-white border border-amber-300 text-[11px] font-bold">
                            ✕ {col}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <span className="text-[11px] font-bold text-primaryText/60 uppercase block mb-1">
                      Extracted Pupils Preview:
                    </span>
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 bg-surface rounded-xl border border-borderMuted">
                      {csvAuditResult.extractedFirstNames.map((name, i) => (
                        <span key={i} className="px-2.5 py-0.5 rounded-full bg-tealSurface text-brandPrimary text-xs font-bold border border-brandPrimary/30">
                          🌱 {name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Live Sample Card Preview */}
            <div className="p-3.5 rounded-2xl bg-tealSurface/50 border border-brandPrimary/30 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-brandPrimary text-white font-bold flex items-center justify-center text-sm shadow-xs">
                  🦡
                </div>
                <div>
                  <span className="text-xs font-bold text-primaryText block">
                    {anonymizeNames ? "Clever Badger #101" : "Leo (#101)"}
                  </span>
                  <span className="text-[11px] text-brandPrimary font-semibold">
                    Starting Card Balance: {formatCurrency(initialOpeningBalanceCents)} &bull; Card **** 4910
                  </span>
                </div>
              </div>
              <span className="text-[11px] px-2.5 py-1 rounded-full bg-surface border border-brandPrimary/40 text-brandPrimary font-bold">
                Sample Card
              </span>
            </div>
          </div>
        )}

        {/* STEP 3: STARTER SAVINGS POTS */}
        {step === 3 && (
          <div className="space-y-4 text-left animate-in fade-in duration-150">
            <div>
              <h4 className="text-sm font-bold text-primaryText">Choose Starter Savings Pots</h4>
              <p className="text-xs text-primaryText/70">
                Pots give pupils a structured visual metaphor for saving. Select which pots to create for each child:
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PRESET_POTS.map((pot) => {
                const isSelected = selectedPots.some((p) => p.title === pot.title);
                return (
                  <button
                    type="button"
                    key={pot.title}
                    onClick={() => {
                      setSelectedPots((prev) =>
                        isSelected ? prev.filter((p) => p.title !== pot.title) : [...prev, pot]
                      );
                    }}
                    className={`p-4 rounded-2xl border text-left transition-all flex items-start gap-3 ${
                      isSelected
                        ? "bg-tealSurface/60 border-brandPrimary shadow-xs"
                        : "bg-canvas border-borderMuted hover:border-brandPrimary/40"
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 border ${
                        isSelected
                          ? "bg-brandPrimary text-white border-brandPrimary"
                          : "bg-surface border-borderMuted text-transparent"
                      }`}
                    >
                      <Check className="w-4 h-4" />
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold uppercase tracking-wider text-brandPrimary block">
                        {pot.categoryLabel}
                      </span>
                      <strong className="text-sm font-bold text-primaryText block">{pot.title}</strong>
                      <span className="text-xs text-primaryText/70 font-semibold block">
                        Target Goal: {formatCurrency(pot.targetAmountCents)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
            <span className="text-[11px] text-primaryText/50 block">
              Selected: {selectedPots.length} starter pots per pupil account. (Pupils can also create custom pots later!)
            </span>
          </div>
        )}

        {/* STEP 4: CLASSROOM JOBS BOARD */}
        {step === 4 && (
          <div className="space-y-4 text-left animate-in fade-in duration-150">
            <div>
              <h4 className="text-sm font-bold text-primaryText">Classroom Jobs Starter Pack</h4>
              <p className="text-xs text-primaryText/70">
                Pupils apply for jobs with simple CVs, earn weekly wages, and receive teacher references for their portfolios:
              </p>
            </div>

            <div className="space-y-2.5">
              {PRESET_JOBS.map((job) => {
                const isSelected = selectedJobs.some((j) => j.title === job.title);
                return (
                  <button
                    type="button"
                    key={job.title}
                    onClick={() => {
                      setSelectedJobs((prev) =>
                        isSelected ? prev.filter((j) => j.title !== job.title) : [...prev, job]
                      );
                    }}
                    className={`w-full p-3.5 rounded-2xl border text-left transition-all flex items-start gap-3 ${
                      isSelected
                        ? "bg-tealSurface/60 border-brandPrimary shadow-xs"
                        : "bg-canvas border-borderMuted hover:border-brandPrimary/40"
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-1 border ${
                        isSelected
                          ? "bg-brandPrimary text-white border-brandPrimary"
                          : "bg-surface border-borderMuted text-transparent"
                      }`}
                    >
                      <Check className="w-4 h-4" />
                    </div>
                    <div className="space-y-1 w-full">
                      <div className="flex items-center justify-between">
                        <strong className="text-sm font-bold text-primaryText">{job.title}</strong>
                        <span className="text-xs font-bold text-brandPrimary">
                          {formatCurrency(job.wageCents)} / week &bull; {job.termWeeks} wks
                        </span>
                      </div>
                      <p className="text-xs text-primaryText/75 leading-relaxed">{job.description}</p>
                      <div className="flex gap-1.5 pt-0.5">
                        {job.requiredQualities.map((q) => (
                          <span
                            key={q}
                            className="text-[10px] px-2 py-0.5 rounded-full bg-surface border border-borderMuted font-bold text-primaryText/70"
                          >
                            {q}
                          </span>
                        ))}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            <span className="text-[11px] text-primaryText/50 block">
              Selected: {selectedJobs.length} active roles ready for student applications.
            </span>
          </div>
        )}

        {/* STEP 5: WHITEBOARD BONUSES */}
        {step === 5 && (
          <div className="space-y-4 text-left animate-in fade-in duration-150">
            <div>
              <h4 className="text-sm font-bold text-primaryText">Interactive Whiteboard Bonuses</h4>
              <p className="text-xs text-primaryText/70">
                Reward positive classroom behaviour live on your smartboard. Micro-amounts are credited straight to child card balances:
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {PRESET_BEHAVIOURS.map((beh) => {
                const isSelected = selectedBehaviours.some((b) => b.title === beh.title);
                return (
                  <button
                    type="button"
                    key={beh.title}
                    onClick={() => {
                      setSelectedBehaviours((prev) =>
                        isSelected ? prev.filter((b) => b.title !== beh.title) : [...prev, beh]
                      );
                    }}
                    className={`p-3.5 rounded-2xl border text-left transition-all space-y-1.5 ${
                      isSelected
                        ? "bg-tealSurface/60 border-brandPrimary shadow-xs"
                        : "bg-canvas border-borderMuted hover:border-brandPrimary/40"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-2xl p-1 rounded-xl bg-surface border border-borderMuted shadow-2xs">
                        {beh.icon}
                      </span>
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center border ${
                          isSelected
                            ? "bg-brandPrimary text-white border-brandPrimary"
                            : "bg-surface border-borderMuted text-transparent"
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <strong className="text-xs font-bold text-primaryText block">{beh.title}</strong>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-primaryText/60 font-semibold">{beh.definition}</span>
                      <span className="font-bold text-positiveState">+{beh.amountCents}p</span>
                    </div>
                  </button>
                );
              })}
            </div>
            <span className="text-[11px] text-primaryText/50 block">
              Selected: {selectedBehaviours.length} reward cards available in Whiteboard mode.
            </span>
          </div>
        )}

        {/* STEP 6: LAUNCHPAD & SUCCESS CELEBRATION */}
        {step === 6 && createdClass && (
          <div className="space-y-5 text-left animate-in zoom-in-95 duration-200">
            <div className="p-5 rounded-3xl bg-tealSurface border border-brandPrimary/40 text-center space-y-2">
              <span className="text-4xl inline-block animate-bounce">🎉</span>
              <h3 className="text-2xl font-bold text-primaryText">Classroom Ready to Launch!</h3>
              <p className="text-xs text-primaryText/80 max-w-md mx-auto font-medium">
                <strong>{createdClass.className}</strong> has been created with {createdPupils.length} pupil bank
                accounts, starter savings pots, and classroom roles.
              </p>
            </div>

            {/* Big Join Code Island */}
            <div className="p-4 rounded-2xl bg-canvas border border-borderMuted flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-brandPrimary block">
                  Class Join Code for Pupils
                </span>
                <span className="text-3xl font-bold tracking-widest text-primaryText">
                  {createdClass.joinCode}
                </span>
                <span className="text-[11px] text-primaryText/60 block mt-0.5">
                  Share this 6-digit code for pupils to log in from classroom tablets
                </span>
              </div>
              <button
                type="button"
                onClick={copyJoinCode}
                className="px-4 py-2 rounded-xl bg-surface hover:bg-tealSurface border border-borderMuted text-xs font-bold text-brandPrimary flex items-center gap-1.5 shadow-xs transition-colors"
              >
                {copiedCode ? <Check className="w-4 h-4 text-positiveState" /> : <Copy className="w-4 h-4" />}
                <span>{copiedCode ? "Copied Code!" : "Copy Code"}</span>
              </button>
            </div>

            {/* Quick Summary Pill Island */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
              <div className="p-3 rounded-2xl bg-canvas border border-borderMuted">
                <span className="text-xs text-primaryText/60 font-semibold block">Pupil Cards</span>
                <strong className="text-lg font-bold text-primaryText">{createdPupils.length}</strong>
              </div>
              <div className="p-3 rounded-2xl bg-canvas border border-borderMuted">
                <span className="text-xs text-primaryText/60 font-semibold block">Pots / Child</span>
                <strong className="text-lg font-bold text-primaryText">{selectedPots.length}</strong>
              </div>
              <div className="p-3 rounded-2xl bg-canvas border border-borderMuted">
                <span className="text-xs text-primaryText/60 font-semibold block">Jobs Posted</span>
                <strong className="text-lg font-bold text-primaryText">{selectedJobs.length}</strong>
              </div>
              <div className="p-3 rounded-2xl bg-canvas border border-borderMuted">
                <span className="text-xs text-primaryText/60 font-semibold block">Bonus Cards</span>
                <strong className="text-lg font-bold text-primaryText">{selectedBehaviours.length}</strong>
              </div>
            </div>

            {/* Teacher Linked & Invite Notification (Requirement 3 & 4) */}
            {createdClass.leadTeacherId && (
              <div className="p-3.5 rounded-2xl bg-tealSurface/80 border border-brandPrimary/30 flex items-center gap-3 text-left">
                <CheckCircle2 className="w-5 h-5 text-brandPrimary shrink-0" />
                <div className="text-xs">
                  <strong className="text-primaryText font-bold block">
                    Teacher Linked &amp; Invite Notification Dispatched
                  </strong>
                  <span className="text-primaryText/75">
                    Assigned staff member has been linked to {createdClass.className} and issued their PocketPot access notice.
                  </span>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  onComplete(createdClass, createdPupils, true);
                  onClose();
                }}
                className="p-3.5 rounded-2xl bg-brandPrimary hover:bg-teal-700 text-white font-bold text-xs flex flex-col items-center justify-center gap-1.5 shadow-md transition-transform hover:scale-[1.02]"
              >
                <Monitor className="w-5 h-5" />
                <span>Open Whiteboard Mode</span>
              </button>

              <button
                type="button"
                onClick={() => setShowPrintView(true)}
                className="p-3.5 rounded-2xl bg-canvas hover:bg-tealSurface border border-borderMuted text-primaryText font-bold text-xs flex flex-col items-center justify-center gap-1.5 transition-transform hover:scale-[1.02]"
              >
                <Printer className="w-5 h-5 text-brandPrimary" />
                <span>View &amp; Print Cards</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onComplete(createdClass, createdPupils, false);
                  onClose();
                }}
                className="p-3.5 rounded-2xl bg-canvas hover:bg-tealSurface border border-borderMuted text-primaryText font-bold text-xs flex flex-col items-center justify-center gap-1.5 transition-transform hover:scale-[1.02]"
              >
                <School className="w-5 h-5 text-brandPrimary" />
                <span>Go to Class Roster</span>
              </button>
            </div>
          </div>
        )}

        {/* PRINTABLE CARDS SUB-VIEW */}
        {showPrintView && createdClass && (
          <div className="fixed inset-0 z-[60] bg-white p-6 overflow-y-auto print:p-0 text-left">
            <div className="max-w-4xl mx-auto space-y-4">
              <div className="flex items-center justify-between border-b pb-3 print:hidden">
                <div>
                  <h3 className="text-xl font-bold text-primaryText">Printable Pupil Desk Cards</h3>
                  <p className="text-xs text-primaryText/70">
                    Class: {createdClass.className} &bull; Join Code: {createdClass.joinCode}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-4 py-2 rounded-xl bg-brandPrimary text-white font-bold text-xs flex items-center gap-1.5"
                  >
                    <Printer className="w-4 h-4" /> Print Cards
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPrintView(false)}
                    className="px-4 py-2 rounded-xl bg-canvas border border-borderMuted text-primaryText font-bold text-xs"
                  >
                    Back to Wizard
                  </button>
                </div>
              </div>

              {/* Grid of Student Cards */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {createdPupils.map((pupil) => (
                  <div
                    key={pupil.pupilId}
                    className="border-2 border-dashed border-slate-300 p-4 rounded-2xl bg-white space-y-2 text-left"
                  >
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-brandPrimary">
                        PocketPot Card
                      </span>
                      <span className="text-xs font-bold text-primaryText/50">#{pupil.deskBadgeNumber}</span>
                    </div>
                    <strong className="text-base font-bold text-primaryText block">
                      {pupil.localDisplayName || pupil.educationalCodename}
                    </strong>
                    <div className="text-xs text-primaryText/70 space-y-0.5">
                      <div>Card PIN: **** {pupil.cardLastFour}</div>
                      <div>Class Code: {createdClass.joinCode}</div>
                      <div className="text-[11px] font-bold text-brandPrimary pt-1">
                        Weekly Basic Income: {formatCurrency(createdClass.weeklyBasicIncomeCents || 500)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* BOTTOM NAVIGATION FOOTER (STEPS 1-5) */}
        {step < 6 && (
          <div className="flex items-center justify-between border-t border-borderMuted/60 pt-4">
            <button
              type="button"
              disabled={step === 1}
              onClick={() => setStep((s) => Math.max(1, s - 1))}
              className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors ${
                step === 1
                  ? "text-primaryText/30 cursor-not-allowed"
                  : "text-primaryText/70 hover:text-primaryText bg-canvas hover:bg-tealSurface"
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-bold text-primaryText/60 hover:text-primaryText"
              >
                Cancel
              </button>

              {step < 5 ? (
                <button
                  type="button"
                  onClick={() => setStep((s) => s + 1)}
                  className="px-5 py-2.5 rounded-full bg-brandPrimary hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <span>Next Step</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleFinalize}
                  className="px-6 py-2.5 rounded-full bg-positiveState hover:bg-green-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition-all scale-[1.02]"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Finish &amp; Launch Class</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
