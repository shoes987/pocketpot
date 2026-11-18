import { NextRequest, NextResponse } from "next/server";
import {
  getTenant,
  getTenantInvites,
  validateTeacherEmailDomain,
  inviteAndProvisionTeacher,
  inviteAndProvisionTeachersBatch,
  parseBulkEmails,
  DEFAULT_TENANT_ID,
} from "@/lib/services/tenant-service";
import { inviteTeacher } from "@/lib/server/invite-teacher";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const tenantId = resolvedParams?.tenantId;

    let body: {
      bulkText?: unknown;
      emails?: unknown;
      invites?: unknown;
      assignedClassIds?: unknown;
      invitedBy?: unknown;
      email?: unknown;
      displayName?: unknown;
    };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON request body." },
        { status: 400 }
      );
    }

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "A valid JSON object payload is required." },
        { status: 400 }
      );
    }

    const tenant = getTenant(tenantId || DEFAULT_TENANT_ID);
    if (!tenant) {
      return NextResponse.json(
        { error: `Tenant workspace ${tenantId} not found.` },
        { status: 404 }
      );
    }

    // 1. Support Batch Mode (Multiple emails or raw text paste)
    if (body.bulkText || Array.isArray(body.emails) || Array.isArray(body.invites)) {
      let emails: string[] = [];
      if (body.bulkText && typeof body.bulkText === "string") {
        emails = parseBulkEmails(body.bulkText);
      } else if (Array.isArray(body.emails)) {
        emails = body.emails.map((e: unknown) => (typeof e === "string" ? e.trim().toLowerCase() : "")).filter(Boolean);
      } else if (Array.isArray(body.invites)) {
        emails = body.invites
          .map((inv: unknown) => (inv && typeof inv === "object" && "email" in inv && typeof (inv as { email: unknown }).email === "string" ? (inv as { email: string }).email.trim().toLowerCase() : ""))
          .filter(Boolean);
      }

      if (emails.length === 0) {
        return NextResponse.json(
          { error: "No valid email addresses found in bulk payload." },
          { status: 400 }
        );
      }

      const assignedClassIds = Array.isArray(body.assignedClassIds)
        ? body.assignedClassIds.filter((id): id is string => typeof id === "string")
        : [];
      const invitedBy = typeof body.invitedBy === "string" ? body.invitedBy : "staff-admin-head";

      const entries = emails.map((email) => ({
        email,
        displayName: `Teacher (${email.split("@")[0]})`,
        assignedClassIds,
      }));

      const batchResult = inviteAndProvisionTeachersBatch(entries, invitedBy, tenant.tenantId);

      return NextResponse.json(
        {
          success: true,
          message: `Processed ${batchResult.totalProcessed} staff accounts: ${batchResult.successful.length} onboarded, ${batchResult.failed.length} skipped.`,
          batchResult,
        },
        { status: 201 }
      );
    }

    // 2. Single Teacher Invite Mode
    const { email, displayName, assignedClassIds, invitedBy } = body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { error: "A valid teacher email address is required." },
        { status: 400 }
      );
    }

    // Strict Server-Side Domain Whitelisting Validation
    const domainValidation = validateTeacherEmailDomain(email, tenant.tenantId);
    if (!domainValidation.isWhitelisted) {
      return NextResponse.json(
        {
          error: domainValidation.friendlyError,
          domain: domainValidation.domain,
          allowedDomains: domainValidation.allowedDomains,
        },
        { status: 400 }
      );
    }

    // Execute Teacher Provisioning & Invite Creation (Unlimited Capacity)
    const result = inviteAndProvisionTeacher(
      {
        email,
        displayName: typeof displayName === "string" ? displayName : `Teacher (${email.split("@")[0]})`,
        assignedClassIds: Array.isArray(assignedClassIds)
          ? assignedClassIds.filter((id): id is string => typeof id === "string")
          : [],
        invitedBy: typeof invitedBy === "string" ? invitedBy : "staff-admin-head",
      },
      tenant.tenantId
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.errorMessage },
        { status: 400 }
      );
    }

    // Provision Firebase Auth user, claims, and /tenants/{tenantId}/staff/{uid} profile
    const authHeader = req.headers.get("authorization") || "";
    const idToken = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : undefined;

    try {
      await inviteTeacher(
        {
          tenantId: tenant.tenantId,
          email,
          displayName: typeof displayName === "string" ? displayName : undefined,
          classIds: Array.isArray(assignedClassIds)
            ? assignedClassIds.filter((id): id is string => typeof id === "string")
            : [],
        },
        idToken
      );
    } catch (backendErr) {
      console.warn("Backend inviteTeacher execution note:", backendErr);
    }

    return NextResponse.json(
      {
        success: true,
        message: `Teacher account spun up successfully for ${email}.`,
        invite: result.invite,
        teacher: result.createdTeacher,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error during teacher provisioning.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const tenantId = resolvedParams?.tenantId || DEFAULT_TENANT_ID;
    const tenant = getTenant(tenantId);
    if (!tenant) {
      return NextResponse.json(
        { error: `Tenant workspace ${tenantId} not found.` },
        { status: 404 }
      );
    }
    const invites = getTenantInvites(tenant.tenantId);
    return NextResponse.json({ success: true, tenant, invites });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to retrieve tenant info.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
