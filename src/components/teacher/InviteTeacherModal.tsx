"use client";

import React, { useState } from "react";
import {
  UserPlus,
  ShieldCheck,
  Check,
  AlertCircle,
  Building,
  Mail,
  School,
  Sparkles,
  Lock,
  Users,
} from "lucide-react";
import {
  getTenant,
  validateTeacherEmailDomain,
  inviteAndProvisionTeacher,
  inviteAndProvisionTeachersBatch,
  parseBulkEmails,
  DEFAULT_TENANT_ID,
} from "@/lib/services/tenant-service";
import { ClassDocument, UserDocument } from "@/lib/firebase/types";

interface InviteTeacherModalProps {
  isOpen: boolean;
  onClose: () => void;
  classes: ClassDocument[];
  onTeacherInvited: (newTeacher?: UserDocument) => void;
  tenantId?: string;
}

export function InviteTeacherModal({
  isOpen,
  onClose,
  classes,
  onTeacherInvited,
  tenantId = DEFAULT_TENANT_ID,
}: InviteTeacherModalProps) {
  const tenant = getTenant(tenantId);
  const [activeMode, setActiveMode] = useState<"single" | "bulk">("single");

  // Single teacher state
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>(
    classes.length > 0 ? [classes[0].classId] : []
  );

  // Bulk teacher state
  const [bulkText, setBulkText] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const primaryDomain = tenant.allowedDomains[0] || "st-marys.sch.uk";

  // Real-time single domain verification
  const domainValidation = email.includes("@")
    ? validateTeacherEmailDomain(email, tenant.tenantId)
    : null;

  // Real-time bulk parsing & pre-checks
  const parsedBulkEmails = parseBulkEmails(bulkText);
  const invalidBulkEmails = parsedBulkEmails.filter(
    (e) => !validateTeacherEmailDomain(e, tenant.tenantId).isWhitelisted
  );

  const handleToggleClass = (classId: string) => {
    setSelectedClassIds((prev) =>
      prev.includes(classId) ? prev.filter((id) => id !== classId) : [...prev, classId]
    );
  };

  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email.trim()) {
      setErrorMessage("Please enter an educator email address.");
      return;
    }

    const preCheck = validateTeacherEmailDomain(email, tenant.tenantId);
    if (!preCheck.isWhitelisted) {
      setErrorMessage(preCheck.friendlyError || "Invalid email domain.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = inviteAndProvisionTeacher(
        {
          email: email.trim(),
          displayName: displayName.trim() || `Teacher (${email.split("@")[0]})`,
          assignedClassIds: selectedClassIds,
          invitedBy: "staff-admin-head",
        },
        tenant.tenantId
      );

      if (!result.success || !result.createdTeacher) {
        setErrorMessage(result.errorMessage || "Failed to provision teacher account.");
        setIsSubmitting(false);
        return;
      }

      setSuccessMessage(`Account spun up successfully for ${result.createdTeacher.displayName}!`);
      setTimeout(() => {
        onTeacherInvited(result.createdTeacher!);
        onClose();
      }, 1100);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error during teacher invite.";
      setErrorMessage(msg);
      setIsSubmitting(false);
    }
  };

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (parsedBulkEmails.length === 0) {
      setErrorMessage("Please paste at least one valid school email address.");
      return;
    }

    if (invalidBulkEmails.length > 0) {
      setErrorMessage(
        `${invalidBulkEmails.length} email(s) do not match your school's approved domain (@${primaryDomain}): ${invalidBulkEmails.slice(0, 3).join(", ")}${invalidBulkEmails.length > 3 ? "..." : ""}`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const entries = parsedBulkEmails.map((em) => ({
        email: em,
        displayName: `Teacher (${em.split("@")[0]})`,
        assignedClassIds: selectedClassIds,
      }));

      const batchResult = inviteAndProvisionTeachersBatch(
        entries,
        "staff-admin-head",
        tenant.tenantId
      );

      if (batchResult.successful.length === 0) {
        setErrorMessage("None of the submitted email addresses could be provisioned. They may already exist.");
        setIsSubmitting(false);
        return;
      }

      setSuccessMessage(
        `Successfully onboarded ${batchResult.successful.length} teacher accounts! ${batchResult.failed.length > 0 ? `(${batchResult.failed.length} skipped)` : ""}`
      );
      setTimeout(() => {
        onTeacherInvited();
        onClose();
      }, 1300);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error during bulk onboarding.";
      setErrorMessage(msg);
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-primaryText/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
    >
      <div className="bg-surface rounded-pot border border-borderMuted shadow-2xl p-5 sm:p-6 md:p-8 space-y-5 text-left my-4 max-w-xl w-full max-h-[92vh] overflow-y-auto font-lexend">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-borderMuted/60 pb-3 text-left">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-brandPrimary" />
              <span className="text-xs font-bold uppercase tracking-wider text-brandPrimary">
                Admin Staff Provisioning
              </span>
            </div>
            <h3 className="text-xl font-bold text-primaryText">
              Onboard &amp; Assign Teachers
            </h3>
            <p className="text-xs text-primaryText/70">
              Spins up institutional teacher accounts in Firebase for <strong>{tenant.schoolName}</strong>.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-primaryText/40 hover:text-primaryText text-2xl font-bold p-1 leading-none"
          >
            &times;
          </button>
        </div>

        {/* Tenant Whitelisting Unlimited Policy Card */}
        <div className="p-4 rounded-2xl bg-canvas border border-borderMuted space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Building className="w-4 h-4 text-brandPrimary" />
              <strong className="text-xs font-bold text-primaryText">{tenant.schoolName}</strong>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-surface border border-borderMuted font-mono text-primaryText/60">
                URN: {tenant.schoolUrn}
              </span>
            </div>
            <span className="text-xs font-bold text-positiveState flex items-center gap-1">
              <Check className="w-3.5 h-3.5" />
              Unlimited Teacher Accounts
            </span>
          </div>

          {/* Whitelisted Domain Badges */}
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-borderMuted/40 text-xs">
            <span className="text-[11px] font-bold text-primaryText/60 uppercase">Whitelisted Domains:</span>
            {tenant.allowedDomains.map((dom) => (
              <span
                key={dom}
                className="px-2.5 py-0.5 rounded-full bg-tealSurface text-brandPrimary text-[11px] font-bold border border-brandPrimary/30 flex items-center gap-1 font-mono"
              >
                <Lock className="w-3 h-3" />
                @{dom}
              </span>
            ))}
          </div>
        </div>

        {/* Mode Selector Tabs */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-canvas rounded-2xl border border-borderMuted">
          <button
            type="button"
            onClick={() => setActiveMode("single")}
            className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
              activeMode === "single"
                ? "bg-surface text-brandPrimary shadow-xs border border-borderMuted"
                : "text-primaryText/60 hover:text-primaryText"
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Single Teacher</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveMode("bulk")}
            className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
              activeMode === "bulk"
                ? "bg-surface text-brandPrimary shadow-xs border border-borderMuted"
                : "text-primaryText/60 hover:text-primaryText"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Bulk Paste School Emails</span>
          </button>
        </div>

        {/* Feedback Messages */}
        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-amberSurface text-warningState border border-amber-300 text-xs font-medium flex items-start gap-2.5 leading-relaxed">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3.5 rounded-2xl bg-positiveState/10 text-positiveState border border-positiveState/30 text-xs font-bold flex items-center gap-2">
            <Check className="w-4 h-4 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Form: Single Mode */}
        {activeMode === "single" ? (
          <form onSubmit={handleSingleSubmit} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-bold uppercase text-primaryText/70 mb-1">
                Teacher's Institutional Email Address *
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={`e.g. harrison@${primaryDomain}`}
                  className="w-full pl-9 pr-4 py-2.5 text-sm bg-surface rounded-xl border border-borderMuted font-bold text-primaryText focus:ring-2 focus:ring-brandPrimary"
                  required
                />
                <Mail className="w-4 h-4 text-primaryText/40 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
              
              {domainValidation && (
                <div className="mt-1.5 text-[11px]">
                  {domainValidation.isWhitelisted ? (
                    <span className="text-positiveState font-semibold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      Verified school domain (@{domainValidation.domain}). Ready to provision.
                    </span>
                  ) : (
                    <span className="text-warningState font-medium flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Personal &amp; non-whitelisted domains are blocked for student safeguarding.
                    </span>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-primaryText/70 mb-1">
                Teacher Name &amp; Title (Optional)
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Mr Harrison (Year 5 Co-Teacher)"
                className="w-full px-4 py-2.5 text-sm bg-surface rounded-xl border border-borderMuted font-medium text-primaryText focus:ring-2 focus:ring-brandPrimary"
              />
            </div>

            {/* Classroom Allocation */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase text-primaryText/70">
                Assign to Classrooms (Key Stage 2)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 rounded-2xl bg-canvas border border-borderMuted max-h-40 overflow-y-auto">
                {classes.map((cls) => {
                  const isSelected = selectedClassIds.includes(cls.classId);
                  return (
                    <label
                      key={cls.classId}
                      className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? "bg-tealSurface border-brandPrimary shadow-2xs"
                          : "bg-surface border-borderMuted hover:border-brandPrimary/30"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleClass(cls.classId)}
                        className="rounded text-brandPrimary focus:ring-brandPrimary"
                      />
                      <div>
                        <strong className="text-xs font-bold text-primaryText block">
                          {cls.className}
                        </strong>
                        <span className="text-[10px] text-primaryText/60 font-medium block">
                          {cls.yearGroup} &bull; Code: {cls.classJoinCode}
                        </span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-borderMuted/60">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="py-2.5 px-4 rounded-xl border border-borderMuted text-xs font-bold text-primaryText hover:bg-canvas transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="py-2.5 px-5 rounded-xl bg-brandPrimary hover:bg-teal-700 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>Provisioning...</span>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Spin Up Account &amp; Send Invite</span>
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          /* Form: Bulk Mode */
          <form onSubmit={handleBulkSubmit} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-bold uppercase text-primaryText/70 mb-1">
                Paste Multiple School Email Addresses *
              </label>
              <p className="text-[11px] text-primaryText/60 mb-2">
                Paste a list separated by commas, spaces, or newlines from your staff directory.
              </p>
              <textarea
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder={`davis@${primaryDomain}&#10;wilson@${primaryDomain}&#10;taylor@${primaryDomain}`}
                rows={4}
                className="w-full px-3.5 py-2.5 text-xs bg-surface rounded-xl border border-borderMuted font-mono text-primaryText focus:ring-2 focus:ring-brandPrimary"
                required
              />
              
              {/* Bulk feedback counter */}
              <div className="flex items-center justify-between text-xs mt-1.5">
                <span className="font-bold text-brandPrimary">
                  {parsedBulkEmails.length} Email(s) Detected
                </span>
                {invalidBulkEmails.length > 0 && (
                  <span className="font-bold text-warningState">
                    {invalidBulkEmails.length} Non-Whitelisted (Blocked)
                  </span>
                )}
              </div>
            </div>

            {/* Classroom Allocation for Bulk */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase text-primaryText/70">
                Initial Classrooms for All Onboarded Staff (Optional)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 rounded-2xl bg-canvas border border-borderMuted max-h-36 overflow-y-auto">
                {classes.map((cls) => {
                  const isSelected = selectedClassIds.includes(cls.classId);
                  return (
                    <label
                      key={cls.classId}
                      className={`flex items-center gap-2.5 p-2 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? "bg-tealSurface border-brandPrimary shadow-2xs"
                          : "bg-surface border-borderMuted hover:border-brandPrimary/30"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleClass(cls.classId)}
                        className="rounded text-brandPrimary focus:ring-brandPrimary"
                      />
                      <div>
                        <strong className="text-xs font-bold text-primaryText block">
                          {cls.className}
                        </strong>
                        <span className="text-[10px] text-primaryText/60 block">
                          {cls.yearGroup}
                        </span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-borderMuted/60">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="py-2.5 px-4 rounded-xl border border-borderMuted text-xs font-bold text-primaryText hover:bg-canvas transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || parsedBulkEmails.length === 0 || invalidBulkEmails.length > 0}
                className="py-2.5 px-5 rounded-xl bg-brandPrimary hover:bg-teal-700 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>Batch Provisioning...</span>
                ) : (
                  <>
                    <Users className="w-4 h-4" />
                    <span>Onboard {parsedBulkEmails.length} Teachers</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
