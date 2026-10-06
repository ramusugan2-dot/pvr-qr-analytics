import { randomUUID } from "node:crypto";
import { after, NextResponse, type NextRequest } from "next/server";
import { scanDetails } from "@/lib/scan-details";
import { createServiceClient } from "@/lib/supabase/service";

const VISITOR_COOKIE = "pvr_vid";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NO_STORE = { "Cache-Control": "no-store, max-age=0" };

/**
 * The link inside every printed QR code: /r/<short code>.
 * Looks up the code, records the scan, then sends the phone to the
 * destination link. The destination is read fresh on every scan, so it can be
 * changed at any time without reprinting.
 */
export async function GET(request: NextRequest, ctx: RouteContext<"/r/[code]">) {
  const { code } = await ctx.params;
  const unavailable = () =>
    NextResponse.redirect(new URL("/unavailable", request.url), {
      status: 302,
      headers: NO_STORE,
    });

  if (!/^[A-Za-z0-9]{4,32}$/.test(code)) return unavailable();

  const supabase = createServiceClient();
  const { data: qr, error } = await supabase
    .from("qr_codes")
    .select("id, destination_url, is_active")
    .eq("short_code", code)
    .maybeSingle();

  if (error) console.error("QR lookup failed", { code, error: error.message });
  if (!qr || !qr.is_active) return unavailable();

  const existingVisitor = request.cookies.get(VISITOR_COOKIE)?.value;
  const visitorId =
    existingVisitor && UUID_RE.test(existingVisitor) ? existingVisitor : randomUUID();
  const details = scanDetails(request.headers);

  // Save the scan after the redirect is sent, so the person never waits for it.
  // If saving fails, they still reach the destination.
  after(async () => {
    const { error: insertError } = await supabase.from("scans").insert({
      qr_code_id: qr.id,
      visitor_id: visitorId,
      ...details,
    });
    if (insertError) {
      console.error("Saving scan failed", { code, error: insertError.message });
    }
  });

  // 302 (temporary) so phones never remember an old destination.
  const response = NextResponse.redirect(qr.destination_url, {
    status: 302,
    headers: NO_STORE,
  });
  if (visitorId !== existingVisitor) {
    response.cookies.set(VISITOR_COOKIE, visitorId, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/r",
      maxAge: 60 * 60 * 24 * 400,
    });
  }
  return response;
}
