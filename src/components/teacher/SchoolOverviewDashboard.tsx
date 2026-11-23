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
  Lock,
  Pencil,
  AlertCircle,
  X,
  VenetianMask,
  UserCheck,
} from "lucide-react";
import {
  ClassDocument,
  PupilDocument,
  SavingsPotDocument,
  UserDocument,
  UserRole,
  TenantDocument,
  TeacherInviteDocument,
} from "@/lib/firebase/types";
import { formatCurrency } from "@/lib/firebase/zero-pii";
import {
  getStaffUsers,
  createStaffUser,
  updateStaffUser,
  deleteStaffUser,
  DEFAULT_STAFF_USERS,
} from "@/lib/services/auth-service";
import {
  getTenant,
  getTenantInvites,
  revokeTeacherInvite,
  DEFAULT_TENANT,
  DEFAULT_TENANT_ID,
} from "@/lib/services/tenant-service";
import {
  subscribeToTenant,
  subscribeToStaff,
} from "@/lib/firebase/firestore-service";
import {
  purgeLegacyMockStorage,
  updateClassSettings,
  deleteClass,
  saveClasses,
} from "@/lib/services/class-service";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";

interface SchoolOverviewDashboardProps {
  classes: ClassDocument[];
  pupils: PupilDocument[];
  pots: SavingsPotDocument[];
  onSelectClassContext: (classId: string) => void;
  onOpenAssignModal: (cls: ClassDocument) => void;
  onOpenCsvModal: (cls: ClassDocument, isWholeSchool?: boolean) => void;
  onOpenWizard: () => void;
  onOpenInviteTeacherModal?: () => void;
  onClassesChanged?: () => void;
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
  onClassesChanged,
}: SchoolOverviewDashboardProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [staffList, setStaffList] = useState<UserDocument[]>([]);
  const [tenant, setTenant] = useState<TenantDocument>(DEFAULT_TENANT);
  const [allInvites, setAllInvites] = useState<TeacherInviteDocument[]>([]);

  useEffect(() => {
    setIsMounted(true);
    purgeLegacyMockStorage();
    setStaffList(getStaffUsers());
    setTenant(getTenant());
    setAllInvites(getTenantInvites());

    const unsubTenant = subscribeToTenant(DEFAULT_TENANT_ID, (liveTenant) => {
      if (liveTenant) {
        setTenant(liveTenant);
      }
    });

    const unsubStaff = subscribeToStaff(DEFAULT_TENANT_ID, (liveStaff) => {
      setStaffList(liveStaff);
    });

    const handleStaffUpdate = () => {
      setStaffList(getStaffUsers());
      setTenant(getTenant());
      setAllInvites(getTenantInvites());
    };

    window.addEventListener("pocketpot_staff_updated", handleStaffUpdate);
    window.addEventListener("storage", handleStaffUpdate);

    return () => {
      unsubTenant();
      unsubStaff();
      window.removeEventListener("pocketpot_staff_updated", handleStaffUpdate);
      window.removeEventListener("storage", handleStaffUpdate);
    };
  }, []);

  const pendingInvites = isMounted ? allInvites.filter((i) => i.status === "pending") : [];

  // Add Teacher Modal State
  const [isAddTeacherModalOpen, setIsAddTeacherModalOpen] = useState(false);
  const [newTeacherName, setNewTeacherName] = useState("");
  const [newTeacherEmail, setNewTeacherEmail] = useState("");
  const [addTeacherError, setAddTeacherError] = useState<string | null>(null);
  const [isSubmittingTeacher, setIsSubmittingTeacher] = useState(false);

  // Dropdown Popover States (Tracks which staff member's menu is active)
  const [activeRoleMenuStaffId, setActiveRoleMenuStaffId] = useState<string | null>(null);
  const [activeClassMenuStaffId, setActiveClassMenuStaffId] = useState<string | null>(null);

  // Feedback Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Teacher Handoff Modal
  const [isHandoffModalOpen, setIsHandoffModalOpen] = useState(false);
  const [copiedAnnouncement, setCopiedAnnouncement] = useState(false);

  const activeClassIds = new Set(classes.map((c) => c.classId));
  const validPupils = pupils.filter((p) => p.classId && activeClassIds.has(p.classId));
  const validPots = pots.filter((p) => p.classId && activeClassIds.has(p.classId));
  const totalSchoolSavings = validPots.reduce((sum, p) => sum + (p.currentAmountCents || 0), 0);
  const totalEnrolledPupils = validPupils.length;
  const currentTeacherCount = staffList.filter((s) => s.role === "teacher").length;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Edit Class Modal State
  const [editingClass, setEditingClass] = useState<ClassDocument | null>(null);
  const [editClassName, setEditClassName] = useState("");
  const [editYearGroup, setEditYearGroup] = useState<"Year 3" | "Year 4" | "Year 5" | "Year 6">("Year 4");
  const [editWeeklyIncome, setEditWeeklyIncome] = useState("2.00");
  const [editPayoutDay, setEditPayoutDay] = useState<"Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday">("Friday");
  const [editAnonymizeNames, setEditAnonymizeNames] = useState(true);
  const [editFormError, setEditFormError] = useState<string | null>(null);

  // Delete Class Modal State
  const [deletingClass, setDeletingClass] = useState<ClassDocument | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleOpenEditModal = (cls: ClassDocument) => {
    setEditingClass(cls);
    setEditClassName(cls.className);
    setEditYearGroup((cls.yearGroup as any) || "Year 4");
    setEditWeeklyIncome(((cls.weeklyBasicIncomeCents ?? 200) / 100).toFixed(2));
    setEditPayoutDay((cls.payoutDay as any) || (cls.paydayOfWeek as any) || "Friday");
    setEditAnonymizeNames(cls.anonymizeNames ?? true);
    setEditFormError(null);
  };

  const handleSaveClassEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClass) return;

    const trimmedName = editClassName.trim();
    if (!trimmedName) {
      setEditFormError("Please enter a classroom name.");
      return;
    }

    const isDuplicate = classes.some(
      (c) => c.classId !== editingClass.classId && c.className.toLowerCase() === trimmedName.toLowerCase()
    );
    if (isDuplicate) {
      setEditFormError(`A class named "${trimmedName}" already exists.`);
      return;
    }

    try {
      const weeklyCents = Math.round((parseFloat(editWeeklyIncome) || 2) * 100);
      updateClassSettings(editingClass.classId, {
        className: trimmedName,
        yearGroup: editYearGroup,
        weeklyBasicIncomeCents: weeklyCents,
        payoutDay: editPayoutDay,
        paydayOfWeek: editPayoutDay,
        anonymizeNames: editAnonymizeNames,
      });

      showToast(`Class "${trimmedName}" updated successfully.`);
      setEditingClass(null);
      onClassesChanged?.();
    } catch (err: unknown) {
      setEditFormError(err instanceof Error ? err.message : "Failed to update class.");
    }
  };

  const handleOpenDeleteModal = (cls: ClassDocument) => {
    setDeletingClass(cls);
    setDeleteError(null);
  };

  const handleConfirmDeleteClass = () => {
    if (!deletingClass) return;
    try {
      setIsDeleting(true);
      deleteClass(deletingClass.classId, classes);
      showToast(`Class "${deletingClass.className}" has been permanently deleted.`);
      setDeletingClass(null);
      setIsDeleting(false);
      reloadStaff();
      onClassesChanged?.();
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete class.");
      setIsDeleting(false);
    }
  };

  const reloadStaff = () => {
    setStaffList(getStaffUsers());
    setTenant(getTenant());
    setAllInvites(getTenantInvites());
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

  // Handler: Resend Password Setup Email
  const handleResendSetupEmail = async (email: string, name?: string) => {
    try {
      if (!auth) {
        throw new Error("Authentication service is unavailable.");
      }
      await sendPasswordResetEmail(auth, email);
      showToast(`✉️ Password setup email sent to ${email}! Setup links expire after 1 hour.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to send password setup email.";
      showToast(`⚠️ ${msg}`);
    }
  };

  // Handler: Add Teacher
  const handleAddTeacherSubmit = async (e: React.FormEvent) => {
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

    setIsSubmittingTeacher(true);
    setAddTeacherError(null);

    try {
      // 1. Retrieve current ID token if authenticated
      let token: string | undefined;
      try {
        if (auth?.currentUser) {
          token = await auth.currentUser.getIdToken();
        }
      } catch (tokenErr) {
        console.warn("Failed to retrieve user ID token:", tokenErr);
      }

      // 2. Call backend callable function (POST /api/invite-teacher)
      const res = await fetch("/api/invite-teacher", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          tenantId: tenant.tenantId,
          email: trimmedEmail,
          displayName: trimmedName,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to onboard educator.");
      }

      // 3. Immediately trigger Firebase sendPasswordResetEmail so teacher gets setup email
      let emailNotice = "";
      try {
        if (auth) {
          await sendPasswordResetEmail(auth, trimmedEmail);
          emailNotice = " Password setup email dispatched (links expire after 1 hour).";
        }
      } catch (emailErr) {
        console.warn("sendPasswordResetEmail note:", emailErr);
      }

      // 4. Update local staff directory state
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
      showToast(`🎉 Added ${trimmedName}!${emailNotice}`);
    } catch (err: unknown) {
      setAddTeacherError(err instanceof Error ? err.message : "Failed to add teacher.");
    } finally {
      setIsSubmittingTeacher(false);
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

      // Sync classes: if teacher was unassigned from this class, remove them from class lead/assigned lists
      if (!nextClassIds.includes(classId) && !nextClassIds.includes("*")) {
        const targetClass = classes.find((c) => c.classId === classId);
        if (targetClass && (targetClass.leadTeacherId === userId || targetClass.assignedTeacherIds?.includes(userId))) {
          const updated = classes.map((c) => {
            if (c.classId === classId) {
              return {
                ...c,
                leadTeacherId: c.leadTeacherId === userId ? "" : c.leadTeacherId,
                teacherId: c.teacherId === userId ? "" : c.teacherId,
                assignedTeacherIds: (c.assignedTeacherIds || []).filter((id) => id !== userId),
                updatedAt: new Date().toISOString(),
              };
            }
            return c;
          });
          saveClasses(updated);
        }
      } else if (nextClassIds.includes(classId)) {
        // Teacher was assigned to class, ensure class lists them
        const targetClass = classes.find((c) => c.classId === classId);
        if (targetClass && !targetClass.assignedTeacherIds?.includes(userId)) {
          const updated = classes.map((c) => {
            if (c.classId === classId) {
              const currentAssigned = c.assignedTeacherIds || [];
              return {
                ...c,
                leadTeacherId: c.leadTeacherId || userId,
                teacherId: c.teacherId || userId,
                assignedTeacherIds: [...currentAssigned, userId],
                updatedAt: new Date().toISOString(),
              };
            }
            return c;
          });
          saveClasses(updated);
        }
      }

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
      const updated = classes.map((c) => {
        if (c.leadTeacherId === userId || c.assignedTeacherIds?.includes(userId)) {
          return {
            ...c,
            leadTeacherId: c.leadTeacherId === userId ? "" : c.leadTeacherId,
            teacherId: c.teacherId === userId ? "" : c.teacherId,
            assignedTeacherIds: (c.assignedTeacherIds || []).filter((id) => id !== userId),
            updatedAt: new Date().toISOString(),
          };
        }
        return c;
      });
      saveClasses(updated);
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
              Teachers and Classes
            </h2>
          </div>
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
          </div>
        </div>
      </div>

      {/* 3. TEACHING STAFF DIRECTORY */}
      <section className="space-y-4 text-left">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-borderMuted/60 pb-3 gap-3 text-left">
          <div>
            <h3 className="text-xl font-extrabold text-primaryText">Teachers</h3>
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
                    <div className="pt-3 border-t border-borderMuted/60 flex items-center justify-between text-xs gap-2">
                      <button
                        type="button"
                        onClick={() => member.email && handleResendSetupEmail(member.email, member.displayName)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-tealSurface hover:bg-tealSurface/80 text-brandPrimary border border-brandPrimary/30 font-bold text-xs shadow-2xs transition-all"
                        title={`Send password setup email to ${member.email}`}
                      >
                        <Mail className="w-3.5 h-3.5" />
                        <span>Resend Setup Email</span>
                      </button>

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

      {/* 4. CLASSES */}
      <section className="space-y-4 text-left">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-borderMuted/60 pb-3 gap-3 text-left">
          <div>
            <h3 className="text-xl font-extrabold text-primaryText">Classes</h3>
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

                  {/* Year Group Tag & Quick Action Buttons */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-white/20 text-white border border-white/30 flex-shrink-0">
                      {cls.yearGroup}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(cls)}
                      className="p-1.5 rounded-lg bg-white/10 hover:bg-white/25 text-white transition-colors cursor-pointer"
                      title={`Edit class ${cls.className}`}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenDeleteModal(cls)}
                      className="p-1.5 rounded-lg bg-white/10 hover:bg-red-600 text-white transition-colors cursor-pointer"
                      title={`Delete class ${cls.className}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
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
                  <div className="space-y-2 pt-3 border-t border-borderMuted/60">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onSelectClassContext(cls.classId)}
                        className="flex-1 px-3 py-2 rounded-xl bg-brandPrimary hover:bg-teal-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                        title={`Step into ${cls.className} as teacher`}
                      >
                        <span>Step In</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => onOpenAssignModal(cls)}
                        className="px-3 py-2 rounded-xl bg-surface hover:bg-tealSurface border border-borderMuted text-primaryText font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                        title="Assign lead & co-teachers to this class"
                      >
                        <Users className="w-3.5 h-3.5 text-brandPrimary" />
                        <span>Assign</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onOpenCsvModal(cls)}
                        className="px-3 py-2 rounded-xl bg-positiveState hover:bg-green-700 text-white font-bold text-xs flex items-center gap-1 transition-colors shadow-2xs cursor-pointer"
                        title="Upload CSV classlist for this class"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        <span>CSV</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2 pt-1 border-t border-borderMuted/40">
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(cls)}
                        className="flex-1 px-3 py-2 rounded-xl bg-canvas hover:bg-tealSurface border border-borderMuted hover:border-brandPrimary/40 text-primaryText font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        title={`Edit class settings for ${cls.className}`}
                      >
                        <Pencil className="w-3.5 h-3.5 text-brandPrimary" />
                        <span>Edit Class</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenDeleteModal(cls)}
                        className="flex-1 px-3 py-2 rounded-xl bg-canvas hover:bg-red-50 border border-borderMuted hover:border-red-300 text-primaryText/75 hover:text-red-600 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        title={`Delete class ${cls.className}`}
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                        <span>Delete Class</span>
                      </button>
                    </div>
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
                  placeholder="e.g. hughes@gbshp.org"
                  value={newTeacherEmail}
                  onChange={(e) => setNewTeacherEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-borderMuted text-xs font-medium text-primaryText focus:outline-hidden focus:border-brandPrimary focus:ring-1 focus:ring-brandPrimary transition-all"
                />
                <span className="text-[11px] text-primaryText/60 block">
                  Allowed domains: {Array.from(new Set(tenant.allowedDomains.map((d) => d.startsWith("@") ? d : `@${d}`))).join(", ")}
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

      {/* EDIT CLASS MODAL */}
      {editingClass && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-primaryText/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
        >
          <div className="bg-surface rounded-3xl border border-borderMuted shadow-2xl p-5 sm:p-6 md:p-8 space-y-5 text-left my-4 max-w-lg w-full max-h-[92vh] overflow-y-auto font-lexend">
            <div className="flex items-start justify-between border-b border-borderMuted/60 pb-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-tealSurface text-brandPrimary flex items-center justify-center shadow-xs">
                    <Pencil className="w-4 h-4" />
                  </div>
                  <h3 className="text-xl font-extrabold text-primaryText">
                    Edit Class &bull; {editingClass.className}
                  </h3>
                </div>
                <p className="text-xs text-primaryText/70 font-medium">
                  Update classroom name, year group, allowance policy, and privacy settings.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingClass(null);
                  setEditFormError(null);
                }}
                className="text-primaryText/40 hover:text-primaryText text-2xl font-bold p-1 leading-none cursor-pointer"
                title="Close modal"
              >
                &times;
              </button>
            </div>

            {editFormError && (
              <div className="p-3.5 rounded-xl bg-amberSurface text-warningState border border-amber-300 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{editFormError}</span>
              </div>
            )}

            <form onSubmit={handleSaveClassEdit} className="space-y-4 text-left">
              {/* Class Name */}
              <div className="space-y-1.5">
                <label htmlFor="edit-class-name" className="text-xs font-bold text-primaryText uppercase tracking-wider block">
                  Class Name <span className="text-brandPrimary">*</span>
                </label>
                <input
                  id="edit-class-name"
                  type="text"
                  required
                  value={editClassName}
                  onChange={(e) => {
                    setEditClassName(e.target.value);
                    if (editFormError) setEditFormError(null);
                  }}
                  placeholder="e.g. Year 4 Oak, Year 3 Teal"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-borderMuted text-primaryText font-medium text-sm focus:outline-hidden focus:border-brandPrimary focus:ring-1 focus:ring-brandPrimary"
                />
              </div>

              {/* Year Group */}
              <div className="space-y-1.5">
                <label htmlFor="edit-year-group" className="text-xs font-bold text-primaryText uppercase tracking-wider block">
                  KS2 Year Group
                </label>
                <div className="relative">
                  <select
                    id="edit-year-group"
                    value={editYearGroup}
                    onChange={(e) => setEditYearGroup(e.target.value as "Year 3" | "Year 4" | "Year 5" | "Year 6")}
                    className="w-full px-3.5 pr-8 py-2.5 rounded-xl bg-canvas border border-borderMuted text-primaryText font-medium text-sm focus:outline-hidden focus:border-brandPrimary appearance-none cursor-pointer"
                  >
                    <option value="Year 3">Year 3 (Ages 7–8)</option>
                    <option value="Year 4">Year 4 (Ages 8–9)</option>
                    <option value="Year 5">Year 5 (Ages 9–10)</option>
                    <option value="Year 6">Year 6 (Ages 10–11)</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-primaryText/60 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Financial Policies: Weekly Basic Income & Payout Day */}
              <div className="p-4 rounded-2xl bg-canvas border border-borderMuted space-y-3">
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-brandPrimary shrink-0" />
                  <span className="text-xs font-extrabold uppercase tracking-wider text-primaryText">
                    Weekly Basic Income Policy
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label htmlFor="edit-weekly-income" className="text-xs font-bold text-primaryText">
                      Weekly Allowance (£)
                    </label>
                    <div className="flex items-center gap-1.5">
                      <span className="text-base font-bold text-brandSecondary">£</span>
                      <input
                        id="edit-weekly-income"
                        type="number"
                        step="0.50"
                        min="0"
                        required
                        value={editWeeklyIncome}
                        onChange={(e) => setEditWeeklyIncome(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-surface border border-borderMuted text-primaryText font-bold text-sm focus:outline-hidden focus:border-brandSecondary"
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-1 pt-1">
                      {["1.00", "2.00", "3.00", "5.00"].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setEditWeeklyIncome(preset)}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                            editWeeklyIncome === preset
                              ? "bg-brandSecondary text-white"
                              : "bg-surface text-primaryText/70 hover:bg-amberSurface border border-borderMuted"
                          }`}
                        >
                          £{preset}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="edit-payout-day" className="text-xs font-bold text-primaryText">
                      Weekly Payout Day
                    </label>
                    <div className="relative">
                      <select
                        id="edit-payout-day"
                        value={editPayoutDay}
                        onChange={(e) =>
                          setEditPayoutDay(e.target.value as "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday")
                        }
                        className="w-full px-2.5 pr-7 py-2 rounded-lg bg-surface border border-borderMuted text-primaryText font-bold text-xs focus:outline-hidden focus:border-brandSecondary appearance-none cursor-pointer"
                      >
                        <option value="Monday">Monday (08:00)</option>
                        <option value="Tuesday">Tuesday (08:00)</option>
                        <option value="Wednesday">Wednesday (08:00)</option>
                        <option value="Thursday">Thursday (08:00)</option>
                        <option value="Friday">Friday (08:00)</option>
                      </select>
                      <ChevronDown className="w-4 h-4 text-primaryText/60 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Roster Privacy & Display Mode */}
              <div className="p-4 rounded-2xl bg-canvas border border-borderMuted space-y-2">
                <span className="text-xs font-extrabold uppercase tracking-wider text-primaryText block">
                  Roster Privacy &amp; Display Mode
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <label
                    className={`p-2.5 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-2 ${
                      editAnonymizeNames
                        ? "border-brandPrimary bg-surface shadow-2xs"
                        : "border-borderMuted bg-surface/60 hover:bg-surface"
                    }`}
                  >
                    <input
                      type="radio"
                      name="edit-naming-option"
                      checked={editAnonymizeNames}
                      onChange={() => setEditAnonymizeNames(true)}
                      className="mt-0.5 text-brandPrimary focus:ring-brandPrimary"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <VenetianMask className="w-3.5 h-3.5 text-brandPrimary" />
                        <span className="text-xs font-bold text-primaryText">Nature Codenames</span>
                      </div>
                      <p className="text-[10px] text-primaryText/70 mt-0.5">
                        Zero-PII animal codenames.
                      </p>
                    </div>
                  </label>

                  <label
                    className={`p-2.5 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-2 ${
                      !editAnonymizeNames
                        ? "border-brandSecondary bg-surface shadow-2xs"
                        : "border-borderMuted bg-surface/60 hover:bg-surface"
                    }`}
                  >
                    <input
                      type="radio"
                      name="edit-naming-option"
                      checked={!editAnonymizeNames}
                      onChange={() => setEditAnonymizeNames(false)}
                      className="mt-0.5 text-brandSecondary focus:ring-brandSecondary"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-brandSecondary" />
                        <span className="text-xs font-bold text-primaryText">First Names</span>
                      </div>
                      <p className="text-[10px] text-primaryText/70 mt-0.5">
                        First names (Local device).
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-borderMuted">
                <button
                  type="button"
                  onClick={() => {
                    setEditingClass(null);
                    setEditFormError(null);
                  }}
                  className="px-4 py-2.5 rounded-xl border border-borderMuted text-primaryText font-bold text-xs hover:bg-canvas transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-brandPrimary hover:bg-teal-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CLASS CONFIRMATION MODAL */}
      {deletingClass && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-primaryText/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
        >
          <div className="bg-surface rounded-3xl border-2 border-red-200 shadow-2xl p-6 sm:p-8 space-y-5 text-left my-4 max-w-md w-full font-lexend">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center text-xl shrink-0">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h4 className="text-xl font-extrabold text-primaryText">
                  Delete Classroom
                </h4>
                <p className="text-xs text-primaryText/70">
                  {deletingClass.className} ({deletingClass.yearGroup})
                </p>
              </div>
            </div>

            {deleteError && (
              <div className="p-3.5 rounded-xl bg-red-50 text-red-700 border border-red-200 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="p-3.5 rounded-2xl bg-canvas border border-borderMuted space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-primaryText/70">Class Join Code:</span>
                <span className="font-mono font-bold text-primaryText">{deletingClass.classJoinCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-primaryText/70">Enrolled Pupils:</span>
                <span className="font-bold text-primaryText">
                  {pupils.filter((p) => p.classId === deletingClass.classId).length} pupils
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-primaryText/70">Active Savings:</span>
                <span className="font-bold text-[#C2410C]">
                  {formatCurrency(
                    pots
                      .filter((p) => p.classId === deletingClass.classId)
                      .reduce((sum, p) => sum + (p.currentAmountCents || 0), 0)
                  )}
                </span>
              </div>
            </div>

            <p className="text-xs text-primaryText/80 leading-relaxed">
              Deleting this classroom will <strong>permanently remove</strong> all enrolled pupils, their savings pots, transactions, and PIN debit cards. This action cannot be reversed.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setDeletingClass(null);
                  setDeleteError(null);
                }}
                disabled={isDeleting}
                className="px-4 py-2.5 rounded-xl border border-borderMuted text-primaryText font-bold text-xs hover:bg-canvas transition-colors cursor-pointer"
              >
                Keep Class
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteClass}
                disabled={isDeleting}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isDeleting ? "Deleting..." : "Delete Entire Class"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
