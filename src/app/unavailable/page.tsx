import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "This offer has ended",
  robots: { index: false },
};

export default function UnavailablePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <div className="max-w-md rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
        <h1 className="text-2xl font-semibold text-slate-900">This offer has ended</h1>
        <p className="mt-3 text-slate-600">
          Thank you for your interest. This QR code is no longer active.
        </p>
      </div>
    </main>
  );
}
