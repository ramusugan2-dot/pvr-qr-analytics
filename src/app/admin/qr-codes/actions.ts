"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionResult } from "@/components/action-form";
import { requireAdmin } from "@/lib/auth";
import { friendlyDbError } from "@/lib/db-errors";
import { generateShortCode } from "@/lib/short-code";
import { cleanDestinationUrl, positiveInt, text } from "@/lib/validation";

const BAD_URL = "The destination must be a full web address starting with https://";

function qrFields(formData: FormData) {
  return {
    campaign_id: positiveInt(formData.get("campaign_id")),
    location_id: positiveInt(formData.get("location_id")),
    source: text(formData.get("source")),
    destination_url: cleanDestinationUrl(formData.get("destination_url")),
  };
}

function checkFields(f: ReturnType<typeof qrFields>): string | null {
  if (!f.campaign_id) return "Please choose a campaign.";
  if (!f.location_id) return "Please choose a PVR location.";
  if (!f.source) return "Please say where this QR code is placed (the source).";
  if (!f.destination_url) return BAD_URL;
  return null;
}

export async function createQrCode(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const fields = qrFields(formData);
  const problem = checkFields(fields);
  if (problem) return { error: problem };

  // A new random code; try again in the rare case it is already taken.
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await supabase
      .from("qr_codes")
      .insert({ ...fields, short_code: generateShortCode() })
      .select("id")
      .single();
    if (!error) {
      revalidatePath("/admin", "layout");
      redirect(`/admin/qr-codes/${data.id}?created=1`);
    }
    if (error.code !== "23505") return { error: friendlyDbError(error, "QR code") };
  }
  return { error: "Could not create a unique code. Please try again." };
}

export async function updateQrCode(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const id = positiveInt(formData.get("id"));
  const fields = qrFields(formData);
  const problem = id ? checkFields(fields) : "Missing QR code.";
  if (problem) return { error: problem };

  const { error } = await supabase.from("qr_codes").update(fields).eq("id", id);
  if (error) return { error: friendlyDbError(error, "QR code") };

  revalidatePath("/admin", "layout");
  return { ok: "Saved. The next scan will use these details." };
}

export async function setQrActive(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const id = positiveInt(formData.get("id"));
  const active = formData.get("active") === "true";
  if (!id) return { error: "Missing QR code." };

  const { error } = await supabase.from("qr_codes").update({ is_active: active }).eq("id", id);
  if (error) return { error: friendlyDbError(error, "QR code") };

  revalidatePath("/admin", "layout");
  return { ok: active ? "Switched on. Scans now go to the destination." : "Switched off. Scans now show the “offer has ended” page." };
}
