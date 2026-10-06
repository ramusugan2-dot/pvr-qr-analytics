import type { Metadata } from "next";
import { ActionForm } from "@/components/action-form";
import { requireAdmin } from "@/lib/auth";
import { createLocation, deleteLocation, updateLocation } from "./actions";

export const metadata: Metadata = { title: "Locations" };

type Location = { id: number; name: string; city: string | null };

function LocationFields({ location }: { location?: Location }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="block">
        <span className="text-sm font-medium text-slate-700">PVR / location name</span>
        <input
          name="name"
          required
          defaultValue={location?.name}
          placeholder="PVR Phoenix Marketcity"
          className="input mt-1"
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium text-slate-700">City (optional)</span>
        <input name="city" defaultValue={location?.city ?? ""} placeholder="Chennai" className="input mt-1" />
      </label>
    </div>
  );
}

export default async function LocationsPage() {
  const { supabase } = await requireAdmin();
  const { data: locations, error } = await supabase
    .from("locations")
    .select("id, name, city")
    .order("name");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">PVR locations</h1>

      <section className="card">
        <h2 className="mb-4 font-semibold">Add a location</h2>
        <ActionForm action={createLocation} resetOnSuccess>
          <LocationFields />
          <button className="btn-primary mt-4">Add location</button>
        </ActionForm>
      </section>

      <section className="card">
        <h2 className="mb-4 font-semibold">All locations</h2>
        {error && <p className="text-sm text-red-600">Could not load locations.</p>}
        {locations?.length === 0 && <p className="text-sm text-slate-500">No locations yet.</p>}
        <ul className="divide-y divide-slate-100">
          {(locations as Location[] | null)?.map((l) => (
            <li key={l.id} className="py-3">
              <details>
                <summary className="flex cursor-pointer items-baseline gap-3">
                  <span className="font-medium">{l.name}</span>
                  {l.city && <span className="text-sm text-slate-500">{l.city}</span>}
                  <span className="ml-auto text-sm text-indigo-600">Edit</span>
                </summary>
                <div className="mt-4 space-y-3">
                  <ActionForm action={updateLocation}>
                    <input type="hidden" name="id" value={l.id} />
                    <LocationFields location={l} />
                    <button className="btn-primary mt-4">Save changes</button>
                  </ActionForm>
                  <ActionForm
                    action={deleteLocation}
                    confirmMessage={`Delete "${l.name}"? This cannot be undone.`}
                  >
                    <input type="hidden" name="id" value={l.id} />
                    <button className="text-sm text-red-600 hover:underline">Delete location</button>
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
