-- Битик — общий питомец. Схема для Supabase (SQL Editor → New query → вставить → Run).
-- Безопасно запускать повторно.

-- Состояние: одна строка. Сытость хранится как «значение в момент updated_at»,
-- текущая = hunger − минуты с updated_at (считают и сервер, и браузер).
create table if not exists public.bitik_state (
  id          int primary key check (id = 1),
  hunger      real        not null,
  updated_at  timestamptz not null default now(),
  feeds_total bigint      not null default 0
);
insert into public.bitik_state (id, hunger) values (1, 100) on conflict (id) do nothing;

-- Лента событий (хранится неделю).
create table if not exists public.bitik_events (
  id   bigserial primary key,
  kind text        not null,
  at   timestamptz not null default now()
);
create index if not exists bitik_events_at on public.bitik_events (at desc);

-- Кулдауны (только для сервера, наружу не видны).
create table if not exists public.bitik_cooldown (
  who     text primary key,
  last_at timestamptz not null
);

-- Права: читать состояние и ленту может кто угодно, менять напрямую — никто.
alter table public.bitik_state    enable row level security;
alter table public.bitik_events   enable row level security;
alter table public.bitik_cooldown enable row level security;

drop policy if exists "read state"  on public.bitik_state;
drop policy if exists "read events" on public.bitik_events;
create policy "read state"  on public.bitik_state  for select to anon, authenticated using (true);
create policy "read events" on public.bitik_events for select to anon, authenticated using (true);

-- Покормить: единственный способ изменить сытость.
-- Кулдаун: 3 минуты на браузер и 20 секунд на IP (IP мягче — у мобильных операторов
-- один адрес бывает у многих людей). IP хранится только в виде хэша.
create or replace function public.bitik_feed(client_id text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  hdr     json := coalesce(nullif(current_setting('request.headers', true), ''), '{}')::json;
  ip      text := nullif(trim(split_part(coalesce(hdr->>'x-forwarded-for', ''), ',', 1)), '');
  v_last  timestamptz;
  v_cur   real;
  v_new   real;
  st      public.bitik_state;
begin
  if client_id is null or length(client_id) < 8 then
    return json_build_object('ok', false, 'error', 'bad_client');
  end if;

  select last_at into v_last from public.bitik_cooldown where who = 'c:' || left(client_id, 64);
  if v_last is not null and now() - v_last < interval '3 minutes' then
    return json_build_object('ok', false, 'wait', ceil(extract(epoch from (interval '3 minutes' - (now() - v_last)))));
  end if;
  if ip is not null then
    select last_at into v_last from public.bitik_cooldown where who = 'ip:' || md5(ip);
    if v_last is not null and now() - v_last < interval '20 seconds' then
      return json_build_object('ok', false, 'wait', ceil(extract(epoch from (interval '20 seconds' - (now() - v_last)))));
    end if;
  end if;

  select * into st from public.bitik_state where id = 1 for update;
  v_cur := greatest(0, st.hunger - extract(epoch from (now() - st.updated_at)) / 60.0);
  v_new := least(100, v_cur + 15);
  update public.bitik_state set hunger = v_new, updated_at = now(), feeds_total = feeds_total + 1 where id = 1;

  insert into public.bitik_cooldown (who, last_at) values ('c:' || left(client_id, 64), now())
    on conflict (who) do update set last_at = excluded.last_at;
  if ip is not null then
    insert into public.bitik_cooldown (who, last_at) values ('ip:' || md5(ip), now())
      on conflict (who) do update set last_at = excluded.last_at;
  end if;

  insert into public.bitik_events (kind) values ('feed');
  delete from public.bitik_events   where at < now() - interval '7 days';
  delete from public.bitik_cooldown where last_at < now() - interval '1 day';

  return json_build_object('ok', true, 'hunger', v_new, 'feeds_total', st.feeds_total + 1);
end;
$$;

revoke all on function public.bitik_feed(text) from public;
grant execute on function public.bitik_feed(text) to anon, authenticated;
