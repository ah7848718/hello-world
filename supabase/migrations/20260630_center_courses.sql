-- Add is_center_only column to courses table
alter table public.courses
add column is_center_only boolean default false;

-- Create center_course_codes table
create table public.center_course_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  is_active boolean default true,
  created_by uuid references auth.users(id) not null,
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.center_course_codes enable row level security;

-- RLS: only admins can read/write
create policy "Admins can manage center_course_codes"
  on public.center_course_codes
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- RLS: any authenticated user can read active codes (for validation)
create policy "Users can read active codes"
  on public.center_course_codes
  for select
  using (is_active = true);
