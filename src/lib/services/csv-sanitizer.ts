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

  // A genuine CSV header row MUST contain a known name header (e.g. "Forename", "Student") 
  // or sensitive PII columns to strip (e.g. "Surname", "DOB", "UPN").
  const hasHeaderRow = strippedColumns.length > 0 || nameColumnIndex !== -1;

  if (hasHeaderRow && nameColumnIndex === -1) {
    nameColumnIndex = 0;
  }

  const extractedFirstNames: string[] = [];
  const pupilRows: ParsedCsvPupilRow[] = [];

  const addPupil = (rawVal: string, rawClass?: string) => {
    const singleToken = rawVal.trim().split(/\s+/)[0] || "";
    const cleaned = singleToken.replace(/[^a-zA-Z\-']/g, "").trim();
    if (cleaned.length > 0) {
      const formatted = cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();
      extractedFirstNames.push(formatted);
      pupilRows.push({
        id: `row-${pupilRows.length}-${Date.now()}`,
        firstName: formatted,
        rawClass: rawClass || undefined,
      });
    }
  };

  if (hasHeaderRow) {
    // Process standard CSV data lines after the header
    const rawDataLines = lines.slice(1);
    for (let i = 0; i < rawDataLines.length; i++) {
      const cells = parseCsvLine(rawDataLines[i]);
      const rawVal = cells[nameColumnIndex] || "";
      const rawClass = classColumnIndex !== -1 ? (cells[classColumnIndex] || "").trim() : undefined;
      addPupil(rawVal, rawClass);
    }
  } else {
    // No header detected: lines contain raw student names (e.g. pasted or typed)
    for (let i = 0; i < lines.length; i++) {
      const cells = parseCsvLine(lines[i]);
      if (cells.length === 2) {
        // Check if second cell looks like a classroom/year (e.g. "Lucas, Year 3" or "Chloe, 4T")
        const secondCell = cells[1].trim();
        const isClassLike = /(?:year|y|class|form|group|[0-9])/i.test(secondCell);
        if (isClassLike) {
          addPupil(cells[0], secondCell);
        } else {
          // Comma-separated list of names (e.g. "Lucas, Chloe")
          addPupil(cells[0]);
          addPupil(cells[1]);
        }
      } else if (cells.length > 2) {
        // Multiple comma-separated names on a line (e.g. "Lucas, Chloe, Ethan, Freya")
        for (const cell of cells) {
          addPupil(cell);
        }
      } else if (cells.length === 1) {
        // Single name per line
        addPupil(cells[0]);
      }
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
