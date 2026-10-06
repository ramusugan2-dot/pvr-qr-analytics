import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Returns a Supabase client for a logged-in admin.
 * Logged-out visitors go to /login; logged-in non-admins get null back.
 */
export async function getAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: isAdmin } = await supabase.rpc("is_admin");
  return isAdmin === true ? { supabase, user } : null;
}

/** Same as getAdmin, but for actions and APIs: non-admins are sent to /login. */
export async function requireAdmin() {
  const admin = await getAdmin();
  if (!admin) redirect("/login");
  return admin;
}
