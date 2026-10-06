"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const active = href === "/admin" ? pathname === href : pathname.startsWith(href);
  return (
    <Link
      href={href}
      className={`rounded-lg px-3 py-2 text-sm font-medium ${
        active ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-100"
      }`}
    >
      {children}
    </Link>
  );
}
