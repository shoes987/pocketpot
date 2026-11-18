import { NextRequest, NextResponse } from "next/server";
import { inviteTeacher, InviteTeacherPayload } from "@/lib/server/invite-teacher";

export async function POST(req: NextRequest) {
  try {
    let body: InviteTeacherPayload;
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

    // Extract Bearer token from Authorization header if present
    const authHeader = req.headers.get("authorization") || "";
    const idToken = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : undefined;

    const result = await inviteTeacher(body, idToken);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to onboard educator." },
        { status: 400 }
      );
    }

    return NextResponse.json(result, { status: 201 });
  } catch (err: unknown) {
    console.error("POST /api/invite-teacher error:", err);
    const message = err instanceof Error ? err.message : "Internal server error during teacher invite.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
