import QRCode from "qrcode";
import { NextResponse, type NextRequest } from "next/server";
import { getAdmin } from "@/lib/auth";
import { trackingUrl } from "@/lib/env";
import { positiveInt } from "@/lib/validation";

/**
 * The QR image for one code, as a PNG. Add ?download=1 to save it as a file.
 * The image only contains the tracking link, so it never needs reprinting.
 */
export async function GET(request: NextRequest, ctx: RouteContext<"/api/qr/[id]">) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Not allowed" }, { status: 403 });

  const id = positiveInt((await ctx.params).id);
  if (!id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: qr } = await admin.supabase
    .from("qr_codes")
    .select("short_code, source, locations(name)")
    .eq("id", id)
    .maybeSingle();
  if (!qr) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const png = await QRCode.toBuffer(trackingUrl(qr.short_code), {
    type: "png",
    width: 1024,
    margin: 4,
    errorCorrectionLevel: "M",
  });

  const headers: Record<string, string> = {
    "Content-Type": "image/png",
    "Cache-Control": "private, no-store",
  };
  if (request.nextUrl.searchParams.get("download")) {
    const location = (qr.locations as unknown as { name: string } | null)?.name ?? "location";
    const label = `${location}-${qr.source}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const fileName = `qr-${label}-${qr.short_code}`;
    headers["Content-Disposition"] = `attachment; filename="${fileName}.png"`;
  }

  return new NextResponse(new Uint8Array(png), { headers });
}
