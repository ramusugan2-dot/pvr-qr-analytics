import { signOut } from "@/app/login/actions";
import { getAdmin } from "@/lib/auth";
import { NavLink } from "./nav-link";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const admin = await getAdmin();

  if (!admin) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <div className="card max-w-md text-center">
          <h1 className="text-lg font-semibold">This account is not an admin</h1>
          <p className="mt-2 text-sm text-slate-600">
            Ask the portal owner to add your account to the admins list.
          </p>
          <form action={signOut} className="mt-4">
            <button className="btn-secondary">Log out</button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-4 py-3">
          <span className="mr-4 font-semibold text-slate-900">PVR QR Analytics</span>
          <nav className="flex flex-wrap gap-1">
            <NavLink href="/admin">Dashboard</NavLink>
            <NavLink href="/admin/qr-codes">QR codes</NavLink>
            <NavLink href="/admin/campaigns">Campaigns</NavLink>
            <NavLink href="/admin/locations">Locations</NavLink>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-sm text-slate-500 sm:inline">{admin.user.email}</span>
            <form action={signOut}>
              <button className="btn-secondary">Log out</button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}
