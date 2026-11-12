/**
 * PocketPot (Invest in the Future)
 * Firebase Firestore Schema & Zero-PII Data Definitions (GDPR / COPPA Compliant)
 * 
 * Strict Guidelines:
 * - Terminology: All savings containers must be styled and referred to strictly as "Pots" or "Savings Pots" (never "jars" or "piggy banks").
 * - Pupil documents contain zero real names, emails, birthdates, or phone numbers.
 * - Pupils are identified solely by UUID v4 and educational codenames (e.g., "Calm River Otter #101").
 * - Main balance is tracked for the child's fintech card account, while savings pots are isolated subcollections.
 */

export type UserRole = "admin" | "teacher" | "pupil" | "unassigned";

/**
 * Path: /tenants/{tenantId}
 * School tenant configuration document enforcing strict email domain whitelisting,
 * teacher seat quotas, and multi-tenant boundary isolation.
 */
export interface TenantDocument {
  tenantId: string;            // e.g. "sch_urn100123"
  schoolName: string;          // e.g. "St Mary's Primary"
  schoolUrn: string;           // UK DfE Unique Reference Number, e.g. "100123"
  allowedDomains: string[];    // Whitelisted institutional email domains, e.g. ["st-marys.sch.uk"]
  maxTeacherSeats?: number;    // Unlimited educator accounts by default (legacy optional field)
  status: "Production Live" | "Onboarding" | "Suspended";
  activeTeacherCount?: number;
  pendingInviteCount?: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Path: /tenants/{tenantId}/invites/{inviteId}
 * Cryptographically managed staff invitation document.
 */
export interface TeacherInviteDocument {
  inviteId: string;
  tenantId: string;            // Bound to school tenant (e.g. "sch_urn100123")
  email: string;               // Institutional teacher email (must match allowedDomains)
  role: "teacher";
  assignedClassIds: string[];  // Pre-assigned KS2 classes
  invitedBy: string;           // Admin UID who issued invite
  status: "pending" | "accepted" | "revoked" | "expired";
  expiresAt: string;           // ISO timestamp (typically 7 days from creation)
  createdAt: string;
  updatedAt: string;
}

/**
 * Path: /users/{userId}
 * Base authentication and role mapping index.
 */
export interface UserDocument {
  userId: string;              // Firebase Auth UID or Pupil UUID v4
  role: UserRole;              // Strictly enforced: 'admin' | 'teacher' | 'pupil'
  email?: string;              // School educator email (Staff only)
  displayName?: string;        // Staff title, e.g. "Mrs Henderson (Headteacher)"
  tenantId?: string;           // Multi-tenant school reference (e.g. "sch_urn100123")
  schoolId?: string;           // School reference (legacy alias for tenantId)
  assignedClassIds?: string[]; // Permitted classes (teachers have list, admins have ['*'])
  classId?: string;            // Mandatory educational group reference for pupils
  createdAt: string;           // ISO 8601 or Firebase ServerTimestamp
  updatedAt: string;
}

/**
 * Path: /classes/{classId}
 * Teacher-managed classroom container with aggregate statistics and 6-digit Join Code.
 */
export interface ClassDocument {
  classId: string;
  className: string;           // Unique name, e.g. "Year 4 Teal", "Year 5 Willow"
  tenantId?: string;           // Multi-tenant school reference
  schoolId?: string;           // School reference
  teacherId: string;           // References /users/{teacherId} (legacy / primary lead)
  leadTeacherId?: string;      // Primary Lead Teacher UID
  assignedTeacherIds?: string[];// List of teacher UIDs permitted to view/manage this class
  classJoinCode: string;       // Unique 6-digit join code, e.g. "749281"
  joinCode?: string;           // Convenient alias for classJoinCode
  yearGroup: "Year 3" | "Year 4" | "Year 5" | "Year 6"; // KS2
  pupilCount: number;
  initialOpeningBalanceCents?: number; // Opening deposit given upon account creation (e.g. 500 = £5.00)
  weeklyBasicIncomeCents?: number;     // Minimum basic income weekly payout (e.g. 200 = £2.00)
  payoutDay?: "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday"; // Weekly payout day
  lastPayoutTimestamp?: string;       // ISO timestamp when weekly basic income was last distributed
  aggregateMetrics: {
    totalPotsActive: number;
    totalSavingsCents: number; // Stored in minor currency units (pennies/cents)
    pausedPotsCount: number;
  };
  createdAt: string;
  updatedAt: string;
}

export type PotAccentTheme = "calmingTeal" | "warmAmber" | "sageGreen";
export type PotStatus = "active" | "taking_a_pause" | "goal_reached";

/**
 * Path: /classes/{classId}/pupils/{pupilId} or /pupils/{pupilId}
 * Pupil identity & fintech account record. Zero PII allowed on cloud servers.
 */
export interface PupilDocument {
  pupilId: string;             // Cryptographically generated UUID v4 (ZERO PII)
  classId: string;             // Belongs to classroom
  educationalCodename: string; // e.g. "Swift Teal Badger #104", "Calm River Otter #101"
  localDisplayName?: string;   // Local-only first name (stored strictly on local device)
  anonymized?: boolean;        // Whether the teacher selected full anonymization
  avatarIconKey: string;       // e.g. "badge-otter", "badge-falcon"
  deskBadgeNumber: number;     // Random identifier (e.g. 101, 102) for classroom handout
  cardLastFour: string;        // Last 4 digits of pupil's bank card, e.g. "4821"
  pinNumber?: string;          // 4-digit login & debit card PIN (e.g. "4821")
  mainBalanceCents: number;    // Available card balance (e.g. 1550 = £15.50)
  totalSavedCents: number;     // Total allocated across pots (e.g. 2650 = £26.50)
  activePotsCount: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Path: /classes/{classId}/pupils/{pupilId}/pots/{potId}
 * Savings Pot physical container document.
 * Numerical amounts stored in integers (pennies/pence) to prevent floating-point drift.
 */
export interface SavingsPotDocument {
  potId: string;
  pupilId: string;             // Parent pupil UUID v4
  classId: string;
  title: string;               // e.g. "School Adventure Trip Pot", "Zoo Wildlife Pot"
  theme: PotAccentTheme;       // "calmingTeal" (#0D9488) or "warmAmber" (#D97706)
  targetAmountCents: number;   // E.g., 2000 = £20.00
  currentAmountCents: number;  // E.g., 1450 = £14.50
  status: PotStatus;           // Uses non-punitive status "taking_a_pause"
  pauseReflectionNote?: string;// Non-punitive contextual message
  potNote?: string;            // Simple, direct note inside pot card
  categoryLabel: string;       // e.g. "School Adventures", "Curious Reader"
  lastInteractionAt: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Path: /classes/{classId}/pupils/{pupilId}/transactions/{transactionId}
 * Pupil ledger subcollection for card activity and pot transfers.
 */
export interface PotLedgerEntry {
  transactionId: string;
  potId?: string;
  pupilId: string;
  classId: string;
  title: string;               // e.g. "Weekly Class Allowance", "Transfer to Zoo Pot"
  deltaCents: number;          // Positive for inflows/rewards, negative for outflows
  type: "allowance" | "pot_deposit" | "pot_withdraw" | "reward" | "opening_balance" | "basic_income" | "job_wage" | "bonus" | "marketplace_purchase" | "marketplace_refund";
  category: "income" | "pots" | "spend";
  nonPunitiveNote: string;     // e.g. "Moved 50p seeds into Zoo Pot"
  timestamp: string;
}

/**
 * ----------------------------------------------------
 * INSTANT REWARDS: BONUSES & BEHAVIOURS (Zero-PII)
 * ----------------------------------------------------
 */
export interface PositiveBehaviourDocument {
  behaviourId: string;
  classId?: string;
  title: string;               // e.g. "Kind Helper", "Great Focus"
  definition: string;          // 1-2 word definition e.g. "Kindness", "Focus", "Teamwork"
  amountCents: number;         // minor units (e.g. 10 = 10p, 20 = 20p)
  icon: string;                // e.g. "🤝", "🎯", "⭐", "🧹", "💡", "🌱"
  colorTheme?: "calmingTeal" | "warmAmber" | "sageGreen" | "electricIndigo";
  isCustom?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BonusAwardDocument {
  awardId: string;
  classId: string;
  behaviourId: string;
  behaviourTitle: string;
  definition: string;
  amountCents: number;
  pupilIds: string[];
  awardedAt: string;
}

/**
 * ----------------------------------------------------
 * JOBS BOARD TYPES & SAFELISTS (Zero-PII Compliant)
 * ----------------------------------------------------
 */

export type JobStatus = "open" | "filled" | "completed" | "archived";

export interface JobPostingDocument {
  jobId: string;
  classId: string;
  teacherId: string;
  title: string;               // e.g. "Classroom Librarian", "Plant Monitor"
  description: string;         // Outline of role written by teacher
  wageCents: number;           // e.g. 150 = £1.50 per week
  termWeeks: number;           // Duration of the job in weeks (e.g. 2, 3, 4, 6)
  requiredQualities: string[]; // e.g. ["Reliable", "Organised", "Caring"]
  cvPrompt?: string;           // Guidance prompt for child's CV statement
  status: JobStatus;           // "open" | "filled" | "completed" | "archived"
  assignedPupilId?: string;    // Pupil currently hired
  assignedPupilName?: string;  // Local first name or animal codename
  termStartDate?: string;      // ISO timestamp when assignment began
  termEndDate?: string;        // ISO timestamp when term finishes
  weeksElapsed?: number;       // Number of weeks completed so far
  reminderOneWeekSent?: boolean;// Reminder sent 1 week before end
  completionReminderSent?: boolean; // Term finish reminder sent
  teacherReference?: string;   // Reference sentence written upon term completion
  createdAt: string;
  updatedAt: string;
}

export type ApplicationStatus = "pending" | "accepted" | "rejected";

export interface CompletedJobRecord {
  jobId: string;
  title: string;
  termWeeks: number;
  completedDate: string;
  teacherReference: string;
}

export interface JobApplicationDocument {
  applicationId: string;
  jobId: string;
  classId: string;
  pupilId: string;
  applicantDisplayName: string; // Zero-PII pseudonymous identifier (educational codename or desk alias)
  pupilCodename: string;
  cvStatement: string;         // Child's simple written text why they are suitable
  qualitiesHighlight: string[];// Qualities child highlights
  attachedCompletedJobs: CompletedJobRecord[]; // Prior completed jobs & references
  status: ApplicationStatus;
  reviewedAt?: string;
  submittedAt: string;
}

export type NotificationType =
  | "job_application_submitted"
  | "job_hired"
  | "job_encouragement_rejection"
  | "job_term_one_week_reminder"
  | "job_term_completed"
  | "reference_received";

export interface PupilNotificationDocument {
  notificationId: string;
  pupilId?: string;            // Targeted pupil (or undefined for teacher notifications)
  classId: string;
  isTeacherNotification?: boolean; // Appears on teacher top bar bell icon
  title: string;
  message: string;
  type: NotificationType;
  jobId?: string;
  jobTitle?: string;
  read: boolean;
  createdAt: string;
}

/**
 * ----------------------------------------------------
 * CLASSROOM MARKETPLACE & REWARDS (Zero-PII Compliant)
 * ----------------------------------------------------
 */

export type RewardTier = "short_term" | "long_term";

export interface MarketplaceRewardDocument {
  rewardId: string;
  classId: string;
  title: string;                 // e.g. 'Move to the front of the line for a week', 'Choose your own desk'
  description: string;           // Child-friendly description of privilege
  priceCoins: number;            // Cost in PocketCoins (1 PocketCoin = 1p / 1 cent)
  icon: string;                  // Emoji representation (e.g. 🚀, 🪑, 🎵)
  tier: RewardTier;              // "short_term" (quick win) vs "long_term" (delayed gratification)
  stockQuantity?: number;        // Optional inventory limit per term/week (null/undefined = unlimited)
  purchasesCount: number;        // Total times redeemed
  isAvailable: boolean;          // Teacher availability toggle
  createdAt: string;
  updatedAt: string;
}

export type PurchaseOrderStatus = "pending" | "fulfilled" | "refunded";

export interface MarketplacePurchaseDocument {
  purchaseId: string;
  rewardId: string;
  rewardTitle: string;
  rewardIcon: string;
  priceCoins: number;
  classId: string;
  pupilId: string;               // Anonymous UUID v4
  pupilCodename: string;         // e.g. "Calm River Otter #101"
  status: PurchaseOrderStatus;   // "pending" | "fulfilled" | "refunded"
  purchasedAt: string;           // ISO timestamp
  fulfilledAt?: string;
  refundedAt?: string;
  refundReason?: string;
}

