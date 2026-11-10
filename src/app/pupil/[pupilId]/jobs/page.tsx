"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  getPupilById,
  getSavedClasses,
  autoReconcileAllClassesWeeklyIncome,
} from "@/lib/services/class-service";
import {
  getSavedJobs,
  getSavedApplications,
  submitJobApplication,
  getActiveJobForPupil,
  getCompletedJobsForPupil,
  getSavedNotifications,
  markNotificationRead,
} from "@/lib/services/jobs-service";
import {
  PupilDocument,
  JobPostingDocument,
  JobApplicationDocument,
  CompletedJobRecord,
  PupilNotificationDocument,
} from "@/lib/firebase/types";
import {
  formatCurrency,
  createAnonymousPupilProfile,
} from "@/lib/firebase/zero-pii";
import { PupilBottomNav } from "@/components/ui/PupilBottomNav";
import { PupilNotificationBell } from "@/components/pupil/PupilNotificationBell";
import { AppTopHeader } from "@/components/ui/AppTopHeader";
import {
  Briefcase,
  Coins,
  Clock,
  Sparkles,
  CheckCircle2,
  Award,
  Send,
  Calendar,
  AlertCircle,
  Star,
  Check,
  ChevronRight,
  ShieldCheck,
  Bell,
  Heart,
  X,
} from "lucide-react";

interface PupilJobsPageProps {
  params?: Promise<{ pupilId: string }> | { pupilId: string };
}

export default function PupilJobsPage(props: PupilJobsPageProps) {
  const unwrappedParams =
    props?.params &&
    typeof (React as unknown as { use?: (p: unknown) => { pupilId?: string } }).use === "function"
      ? (React as unknown as { use: (p: unknown) => { pupilId?: string } }).use(props.params)
      : null;

  const routeParams = useParams();

  const pupilId: string =
    unwrappedParams?.pupilId ||
    (typeof routeParams?.pupilId === "string" ? routeParams.pupilId : "") ||
    "";

  const [pupil, setPupil] = useState<PupilDocument | null>(null);
  const [activeTab, setActiveTab] = useState<"available" | "my-jobs">("available");
  const [jobs, setJobs] = useState<JobPostingDocument[]>([]);
  const [applications, setApplications] = useState<JobApplicationDocument[]>([]);
  const [completedJobs, setCompletedJobs] = useState<CompletedJobRecord[]>([]);
  const [notifications, setNotifications] = useState<PupilNotificationDocument[]>([]);
  const [loading, setLoading] = useState(true);

  // Application Modal State
  const [applyingJob, setApplyingJob] = useState<JobPostingDocument | null>(null);
  const [cvStatement, setCvStatement] = useState("");
  const [selectedMyQualities, setSelectedMyQualities] = useState<string[]>([]);
  const [submissionSuccess, setSubmissionSuccess] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const loadAll = () => {
    autoReconcileAllClassesWeeklyIncome();

    const activeId = pupilId.trim() || crypto.randomUUID();
    let foundPupil = pupilId.trim() ? getPupilById(pupilId.trim()) : null;

    if (!foundPupil) {
      foundPupil = createAnonymousPupilProfile("class-year-4-teal", 1, {
        anonymize: true,
      });
      foundPupil.pupilId = activeId;
    }

    const loadedJobs = getSavedJobs();
    const loadedApps = getSavedApplications();
    const loadedCompleted = getCompletedJobsForPupil(activeId);
    const loadedNotifs = getSavedNotifications(activeId);

    setPupil(foundPupil);
    setJobs(loadedJobs);
    setApplications(loadedApps.filter((a) => a.pupilId === activeId));
    setCompletedJobs(loadedCompleted);
    setNotifications(loadedNotifs);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, [pupilId]);

  const activeJob = pupil ? getActiveJobForPupil(pupil.pupilId) : null;
  const availableJobs = jobs.filter((j) => j.status === "open");

  // Open apply modal
  const handleOpenApplyModal = (job: JobPostingDocument) => {
    setApplyingJob(job);
    setCvStatement("");
    setSelectedMyQualities(job.requiredQualities.slice(0, 2));
    setFormError(null);
  };

  // Submit Application
  const handleSubmitApplication = (e: React.FormEvent) => {
    e.preventDefault();
    if (!applyingJob || !pupil) return;

    if (!cvStatement.trim()) {
      setFormError("Please write a few sentences about why you would like this role.");
      return;
    }

    try {
      const displayName = pupil.localDisplayName || pupil.educationalCodename;
      submitJobApplication({
        jobId: applyingJob.jobId,
        classId: applyingJob.classId,
        pupilId: pupil.pupilId,
        applicantDisplayName: displayName,
        pupilCodename: pupil.educationalCodename,
        cvStatement: cvStatement.trim(),
        qualitiesHighlight: selectedMyQualities,
      });

      setApplyingJob(null);
      loadAll();
      setSubmissionSuccess(
        `Your application for "${applyingJob.title}" was submitted! Your teacher will review it soon.`
      );
      setTimeout(() => setSubmissionSuccess(null), 5000);
    } catch (err: unknown) {
      console.error("[PocketPot Application Error]:", err);
      const rawMsg = err instanceof Error ? err.message : "";
      if (rawMsg.includes("already submitted")) {
        setFormError("You have already submitted an application for this role.");
      } else if (rawMsg.includes("no longer accepting")) {
        setFormError("This role is no longer accepting new applications.");
      } else {
        setFormError("We couldn't submit your application right now. Please try again in a moment or ask your teacher!");
      }
    }
  };

  const handleDismissNotification = (id: string) => {
    markNotificationRead(id);
    setNotifications((prev) => prev.filter((n) => n.notificationId !== id));
  };

  if (loading || !pupil) {
    return (
      <main className="min-h-screen bg-canvas text-primaryText p-8 flex items-center justify-center font-lexend text-left">
        <div className="bg-surface rounded-2xl p-8 border border-borderMuted shadow-sm space-y-3 text-left">
          <Sparkles className="w-8 h-8 text-brandPrimary animate-spin" />
          <h2 className="text-xl font-bold text-primaryText">Opening Jobs Board...</h2>
        </div>
      </main>
    );
  }

  const displayName = pupil.localDisplayName || pupil.educationalCodename;
  const safePupilId = pupil.pupilId || pupilId || "anonymous";

  return (
    <div className="min-h-screen bg-canvas text-primaryText font-lexend text-left flex flex-col">
      {/* 1. TRUE FULL-WIDTH STICKY TOP HEADER IN TEAL */}
      <AppTopHeader
        role="pupil"
        pupilId={safePupilId}
        userName={displayName}
        badgeNumber={pupil.deskBadgeNumber}
        notificationBell={<PupilNotificationBell pupilId={safePupilId} inverted={true} />}
      />

      <main className="flex-1 w-full max-w-4xl mx-auto p-4 md:p-8 pb-56 sm:pb-64 md:pb-72 space-y-6 text-left">
        {/* 2. PUPIL NOTIFICATIONS DRAWER (Approved/Green, Denied/Amber, References) */}
      {notifications.filter((n) => !n.read).length > 0 && (
        <section className="space-y-2.5 text-left">
          {notifications
            .filter((n) => !n.read)
            .map((notif) => {
              const isHired = notif.type === "job_hired";
              const isRejection = notif.type === "job_encouragement_rejection";
              const isRef = notif.type === "reference_received";

              const cardClasses = isHired
                ? "bg-greenSurface border-positiveState/40 text-primaryText"
                : isRejection
                ? "bg-amberSurface border-brandSecondary/40 text-primaryText"
                : isRef
                ? "bg-indigoSurface border-focusIndicator/30 text-primaryText"
                : "bg-tealSurface/50 border-brandPrimary/30 text-primaryText";

              return (
                <div
                  key={notif.notificationId}
                  className={`p-4 rounded-island border flex items-start justify-between gap-3 shadow-xs text-left ${cardClasses}`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-8 h-8 rounded-full bg-surface flex items-center justify-center shadow-xs flex-shrink-0 mt-0.5 ${
                        isHired
                          ? "text-positiveState"
                          : isRejection
                          ? "text-brandSecondary"
                          : "text-brandPrimary"
                      }`}
                    >
                      {isHired ? (
                        <Award className="w-4 h-4 text-positiveState" />
                      ) : isRejection ? (
                        <Star className="w-4 h-4 text-brandSecondary" />
                      ) : isRef ? (
                        <Star className="w-4 h-4 text-brandSecondary" />
                      ) : (
                        <Heart className="w-4 h-4 text-brandPrimary" />
                      )}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-primaryText">{notif.title}</h4>
                        {isHired && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white text-positiveState border border-positiveState/30">
                            Approved
                          </span>
                        )}
                        {isRejection && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white text-brandSecondary border border-brandSecondary/30">
                            Role Given to Classmate
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-primaryText/85 leading-relaxed font-medium">
                        {notif.message}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDismissNotification(notif.notificationId)}
                    className="text-primaryText/50 hover:text-primaryText p-1"
                    title="Dismiss notification"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
        </section>
      )}

      {/* Submission Success Toast */}
      {submissionSuccess && (
        <div className="p-4 rounded-island bg-greenSurface border border-positiveState/30 text-positiveState font-bold text-sm flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{submissionSuccess}</span>
        </div>
      )}

      {/* 3. SLIDING TAB AT TOP ('Available Jobs' vs 'My Jobs') - Requirement 4 */}
      <div className="bg-surface rounded-full p-1.5 border border-borderMuted shadow-xs flex items-center relative">
        <button
          type="button"
          onClick={() => setActiveTab("available")}
          className={`flex-1 py-3 px-4 rounded-full text-sm font-bold transition-all flex items-center justify-center gap-2 select-none ${
            activeTab === "available"
              ? "bg-brandPrimary text-white shadow-xs"
              : "text-primaryText/70 hover:text-primaryText"
          }`}
        >
          <Briefcase className="w-4 h-4" />
          <span>Available Jobs</span>
          {availableJobs.length > 0 && (
            <span
              className={`px-2 py-0.2 rounded-full text-xs font-extrabold ${
                activeTab === "available"
                  ? "bg-white/20 text-white"
                  : "bg-tealSurface text-brandPrimary"
              }`}
            >
              {availableJobs.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("my-jobs")}
          className={`flex-1 py-3 px-4 rounded-full text-sm font-bold transition-all flex items-center justify-center gap-2 select-none ${
            activeTab === "my-jobs"
              ? "bg-brandPrimary text-white shadow-xs"
              : "text-primaryText/70 hover:text-primaryText"
          }`}
        >
          <Award className="w-4 h-4" />
          <span>My Jobs</span>
          {(activeJob || completedJobs.length > 0) && (
            <span
              className={`px-2 py-0.2 rounded-full text-xs font-extrabold ${
                activeTab === "my-jobs"
                  ? "bg-white/20 text-white"
                  : "bg-amberSurface text-brandSecondary"
              }`}
            >
              {activeJob ? "1 Active" : `${completedJobs.length} Completed`}
            </span>
          )}
        </button>
      </div>

      {/* ========================================================= */}
      {/* 4. TAB 1: AVAILABLE JOBS (Requirement 5)                  */}
      {/* ========================================================= */}
      {activeTab === "available" && (
        <section className="space-y-4 text-left">
          {availableJobs.length === 0 ? (
            <div className="p-12 text-center bg-surface rounded-pot border border-dashed border-borderMuted space-y-3">
              <Briefcase className="w-10 h-10 text-primaryText/35 mx-auto" />
              <h3 className="text-lg font-bold text-primaryText">No open jobs right now</h3>
              <p className="text-sm text-primaryText/60 max-w-md mx-auto">
                All roles are currently filled. Check back soon when the next job terms rotation begins!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {availableJobs.map((job) => {
                const alreadyApplied = applications.some((a) => a.jobId === job.jobId);

                return (
                  <div
                    key={job.jobId}
                    className="bg-surface rounded-3xl border border-borderMuted shadow-islandCard flex flex-col justify-between overflow-hidden hover:shadow-md transition-all text-left"
                  >
                    {/* Green Header with Job Title */}
                    <div className="bg-brandPrimary text-white px-5 py-3.5 flex items-center justify-between gap-3 shadow-xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-white/20 border border-white/25 flex items-center justify-center flex-shrink-0">
                          <Briefcase className="w-4 h-4 text-white" />
                        </div>
                        <h3 className="text-base sm:text-lg font-extrabold text-white leading-tight truncate">
                          {job.title}
                        </h3>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-white/20 text-white border border-white/30 flex-shrink-0">
                        Open Role
                      </span>
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

                          {/* Pay Schedule Pill */}
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-canvas text-primaryText/75 border border-borderMuted shadow-2xs">
                            <Calendar className="w-3.5 h-3.5 text-primaryText/60" />
                            <span>Paid with basic income</span>
                          </span>
                        </div>

                        {/* 2. Role Description */}
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
                            {job.requiredQualities.map((q, i) => (
                              <span
                                key={i}
                                className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/80 shadow-2xs flex items-center gap-1"
                              >
                                <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
                                <span>{q}</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* 4. Action Footer */}
                      <div className="pt-4 mt-2 border-t border-borderMuted/70 flex items-center justify-between gap-3">
                        <span className="text-[11px] text-primaryText/50 font-medium hidden sm:inline">
                          Weekly wage credited to your card
                        </span>

                        {alreadyApplied ? (
                          <span className="ml-auto px-4 py-2 rounded-full text-xs font-bold bg-tealSurface text-brandPrimary border border-brandPrimary/30 flex items-center gap-1.5 shadow-2xs">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                            <span>Applied • Pending Review</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenApplyModal(job)}
                            className="ml-auto px-5 py-2.5 rounded-full bg-brandPrimary hover:bg-teal-700 text-white font-bold text-xs shadow-xs hover:shadow transition-all flex items-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brandPrimary"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Apply for Role</span>
                          </button>
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

      {/* ========================================================= */}
      {/* 5. TAB 2: MY JOBS (Active, Pending, Completed Portfolio)  */}
      {/* ========================================================= */}
      {activeTab === "my-jobs" && (
        <section className="space-y-6 text-left">
          {/* A. CURRENT ACTIVE JOB */}
          <div className="bg-surface rounded-pot p-4 sm:p-6 md:p-8 border border-borderMuted shadow-islandCard space-y-4 text-left">
            <div className="flex items-center gap-2 border-b border-borderMuted/60 pb-3">
              <Award className="w-5 h-5 text-brandSecondary" />
              <h3 className="text-lg font-bold text-primaryText">Current Active Role</h3>
            </div>

            {activeJob ? (
              <div className="rounded-3xl border border-borderMuted shadow-xs overflow-hidden text-left bg-surface">
                {/* Green Header with Active Role Title */}
                <div className="bg-brandPrimary text-white px-5 py-3.5 flex items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-white/20 border border-white/25 flex items-center justify-center flex-shrink-0">
                      <Award className="w-4 h-4 text-white" />
                    </div>
                    <h4 className="text-base sm:text-lg font-extrabold text-white leading-tight truncate">
                      {activeJob.title}
                    </h4>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-white/20 text-white border border-white/30 flex-shrink-0">
                    Active in Classroom
                  </span>
                </div>

                <div className="p-5 sm:p-6 space-y-4">
                  {/* Component Information Pills */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-tealSurface text-brandPrimary border border-brandPrimary/30 shadow-2xs">
                      <Coins className="w-3.5 h-3.5 text-brandPrimary" />
                      <span>+{formatCurrency(activeJob.wageCents)} / week</span>
                    </span>

                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amberSurface text-brandSecondary border border-brandSecondary/30 shadow-2xs">
                      <Clock className="w-3.5 h-3.5 text-brandSecondary" />
                      <span>{activeJob.termWeeks}-week term</span>
                    </span>

                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-canvas text-primaryText/75 border border-borderMuted shadow-2xs">
                      <Calendar className="w-3.5 h-3.5 text-primaryText/60" />
                      <span>Paid automatically with basic income</span>
                    </span>
                  </div>

                  <p className="text-sm text-primaryText/85 leading-relaxed font-normal">
                    {activeJob.description}
                  </p>

                  {/* Term Progress Bar */}
                  <div className="pt-3 border-t border-borderMuted/70 space-y-1.5 text-left">
                    <div className="flex justify-between text-xs font-bold text-primaryText/75">
                      <span>Term Duration: {activeJob.termWeeks} Weeks</span>
                      <span className="text-brandPrimary font-extrabold">Active Role</span>
                    </div>
                    <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden border border-borderMuted/40">
                      <div
                        className="h-full bg-brandPrimary rounded-full transition-all"
                        style={{ width: "50%" }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-primaryText/60 bg-canvas rounded-2xl border border-dashed border-borderMuted space-y-1">
                <p className="text-sm font-semibold">You do not currently hold a classroom role.</p>
                <p className="text-xs">
                  Switch to the &quot;Available Jobs&quot; tab above to view open roles and apply!
                </p>
              </div>
            )}
          </div>

          {/* B. PENDING APPLICATIONS */}
          {applications.length > 0 && (
            <div className="bg-surface rounded-pot p-4 sm:p-6 md:p-8 border border-borderMuted shadow-islandCard space-y-4 text-left">
              <h3 className="text-lg font-bold text-primaryText">My Submitted Applications</h3>
              <div className="space-y-3">
                {applications.map((app) => (
                  <div
                    key={app.applicationId}
                    className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left ${
                      app.status === "accepted"
                        ? "bg-greenSurface/60 border-positiveState/30"
                        : app.status === "rejected"
                        ? "bg-amberSurface/60 border-brandSecondary/30"
                        : "bg-canvas border-borderMuted"
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-primaryText">
                          {jobs.find((j) => j.jobId === app.jobId)?.title || "Classroom Job"}
                        </h4>
                        {app.status === "accepted" && (
                          <span className="text-[11px] text-positiveState font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Approved
                          </span>
                        )}
                        {app.status === "rejected" && (
                          <span className="text-[11px] text-brandSecondary font-bold flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5" /> Classmate Chosen
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-primaryText/70 mt-0.5 line-clamp-1 italic">
                        &ldquo;{app.cvStatement}&rdquo;
                      </p>
                      {app.status === "rejected" && (
                        <p className="text-[11px] text-brandSecondary font-medium mt-1">
                          Another classmate was appointed for this rotation. Your teacher was proud of your application!
                        </p>
                      )}
                      {app.status === "accepted" && (
                        <p className="text-[11px] text-positiveState font-medium mt-1">
                          Congratulations! Your weekly wage is active on class payout days.
                        </p>
                      )}
                    </div>

                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold self-start sm:self-center flex-shrink-0 ${
                        app.status === "accepted"
                          ? "bg-greenSurface text-positiveState border border-positiveState/30"
                          : app.status === "rejected"
                          ? "bg-amberSurface text-brandSecondary border border-brandSecondary/30"
                          : "bg-tealSurface text-brandPrimary border border-brandPrimary/30"
                      }`}
                    >
                      {app.status === "accepted"
                        ? "Appointed 🎉"
                        : app.status === "rejected"
                        ? "Role Given to Classmate"
                        : "Under Teacher Review"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* C. COMPLETED JOBS & TEACHER REFERENCES (Requirement 11) */}
          <div className="bg-surface rounded-pot p-4 sm:p-6 md:p-8 border border-borderMuted shadow-islandCard space-y-4 text-left">
            <div className="flex items-center gap-2 border-b border-borderMuted/60 pb-3">
              <Star className="w-5 h-5 text-brandSecondary" />
              <div>
                <h3 className="text-lg font-bold text-primaryText">Completed Jobs &amp; References</h3>
                <span className="text-xs text-primaryText/60">
                  Automatically attached to any future job applications you make!
                </span>
              </div>
            </div>

            {completedJobs.length === 0 ? (
              <div className="p-6 text-center text-primaryText/60 bg-canvas rounded-2xl border border-dashed border-borderMuted space-y-1">
                <p className="text-sm font-semibold">No completed job terms yet.</p>
                <p className="text-xs">
                  Once you complete a job rotation, your teacher will write a glowing reference that appears right here.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {completedJobs.map((cj, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-island bg-canvas border border-borderMuted space-y-2 text-left"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-positiveState" />
                        <h4 className="text-sm font-bold text-primaryText">{cj.title}</h4>
                      </div>
                      <span className="text-xs font-bold text-primaryText/60">
                        {cj.termWeeks} Weeks Completed
                      </span>
                    </div>

                    {/* Teacher Reference Quote */}
                    <div className="p-3 rounded-xl bg-tealSurface/40 border border-brandPrimary/25 text-left">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-brandPrimary block">
                        Teacher Reference:
                      </span>
                      <p className="text-xs text-primaryText/90 font-medium italic mt-0.5">
                        &ldquo;{cj.teacherReference}&rdquo;
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ========================================================= */}
      {/* 6. MODAL: PUPIL APPLICATION FORM (Requirement 5)          */}
      {/* ========================================================= */}
      {applyingJob && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-primaryText/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200"
        >
          <div className="bg-surface rounded-[2rem] p-5 sm:p-6 md:p-8 max-w-lg w-full border border-borderMuted shadow-2xl space-y-4 sm:space-y-5 text-left my-4 sm:my-8">
            <div className="flex items-start justify-between border-b border-borderMuted/60 pb-3">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-brandPrimary block">
                  Classroom Job Application
                </span>
                <h3 className="text-2xl font-bold text-primaryText">{applyingJob.title}</h3>
                <span className="text-xs font-bold text-brandPrimary block mt-0.5">
                  Weekly Wage: {formatCurrency(applyingJob.wageCents)} &bull; {applyingJob.termWeeks}-Week Term
                </span>
              </div>
              <button
                type="button"
                onClick={() => setApplyingJob(null)}
                className="text-primaryText/50 hover:text-primaryText text-2xl font-bold p-1"
              >
                &times;
              </button>
            </div>

            {formError && (
              <div className="p-3.5 rounded-xl bg-amberSurface text-[#C2410C] border border-amber-300 text-xs font-semibold">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmitApplication} className="space-y-4 text-left">
              {/* Guidance Prompt */}
              <div className="p-3.5 rounded-xl bg-tealSurface/50 border border-brandPrimary/30 text-left">
                <span className="text-xs font-bold text-brandPrimary block">
                  Question from Teacher:
                </span>
                <p className="text-xs text-primaryText/90 mt-0.5 font-medium">
                  {applyingJob.cvPrompt || "Tell your teacher why you would be wonderful at this job!"}
                </p>
              </div>

              {/* Child's Simple Written Statement (CV) */}
              <div>
                <label className="block text-xs font-bold uppercase text-primaryText/70 mb-1">
                  Why are you suitable for this role? (Your Application CV)
                </label>
                <textarea
                  rows={4}
                  required
                  value={cvStatement}
                  onChange={(e) => setCvStatement(e.target.value)}
                  placeholder="I would like this role because I am organized, care about our classroom, and always follow instructions carefully..."
                  className="w-full px-4 py-2.5 text-sm bg-canvas rounded-xl border border-borderMuted text-primaryText focus:outline-none focus:ring-2 focus:ring-brandPrimary font-medium"
                />
              </div>

              {/* Qualities Checkbox Highlight */}
              <div>
                <label className="block text-xs font-bold uppercase text-primaryText/70 mb-1.5">
                  Select which qualities you bring:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {applyingJob.requiredQualities.map((q) => {
                    const isSelected = selectedMyQualities.includes(q);
                    return (
                      <button
                        type="button"
                        key={q}
                        onClick={() =>
                          setSelectedMyQualities((prev) =>
                            prev.includes(q) ? prev.filter((item) => item !== q) : [...prev, q]
                          )
                        }
                        className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1 ${
                          isSelected
                            ? "bg-brandPrimary text-white shadow-xs"
                            : "bg-canvas border border-borderMuted text-primaryText/70 hover:text-primaryText"
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3" />}
                        <span>{q}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Auto-Attached Completed Jobs Notice (Requirement 11) */}
              <div className="p-3 rounded-xl bg-canvas border border-borderMuted space-y-1 text-left">
                <span className="text-[11px] font-bold uppercase tracking-wider text-brandSecondary block">
                  Portfolio Attachment:
                </span>
                {completedJobs.length > 0 ? (
                  <p className="text-xs text-positiveState font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>
                      {completedJobs.length} completed job reference{completedJobs.length === 1 ? "" : "s"} will be automatically attached!
                    </span>
                  </p>
                ) : (
                  <p className="text-xs text-primaryText/60">
                    This is your first classroom role application. Best of luck!
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-borderMuted">
                <button
                  type="button"
                  onClick={() => setApplyingJob(null)}
                  className="px-4 py-2 text-xs font-bold text-primaryText/70 hover:text-primaryText"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-full bg-brandPrimary hover:bg-teal-700 text-white font-bold text-sm shadow-sm transition-all flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit Application</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Extra spacer to guarantee a generous gap above the fixed bottom navigation */}
      <div className="h-10 sm:h-14 w-full" aria-hidden="true" />
      </main>

      {/* 7. STRICT 3-TAB PUPIL BOTTOM NAVIGATION */}
      <PupilBottomNav
        pupilId={safePupilId}
        activeTab="jobs"
        availableJobsCount={availableJobs.length}
      />
    </div>
  );
}
