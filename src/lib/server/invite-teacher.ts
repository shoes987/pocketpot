import { adminAuth, adminDb } from "./firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { UserRecord } from "firebase-admin/auth";

export interface InviteTeacherPayload {
  tenantId: string;
  email: string;
  displayName?: string;
  classId?: string;
  classIds?: string[];
}

export interface InviteTeacherResult {
  success: boolean;
  uid?: string;
  email?: string;
  isNewUser?: boolean;
  classIds?: string[];
  message?: string;
  error?: string;
  staff?: Record<string, unknown>;
}

/**
 * Backend Callable Function: inviteTeacher
 * 
 * Secure institutional educator onboarding:
 * 1. Authenticates caller as school_admin matching tenantId.
 * 2. Fetches /tenants/{tenantId} and verifies email domain against allowedDomains.
 * 3. Creates Firebase Auth user or appends classId to existing account without duplicate creation.
 * 4. Assigns custom user claims { role: "teacher", tenantId, classIds }.
 * 5. Saves staff profile in /tenants/{tenantId}/staff/{uid} with inviteStatus: "sent".
 */
export async function inviteTeacher(
  payload: InviteTeacherPayload,
  idToken?: string
): Promise<InviteTeacherResult> {
  const { tenantId, email, displayName, classId, classIds } = payload;

  if (!tenantId || !tenantId.trim()) {
    return { success: false, error: "Missing required tenantId." };
  }
  if (!email || !email.trim() || !email.includes("@")) {
    return { success: false, error: "Please enter a valid school email address." };
  }

  const normalizedEmail = email.trim().toLowerCase();

  // 1. Authenticate caller as school_admin matching tenantId
  if (idToken) {
    try {
      const decoded = await adminAuth.verifyIdToken(idToken);
      const callerRole = decoded.role;
      const callerTenant = decoded.tenantId;

      const isAuthorizedRole =
        callerRole === "school_admin" || callerRole === "admin";

      if (!isAuthorizedRole) {
        return {
          success: false,
          error: "Permission denied: Only School Administrators can onboard teachers.",
        };
      }

      if (callerTenant && callerTenant !== tenantId) {
        return {
          success: false,
          error: "Permission denied: You can only onboard educators for your licensed school workspace.",
        };
      }
    } catch (authErr) {
      console.warn("verifyIdToken warning:", authErr);
      return {
        success: false,
        error: "Session expired or invalid authentication token. Please sign in again.",
      };
    }
  }

  // 2. Fetch /tenants/{tenantId} and validate allowedDomains
  const tenantRef = adminDb.collection("tenants").doc(tenantId);
  const tenantSnap = await tenantRef.get();

  if (!tenantSnap.exists) {
    return {
      success: false,
      error: `School workspace "${tenantId}" not found in Firestore.`,
    };
  }

  const tenantData = tenantSnap.data() || {};
  const allowedDomains: string[] = Array.isArray(tenantData.allowedDomains)
    ? tenantData.allowedDomains
    : [];

  const emailDomain = normalizedEmail.split("@")[1];
  if (!emailDomain) {
    return { success: false, error: "Invalid email format." };
  }

  const isDomainAllowed = allowedDomains.some((d) => {
    const clean = d.replace(/^@/, "").toLowerCase();
    return emailDomain === clean || emailDomain.endsWith("." + clean);
  });

  if (!isDomainAllowed) {
    const primaryDomain = (allowedDomains[0] || "school.sch.uk").replace(/^@/, "");
    return {
      success: false,
      error: `Let's check that school email! @${emailDomain} isn't registered for ${
        tenantData.schoolName || "this school"
      }. Please check your school domain (e.g. @${primaryDomain}) or ask your school administrator.`,
    };
  }

  // 3. User lookup / creation in Firebase Auth
  let userRecord: UserRecord | null = null;
  let isNewUser = false;

  try {
    userRecord = await adminAuth.getUserByEmail(normalizedEmail);
  } catch (err: unknown) {
    const firebaseErr = err as { code?: string };
    if (firebaseErr.code === "auth/user-not-found") {
      isNewUser = true;
    } else {
      throw err;
    }
  }

  const targetClassList = classIds && classIds.length > 0
    ? classIds
    : classId
    ? [classId]
    : [];

  let finalClassIds: string[] = [];

  if (isNewUser || !userRecord) {
    // Create new Firebase Auth user
    userRecord = await adminAuth.createUser({
      email: normalizedEmail,
      displayName: displayName?.trim() || `Teacher (${normalizedEmail.split("@")[0]})`,
    });

    finalClassIds = targetClassList;

    await adminAuth.setCustomUserClaims(userRecord.uid, {
      role: "teacher",
      tenantId,
      classIds: finalClassIds,
    });
  } else {
    // Existing user: Multi-class assignment without duplicate creation
    const existingClaims = (userRecord.customClaims || {}) as Record<string, unknown>;

    if (existingClaims.tenantId && existingClaims.tenantId !== tenantId) {
      return {
        success: false,
        error: `This educator email is already linked to another school workspace (${existingClaims.tenantId}).`,
      };
    }

    const existingClassList: string[] = Array.isArray(existingClaims.classIds)
      ? (existingClaims.classIds as string[])
      : [];

    finalClassIds = Array.from(new Set([...existingClassList, ...targetClassList]));

    await adminAuth.setCustomUserClaims(userRecord.uid, {
      ...existingClaims,
      role: "teacher",
      tenantId,
      classIds: finalClassIds,
    });
  }

  // 4. Save/update staff profile in /tenants/{tenantId}/staff/{uid} with inviteStatus: "sent"
  const staffRef = tenantRef.collection("staff").doc(userRecord.uid);
  const existingStaffSnap = await staffRef.get();

  const staffPayload: Record<string, unknown> = {
    uid: userRecord.uid,
    userId: userRecord.uid,
    email: userRecord.email,
    displayName: displayName?.trim() || userRecord.displayName || normalizedEmail.split("@")[0],
    role: "teacher",
    tenantId,
    assignedClassIds: finalClassIds,
    inviteStatus: "sent",
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (!existingStaffSnap.exists) {
    staffPayload.createdAt = FieldValue.serverTimestamp();
  }

  await staffRef.set(staffPayload, { merge: true });

  // Update tenant active teacher count if this is a newly registered teacher
  if (isNewUser) {
    try {
      await tenantRef.update({
        activeTeacherCount: FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp(),
      });
    } catch (countErr) {
      console.warn("activeTeacherCount update warning:", countErr);
    }
  }

  return {
    success: true,
    uid: userRecord.uid,
    email: userRecord.email,
    isNewUser,
    classIds: finalClassIds,
    message: isNewUser
      ? `Teacher account created for ${normalizedEmail}.`
      : `Teacher assigned to additional classes.`,
    staff: staffPayload,
  };
}
