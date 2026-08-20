-- ══════════════════════════════════════════════════════════
--  Plataforma — Fase 7: ficha de cliente y tablero
--  Ejecutar en: Supabase Dashboard > SQL Editor > New query
--  Requiere: supabase_platform_support.sql (Fase 6)
--
--  Que resuelve:
--  La informacion existia pero estaba dispersa. No habia forma de
--  ver la actividad de un cliente, ni de saber al abrir el panel
--  que necesita atencion hoy.
--
--  Aqui se agrega:
--   · Actividad por cliente: cuando uso el sistema por ultima vez
--   · Detalle completo de una empresa en una consulta
--   · Cifras del tablero: altas, vencimientos, clientes inactivos
--
--  Es idempotente: se puede correr mas de una vez.
-- ══════════════════════════════════════════════════════════

-- ── 1. Actividad por cliente ─────────────────────────────
--  Un cliente que paga y no usa el sistema se va a ir. Esto lo
--  detecta antes de que cancele.
create or replace view tenant_activity as
select
  t.id as tenant_id,
  t.name,
  -- Ultima señal de vida, de cualquier tipo.
  greatest(
    coalesce((select max(o.created_at) from orders o
              join branches b on b.id = o.branch_id
             where b.tenant_id = t.id), t.created_at),
    coalesce((select max(r.created_at) from reservations r
              join branches b on b.id = r.branch_id
             where b.tenant_id = t.id), t.created_at),
    coalesce((select max(m.created_at) from menu_items m
             where m.tenant_id = t.id), t.created_at)
  ) as last_seen,
  (select count(*) from orders o
     join branches b on b.id = o.branch_id
    where b.tenant_id = t.id) as orders_total,
  (select count(*) from orders o
     join branches b on b.id = o.branch_id
    where b.tenant_id = t.id
      and o.created_at > now() - interval '30 days') as orders_30d,
  (select count(*) from reservations r
     join branches b on b.id = r.branch_id
    where b.tenant_id = t.id
      and r.created_at > now() - interval '30 days') as reservations_30d,
  (select count(*) from menu_items m where m.tenant_id = t.id) as menu_items,
  (select count(*) from branches b where b.tenant_id = t.id) as branches,
  (select count(*) from profiles p where p.tenant_id = t.id) as users
from tenants t;

-- ── 2. Usuarios de cada empresa ──────────────────────────
create or replace view tenant_users as
select
  p.tenant_id,
  p.id as user_id,
  u.email,
  p.full_name,
  p.role,
  b.name as branch_name,
  u.last_sign_in_at
from profiles p
join auth.users u on u.id = p.id
left join branches b on b.id = p.branch_id
where p.tenant_id is not null;

-- ── 3. Cifras del tablero ────────────────────────────────
create or replace view platform_dashboard as
select
  (select count(*)::int from tenants)                          as clients_total,
  (select count(*)::int from tenants where status = 'active')   as clients_active,
  (select count(*)::int from tenants
    where status = 'trial' and trial_ends_at > now())           as clients_trial,
  (select count(*)::int from tenants where status = 'suspended') as clients_suspended,
  -- Altas de los ultimos 30 dias: si crece o se estanca.
  (select count(*)::int from tenants
    where created_at > now() - interval '30 days')              as new_30d,
  -- Pruebas que vencen esta semana: a quien hay que llamar.
  (select count(*)::int from tenants
    where status = 'trial'
      and trial_ends_at between now() and now() + interval '7 days') as trials_ending,
  -- Inactivos: pagan pero no usan el sistema.
  (select count(*)::int from tenant_activity a
     join tenants t on t.id = a.tenant_id
    where t.status = 'active'
      and a.last_seen < now() - interval '14 days')             as idle_clients,
  (select mrr from platform_mrr)                                as mrr,
  (select coalesce(sum(collected), 0) from platform_revenue_monthly
    where month = date_trunc('month', current_date)::date)      as collected_this_month;

-- ── 4. Clientes inactivos, con nombre ────────────────────
create or replace view platform_idle as
select
  a.tenant_id,
  a.name,
  t.status,
  t.plan,
  a.last_seen,
  extract(day from now() - a.last_seen)::int as days_idle,
  a.orders_30d,
  a.menu_items
from tenant_activity a
join tenants t on t.id = a.tenant_id
where t.status in ('active','trial')
  and a.last_seen < now() - interval '7 days'
order by a.last_seen;

-- ── 5. Altas recientes ───────────────────────────────────
create or replace view platform_recent_signups as
select
  t.id as tenant_id,
  t.name,
  t.slug,
  t.status,
  t.plan,
  t.created_at,
  (select email from tenant_users u
    where u.tenant_id = t.id and u.role = 'owner' limit 1) as owner_email,
  (select menu_items from tenant_activity a where a.tenant_id = t.id) as menu_items
from tenants t
order by t.created_at desc
limit 10;

-- ── 6. Ficha completa de un cliente ──────────────────────
--  Todo lo que la pantalla de detalle necesita, en una llamada.
create or replace function tenant_detail(p_tenant uuid)
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare result jsonb;
begin
  if not is_platform() then
    raise exception 'Solo la plataforma puede ver la ficha de un cliente';
  end if;

  select jsonb_build_object(
    'tenant', (
      select to_jsonb(x) from (
        select t.id, t.name, t.slug, t.status, t.plan, t.template,
               t.custom_domain, t.domain_status,
               t.trial_ends_at, t.created_at, t.brand
        from tenants t where t.id = p_tenant
      ) x
    ),
    'activity', (
      select to_jsonb(a) from tenant_activity a where a.tenant_id = p_tenant
    ),
    'plan', (
      select to_jsonb(pl) from (
        select p.code, p.name, p.price, p.max_branches, p.max_users,
               p.has_inventory, p.has_custom_domain
        from tenants t
        join plans p on p.code = t.plan
        where t.id = p_tenant
      ) pl
    ),
    'users', coalesce((
      select jsonb_agg(to_jsonb(u) order by u.role)
      from tenant_users u where u.tenant_id = p_tenant
    ), '[]'::jsonb),
    'branches', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', b.id, 'name', b.name, 'slug', b.slug, 'active', b.active
      ) order by b.sort_order)
      from branches b where b.tenant_id = p_tenant
    ), '[]'::jsonb),
    'payments', coalesce((
      select jsonb_agg(jsonb_build_object(
        'amount', sp.amount, 'status', sp.status, 'paid_at', sp.paid_at
      ) order by sp.created_at desc)
      from subscription_payments sp where sp.tenant_id = p_tenant
    ), '[]'::jsonb),
    'notes', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', n.id, 'body', n.body, 'author', n.author_email, 'created_at', n.created_at
      ) order by n.created_at desc)
      from tenant_notes n where n.tenant_id = p_tenant
    ), '[]'::jsonb),
    'audit', coalesce((
      select jsonb_agg(jsonb_build_object(
        'action', al.action, 'actor', al.actor_email,
        'detail', al.detail, 'created_at', al.created_at
      ) order by al.created_at desc)
      from (
        select * from platform_audit
        where tenant_id = p_tenant
        order by created_at desc limit 20
      ) al
    ), '[]'::jsonb)
  ) into result;

  return result;
end;
$$;

revoke all on function tenant_detail(uuid) from public;
grant execute on function tenant_detail(uuid) to authenticated;

-- ── 7. Borrar una nota ───────────────────────────────────
create or replace function delete_tenant_note(p_note uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not is_platform() then
    raise exception 'Solo la plataforma puede borrar notas';
  end if;
  delete from tenant_notes where id = p_note;
end;
$$;

revoke all on function delete_tenant_note(uuid) from public;
grant execute on function delete_tenant_note(uuid) to authenticated;

-- ── 8. VERIFICACION ──────────────────────────────────────
--    select * from platform_dashboard;
--    select * from platform_idle;
--    select tenant_detail((select id from tenants where slug = 'principal'));
