import type { Metadata } from "next";
import { ActionForm } from "@/components/action-form";
import { requireAdmin } from "@/lib/auth";
import { createCampaign, deleteCampaign, updateCampaign } from "./actions";

export const metadata: Metadata = { title: "Campaigns" };

type Campaign = {
  id: number;
  name: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
};

function CampaignFields({ campaign }: { campaign?: Campaign }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="block sm:col-span-2">
        <span className="text-sm font-medium text-slate-700">Campaign name</span>
        <input name="name" required defaultValue={campaign?.name} className="input mt-1" />
      </label>
      <label className="block sm:col-span-2">
        <span className="text-sm font-medium text-slate-700">Description (optional)</span>
        <input name="description" defaultValue={campaign?.description ?? ""} className="input mt-1" />
      </label>
      <label className="block">
        <span className="text-sm font-medium text-slate-700">Start date (optional)</span>
        <input name="start_date" type="date" defaultValue={campaign?.start_date ?? ""} className="input mt-1" />
      </label>
      <label className="block">
        <span className="text-sm font-medium text-slate-700">End date (optional)</span>
        <input name="end_date" type="date" defaultValue={campaign?.end_date ?? ""} className="input mt-1" />
      </label>
    </div>
  );
}

export default async function CampaignsPage() {
  const { supabase } = await requireAdmin();
  const { data: campaigns, error } = await supabase
    .from("campaigns")
    .select("id, name, description, start_date, end_date")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Campaigns</h1>

      <section className="card">
        <h2 className="mb-4 font-semibold">Add a campaign</h2>
        <ActionForm action={createCampaign} resetOnSuccess>
          <CampaignFields />
          <button className="btn-primary mt-4">Add campaign</button>
        </ActionForm>
      </section>

      <section className="card">
        <h2 className="mb-4 font-semibold">All campaigns</h2>
        {error && <p className="text-sm text-red-600">Could not load campaigns.</p>}
        {campaigns?.length === 0 && <p className="text-sm text-slate-500">No campaigns yet.</p>}
        <ul className="divide-y divide-slate-100">
          {(campaigns as Campaign[] | null)?.map((c) => (
            <li key={c.id} className="py-3">
              <details>
                <summary className="flex cursor-pointer flex-wrap items-baseline gap-x-3">
                  <span className="font-medium">{c.name}</span>
                  <span className="text-sm text-slate-500">
                    {c.start_date || c.end_date
                      ? `${c.start_date ?? "…"} to ${c.end_date ?? "…"}`
                      : "No dates set"}
                  </span>
                  {c.description && <span className="text-sm text-slate-500">{c.description}</span>}
                  <span className="ml-auto text-sm text-indigo-600">Edit</span>
                </summary>
                <div className="mt-4 space-y-3">
                  <ActionForm action={updateCampaign}>
                    <input type="hidden" name="id" value={c.id} />
                    <CampaignFields campaign={c} />
                    <button className="btn-primary mt-4">Save changes</button>
                  </ActionForm>
                  <ActionForm
                    action={deleteCampaign}
                    confirmMessage={`Delete the campaign "${c.name}"? This cannot be undone.`}
                  >
                    <input type="hidden" name="id" value={c.id} />
                    <button className="text-sm text-red-600 hover:underline">Delete campaign</button>
                  </ActionForm>
                </div>
              </details>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
