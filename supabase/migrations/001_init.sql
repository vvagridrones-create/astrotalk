-- Jathakam booking schema. Appointment times are stored as Asia/Kolkata wall-clock
-- date + time (single-timezone business); "now" comparisons use Asia/Kolkata.
create extension if not exists pgcrypto;

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'user' check (role in ('admin','user')),
  created_at timestamptz not null default now()
);

create table services (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description text not null default '',
  price numeric(10,2) not null check (price >= 0),
  duration_minutes int not null check (duration_minutes between 10 and 240),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table bookings (
  id uuid primary key default gen_random_uuid(),
  booking_reference text not null unique,
  customer_name text not null check (char_length(customer_name) between 2 and 100),
  phone text not null check (phone ~ '^[6-9][0-9]{9}$'),
  email text,
  service_id uuid not null references services(id),
  date_of_birth date not null check (date_of_birth < current_date),
  birth_time time not null,
  birth_place text not null check (char_length(birth_place) between 2 and 120),
  gender text check (gender in ('male','female','other')),
  additional_message text check (char_length(additional_message) <= 1000),
  appointment_date date not null,
  start_time time not null,
  end_time time not null,
  status text not null default 'pending'
    check (status in ('pending','confirmed','rejected','cancelled','completed')),
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_time > start_time),
  -- Hard guarantee against double booking. Rejected/cancelled rows free the slot.
  constraint no_overlapping_bookings exclude using gist (
    tsrange(appointment_date + start_time, appointment_date + end_time) with &&
  ) where (status in ('pending','confirmed'))
);
create index bookings_date_idx on bookings (appointment_date, status);
create index bookings_phone_idx on bookings (phone);

-- Several rows per weekday = several sessions; the gap between them is a break.
create table availability (
  id uuid primary key default gen_random_uuid(),
  weekday int not null check (weekday between 0 and 6), -- 0 = Sunday
  start_time time not null,
  end_time time not null,
  slot_duration int not null default 30 check (slot_duration between 10 and 240),
  is_active boolean not null default true,
  check (end_time > start_time)
);
create index availability_weekday_idx on availability (weekday) where is_active;

create table blocked_dates (
  id uuid primary key default gen_random_uuid(),
  date date not null unique,
  reason text
);

create table blocked_slots (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  start_time time not null,
  end_time time not null,
  reason text,
  check (end_time > start_time)
);
create index blocked_slots_date_idx on blocked_slots (date);

create table settings (
  id int primary key default 1 check (id = 1), -- single row
  astrologer_name text not null default '',
  whatsapp_number text not null default '', -- digits with country code, e.g. 919876543210
  contact_number text,
  email text,
  address text,
  biography text,
  profile_image text,
  updated_at timestamptz not null default now()
);
insert into settings (id) values (1);

create table testimonials (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  review text not null,
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);

create or replace function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger bookings_updated before update on bookings for each row execute function set_updated_at();
create trigger settings_updated before update on settings for each row execute function set_updated_at();

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

-- Slots for one date and service, computed on the server.
create or replace function get_available_slots(p_date date, p_service_id uuid)
returns table (start_time time, end_time time)
language plpgsql stable security definer set search_path = public as $$
declare
  v_dur int; a record; s time;
  v_now timestamp := (now() at time zone 'Asia/Kolkata');
begin
  select duration_minutes into v_dur from services where id = p_service_id and is_active;
  if v_dur is null then return; end if;
  if exists (select 1 from blocked_dates d where d.date = p_date) then return; end if;

  for a in select * from availability av
           where av.is_active and av.weekday = extract(dow from p_date)::int loop
    s := a.start_time;
    while s + make_interval(mins => v_dur) <= a.end_time loop
      if (p_date + s) > v_now
         and not exists (select 1 from bookings b
               where b.status in ('pending','confirmed') and b.appointment_date = p_date
                 and b.start_time < s + make_interval(mins => v_dur) and b.end_time > s)
         and not exists (select 1 from blocked_slots x
               where x.date = p_date
                 and x.start_time < s + make_interval(mins => v_dur) and x.end_time > s)
      then
        start_time := s; end_time := s + make_interval(mins => v_dur); return next;
      end if;
      s := s + make_interval(mins => a.slot_duration);
    end loop;
  end loop;
end $$;

-- Atomic booking. Revalidates everything inside one transaction; the exclusion
-- constraint is the final backstop if two requests race.
create or replace function create_booking(
  p_service_id uuid, p_customer_name text, p_phone text, p_email text,
  p_dob date, p_birth_time time, p_birth_place text, p_gender text,
  p_message text, p_date date, p_start time
) returns table (booking_reference text, end_time time)
language plpgsql security definer set search_path = public as $$
declare v_ref text; v_end time;
begin
  perform pg_advisory_xact_lock(hashtext(p_date::text));
  if not exists (select 1 from get_available_slots(p_date, p_service_id) g where g.start_time = p_start) then
    raise exception 'slot_unavailable' using errcode = 'P0001';
  end if;
  select p_start + make_interval(mins => duration_minutes) into v_end from services where id = p_service_id;
  v_ref := 'JK-' || to_char(now() at time zone 'Asia/Kolkata', 'YYMMDD') || '-' ||
           upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
  begin
    insert into bookings (booking_reference, customer_name, phone, email, service_id, date_of_birth,
      birth_time, birth_place, gender, additional_message, appointment_date, start_time, end_time)
    values (v_ref, p_customer_name, p_phone, nullif(p_email,''), p_service_id, p_dob,
      p_birth_time, p_birth_place, p_gender, nullif(p_message,''), p_date, p_start, v_end);
  exception when exclusion_violation then
    raise exception 'slot_unavailable' using errcode = 'P0001';
  end;
  return query select v_ref, v_end;
end $$;

revoke all on function create_booking from public;
grant execute on function create_booking, get_available_slots to anon, authenticated;

-- Row Level Security
alter table profiles enable row level security;
alter table services enable row level security;
alter table bookings enable row level security;
alter table availability enable row level security;
alter table blocked_dates enable row level security;
alter table blocked_slots enable row level security;
alter table settings enable row level security;
alter table testimonials enable row level security;

create policy "own profile" on profiles for select using (id = auth.uid() or is_admin());
create policy "admin profiles" on profiles for all using (is_admin()) with check (is_admin());

create policy "public active services" on services for select using (is_active or is_admin());
create policy "admin services" on services for all using (is_admin()) with check (is_admin());

create policy "public availability" on availability for select using (true);
create policy "admin availability" on availability for all using (is_admin()) with check (is_admin());

create policy "public settings" on settings for select using (true);
create policy "admin settings" on settings for update using (is_admin()) with check (is_admin());

create policy "public testimonials" on testimonials for select using (is_published or is_admin());
create policy "admin testimonials" on testimonials for all using (is_admin()) with check (is_admin());

-- No public access to bookings, blocked dates/slots (public bookings go through create_booking).
create policy "admin bookings" on bookings for all using (is_admin()) with check (is_admin());
create policy "admin blocked_dates" on blocked_dates for all using (is_admin()) with check (is_admin());
create policy "admin blocked_slots" on blocked_slots for all using (is_admin()) with check (is_admin());

-- After creating your admin user in Supabase Auth, run:
-- insert into profiles (id, email, role) select id, email, 'admin' from auth.users where email = 'you@example.com';
