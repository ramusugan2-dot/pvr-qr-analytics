import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { CopyButton } from "@/components/copy-button";
import { requireAdmin } from "@/lib/auth";
import { trackingUrl } from "@/lib/env";
import { formatDateTime, formatNumber } from "@/lib/format";
import { positiveInt } from "@/lib/validation";
import { setQrActive, updateQrCode } from "../actions";
import { QrFields } from "../qr-fields";

export const metadata: Metadata = { title: "QR code" };

export default async function QrCodePage(props: PageProps<"/admin/qr-codes/[id]">) {
  const { supabase } = await requireAdmin();
  const id = positiveInt((await props.params).id);
  if (!id) notFound();
  const justCreated = (await props.searchParams).created === "1";

  const [{ data: qr }, { data: campaigns }, { data: locations }, { data: history }, { data: counts }] =
    await Promise.all([
      supabase
        .from("qr_codes")
        .select("id, short_code, campaign_id, location_id, source, destination_url, is_active, created_at, updated_at")
        .eq("id", id)
        .maybeSingle(),
      supabase.from("campaigns").select("id, name").order("name"),
      supabase.from("locations").select("id, name").order("name"),
      supabase
        .from("destination_history")
        .select("id, old_url, new_url, changed_at")
        .eq("qr_code_id", id)
        .order("changed_at", { ascending: false })
        .limit(20),
      supabase.rpc("qr_scan_counts"),
    ]);
  if (!qr) notFound();

  const link = trackingUrl(qr.short_code);
  const scans = (counts ?? []).find((c: { qr_code_id: number }) => c.qr_code_id === qr.id) as
    | { total_scans: number; last_scan_at: string }
    | undefined;
  const campaignName = campaigns?.find((c) => c.id === qr.campaign_id)?.name;
  const locationName = locations?.find((l) => l.id === qr.location_id)?.name;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/qr-codes" className="text-sm text-indigo-600 hover:underline">
          ← All QR codes
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">
          {locationName} · {qr.source}
        </h1>
        <p className="text-slate-500">{campaignName}</p>
      </div>

      {justCreated && (
        <p className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">
          QR code created. Download the PNG below and test it with your phone before printing.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <section className="card text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/api/qr/${qr.id}`} alt={`QR code for ${link}`} className="mx-auto w-64" />
          <a href={`/api/qr/${qr.id}?download=1`} className="btn-primary mt-4 w-full">
            Download PNG
          </a>
          <div className="mt-4 text-left text-sm">
            <p className="font-medium text-slate-700">Tracking link (printed in the QR)</p>
            <p className="mt-1 break-all">
              <code className="text-xs">{link}</code> <CopyButton value={link} />
            </p>
            <p className="mt-3 text-slate-600">
              Scans: <strong>{formatNumber(Number(scans?.total_scans ?? 0))}</strong>
              <br />
              Last scan: {formatDateTime(scans?.last_scan_at)}
              <br />
              Created: {formatDateTime(qr.created_at)}
            </p>
          </div>
        </section>

        <div className="space-y-6">
          <section className="card">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="font-semibold">Status</h2>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  qr.is_active ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-600"
                }`}
              >
                {qr.is_active ? "Active" : "Inactive"}
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-600">
              {qr.is_active
                ? "People who scan are sent to the destination link."
                : "People who scan see an “offer has ended” page. Scans are not counted."}
            </p>
            <ActionForm
              action={setQrActive}
              className="mt-3"
              confirmMessage={
                qr.is_active
                  ? "Switch this QR code off? Everyone who scans it will see the “offer has ended” page."
                  : undefined
              }
            >
              <input type="hidden" name="id" value={qr.id} />
              <input type="hidden" name="active" value={qr.is_active ? "false" : "true"} />
              <button className="btn-secondary">{qr.is_active ? "Switch off" : "Switch on"}</button>
            </ActionForm>
          </section>

          <section className="card">
            <h2 className="mb-1 font-semibold">Details and destination</h2>
            <p className="mb-4 text-sm text-slate-600">
              Changing the destination takes effect on the very next scan. The printed QR code stays the same.
            </p>
            <ActionForm
              action={updateQrCode}
              confirmMessage="Save these changes? Every printed copy of this QR code will use them from the next scan."
            >
              <input type="hidden" name="id" value={qr.id} />
              <QrFields campaigns={campaigns ?? []} locations={locations ?? []} values={qr} />
              <button className="btn-primary mt-4">Save changes</button>
            </ActionForm>
          </section>

          <section className="card">
            <h2 className="mb-3 font-semibold">Destination changes</h2>
            {!history?.length ? (
              <p className="text-sm text-slate-500">The destination has not been changed since it was created.</p>
            ) : (
              <ul className="space-y-3 text-sm">
                {history.map((h) => (
                  <li key={h.id}>
                    <p className="text-slate-500">{formatDateTime(h.changed_at)}</p>
                    <p className="break-all">
                      <span className="text-slate-500">From</span> {h.old_url}
                      <br />
                      <span className="text-slate-500">To</span> {h.new_url}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
