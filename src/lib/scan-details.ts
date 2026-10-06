import { UAParser } from "ua-parser-js";
import { Bots, Crawlers, Fetchers } from "ua-parser-js/extensions";
import { isBot } from "ua-parser-js/helpers";

export type DeviceType = "mobile" | "tablet" | "desktop" | "unknown";

export interface ScanDetails {
  country: string | null;
  region: string | null;
  city: string | null;
  device_type: DeviceType;
  os: string | null;
  browser: string | null;
  is_bot: boolean;
}

// Vercel sends Indian states as ISO 3166-2 codes; show readable names instead.
const INDIAN_STATES: Record<string, string> = {
  AN: "Andaman and Nicobar Islands",
  AP: "Andhra Pradesh",
  AR: "Arunachal Pradesh",
  AS: "Assam",
  BR: "Bihar",
  CH: "Chandigarh",
  CT: "Chhattisgarh",
  CG: "Chhattisgarh",
  DH: "Dadra and Nagar Haveli and Daman and Diu",
  DN: "Dadra and Nagar Haveli and Daman and Diu",
  DD: "Dadra and Nagar Haveli and Daman and Diu",
  DL: "Delhi",
  GA: "Goa",
  GJ: "Gujarat",
  HP: "Himachal Pradesh",
  HR: "Haryana",
  JH: "Jharkhand",
  JK: "Jammu and Kashmir",
  KA: "Karnataka",
  KL: "Kerala",
  LA: "Ladakh",
  LD: "Lakshadweep",
  MH: "Maharashtra",
  ML: "Meghalaya",
  MN: "Manipur",
  MP: "Madhya Pradesh",
  MZ: "Mizoram",
  NL: "Nagaland",
  OR: "Odisha",
  OD: "Odisha",
  PB: "Punjab",
  PY: "Puducherry",
  RJ: "Rajasthan",
  SK: "Sikkim",
  TG: "Telangana",
  TS: "Telangana",
  TN: "Tamil Nadu",
  TR: "Tripura",
  UP: "Uttar Pradesh",
  UK: "Uttarakhand",
  UT: "Uttarakhand",
  WB: "West Bengal",
};

// Lets the parser recognise robots and link-preview fetchers (WhatsApp, Facebook, Google).
const BOT_EXTENSIONS = [Bots, Crawlers, Fetchers] as unknown as typeof Bots;

function header(headers: Headers, name: string): string | null {
  const raw = headers.get(name);
  if (!raw) return null;
  try {
    return decodeURIComponent(raw).trim() || null;
  } catch {
    return raw.trim() || null;
  }
}

/** Approximate location from the headers Vercel adds to every request. */
export function locationFromHeaders(headers: Headers) {
  const country = header(headers, "x-vercel-ip-country");
  const regionCode = header(headers, "x-vercel-ip-country-region");
  const region =
    regionCode && country === "IN"
      ? (INDIAN_STATES[regionCode.toUpperCase()] ?? regionCode)
      : regionCode;
  return { country, region, city: header(headers, "x-vercel-ip-city") };
}

/** Device type, operating system, browser and robot check from the user agent. */
export function deviceFromUserAgent(userAgent: string) {
  if (!userAgent) {
    return { device_type: "unknown" as const, os: null, browser: null, is_bot: true };
  }

  const result = new UAParser(userAgent, BOT_EXTENSIONS).getResult();
  const bot = isBot(result);
  const os = result.os.name ?? null;
  const browser = result.browser.name?.replace(/^Mobile /, "") ?? null;

  let device_type: DeviceType;
  if (result.device.type === "mobile") device_type = "mobile";
  else if (result.device.type === "tablet") device_type = "tablet";
  else if (!result.device.type && os && !bot) device_type = "desktop";
  else device_type = "unknown";

  return { device_type, os, browser, is_bot: bot };
}

export function scanDetails(headers: Headers): ScanDetails {
  return {
    ...locationFromHeaders(headers),
    ...deviceFromUserAgent(headers.get("user-agent") ?? ""),
  };
}
