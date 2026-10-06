"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const SERIES = "#2a78d6";
const GRID = "#e5e7eb";
const AXIS_TEXT = "#52514e";

export type Slice = { label: string; value: number };
export type DayPoint = { date: string; value: number };

const tooltipStyle = {
  borderRadius: 8,
  border: "1px solid #e5e7eb",
  fontSize: 13,
  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
};

function Empty() {
  return <p className="py-10 text-center text-sm text-slate-500">No scans for these filters yet.</p>;
}

function dayLabel(date: string) {
  const [, m, d] = date.split("-").map(Number);
  const month = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][m - 1];
  return `${d} ${month}`;
}

/** Fills in days with no scans, so the line does not skip them. */
function withEmptyDays(points: DayPoint[]): DayPoint[] {
  if (points.length < 2) return points;
  const byDate = new Map(points.map((p) => [p.date, p.value]));
  const out: DayPoint[] = [];
  const end = Date.parse(points[points.length - 1].date);
  for (let t = Date.parse(points[0].date); t <= end; t += 86_400_000) {
    const date = new Date(t).toISOString().slice(0, 10);
    out.push({ date, value: byDate.get(date) ?? 0 });
  }
  return out;
}

export function ScansByDateChart({ data }: { data: DayPoint[] }) {
  if (!data.length) return <Empty />;
  const points = withEmptyDays(data);
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={points} margin={{ top: 8, right: 16, bottom: 0, left: -12 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={dayLabel}
          tick={{ fill: AXIS_TEXT, fontSize: 12 }}
          tickLine={false}
          axisLine={{ stroke: GRID }}
          minTickGap={24}
        />
        <YAxis allowDecimals={false} tick={{ fill: AXIS_TEXT, fontSize: 12 }} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={tooltipStyle}
          labelFormatter={(d) => dayLabel(String(d))}
          formatter={(v) => [v, "Scans"]}
          cursor={{ stroke: AXIS_TEXT, strokeDasharray: "3 3" }}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke={SERIES}
          strokeWidth={2}
          dot={points.length <= 31 ? { r: 3, fill: SERIES } : false}
          activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

/** Horizontal bars, largest first, with the count at the end of each bar. */
export function BreakdownChart({ data, name = "Scans" }: { data: Slice[]; name?: string }) {
  if (!data.length) return <Empty />;
  // Show the top 9 and fold the rest into "Other", so the chart stays readable.
  const rows =
    data.length > 10
      ? [...data.slice(0, 9), { label: "Other", value: data.slice(9).reduce((sum, d) => sum + d.value, 0) }]
      : data;
  const height = Math.max(120, rows.length * 36 + 16);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 40, bottom: 4, left: 4 }} barCategoryGap={8}>
        <XAxis type="number" hide allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="label"
          width={160}
          tick={{ fill: AXIS_TEXT, fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: string) => (v.length > 22 ? `${v.slice(0, 21)}…` : v)}
        />
        <Tooltip contentStyle={tooltipStyle} formatter={(v) => [v, name]} cursor={{ fill: "#f1f5f9" }} />
        <Bar dataKey="value" fill={SERIES} radius={[0, 4, 4, 0]} maxBarSize={22}>
          <LabelList dataKey="value" position="right" fill="#0b0b0b" fontSize={12} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
