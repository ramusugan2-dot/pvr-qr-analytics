import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { CopyButton } from "@/components/copy-button";
import { requireAdmin } from "@/lib/auth";
import { trackingUrl } from "@/lib/env";
import { formatDate, formatNumber } from "@/lib/format";
import { positiveInt } from "@/lib/validation";
import { createQrCode } from "./actions";
import { QrFields } from "./qr-fields";

export const metadata: Metadata = { title: "QR codes" };

type QrRow = {
  id: number;
  short_code: string;
  source: string;
  destination_url: string;
  is_active: boolean;
  created_at: string;
  campaigns: { name: string } | null;
  locations: { name: string } | null;
};

export default async function QrCodesPage(props: PageProps<"/admin/qr-codes">) {
  const { supabase } = await requireAdmin();
  const searchParams = await props.searchParams;
  const campaignId = positiveInt(searchParams.campaign as string | undefined);
  const locationId = positiveInt(searchParams.location as string | undefined);

  let query = supabase
    .from("qr_codes")
    .select(
      "id, short_code, source, destination_url, is_active, created_at, campaigns(name), locations(name)",
    )
    .order("created_at", { ascending: false });
  if (campaignId) query = query.eq("campaign_id", campaignId);
  if (locationId) query = query.eq("location_id", locationId);

  const [{ data: qrCodes, error }, { data: campaigns }, { data: locations }, { data: counts }] =
    await Promise.all([
      query,
      supabase.from("campaigns").select("id, name").order("name"),
      supabase.from("locations").select("id, name").order("name"),
      supabase.rpc("qr_scan_counts"),
    ]);

  const scanCount = new Map<number, number>(
    (counts ?? []).map((c: { qr_code_id: number; total_scans: number }) => [c.qr_code_id, Number(c.total_scans)]),
  );
  const canCreate = (campaigns?.length ?? 0) > 0 && (locations?.length ?? 0) > 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">QR codes</h1>

      <section className="card">
        <h2 className="mb-4 font-semibold">Create a QR code</h2>
        {canCreate ? (
          <ActionForm action={createQrCode}>
            <QrFields campaigns={campaigns ?? []} locations={locations ?? []} />
            <button className="btn-primary mt-4">Create QR code</button>
          </ActionForm>
        ) : (
          <p className="text-sm text-slate-600">
            First add at least one <Link href="/admin/campaigns" className="text-indigo-600 underline">campaign</Link>{" "}
            and one <Link href="/admin/locations" className="text-indigo-600 underline">PVR location</Link>.
          </p>
        )}
      </section>

      <section className="card">
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <h2 className="mr-auto font-semibold">All QR codes</h2>
          <form className="flex flex-wrap items-end gap-2">
            <select name="campaign" defaultValue={campaignId ?? ""} className="input w-auto">
              <option value="">All campaigns</option>
              {campaigns?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select name="location" defaultValue={locationId ?? ""} className="input w-auto">
              <option value="">All locations</option>
              {locations?.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
            <button className="btn-secondary">Filter</button>
          </form>
        </div>

        {error && <p className="text-sm text-red-600">Could not load QR codes.</p>}
        {qrCodes?.length === 0 && <p className="text-sm text-slate-500">No QR codes yet.</p>}
        {!!qrCodes?.length && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead>
                <tr>
                  <th className="table-head">Location</th>
                  <th className="table-head">Campaign</th>
                  <th className="table-head">Source</th>
                  <th className="table-head">Tracking link</th>
                  <th className="table-head">Status</th>
                  <th className="table-head">Created</th>
                  <th className="table-head text-right">Scans</th>
                  <th className="table-head"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(qrCodes as unknown as QrRow[]).map((qr) => (
                  <tr key={qr.id}>
                    <td className="table-cell font-medium">{qr.locations?.name}</td>
                    <td className="table-cell">{qr.campaigns?.name}</td>
                    <td className="table-cell">{qr.source}</td>
                    <td className="table-cell whitespace-nowrap">
                      <code className="text-xs">/r/{qr.short_code}</code>{" "}
                      <CopyButton value={trackingUrl(qr.short_code)} />
                    </td>
                    <td className="table-cell">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          qr.is_active ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {qr.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="table-cell whitespace-nowrap">{formatDate(qr.created_at)}</td>
                    <td className="table-cell text-right">{formatNumber(scanCount.get(qr.id) ?? 0)}</td>
                    <td className="table-cell whitespace-nowrap text-right">
                      <a href={`/api/qr/${qr.id}?download=1`} className="mr-3 text-indigo-600 hover:underline">
                        PNG
                      </a>
                      <Link href={`/admin/qr-codes/${qr.id}`} className="text-indigo-600 hover:underline">
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
