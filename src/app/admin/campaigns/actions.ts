"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/components/action-form";
import { requireAdmin } from "@/lib/auth";
import { friendlyDbError } from "@/lib/db-errors";
import { isoDate, optionalText, positiveInt, text } from "@/lib/validation";

function campaignFields(formData: FormData) {
  return {
    name: text(formData.get("name")),
    description: optionalText(formData.get("description")),
    start_date: isoDate(formData.get("start_date")),
    end_date: isoDate(formData.get("end_date")),
  };
}

function checkFields(fields: ReturnType<typeof campaignFields>): string | null {
  if (!fields.name) return "Please enter a campaign name.";
  if (fields.start_date && fields.end_date && fields.end_date < fields.start_date) {
    return "The end date must be on or after the start date.";
  }
  return null;
}

export async function createCampaign(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const fields = campaignFields(formData);
  const problem = checkFields(fields);
  if (problem) return { error: problem };

  const { error } = await supabase.from("campaigns").insert(fields);
  if (error) return { error: friendlyDbError(error, "campaign") };

  revalidatePath("/admin", "layout");
  return { ok: `Added "${fields.name}".` };
}

export async function updateCampaign(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const id = positiveInt(formData.get("id"));
  const fields = campaignFields(formData);
  const problem = id ? checkFields(fields) : "Missing campaign.";
  if (problem) return { error: problem };

  const { error } = await supabase.from("campaigns").update(fields).eq("id", id);
  if (error) return { error: friendlyDbError(error, "campaign") };

  revalidatePath("/admin", "layout");
  return { ok: "Saved." };
}

export async function deleteCampaign(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const id = positiveInt(formData.get("id"));
  if (!id) return { error: "Missing campaign." };

  const { error } = await supabase.from("campaigns").delete().eq("id", id);
  if (error) return { error: friendlyDbError(error, "campaign") };

  revalidatePath("/admin", "layout");
  return { ok: "Deleted." };
}
