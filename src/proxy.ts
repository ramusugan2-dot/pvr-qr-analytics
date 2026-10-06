import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Only admin pages, admin APIs and the login page need the session.
  // The public /r/ scan links skip this entirely so they stay fast.
  matcher: ["/admin/:path*", "/api/:path*", "/login"],
};
