"use client";

import React, { useState, useEffect } from "react";
import {
  School,
  Users,
  Coins,
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
  ChevronDown,
  Mail,
  Calendar,
} from "lucide-react";
import { ClassDocument, PupilDocument, SavingsPotDocument, UserDocument, UserRole } from "@/lib/firebase/types";
import { formatCurrency } from "@/lib/firebase/zero-pii";
import {
  getStaffUsers,
  createStaffUser,
  updateStaffUser,
  deleteStaffUser,
} from "@/lib/services/auth-service";
import {
  getTenant,
  getTenantInvites,
  revokeTeacherInvite,
  DEFAULT_TENANT_ID,
} from "@/lib/services/tenant-service";

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
  const [staffList, setStaffList] = useState<UserDocument[]>(() => getStaffUsers());
  const tenant = getTenant();
  const allInvites = getTenantInvites();
  const pendingInvites = allInvites.filter((i) => i.status === "pending");

  // Add Teacher Modal State
  const [isAddTeacherModalOpen, setIsAddTeacherModalOpen] = useState(false);
  const [newTeacherName, setNewTeacherName] = useState("");
  const [newTeacherEmail, setNewTeacherEmail] = useState("");
  const [addTeacherError, setAddTeacherError] = useState<string | null>(null);

  // Dropdown Popover States (Tracks which staff member's menu is active)
  const [activeRoleMenuStaffId, setActiveRoleMenuStaffId] = useState<string | null>(null);
  const [activeClassMenuStaffId, setActiveClassMenuStaffId] = useState<string | null>(null);

  // Feedback Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Teacher Handoff Modal
  const [isHandoffModalOpen, setIsHandoffModalOpen] = useState(false);
  const [copiedAnnouncement, setCopiedAnnouncement] = useState(false);

  const totalSchoolSavings = pots.reduce((sum, p) => sum + (p.currentAmountCents || 0), 0);
  const totalEnrolledPupils = pupils.length;
  const currentTeacherCount = staffList.filter((s) => s.role === "teacher").length;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const reloadStaff = () => {
    setStaffList(getStaffUsers());
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("pocketpot_staff_updated"));
    }
  };

  const getStaffName = (userId?: string) => {
    if (!userId) return "Unassigned";
    const found = staffList.find((s) => s.userId === userId);
    return found ? found.displayName : "Staff Lead";
  };

  // Close dropdown menus when clicking outside
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-staff-dropdown]")) {
        setActiveRoleMenuStaffId(null);
        setActiveClassMenuStaffId(null);
      }
    };
    document.addEventListener("click", handleDocumentClick);
    return () => document.removeEventListener("click", handleDocumentClick);
  }, []);

  // Handler: Add Teacher
  const handleAddTeacherSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = newTeacherName.trim();
    const trimmedEmail = newTeacherEmail.trim().toLowerCase();

    if (!trimmedName) {
      setAddTeacherError("Please enter the teacher's full name (e.g., Mrs Davies).");
      return;
    }
    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      setAddTeacherError("Please enter a valid school email address.");
      return;
    }

    try {
      // Rule 1: Added with role: 'unassigned' and assignedClassIds: [] ('unassigned')
      createStaffUser({
        displayName: trimmedName,
        email: trimmedEmail,
        role: "unassigned",
        assignedClassIds: [],
      });

      reloadStaff();
      setNewTeacherName("");
      setNewTeacherEmail("");
      setAddTeacherError(null);
      setIsAddTeacherModalOpen(false);
      showToast(`🎉 Added ${trimmedName} (Role & Classes set to Unassigned)`);
    } catch (err: unknown) {
      setAddTeacherError(err instanceof Error ? err.message : "Failed to add teacher.");
    }
  };

  // Handler: Change Role via Dropdown Pill
  const handleUpdateRole = (userId: string, newRole: UserRole) => {
    try {
      updateStaffUser(userId, { role: newRole });
      reloadStaff();
      setActiveRoleMenuStaffId(null);
      showToast(`Updated role to ${newRole === "unassigned" ? "Unassigned" : newRole}`);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Error updating role");
    }
  };

  // Handler: Multi-Select Toggle Class via Dropdown Pill
  const handleToggleClass = (userId: string, classId: string) => {
    const member = staffList.find((s) => s.userId === userId);
    if (!member) return;

    let nextClassIds: string[] = Array.isArray(member.assignedClassIds)
      ? [...member.assignedClassIds]
      : [];

    if (classId === "*") {
      // Toggle all classes
      if (nextClassIds.includes("*")) {
        nextClassIds = [];
      } else {
        nextClassIds = ["*"];
      }
    } else {
      // If was previously '*', expand to all explicit classes minus or plus
      if (nextClassIds.includes("*")) {
        nextClassIds = classes.map((c) => c.classId);
      }

      if (nextClassIds.includes(classId)) {
        nextClassIds = nextClassIds.filter((id) => id !== classId);
      } else {
        nextClassIds.push(classId);
      }
    }

    try {
      updateStaffUser(userId, { assignedClassIds: nextClassIds });
      reloadStaff();
      showToast("Updated assigned classes");
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Error updating classes");
    }
  };

  // Handler: Clear All Classes (Reset to Unassigned)
  const handleClearClasses = (userId: string) => {
    try {
      updateStaffUser(userId, { assignedClassIds: [] });
      reloadStaff();
      showToast("Classes reset to Unassigned");
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Error clearing classes");
    }
  };

  // Handler: Delete Staff Member
  const handleDeleteStaff = (userId: string, name: string) => {
    if (confirm(`Are you sure you want to remove ${name} from the school directory?`)) {
      try {
        deleteStaffUser(userId);
        reloadStaff();
        showToast(`Removed ${name} from teaching staff`);
      } catch (err: unknown) {
        showToast(err instanceof Error ? err.message : "Error removing staff");
      }
    }
  };

  const handleCopyStaffAnnouncement = () => {
    const text =
      `Hello KS2 Team! PocketPot classrooms have been set up for St Mary's Primary.\n\nPlease sign in with your school email address to enroll your pupils (via CSV or individual cards) and customize your starter Savings Pots:\n\n` +
      classes.map((c) => `• ${c.className} (${c.yearGroup}) - Join Code: ${c.classJoinCode}`).join("\n");
    navigator.clipboard.writeText(text);
    setCopiedAnnouncement(true);
    setTimeout(() => setCopiedAnnouncement(false), 2500);
  };

  return (
    <div className="space-y-8 text-left font-lexend">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl bg-primaryText text-white text-xs font-bold shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <Sparkles className="w-4 h-4 text-brandSecondary" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. School Header Banner */}
      <section className="bg-surface rounded-3xl p-5 sm:p-6 md:p-8 border border-borderMuted shadow-islandCard flex flex-col md:flex-row md:items-center justify-between gap-5 text-left">
        <div className="space-y-1.5 text-left">
          <div className="flex items-center gap-2.5 text-left">
            <span className="w-3.5 h-3.5 rounded-full bg-brandPrimary inline-block shrink-0" />
            <h2 className="text-2xl sm:text-3xl font-extrabold text-primaryText tracking-tight">
              Whole-School Governance &amp; Class Allocation
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-primaryText/75 font-medium max-w-2xl leading-relaxed">
            Multi-class oversight for Headteachers &amp; PSHE Leads &bull; Key Stage 2 (Years 3–6)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start md:self-center shrink-0">
          <button
            type="button"
            onClick={() => onOpenCsvModal(classes[0], true)}
            className="px-4 py-2.5 rounded-xl bg-positiveState hover:bg-green-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
            title="Upload whole-school MIS classlist CSV"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Upload Whole-School CSV</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAddTeacherModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-brandPrimary hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Add Teacher</span>
          </button>

          {onOpenInviteTeacherModal && (
            <button
              type="button"
              onClick={onOpenInviteTeacherModal}
              className="px-4 py-2.5 rounded-xl bg-tealSurface hover:bg-tealSurface/80 text-brandPrimary border border-brandPrimary/30 font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all"
            >
              <Mail className="w-4 h-4" />
              <span>Invite Link</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenWizard}
            className="px-4 py-2.5 rounded-xl bg-surface hover:bg-canvas text-primaryText border border-borderMuted font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all"
          >
            <Sparkles className="w-4 h-4 text-brandSecondary" />
            <span>Class Wizard</span>
          </button>
        </div>
      </section>

      {/* 2. Key Stage 2 Whole-School Metrics (Marketplace Card Styling) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
        <div className="bg-surface rounded-3xl border border-borderMuted shadow-islandCard flex flex-col justify-between hover:shadow-md transition-all text-left">
          <div className="px-4 py-2.5 bg-brandPrimary text-white flex items-center justify-between text-xs font-bold rounded-t-3xl">
            <span>Classes</span>
            <span>🏫</span>
          </div>
          <div className="p-4 sm:p-5 space-y-1">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-primaryText/60 block">
              Managed
            </span>
            <strong className="text-2xl sm:text-3xl font-extrabold text-primaryText block" suppressHydrationWarning>
              {classes.length}
            </strong>
            <span className="text-[11px] text-brandPrimary font-bold block">Across KS2 Cohort</span>
          </div>
        </div>

        <div className="bg-surface rounded-3xl border border-borderMuted shadow-islandCard flex flex-col justify-between hover:shadow-md transition-all text-left">
          <div className="px-4 py-2.5 bg-positiveState text-white flex items-center justify-between text-xs font-bold rounded-t-3xl">
            <span>Pupils</span>
            <span>🛡️</span>
          </div>
          <div className="p-4 sm:p-5 space-y-1">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-primaryText/60 block">
              Enrolled
            </span>
            <strong className="text-2xl sm:text-3xl font-extrabold text-primaryText block" suppressHydrationWarning>
              {totalEnrolledPupils}
            </strong>
            <span className="text-[11px] text-positiveState font-bold block">100% Zero-PII Protected</span>
          </div>
        </div>

        <div className="bg-surface rounded-3xl border border-borderMuted shadow-islandCard flex flex-col justify-between hover:shadow-md transition-all text-left">
          <div className="px-4 py-2.5 bg-warningState text-white flex items-center justify-between text-xs font-bold rounded-t-3xl">
            <span>Savings</span>
            <span>🍯</span>
          </div>
          <div className="p-4 sm:p-5 space-y-1">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-primaryText/60 block">
              School Savings
            </span>
            <strong className="text-2xl sm:text-3xl font-extrabold text-brandSecondary block" suppressHydrationWarning>
              {formatCurrency(totalSchoolSavings)}
            </strong>
            <span className="text-[11px] text-primaryText/60 font-bold block">Across all pupil pots</span>
          </div>
        </div>

        <div className="bg-surface rounded-3xl border border-borderMuted shadow-islandCard flex flex-col justify-between hover:shadow-md transition-all text-left">
          <div className="px-4 py-2.5 bg-focusIndicator text-white flex items-center justify-between text-xs font-bold rounded-t-3xl">
            <span>Staff</span>
            <span>👥</span>
          </div>
          <div className="p-4 sm:p-5 space-y-1">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-primaryText/60 block">
              Active Educators
            </span>
            <strong className="text-2xl sm:text-3xl font-extrabold text-focusIndicator block" suppressHydrationWarning>
              {staffList.length}
            </strong>
            <span className="text-[11px] text-positiveState font-bold block">Unlimited Capacity</span>
          </div>
        </div>
      </div>

      {/* 3. TEACHING STAFF DIRECTORY */}
      <section className="space-y-4 text-left">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-borderMuted/60 pb-3 gap-3 text-left">
          <div>
            <h3 className="text-xl font-extrabold text-primaryText">Teaching Staff Directory</h3>
            <p className="text-xs text-primaryText/70 font-medium mt-0.5">
              Onboard educators, customize roles, and assign to one or multiple Key Stage 2 classrooms.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsAddTeacherModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-brandPrimary hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Add Teacher</span>
            </button>
          </div>
        </div>

        {/* Multi-Tenant Domain Boundary Banner */}
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
                Domain safeguard active:{" "}
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
            <span className="text-[11px] text-primaryText/60 font-semibold block" suppressHydrationWarning>
              {currentTeacherCount} Active Teachers Enrolled
            </span>
          </div>
        </div>

        {/* Pending Invites Alert if Any */}
        {pendingInvites.length > 0 && (
          <div className="p-3.5 rounded-2xl bg-amberSurface border border-brandSecondary/30 space-y-2">
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
                      reloadStaff();
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

        {/* TEACHING STAFF CARDS GRID (Marketplace Cards UI) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-1">
          {staffList.map((member) => {
            const isUnassignedRole = member.role === "unassigned";
            const isAdminRole = member.role === "admin";
            const assignedClassIds = Array.isArray(member.assignedClassIds) ? member.assignedClassIds : [];
            const isAllClasses = assignedClassIds.includes("*") || isAdminRole;
            const isUnassignedClasses = assignedClassIds.length === 0;

            const assignedClassObjs = classes.filter((c) => assignedClassIds.includes(c.classId));
            const isDropdownOpen =
              activeClassMenuStaffId === member.userId || activeRoleMenuStaffId === member.userId;

            return (
              <div
                key={member.userId}
                className={`bg-surface rounded-3xl border border-borderMuted shadow-islandCard flex flex-col justify-between hover:shadow-md transition-all text-left relative ${
                  isDropdownOpen ? "z-40" : "z-10"
                }`}
              >
                {/* Header Band: Terracotta for Unassigned (Soft Terracotta #C2410C), Teal for Teacher (#0D9488), Indigo for Admin (#4338CA) */}
                <div
                  className={`px-5 py-3.5 flex items-center justify-between gap-3 shadow-xs text-white rounded-t-3xl ${
                    isAdminRole
                      ? "bg-focusIndicator"
                      : isUnassignedRole
                      ? "bg-warningState"
                      : "bg-brandPrimary"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-white/20 border border-white/25 flex items-center justify-center flex-shrink-0 text-lg">
                      {isAdminRole ? "👑" : isUnassignedRole ? "👤" : "👨‍🏫"}
                    </div>
                    <h3 className="text-base sm:text-lg font-extrabold text-white leading-tight truncate">
                      {member.displayName}
                    </h3>
                  </div>

                  {/* Role Status Tag in Header */}
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-white/20 text-white border border-white/30 flex-shrink-0">
                    {isAdminRole ? "Admin" : isUnassignedRole ? "⚡ Unassigned" : "Teacher"}
                  </span>
                </div>

                {/* Card Body with Component Information in Clean Pills */}
                <div className="p-5 sm:p-6 space-y-4 flex-1 flex flex-col justify-between text-left">
                  <div className="space-y-4 text-left">
                    {/* 1. Email Address Pill */}
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-canvas text-primaryText/75 border border-borderMuted shadow-2xs truncate">
                        <Mail className="w-3.5 h-3.5 text-primaryText/60 shrink-0" />
                        <span className="truncate">{member.email}</span>
                      </span>
                    </div>

                    {/* 2. Interactive Role Dropdown Pill */}
                    <div className="space-y-1.5 relative" data-staff-dropdown>
                      <label className="text-[10px] font-extrabold uppercase tracking-wider text-primaryText/60 block">
                        Educator Role (Interactive Dropdown):
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveClassMenuStaffId(null);
                          setActiveRoleMenuStaffId(
                            activeRoleMenuStaffId === member.userId ? null : member.userId
                          );
                        }}
                        className={`inline-flex items-center justify-between gap-2 px-3.5 py-2 rounded-full text-xs font-bold border shadow-2xs transition-all w-full ${
                          isUnassignedRole
                            ? "bg-amber-50 text-warningState border-warningState/40 hover:bg-amber-100"
                            : isAdminRole
                            ? "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100"
                            : "bg-tealSurface text-brandPrimary border-brandPrimary/30 hover:bg-tealSurface/80"
                        }`}
                      >
                        <span className="flex items-center gap-2 truncate">
                          <span>{isAdminRole ? "👑" : isUnassignedRole ? "⚡" : "👨‍🏫"}</span>
                          <span>
                            {isAdminRole
                              ? "School Admin"
                              : isUnassignedRole
                              ? "Unassigned Role"
                              : "Class Teacher"}
                          </span>
                        </span>
                        <ChevronDown className="w-3.5 h-3.5 opacity-70 shrink-0" />
                      </button>

                      {/* Role Dropdown Menu Popover */}
                      {activeRoleMenuStaffId === member.userId && (
                        <div className="absolute left-0 top-full mt-2 z-50 w-56 bg-surface rounded-2xl border border-borderMuted shadow-2xl p-2 space-y-1 animate-in fade-in duration-150">
                          <div className="px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-primaryText/50 border-b border-borderMuted/60 mb-1">
                            Select Role
                          </div>

                          <button
                            type="button"
                            onClick={() => handleUpdateRole(member.userId, "unassigned")}
                            className={`w-full px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between transition-colors ${
                              isUnassignedRole
                                ? "bg-amber-100 text-warningState"
                                : "hover:bg-canvas text-primaryText"
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <span>⚡</span>
                              <span>Unassigned</span>
                            </span>
                            {isUnassignedRole && <Check className="w-3.5 h-3.5 text-warningState" />}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleUpdateRole(member.userId, "teacher")}
                            className={`w-full px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between transition-colors ${
                              member.role === "teacher"
                                ? "bg-tealSurface text-brandPrimary"
                                : "hover:bg-canvas text-primaryText"
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <span>👨‍🏫</span>
                              <span>Class Teacher</span>
                            </span>
                            {member.role === "teacher" && (
                              <Check className="w-3.5 h-3.5 text-brandPrimary" />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleUpdateRole(member.userId, "admin")}
                            className={`w-full px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between transition-colors ${
                              isAdminRole
                                ? "bg-indigo-50 text-indigo-700"
                                : "hover:bg-canvas text-primaryText"
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <span>👑</span>
                              <span>School Admin</span>
                            </span>
                            {isAdminRole && <Check className="w-3.5 h-3.5 text-indigo-700" />}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* 3. Interactive Multi-Class Dropdown Pill */}
                    <div className="space-y-1.5 relative" data-staff-dropdown>
                      <label className="text-[10px] font-extrabold uppercase tracking-wider text-primaryText/60 block">
                        Assigned Classes (Multi-Class Dropdown):
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveRoleMenuStaffId(null);
                          setActiveClassMenuStaffId(
                            activeClassMenuStaffId === member.userId ? null : member.userId
                          );
                        }}
                        className={`inline-flex items-center justify-between gap-2 px-3.5 py-2 rounded-full text-xs font-bold border shadow-2xs transition-all w-full ${
                          isUnassignedClasses
                            ? "bg-amber-50 text-warningState border-warningState/40 hover:bg-amber-100"
                            : isAllClasses
                            ? "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100"
                            : "bg-tealSurface text-brandPrimary border-brandPrimary/30 hover:bg-tealSurface/80"
                        }`}
                      >
                        <span className="flex items-center gap-2 truncate">
                          <School className="w-3.5 h-3.5 shrink-0" />
                          <span>
                            {isUnassignedClasses
                              ? "⚡ Unassigned (0 Classes)"
                              : isAllClasses
                              ? "🏫 All KS2 Classes (*)"
                              : `${assignedClassIds.length} ${
                                  assignedClassIds.length === 1 ? "Class" : "Classes"
                                } Assigned`}
                          </span>
                        </span>
                        <ChevronDown className="w-3.5 h-3.5 opacity-70 shrink-0" />
                      </button>

                      {/* Multi-Select Dropdown Menu Popover */}
                      {activeClassMenuStaffId === member.userId && (
                        <div className="absolute left-0 top-full mt-2 z-50 w-72 sm:w-80 bg-surface rounded-2xl border border-borderMuted shadow-2xl p-3 space-y-2 animate-in fade-in duration-150">
                          <div className="flex items-center justify-between border-b border-borderMuted/60 pb-2">
                            <div>
                              <span className="text-xs font-extrabold text-primaryText block">
                                Assign Classes
                              </span>
                              <span className="text-[10px] text-primaryText/60">
                                Select one or more classrooms
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleClearClasses(member.userId)}
                              className="text-[11px] font-bold text-warningState hover:underline"
                            >
                              Clear (Unassign)
                            </button>
                          </div>

                          {/* Checkbox list */}
                          <div className="space-y-1.5 max-h-60 sm:max-h-72 overflow-y-auto pr-1">
                            {/* Option: All Classes */}
                            <label className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-canvas text-xs font-bold text-primaryText cursor-pointer border border-transparent hover:border-borderMuted/60 transition-colors">
                              <input
                                type="checkbox"
                                checked={isAllClasses}
                                onChange={() => handleToggleClass(member.userId, "*")}
                                className="rounded text-brandPrimary focus:ring-brandPrimary w-4 h-4 cursor-pointer"
                              />
                              <span className="flex-1">⭐ All Key Stage 2 Classes (*)</span>
                            </label>

                            {classes.map((cls) => {
                              const isSelected =
                                assignedClassIds.includes(cls.classId) ||
                                assignedClassIds.includes("*");
                              return (
                                <label
                                  key={cls.classId}
                                  className={`flex items-center gap-2.5 p-2 rounded-xl text-xs font-semibold cursor-pointer border transition-colors ${
                                    isSelected
                                      ? "bg-tealSurface/50 border-brandPrimary/30 text-primaryText"
                                      : "hover:bg-canvas border-transparent text-primaryText/80"
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => handleToggleClass(member.userId, cls.classId)}
                                    className="rounded text-brandPrimary focus:ring-brandPrimary w-4 h-4 cursor-pointer"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <strong className="block text-primaryText font-bold truncate">
                                      {cls.className}
                                    </strong>
                                    <span className="text-[10px] text-primaryText/60 block">
                                      {cls.yearGroup} &bull; Code: {cls.classJoinCode}
                                    </span>
                                  </div>
                                </label>
                              );
                            })}
                          </div>

                          <div className="pt-2 border-t border-borderMuted/60 flex items-center justify-between">
                            <span className="text-[10px] text-primaryText/60">
                              {assignedClassIds.length} selected
                            </span>
                            <button
                              type="button"
                              onClick={() => setActiveClassMenuStaffId(null)}
                              className="px-3.5 py-1.5 rounded-xl bg-brandPrimary text-white text-xs font-bold hover:bg-teal-700 shadow-2xs"
                            >
                              Done
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Display class badges for each assigned class with quick removal */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {isUnassignedClasses ? (
                          <span className="text-[11px] text-warningState font-semibold italic">
                            No classes currently assigned
                          </span>
                        ) : isAllClasses ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            ⭐ All KS2 Classes
                          </span>
                        ) : (
                          assignedClassObjs.map((c) => (
                            <span
                              key={c.classId}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-tealSurface text-brandPrimary border border-brandPrimary/30"
                            >
                              <span>{c.className}</span>
                              <button
                                type="button"
                                onClick={() => handleToggleClass(member.userId, c.classId)}
                                className="text-brandPrimary hover:text-red-600 leading-none text-sm font-bold"
                                title={`Unassign ${c.className}`}
                              >
                                &times;
                              </button>
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Card Footer */}
                  {!isAdminRole && (
                    <div className="pt-3 border-t border-borderMuted/60 flex items-center justify-end text-xs">
                      <button
                        type="button"
                        onClick={() => handleDeleteStaff(member.userId, member.displayName || "this educator")}
                        className="text-xs text-primaryText/40 hover:text-softTerracotta p-1 flex items-center gap-1 font-bold transition-colors"
                        title="Remove educator from directory"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className="text-[11px]">Remove</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. CLASSROOM ALLOCATIONS & MULTI-TEACHER ASSIGNMENTS */}
      <section className="space-y-4 text-left">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-borderMuted/60 pb-3 gap-3 text-left">
          <div>
            <h3 className="text-xl font-extrabold text-primaryText">Classroom Allocations</h3>
            <p className="text-xs text-primaryText/70 font-medium mt-0.5">
              Multi-teacher assignment: Lead Teachers, Co-Teachers, and Teaching Assistants across Key Stage 2.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setIsHandoffModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-tealSurface hover:bg-tealSurface/80 text-brandPrimary border border-brandPrimary/30 font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-colors"
              title="View teacher join codes and staff announcement briefing"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Teacher Handoff Codes</span>
            </button>

            <span className="text-xs font-bold text-brandPrimary bg-tealSurface px-3 py-2 rounded-xl border border-brandPrimary/30">
              {classes.length} Active Classes
            </span>
          </div>
        </div>

        {/* Classroom Cards Grid (Marketplace UI) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
          {classes.map((cls) => {
            const classPupilsCount = pupils.filter((p) => p.classId === cls.classId).length;
            const classPots = pots.filter((p) => p.classId === cls.classId);
            const classSavings = classPots.reduce((sum, p) => sum + p.currentAmountCents, 0);
            const leadName = getStaffName(cls.leadTeacherId || cls.teacherId);

            const coTeachers = cls.assignedTeacherIds
              ? cls.assignedTeacherIds
                  .filter((tid) => tid !== (cls.leadTeacherId || cls.teacherId))
                  .map((tid) => getStaffName(tid))
                  .filter(Boolean)
              : [];

            return (
              <div
                key={cls.classId}
                className="bg-surface rounded-3xl border border-borderMuted shadow-islandCard flex flex-col justify-between overflow-hidden hover:shadow-md transition-all text-left"
              >
                {/* Header Band */}
                <div className="px-5 py-3.5 flex items-center justify-between gap-3 shadow-xs text-white bg-brandPrimary">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-white/20 border border-white/25 flex items-center justify-center flex-shrink-0 text-lg">
                      🏫
                    </div>
                    <h3 className="text-base sm:text-lg font-extrabold text-white leading-tight truncate">
                      {cls.className}
                    </h3>
                  </div>

                  {/* Year Group Tag */}
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-white/20 text-white border border-white/30 flex-shrink-0">
                    {cls.yearGroup}
                  </span>
                </div>

                {/* Card Body with Component Information in Clean Pills */}
                <div className="p-5 sm:p-6 space-y-4 flex-1 flex flex-col justify-between text-left">
                  <div className="space-y-4 text-left">
                    {/* Information Pills */}
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Join Code Pill */}
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-tealSurface text-brandPrimary border border-brandPrimary/30 shadow-2xs">
                        <span>Code: {cls.classJoinCode}</span>
                      </span>

                      {/* Pay Day Pill */}
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-canvas text-primaryText/75 border border-borderMuted shadow-2xs">
                        <Calendar className="w-3.5 h-3.5 text-primaryText/60" />
                        <span>{cls.payoutDay} Pay Day</span>
                      </span>

                      {/* Pupils Count Pill */}
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-canvas text-primaryText/75 border border-borderMuted shadow-2xs">
                        <Users className="w-3.5 h-3.5 text-brandPrimary" />
                        <span>{classPupilsCount} Enrolled</span>
                      </span>

                      {/* Savings Pot Pill */}
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-50 text-[#C2410C] border-[#C2410C]/30 shadow-2xs">
                        <Coins className="w-3.5 h-3.5" />
                        <span>{formatCurrency(classSavings)} Saved</span>
                      </span>
                    </div>

                    {/* Lead Teacher Assignment Box */}
                    <div className="p-3.5 rounded-2xl bg-canvas border border-borderMuted space-y-1">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-primaryText/60 block">
                        Lead Teacher:
                      </span>
                      <div className="flex items-center gap-2 font-bold text-xs text-primaryText">
                        <span>👨‍🏫</span>
                        <span className="truncate">{leadName}</span>
                      </div>
                    </div>

                    {/* Co-Teachers / Teaching Assistants */}
                    {coTeachers.length > 0 && (
                      <div className="p-3.5 rounded-2xl bg-canvas border border-borderMuted space-y-1.5">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-primaryText/60 block">
                          Co-Teachers &amp; Support:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {coTeachers.map((name, i) => (
                            <span
                              key={i}
                              className="px-2.5 py-1 rounded-lg bg-surface text-primaryText text-[11px] font-bold border border-borderMuted"
                            >
                              {name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-borderMuted/60">
                    <button
                      type="button"
                      onClick={() => onSelectClassContext(cls.classId)}
                      className="flex-1 px-3 py-2.5 rounded-xl bg-brandPrimary hover:bg-teal-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                      title={`Step into ${cls.className} as teacher`}
                    >
                      <span>Step In</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenAssignModal(cls)}
                      className="px-3 py-2.5 rounded-xl bg-surface hover:bg-tealSurface border border-borderMuted text-primaryText font-bold text-xs flex items-center gap-1 transition-colors"
                      title="Assign lead & co-teachers to this class"
                    >
                      <Users className="w-3.5 h-3.5 text-brandPrimary" />
                      <span>Assign</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenCsvModal(cls)}
                      className="px-3 py-2.5 rounded-xl bg-positiveState hover:bg-green-700 text-white font-bold text-xs flex items-center gap-1 transition-colors shadow-2xs"
                      title="Upload CSV classlist for this class"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>CSV</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ADD TEACHER MODAL (Requirement: Adds teacher with 'unassigned' role & classes) */}
      {isAddTeacherModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-primaryText/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
        >
          <div className="bg-surface rounded-3xl border border-borderMuted shadow-2xl p-6 sm:p-8 space-y-5 text-left my-4 max-w-md w-full font-lexend">
            <div className="flex items-start justify-between border-b border-borderMuted/60 pb-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-tealSurface text-brandPrimary flex items-center justify-center shadow-xs">
                    <UserPlus className="w-4 h-4" />
                  </div>
                  <h3 className="text-xl font-extrabold text-primaryText">Add New Teacher</h3>
                </div>
                <p className="text-xs text-primaryText/70 font-medium">
                  Add educator to school roster. Role and classes will start as <strong>Unassigned</strong>.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAddTeacherModalOpen(false);
                  setAddTeacherError(null);
                }}
                className="text-primaryText/40 hover:text-primaryText text-2xl font-bold p-1 leading-none"
              >
                &times;
              </button>
            </div>

            {addTeacherError && (
              <div className="p-3 rounded-xl bg-amberSurface text-softTerracotta text-xs font-bold border border-softTerracotta/30">
                {addTeacherError}
              </div>
            )}

            <form onSubmit={handleAddTeacherSubmit} className="space-y-4">
              <div className="space-y-1.5 text-left">
                <label className="text-xs font-extrabold text-primaryText block">
                  Educator Full Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Mrs Davies or Mr Clark"
                  value={newTeacherName}
                  onChange={(e) => setNewTeacherName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-borderMuted text-xs font-medium text-primaryText focus:outline-hidden focus:border-brandPrimary focus:ring-1 focus:ring-brandPrimary transition-all"
                  autoFocus
                />
              </div>

              <div className="space-y-1.5 text-left">
                <label className="text-xs font-extrabold text-primaryText block">
                  School Email Address
                </label>
                <input
                  type="email"
                  placeholder="e.g. davies@stmarys-primary.sch.uk"
                  value={newTeacherEmail}
                  onChange={(e) => setNewTeacherEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-borderMuted text-xs font-medium text-primaryText focus:outline-hidden focus:border-brandPrimary focus:ring-1 focus:ring-brandPrimary transition-all"
                />
                <span className="text-[11px] text-primaryText/60 block">
                  Allowed domains: {tenant.allowedDomains.map((d) => `@${d}`).join(", ")}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200/80 text-xs text-warningState font-semibold space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <span>⚡</span>
                  <span>Unassigned Initial Status</span>
                </div>
                <p className="text-[11px] text-warningState/90 leading-relaxed">
                  Upon adding, the role and assigned classes will be marked <strong>'Unassigned'</strong>. You can change their role and assign one or more classes at any time using the dropdown menu pills on their card.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-borderMuted/60">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddTeacherModalOpen(false);
                    setAddTeacherError(null);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-surface border border-borderMuted text-primaryText font-bold text-xs hover:bg-canvas"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-brandPrimary hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>+ Add to Directory</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TEACHER HANDOFF BRIEFING MODAL */}
      {isHandoffModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-primaryText/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
        >
          <div className="bg-surface rounded-3xl border border-borderMuted shadow-2xl p-5 sm:p-6 md:p-8 space-y-5 text-left my-4 max-w-lg w-full max-h-[92vh] overflow-y-auto font-lexend">
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
                      className="p-3 rounded-2xl bg-canvas border border-borderMuted flex items-center justify-between"
                    >
                      <div>
                        <strong className="text-sm font-bold text-primaryText block">
                          {cls.className} ({cls.yearGroup})
                        </strong>
                        <span className="text-xs text-primaryText/60">
                          Assigned: <strong>{leadName}</strong>
                        </span>
                      </div>
                      <span className="px-3 py-1 rounded-xl bg-tealSurface text-brandPrimary font-mono font-bold text-sm border border-brandPrimary/30">
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
