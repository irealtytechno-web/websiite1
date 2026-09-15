# I Realty Technologies

## Free hosting setup

This project is configured for **Cloudflare Pages + Supabase**, so it no longer needs Hatchable hosting.

1. Create a free Supabase project.
2. In **SQL Editor**, run [`supabase/schema.sql`](supabase/schema.sql).
3. Copy `Project URL` and `anon public key` from Supabase **Connect** into [`public/supabase-config.js`](public/supabase-config.js). The anon key is public; never use a `service_role` key in this file.
4. Open `staff.html`, use **Create account**, and then run the final commented SQL command in `schema.sql` with your email to make that account the first Admin.
5. Sign in as Admin, then assign VP or Agent roles. A staff member must create their account before you can assign a role.
6. Push the repository to GitHub and deploy the `public` folder with Cloudflare Pages. Add the purchased domain in Cloudflare Pages > Custom domains.

The staff dashboard supports Admin, VP and Agent roles. Each property can use up to three images in total: uploaded files, pasted image URLs, or a combination. A Google Maps URL or location name adds a public map link that opens in a separate tab.

Supabase Free projects can pause after inactivity. The first request after a pause may take a moment to wake it.
