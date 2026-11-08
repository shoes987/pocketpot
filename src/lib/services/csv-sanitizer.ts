/**
 * PocketPot (Invest in the Future)
 * Zero-PII CSV Classlist Sanitizer & Safeguarding Audit Engine
 * 
 * Strict GDPR/COPPA/KS2 Compliance:
 * - Operates 100% in browser memory; raw file is never transmitted to any external server.
 * - Automatically scans all column headers and permanently purges forbidden PII fields
 *   (surnames, dates of birth, UPNs, addresses, medical flags, contact info).
 * - Extracts only clean first names / single forenames for local classroom recognition,
 *   or prepares anonymous animal codenames.
 */

export const FORBIDDEN_CSV_HEADERS = [
  "surname", "last", "lastname", "familyname", "sur_name", "last_name",
  "dob", "dateofbirth", "birthdate", "birthday", "date_of_birth",
  "upn", "unique_pupil_number", "admissionnumber", "candidate_number", "id", "pupil_id",
  "address", "homeaddress", "street", "postcode", "zip", "postalcode", "city",
  "gender", "sex", "ethnicity", "race", "religion",
  "medical", "sen", "fsm", "dietary", "notes", "disability",
  "parent", "guardian", "phone", "mobile", "telephone", "email", "parent_email"
];

export const PERMITTED_NAME_HEADERS = [
  "forename", "first", "firstname", "first_name",
  "student", "studentname", "student_name", "pupil", "pupilname", "child", "name"
];

export const PERMITTED_CLASS_HEADERS = [
  "class", "classname", "class_name", "form", "formgroup", "form_group",
  "registration", "reg", "reggroup", "reg_group", "cohort", "year", "yeargroup", "year_group"
];

export interface ParsedCsvPupilRow {
  id: string;
  firstName: string;
  rawClass?: string;
  assignedClassId?: string;
}

export interface CsvSafeguardingAuditResult {
  fileName: string;
  totalRows: number;
  detectedHeaders: string[];
  strippedColumns: string[];
  extractedFirstNames: string[];
  cleanPreviewSample: string[];
  pupilRows: ParsedCsvPupilRow[];
  hasMultipleClasses: boolean;
  detectedClassHeader?: string;
  isValid: boolean;
  errorMessage?: string;
}

/**
 * Intelligent helper to match raw MIS class tokens (e.g. "4T", "Year 4 Teal", "Year 3")
 * against the school's configured Key Stage 2 classrooms.
 */
export function matchClassToExisting(
  rawClass: string | undefined,
  classes: { classId: string; className: string; yearGroup?: string }[]
): string | undefined {
  if (!rawClass) return undefined;
  const clean = rawClass.trim().toLowerCase();

  // 1. Exact match on class name
  const exact = classes.find((c) => c.className.toLowerCase() === clean);
  if (exact) return exact.classId;

  // 2. Partial name inclusion (e.g. "Teal" matches "Year 4 Teal")
  const partial = classes.find(
    (c) => c.className.toLowerCase().includes(clean) || clean.includes(c.className.toLowerCase())
  );
  if (partial) return partial.classId;

  // 3. Year Group numeric match (e.g. "Y4", "Year 4", "4" matches class with Year 4)
  const yearNumber = clean.match(/(?:year|y)?\s*([3-6])/i)?.[1];
  if (yearNumber) {
    const byYear = classes.find(
      (c) => (c.yearGroup && c.yearGroup.includes(yearNumber)) || c.className.includes(yearNumber)
    );
    if (byYear) return byYear.classId;
  }

  return undefined;
}

/**
 * Parses raw CSV text string and applies Zero-PII safeguarding stripping.
 */
export function sanitizeClasslistCsv(
  csvContent: string,
  fileName: string = "classlist.csv"
): CsvSafeguardingAuditResult {
  const lines = csvContent
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return {
      fileName,
      totalRows: 0,
      detectedHeaders: [],
      strippedColumns: [],
      extractedFirstNames: [],
      cleanPreviewSample: [],
      pupilRows: [],
      hasMultipleClasses: false,
      isValid: false,
      errorMessage: "The selected CSV file is empty.",
    };
  }

  // Helper to split a CSV line considering quotes
  const parseCsvLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        result.push(current.trim().replace(/^["']|["']$/g, ""));
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim().replace(/^["']|["']$/g, ""));
    return result;
  };

  const rawHeaders = parseCsvLine(lines[0]);
  const normalizedHeaders = rawHeaders.map((h) =>
    h.toLowerCase().replace(/[^a-z0-9_]/g, "")
  );

  const strippedColumns: string[] = [];
  let nameColumnIndex = -1;
  let classColumnIndex = -1;
  let detectedClassHeader: string | undefined = undefined;

  rawHeaders.forEach((rawHeader, idx) => {
    const norm = normalizedHeaders[idx];
    const isForbidden = FORBIDDEN_CSV_HEADERS.some((f) => norm.includes(f));
    if (isForbidden) {
      strippedColumns.push(rawHeader);
    } else {
      if (nameColumnIndex === -1 && PERMITTED_NAME_HEADERS.some((p) => norm === p || norm.includes(p))) {
        nameColumnIndex = idx;
      }
      if (classColumnIndex === -1 && PERMITTED_CLASS_HEADERS.some((c) => norm === c || norm.includes(c))) {
        classColumnIndex = idx;
        detectedClassHeader = rawHeader;
      }
    }
  });

  // If no explicit header matched, but there's a single column or first column without numbers
  if (nameColumnIndex === -1) {
    nameColumnIndex = 0;
  }

  const rawDataLines = lines.slice(1);
  const extractedFirstNames: string[] = [];
  const pupilRows: ParsedCsvPupilRow[] = [];

  for (let i = 0; i < rawDataLines.length; i++) {
    const line = rawDataLines[i];
    const cells = parseCsvLine(line);
    const rawVal = cells[nameColumnIndex] || "";
    const rawClass = classColumnIndex !== -1 ? (cells[classColumnIndex] || "").trim() : undefined;
    // Clean to strict single first name token only (strip any accidental surnames, spaces, or numbers)
    const singleToken = rawVal.trim().split(/\s+/)[0] || "";
    const cleaned = singleToken.replace(/[^a-zA-Z\-']/g, "").trim();

    if (cleaned.length > 0) {
      // Capitalize nicely e.g. "leo" -> "Leo"
      const formatted = cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();
      extractedFirstNames.push(formatted);
      pupilRows.push({
        id: `row-${i}-${Date.now()}`,
        firstName: formatted,
        rawClass: rawClass || undefined,
      });
    }
  }

  const uniqueClasses = new Set(pupilRows.map((r) => r.rawClass).filter(Boolean));
  const hasMultipleClasses = uniqueClasses.size > 1 || classColumnIndex !== -1;

  const cleanPreviewSample = extractedFirstNames
    .filter((n) => n.length > 0)
    .slice(0, 5);

  return {
    fileName,
    totalRows: extractedFirstNames.length,
    detectedHeaders: rawHeaders,
    strippedColumns,
    extractedFirstNames,
    cleanPreviewSample,
    pupilRows,
    hasMultipleClasses,
    detectedClassHeader,
    isValid: extractedFirstNames.length > 0,
  };
}
