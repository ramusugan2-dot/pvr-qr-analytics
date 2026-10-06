import { NextResponse, type NextRequest } from "next/server";
import { getAdmin } from "@/lib/auth";
import { readFilters, rpcArgs } from "@/lib/filters";
import { todayIst } from "@/lib/format";

const PAGE_SIZE = 1000;

const COLUMNS = [
  "Scan date and time (IST)",
  "PVR / location",
  "Campaign",
  "Source",
  "QR short code",
  "Country",
  "State / region",
  "City",
  "Device",
  "Operating system",
  "Browser",
  "Anonymous visitor tag",
] as const;

type Row = {
  scanned_at: string;
  location_name: string;
  campaign_name: string;
  source: string;
  short_code: string;
  country: string | null;
  region: string | null;
  city: string | null;
  device_type: string;
  os: string | null;
  browser: string | null;
  visitor_id: string | null;
};

const istFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kolkata",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

function istDateTime(value: string) {
  return istFormat.format(new Date(value)).replace(",", "");
}

/** Quotes a value for CSV, and stops spreadsheet apps treating it as a formula. */
function cell(value: string | null | undefined): string {
  let s = value ?? "";
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Every scan matching the dashboard filters, as a CSV file. */
export async function GET(request: NextRequest) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Not allowed" }, { status: 403 });

  const filters = readFilters(request.nextUrl.searchParams);
  const lines: string[] = [COLUMNS.join(",")];

  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await admin.supabase
      .rpc("filtered_scans", rpcArgs(filters))
      .order("scanned_at", { ascending: true })
      .order("scan_id", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) {
      console.error("CSV export failed", error);
      return NextResponse.json({ error: "Export failed. Please try again." }, { status: 500 });
    }
    for (const r of (data ?? []) as Row[]) {
      lines.push(
        [
          istDateTime(r.scanned_at),
          r.location_name,
          r.campaign_name,
          r.source,
          r.short_code,
          r.country,
          r.region,
          r.city,
          r.device_type,
          r.os,
          r.browser,
          r.visitor_id,
        ]
          .map(cell)
          .join(","),
      );
    }
    if (!data || data.length < PAGE_SIZE) break;
  }

  // The leading ﻿ tells Excel the file is UTF-8, so city names show correctly.
  return new NextResponse(`﻿${lines.join("\r\n")}\r\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="pvr-qr-scans-${todayIst()}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
