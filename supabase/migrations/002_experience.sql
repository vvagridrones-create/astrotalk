alter table settings add column if not exists years_experience int check (years_experience between 0 and 80);
