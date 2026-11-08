import { NextRequest, NextResponse } from "next/server";
import {
  getTenant,
  validateTeacherEmailDomain,
  inviteAndProvisionTeacher,
  inviteAndProvisionTeachersBatch,
  parseBulkEmails,
  DEFAULT_TENANT_ID,
} from "@/lib/services/tenant-service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;
    const body = await req.json();

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
        emails = body.emails.map((e: string) => e.trim().toLowerCase());
      } else if (Array.isArray(body.invites)) {
        emails = body.invites.map((inv: { email: string }) => inv.email.trim().toLowerCase());
      }

      if (emails.length === 0) {
        return NextResponse.json(
          { error: "No valid email addresses found in bulk payload." },
          { status: 400 }
        );
      }

      const assignedClassIds = Array.isArray(body.assignedClassIds) ? body.assignedClassIds : [];
      const invitedBy = body.invitedBy || "staff-admin-head";

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

    if (!email || typeof email !== "string") {
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
        displayName: displayName || `Teacher (${email.split("@")[0]})`,
        assignedClassIds: Array.isArray(assignedClassIds) ? assignedClassIds : [],
        invitedBy: invitedBy || "staff-admin-head",
      },
      tenant.tenantId
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.errorMessage },
        { status: 400 }
      );
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
    const { tenantId } = await params;
    const tenant = getTenant(tenantId || DEFAULT_TENANT_ID);
    return NextResponse.json({ tenant });
  } catch (err: unknown) {
    return NextResponse.json({ error: "Failed to retrieve tenant info." }, { status: 500 });
  }
}
