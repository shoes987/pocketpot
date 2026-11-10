"use client";

import React, { useState, useEffect } from "react";
import {
  JobPostingDocument,
  JobApplicationDocument,
  JobStatus,
  PupilDocument,
  ClassDocument,
  CompletedJobRecord,
} from "@/lib/firebase/types";
import {
  getSavedJobs,
  createJob,
  getSavedApplications,
  hireApplicantForJob,
  finalizeJobTermWithReference,
  getActiveJobForPupil,
  getCompletedJobsForPupil,
  PRESET_JOB_QUALITIES,
  PRESET_REFERENCES,
} from "@/lib/services/jobs-service";
import {
  getSavedClasses,
  getSavedClassesForUser,
  getSavedPupils,
} from "@/lib/services/class-service";
import { getCurrentTeacherUser, isUserAdmin } from "@/lib/services/auth-service";
import { formatCurrency } from "@/lib/firebase/zero-pii";
import {
  Briefcase,
  Plus,
  Users,
  Clock,
  Coins,
  CheckCircle2,
  Calendar,
  Sparkles,
  Award,
  AlertCircle,
  Archive,
  RefreshCw,
  Search,
  Filter,
  Check,
  Star,
  ChevronRight,
  UserCheck,
  BookOpen,
} from "lucide-react";

export interface TeacherJobsBoardProps {
  classes?: ClassDocument[];
  activeClassId?: string;
}

export const TeacherJobsBoard: React.FC<TeacherJobsBoardProps> = ({
  classes: propsClasses,
  activeClassId,
}) => {
  const [jobs, setJobs] = useState<JobPostingDocument[]>([]);
  const [applications, setApplications] = useState<JobApplicationDocument[]>([]);
  const [classes, setClasses] = useState<ClassDocument[]>(propsClasses || []);
  const [pupils, setPupils] = useState<PupilDocument[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>(activeClassId || "class-year4-teal");
  const [filterTab, setFilterTab] = useState<"all" | "open" | "filled" | "completed">("all");
  const [jobsBoardSubTab, setJobsBoardSubTab] = useState<"both" | "roster" | "vacancies">("both");
  const [rosterFilter, setRosterFilter] = useState<"all" | "green" | "amber">("all");
  const [rosterSearch, setRosterSearch] = useState("");
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [reviewingJob, setReviewingJob] = useState<JobPostingDocument | null>(null);
  const [referenceJob, setReferenceJob] = useState<JobPostingDocument | null>(null);
  const [viewingReferencesPupil, setViewingReferencesPupil] = useState<{
    name: string;
    records: CompletedJobRecord[];
  } | null>(null);

  // Form State for New Job
  const [jobTitle, setJobTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [jobWagePounds, setJobWagePounds] = useState("1.50");
  const [jobTermWeeks, setJobTermWeeks] = useState(4);
  const [selectedQualities, setSelectedQualities] = useState<string[]>([
    "Reliable",
    "Organised",
  ]);
  const [customQualityInput, setCustomQualityInput] = useState("");
  const [cvPrompt, setCvPrompt] = useState(
    "Tell your teacher why you would be great at this role and what qualities you bring!"
  );

  // Reference Modal State
  const [selectedRefTemplate, setSelectedRefTemplate] = useState<string>(PRESET_REFERENCES[0]);
  const [customRefText, setCustomRefText] = useState("");
  const [postTermChoice, setPostTermChoice] = useState<"re-advertise" | "archive">("re-advertise");

  const loadData = () => {
    const loadedJobs = getSavedJobs();
    const loadedApps = getSavedApplications();
    const currentTeacher = getCurrentTeacherUser();
    const loadedClasses =
      propsClasses && propsClasses.length > 0
        ? propsClasses
        : isUserAdmin()
        ? getSavedClasses()
        : getSavedClassesForUser(currentTeacher);

    const loadedPupils = getSavedPupils();
    setClasses(loadedClasses);
    setPupils(loadedPupils);
    if (loadedClasses.length > 0) {
      if (activeClassId && loadedClasses.some((c) => c.classId === activeClassId)) {
        setSelectedClassId(activeClassId);
      } else if (!selectedClassId || !loadedClasses.some((c) => c.classId === selectedClassId)) {
        setSelectedClassId(loadedClasses[0].classId);
      }
    }
    setJobs(loadedJobs);
    setApplications(loadedApps);
  };

  useEffect(() => {
    loadData();
  }, [propsClasses, activeClassId]);

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 4500);
  };

  // Toggle quality selection
  const handleToggleQuality = (quality: string) => {
    setSelectedQualities((prev) =>
      prev.includes(quality) ? prev.filter((q) => q !== quality) : [...prev, quality]
    );
  };

  // Add custom quality
  const handleAddCustomQuality = () => {
    const trimmed = customQualityInput.trim();
    if (trimmed && !selectedQualities.includes(trimmed)) {
      setSelectedQualities((prev) => [...prev, trimmed]);
      setCustomQualityInput("");
    }
  };

  // Create Job Handler
  const handleCreateJobSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobTitle.trim() || !jobDescription.trim()) return;

    const wageCents = Math.round((parseFloat(jobWagePounds) || 1.5) * 100);

    createJob({
      classId: selectedClassId,
      title: jobTitle,
      description: jobDescription,
      wageCents,
      termWeeks: jobTermWeeks,
      requiredQualities: selectedQualities,
      cvPrompt,
    });

    setIsCreateModalOpen(false);
    // Reset Form
    setJobTitle("");
    setJobDescription("");
    setJobWagePounds("1.50");
    setJobTermWeeks(4);
    setSelectedQualities(["Reliable", "Organised"]);
    loadData();
    showToast(`Successfully posted new role "${jobTitle}" to the Jobs Board!`);
  };

  // Hire Applicant Handler
  const handleHireApplicant = (jobId: string, applicationId: string) => {
    try {
      const result = hireApplicantForJob(jobId, applicationId);
      loadData();
      setReviewingJob(null);
      showToast(
        `Appointed ${result.hiredApp.applicantDisplayName || result.hiredApp.pupilCodename} as ${result.hiredJob.title}! Weekly wage of ${formatCurrency(
          result.hiredJob.wageCents
        )} activated. Encouraging feedback sent to ${result.rejectionsSentCount} other applicants.`
      );
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to appoint candidate.");
    }
  };

  // Finalize Reference Handler
  const handleFinalizeReferenceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!referenceJob) return;

    const chosenRef = customRefText.trim() || selectedRefTemplate;

    finalizeJobTermWithReference(referenceJob.jobId, chosenRef, postTermChoice);
    loadData();
    setReferenceJob(null);
    setCustomRefText("");
    showToast(
      `Reference recorded for ${referenceJob.assignedPupilName || "pupil"}! Job has been ${
        postTermChoice === "re-advertise" ? "re-advertised on the Jobs Board" : "archived"
      }.`
    );
  };

  // Open Reference Modal
  const openReferenceModal = (job: JobPostingDocument) => {
    setReferenceJob(job);
    const pupilName = job.assignedPupilName || "Pupil";
    const defaultTemplate = PRESET_REFERENCES[0]
      .replace(/{NAME}/g, pupilName)
      .replace(/{JOB}/g, job.title);
    setCustomRefText(defaultTemplate);
  };

  // Filtered Jobs
  const filteredJobs = jobs.filter((j) => {
    if (filterTab === "all") return j.status !== "archived";
    if (filterTab === "open") return j.status === "open";
    if (filterTab === "filled") return j.status === "filled";
    if (filterTab === "completed") return j.status === "completed";
    return true;
  });

  // Employment Roster Calculations
  const currentClassPupils = selectedClassId
    ? pupils.filter((p) => p.classId === selectedClassId)
    : pupils;

  const pupilsWithStatus = currentClassPupils.map((pupil) => {
    const activeJob = getActiveJobForPupil(pupil.pupilId);
    const completedJobs = getCompletedJobsForPupil(pupil.pupilId);
    const hasExperience = Boolean(activeJob || (completedJobs && completedJobs.length > 0));
    return {
      pupil,
      activeJob,
      completedJobs,
      hasExperience,
    };
  });

  const greenCount = pupilsWithStatus.filter((p) => p.hasExperience).length;
  const amberCount = pupilsWithStatus.filter((p) => !p.hasExperience).length;

  const filteredPupils = pupilsWithStatus.filter((item) => {
    if (rosterFilter === "green" && !item.hasExperience) return false;
    if (rosterFilter === "amber" && item.hasExperience) return false;
    if (rosterSearch.trim()) {
      const q = rosterSearch.toLowerCase();
      const name = (item.pupil.localDisplayName || "").toLowerCase();
      const code = item.pupil.educationalCodename.toLowerCase();
      const badge = item.pupil.deskBadgeNumber.toString();
      const jobTitle = item.activeJob ? item.activeJob.title.toLowerCase() : "";
      return name.includes(q) || code.includes(q) || badge.includes(q) || jobTitle.includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6 text-left">
      {/* Toast Alert */}
      {successToast && (
        <div
          role="status"
          className="p-4 rounded-island bg-greenSurface border border-positiveState/30 text-positiveState font-bold text-sm flex items-center justify-between gap-3 shadow-sm animate-in fade-in"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span>{successToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessToast(null)}
            className="text-xs underline hover:no-underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 1. JOBS BOARD BANNER & CONTROLS */}
      <section className="bg-surface rounded-pot p-4 sm:p-6 md:p-8 border border-borderMuted shadow-islandCard flex flex-col md:flex-row md:items-center justify-between gap-5 text-left">
        <div className="space-y-1.5 text-left">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-tealSurface flex items-center justify-center text-brandPrimary">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-primaryText tracking-tight">
                Classroom Jobs Board
              </h2>
              <span className="text-xs font-bold uppercase tracking-wider text-primaryText/60">
                Pupil Agency &bull; Financial Responsibility
              </span>
            </div>
          </div>
          <p className="text-body text-primaryText/75 font-medium max-w-2xl">
            Create classroom roles, review written pupil CV applications, and award weekly wages paid automatically on class payout days.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-brandPrimary hover:bg-teal-700 text-white font-bold text-sm shadow-sm transition-all focus-visible:outline focus-visible:outline-3 focus-visible:outline-focusIndicator active:scale-98"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Post New Job</span>
        </button>
      </section>

      {/* 2. SUB-VIEW SELECTOR: Roster vs Vacancies */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-borderMuted/60 pb-3">
        <div className="flex items-center bg-surface p-1 rounded-full border border-borderMuted shadow-xs">
          <button
            type="button"
            onClick={() => setJobsBoardSubTab("both")}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
              jobsBoardSubTab === "both"
                ? "bg-brandPrimary text-white shadow-xs"
                : "text-primaryText/70 hover:text-primaryText"
            }`}
          >
            <span>Complete Overview</span>
          </button>
          <button
            type="button"
            onClick={() => setJobsBoardSubTab("roster")}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 ${
              jobsBoardSubTab === "roster"
                ? "bg-brandPrimary text-white shadow-xs"
                : "text-primaryText/70 hover:text-primaryText"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Class Employment Roster</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-tealSurface text-brandPrimary border border-brandPrimary/30">
              {greenCount} 🟢 &bull; {amberCount} 🟠
            </span>
          </button>
          <button
            type="button"
            onClick={() => setJobsBoardSubTab("vacancies")}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
              jobsBoardSubTab === "vacancies"
                ? "bg-brandPrimary text-white shadow-xs"
                : "text-primaryText/70 hover:text-primaryText"
            }`}
          >
            <Briefcase className="w-4 h-4" />
            <span>Job Vacancies ({jobs.filter((j) => j.status !== "archived").length})</span>
          </button>
        </div>

        {/* Classroom Filter if multiple classes */}
        {classes.length > 1 && (
          <div className="flex items-center gap-2 text-xs font-semibold text-primaryText">
            <span className="text-primaryText/60">Class:</span>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-surface border border-borderMuted text-primaryText text-xs font-bold focus:outline-none focus:ring-2 focus:ring-brandPrimary"
            >
              {classes.map((c) => (
                <option key={c.classId} value={c.classId}>
                  {c.className} ({c.yearGroup})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 3. CLASS EMPLOYMENT ROSTER (Requirement: Green for held/current job, Amber for never held) */}
      {(jobsBoardSubTab === "roster" || jobsBoardSubTab === "both") && (
        <section className="bg-surface rounded-pot p-4 sm:p-6 md:p-8 border border-borderMuted shadow-islandCard space-y-5 text-left">
          {/* Header & Description */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-borderMuted/60 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-brandPrimary" />
                <h3 className="text-xl font-bold text-primaryText">
                  Class Employment &amp; Opportunity Roster
                </h3>
              </div>
              <p className="text-body text-primaryText/75 text-sm mt-1">
                Visual equity overview of class workforce participation. Rows in <strong className="text-positiveState">Sage Green</strong> indicate pupils who currently hold or previously completed a role. Rows in <strong className="text-brandSecondary">Warm Amber</strong> highlight pupils ready for their first opportunity.
              </p>
            </div>

            {/* Quick Badge Count */}
            <div className="flex items-center gap-2 text-xs font-bold">
              <span className="px-3 py-1.5 rounded-full bg-[#DCFCE7] text-[#15803D] border border-[#86EFAC] flex items-center gap-1.5 shadow-xs">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{greenCount} Held Job (Green)</span>
              </span>
              <span className="px-3 py-1.5 rounded-full bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] flex items-center gap-1.5 shadow-xs">
                <Star className="w-3.5 h-3.5" />
                <span>{amberCount} No Job Held (Amber)</span>
              </span>
            </div>
          </div>

          {/* Filter Pills & Search */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center bg-canvas p-1 rounded-full border border-borderMuted text-xs font-bold">
              <button
                type="button"
                onClick={() => setRosterFilter("all")}
                className={`px-3.5 py-1.5 rounded-full transition-all ${
                  rosterFilter === "all"
                    ? "bg-brandPrimary text-white shadow-xs"
                    : "text-primaryText/70 hover:text-primaryText"
                }`}
              >
                All Pupils ({currentClassPupils.length})
              </button>
              <button
                type="button"
                onClick={() => setRosterFilter("green")}
                className={`px-3.5 py-1.5 rounded-full transition-all flex items-center gap-1 ${
                  rosterFilter === "green"
                    ? "bg-positiveState text-white shadow-xs"
                    : "text-positiveState hover:bg-greenSurface/40"
                }`}
              >
                <span>🟢 Has Held Job ({greenCount})</span>
              </button>
              <button
                type="button"
                onClick={() => setRosterFilter("amber")}
                className={`px-3.5 py-1.5 rounded-full transition-all flex items-center gap-1 ${
                  rosterFilter === "amber"
                    ? "bg-brandSecondary text-white shadow-xs"
                    : "text-brandSecondary hover:bg-amberSurface/40"
                }`}
              >
                <span>🟠 Never Held Job ({amberCount})</span>
              </button>
            </div>

            <div className="relative min-w-[200px] max-w-xs">
              <input
                type="text"
                value={rosterSearch}
                onChange={(e) => setRosterSearch(e.target.value)}
                placeholder="Search pupil or role..."
                className="w-full pl-3.5 pr-8 py-1.5 text-xs bg-canvas rounded-full border border-borderMuted text-primaryText font-medium focus:outline-none focus:ring-2 focus:ring-brandPrimary"
              />
              <Search className="w-3.5 h-3.5 text-primaryText/45 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Roster Rows */}
          {filteredPupils.length === 0 ? (
            <div className="p-8 text-center bg-canvas rounded-2xl border border-dashed border-borderMuted text-primaryText/60 text-sm font-semibold">
              No pupils match the selected filter.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPupils.map(({ pupil, activeJob, completedJobs, hasExperience }) => {
                const displayName = pupil.localDisplayName || pupil.educationalCodename;

                return (
                  <div
                    key={pupil.pupilId}
                    className={`p-4 sm:p-5 rounded-2xl border-2 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4 text-left ${
                      hasExperience
                        ? "bg-[#F0FDF4] border-[#86EFAC] shadow-xs hover:border-positiveState"
                        : "bg-[#FFFBEB] border-[#FDE68A] shadow-xs hover:border-brandSecondary"
                    }`}
                  >
                    {/* 1. Pupil Identity */}
                    <div className="flex items-center gap-3 min-w-[210px] text-left">
                      <div
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm flex-shrink-0 border ${
                          hasExperience
                            ? "bg-[#DCFCE7] text-[#15803D] border-[#86EFAC]"
                            : "bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]"
                        }`}
                      >
                        #{pupil.deskBadgeNumber}
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-base font-bold text-primaryText">
                            {displayName}
                          </span>
                          {pupil.localDisplayName && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface border border-borderMuted text-primaryText/70">
                              {pupil.educationalCodename}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] font-mono text-primaryText/50 block">
                          UUID: {pupil.pupilId.slice(0, 8)}...
                        </span>
                      </div>
                    </div>

                    {/* 2. Current Active Employment */}
                    <div className="min-w-[190px] max-w-xs space-y-1 text-left">
                      <span className="text-[10px] uppercase font-bold text-primaryText/60 block">
                        Current Employment
                      </span>
                      {activeJob ? (
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 font-bold text-sm text-positiveState">
                            <Briefcase className="w-4 h-4 flex-shrink-0" />
                            <span>{activeJob.title}</span>
                          </div>
                          <span className="text-xs text-primaryText/70 block">
                            {formatCurrency(activeJob.wageCents)}/wk &bull; Week {(activeJob.weeksElapsed || 0) + 1} of {activeJob.termWeeks}
                          </span>
                        </div>
                      ) : (
                        <span
                          className={`text-xs block font-medium ${
                            hasExperience ? "text-primaryText/60" : "text-brandSecondary font-bold"
                          }`}
                        >
                          {hasExperience ? "No active role currently" : "Ready for first role"}
                        </span>
                      )}
                    </div>

                    {/* 3. Previous Jobs Held & References */}
                    <div className="min-w-[210px] max-w-sm space-y-1 text-left">
                      <span className="text-[10px] uppercase font-bold text-primaryText/60 block">
                        Previous Jobs Held
                      </span>
                      {completedJobs && completedJobs.length > 0 ? (
                        <div className="space-y-1">
                          <span className="text-xs font-semibold text-primaryText block">
                            {completedJobs.map((j) => `${j.title} (${j.termWeeks} wks)`).join(", ")}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setViewingReferencesPupil({
                                name: displayName,
                                records: completedJobs,
                              })
                            }
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-brandPrimary hover:underline"
                          >
                            <BookOpen className="w-3 h-3" />
                            <span>
                              View {completedJobs.length} Reference{completedJobs.length === 1 ? "" : "s"}
                            </span>
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-primaryText/50 italic block">
                          No previous roles
                        </span>
                      )}
                    </div>

                    {/* 4. Equity Status Badge & Balance */}
                    <div className="flex items-center gap-3 justify-between sm:justify-end text-left flex-shrink-0">
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-primaryText/50 block">
                          Card Balance
                        </span>
                        <span className="text-sm font-bold text-brandPrimary block">
                          {formatCurrency(pupil.mainBalanceCents ?? 0)}
                        </span>
                      </div>

                      <div className="text-left">
                        {hasExperience ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-[#DCFCE7] text-[#15803D] border border-[#86EFAC] shadow-xs">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{activeJob ? "Employed" : "Past Role Held"}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] shadow-xs">
                            <Star className="w-3.5 h-3.5" />
                            <span>Seeking First Role</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* 4. STATS & STATUS FILTER TABS FOR JOB VACANCIES */}
      {(jobsBoardSubTab === "vacancies" || jobsBoardSubTab === "both") && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
            <div>
              <h3 className="text-lg font-bold text-primaryText">Classroom Job Vacancies</h3>
              <p className="text-xs text-primaryText/60">Review applications, assign pupil roles, and manage rotations.</p>
            </div>
            {/* Filter Pills */}
            <div className="flex items-center bg-surface p-1 rounded-full border border-borderMuted text-xs font-bold">
              <button
                type="button"
                onClick={() => setFilterTab("all")}
                className={`px-4 py-2 rounded-full transition-all ${
                  filterTab === "all"
                    ? "bg-brandPrimary text-white shadow-xs"
                    : "text-primaryText/70 hover:text-primaryText"
                }`}
              >
                All Active ({jobs.filter((j) => j.status !== "archived").length})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab("open")}
                className={`px-4 py-2 rounded-full transition-all ${
                  filterTab === "open"
                    ? "bg-brandPrimary text-white shadow-xs"
                    : "text-primaryText/70 hover:text-primaryText"
                }`}
              >
                Open for Applications ({jobs.filter((j) => j.status === "open").length})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab("filled")}
                className={`px-4 py-2 rounded-full transition-all ${
                  filterTab === "filled"
                    ? "bg-brandPrimary text-white shadow-xs"
                    : "text-primaryText/70 hover:text-primaryText"
                }`}
              >
                Currently Hired ({jobs.filter((j) => j.status === "filled").length})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab("completed")}
                className={`px-4 py-2 rounded-full transition-all ${
                  filterTab === "completed"
                    ? "bg-brandPrimary text-white shadow-xs"
                    : "text-primaryText/70 hover:text-primaryText"
                }`}
              >
                Term Complete ({jobs.filter((j) => j.status === "completed").length})
              </button>
            </div>

            {/* Total Applications Count Badge */}
            <div className="flex items-center gap-2 text-xs font-semibold text-primaryText/75">
              <Users className="w-4 h-4 text-brandPrimary" />
              <span>
                <strong>{applications.length}</strong> total pupil application{applications.length === 1 ? "" : "s"} submitted
              </span>
            </div>
          </div>

      {/* 3. JOBS LIST GRID */}
      {filteredJobs.length === 0 ? (
        <div className="p-12 text-center bg-surface rounded-pot border border-dashed border-borderMuted space-y-3">
          <Briefcase className="w-10 h-10 text-primaryText/35 mx-auto" />
          <h3 className="text-lg font-bold text-primaryText">No jobs found in this category</h3>
          <p className="text-sm text-primaryText/60 max-w-md mx-auto">
            Click &quot;Post New Job&quot; above to advertise a classroom role to your pupils.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredJobs.map((job) => {
            const jobApps = applications.filter((a) => a.jobId === job.jobId);
            const pendingApps = jobApps.filter((a) => a.status === "pending");

            return (
              <div
                key={job.jobId}
                className="bg-surface rounded-3xl border border-borderMuted shadow-islandCard flex flex-col justify-between overflow-hidden hover:shadow-md transition-all text-left"
              >
                {/* Green Header with Job Title and Status Badge */}
                <div className="bg-brandPrimary text-white px-5 py-3.5 flex items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-white/20 border border-white/25 flex items-center justify-center flex-shrink-0">
                      <Briefcase className="w-4 h-4 text-white" />
                    </div>
                    <h3 className="text-base sm:text-lg font-extrabold text-white leading-tight truncate">
                      {job.title}
                    </h3>
                  </div>

                  {/* Status Badge in Header */}
                  <div>
                    {job.status === "open" && (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-white/20 text-white border border-white/30 flex-shrink-0">
                        Open Role
                      </span>
                    )}
                    {job.status === "filled" && (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-400/30 text-amber-100 border border-amber-300/40 flex-shrink-0">
                        Hired: {job.assignedPupilName}
                      </span>
                    )}
                    {job.status === "completed" && (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-400/30 text-emerald-100 border border-emerald-300/40 flex-shrink-0">
                        Term Ended
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Body with Component Information in Clean Pills */}
                <div className="p-5 sm:p-6 space-y-4 flex-1 flex flex-col justify-between text-left">
                  <div className="space-y-4 text-left">
                    {/* 1. Component Information Pills */}
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Wage Pill */}
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-tealSurface text-brandPrimary border border-brandPrimary/30 shadow-2xs">
                        <Coins className="w-3.5 h-3.5 text-brandPrimary" />
                        <span>{formatCurrency(job.wageCents)} / week</span>
                      </span>

                      {/* Term Duration Pill */}
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amberSurface text-brandSecondary border border-brandSecondary/30 shadow-2xs">
                        <Clock className="w-3.5 h-3.5 text-brandSecondary" />
                        <span>{job.termWeeks}-week term</span>
                      </span>

                      {/* Schedule Pill */}
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-canvas text-primaryText/75 border border-borderMuted shadow-2xs">
                        <Calendar className="w-3.5 h-3.5 text-primaryText/60" />
                        <span>Paid with basic income</span>
                      </span>

                      {/* Applicants Pill for Teacher */}
                      {job.status === "open" && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/80 shadow-2xs">
                          <Users className="w-3.5 h-3.5 text-indigo-600" />
                          <span>{pendingApps.length} waiting • {jobApps.length} total</span>
                        </span>
                      )}
                    </div>

                    {/* 2. Role Summary */}
                    <div className="space-y-1 text-left">
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-primaryText/50 block">
                        Role Summary
                      </span>
                      <p className="text-sm text-primaryText/85 leading-relaxed font-normal">
                        {job.description}
                      </p>
                    </div>

                    {/* 3. Required Qualities in Distinct Scannable Pills */}
                    <div className="space-y-1.5 pt-1 text-left">
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-primaryText/50 block">
                        Qualities Looked For:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {job.requiredQualities.map((q, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/80 shadow-2xs flex items-center gap-1"
                          >
                            <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
                            <span>{q}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 4. Footer Actions Based on Job Status */}
                  <div className="pt-4 mt-2 border-t border-borderMuted/70 flex items-center justify-between gap-3 text-left">
                    {job.status === "open" ? (
                      <>
                        <div className="text-xs text-primaryText/70 font-semibold">
                          {pendingApps.length} applicant{pendingApps.length === 1 ? "" : "s"} waiting
                        </div>
                        <button
                          type="button"
                          onClick={() => setReviewingJob(job)}
                          className="px-4 py-2 rounded-full bg-brandPrimary hover:bg-teal-700 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <Users className="w-3.5 h-3.5" />
                          <span>Review Applications ({jobApps.length})</span>
                        </button>
                      </>
                    ) : job.status === "filled" ? (
                      <>
                        <div className="text-xs text-primaryText/70">
                          <span>Assigned: <strong>{job.assignedPupilName}</strong></span>
                          <span className="block text-[11px] text-brandSecondary font-semibold">
                            Wage paid on class payout day
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => openReferenceModal(job)}
                          className="px-3.5 py-2 rounded-full bg-surface hover:bg-canvas border border-borderMuted text-primaryText font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <Award className="w-3.5 h-3.5 text-brandSecondary" />
                          <span>Complete Term &amp; Reference</span>
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="text-xs text-positiveState font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Term concluded ({job.assignedPupilName})</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => openReferenceModal(job)}
                          className="px-4 py-2 rounded-full bg-brandSecondary hover:bg-amber-600 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <Award className="w-3.5 h-3.5" />
                          <span>Write Reference &bull; Re-advertise</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
        </>
      )}

      {/* ========================================================== */}
      {/* 4. MODAL: CREATE NEW JOB                                    */}
      {/* ========================================================== */}
      {isCreateModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-primaryText/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200"
        >
          <div className="bg-surface rounded-[2rem] p-5 sm:p-6 md:p-8 max-w-xl w-full border border-borderMuted shadow-2xl space-y-4 sm:space-y-5 text-left my-4 sm:my-8">
            <div className="flex items-start justify-between border-b border-borderMuted/60 pb-3">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-brandPrimary block">
                  New Classroom Role
                </span>
                <h3 className="text-2xl font-bold text-primaryText">Post a Job Advert</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-primaryText/50 hover:text-primaryText text-2xl font-bold p-1"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateJobSubmit} className="space-y-4 text-left">
              {/* Role Title */}
              <div>
                <label className="block text-xs font-bold uppercase text-primaryText/70 mb-1">
                  Job Title
                </label>
                <input
                  type="text"
                  required
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="e.g. Classroom Librarian, Plant Monitor, Eco Ranger"
                  className="w-full px-4 py-2.5 text-sm bg-canvas rounded-xl border border-borderMuted text-primaryText focus:outline-none focus:ring-2 focus:ring-brandPrimary font-medium"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold uppercase text-primaryText/70 mb-1">
                  Outline of Role (Job Description)
                </label>
                <textarea
                  required
                  rows={3}
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Describe what the role involves day-to-day..."
                  className="w-full px-4 py-2 text-sm bg-canvas rounded-xl border border-borderMuted text-primaryText focus:outline-none focus:ring-2 focus:ring-brandPrimary font-medium"
                />
              </div>

              {/* Wage & Term In Weeks */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-primaryText/70 mb-1">
                    Weekly Wage (£)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-primaryText/60 font-bold">
                      £
                    </span>
                    <input
                      type="number"
                      step="0.10"
                      min="0.50"
                      max="10.00"
                      required
                      value={jobWagePounds}
                      onChange={(e) => setJobWagePounds(e.target.value)}
                      className="w-full pl-8 pr-4 py-2.5 text-sm bg-canvas rounded-xl border border-borderMuted text-primaryText font-bold focus:outline-none focus:ring-2 focus:ring-brandPrimary"
                    />
                  </div>
                  <span className="text-[11px] text-primaryText/55 mt-0.5 block">
                    Paid automatically on class payout day
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-primaryText/70 mb-1">
                    Job Term (Duration)
                  </label>
                  <select
                    value={jobTermWeeks}
                    onChange={(e) => setJobTermWeeks(parseInt(e.target.value, 10))}
                    className="w-full px-4 py-2.5 text-sm bg-canvas rounded-xl border border-borderMuted text-primaryText font-bold focus:outline-none focus:ring-2 focus:ring-brandPrimary"
                  >
                    <option value={2}>2 Weeks</option>
                    <option value={3}>3 Weeks</option>
                    <option value={4}>4 Weeks (Standard)</option>
                    <option value={6}>6 Weeks (Half-Term)</option>
                  </select>
                  <span className="text-[11px] text-primaryText/55 mt-0.5 block">
                    Reminders sent 1 week before completion
                  </span>
                </div>
              </div>

              {/* Required Qualities */}
              <div>
                <label className="block text-xs font-bold uppercase text-primaryText/70 mb-1">
                  Required Qualities Needed
                </label>
                <div className="flex flex-wrap gap-1.5 p-3 bg-canvas rounded-xl border border-borderMuted">
                  {PRESET_JOB_QUALITIES.map((q) => {
                    const isSelected = selectedQualities.includes(q);
                    return (
                      <button
                        type="button"
                        key={q}
                        onClick={() => handleToggleQuality(q)}
                        className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1 ${
                          isSelected
                            ? "bg-brandPrimary text-white shadow-xs"
                            : "bg-surface border border-borderMuted text-primaryText/70 hover:text-primaryText"
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3" />}
                        <span>{q}</span>
                      </button>
                    );
                  })}
                  {/* Any custom qualities added */}
                  {selectedQualities
                    .filter((q) => !PRESET_JOB_QUALITIES.includes(q as (typeof PRESET_JOB_QUALITIES)[number]))
                    .map((cq) => (
                      <button
                        type="button"
                        key={cq}
                        onClick={() => handleToggleQuality(cq)}
                        className="px-3 py-1 rounded-full text-xs font-bold bg-brandSecondary text-white shadow-xs flex items-center gap-1"
                      >
                        <Check className="w-3 h-3" />
                        <span>{cq}</span>
                      </button>
                    ))}
                </div>

                {/* Option to add custom quality */}
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="text"
                    value={customQualityInput}
                    onChange={(e) => setCustomQualityInput(e.target.value)}
                    placeholder="Add custom quality (e.g. Computer Savvy)..."
                    className="flex-1 px-3 py-1.5 text-xs bg-canvas rounded-xl border border-borderMuted text-primaryText focus:outline-none focus:ring-2 focus:ring-brandPrimary"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomQuality}
                    className="px-3 py-1.5 rounded-xl bg-surface hover:bg-canvas border border-borderMuted text-xs font-bold text-primaryText transition-colors"
                  >
                    + Add
                  </button>
                </div>
              </div>

              {/* CV Prompt Guidance */}
              <div>
                <label className="block text-xs font-bold uppercase text-primaryText/70 mb-1">
                  CV Question Prompt (for Child&apos;s Application)
                </label>
                <input
                  type="text"
                  value={cvPrompt}
                  onChange={(e) => setCvPrompt(e.target.value)}
                  placeholder="e.g. Tell your teacher why you would be great at this role..."
                  className="w-full px-4 py-2 text-sm bg-canvas rounded-xl border border-borderMuted text-primaryText focus:outline-none focus:ring-2 focus:ring-brandPrimary font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-borderMuted">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-primaryText/70 hover:text-primaryText"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-full bg-brandPrimary hover:bg-teal-700 text-white font-bold text-sm shadow-sm transition-all"
                >
                  Post Job Advert
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* 5. MODAL: REVIEW JOB APPLICATIONS                           */}
      {/* ========================================================== */}
      {reviewingJob && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-primaryText/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200"
        >
          <div className="bg-surface rounded-[2rem] p-5 sm:p-6 md:p-8 max-w-2xl w-full border border-borderMuted shadow-2xl space-y-4 sm:space-y-5 text-left my-4 sm:my-8">
            <div className="flex items-start justify-between border-b border-borderMuted/60 pb-3">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-brandPrimary block">
                  Application Review
                </span>
                <h3 className="text-2xl font-bold text-primaryText">{reviewingJob.title}</h3>
                <p className="text-xs text-primaryText/60 mt-0.5">
                  Choose which child to appoint. The selected pupil receives the job and wage; other applicants receive positive encouragement.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReviewingJob(null)}
                className="text-primaryText/50 hover:text-primaryText text-2xl font-bold p-1"
              >
                &times;
              </button>
            </div>

            {/* List of Applications */}
            <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
              {applications.filter((a) => a.jobId === reviewingJob.jobId).length === 0 ? (
                <div className="p-8 text-center text-primaryText/60 bg-canvas rounded-2xl border border-dashed border-borderMuted">
                  <p className="text-sm font-semibold">No applications submitted yet.</p>
                  <p className="text-xs mt-1">Pupils will see this in their Jobs Board under &quot;Available Jobs&quot;.</p>
                </div>
              ) : (
                applications
                  .filter((a) => a.jobId === reviewingJob.jobId)
                  .map((app) => (
                    <div
                      key={app.applicationId}
                      className="p-5 rounded-2xl bg-canvas border border-borderMuted space-y-3 text-left"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-base font-bold text-primaryText">
                              {app.applicantDisplayName || app.pupilCodename}
                            </span>
                            <span className="text-xs font-mono text-primaryText/50">
                              ({app.pupilCodename})
                            </span>
                          </div>
                          <span className="text-[11px] text-primaryText/50 block">
                            Applied on {new Date(app.submittedAt).toLocaleDateString("en-GB")}
                          </span>
                        </div>

                        {app.status === "accepted" ? (
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-greenSurface text-positiveState border border-positiveState/30">
                            Appointed
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleHireApplicant(reviewingJob.jobId, app.applicationId)}
                            className="px-4 py-2 rounded-full bg-brandPrimary hover:bg-teal-700 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Appoint Candidate</span>
                          </button>
                        )}
                      </div>

                      {/* Written CV Statement */}
                      <div className="p-3.5 rounded-xl bg-surface border border-borderMuted/70 text-left space-y-1">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-brandPrimary block">
                          Written Application / CV Statement:
                        </span>
                        <p className="text-xs text-primaryText/90 leading-relaxed font-medium">
                          &ldquo;{app.cvStatement}&rdquo;
                        </p>
                      </div>

                      {/* Qualities Highlighted */}
                      {app.qualitiesHighlight?.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[11px] font-bold text-primaryText/60">
                            Highlighted Qualities:
                          </span>
                          {app.qualitiesHighlight.map((qh, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-tealSurface text-brandPrimary border border-brandPrimary/25"
                            >
                              {qh}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Auto-Attached Prior Completed Jobs & Teacher References */}
                      {app.attachedCompletedJobs?.length > 0 && (
                        <div className="p-3 rounded-xl bg-amberSurface/50 border border-brandSecondary/25 space-y-1.5 text-left">
                          <div className="flex items-center gap-1 text-xs font-bold text-brandSecondary">
                            <Award className="w-3.5 h-3.5" />
                            <span>Prior Job Portfolio &amp; Teacher References:</span>
                          </div>
                          {app.attachedCompletedJobs.map((cj, idx) => (
                            <div key={idx} className="text-xs text-primaryText/85 pl-2 border-l-2 border-brandSecondary/40">
                              <strong>{cj.title}</strong> ({cj.termWeeks} wks): &ldquo;{cj.teacherReference}&rdquo;
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-borderMuted">
              <button
                type="button"
                onClick={() => setReviewingJob(null)}
                className="px-5 py-2 rounded-full bg-canvas hover:bg-surface border border-borderMuted text-primaryText font-bold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* 6. MODAL: TEACHER REFERENCE & TERM COMPLETION                */}
      {/* ========================================================== */}
      {referenceJob && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-primaryText/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200"
        >
          <div className="bg-surface rounded-[2rem] p-5 sm:p-6 md:p-8 max-w-xl w-full border border-borderMuted shadow-2xl space-y-4 sm:space-y-5 text-left my-4 sm:my-8">
            <div className="flex items-start justify-between border-b border-borderMuted/60 pb-3">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-brandSecondary block">
                  Term Completion Reference
                </span>
                <h3 className="text-2xl font-bold text-primaryText">
                  Reference for {referenceJob.assignedPupilName || "Pupil"}
                </h3>
                <p className="text-xs text-primaryText/60 mt-0.5">
                  Complete a short 1-sentence reference. This will be added to the child&apos;s portfolio and attached to future applications.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReferenceJob(null)}
                className="text-primaryText/50 hover:text-primaryText text-2xl font-bold p-1"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleFinalizeReferenceSubmit} className="space-y-4 text-left">
              {/* Pre-populated reference templates */}
              <div>
                <label className="block text-xs font-bold uppercase text-primaryText/70 mb-1.5">
                  Select a Pre-Populated Reference Template:
                </label>
                <div className="space-y-2">
                  {PRESET_REFERENCES.map((tpl, i) => {
                    const pupilName = referenceJob.assignedPupilName || "Pupil";
                    const rendered = tpl.replace(/{NAME}/g, pupilName).replace(/{JOB}/g, referenceJob.title);
                    const isSelected = customRefText === rendered;

                    return (
                      <div
                        key={i}
                        onClick={() => {
                          setSelectedRefTemplate(rendered);
                          setCustomRefText(rendered);
                        }}
                        className={`p-3 rounded-xl border text-xs font-medium cursor-pointer transition-all ${
                          isSelected
                            ? "bg-tealSurface border-brandPrimary text-primaryText shadow-xs font-semibold"
                            : "bg-canvas border-borderMuted text-primaryText/80 hover:bg-surface"
                        }`}
                      >
                        &ldquo;{rendered}&rdquo;
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Editable Reference Textarea */}
              <div>
                <label className="block text-xs font-bold uppercase text-primaryText/70 mb-1">
                  Or Edit / Customize Reference:
                </label>
                <textarea
                  rows={2}
                  required
                  value={customRefText}
                  onChange={(e) => setCustomRefText(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm bg-canvas rounded-xl border border-borderMuted text-primaryText font-medium focus:outline-none focus:ring-2 focus:ring-brandPrimary"
                />
              </div>

              {/* Re-advertise or Archive */}
              <div className="p-4 rounded-xl bg-canvas border border-borderMuted space-y-2">
                <span className="text-xs font-bold uppercase text-primaryText/70 block">
                  Next Step for this Job:
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <label
                    className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all text-xs font-bold ${
                      postTermChoice === "re-advertise"
                        ? "bg-tealSurface border-brandPrimary text-brandPrimary shadow-xs"
                        : "bg-surface border-borderMuted text-primaryText/70"
                    }`}
                  >
                    <input
                      type="radio"
                      name="postTermChoice"
                      value="re-advertise"
                      checked={postTermChoice === "re-advertise"}
                      onChange={() => setPostTermChoice("re-advertise")}
                      className="sr-only"
                    />
                    <RefreshCw className="w-4 h-4" />
                    <span>Re-advertise Job</span>
                  </label>

                  <label
                    className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all text-xs font-bold ${
                      postTermChoice === "archive"
                        ? "bg-amberSurface border-brandSecondary text-brandSecondary shadow-xs"
                        : "bg-surface border-borderMuted text-primaryText/70"
                    }`}
                  >
                    <input
                      type="radio"
                      name="postTermChoice"
                      value="archive"
                      checked={postTermChoice === "archive"}
                      onChange={() => setPostTermChoice("archive")}
                      className="sr-only"
                    />
                    <Archive className="w-4 h-4" />
                    <span>Archive Job</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-borderMuted">
                <button
                  type="button"
                  onClick={() => setReferenceJob(null)}
                  className="px-4 py-2 text-xs font-bold text-primaryText/70 hover:text-primaryText"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-full bg-brandPrimary hover:bg-teal-700 text-white font-bold text-sm shadow-sm transition-all"
                >
                  Submit Reference &amp; Complete
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ========================================================== */}
      {/* 5. MODAL: VIEW PUPIL REFERENCES PORTFOLIO                  */}
      {/* ========================================================== */}
      {viewingReferencesPupil && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-primaryText/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200"
        >
          <div className="bg-surface rounded-[2rem] p-5 sm:p-6 md:p-8 max-w-lg w-full border border-borderMuted shadow-2xl space-y-4 text-left my-4 sm:my-8">
            <div className="flex items-start justify-between border-b border-borderMuted/60 pb-3">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-brandPrimary block">
                  Pupil Career Portfolio
                </span>
                <h3 className="text-xl font-bold text-primaryText">
                  References for {viewingReferencesPupil.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setViewingReferencesPupil(null)}
                className="text-primaryText/50 hover:text-primaryText text-2xl font-bold p-1"
              >
                &times;
              </button>
            </div>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {viewingReferencesPupil.records.map((rec, i) => (
                <div
                  key={i}
                  className="p-4 rounded-2xl bg-canvas border border-borderMuted space-y-2 text-left"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-primaryText flex items-center gap-1.5">
                      <Briefcase className="w-4 h-4 text-brandPrimary" />
                      <span>{rec.title}</span>
                    </span>
                    <span className="text-xs font-bold text-brandSecondary px-2.5 py-0.5 rounded-full bg-amberSurface border border-brandSecondary/30">
                      {rec.termWeeks} Weeks Completed
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-surface border border-borderMuted text-xs text-primaryText/90 italic">
                    &ldquo;{rec.teacherReference}&rdquo;
                  </div>
                  {rec.completedDate && (
                    <span className="text-[10px] text-primaryText/50 block">
                      Completed on {new Date(rec.completedDate).toLocaleDateString("en-GB")}
                    </span>
                  )}
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setViewingReferencesPupil(null)}
              className="w-full py-2.5 rounded-full bg-brandPrimary hover:bg-teal-700 text-white font-bold text-sm shadow-sm transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
