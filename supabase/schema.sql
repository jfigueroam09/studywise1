-- Estat complet de TRIA, privat per usuari autenticat.
create table if not exists public.tria_user_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.tria_user_data enable row level security;

revoke all on table public.tria_user_data from anon, authenticated;
grant select, insert, update, delete on public.tria_user_data to authenticated;
grant usage on schema public to authenticated;

drop policy if exists "TRIA users can read own data" on public.tria_user_data;
drop policy if exists "TRIA users can insert own data" on public.tria_user_data;
drop policy if exists "TRIA users can update own data" on public.tria_user_data;
drop policy if exists "TRIA users can delete own data" on public.tria_user_data;

create policy "TRIA users can read own data"
  on public.tria_user_data
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "TRIA users can insert own data"
  on public.tria_user_data
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "TRIA users can update own data"
  on public.tria_user_data
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "TRIA users can delete own data"
  on public.tria_user_data
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- Importa les dades que hi hagués a les taules anteriors sense esborrar-les.
with task_rows as (
  select
    user_id,
    jsonb_agg(
      jsonb_build_object(
        'id', 'legacy-task-' || id::text,
        'createdAt', created_at,
        'title', coalesce(title, ''),
        'subject', coalesce(subject, ''),
        'description', coalesce(description, ''),
        'dueDate', due_date::text,
        'estimatedMinutes', coalesce(estimated_minutes, 30),
        'difficulty', case
          when coalesce(difficulty, '') ~ '^[1-5]$' then difficulty::integer
          when lower(coalesce(difficulty, '')) in ('baixa', 'low') then 1
          when lower(coalesce(difficulty, '')) in ('alta', 'high') then 5
          else 3
        end,
        'status', case
          when lower(coalesce(status, '')) in ('completed', 'completada', 'completado') then 'completed'
          when lower(coalesce(status, '')) in ('inprogress', 'in_progress', 'en curs') then 'inprogress'
          else 'pending'
        end
      )
      order by due_date, created_at
    ) as tasks
  from public.tasks
  where user_id is not null
    and user_id in (select id from auth.users)
  group by user_id
), exam_rows as (
  select
    user_id,
    jsonb_agg(
      jsonb_build_object(
        'id', 'legacy-exam-' || id::text,
        'createdAt', created_at,
        'title', case
          when nullif(trim(subject), '') is null then 'Examen'
          else 'Examen de ' || trim(subject)
        end,
        'subject', coalesce(subject, ''),
        'date', exam_date::text,
        'syllabus', coalesce(syllabus, ''),
        'difficulty', case
          when coalesce(difficulty, '') ~ '^[1-5]$' then difficulty::integer
          when lower(coalesce(difficulty, '')) in ('baixa', 'low') then 1
          when lower(coalesce(difficulty, '')) in ('alta', 'high') then 5
          else 3
        end,
        'availableMinutes', coalesce(available_minutes, 0)
      )
      order by exam_date, created_at
    ) as exams
  from public.exams
  where user_id is not null
    and user_id in (select id from auth.users)
  group by user_id
), legacy_users as (
  select user_id from task_rows
  union
  select user_id from exam_rows
)
insert into public.tria_user_data (user_id, state)
select
  legacy_users.user_id,
  jsonb_build_object(
    'tasks', coalesce(task_rows.tasks, '[]'::jsonb),
    'exams', coalesce(exam_rows.exams, '[]'::jsonb),
    'scheduleEvents', '[]'::jsonb,
    'plan', null,
    'chat', '[]'::jsonb,
    'captureLog', '[]'::jsonb,
    'settings', jsonb_build_object('aiEnabled', true)
  )
from legacy_users
left join task_rows using (user_id)
left join exam_rows using (user_id)
on conflict (user_id) do nothing;
