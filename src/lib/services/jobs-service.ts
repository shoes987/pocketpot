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

const STORAGE_KEY_JOBS = "pocketpot_jobs_v1";
const STORAGE_KEY_APPLICATIONS = "pocketpot_job_applications_v1";
const STORAGE_KEY_NOTIFICATIONS = "pocketpot_notifications_v1";
const STORAGE_KEY_COMPLETED_JOBS = "pocketpot_completed_jobs_v1";

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
  const stored = localStorage.getItem(STORAGE_KEY_JOBS);
  if (stored) {
    try {
      const parsed: JobPostingDocument[] = JSON.parse(stored);
      if (classId) {
        return parsed.filter((j) => j.classId === classId);
      }
      return parsed;
    } catch {
      // Fallback
    }
  }

  // Seed standard KS2 classroom jobs
  const seedClassId = classId || "class-year4-teal";
  const now = new Date().toISOString();

  const seedJobs: JobPostingDocument[] = [
    {
      jobId: "job-librarian-1",
      classId: seedClassId,
      teacherId: "teacher-oak-lead",
      title: "Classroom Librarian",
      description: "Keep our reading corner tidy, help classmates discover inspiring books, and organize book returns at the end of each day.",
      wageCents: 150, // £1.50 per week
      termWeeks: 4,   // 4-week term
      requiredQualities: ["Organised", "Caring", "Reliable"],
      cvPrompt: "Why would you be wonderful as our Classroom Librarian? Mention any favorite books or times you helped organize things!",
      status: "open",
      createdAt: now,
      updatedAt: now,
    },
    {
      jobId: "job-plant-monitor-2",
      classId: seedClassId,
      teacherId: "teacher-oak-lead",
      title: "Plant & Garden Monitor",
      description: "Check soil moisture on our classroom windowsill garden, water plants on scheduled mornings, and keep the nature station clean.",
      wageCents: 120, // £1.20 per week
      termWeeks: 3,   // 3-week term
      requiredQualities: ["Punctual", "Helpful", "Caring"],
      cvPrompt: "Tell us why you would take great care of our plants and how you keep track of regular chores!",
      status: "open",
      createdAt: now,
      updatedAt: now,
    },
    {
      jobId: "job-tech-helper-3",
      classId: seedClassId,
      teacherId: "teacher-oak-lead",
      title: "Tech & Tablet Assistant",
      description: "Ensure learning tablets are plugged into the charging trolley neatly at the end of lessons and assist classmates with basic logins.",
      wageCents: 200, // £2.00 per week
      termWeeks: 4,   // 4-week term
      requiredQualities: ["Reliable", "Team Player", "Patient"],
      cvPrompt: "Explain how you treat school devices with care and how you help others when they are stuck on tech!",
      status: "open",
      createdAt: now,
      updatedAt: now,
    },
  ];

  saveJobs(seedJobs);
  return seedJobs;
}

export function saveJobs(jobs: JobPostingDocument[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY_JOBS, JSON.stringify(jobs));
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
  requiredQualities: string[];
  cvPrompt?: string;
}): JobPostingDocument {
  const jobs = getSavedJobs();
  const now = new Date().toISOString();

  const newJob: JobPostingDocument = {
    jobId: crypto.randomUUID(),
    classId: payload.classId,
    teacherId: payload.teacherId || "teacher-current",
    title: payload.title.trim(),
    description: payload.description.trim(),
    wageCents: Math.max(50, payload.wageCents),
    termWeeks: Math.max(1, payload.termWeeks),
    requiredQualities: payload.requiredQualities.length > 0 ? payload.requiredQualities : ["Reliable", "Helpful"],
    cvPrompt: payload.cvPrompt?.trim() || "Tell your teacher why you would be great at this role and what qualities you bring!",
    status: "open",
    createdAt: now,
    updatedAt: now,
  };

  assertZeroPII(newJob as unknown as Record<string, unknown>);
  saveJobs([newJob, ...jobs]);
  return newJob;
}

export function getJobById(jobId: string): JobPostingDocument | null {
  const jobs = getSavedJobs();
  return jobs.find((j) => j.jobId === jobId) || null;
}

/**
 * APPLICATIONS STORE & MANAGEMENT
 */
export function getSavedApplications(jobId?: string): JobApplicationDocument[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(STORAGE_KEY_APPLICATIONS);
  if (stored) {
    try {
      const parsed: Record<string, unknown>[] = JSON.parse(stored);
      // Migrate and strictly purge any legacy pupilName to uphold Zero-PII compliance
      const normalized: JobApplicationDocument[] = parsed.map((a) => {
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
      if (jobId) {
        return normalized.filter((a) => a.jobId === jobId);
      }
      return normalized;
    } catch {
      // Fallback
    }
  }
  return [];
}

export function saveApplications(apps: JobApplicationDocument[]): void {
  if (typeof window === "undefined") return;
  // Ensure legacy forbidden "pupilName" key is never persisted in storage
  const sanitized = apps.map((app) => {
    const copy = { ...(app as unknown as Record<string, unknown>) };
    delete copy.pupilName;
    return copy as unknown as JobApplicationDocument;
  });
  localStorage.setItem(STORAGE_KEY_APPLICATIONS, JSON.stringify(sanitized));
}

/**
 * COMPLETED JOBS & REFERENCES STORE
 */
export function getCompletedJobsForPupil(pupilId: string): CompletedJobRecord[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(STORAGE_KEY_COMPLETED_JOBS);
  if (stored) {
    try {
      const parsed: Record<string, CompletedJobRecord[]> = JSON.parse(stored);
      return parsed[pupilId] || [];
    } catch {
      // Fallback
    }
  }
  return [];
}

export function saveCompletedJobForPupil(pupilId: string, record: CompletedJobRecord): void {
  if (typeof window === "undefined") return;
  const stored = localStorage.getItem(STORAGE_KEY_COMPLETED_JOBS);
  let parsed: Record<string, CompletedJobRecord[]> = {};
  if (stored) {
    try {
      parsed = JSON.parse(stored);
    } catch {
      parsed = {};
    }
  }
  const existing = parsed[pupilId] || [];
  parsed[pupilId] = [record, ...existing];
  localStorage.setItem(STORAGE_KEY_COMPLETED_JOBS, JSON.stringify(parsed));
}

export const NOTIFICATIONS_SYNC_EVENT = "pocketpot_notifications_sync";

/**
 * NOTIFICATIONS STORE
 */
export function getSavedNotifications(pupilId?: string, forTeacher?: boolean): PupilNotificationDocument[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(STORAGE_KEY_NOTIFICATIONS);
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
  localStorage.setItem(STORAGE_KEY_NOTIFICATIONS, JSON.stringify(notifs));
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
  return newNotif;
}

export function markNotificationRead(notificationId: string): void {
  const notifs = getSavedNotifications();
  const updated = notifs.map((n) => (n.notificationId === notificationId ? { ...n, read: true } : n));
  saveNotifications(updated);
}

export function markAllNotificationsRead(pupilId?: string, forTeacher?: boolean): void {
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
}): JobApplicationDocument {
  const job = getJobById(payload.jobId);
  if (!job) throw new Error("Job not found");
  if (job.status !== "open") throw new Error("This job is no longer accepting applications.");

  // Check if pupil already applied
  const existingApps = getSavedApplications(payload.jobId);
  const alreadyApplied = existingApps.some((a) => a.pupilId === payload.pupilId);
  if (alreadyApplied) throw new Error("You have already submitted an application for this role.");

  // Auto-attach completed jobs and teacher references
  const priorCompleted = getCompletedJobsForPupil(payload.pupilId);
  const displayName = payload.applicantDisplayName || payload.pupilCodename;

  const newApp: JobApplicationDocument = {
    applicationId: crypto.randomUUID(),
    jobId: payload.jobId,
    classId: payload.classId,
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

  // Create Notification for Teacher (Bell Icon)
  addNotification({
    classId: payload.classId,
    isTeacherNotification: true,
    title: "New Job Application Submitted",
    message: `${displayName} submitted an application for "${job.title}".`,
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
  const termEndDate = new Date(now.getTime() + (jobs[jobIdx].termWeeks || 4) * 7 * 86400000);
  const applicantLabel = targetApp.applicantDisplayName || targetApp.pupilCodename;

  // 1. Update Job
  const updatedJob: JobPostingDocument = {
    ...jobs[jobIdx],
    status: "filled",
    assignedPupilId: targetApp.pupilId,
    assignedPupilName: applicantLabel,
    termStartDate: now.toISOString(),
    termEndDate: termEndDate.toISOString(),
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

  return {
    hiredJob: updatedJob,
    hiredApp: { ...targetApp, status: "accepted" },
    rejectionsSentCount: rejectionsCount,
  };
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
      termWeeks: job.termWeeks,
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

  // Update job posting based on teacher choice:
  if (postTermAction === "re-advertise") {
    job.status = "open";
    job.assignedPupilId = undefined;
    job.assignedPupilName = undefined;
    job.termStartDate = undefined;
    job.termEndDate = undefined;
    job.weeksElapsed = 0;
    job.reminderOneWeekSent = false;
    job.completionReminderSent = false;
    job.teacherReference = undefined;
    job.updatedAt = new Date().toISOString();
  } else {
    job.status = "archived";
    job.teacherReference = personalizedRef;
    job.updatedAt = new Date().toISOString();
  }

  jobs[jobIdx] = job;
  saveJobs(jobs);
  return job;
}
