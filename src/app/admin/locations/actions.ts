"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/components/action-form";
import { requireAdmin } from "@/lib/auth";
import { friendlyDbError } from "@/lib/db-errors";
import { optionalText, positiveInt, text } from "@/lib/validation";

function locationFields(formData: FormData) {
  return { name: text(formData.get("name")), city: optionalText(formData.get("city")) };
}

export async function createLocation(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const fields = locationFields(formData);
  if (!fields.name) return { error: "Please enter the PVR / location name." };

  const { error } = await supabase.from("locations").insert(fields);
  if (error) return { error: friendlyDbError(error, "location") };

  revalidatePath("/admin", "layout");
  return { ok: `Added "${fields.name}".` };
}

export async function updateLocation(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const id = positiveInt(formData.get("id"));
  const fields = locationFields(formData);
  if (!id) return { error: "Missing location." };
  if (!fields.name) return { error: "Please enter the PVR / location name." };

  const { error } = await supabase.from("locations").update(fields).eq("id", id);
  if (error) return { error: friendlyDbError(error, "location") };

  revalidatePath("/admin", "layout");
  return { ok: "Saved." };
}

export async function deleteLocation(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const id = positiveInt(formData.get("id"));
  if (!id) return { error: "Missing location." };

  const { error } = await supabase.from("locations").delete().eq("id", id);
  if (error) return { error: friendlyDbError(error, "location") };

  revalidatePath("/admin", "layout");
  return { ok: "Deleted." };
}
