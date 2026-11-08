"use client";

import React, { useState, useRef } from "react";
import {
  ShieldCheck,
  Upload,
  FileSpreadsheet,
  Check,
  AlertCircle,
  Eye,
  Trash2,
  Sparkles,
  Layers,
  ArrowRight,
  HelpCircle,
} from "lucide-react";
import {
  sanitizeClasslistCsv,
  matchClassToExisting,
  CsvSafeguardingAuditResult,
  ParsedCsvPupilRow,
} from "@/lib/services/csv-sanitizer";
import {
  enrollBatchPupils,
  enrollMultiClassPupils,
  getSavedClasses,
} from "@/lib/services/class-service";
import { ClassDocument, PupilDocument } from "@/lib/firebase/types";

interface CsvClasslistUploadModalProps {
  isOpen: boolean;
  activeClass: ClassDocument | null;
  classes?: ClassDocument[];
  isWholeSchool?: boolean;
  onClose: () => void;
  onPupilsEnrolled: (enrolled: PupilDocument[]) => void;
}

export function CsvClasslistUploadModal({
  isOpen,
  activeClass,
  classes = [],
  isWholeSchool = false,
  onClose,
  onPupilsEnrolled,
}: CsvClasslistUploadModalProps) {
  const [dragActive, setDragActive] = useState(false);
  const [auditResult, setAuditResult] = useState<CsvSafeguardingAuditResult | null>(null);
  const [pupilRows, setPupilRows] = useState<ParsedCsvPupilRow[]>([]);
  const [bulkAssignClassId, setBulkAssignClassId] = useState<string>("");
  const [anonymize, setAnonymize] = useState(true);
  const [customCsvText, setCustomCsvText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  // Retrieve all configured classes for matching
  const availableClasses = classes && classes.length > 0 ? classes : getSavedClasses();

  const processCsvContent = (content: string, fileName: string) => {
    setErrorMessage(null);
    const result = sanitizeClasslistCsv(content, fileName);
    if (!result.isValid) {
      setErrorMessage(result.errorMessage || "Unable to read pupil rows from CSV.");
      setAuditResult(null);
      setPupilRows([]);
      return;
    }

    setAuditResult(result);

    // Auto-sort pupils into classes based on detected class/year tokens
    const mapped: ParsedCsvPupilRow[] = (result.pupilRows || []).map((row) => {
      const autoMatchedClassId = matchClassToExisting(row.rawClass, availableClasses);
      return {
        ...row,
        assignedClassId:
          autoMatchedClassId ||
          (!isWholeSchool && !result.hasMultipleClasses && activeClass
            ? activeClass.classId
            : undefined),
      };
    });

    setPupilRows(mapped);
  };

  const handleFileChange = (file: File) => {
    if (!file.name.endsWith(".csv") && !file.name.endsWith(".txt")) {
      setErrorMessage("Please upload a valid .csv spreadsheet file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = (e.target?.result as string) || "";
      processCsvContent(content, file.name);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleProcessPastedText = () => {
    if (!customCsvText.trim()) {
      setErrorMessage("Please paste or type classlist names.");
      return;
    }
    processCsvContent(customCsvText, "pasted-classlist.csv");
  };

  const handleLoadSampleMis = () => {
    const sampleWholeSchool =
      "Surname,Forename,Year,Form,DOB,UPN\n" +
      "Smith,Lucas,Year 3,3T,12/04/2016,E801234567\n" +
      "Patel,Aaliyah,Year 3,3T,05/09/2015,E801987654\n" +
      "Davies,Noah,Year 4,4T,23/01/2015,E801456123\n" +
      "Taylor,Chloe,Year 4,4T,17/07/2014,E801654987\n" +
      "Wilson,Ethan,Year 5,5O,19/11/2014,E801789123\n" +
      "Brown,Freya,Year 5,5O,02/03/2015,E801321654\n" +
      "Jones,Oliver,Year 6,6W,14/05/2013,E801876543\n" +
      "Williams,Sophia,Year 6,6W,28/08/2013,E801654321";
    processCsvContent(sampleWholeSchool, "sample-whole-school-mis.csv");
  };

  // Simplest Manual Assignment Option 1: One-click bulk assign to all unassigned pupils
  const handleBulkAssign = () => {
    if (!bulkAssignClassId) {
      setErrorMessage("Please select a target class from the dropdown to assign.");
      return;
    }
    setErrorMessage(null);
    setPupilRows((prev) =>
      prev.map((r) => (r.assignedClassId ? r : { ...r, assignedClassId: bulkAssignClassId }))
    );
  };

  // Simplest Manual Assignment Option 2: Inline individual per-row dropdown override
  const handleRowClassChange = (rowId: string, newClassId: string) => {
    setPupilRows((prev) =>
      prev.map((r) =>
        r.id === rowId ? { ...r, assignedClassId: newClassId || undefined } : r
      )
    );
  };

  // Compute breakdown stats
  const assignedRows = pupilRows.filter((r) => Boolean(r.assignedClassId));
  const unassignedRows = pupilRows.filter((r) => !r.assignedClassId);
  const isMultiClassMode = isWholeSchool || (auditResult?.hasMultipleClasses ?? false);

  // Group assigned pupils by class
  const classBreakdown: Record<string, { className: string; pupils: ParsedCsvPupilRow[] }> = {};
  for (const row of assignedRows) {
    if (row.assignedClassId) {
      if (!classBreakdown[row.assignedClassId]) {
        const cls = availableClasses.find((c) => c.classId === row.assignedClassId);
        classBreakdown[row.assignedClassId] = {
          className: cls ? cls.className : row.assignedClassId,
          pupils: [],
        };
      }
      classBreakdown[row.assignedClassId].pupils.push(row);
    }
  }

  const handleConfirmEnrollment = () => {
    if (!auditResult || pupilRows.length === 0) return;

    if (unassignedRows.length > 0) {
      setErrorMessage(
        `${unassignedRows.length} pupil(s) have not been assigned to a classroom. Please choose a class for each child or use '⚡ Assign All' above.`
      );
      return;
    }

    setIsProcessing(true);
    try {
      if (isMultiClassMode || Object.keys(classBreakdown).length > 1) {
        // Multi-Class Atomic Enrollment (Requirement 1)
        const enrollments = Object.entries(classBreakdown).map(([classId, data]) => ({
          classId,
          pupilNames: data.pupils.map((p) => p.firstName),
        }));

        const result = enrollMultiClassPupils(enrollments, anonymize);
        onPupilsEnrolled(result.allPupils);
      } else {
        // Single Class Enrollment
        const targetClassId =
          activeClass?.classId || assignedRows[0]?.assignedClassId || availableClasses[0]?.classId;
        const pupilNames = pupilRows.map((p) => p.firstName);
        const enrolled = enrollBatchPupils(
          targetClassId,
          pupilNames,
          anonymize,
          activeClass?.initialOpeningBalanceCents
        );
        onPupilsEnrolled(enrolled);
      }

      onClose();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to enroll pupils.");
      setIsProcessing(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-primaryText/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
    >
      <div className="bg-surface rounded-pot border border-borderMuted shadow-2xl p-5 sm:p-6 md:p-8 space-y-5 text-left my-4 max-w-2xl w-full max-h-[92vh] overflow-y-auto font-lexend">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-borderMuted/60 pb-3.5 text-left">
          <div className="space-y-0.5 text-left">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-brandPrimary" />
              <span className="text-xs font-bold uppercase tracking-wider text-brandPrimary">
                {isMultiClassMode ? "Whole-School MIS Ingestion" : "Zero-PII CSV Ingestion"}
              </span>
            </div>
            <h3 className="text-2xl font-bold text-primaryText">
              {isMultiClassMode
                ? "Upload Whole-School MIS Classlist"
                : `Upload Classlist for ${activeClass?.className || "Classroom"}`}
            </h3>
            <p className="text-xs text-primaryText/70 font-medium">
              Exported from SIMS, Arbor, Bromcom, or Google Sheets. Surnames and sensitive fields are stripped automatically.
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

        {/* STEP A: FILE UPLOAD & DRAG/DROP ZONE */}
        {!auditResult && (
          <div className="space-y-4 text-left">
            <div
              onDragEnter={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setDragActive(false);
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all ${
                dragActive
                  ? "border-brandPrimary bg-tealSurface"
                  : "border-borderMuted hover:border-brandPrimary/50 bg-canvas"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
              />
              <Upload className="w-10 h-10 text-brandPrimary mx-auto mb-2 opacity-80" />
              <strong className="text-sm font-bold text-primaryText block">
                Choose CSV Classlist File or Drag &amp; Drop Here
              </strong>
              <span className="text-xs text-primaryText/60 block mt-1">
                Accepts .csv spreadsheets from school MIS systems (SIMS, Arbor, Bromcom)
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={handleLoadSampleMis}
                className="text-brandPrimary hover:underline font-bold flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Load Sample Whole-School MIS Classlist</span>
              </button>
            </div>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-borderMuted/60"></div>
              <span className="flex-shrink mx-4 text-xs uppercase font-bold text-primaryText/40">
                Or Paste Roster Text
              </span>
              <div className="flex-grow border-t border-borderMuted/60"></div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-primaryText/70 mb-1">
                Paste student names and optional class (comma or line separated):
              </label>
              <textarea
                rows={3}
                value={customCsvText}
                onChange={(e) => setCustomCsvText(e.target.value)}
                placeholder="Forename, Year&#10;Lucas, Year 3&#10;Chloe, Year 4&#10;Ethan, Year 5..."
                className="w-full px-3.5 py-2 text-xs bg-canvas rounded-xl border border-borderMuted font-medium text-primaryText focus:ring-2 focus:ring-brandPrimary"
              />
              <button
                type="button"
                onClick={handleProcessPastedText}
                className="mt-2 px-4 py-2 rounded-xl bg-tealSurface hover:bg-tealSurface/80 text-brandPrimary border border-brandPrimary/30 font-bold text-xs"
              >
                Scan &amp; Audit Pasted Text
              </button>
            </div>
          </div>
        )}

        {/* STEP B: PRE-FLIGHT SAFEGUARDING AUDIT SCREEN */}
        {auditResult && (
          <div className="space-y-4 text-left animate-in fade-in duration-150">
            {/* Audit Summary Box */}
            <div className="p-4 rounded-2xl bg-tealSurface/60 border border-brandPrimary/40 space-y-2 text-left">
              <div className="flex items-center gap-2 text-positiveState">
                <ShieldCheck className="w-5 h-5 flex-shrink-0" />
                <strong className="text-sm font-bold text-primaryText">
                  Zero-PII Safeguarding Pre-Flight Audit Passed
                </strong>
              </div>
              <div className="text-xs text-primaryText/80 space-y-1">
                <div>
                  File: <strong className="text-primaryText">{auditResult.fileName}</strong> &bull; Identified{" "}
                  <strong className="text-brandPrimary">{auditResult.totalRows} student rows</strong>
                </div>
                {auditResult.strippedColumns.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="font-semibold text-warningState">Permanently Stripped &amp; Purged:</span>
                    {auditResult.strippedColumns.map((col) => (
                      <span
                        key={col}
                        className="px-2 py-0.5 rounded-md bg-amberSurface text-warningState border border-amber-300 text-[10px] font-bold"
                      >
                        {col}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="text-[11px] text-primaryText/60">
                    No forbidden PII columns detected. Roster is clean.
                  </div>
                )}
              </div>
            </div>

            {/* REQUIREMENT 1: AUTOMATIC CLASS SORTING & SIMPLE MANUAL ASSIGNMENT */}
            <div className="p-4 rounded-2xl bg-canvas border border-borderMuted space-y-3 text-left">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-borderMuted/60 pb-2">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-brandPrimary" />
                  <strong className="text-xs font-bold uppercase tracking-wider text-primaryText">
                    Classroom Sorting &amp; Allocation
                  </strong>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-primaryText/70">
                    Auto-sorted: <strong className="text-positiveState">{assignedRows.length}</strong> /{" "}
                    <strong>{pupilRows.length}</strong>
                  </span>
                  {unassignedRows.length === 0 ? (
                    <span className="px-2 py-0.5 rounded-full bg-tealSurface text-brandPrimary text-[10px] font-bold border border-brandPrimary/30">
                      ✓ 100% Sorted
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-amberSurface text-warningState text-[10px] font-bold border border-amber-300">
                      {unassignedRows.length} Unassigned
                    </span>
                  )}
                </div>
              </div>

              {/* Classroom Breakdown Chips */}
              {Object.keys(classBreakdown).length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[11px] text-primaryText/60 font-semibold block">
                    Sorted Class Breakdown:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(classBreakdown).map(([classId, data]) => (
                      <div
                        key={classId}
                        className="px-3 py-1.5 rounded-xl bg-surface border border-borderMuted text-xs flex items-center gap-2 shadow-2xs"
                      >
                        <span className="w-2 h-2 rounded-full bg-brandPrimary" />
                        <strong className="text-primaryText font-bold">{data.className}</strong>
                        <span className="text-[11px] text-brandPrimary font-semibold">
                          ({data.pupils.length} pupils)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SIMPLEST MANUAL ASSIGNMENT FALLBACK (Requirement 1) */}
              {unassignedRows.length > 0 && (
                <div className="p-3.5 rounded-xl bg-amberSurface/80 border border-amber-300 space-y-3">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-brandSecondary">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>Manual Classroom Assignment Needed ({unassignedRows.length} pupils)</span>
                    </div>
                    <p className="text-[11px] text-primaryText/70 mt-0.5">
                      The CSV list did not specify or match a class for these pupils. Assign them with 1 click below:
                    </p>
                  </div>

                  {/* 1-Click Bulk Assign Bar */}
                  <div className="flex flex-col sm:flex-row items-center gap-2 bg-surface p-2.5 rounded-xl border border-amber-300/80">
                    <span className="text-xs font-bold text-primaryText whitespace-nowrap">
                      Assign all {unassignedRows.length} remaining pupils to:
                    </span>
                    <select
                      value={bulkAssignClassId}
                      onChange={(e) => setBulkAssignClassId(e.target.value)}
                      className="px-3 py-1.5 text-xs bg-canvas rounded-lg border border-borderMuted text-primaryText font-bold flex-1"
                    >
                      <option value="">-- Select Target Classroom --</option>
                      {availableClasses.map((cls) => (
                        <option key={cls.classId} value={cls.classId}>
                          {cls.className} ({cls.yearGroup})
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleBulkAssign}
                      className="px-3.5 py-1.5 rounded-lg bg-brandPrimary hover:bg-teal-700 text-white font-bold text-xs whitespace-nowrap shadow-xs"
                    >
                      ⚡ Apply to All Unassigned
                    </button>
                  </div>

                  {/* Per-Row Dropdowns (for individual assignment overrides) */}
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    <span className="text-[10px] uppercase font-bold text-primaryText/50 block">
                      Or select class individually:
                    </span>
                    {unassignedRows.map((pupil) => (
                      <div
                        key={pupil.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-surface border border-borderMuted text-xs"
                      >
                        <span className="font-bold text-primaryText">{pupil.firstName}</span>
                        <select
                          value={pupil.assignedClassId || ""}
                          onChange={(e) => handleRowClassChange(pupil.id, e.target.value)}
                          className="px-2 py-1 text-xs bg-canvas rounded-md border border-borderMuted text-primaryText font-medium"
                        >
                          <option value="">-- Choose Class --</option>
                          {availableClasses.map((cls) => (
                            <option key={cls.classId} value={cls.classId}>
                              {cls.className}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Privacy Mode Selector */}
            <div className="p-3.5 rounded-2xl bg-canvas border border-borderMuted space-y-2 text-left">
              <span className="text-xs font-bold uppercase tracking-wider text-primaryText/70 block">
                Classroom Privacy Preference
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setAnonymize(true)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    anonymize
                      ? "bg-tealSurface border-brandPrimary shadow-xs"
                      : "bg-surface border-borderMuted hover:border-brandPrimary/40"
                  }`}
                >
                  <strong className="text-xs font-bold text-primaryText block">
                    Strict Animal Codenames
                  </strong>
                  <span className="text-[11px] text-primaryText/70">
                    100% Zero-PII. Auto-generates friendly pseudonyms (*"Clever Badger"*).
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setAnonymize(false)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    !anonymize
                      ? "bg-tealSurface border-brandPrimary shadow-xs"
                      : "bg-surface border-borderMuted hover:border-brandPrimary/40"
                  }`}
                >
                  <strong className="text-xs font-bold text-primaryText block">
                    Classroom First Names Only
                  </strong>
                  <span className="text-[11px] text-primaryText/70">
                    Uses extracted single forenames locally on classroom screen.
                  </span>
                </button>
              </div>
            </div>

            {/* Preview of Enrolled Children */}
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-primaryText/70 block mb-1.5">
                Preview of Enrolled Students:
              </span>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {pupilRows.slice(0, 8).map((p, i) => {
                  const assignedCls = availableClasses.find((c) => c.classId === p.assignedClassId);
                  return (
                    <div
                      key={p.id}
                      className="p-2.5 rounded-xl bg-canvas border border-borderMuted flex items-center justify-between text-xs font-medium"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-primaryText font-bold">
                          {anonymize ? `Animal Codename #${101 + i}` : p.firstName}
                        </span>
                        {assignedCls ? (
                          <span className="px-2 py-0.5 rounded-md bg-tealSurface text-brandPrimary text-[10px] font-bold">
                            {assignedCls.className}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-amberSurface text-warningState text-[10px] font-bold">
                            Unassigned
                          </span>
                        )}
                      </div>
                      <span className="text-primaryText/60 text-[11px]">
                        Desk Badge #{101 + i} &bull; Starter Pots (2)
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Reset / Change File */}
            <button
              type="button"
              onClick={() => {
                setAuditResult(null);
                setPupilRows([]);
                setCustomCsvText("");
              }}
              className="text-xs font-bold text-primaryText/60 hover:text-primaryText flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Choose a different CSV file</span>
            </button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-borderMuted/60">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-primaryText/60 hover:text-primaryText"
          >
            Cancel
          </button>
          {auditResult && (
            <button
              type="button"
              disabled={isProcessing || unassignedRows.length > 0}
              onClick={handleConfirmEnrollment}
              className={`px-5 py-2.5 rounded-full font-bold text-xs flex items-center gap-1.5 shadow-md transition-all ${
                unassignedRows.length > 0
                  ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                  : "bg-positiveState hover:bg-green-700 text-white scale-[1.02]"
              }`}
            >
              <Check className="w-4 h-4" />
              <span>
                {isProcessing
                  ? "Enrolling..."
                  : unassignedRows.length > 0
                  ? `Assign ${unassignedRows.length} remaining pupils to continue`
                  : `Confirm & Enroll ${pupilRows.length} Pupils Across ${
                      Object.keys(classBreakdown).length || 1
                    } Classes`}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
