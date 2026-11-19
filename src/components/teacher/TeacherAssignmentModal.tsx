"use client";

import React, { useState, useEffect } from "react";
import { Users, School, Check, AlertCircle } from "lucide-react";
import { ClassDocument, UserDocument } from "@/lib/firebase/types";
import { getStaffUsers, getTeachersOnly, assignClassesToTeacher } from "@/lib/services/auth-service";
import { assignTeachersToClass, purgeLegacyMockStorage } from "@/lib/services/class-service";
import { subscribeToStaff } from "@/lib/firebase/firestore-service";
import { DEFAULT_TENANT_ID } from "@/lib/services/tenant-service";

interface TeacherAssignmentModalProps {
  isOpen: boolean;
  targetClass: ClassDocument | null;
  onClose: () => void;
  onAssignmentUpdated: (updatedClass: ClassDocument) => void;
}

export function TeacherAssignmentModal({
  isOpen,
  targetClass,
  onClose,
  onAssignmentUpdated,
}: TeacherAssignmentModalProps) {
  const [staffList, setStaffList] = useState<UserDocument[]>(() => {
    try {
      return getTeachersOnly().filter(
        (t) =>
          (t.tenantId === DEFAULT_TENANT_ID || !t.tenantId) &&
          !t.displayName?.toLowerCase().includes("henderson")
      );
    } catch {
      return [];
    }
  });

  const [selectedLeadId, setSelectedLeadId] = useState<string>(
    targetClass?.leadTeacherId || targetClass?.teacherId || ""
  );
  const [selectedAssignedIds, setSelectedAssignedIds] = useState<string[]>(
    targetClass?.assignedTeacherIds || (targetClass?.leadTeacherId ? [targetClass.leadTeacherId] : [])
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    purgeLegacyMockStorage();

    const filtered = getTeachersOnly().filter(
      (t) =>
        (t.tenantId === DEFAULT_TENANT_ID || !t.tenantId) &&
        !t.displayName?.toLowerCase().includes("henderson")
    );
    setStaffList(filtered);

    const unsub = subscribeToStaff(DEFAULT_TENANT_ID, (liveStaff) => {
      if (liveStaff) {
        const teachers = liveStaff.filter(
          (t) =>
            t.role === "teacher" &&
            (t.tenantId === DEFAULT_TENANT_ID || !t.tenantId) &&
            !t.displayName?.toLowerCase().includes("henderson")
        );
        setStaffList(teachers);
      }
    });

    return () => unsub();
  }, [isOpen]);

  useEffect(() => {
    if (targetClass) {
      const lead = targetClass.leadTeacherId || targetClass.teacherId || staffList[0]?.userId || "";
      setSelectedLeadId(lead);
      setSelectedAssignedIds(targetClass.assignedTeacherIds || (lead ? [lead] : []));
    }
  }, [targetClass, staffList]);

  if (!isOpen || !targetClass) return null;

  const handleToggleAssigned = (teacherId: string) => {
    setSelectedAssignedIds((prev) =>
      prev.includes(teacherId)
        ? prev.filter((id) => id !== teacherId)
        : [...prev, teacherId]
    );
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    try {
      // Ensure lead is in assigned list
      const finalAssigned = Array.from(new Set([selectedLeadId, ...selectedAssignedIds].filter(Boolean)));
      const updatedCls = assignTeachersToClass(
        targetClass.classId,
        selectedLeadId,
        finalAssigned
      );

      // Sync teacher profiles
      finalAssigned.forEach((tid) => {
        const teacher = staffList.find((s) => s.userId === tid);
        if (teacher && (!teacher.assignedClassIds || !teacher.assignedClassIds.includes(targetClass.classId))) {
          const newClasses = [...(teacher.assignedClassIds || []), targetClass.classId];
          assignClassesToTeacher(tid, newClasses);
        }
      });

      onAssignmentUpdated(updatedCls);
      onClose();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to update teacher assignment.");
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-primaryText/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
    >
      <div className="bg-surface rounded-pot border border-borderMuted shadow-2xl p-5 sm:p-6 md:p-8 space-y-5 text-left my-4 max-w-lg w-full max-h-[92vh] overflow-y-auto font-lexend">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-borderMuted/60 pb-3 text-left">
          <div>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-brandPrimary" />
              <span className="text-xs font-bold uppercase tracking-wider text-brandPrimary">
                Admin Staff Assignment
              </span>
            </div>
            <h3 className="text-xl font-bold text-primaryText mt-0.5">
              Assign Teachers to {targetClass.className}
            </h3>
            <p className="text-xs text-primaryText/70 font-medium">
              Configure which educators have classroom management access.
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

        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-amberSurface text-warningState border border-amber-300 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4 text-left">
          {/* Lead Teacher Dropdown */}
          <div>
            <label className="block text-xs font-bold uppercase text-primaryText/70 mb-1">
              Primary Lead Teacher
            </label>
            <select
              value={selectedLeadId}
              onChange={(e) => {
                setSelectedLeadId(e.target.value);
                if (!selectedAssignedIds.includes(e.target.value)) {
                  setSelectedAssignedIds((prev) => [...prev, e.target.value]);
                }
              }}
              className="w-full px-3.5 py-2.5 text-sm bg-canvas rounded-xl border border-borderMuted font-bold text-primaryText focus:ring-2 focus:ring-brandPrimary"
            >
              {staffList.length === 0 ? (
                <option value="">No teacher accounts signed to this school yet</option>
              ) : (
                staffList.map((u) => (
                  <option key={u.userId} value={u.userId}>
                    {u.displayName} ({u.email})
                  </option>
                ))
              )}
            </select>
            <span className="text-[11px] text-primaryText/60 block mt-1">
              Primary educator accountable for class rewards, jobs, and reports.
            </span>
          </div>

          {/* Additional Teaching Staff (Job-Shares, Teaching Assistants) */}
          <div>
            <label className="block text-xs font-bold uppercase text-primaryText/70 mb-1.5">
              Permitted Staff &amp; Co-Teachers
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {staffList.length === 0 ? (
                <p className="text-xs text-primaryText/60 italic p-2">
                  No teacher accounts enrolled yet for this school.
                </p>
              ) : (
                staffList.map((member) => {
                  const isSelected = selectedAssignedIds.includes(member.userId) || member.userId === selectedLeadId;
                  return (
                    <label
                      key={member.userId}
                      className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                        isSelected
                          ? "bg-tealSurface border-brandPrimary shadow-xs"
                          : "bg-canvas border-borderMuted hover:border-brandPrimary/40"
                      }`}
                    >
                      <div className="text-left">
                        <strong className="text-xs font-bold text-primaryText block">
                          {member.displayName}
                        </strong>
                        <span className="text-[11px] text-primaryText/60">{member.email}</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        disabled={member.userId === selectedLeadId}
                        onChange={() => handleToggleAssigned(member.userId)}
                        className="accent-brandPrimary w-4 h-4 rounded"
                      />
                    </label>
                  );
                })
              )}
            </div>
            <span className="text-[11px] text-primaryText/60 block mt-1">
              Teachers checked here can view and operate this classroom from their dashboard.
            </span>
          </div>

          {/* Action Footer */}
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 pt-3 border-t border-borderMuted/60">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-primaryText/60 hover:text-primaryText text-center"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-full bg-brandPrimary hover:bg-teal-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all text-center"
            >
              <Check className="w-4 h-4 shrink-0" />
              <span>Save Teacher Assignment</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
