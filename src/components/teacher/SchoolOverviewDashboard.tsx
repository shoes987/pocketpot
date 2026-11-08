"use client";

import React, { useState } from "react";
import {
  School,
  Users,
  Coins,
  Briefcase,
  UserCheck,
  FileSpreadsheet,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  UserPlus,
  Clock,
  Trash2,
  Send,
  Copy,
  Check,
  Lock,
} from "lucide-react";
import { ClassDocument, PupilDocument, SavingsPotDocument, UserDocument } from "@/lib/firebase/types";
import { formatCurrency } from "@/lib/firebase/zero-pii";
import { getStaffUsers } from "@/lib/services/auth-service";
import { getTenant, getTenantInvites, revokeTeacherInvite, DEFAULT_TENANT_ID } from "@/lib/services/tenant-service";

interface SchoolOverviewDashboardProps {
  classes: ClassDocument[];
  pupils: PupilDocument[];
  pots: SavingsPotDocument[];
  onSelectClassContext: (classId: string) => void;
  onOpenAssignModal: (cls: ClassDocument) => void;
  onOpenCsvModal: (cls: ClassDocument, isWholeSchool?: boolean) => void;
  onOpenWizard: () => void;
  onOpenInviteTeacherModal?: () => void;
}

export function SchoolOverviewDashboard({
  classes,
  pupils,
  pots,
  onSelectClassContext,
  onOpenAssignModal,
  onOpenCsvModal,
  onOpenWizard,
  onOpenInviteTeacherModal,
}: SchoolOverviewDashboardProps) {
  const staff = getStaffUsers();
  const tenant = getTenant();
  const allInvites = getTenantInvites();
  const pendingInvites = allInvites.filter((i) => i.status === "pending");

  const [isHandoffModalOpen, setIsHandoffModalOpen] = useState(false);
  const [copiedAnnouncement, setCopiedAnnouncement] = useState(false);

  const totalSchoolSavings = pots.reduce((sum, p) => sum + (p.currentAmountCents || 0), 0);
  const totalEnrolledPupils = pupils.length;
  const currentTeacherCount = staff.filter((s) => s.role === "teacher").length;

  const getStaffName = (userId?: string) => {
    if (!userId) return "Unassigned";
    const found = staff.find((s) => s.userId === userId);
    return found ? found.displayName : "Staff Lead";
  };

  const handleCopyStaffAnnouncement = () => {
    const text = `Hello KS2 Team! PocketPot classrooms have been set up for St Mary's Primary.\n\nPlease sign in with your school email address to enroll your pupils (via CSV or individual cards) and customize your starter Savings Pots:\n\n` +
      classes.map((c) => `• ${c.className} (${c.yearGroup}) - Join Code: ${c.classJoinCode}`).join("\n");
    navigator.clipboard.writeText(text);
    setCopiedAnnouncement(true);
    setTimeout(() => setCopiedAnnouncement(false), 2500);
  };

  return (
    <div className="space-y-6 text-left">
      {/* 1. School Header Banner */}
      <section className="bg-surface rounded-pot p-5 sm:p-6 md:p-8 border border-borderMuted shadow-islandCard flex flex-col md:flex-row md:items-center justify-between gap-5 text-left">
        <div className="space-y-1 text-left">
          <div className="flex items-center gap-2.5 text-left">
            <span className="w-3.5 h-3.5 rounded-full bg-brandPrimary inline-block" />
            <h2 className="text-2xl font-bold text-primaryText">
              Whole-School Governance &amp; Class Allocation
            </h2>
          </div>
          <p className="text-sm text-primaryText/75 font-medium">
            Multi-class oversight for Headteachers &amp; PSHE Leads &bull; Key Stage 2 (Years 3–6)
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-center shrink-0">
          {onOpenInviteTeacherModal && (
            <button
              type="button"
              onClick={onOpenInviteTeacherModal}
              className="px-4 py-2.5 rounded-xl bg-tealSurface hover:bg-tealSurface/80 text-brandPrimary border border-brandPrimary/30 font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Onboard Staff</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenWizard}
            className="px-4 py-2.5 rounded-xl bg-brandPrimary hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Sparkles className="w-4 h-4" />
            <span>Launch Class Wizard</span>
          </button>
        </div>
      </section>

      {/* 2. Key Stage 2 Whole-School Metrics Islands */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
        <div className="p-4 sm:p-5 rounded-pot bg-surface border border-borderMuted shadow-islandCard space-y-1 text-left">
          <span className="text-xs font-bold uppercase tracking-wider text-primaryText/60 block">
            Classes Managed
          </span>
          <strong className="text-2xl sm:text-3xl font-bold text-primaryText block">
            {classes.length}
          </strong>
          <span className="text-[11px] text-brandPrimary font-semibold block">Across KS2 Cohort</span>
        </div>

        <div className="p-4 sm:p-5 rounded-pot bg-surface border border-borderMuted shadow-islandCard space-y-1 text-left">
          <span className="text-xs font-bold uppercase tracking-wider text-primaryText/60 block">
            Enrolled Pupils
          </span>
          <strong className="text-2xl sm:text-3xl font-bold text-primaryText block">
            {totalEnrolledPupils}
          </strong>
          <span className="text-[11px] text-positiveState font-semibold block">100% Zero-PII Protected</span>
        </div>

        <div className="p-4 sm:p-5 rounded-pot bg-surface border border-borderMuted shadow-islandCard space-y-1 text-left">
          <span className="text-xs font-bold uppercase tracking-wider text-primaryText/60 block">
            Total School Savings
          </span>
          <strong className="text-2xl sm:text-3xl font-bold text-brandSecondary block">
            {formatCurrency(totalSchoolSavings)}
          </strong>
          <span className="text-[11px] text-primaryText/60 font-semibold block">Across all pupil pots</span>
        </div>

        <div className="p-4 sm:p-5 rounded-pot bg-surface border border-borderMuted shadow-islandCard space-y-1 text-left">
          <span className="text-xs font-bold uppercase tracking-wider text-primaryText/60 block">
            Active Teaching Staff
          </span>
          <strong className="text-2xl sm:text-3xl font-bold text-focusIndicator block">
            {staff.length}
          </strong>
          <span className="text-[11px] text-positiveState font-semibold block">Unlimited Capacity</span>
        </div>
      </div>

      {/* 3. STEP 1: TEACHING STAFF DIRECTORY (TEACHERS FIRST) */}
      <section className="bg-surface rounded-pot p-5 sm:p-6 md:p-8 border border-borderMuted shadow-islandCard space-y-4 text-left">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-borderMuted/60 pb-3 gap-3 text-left">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-tealSurface text-brandPrimary text-[10px] font-bold uppercase">
                Step 1: Staff First
              </span>
              <h3 className="text-lg font-bold text-primaryText">Teaching Staff Directory</h3>
            </div>
            <p className="text-xs text-primaryText/70 font-medium mt-0.5">
              Onboard educators first, then assign them to Key Stage 2 classrooms.
            </p>
          </div>
          {onOpenInviteTeacherModal && (
            <button
              type="button"
              onClick={onOpenInviteTeacherModal}
              className="px-4 py-2.5 rounded-xl bg-brandPrimary hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all self-start sm:self-center shrink-0"
              title="Add single or bulk paste teacher emails"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Invite / Onboard Teachers</span>
            </button>
          )}
        </div>

        {/* Multi-Tenant Email Domain Safeguard Banner (Unlimited Accounts) */}
        <div className="p-4 rounded-2xl bg-canvas border border-borderMuted flex flex-col md:flex-row md:items-center justify-between gap-4 text-left">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-tealSurface flex items-center justify-center text-brandPrimary shrink-0 mt-0.5">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-primaryText">
                  Multi-Tenant School Boundary: {tenant.schoolName}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-tealSurface text-brandPrimary font-bold border border-brandPrimary/30">
                  URN: {tenant.schoolUrn}
                </span>
              </div>
              <p className="text-xs text-primaryText/70 font-medium">
                Strict domain whitelisting active:{" "}
                <span className="font-bold text-brandPrimary">
                  {tenant.allowedDomains.map((d) => `@${d}`).join(", ")}
                </span>
                . Personal emails (@gmail.com, etc.) are strictly blocked.
              </p>
            </div>
          </div>

          <div className="bg-surface px-3.5 py-2.5 rounded-xl border border-borderMuted min-w-[190px] space-y-1 shrink-0">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-primaryText/70">Staff Accounts</span>
              <span className="text-positiveState flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                Unlimited
              </span>
            </div>
            <span className="text-[11px] text-primaryText/60 font-semibold block">
              {currentTeacherCount} Active Teachers Enrolled
            </span>
          </div>
        </div>

        {/* Pending Invites Alert if Any */}
        {pendingInvites.length > 0 && (
          <div className="p-3.5 rounded-xl bg-amberSurface border border-brandSecondary/30 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-brandSecondary">
              <Clock className="w-4 h-4 shrink-0" />
              <span>Pending Teacher Invitations ({pendingInvites.length})</span>
            </div>
            <div className="divide-y divide-brandSecondary/20 text-xs">
              {pendingInvites.map((inv) => (
                <div key={inv.inviteId} className="py-2 flex items-center justify-between gap-2">
                  <div>
                    <strong className="text-primaryText font-bold">{inv.email}</strong>
                    <span className="text-primaryText/60 block text-[11px]">
                      Classes assigned: {inv.assignedClassIds.join(", ") || "None"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      revokeTeacherInvite(DEFAULT_TENANT_ID, inv.inviteId);
                      window.location.reload();
                    }}
                    className="p-1 text-primaryText/40 hover:text-softTerracotta transition-colors"
                    title="Revoke invitation"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-borderMuted text-primaryText/60 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-2.5 px-3">Educator Name</th>
                <th className="py-2.5 px-3">Email Address</th>
                <th className="py-2.5 px-3">Role</th>
                <th className="py-2.5 px-3">Assigned Classes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borderMuted/50 font-medium text-primaryText">
              {staff.map((member) => {
                const assignedNames =
                  member.assignedClassIds?.includes("*") || member.role === "admin"
                    ? "All Key Stage 2 Classes"
                    : classes
                        .filter((c) =>
                          member.assignedClassIds?.includes(c.classId) ||
                          c.leadTeacherId === member.userId ||
                          (c.assignedTeacherIds && c.assignedTeacherIds.includes(member.userId))
                        )
                        .map((c) => c.className)
                        .join(", ") || "No classes assigned";

                return (
                  <tr key={member.userId} className="hover:bg-canvas/60 transition-colors">
                    <td className="py-3 px-3 font-bold flex items-center gap-2">
                      <span className="text-base">{member.role === "admin" ? "👑" : "👨‍🏫"}</span>
                      <span>{member.displayName}</span>
                    </td>
                    <td className="py-3 px-3 text-primaryText/70">{member.email}</td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          member.role === "admin"
                            ? "bg-indigoSurface text-focusIndicator border border-focusIndicator/30"
                            : "bg-tealSurface text-brandPrimary border border-brandPrimary/30"
                        }`}
                      >
                        {member.role}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-brandPrimary font-semibold">{assignedNames}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Requirement 2: Button beneath staff list for classroom setup including assigning a teacher */}
        <div className="pt-3 border-t border-borderMuted/60 flex flex-col sm:flex-row items-center justify-between gap-3 bg-canvas/60 p-4 rounded-2xl border border-borderMuted">
          <div>
            <strong className="text-xs font-bold text-primaryText block">Ready to create a classroom?</strong>
            <span className="text-[11px] text-primaryText/70">
              Set up a KS2 class and assign teaching staff in one unified step. Teachers receive their invite once the class is created.
            </span>
          </div>
          <button
            type="button"
            onClick={onOpenWizard}
            className="px-4 py-2.5 rounded-xl bg-brandPrimary hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all whitespace-nowrap"
          >
            <Sparkles className="w-4 h-4" />
            <span>+ Classroom Setup (Assign Teacher)</span>
          </button>
        </div>
      </section>

      {/* 4. THE ADMIN ENROLLMENT FORK (ADMIN CSV VS TEACHER HANDOFF) */}
      <section className="bg-surface rounded-pot p-5 sm:p-6 md:p-8 border-2 border-brandPrimary/30 shadow-islandCard space-y-4 text-left">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-borderMuted/60 pb-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-amberSurface text-brandSecondary text-[10px] font-bold uppercase">
                Step 2: Choose Workflow
              </span>
              <h3 className="text-lg font-bold text-primaryText">
                Pupil Enrollment: Choose How Your School Adds Pupils
              </h3>
            </div>
            <p className="text-xs text-primaryText/70 font-medium">
              You can centrally upload a whole-school MIS CSV, or hand off roster generation directly to your teachers.
            </p>
          </div>
          <span className="text-xs px-3 py-1 rounded-full bg-tealSurface text-brandPrimary font-bold border border-brandPrimary/30 self-start md:self-auto">
            100% Zero-PII Protected
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {/* Option A: Admin Whole-School CSV */}
          <div className="p-4 sm:p-5 rounded-2xl bg-canvas border border-borderMuted hover:border-positiveState/60 transition-all space-y-3 flex flex-col justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-positiveState" />
                <h4 className="text-sm font-bold text-primaryText">Option A: Upload Whole-School CSV</h4>
              </div>
              <p className="text-xs text-primaryText/70 leading-relaxed">
                Centralized setup. Upload your school MIS classlist (SIMS, Arbor, Bromcom). PocketPot scrubs PII and routes Year 3–6 pupils into their classrooms.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onOpenCsvModal(classes[0], true)}
              className="w-full py-2.5 px-4 rounded-xl bg-positiveState hover:bg-green-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Upload School MIS CSV</span>
            </button>
          </div>

          {/* Option B: Pass to Classroom Teachers */}
          <div className="p-4 sm:p-5 rounded-2xl bg-canvas border border-borderMuted hover:border-brandPrimary/60 transition-all space-y-3 flex flex-col justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-brandPrimary" />
                <h4 className="text-sm font-bold text-primaryText">Option B: Pass to Classroom Teachers</h4>
              </div>
              <p className="text-xs text-primaryText/70 leading-relaxed">
                Minimise admin overhead. Your teachers log in to enroll their own pupils—either uploading a class CSV or adding pupils individually.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsHandoffModalOpen(true)}
              className="w-full py-2.5 px-4 rounded-xl bg-brandPrimary hover:bg-teal-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all"
            >
              <Send className="w-4 h-4" />
              <span>View Teacher Handoff Codes &amp; Briefing</span>
            </button>
          </div>
        </div>
      </section>

      {/* 5. CLASSROOM DIRECTORY & MULTI-TEACHER ASSIGNMENTS */}
      <section className="bg-surface rounded-pot p-5 sm:p-6 md:p-8 border border-borderMuted shadow-islandCard space-y-4 text-left">
        <div className="flex items-center justify-between border-b border-borderMuted/60 pb-3 text-left">
          <div>
            <h3 className="text-lg font-bold text-primaryText">Key Stage 2 Classroom Rosters</h3>
            <p className="text-xs text-primaryText/70 font-medium">
              Multi-teacher assignment: Lead Teachers, Co-Teachers, and Teaching Assistants.
            </p>
          </div>
          <span className="text-xs font-bold text-brandPrimary bg-tealSurface px-3 py-1 rounded-full border border-brandPrimary/30">
            {classes.length} Active Classes
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
          {classes.map((cls) => {
            const classPupilsCount = pupils.filter((p) => p.classId === cls.classId).length;
            const classPots = pots.filter((p) => p.classId === cls.classId);
            const classSavings = classPots.reduce((sum, p) => sum + p.currentAmountCents, 0);
            const leadName = getStaffName(cls.leadTeacherId || cls.teacherId);

            const coTeacherNames = cls.assignedTeacherIds
              ? cls.assignedTeacherIds
                  .filter((tid) => tid !== (cls.leadTeacherId || cls.teacherId))
                  .map((tid) => getStaffName(tid))
                  .join(", ")
              : "";

            return (
              <div
                key={cls.classId}
                className="p-4 sm:p-5 rounded-2xl bg-canvas border border-borderMuted hover:border-brandPrimary/40 transition-all space-y-3 text-left"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-brandPrimary block">
                      {cls.yearGroup} &bull; Code: {cls.classJoinCode}
                    </span>
                    <strong className="text-xl font-bold text-primaryText block">{cls.className}</strong>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-surface border border-borderMuted font-bold text-primaryText/70">
                    {cls.payoutDay} Pay Day
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 py-2 border-y border-borderMuted/60 text-xs">
                  <div>
                    <span className="text-primaryText/60 block text-[11px]">Lead Teacher:</span>
                    <strong className="text-primaryText font-bold truncate block">{leadName}</strong>
                  </div>
                  <div>
                    <span className="text-primaryText/60 block text-[11px]">Pupils:</span>
                    <strong className="text-primaryText font-bold block">{classPupilsCount} Enrolled</strong>
                  </div>
                  <div>
                    <span className="text-primaryText/60 block text-[11px]">Pots Savings:</span>
                    <strong className="text-brandSecondary font-bold block">
                      {formatCurrency(classSavings)}
                    </strong>
                  </div>
                </div>

                {/* Multi-Teacher Indicator */}
                {coTeacherNames && (
                  <div className="text-[11px] text-primaryText/70 font-medium flex items-center gap-1.5 pt-0.5">
                    <span className="text-primaryText/50 font-bold uppercase text-[10px]">Co-Teachers / Support:</span>
                    <span className="font-semibold text-primaryText truncate">{coTeacherNames}</span>
                  </div>
                )}

                {/* Card Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => onSelectClassContext(cls.classId)}
                    className="flex-1 px-3 py-2 rounded-xl bg-brandPrimary hover:bg-teal-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                    title={`Step into ${cls.className} as teacher`}
                  >
                    <span>Step In</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onOpenAssignModal(cls)}
                    className="px-3 py-2 rounded-xl bg-surface hover:bg-tealSurface border border-borderMuted text-primaryText font-bold text-xs flex items-center gap-1 transition-colors"
                    title="Assign lead & co-teachers to this class"
                  >
                    <Users className="w-3.5 h-3.5 text-brandPrimary" />
                    <span>Assign Staff</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onOpenCsvModal(cls)}
                    className="px-3 py-2 rounded-xl bg-surface hover:bg-tealSurface border border-borderMuted text-primaryText font-bold text-xs flex items-center gap-1 transition-colors"
                    title="Upload CSV classlist for this class"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-positiveState" />
                    <span>CSV</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* TEACHER HANDOFF BRIEFING MODAL */}
      {isHandoffModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-primaryText/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
        >
          <div className="bg-surface rounded-pot border border-borderMuted shadow-2xl p-5 sm:p-6 md:p-8 space-y-5 text-left my-4 max-w-lg w-full max-h-[92vh] overflow-y-auto font-lexend">
            <div className="flex items-start justify-between border-b border-borderMuted/60 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <Send className="w-5 h-5 text-brandPrimary" />
                  <span className="text-xs font-bold uppercase tracking-wider text-brandPrimary">
                    Teacher Hand-off Packet
                  </span>
                </div>
                <h3 className="text-xl font-bold text-primaryText mt-0.5">
                  Classroom Setup Delegation
                </h3>
                <p className="text-xs text-primaryText/70">
                  Share these classroom join codes with your teachers so they can onboard their pupils.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsHandoffModalOpen(false)}
                className="text-primaryText/40 hover:text-primaryText text-2xl font-bold p-1 leading-none"
              >
                &times;
              </button>
            </div>

            <div className="space-y-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-primaryText/70">
                Key Stage 2 Classroom Join Codes
              </span>
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {classes.map((cls) => {
                  const leadName = getStaffName(cls.leadTeacherId || cls.teacherId);
                  return (
                    <div
                      key={cls.classId}
                      className="p-3 rounded-xl bg-canvas border border-borderMuted flex items-center justify-between"
                    >
                      <div>
                        <strong className="text-sm font-bold text-primaryText block">
                          {cls.className} ({cls.yearGroup})
                        </strong>
                        <span className="text-xs text-primaryText/60">
                          Assigned: <strong>{leadName}</strong>
                        </span>
                      </div>
                      <span className="px-3 py-1 rounded-lg bg-tealSurface text-brandPrimary font-mono font-bold text-sm border border-brandPrimary/30">
                        {cls.classJoinCode}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Copy Staff Announcement */}
            <div className="p-3.5 rounded-2xl bg-tealSurface/50 border border-brandPrimary/30 space-y-2">
              <span className="text-xs font-bold text-brandPrimary block">
                Copy Pre-Formatted Staff Announcement
              </span>
              <p className="text-[11px] text-primaryText/70 leading-relaxed">
                Send this notice via email or school Teams/Slack. Teachers can choose to upload their own class CSV or add pupils individually.
              </p>
              <button
                type="button"
                onClick={handleCopyStaffAnnouncement}
                className="w-full py-2.5 px-4 rounded-xl bg-brandPrimary hover:bg-teal-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all"
              >
                {copiedAnnouncement ? (
                  <>
                    <Check className="w-4 h-4 text-white" />
                    <span>Copied Announcement to Clipboard!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy Staff Briefing Notice</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsHandoffModalOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-surface border border-borderMuted text-primaryText font-bold text-xs hover:bg-canvas"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
