type Option = { id: number; name: string };

export type QrFormValues = {
  campaign_id: number;
  location_id: number;
  source: string;
  destination_url: string;
};

export function QrFields({
  campaigns,
  locations,
  values,
}: {
  campaigns: Option[];
  locations: Option[];
  values?: QrFormValues;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="block">
        <span className="text-sm font-medium text-slate-700">Campaign</span>
        <select name="campaign_id" required defaultValue={values?.campaign_id ?? ""} className="input mt-1">
          <option value="" disabled>
            Choose a campaign
          </option>
          {campaigns.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="text-sm font-medium text-slate-700">PVR / location</span>
        <select name="location_id" required defaultValue={values?.location_id ?? ""} className="input mt-1">
          <option value="" disabled>
            Choose a location
          </option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="text-sm font-medium text-slate-700">Source (where the QR is placed)</span>
        <input
          name="source"
          required
          list="source-suggestions"
          defaultValue={values?.source}
          placeholder="Standee, Ticket counter, Popcorn tub…"
          className="input mt-1"
        />
        <datalist id="source-suggestions">
          <option value="Standee" />
          <option value="Ticket counter" />
          <option value="Food counter" />
          <option value="Popcorn tub" />
          <option value="Poster" />
          <option value="Screen ad" />
        </datalist>
      </label>
      <label className="block">
        <span className="text-sm font-medium text-slate-700">Destination / registration link</span>
        <input
          name="destination_url"
          type="url"
          required
          pattern="https://.*"
          defaultValue={values?.destination_url}
          placeholder="https://"
          className="input mt-1"
        />
      </label>
    </div>
  );
}
