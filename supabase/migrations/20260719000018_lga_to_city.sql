-- Order form asks for City/Town (free text) instead of LGA
alter table public.leads rename column lga to city;
