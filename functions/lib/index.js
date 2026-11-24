"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.scheduledPayout = exports.inviteTeacher = void 0;
exports.getISOWeekString = getISOWeekString;
const https_1 = require("firebase-functions/v2/https");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const logger = __importStar(require("firebase-functions/logger"));
const app_1 = require("firebase-admin/app");
const auth_1 = require("firebase-admin/auth");
const firestore_1 = require("firebase-admin/firestore");
if ((0, app_1.getApps)().length === 0) {
    (0, app_1.initializeApp)();
}
const db = (0, firestore_1.getFirestore)();
const auth = (0, auth_1.getAuth)();
const FORBIDDEN_CONSUMER_DOMAINS = [
    "gmail.com",
    "googlemail.com",
    "yahoo.com",
    "yahoo.co.uk",
    "hotmail.com",
    "hotmail.co.uk",
    "outlook.com",
    "live.com",
    "msn.com",
    "icloud.com",
    "me.com",
    "mac.com",
    "aol.com",
    "proton.me",
    "protonmail.com",
];
/**
 * Callable HTTPS Function: inviteTeacher
 *
 * Validates allowedDomains on /tenants/{tenantId}, creates or updates
 * the teacher user with { role: "teacher", tenantId, classIds } custom claims,
 * and writes /tenants/{tenantId}/staff/{uid}.
 */
exports.inviteTeacher = (0, https_1.onCall)({ cors: true }, async (request) => {
    // 1. Authenticate caller
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Authentication required to onboard educators.");
    }
    const callerRole = request.auth.token?.role;
    const callerTenant = request.auth.token?.tenantId;
    if (callerRole !== "school_admin" && callerRole !== "admin") {
        throw new https_1.HttpsError("permission-denied", "Permission denied: Only School Administrators can onboard teachers.");
    }
    const { tenantId, email, displayName, classId, classIds } = request.data || {};
    if (!tenantId || typeof tenantId !== "string" || !tenantId.trim()) {
        throw new https_1.HttpsError("invalid-argument", "Missing required tenantId.");
    }
    if (callerTenant && callerTenant !== tenantId && callerRole !== "admin") {
        throw new https_1.HttpsError("permission-denied", "Permission denied: You can only onboard educators for your licensed school workspace.");
    }
    if (!email || typeof email !== "string" || !email.trim() || !email.includes("@")) {
        throw new https_1.HttpsError("invalid-argument", "Please enter a valid school email address.");
    }
    const normalizedEmail = email.trim().toLowerCase();
    const emailDomain = normalizedEmail.split("@")[1];
    if (!emailDomain) {
        throw new https_1.HttpsError("invalid-argument", "Invalid email format.");
    }
    // 2. Fetch /tenants/{tenantId} and validate allowedDomains
    const tenantRef = db.collection("tenants").doc(tenantId);
    const tenantSnap = await tenantRef.get();
    if (!tenantSnap.exists) {
        throw new https_1.HttpsError("not-found", `School workspace "${tenantId}" not found in Firestore.`);
    }
    const tenantData = tenantSnap.data() || {};
    const allowedDomains = Array.isArray(tenantData.allowedDomains)
        ? tenantData.allowedDomains
        : [];
    if (FORBIDDEN_CONSUMER_DOMAINS.includes(emailDomain)) {
        const primaryDomain = (allowedDomains[0] || "school.sch.uk").replace(/^@/, "");
        throw new https_1.HttpsError("invalid-argument", `Personal email addresses (@${emailDomain}) cannot be used for classroom teacher accounts. Please use your school's registered email address (e.g. @${primaryDomain}) to join this workspace.`);
    }
    const isDomainAllowed = allowedDomains.some((d) => {
        const clean = d.replace(/^@/, "").toLowerCase();
        return (emailDomain === clean ||
            emailDomain.endsWith("." + clean) ||
            emailDomain.startsWith(clean + "."));
    });
    if (!isDomainAllowed) {
        const primaryDomain = (allowedDomains[0] || "school.sch.uk").replace(/^@/, "");
        throw new https_1.HttpsError("failed-precondition", `Let's check that school email! @${emailDomain} isn't registered for ${tenantData.schoolName || "this school"}. Please check your school domain (e.g. @${primaryDomain}) or ask your school administrator.`);
    }
    // 3. User lookup or creation in Firebase Auth
    let userRecord = null;
    let isNewUser = false;
    try {
        userRecord = await auth.getUserByEmail(normalizedEmail);
    }
    catch (err) {
        if (err.code === "auth/user-not-found") {
            isNewUser = true;
        }
        else {
            throw new https_1.HttpsError("internal", `User lookup error: ${err.message}`);
        }
    }
    const targetClassList = Array.isArray(classIds) && classIds.length > 0
        ? classIds
        : classId
            ? [classId]
            : [];
    let finalClassIds = [];
    if (isNewUser || !userRecord) {
        userRecord = await auth.createUser({
            email: normalizedEmail,
            displayName: displayName?.trim() || `Teacher (${normalizedEmail.split("@")[0]})`,
        });
        finalClassIds = targetClassList;
        await auth.setCustomUserClaims(userRecord.uid, {
            role: "teacher",
            tenantId,
            classIds: finalClassIds,
        });
    }
    else {
        const existingClaims = (userRecord.customClaims || {});
        if (existingClaims.tenantId && existingClaims.tenantId !== tenantId) {
            throw new https_1.HttpsError("already-exists", `This educator email is already linked to another school workspace (${existingClaims.tenantId}).`);
        }
        const existingClassList = Array.isArray(existingClaims.classIds)
            ? existingClaims.classIds
            : [];
        finalClassIds = Array.from(new Set([...existingClassList, ...targetClassList]));
        await auth.setCustomUserClaims(userRecord.uid, {
            ...existingClaims,
            role: "teacher",
            tenantId,
            classIds: finalClassIds,
        });
    }
    // 4. Save/update staff profile in /tenants/{tenantId}/staff/{uid}
    const staffRef = tenantRef.collection("staff").doc(userRecord.uid);
    const existingStaffSnap = await staffRef.get();
    const staffPayload = {
        uid: userRecord.uid,
        userId: userRecord.uid,
        email: userRecord.email,
        displayName: displayName?.trim() || userRecord.displayName || normalizedEmail.split("@")[0],
        role: "teacher",
        tenantId,
        assignedClassIds: finalClassIds,
        inviteStatus: "sent",
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    };
    if (!existingStaffSnap.exists) {
        staffPayload.createdAt = firestore_1.FieldValue.serverTimestamp();
    }
    await staffRef.set(staffPayload, { merge: true });
    if (isNewUser) {
        try {
            await tenantRef.update({
                activeTeacherCount: firestore_1.FieldValue.increment(1),
                updatedAt: firestore_1.FieldValue.serverTimestamp(),
            });
        }
        catch (countErr) {
            logger.warn("activeTeacherCount increment warning:", countErr);
        }
    }
    return {
        success: true,
        uid: userRecord.uid,
        email: userRecord.email || normalizedEmail,
        isNewUser,
        classIds: finalClassIds,
        message: isNewUser
            ? `Teacher account created for ${normalizedEmail}.`
            : `Teacher assigned to additional classes.`,
        staff: staffPayload,
    };
});
/**
 * Returns current ISO week identifier (e.g. "2026-W47")
 */
function getISOWeekString(date = new Date()) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}
/**
 * Scheduled Cloud Function v2: scheduledPayout
 *
 * Runs Monday to Friday at 08:00 Europe/London time ("0 8 * * 1-5").
 * Inspects active /classes, matches today's weekday against paydayOfWeek (or payoutDay),
 * and idempotently credits weekly basic income allowances with an ISO-week idempotency check.
 * Strictly adheres to UK KS2 Zero-PII requirements (no pupil names or emails queried/logged).
 */
exports.scheduledPayout = (0, scheduler_1.onSchedule)({
    schedule: "0 8 * * 1-5",
    timeZone: "Europe/London",
    retryCount: 3,
    memory: "256MiB",
}, async (event) => {
    const now = new Date();
    const currentISOWeek = getISOWeekString(now);
    const timestamp = now.toISOString();
    const currentDayName = now.toLocaleDateString("en-GB", {
        weekday: "long",
        timeZone: "Europe/London",
    }); // e.g. "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"
    logger.info("Executing scheduledPayout cron", {
        currentDayName,
        currentISOWeek,
        timestamp,
        scheduleTime: event.scheduleTime,
    });
    const classesSnap = await db.collection("classes").get();
    if (classesSnap.empty) {
        logger.info("No classes found in Firestore.");
        return;
    }
    let classesPaidCount = 0;
    let totalPupilsCredited = 0;
    let totalCentsDistributed = 0;
    for (const classDoc of classesSnap.docs) {
        const clsData = classDoc.data() || {};
        const classId = classDoc.id;
        // Skip inactive or archived classes
        if (clsData.status === "archived" || clsData.archived === true) {
            continue;
        }
        const weeklyAmountCents = clsData.weeklyBasicIncomeCents ?? 0;
        if (weeklyAmountCents <= 0) {
            continue;
        }
        // Check payday: paydayOfWeek with fallback to payoutDay (default Monday)
        const scheduledDay = clsData.paydayOfWeek || clsData.payoutDay || "Monday";
        if (scheduledDay.toLowerCase() !== currentDayName.toLowerCase()) {
            continue;
        }
        // ISO-week idempotency check on class
        if (clsData.lastPayoutWeek === currentISOWeek) {
            logger.info(`Class ${classId} already paid for week ${currentISOWeek}. Skipping.`);
            continue;
        }
        if (clsData.lastPayoutTimestamp) {
            const lastPaidDate = new Date(clsData.lastPayoutTimestamp);
            if (!isNaN(lastPaidDate.getTime()) && getISOWeekString(lastPaidDate) === currentISOWeek) {
                logger.info(`Class ${classId} already paid for week ${currentISOWeek} (timestamp check). Skipping.`);
                continue;
            }
        }
        // Query pupils belonging to this class (Zero-PII)
        const pupilsSnap = await db.collection("pupils").where("classId", "==", classId).get();
        if (pupilsSnap.empty) {
            // Still update class lastPayoutWeek to avoid repeating
            await classDoc.ref.update({
                lastPayoutTimestamp: timestamp,
                lastPayoutWeek: currentISOWeek,
                updatedAt: timestamp,
            });
            continue;
        }
        // Process pupils in Firestore batch writes (batches of up to 400 operations)
        const BATCH_SIZE = 400;
        let batch = db.batch();
        let operationCount = 0;
        let pupilsCreditedInClass = 0;
        for (const pupilDoc of pupilsSnap.docs) {
            const pupilId = pupilDoc.id;
            const basicIncomeTxId = `basic_income_${classId}_${pupilId}_${currentISOWeek}`;
            const txRef = db.collection("transactions").doc(basicIncomeTxId);
            // Check if transaction already exists for idempotency
            const txDoc = await txRef.get();
            if (txDoc.exists) {
                continue;
            }
            // 1. Increment pupil balance
            batch.update(pupilDoc.ref, {
                mainBalanceCents: firestore_1.FieldValue.increment(weeklyAmountCents),
                updatedAt: timestamp,
            });
            operationCount++;
            // 2. Deterministic ledger transaction
            batch.set(txRef, {
                transactionId: basicIncomeTxId,
                pupilId,
                classId,
                title: "Minimum Basic Income",
                deltaCents: weeklyAmountCents,
                type: "basic_income",
                category: "income",
                nonPunitiveNote: `Automated weekly basic income credited on ${scheduledDay}`,
                timestamp,
            }, { merge: true });
            operationCount++;
            // 3. Notification for pupil desk
            const notifId = `notif_payout_${classId}_${pupilId}_${currentISOWeek}`;
            const notifRef = db.collection("notifications").doc(notifId);
            batch.set(notifRef, {
                notificationId: notifId,
                pupilId,
                classId,
                isTeacherNotification: false,
                title: `🪙 Weekly Basic Income: +£${(weeklyAmountCents / 100).toFixed(2)}`,
                message: `Your weekly basic income of £${(weeklyAmountCents / 100).toFixed(2)} has arrived in your card balance!`,
                type: "allowance",
                amountCents: weeklyAmountCents,
                read: false,
                createdAt: timestamp,
            }, { merge: true });
            operationCount++;
            pupilsCreditedInClass++;
            if (operationCount >= BATCH_SIZE) {
                await batch.commit();
                batch = db.batch();
                operationCount = 0;
            }
        }
        // 4. Update class lastPayout timestamp and week
        batch.update(classDoc.ref, {
            lastPayoutTimestamp: timestamp,
            lastPayoutWeek: currentISOWeek,
            updatedAt: timestamp,
        });
        operationCount++;
        if (operationCount > 0) {
            await batch.commit();
        }
        classesPaidCount++;
        totalPupilsCredited += pupilsCreditedInClass;
        totalCentsDistributed += pupilsCreditedInClass * weeklyAmountCents;
    }
    logger.info("scheduledPayout completed", {
        classesPaidCount,
        totalPupilsCredited,
        totalCentsDistributed,
    });
});
//# sourceMappingURL=index.js.map