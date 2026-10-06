import { isoDate, positiveInt } from "@/lib/validation";

export type ScanFilters = {
  from: string | null;
  to: string | null;
  location: number | null;
  campaign: number | null;
};

type Params = Record<string, string | string[] | undefined> | URLSearchParams;

function get(params: Params, key: string): string | undefined {
  if (params instanceof URLSearchParams) return params.get(key) ?? undefined;
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

export function readFilters(params: Params): ScanFilters {
  return {
    from: isoDate(get(params, "from")),
    to: isoDate(get(params, "to")),
    location: positiveInt(get(params, "location")),
    campaign: positiveInt(get(params, "campaign")),
  };
}

/** Arguments for the dashboard_stats and filtered_scans database functions. */
export function rpcArgs(f: ScanFilters) {
  return {
    p_from: f.from,
    p_to: f.to,
    p_location_id: f.location,
    p_campaign_id: f.campaign,
  };
}

export function filterQuery(f: ScanFilters) {
  const q = new URLSearchParams();
  if (f.from) q.set("from", f.from);
  if (f.to) q.set("to", f.to);
  if (f.location) q.set("location", String(f.location));
  if (f.campaign) q.set("campaign", String(f.campaign));
  return q.toString();
}
