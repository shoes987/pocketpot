/**
 * PocketPot Zero-PII (Personally Identifiable Information) Utilities
 * Adhering strictly to GDPR (UK/EU), COPPA (US), and KS2 Safeguarding Standards.
 */

import { PupilDocument, SavingsPotDocument, PotLedgerEntry, PotAccentTheme } from "./types";

const ANIMALS = [
  "River Otter", "Otter", "Badger", "Falcon", "Hedgehog", "Robin", "Panda", "Fox", "Dolphin",
  "Squirrel", "Owl", "Fawn", "Swift", "Puffin", "Beaver", "Kingfisher", "Starling"
];

const ADJECTIVES = [
  "Calm", "Brave", "Curious", "Sunny", "Swift", "Clever", "Gentle", "Bright",
  "Steadfast", "Thoughtful", "Nimble", "Patient", "Joyful", "Kind", "Steady"
];

/**
 * Known legitimate system attributes that are explicitly permitted.
 */
const ALLOWED_NON_PII_KEYS = new Set([
  "educationalcodename",
  "codename",
  "classname",
  "categorylabel",
  "avatariconkey",
  "deskbadgenumber",
  "localdisplayname",
  "displayname",
  "applicantdisplayname",
  "applicantname",
  "pupildisplayname",
  "pupilcodename",
  "classid",
  "pupilid",
  "teacherid",
  "anonymized",
  "cardlastfour",
  "mainbalancecents",
  "totalsavedcents",
  "activepotscount",
  "title",
  "category",
  "deltacents",
  "transactionid",
  "nonpunitivenote",
  "potnote",
  "note",
  "timestamp",
  "initialopeningbalancecents",
  "weeklybasicincomecents",
  "payoutday",
  "paydayofweek",
  "lastpayouttimestamp",
  "type",
  "jobid",
  "wagecents",
  "termweeks",
  "requiredqualities",
  "cvprompt",
  "status",
  "assignedpupilid",
  "assignedpupilname",
  "termstartdate",
  "termenddate",
  "weekselapsed",
  "reminderoneweeksent",
  "completionremindersent",
  "teacherreference",
  "applicationid",
  "cvstatement",
  "qualitieshighlight",
  "attachedcompletedjobs",
  "reviewedat",
  "submittedat",
  "notificationid",
  "isteachernotification",
  "message",
  "read",
  "completeddate",
  "jobtitle",
  "behaviourid",
  "behaviorid",
  "definition",
  "amountcents",
  "icon",
  "colortheme",
  "iscustom",
  "awardid",
  "behaviourtitle",
  "behaviortitle",
  "pupilids",
  "awardedat",
  "awardscount",
  "totalcentsawarded",
  "description",
  "schoolid",
  "tenantid",
  "schoolname",
  "schoolurn",
  "alloweddomains",
  "maxteacherseats",
  "activeteachercount",
  "pendinginvitecount",
  "inviteid",
  "invitedby",
  "expiresat",
  "role",
  "leadteacherid",
  "assignedteacherids",
  "assignedclassids",
  "pinnumber",
  "createdat",
  "updatedat",
]);

/**
 * Explicit PII field identifiers that violate GDPR/COPPA/KS2 Safeguarding.
 */
const FORBIDDEN_EXACT_PII_KEYS = new Set([
  "name", "realname", "firstname", "first", "lastname", "last",
  "surname", "fullname", "studentname", "pupilname", "childname",
  "username", "legalname", "parentname", "guardianname",
  "email", "emailaddress", "useremail", "mail",
  "phone", "phonenumber", "telephone", "mobile", "mobilenumber",
  "dob", "birthdate", "dateofbirth", "birthday", "date_of_birth",
  "upn", "uniquepupilnumber", "unique_pupil_number", "candidate_number", "admissionnumber",
  "address", "homeaddress", "streetaddress", "postcode", "zipcode", "postalcode",
  "ssn", "nationalinsurance", "ninumber",
  "photo", "face", "facephoto", "selfie",
  "gender", "sex", "ethnicity", "race",
  "ip", "ipaddress"
]);

/**
 * Generates a unique 6-digit Class Join Code (e.g., "749281").
 */
export function generateClassJoinCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Generates a compliant Pupil profile with a fintech bank card identity.
 * No personal information is requested, ingested, or stored on remote servers.
 */
export function createAnonymousPupilProfile(
  classId: string,
  badgeSequenceNumber: number = 1,
  options?: {
    localDisplayName?: string;
    anonymize?: boolean;
    initialBalanceCents?: number;
  }
): PupilDocument {
  const pupilId = crypto.randomUUID();
  const randomAdj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const randomAnimal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  const deskBadgeNumber = 100 + badgeSequenceNumber;
  const cardLastFour = Math.floor(1000 + Math.random() * 9000).toString();
  const pinNumber = Math.floor(1000 + Math.random() * 9000).toString();

  const rawDisplayName = options?.localDisplayName?.trim();
  const hasLocalName = Boolean(rawDisplayName && rawDisplayName.length > 0);
  const anonymize = options?.anonymize !== undefined ? options.anonymize : !hasLocalName;
  const educationalCodename = `${randomAdj} ${randomAnimal} #${deskBadgeNumber}`;
  const effectiveDisplayName = anonymize ? educationalCodename : (hasLocalName ? rawDisplayName : educationalCodename);
  const localDisplayName = anonymize ? undefined : (hasLocalName ? rawDisplayName : undefined);

  const mainBalanceCents =
    options?.initialBalanceCents !== undefined
      ? options.initialBalanceCents
      : 500; // default £5.00 Account Opening Balance

  return {
    pupilId,
    classId,
    educationalCodename,
    displayName: effectiveDisplayName,
    localDisplayName,
    anonymized: anonymize,
    avatarIconKey: `badge-${randomAnimal.toLowerCase()}`,
    deskBadgeNumber,
    cardLastFour,
    pinNumber,
    mainBalanceCents,
    totalSavedCents: 0,
    activePotsCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Creates starter Savings Pots for a newly enrolled pupil based strictly on teacher templates.
 * Numerical starting balance is always 0 minor units to prevent phantom funds.
 */
export function createStarterPots(
  pupilId: string,
  classId: string,
  templatePots?: { title: string; theme?: PotAccentTheme; targetAmountCents?: number; categoryLabel?: string }[]
): SavingsPotDocument[] {
  if (!templatePots || templatePots.length === 0) {
    return [];
  }
  const now = new Date().toISOString();
  return templatePots.map((tp) => ({
    potId: crypto.randomUUID(),
    pupilId,
    classId,
    title: tp.title,
    theme: tp.theme || "calmingTeal",
    targetAmountCents: tp.targetAmountCents || 2000,
    currentAmountCents: 0,
    status: "active",
    categoryLabel: tp.categoryLabel || "General Savings",
    lastInteractionAt: now,
    createdAt: now,
    updatedAt: now,
  }));
}

/**
 * Canonical helper: Resolves the authoritative display name for a pupil.
 * Strictly respects the teacher's selection in the class setup wizard:
 * - If anonymizeNames === true: returns the educational animal codename (e.g. "Swift Teal Falcon #101").
 * - If anonymizeNames === false: returns the child's classroom first name (e.g. "Leo").
 * Guarantees 100% consistency across Teacher, Admin, and Pupil views.
 */
export function getPupilDisplayName(
  pupil?: {
    educationalCodename?: string;
    displayName?: string;
    localDisplayName?: string;
    anonymized?: boolean;
  } | null,
  classDoc?: { anonymizeNames?: boolean } | null
): string {
  if (!pupil) return "Pupil";

  // 1. If pupil explicitly has First Name mode enabled with a valid name, display it
  if (pupil.anonymized === false) {
    const firstName = pupil.displayName || pupil.localDisplayName;
    if (firstName && firstName.trim().length > 0 && firstName !== pupil.educationalCodename) {
      return firstName.trim();
    }
  }

  // 2. Strict Animal Codenames mode (if pupil or class enforces codenames)
  if (pupil.anonymized === true || classDoc?.anonymizeNames === true) {
    return pupil.educationalCodename || "Pupil";
  }

  // 3. Fallback for First Name mode
  const firstName = pupil.displayName || pupil.localDisplayName;
  if (firstName && firstName.trim().length > 0 && firstName !== pupil.educationalCodename) {
    return firstName.trim();
  }

  return pupil.educationalCodename || "Pupil";
}

/**
 * Generates 3 initial starter transactions for the pupil's fintech account.
 */
export function createStarterTransactions(
  pupilId: string,
  classId: string
): PotLedgerEntry[] {
  const now = Date.now();
  return [
    {
      transactionId: crypto.randomUUID(),
      pupilId,
      classId,
      title: "Weekly Class Allowance",
      deltaCents: 500, // +£5.00
      type: "allowance",
      category: "income",
      nonPunitiveNote: "Weekly learning allowance added to your card",
      timestamp: new Date(now - 1000 * 60 * 60 * 24 * 2).toISOString(), // 2 days ago
    },
    {
      transactionId: crypto.randomUUID(),
      pupilId,
      classId,
      title: "Reading Habit Milestone",
      deltaCents: 250, // +£2.50
      type: "reward",
      category: "income",
      nonPunitiveNote: "Earned seeds for reading progress",
      timestamp: new Date(now - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
    },
    {
      transactionId: crypto.randomUUID(),
      pupilId,
      classId,
      title: "Added to Zoo Wildlife Pot",
      deltaCents: -150, // -£1.50
      type: "pot_deposit",
      category: "pots",
      nonPunitiveNote: "Moved seeds from card into Zoo Pot",
      timestamp: new Date(now - 1000 * 60 * 30).toISOString(), // 30 mins ago
    },
  ];
}

/**
 * Validates that an object payload does not contain any forbidden PII keys.
 * Throws a SecurityError if any potential PII is identified.
 */
export function assertZeroPII(data: Record<string, unknown>): void {
  for (const key of Object.keys(data)) {
    const normalizedKey = key.toLowerCase().replace(/[^a-z]/g, "");

    // Allow explicitly whitelisted system properties
    if (ALLOWED_NON_PII_KEYS.has(normalizedKey)) {
      continue;
    }

    // Check exact forbidden key matches
    if (FORBIDDEN_EXACT_PII_KEYS.has(normalizedKey)) {
      throw new Error(
        `Field "${key}" is not permitted under classroom safeguarding rules. (See FAQs for details)`
      );
    }

    // Check if key ends in "name" (e.g. childName, studentName) while not whitelisted
    if (normalizedKey.endsWith("name") && !ALLOWED_NON_PII_KEYS.has(normalizedKey)) {
      throw new Error(
        `Field "${key}" is not permitted under classroom safeguarding rules. (See FAQs for details)`
      );
    }

    const val = data[key];
    if (val && typeof val === "object" && !Array.isArray(val)) {
      assertZeroPII(val as Record<string, unknown>);
    }
  }
}

/**
 * Format currency in GBP format with left-alignment standard.
 * e.g., 1450 pence -> "£14.50"
 */
export function formatCurrency(amountCents: number): string {
  const isNegative = amountCents < 0;
  const absPounds = (Math.abs(amountCents) / 100).toFixed(2);
  return `${isNegative ? "-" : ""}£${absPounds}`;
}
