# Jathakam consultation site — backend core

Status: database, booking logic, API, WhatsApp builder and admin route protection are written.
The public pages, booking UI and admin dashboard UI are NOT built yet. Nothing here has been
run against a live Supabase project.

## Status
Built: home page, booking flow, admin login/overview/bookings, booking database logic.
Not built yet: admin screens for availability, services, settings, testimonials and calendar;
privacy and terms pages. Manage those through the Supabase Table Editor / SQL meanwhile.

## Setup
1. Supabase SQL Editor: run `supabase/migrations/001_init.sql`, then `002_experience.sql`.
2. Authentication > Users: create the admin user (tick Auto Confirm), then run the
   `insert into profiles ...` line at the end of 001.
3. Edit and run `supabase/seed.example.sql` (services, working hours, settings).
4. `copy .env.example .env.local`, fill in the Supabase URL and anon key, then
   `npm install && npm run dev`.
5. Before deploying, run `npm run typecheck && npm run build`.

## How double booking is prevented
`create_booking()` locks the date, revalidates hours, blocks and existing bookings, then inserts.
The `no_overlapping_bookings` exclusion constraint is the final guarantee. Only pending and
confirmed bookings block a slot.

## Endpoints
`GET /api/slots`, `GET /api/availability-dates`, `POST /api/bookings`.

## Deploy
Push to GitHub, import in Vercel, add the env vars (set `NEXT_PUBLIC_SITE_URL` to your domain),
and add the Vercel URL to Supabase Auth redirect URLs. Add rate limiting or a CAPTCHA on
`/api/bookings` before going public.
