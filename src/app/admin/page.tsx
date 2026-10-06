import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { filterQuery, readFilters, rpcArgs } from "@/lib/filters";
import { formatNumber, todayIst } from "@/lib/format";
import { BreakdownChart, ScansByDateChart, type DayPoint, type Slice } from "./charts";

export const metadata: Metadata = { title: "Dashboard" };

type Stats = {
  total_scans: number;
  unique_scans: number;
  scans_today: number;
  by_location: Slice[];
  by_date: DayPoint[];
  by_device: Slice[];
  by_os: Slice[];
  by_browser: Slice[];
};

const DEVICE_NAMES: Record<string, string> = {
  mobile: "Mobile",
  tablet: "Tablet",
  desktop: "Desktop",
  unknown: "Unknown",
};

function StatTile({ label, value, note }: { label: string; value: number; note?: string }) {
  return (
    <div className="card">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-semibold tabular-nums">{formatNumber(value)}</p>
      {note && <p className="mt-1 text-xs text-slate-500">{note}</p>}
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card">
      <h2 className="mb-3 font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export default async function DashboardPage(props: PageProps<"/admin">) {
  const { supabase } = await requireAdmin();
  const filters = readFilters(await props.searchParams);

  const [{ data, error }, { data: campaigns }, { data: locations }] = await Promise.all([
    supabase.rpc("dashboard_stats", rpcArgs(filters)),
    supabase.from("campaigns").select("id, name").order("name"),
    supabase.from("locations").select("id, name").order("name"),
  ]);
  const stats = data as Stats | null;
  const query = filterQuery(filters);
  const filtered = query.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <h1 className="mr-auto text-2xl font-semibold">Dashboard</h1>
        <a href={`/api/export${query ? `?${query}` : ""}`} className="btn-secondary">
          Download CSV
        </a>
      </div>

      <form className="card flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="text-xs font-medium text-slate-600">From</span>
          <input type="date" name="from" defaultValue={filters.from ?? ""} max={todayIst()} className="input mt-1" />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-slate-600">To</span>
          <input type="date" name="to" defaultValue={filters.to ?? ""} max={todayIst()} className="input mt-1" />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-slate-600">PVR / location</span>
          <select name="location" defaultValue={filters.location ?? ""} className="input mt-1">
            <option value="">All locations</option>
            {locations?.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-medium text-slate-600">Campaign</span>
          <select name="campaign" defaultValue={filters.campaign ?? ""} className="input mt-1">
            <option value="">All campaigns</option>
            {campaigns?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <button className="btn-primary">Apply</button>
        {filtered && (
          <Link href="/admin" className="btn-secondary">
            Clear
          </Link>
        )}
      </form>

      {error || !stats ? (
        <p className="card text-sm text-red-600">Could not load the numbers. Please refresh the page.</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatTile label="Total scans" value={stats.total_scans} />
            <StatTile label="Unique scans" value={stats.unique_scans} note="Different phones" />
            <StatTile label="Scans today" value={stats.scans_today} note="India time" />
          </div>

          <ChartCard title="Scans by date">
            <ScansByDateChart data={stats.by_date} />
          </ChartCard>

          <div className="grid gap-6 lg:grid-cols-2">
            <ChartCard title="Scans by PVR / location">
              <BreakdownChart data={stats.by_location} />
            </ChartCard>
            <ChartCard title="Device type">
              <BreakdownChart
                data={stats.by_device.map((d) => ({ ...d, label: DEVICE_NAMES[d.label] ?? d.label }))}
              />
            </ChartCard>
            <ChartCard title="Operating system">
              <BreakdownChart data={stats.by_os} />
            </ChartCard>
            <ChartCard title="Browser">
              <BreakdownChart data={stats.by_browser} />
            </ChartCard>
          </div>

          <p className="text-xs text-slate-500">
            Robot visits (such as WhatsApp link previews) are not counted. Dates use India Standard Time.
          </p>
        </>
      )}
    </div>
  );
}
