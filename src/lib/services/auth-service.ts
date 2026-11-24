/**
 * PocketPot (Invest in the Future)
 * Staff Authentication & Role-Based Access Control (RBAC) Service
 * 
 * Strict Safeguarding:
 * - Admin level inherits full teacher capabilities and manages class-to-teacher assignments.
 * - Teacher level is strictly scoped to their assigned classroom(s).
 * - Zero PII of KS2 children is ever associated with staff profiles.
 */

import { UserDocument, UserRole } from "../firebase/types";
import {
  safeLocalStorageSetItem,
  safeLocalStorageGetItem,
} from "./storage-helper";

const STORAGE_KEY_STAFF_USERS = "pocketpot_staff_users_v1";
const STORAGE_KEY_CURRENT_STAFF_ID = "pocketpot_current_staff_id_v1";

export const DEFAULT_STAFF_USERS: UserDocument[] = [
  {
    userId: "F4desFyEszSuSHvZpnZv5cSD1Hf1",
    email: "shaun.pocketpot@gmail.com",
    displayName: "Admin",
    role: "admin",
    tenantId: "sch_local_pilot",
    schoolId: "sch_local_pilot",
    assignedClassIds: ["*"], // Global visibility across all classes
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    userId: "b5qdSySAWSOvnhYCdf8OLTDZFFo1",
    email: "shaun.hughes@gbshp.org",
    displayName: "Mr Hughes",
    role: "teacher",
    tenantId: "sch_local_pilot",
    schoolId: "sch_local_pilot",
    assignedClassIds: [], // Strictly 0 classes assigned until allocated by admin
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// Server-side in-memory staff storage for Node.js server runtime
let serverStaffUsers: UserDocument[] = [...DEFAULT_STAFF_USERS];

/**
 * Retrieve all registered staff members for the school.
 */
export function getStaffUsers(): UserDocument[] {
  if (typeof window === "undefined") return [...serverStaffUsers];
  const stored = safeLocalStorageGetItem(STORAGE_KEY_STAFF_USERS);
  if (stored) {
    try {
      const parsed: UserDocument[] = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Auto-purge legacy mock staff containing "Henderson" or stmarys placeholder domain
        const hasLegacy = parsed.some(
          (u) =>
            u.displayName?.includes("Henderson") ||
            u.email?.includes("stmarys-primary") ||
            u.email?.includes("oak-lead") ||
            u.displayName?.includes("Mr Davis")
        );
        if (hasLegacy) {
          saveStaffUsers(DEFAULT_STAFF_USERS);
          return DEFAULT_STAFF_USERS;
        }
        return parsed;
      }
    } catch {
      // Fallback
    }
  }
  saveStaffUsers(DEFAULT_STAFF_USERS);
  return DEFAULT_STAFF_USERS;
}

/**
 * Persist staff users list.
 */
export function saveStaffUsers(users: UserDocument[]): void {
  if (typeof window === "undefined") {
    serverStaffUsers = [...users];
    return;
  }
  safeLocalStorageSetItem(STORAGE_KEY_STAFF_USERS, JSON.stringify(users));
}

/**
 * Get the currently authenticated educator session.
 * Defaults to the Admin account if none chosen.
 */
export function getCurrentStaffUser(): UserDocument {
  const staff = getStaffUsers();
  if (typeof window === "undefined") return staff[0];

  const currentId = safeLocalStorageGetItem(STORAGE_KEY_CURRENT_STAFF_ID);
  if (currentId) {
    const found = staff.find((u) => u.userId === currentId);
    if (found) return found;
  }

  // Default to Admin Headteacher
  setCurrentStaffUser(staff[0].userId);
  return staff[0];
}

/**
 * Set the currently active staff session.
 */
export function setCurrentStaffUser(userId: string): UserDocument {
  const staff = getStaffUsers();
  const target = staff.find((u) => u.userId === userId) || staff[0];
  if (typeof window !== "undefined") {
    safeLocalStorageSetItem(STORAGE_KEY_CURRENT_STAFF_ID, target.userId);
  }
  return target;
}

/**
 * Determine if a user has Admin privileges.
 */
export function isUserAdmin(user?: UserDocument): boolean {
  if (!user) return false;
  return user.role === "admin";
}

/**
 * Retrieve teachers only (strictly role === "teacher").
 */
export function getTeachersOnly(): UserDocument[] {
  return getStaffUsers().filter((u) => u.role === "teacher");
}

/**
 * Get current teacher user session, strictly scoped to role === "teacher".
 * Never permits admin elevation.
 */
export function getCurrentTeacherUser(): UserDocument {
  const teachers = getTeachersOnly();
  if (typeof window === "undefined") return teachers[0];

  const currentId = safeLocalStorageGetItem("pocketpot_current_teacher_id_v1");
  if (currentId) {
    const found = teachers.find((u) => u.userId === currentId);
    if (found) return found;
  }

  return teachers[0];
}

/**
 * Set current teacher user session (strictly scoped to teacher accounts).
 */
export function setCurrentTeacherUser(userId: string): UserDocument {
  const teachers = getTeachersOnly();
  const target = teachers.find((u) => u.userId === userId) || teachers[0];
  if (typeof window !== "undefined") {
    safeLocalStorageSetItem("pocketpot_current_teacher_id_v1", target.userId);
  }
  return target;
}

/**
 * Verify whether an educator has permission to access a specific class.
 */
export function canUserAccessClass(user: UserDocument, classId: string): boolean {
  if (isUserAdmin(user)) return true;
  if (!user.assignedClassIds || user.assignedClassIds.length === 0) return false;
  return user.assignedClassIds.includes(classId) || user.assignedClassIds.includes("*");
}

/**
 * Assign classes to a teacher account (Admin action).
 */
export function assignClassesToTeacher(teacherId: string, classIds: string[]): UserDocument {
  const staff = getStaffUsers();
  const idx = staff.findIndex((u) => u.userId === teacherId);
  if (idx === -1) throw new Error("Teacher account not found");

  const updated: UserDocument = {
    ...staff[idx],
    assignedClassIds: classIds,
    updatedAt: new Date().toISOString(),
  };

  staff[idx] = updated;
  saveStaffUsers(staff);
  return updated;
}

/**
 * Create a new staff account (Admin action).
 */
export function createStaffUser(payload: {
  displayName: string;
  email: string;
  role: UserRole;
  assignedClassIds: string[];
}): UserDocument {
  const staff = getStaffUsers();
  const newUser: UserDocument = {
    userId: `staff-${payload.role}-${crypto.randomUUID().slice(0, 6)}`,
    displayName: payload.displayName.trim(),
    email: payload.email.trim().toLowerCase(),
    role: payload.role,
    tenantId: "sch_local_pilot",
    schoolId: "sch_local_pilot",
    assignedClassIds: payload.assignedClassIds,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  saveStaffUsers([...staff, newUser]);
  return newUser;
}

/**
 * Update a staff account's role, classes, or details (Admin action).
 */
export function updateStaffUser(
  userId: string,
  updates: Partial<Omit<UserDocument, "userId" | "schoolId" | "createdAt">>
): UserDocument {
  const staff = getStaffUsers();
  const idx = staff.findIndex((u) => u.userId === userId);
  if (idx === -1) throw new Error("Staff member not found");

  const updated: UserDocument = {
    ...staff[idx],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  staff[idx] = updated;
  saveStaffUsers(staff);
  return updated;
}

/**
 * Remove a staff member from the school roster.
 */
export function deleteStaffUser(userId: string): void {
  const staff = getStaffUsers();
  const filtered = staff.filter((u) => u.userId !== userId);
  saveStaffUsers(filtered);
}
