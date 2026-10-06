"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { text } from "@/lib/validation";

export async function signIn(_prev: string | null, formData: FormData) {
  const email = text(formData.get("email"));
  const password = text(formData.get("password"));
  if (!email || !password) return "Please enter your email and password.";

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return "That email and password did not match. Please try again.";

  redirect("/admin");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
