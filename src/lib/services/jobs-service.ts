/**
 * PocketPot Jobs Board Service (Zero-PII & Fintech Integrated)
 * 
 * Provides end-to-end management for:
 * 1. Teacher Job Creation (Wage, Term in Weeks, Required Qualities, CV Prompt)
 * 2. Pupil Applications (Simple written CV text + auto-attached past completed jobs & references)
 * 3. Candidate Selection (Assigns job & wage, sends congratulatory notification & positive rejection notifications)
 * 4. Job Term Reminders (1-week-left reminder & term-end notice)
 * 5. Teacher References (Pre-populated personal references & completed jobs archive)
 * 6. Re-advertising & Archiving
 */

import {
  JobPostingDocument,
  JobApplicationDocument,
  PupilNotificationDocument,
  CompletedJobRecord,
  JobStatus,
} from "../firebase/types";
import { formatCurrency, assertZeroPII } from "../firebase/zero-pii";
import {
  saveJobToFirestore,
  saveJobsBatchToFirestore,
  deleteJobFromFirestore,
  saveApplicationToFirestore,
  saveApplicationsBatchToFirestore,
  deleteApplicationFromFirestore,
  deleteJobsAndApplicationsForClassInFirestore,
  saveNotificationToFirestore,
  markNotificationReadInFirestore,
  markAllNotificationsReadInFirestore,
} from "../firebase/firestore-service";
import {
  safeLocalStorageSetItem,
  safeLocalStorageGetItem,
} from "./storage-helper";

const STORAGE_KEY_JOBS = "pocketpot_jobs_v1";
const STORAGE_KEY_APPLICATIONS = "pocketpot_job_applications_v1";
const STORAGE_KEY_NOTIFICATIONS = "pocketpot_notifications_v1";
const STORAGE_KEY_COMPLETED_JOBS = "pocketpot_completed_jobs_v1";
const STORAGE_KEY_DELETED_CLASSES = "pocketpot_deleted_classes_v1";

export const APPLICATIONS_SYNC_EVENT = "pocketpot_applications_updated";
export const JOBS_SYNC_EVENT = "pocketpot_jobs_updated";
export const COMPLETED_JOBS_SYNC_EVENT = "pocketpot_completed_jobs_updated";

const memoryJobsCache = new Map<string, JobPostingDocument>();

function findPupilRealId(pupilIdOrAlias: string): string {
  if (typeof window === "undefined" || !pupilIdOrAlias) return pupilIdOrAlias;
  try {
    const raw = safeLocalStorageGetItem("pocketpot_pupils_v1");
    if (raw) {
      const pupils = JSON.parse(raw);
      if (Array.isArray(pupils)) {
        const found = pupils.find(
          (p) =>
            p.pupilId === pupilIdOrAlias ||
            p.deskBadgeNumber === pupilIdOrAlias ||
            String(p.deskBadgeNumber) === pupilIdOrAlias ||
            p.educationalCodename?.toLowerCase() === pupilIdOrAlias.toLowerCase()
        );
        if (found) return found.pupilId;
      }
    }
  } catch {
    // fallback
  }
  return pupilIdOrAlias;
}

export interface TermProgressInfo {
  progressPercent: number; // 0 to 100
  daysRemaining: number;
  daysElapsed: number;
  totalDays: number;
  weeksElapsed: number;
  totalWeeks: number;
  isCompleted: boolean;
  startDateFormatted: string;
  endDateFormatted: string;
  statusLabel: string;
}

/**
 * Calculates accurate progress, elapsed/remaining time, and labels for a job's term.
 */
export function calculateTermProgress(
  termStartDate?: string,
  termEndDate?: string,
  termWeeks: number = 4
): TermProgressInfo {
  const now = new Date();
  const nowTime = now.getTime();

  let start: Date;
  if (termStartDate) {
    start = new Date(termStartDate);
    if (isNaN(start.getTime())) start = now;
  } else {
    start = now;
  }

  let end: Date;
  if (termEndDate) {
    end = new Date(termEndDate);
    if (isNaN(end.getTime())) {
      end = new Date(start.getTime() + Math.max(1, termWeeks) * 7 * 86400000);
    }
  } else {
    end = new Date(start.getTime() + Math.max(1, termWeeks) * 7 * 86400000);
  }

  const startTime = start.getTime();
  const endTime = end.getTime();
  const totalMs = Math.max(86400000, endTime - startTime); // At least 1 day
  const elapsedMs = Math.max(0, nowTime - startTime);

  const rawPercent = (elapsedMs / totalMs) * 100;
  const progressPercent = Math.min(100, Math.max(0, Math.round(rawPercent)));

  const msRemaining = endTime - nowTime;
  const daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));
  const daysElapsed = Math.max(0, Math.floor(elapsedMs / (1000 * 60 * 60 * 24)));
  const totalDays = Math.max(1, Math.round(totalMs / (1000 * 60 * 60 * 24)));

  const totalWeeks = Math.max(1, Math.round(totalDays / 7));
  const weeksElapsed = Math.min(totalWeeks, Math.floor(daysElapsed / 7) + 1);

  const isCompleted = nowTime >= endTime || progressPercent >= 100;

  const formatDate = (d: Date) => {
    return d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const startDateFormatted = formatDate(start);
  const endDateFormatted = formatDate(end);

  let statusLabel = "";
  if (isCompleted) {
    statusLabel = "Term Completed";
  } else if (daysRemaining <= 7) {
    statusLabel = `${daysRemaining} day${daysRemaining === 1 ? "" : "s"} remaining (Final Week!)`;
  } else {
    statusLabel = `Week ${weeksElapsed} of ${totalWeeks} • ${daysRemaining} days remaining`;
  }

  return {
    progressPercent,
    daysRemaining,
    daysElapsed,
    totalDays,
    weeksElapsed,
    totalWeeks,
    isCompleted,
    startDateFormatted,
    endDateFormatted,
    statusLabel,
  };
}

function getDeletedClassIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = safeLocalStorageGetItem(STORAGE_KEY_DELETED_CLASSES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return new Set(parsed);
    }
  } catch {
    // fallback
  }
  return new Set();
}

export const PRESET_JOB_QUALITIES = [
  "Reliable",
  "Caring",
  "Organised",
  "Helpful",
  "Punctual",
  "Team Player",
  "Creative",
  "Good Listener",
  "Enthusiastic",
  "Patient",
] as const;

export const PRESET_REFERENCES = [
  "{NAME} was an extraordinarily reliable and helpful {JOB} who always took initiative.",
  "{NAME} showed fantastic dedication, teamwork, and care as our {JOB}, keeping everything running smoothly.",
  "{NAME} brought wonderful punctuality, organization, and a positive attitude to the {JOB} role every single week.",
  "{NAME} was thoughtful, responsible, and a true classroom role model as our {JOB}.",
  "{NAME} took immense pride in their work as {JOB} and supported all classmates with kindness.",
] as const;

/**
 * Loads jobs from storage or seeds starter classroom jobs
 */
export function getSavedJobs(classId?: string): JobPostingDocument[] {
  if (typeof window === "undefined") return [];
  const deleted = getDeletedClassIds();
  const stored = safeLocalStorageGetItem(STORAGE_KEY_JOBS);
  if (stored) {
    try {
      const parsed: JobPostingDocument[] = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        const nonDeleted = parsed.filter((j) => !deleted.has(j.classId));
        nonDeleted.forEach((j) => memoryJobsCache.set(j.jobId, j));
        if (classId) {
          return nonDeleted.filter((j) => j.classId === classId);
        }
        return nonDeleted;
      }
    } catch {
      // Fallback
    }
  }

  return [];
}

export function cacheJobsLocally(incomingJobs: JobPostingDocument[]): void {
  if (typeof window === "undefined" || !incomingJobs || incomingJobs.length === 0) return;
  const deleted = getDeletedClassIds();
  const validIncoming = incomingJobs.filter((j) => !deleted.has(j.classId));
  validIncoming.forEach((j) => memoryJobsCache.set(j.jobId, j));

  const localJobs = getSavedJobs();
  const jobMap = new Map(localJobs.map((j) => [j.jobId, j]));
  validIncoming.forEach((j) => {
    jobMap.set(j.jobId, { ...jobMap.get(j.jobId), ...j });
  });
  const merged = Array.from(jobMap.values()).filter((j) => !deleted.has(j.classId));
  safeLocalStorageSetItem(STORAGE_KEY_JOBS, JSON.stringify(merged));
  window.dispatchEvent(new Event(JOBS_SYNC_EVENT));
}

export function saveJobs(jobs: JobPostingDocument[]): void {
  if (typeof window === "undefined") return;
  const deleted = getDeletedClassIds();
  const nonDeleted = jobs.filter((j) => !deleted.has(j.classId));
  nonDeleted.forEach((j) => memoryJobsCache.set(j.jobId, j));
  safeLocalStorageSetItem(STORAGE_KEY_JOBS, JSON.stringify(nonDeleted));
  window.dispatchEvent(new Event(JOBS_SYNC_EVENT));
  try {
    saveJobsBatchToFirestore(nonDeleted);
  } catch (err) {
    console.warn("Firestore saveJobs warning:", err);
  }
}

/**
 * Creates a new job posting on the teacher's Jobs Board
 */
export function createJob(payload: {
  classId: string;
  teacherId?: string;
  title: string;
  description: string;
  wageCents: number;
  termWeeks: number;
  termStartDate?: string;
  termEndDate?: string;
  requiredQualities: string[];
  cvPrompt?: string;
}): JobPostingDocument {
  const jobs = getSavedJobs();
  const now = new Date();
  const startDateStr = payload.termStartDate || now.toISOString().split("T")[0];
  const termWeeks = Math.max(1, payload.termWeeks || 4);
  const calculatedEndDate =
    payload.termEndDate ||
    new Date(new Date(startDateStr).getTime() + termWeeks * 7 * 86400000).toISOString().split("T")[0];

  const newJob: JobPostingDocument = {
    jobId: crypto.randomUUID(),
    classId: payload.classId,
    teacherId: payload.teacherId || "teacher-current",
    title: payload.title.trim(),
    description: payload.description.trim(),
    wageCents: Math.max(50, payload.wageCents),
    termWeeks,
    termStartDate: startDateStr,
    termEndDate: calculatedEndDate,
    requiredQualities: payload.requiredQualities.length > 0 ? payload.requiredQualities : ["Reliable", "Helpful"],
    cvPrompt: payload.cvPrompt?.trim() || "Tell your teacher why you would be great at this role and what qualities you bring!",
    status: "open",
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  assertZeroPII(newJob as unknown as Record<string, unknown>);
  saveJobs([newJob, ...jobs]);

  // Stage 1 Notification: Announce new job opening to pupils in the class
  addNotification({
    classId: newJob.classId,
    title: "New Classroom Job Posted! 💼",
    message: `"${newJob.title}" is now open on the Jobs Board (${formatCurrency(newJob.wageCents)}/wk, ${newJob.termWeeks}-week term). Apply now!`,
    type: "general",
    jobId: newJob.jobId,
    jobTitle: newJob.title,
  });

  return newJob;
}

export function getJobById(jobId: string): JobPostingDocument | null {
  if (!jobId) return null;
  const jobs = getSavedJobs();
  const found = jobs.find((j) => j.jobId === jobId);
  if (found) return found;
  if (memoryJobsCache.has(jobId)) {
    return memoryJobsCache.get(jobId)!;
  }
  return null;
}

/**
 * APPLICATIONS STORE & MANAGEMENT
 */
export function getSavedApplications(
  jobId?: string,
  classId?: string,
  pupilId?: string
): JobApplicationDocument[] {
  if (typeof window === "undefined") return [];
  const deleted = getDeletedClassIds();
  const stored = safeLocalStorageGetItem(STORAGE_KEY_APPLICATIONS);
  if (stored) {
    try {
      const parsed: Record<string, unknown>[] = JSON.parse(stored);
      // Migrate and strictly purge any legacy pupilName to uphold Zero-PII compliance
      const normalized: JobApplicationDocument[] = parsed
        .filter((a) => !deleted.has(a.classId as string))
        .map((a) => {
          const copy = { ...a };
          const applicantDisplayName =
            (copy.applicantDisplayName as string) ||
            (copy.pupilName as string) ||
            (copy.pupilCodename as string) ||
            "Student";
          delete copy.pupilName; // Purge forbidden PII key from storage
          return {
            ...copy,
            applicantDisplayName,
          } as unknown as JobApplicationDocument;
        });

      let res = normalized;
      if (jobId) {
        res = res.filter((a) => a.jobId === jobId);
      }
      if (classId) {
        res = res.filter((a) => a.classId === classId);
      }
      if (pupilId) {
        res = res.filter((a) => a.pupilId === pupilId);
      }
      return res;
    } catch {
      // Fallback
    }
  }
  return [];
}

export function cacheApplicationsLocally(incomingApps: JobApplicationDocument[]): void {
  if (typeof window === "undefined" || !incomingApps || incomingApps.length === 0) return;
  const deleted = getDeletedClassIds();
  const valid = incomingApps.filter((a) => !deleted.has(a.classId));
  const localApps = getSavedApplications();
  const appMap = new Map(localApps.map((a) => [a.applicationId, a]));
  valid.forEach((a) => {
    appMap.set(a.applicationId, { ...appMap.get(a.applicationId), ...a });
  });
  const merged = Array.from(appMap.values()).filter((a) => !deleted.has(a.classId));
  safeLocalStorageSetItem(STORAGE_KEY_APPLICATIONS, JSON.stringify(merged));
  window.dispatchEvent(new Event(APPLICATIONS_SYNC_EVENT));
}

export function saveApplications(apps: JobApplicationDocument[]): void {
  if (typeof window === "undefined") return;
  const deleted = getDeletedClassIds();
  // Ensure legacy forbidden "pupilName" key is never persisted in storage
  const sanitized = apps
    .filter((a) => !deleted.has(a.classId))
    .map((app) => {
      const copy = { ...(app as unknown as Record<string, unknown>) };
      delete copy.pupilName;
      return copy as unknown as JobApplicationDocument;
    });
  safeLocalStorageSetItem(STORAGE_KEY_APPLICATIONS, JSON.stringify(sanitized));
  window.dispatchEvent(new Event(APPLICATIONS_SYNC_EVENT));
  try {
    saveApplicationsBatchToFirestore(sanitized);
  } catch (err) {
    console.warn("saveApplicationsBatchToFirestore warning:", err);
  }
}

/**
 * COMPLETED JOBS & REFERENCES STORE
 */
export function getCompletedJobsForPupil(pupilId: string): CompletedJobRecord[] {
  if (typeof window === "undefined" || !pupilId) return [];
  const stored = safeLocalStorageGetItem(STORAGE_KEY_COMPLETED_JOBS);
  if (stored) {
    try {
      const parsed: Record<string, CompletedJobRecord[]> = JSON.parse(stored);
      const realId = findPupilRealId(pupilId);
      const listA = parsed[pupilId] || [];
      const listB = realId && realId !== pupilId ? (parsed[realId] || []) : [];
      const combined = [...listA, ...listB];
      const seen = new Set<string>();
      return combined.filter((item) => {
        const key = `${item.jobId}-${item.completedDate}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    } catch {
      // Fallback
    }
  }
  return [];
}

export function saveCompletedJobForPupil(pupilId: string, record: CompletedJobRecord): void {
  if (typeof window === "undefined" || !pupilId) return;
  const stored = safeLocalStorageGetItem(STORAGE_KEY_COMPLETED_JOBS);
  let parsed: Record<string, CompletedJobRecord[]> = {};
  if (stored) {
    try {
      parsed = JSON.parse(stored);
    } catch {
      parsed = {};
    }
  }
  const realId = findPupilRealId(pupilId);

  const existingA = parsed[pupilId] || [];
  parsed[pupilId] = [record, ...existingA.filter((r) => r.jobId !== record.jobId)];

  if (realId && realId !== pupilId) {
    const existingB = parsed[realId] || [];
    parsed[realId] = [record, ...existingB.filter((r) => r.jobId !== record.jobId)];
  }

  safeLocalStorageSetItem(STORAGE_KEY_COMPLETED_JOBS, JSON.stringify(parsed));
  window.dispatchEvent(new Event(COMPLETED_JOBS_SYNC_EVENT));
}

export const NOTIFICATIONS_SYNC_EVENT = "pocketpot_notifications_sync";

/**
 * NOTIFICATIONS STORE
 */
export function getSavedNotifications(pupilId?: string, forTeacher?: boolean): PupilNotificationDocument[] {
  if (typeof window === "undefined") return [];
  const stored = safeLocalStorageGetItem(STORAGE_KEY_NOTIFICATIONS);
  if (stored) {
    try {
      const parsed: PupilNotificationDocument[] = JSON.parse(stored);
      if (forTeacher) {
        return parsed.filter((n) => n.isTeacherNotification);
      }
      if (pupilId) {
        return parsed.filter((n) => n.pupilId === pupilId);
      }
      return parsed;
    } catch {
      // Fallback
    }
  }
  return [];
}

export function saveNotifications(notifs: PupilNotificationDocument[]): void {
  if (typeof window === "undefined") return;
  safeLocalStorageSetItem(STORAGE_KEY_NOTIFICATIONS, JSON.stringify(notifs));
  window.dispatchEvent(new Event(NOTIFICATIONS_SYNC_EVENT));
}

export function addNotification(notif: Omit<PupilNotificationDocument, "notificationId" | "createdAt" | "read">): PupilNotificationDocument {
  const notifs = getSavedNotifications();
  const newNotif: PupilNotificationDocument = {
    ...notif,
    notificationId: crypto.randomUUID(),
    read: false,
    createdAt: new Date().toISOString(),
  };
  saveNotifications([newNotif, ...notifs]);
  
  // Real-time Firestore sync
  saveNotificationToFirestore(newNotif).catch((err) =>
    console.warn("saveNotificationToFirestore warning:", err)
  );

  return newNotif;
}

export function markNotificationRead(notificationId: string): void {
  const notifs = getSavedNotifications();
  const updated = notifs.map((n) => (n.notificationId === notificationId ? { ...n, read: true } : n));
  saveNotifications(updated);

  markNotificationReadInFirestore(notificationId).catch((err) =>
    console.warn("markNotificationReadInFirestore warning:", err)
  );
}

export function markAllNotificationsRead(pupilId?: string, forTeacher?: boolean, classId?: string): void {
  const notifs = getSavedNotifications();
  const updated = notifs.map((n) => {
    if (forTeacher && n.isTeacherNotification) return { ...n, read: true };
    if (!forTeacher) {
      if (pupilId && n.pupilId === pupilId) return { ...n, read: true };
      if (!n.isTeacherNotification) return { ...n, read: true };
    }
    return n;
  });
  saveNotifications(updated);

  markAllNotificationsReadInFirestore(pupilId, forTeacher, classId).catch((err) =>
    console.warn("markAllNotificationsReadInFirestore warning:", err)
  );
}

/**
 * SUBMIT A JOB APPLICATION (By Pupil)
 * Automatically attaches any past completed jobs and teacher references!
 */
export function submitJobApplication(payload: {
  jobId: string;
  classId: string;
  pupilId: string;
  applicantDisplayName?: string;
  pupilCodename: string;
  cvStatement: string;
  qualitiesHighlight: string[];
  jobFallback?: JobPostingDocument;
}): JobApplicationDocument {
  let job = getJobById(payload.jobId);
  if (!job && payload.jobFallback) {
    job = payload.jobFallback;
    memoryJobsCache.set(job.jobId, job);
  }
  if (!job) {
    throw new Error("Job not found. It may have been closed or updated by your teacher.");
  }
  if (job.status !== "open") {
    throw new Error("This role is no longer accepting new applications.");
  }

  // Check if pupil already applied with active pending or accepted application
  const existingApps = getSavedApplications(payload.jobId);
  const alreadyApplied = existingApps.some(
    (a) => a.pupilId === payload.pupilId && (a.status === "pending" || a.status === "accepted")
  );
  if (alreadyApplied) {
    throw new Error("You have already submitted an application for this role.");
  }

  // Auto-attach completed jobs and teacher references
  const priorCompleted = getCompletedJobsForPupil(payload.pupilId);
  const displayName = payload.applicantDisplayName || payload.pupilCodename;

  const newApp: JobApplicationDocument = {
    applicationId: crypto.randomUUID(),
    jobId: payload.jobId,
    classId: payload.classId || job.classId,
    pupilId: payload.pupilId,
    applicantDisplayName: displayName,
    pupilCodename: payload.pupilCodename,
    cvStatement: payload.cvStatement.trim(),
    qualitiesHighlight: payload.qualitiesHighlight,
    attachedCompletedJobs: priorCompleted,
    status: "pending",
    submittedAt: new Date().toISOString(),
  };

  assertZeroPII(newApp as unknown as Record<string, unknown>);
  saveApplications([newApp, ...getSavedApplications()]);

  // 1. Create Notification for Teacher (Bell Icon)
  addNotification({
    classId: newApp.classId,
    isTeacherNotification: true,
    title: "New Job Application Submitted",
    message: `${displayName} submitted an application for "${job.title}".`,
    type: "job_application_submitted",
    jobId: job.jobId,
    jobTitle: job.title,
  });

  // 2. Create Confirmation Notification for Pupil (Bell Icon)
  addNotification({
    pupilId: newApp.pupilId,
    classId: newApp.classId,
    title: "Application Submitted! 📋",
    message: `You applied for "${job.title}". Your teacher will review your application soon.`,
    type: "job_application_submitted",
    jobId: job.jobId,
    jobTitle: job.title,
  });

  return newApp;
}

/**
 * HIRE APPLICANT FOR JOB (By Teacher)
 * 1. Assigns selected pupil to the job and weekly wage
 * 2. Removes advert from available jobs (status -> "filled")
 * 3. Sends congratulatory notification to chosen child
 * 4. Sends a positive, encouraging rejection notification to all other applicants
 */
export function hireApplicantForJob(
  jobId: string,
  applicationId: string
): {
  hiredJob: JobPostingDocument;
  hiredApp: JobApplicationDocument;
  rejectionsSentCount: number;
} {
  const jobs = getSavedJobs();
  const jobIdx = jobs.findIndex((j) => j.jobId === jobId);
  if (jobIdx === -1) throw new Error("Job posting not found");

  const apps = getSavedApplications(jobId);
  const targetApp = apps.find((a) => a.applicationId === applicationId);
  if (!targetApp) throw new Error("Application not found");

  const now = new Date();
  const rawStartDate = jobs[jobIdx].termStartDate || now.toISOString();
  // Ensure start date is at least today if it was past before hiring
  const effectiveStart =
    new Date(rawStartDate).getTime() < now.getTime() - 86400000 ? now.toISOString() : rawStartDate;
  const termWeeks = jobs[jobIdx].termWeeks || 4;
  const termEndDate =
    jobs[jobIdx].termEndDate && new Date(jobs[jobIdx].termEndDate!).getTime() > new Date(effectiveStart).getTime()
      ? jobs[jobIdx].termEndDate!
      : new Date(new Date(effectiveStart).getTime() + termWeeks * 7 * 86400000).toISOString();
  const applicantLabel = targetApp.applicantDisplayName || targetApp.pupilCodename;

  // 1. Update Job
  const updatedJob: JobPostingDocument = {
    ...jobs[jobIdx],
    status: "filled",
    assignedPupilId: targetApp.pupilId,
    assignedPupilName: applicantLabel,
    termStartDate: effectiveStart,
    termEndDate: termEndDate,
    weeksElapsed: 0,
    reminderOneWeekSent: false,
    completionReminderSent: false,
    updatedAt: now.toISOString(),
  };
  jobs[jobIdx] = updatedJob;
  saveJobs(jobs);

  // 2. Update Applications & Send Notifications
  const allApps = getSavedApplications();
  let rejectionsCount = 0;

  const updatedAllApps = allApps.map((a) => {
    if (a.jobId === jobId) {
      if (a.applicationId === applicationId) {
        return {
          ...a,
          status: "accepted" as const,
          reviewedAt: now.toISOString(),
        };
      } else {
        rejectionsCount++;
        // Send Positive, Growth-Mindset Rejection Notification
        addNotification({
          pupilId: a.pupilId,
          classId: a.classId,
          title: "Thank You for Applying! 🌟",
          message: `Thank you for putting yourself forward for ${updatedJob.title}! A classmate was chosen for this rotation, but your application showed wonderful qualities and effort. Let's puzzle out your next step on the Jobs Board—new roles open regularly!`,
          type: "job_encouragement_rejection",
          jobId: updatedJob.jobId,
          jobTitle: updatedJob.title,
        });

        return {
          ...a,
          status: "rejected" as const,
          reviewedAt: now.toISOString(),
        };
      }
    }
    return a;
  });

  saveApplications(updatedAllApps);

  // 3. Send Congratulatory Notification to Hired Pupil
  addNotification({
    pupilId: targetApp.pupilId,
    classId: updatedJob.classId,
    title: "You Got the Job! 🎉",
    message: `Congratulations! You have been appointed as our new ${updatedJob.title}! Your weekly wage of ${formatCurrency(updatedJob.wageCents)} will be automatically credited to your card on class payout days for your ${updatedJob.termWeeks}-week term.`,
    type: "job_hired",
    jobId: updatedJob.jobId,
    jobTitle: updatedJob.title,
  });

  // 4. Send Confirmation Notification to Teacher
  addNotification({
    classId: updatedJob.classId,
    isTeacherNotification: true,
    title: "Candidate Appointed! 🌟",
    message: `${applicantLabel} has been appointed as ${updatedJob.title} (${updatedJob.termWeeks}-week term).`,
    type: "job_hired",
    jobId: updatedJob.jobId,
    jobTitle: updatedJob.title,
  });

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("pocketpot_balance_updated"));
  }

  return {
    hiredJob: updatedJob,
    hiredApp: { ...targetApp, status: "accepted" },
    rejectionsSentCount: rejectionsCount,
  };
}

/**
 * REJECT AN INDIVIDUAL APPLICANT WITH GROWTH-MINDSET ENCOURAGEMENT
 */
export function rejectApplicant(
  jobId: string,
  applicationId: string
): { updatedApp: JobApplicationDocument } {
  const allApps = getSavedApplications();
  const appIdx = allApps.findIndex((a) => a.applicationId === applicationId);
  if (appIdx === -1) throw new Error("Application not found");

  const app = allApps[appIdx];
  const job = getJobById(jobId);
  const jobTitle = job ? job.title : "this role";

  const updatedApp: JobApplicationDocument = {
    ...app,
    status: "rejected",
    reviewedAt: new Date().toISOString(),
  };
  allApps[appIdx] = updatedApp;
  saveApplications(allApps);

  // Send growth-mindset encouraging notification to pupil
  addNotification({
    pupilId: app.pupilId,
    classId: app.classId,
    title: "Thank You for Applying! 🌟",
    message: `Thank you for putting yourself forward for ${jobTitle}! Your application demonstrated thoughtful qualities and effort. Keep developing your skills and look out for new roles opening on the Jobs Board!`,
    type: "job_encouragement_rejection",
    jobId,
    jobTitle,
  });

  // Notify teacher
  addNotification({
    classId: app.classId,
    isTeacherNotification: true,
    title: "Application Feedback Sent",
    message: `Encouraging feedback sent to ${app.applicantDisplayName || app.pupilCodename} for ${jobTitle}.`,
    type: "job_encouragement_rejection",
    jobId,
    jobTitle,
  });

  return { updatedApp };
}

/**
 * Permanently cleans up all jobs and applications associated with a deleted class
 */
export function deleteJobsAndApplicationsForClass(classId: string): void {
  if (typeof window === "undefined" || !classId) return;
  const jobs = getSavedJobs().filter((j) => j.classId !== classId);
  safeLocalStorageSetItem(STORAGE_KEY_JOBS, JSON.stringify(jobs));
  const apps = getSavedApplications().filter((a) => a.classId !== classId);
  safeLocalStorageSetItem(STORAGE_KEY_APPLICATIONS, JSON.stringify(apps));
  window.dispatchEvent(new Event(JOBS_SYNC_EVENT));
  window.dispatchEvent(new Event(APPLICATIONS_SYNC_EVENT));
  try {
    deleteJobsAndApplicationsForClassInFirestore(classId);
  } catch (err) {
    console.warn("deleteJobsAndApplicationsForClassInFirestore warning:", err);
  }
}

/**
 * Retrieves the currently active job for a pupil (if any)
 */
export function getActiveJobForPupil(pupilId: string): JobPostingDocument | null {
  const jobs = getSavedJobs();
  return jobs.find((j) => j.assignedPupilId === pupilId && j.status === "filled") || null;
}

/**
 * Checks all filled jobs for 1-week-left reminders and term finishes
 */
export function checkAndAdvanceJobTerms(classId?: string): {
  remindersSent: number;
  completedCount: number;
} {
  const jobs = getSavedJobs(classId);
  const now = new Date();
  let remindersSent = 0;
  let completedCount = 0;
  let hasModifications = false;

  const updatedJobs = jobs.map((job) => {
    if (job.status !== "filled" || !job.termEndDate || !job.assignedPupilId) {
      return job;
    }

    const end = new Date(job.termEndDate);
    const msRemaining = end.getTime() - now.getTime();
    const daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24));

    // 1. One Week Left Reminder
    if (daysRemaining <= 7 && daysRemaining > 0 && !job.reminderOneWeekSent) {
      remindersSent++;
      hasModifications = true;

      // Notify Teacher
      addNotification({
        classId: job.classId,
        isTeacherNotification: true,
        title: "Job Term Reminder (1 Week Left)",
        message: `${job.assignedPupilName || "Student"}'s term as ${job.title} finishes in 1 week. Prepare a reference for their portfolio!`,
        type: "job_term_one_week_reminder",
        jobId: job.jobId,
        jobTitle: job.title,
      });

      // Notify Pupil
      addNotification({
        pupilId: job.assignedPupilId,
        classId: job.classId,
        title: "1 Week Remaining on Your Job Term ⏳",
        message: `You have 1 week left in your term as ${job.title}. You've done fantastic work—your teacher will prepare a reference upon completion!`,
        type: "job_term_one_week_reminder",
        jobId: job.jobId,
        jobTitle: job.title,
      });

      return { ...job, reminderOneWeekSent: true };
    }

    // 2. Term Completed
    if (daysRemaining <= 0 && !job.completionReminderSent) {
      completedCount++;
      hasModifications = true;

      // Notify Teacher to write reference
      addNotification({
        classId: job.classId,
        isTeacherNotification: true,
        title: "Job Term Completed — Reference Needed ✍️",
        message: `${job.assignedPupilName || "Student"}'s ${job.termWeeks}-week term as ${job.title} is now complete! Please write a quick 1-sentence reference to finalize their portfolio.`,
        type: "job_term_completed",
        jobId: job.jobId,
        jobTitle: job.title,
      });

      // Notify Pupil that term has ended
      addNotification({
        pupilId: job.assignedPupilId,
        classId: job.classId,
        title: "Job Term Completed! 🎓",
        message: `You have successfully completed your ${job.termWeeks}-week term as ${job.title}! The weekly wage for this role has concluded. Your teacher reference is being prepared.`,
        type: "job_term_completed",
        jobId: job.jobId,
        jobTitle: job.title,
      });

      return {
        ...job,
        status: "completed" as const,
        completionReminderSent: true,
      };
    }

    return job;
  });

  if (hasModifications) {
    saveJobs(updatedJobs);
  }

  return { remindersSent, completedCount };
}

/**
 * COMPLETES JOB TERM WITH TEACHER REFERENCE AND CHOOSES RE-ADVERTISE OR ARCHIVE
 */
export function finalizeJobTermWithReference(
  jobId: string,
  referenceText: string,
  postTermAction: "re-advertise" | "archive"
): JobPostingDocument {
  const jobs = getSavedJobs();
  const jobIdx = jobs.findIndex((j) => j.jobId === jobId);
  if (jobIdx === -1) throw new Error("Job not found");

  const job = { ...jobs[jobIdx] };
  const pupilId = job.assignedPupilId;
  const pupilName = job.assignedPupilName || "Pupil";

  // Personalize reference if needed
  const personalizedRef = referenceText
    .replace(/{NAME}/g, pupilName)
    .replace(/{JOB}/g, job.title)
    .trim();

  // Save to pupil's permanent completed jobs record
  if (pupilId) {
    saveCompletedJobForPupil(pupilId, {
      jobId: job.jobId,
      title: job.title,
      wageCents: job.wageCents,
      termWeeks: job.termWeeks,
      termStartDate: job.termStartDate,
      termEndDate: job.termEndDate,
      completedDate: new Date().toISOString(),
      teacherReference: personalizedRef,
    });

    // Send reference notification to pupil
    addNotification({
      pupilId,
      classId: job.classId,
      title: "Teacher Reference Received! ⭐",
      message: `Your teacher wrote a glowing reference for your time as ${job.title}: "${personalizedRef}"`,
      type: "reference_received",
      jobId: job.jobId,
      jobTitle: job.title,
    });
  }

  // Send confirmation notification to teacher
  addNotification({
    classId: job.classId,
    isTeacherNotification: true,
    title: "Term Finalized & Reference Recorded",
    message: `Reference recorded for ${pupilName} as ${job.title}. Job has been ${
      postTermAction === "re-advertise" ? "re-advertised on the Jobs Board" : "archived"
    }.`,
    type: "job_term_completed",
    jobId: job.jobId,
    jobTitle: job.title,
  });

  // Update job posting based on teacher choice:
  if (postTermAction === "re-advertise") {
    // Archive previous applications for this job so new or returning pupils can apply in the new rotation
    const allApps = getSavedApplications();
    const updatedApps = allApps.map((a) => {
      if (a.jobId === jobId && (a.status === "accepted" || a.status === "pending")) {
        return { ...a, status: "rejected" as const, reviewedAt: new Date().toISOString() };
      }
      return a;
    });
    saveApplications(updatedApps);

    const now = new Date();
    const newStart = now.toISOString().split("T")[0];
    const newEnd = new Date(now.getTime() + (job.termWeeks || 4) * 7 * 86400000).toISOString().split("T")[0];

    job.status = "open";
    job.assignedPupilId = undefined;
    job.assignedPupilName = undefined;
    job.termStartDate = newStart;
    job.termEndDate = newEnd;
    job.weeksElapsed = 0;
    job.reminderOneWeekSent = false;
    job.completionReminderSent = false;
    job.teacherReference = undefined;
    job.updatedAt = now.toISOString();

    // Notify pupils that role is open again!
    addNotification({
      classId: job.classId,
      title: "Classroom Role Re-Advertised! 🔄",
      message: `"${job.title}" has been re-advertised on the Jobs Board. Submit your application for the new rotation!`,
      type: "general",
      jobId: job.jobId,
      jobTitle: job.title,
    });
  } else {
    job.status = "archived";
    job.teacherReference = personalizedRef;
    job.updatedAt = new Date().toISOString();
  }

  jobs[jobIdx] = job;
  saveJobs(jobs);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(COMPLETED_JOBS_SYNC_EVENT));
    window.dispatchEvent(new Event("pocketpot_balance_updated"));
    window.dispatchEvent(new Event(JOBS_SYNC_EVENT));
  }

  return job;
}
