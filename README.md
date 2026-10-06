# PVR QR Analytics Portal

A private portal for tracking scans of the QR codes in a PVR campaign.

- **Admin portal** at `/admin`: campaigns, PVR locations, QR codes, dashboard.
- **Tracking link** at `/r/<code>`: the link printed inside every QR code. It records the scan
  (time, approximate country / state / city, device, operating system, browser) and then sends
  the person to the QR code's destination link.
- Change a destination at any time without reprinting. Switch a QR code off and scans show an
  "offer has ended" page instead.
- Dashboard: total scans, unique scans, scans today, scans by location and date, device / OS /
  browser breakdowns, filters by date, location and campaign, and CSV download.
- Download each QR code as a 1024×1024 PNG.

Built with Next.js, TypeScript, Tailwind CSS, Supabase (PostgreSQL + login) and Vercel.

---

## Setting it up (one time)

### 1. Create the database in Supabase

1. Go to [supabase.com](https://supabase.com), sign up, and click **New project**.
   Pick a name (for example `pvr-qr-analytics`), set a strong database password (save it
   somewhere safe), and choose the region **Mumbai (ap-south-1)**.
2. When the project is ready, open **SQL Editor** → **New query**.
3. Open the file `supabase/migrations/0001_initial_schema.sql` from this project, copy all of
   it, paste it into the editor, and click **Run**. You should see "Success. No rows returned".

### 2. Turn off public sign-up

In Supabase: **Authentication** → **Sign In / Providers** → turn **off**
"Allow new users to sign up". Keep **Email** enabled.

### 3. Create your admin login

1. **Authentication** → **Users** → **Add user** → **Create new user**.
   Enter your email and a strong password, and tick **Auto Confirm User**.
2. Back in **SQL Editor**, run this (with your email):

   ```sql
   insert into public.admins (user_id)
   select id from auth.users where email = 'you@example.com';
   ```

   It should say "1 row affected". Only people added this way can use the portal.

### 4. Copy the keys you will need

In Supabase: **Project Settings** → **API Keys** (or **API**). You need three values:

| Value | Where to find it |
| --- | --- |
| Project URL | Project Settings → API (or Data API) → Project URL |
| Publishable key | `sb_publishable_…` (older projects: the **anon public** key) |
| Secret key | `sb_secret_…` (older projects: the **service_role** key). Keep this private. |

### 5. Put the website online with Vercel

1. Go to [vercel.com](https://vercel.com) and sign up **with your GitHub account**.
2. Click **Add New** → **Project**, and import the `pvr-qr-analytics` repository.
3. Before clicking Deploy, open **Environment Variables** and add these four:

   | Name | Value |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | the Project URL |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | the publishable key |
   | `SUPABASE_SECRET_KEY` | the secret key |
   | `NEXT_PUBLIC_SITE_URL` | for now, `https://<your-project>.vercel.app` (Vercel shows this name) |

4. Click **Deploy**. When it finishes, open the address, log in, and you are in.

### 6. Before printing: your own domain

The address inside each QR code comes from `NEXT_PUBLIC_SITE_URL`, and a printed QR code can
never change. So before printing:

1. Buy a domain (for example `pvrscan.in`).
2. In Vercel: **Project** → **Settings** → **Domains** → add it, and follow the DNS steps shown.
3. Change `NEXT_PUBLIC_SITE_URL` to `https://your-domain` and click **Redeploy**.
4. Only then download the QR code PNGs for printing, and test each one with a phone.
5. Upgrade to Supabase Pro and Vercel Pro (the free Supabase project pauses after a week with no
   activity, and Vercel's free plan is for non-commercial use).

---

## Using the portal

1. **Locations**: add each PVR cinema once.
2. **Campaigns**: add the campaign.
3. **QR codes**: pick the campaign, location and source (where it is placed, such as "Standee"),
   enter the registration link (must start with `https://`), and click **Create QR code**.
   Download the PNG from the QR code's page.
4. **Dashboard**: see the numbers, filter them, and click **Download CSV** for a spreadsheet of
   every scan matching the filters.

How things are counted:

- **Unique scans** = different phones. Each phone gets an anonymous random tag on its first scan.
- **Robot visits** (for example WhatsApp or Facebook creating a link preview) are recorded but
  left out of every number and of the CSV.
- **Dates** use India Standard Time.
- **Location** is approximate and can be missing; it comes from Vercel, based on the phone's
  internet address. IP addresses are never stored.

---

## For developers

```bash
cp .env.example .env.local   # then fill in the values
npm install
npm run dev                  # http://localhost:3000
npm run lint
npm run build
```

- `src/app/r/[code]/route.ts`: the scan-and-redirect link (uses the server-only secret key;
  saves the scan with `after()` so the redirect is not delayed; 302 so phones never cache it).
- `src/app/admin/*`: admin pages. `src/proxy.ts` refreshes the login session.
- `src/app/api/export`: CSV download. `src/app/api/qr/[id]`: QR PNG.
- `supabase/migrations/0001_initial_schema.sql`: tables, row-level security (admins only),
  destination history trigger, and the `dashboard_stats` / `filtered_scans` functions.
