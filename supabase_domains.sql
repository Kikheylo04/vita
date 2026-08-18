-- ══════════════════════════════════════════════════════════
--  Plataforma — Fase 4: dominios propios
--  Ejecutar en: Supabase Dashboard > SQL Editor > New query
--  Requiere: supabase_subscriptions.sql (Fase 3)
--
--  Alcance de esta fase:
--  El cliente registra su dominio, la plataforma le dice que
--  registros DNS crear y verifica cuando ya apuntan bien. La
--  conexion final en el proveedor de hosting es manual.
--
--  Por que manual: Vercel solo admite dominios propios en su plan
--  Pro. Mientras la plataforma este en el plan gratuito, una
--  llamada a su API no serviria de nada. Todo lo demas —registro,
--  verificacion, limite por plan— ya queda hecho, y automatizar
--  la conexion sera agregar una Edge Function sin tocar esto.
--
--  Es idempotente: se puede correr mas de una vez.
-- ══════════════════════════════════════════════════════════

-- ── 1. Estado del dominio ────────────────────────────────
alter table tenants
  add column if not exists domain_status text not null default 'none'
    check (domain_status in ('none','pending','verified','connected','failed')),
  -- Token que el cliente publica en un TXT para probar que el
  -- dominio es suyo. Sin esto, alguien podria reclamar un dominio
  -- ajeno y recibir su trafico.
  add column if not exists domain_token text,
  add column if not exists domain_checked_at timestamptz,
  add column if not exists domain_connected_at timestamptz;

-- ── 2. Registro del dominio ──────────────────────────────
--  Valida el formato, comprueba que no este tomado y exige que el
--  plan lo permita.
create or replace function set_custom_domain(p_domain text)
returns table (domain text, token text)
language plpgsql security definer set search_path = public
as $$
declare
  my uuid := my_tenant();
  clean text;
  allowed boolean;
  new_token text;
begin
  if my is null or not is_owner() then
    raise exception 'Solo el dueno puede conectar un dominio';
  end if;

  select p.has_custom_domain into allowed
  from tenants t join plans p on p.code = t.plan
  where t.id = my;

  if not coalesce(allowed, false) then
    raise exception 'Tu plan no incluye dominio propio. Cambia de plan para activarlo.';
  end if;

  -- Normaliza: minusculas, sin protocolo, sin barra, sin www.
  clean := lower(trim(p_domain));
  clean := regexp_replace(clean, '^https?://', '');
  clean := regexp_replace(clean, '/.*$', '');
  clean := regexp_replace(clean, '^www\.', '');

  if clean !~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$' then
    raise exception 'El dominio "%" no tiene un formato valido', p_domain;
  end if;

  if length(clean) > 253 then
    raise exception 'El dominio es demasiado largo';
  end if;

  if exists (select 1 from tenants where custom_domain = clean and id <> my) then
    raise exception 'Ese dominio ya esta registrado por otra empresa';
  end if;

  -- Token estable: si el cliente vuelve a guardar el mismo dominio,
  -- no tiene que cambiar el TXT que ya publico.
  select case when custom_domain = clean and domain_token is not null
              then domain_token
              else encode(gen_random_bytes(16), 'hex')
         end
    into new_token
  from tenants where id = my;

  update tenants set
    custom_domain = clean,
    domain_token = new_token,
    domain_status = 'pending',
    domain_checked_at = null,
    domain_connected_at = null
  where id = my;

  return query select clean, new_token;
end;
$$;

revoke all on function set_custom_domain(text) from public;
grant execute on function set_custom_domain(text) to authenticated;

-- ── 3. Quitar el dominio ─────────────────────────────────
create or replace function remove_custom_domain()
returns void
language plpgsql security definer set search_path = public
as $$
declare my uuid := my_tenant();
begin
  if my is null or not is_owner() then
    raise exception 'Solo el dueno puede quitar el dominio';
  end if;

  update tenants set
    custom_domain = null,
    domain_token = null,
    domain_status = 'none',
    domain_checked_at = null,
    domain_connected_at = null
  where id = my;
end;
$$;

revoke all on function remove_custom_domain() from public;
grant execute on function remove_custom_domain() to authenticated;

-- ── 4. Resultado de la verificacion ──────────────────────
--  La escribe la Edge Function, que es quien puede resolver DNS.
create or replace function mark_domain_verified(
  p_tenant uuid,
  p_ok boolean
)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  -- Solo la plataforma o el propio dueno pueden disparar el cambio;
  -- la Edge Function corre con service_role y salta esta barrera.
  if not (is_platform() or (reaches_tenant(p_tenant) and is_owner())) then
    raise exception 'Sin permiso para verificar este dominio';
  end if;

  update tenants set
    domain_status = case when p_ok then 'verified' else 'failed' end,
    domain_checked_at = now()
  where id = p_tenant
    and domain_status in ('pending','failed','verified');
end;
$$;

revoke all on function mark_domain_verified(uuid, boolean) from public;
grant execute on function mark_domain_verified(uuid, boolean) to authenticated;

-- ── 5. Conexion final, por la plataforma ─────────────────
--  Se marca cuando el dominio ya quedo dado de alta en el
--  proveedor de hosting. Mientras esto sea manual, lo hacen
--  ustedes desde el panel de clientes.
create or replace function mark_domain_connected(p_tenant uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not is_platform() then
    raise exception 'Solo la plataforma puede marcar un dominio como conectado';
  end if;

  update tenants set
    domain_status = 'connected',
    domain_connected_at = now()
  where id = p_tenant;
end;
$$;

revoke all on function mark_domain_connected(uuid) from public;
grant execute on function mark_domain_connected(uuid) to authenticated;

-- ── 6. Instrucciones de DNS ──────────────────────────────
--  Un solo lugar del que leer, para que el panel del cliente y el
--  de la plataforma muestren exactamente lo mismo.
create or replace function domain_setup(p_tenant uuid)
returns table (
  domain text,
  status text,
  txt_name text,
  txt_value text,
  cname_name text,
  cname_value text,
  a_value text
)
language sql stable security definer set search_path = public
as $$
  select
    t.custom_domain,
    t.domain_status,
    '_verificacion.' || t.custom_domain,
    'plataforma-verificacion=' || coalesce(t.domain_token, ''),
    'www.' || t.custom_domain,
    coalesce(current_setting('app.platform_cname', true), 'cname.vercel-dns.com'),
    coalesce(current_setting('app.platform_ip', true), '76.76.21.21')
  from tenants t
  where t.id = p_tenant
    and (is_platform() or (reaches_tenant(t.id) and is_owner()));
$$;

-- ── 7. La resolucion por dominio exige verificacion ──────
--  Un dominio a medio configurar no debe servir el sitio: si otro
--  cliente lo reclamara despues, se le entregaria trafico ajeno.
create or replace function tenant_by_host(p_host text)
returns uuid
language sql stable security definer set search_path = public
as $$
  select id from tenants t
  where (t.status = 'active'
         or (t.status = 'trial' and t.trial_ends_at > now()))
    and (
      (t.custom_domain = p_host and t.domain_status = 'connected')
      or t.slug = split_part(p_host, '.', 1)
    )
  limit 1;
$$;

-- ── 8. Cola de dominios por conectar ─────────────────────
--  Lo que la plataforma tiene pendiente de dar de alta en el
--  proveedor de hosting.
create or replace view platform_domains as
select
  t.id as tenant_id,
  t.name,
  t.slug,
  t.custom_domain,
  t.domain_status,
  t.domain_token,
  t.domain_checked_at,
  t.domain_connected_at,
  p.has_custom_domain as plan_allows
from tenants t
join plans p on p.code = t.plan
where t.custom_domain is not null;

-- ── 9. VERIFICACION ──────────────────────────────────────
--    select * from platform_domains;
--    select * from domain_setup((select id from tenants where slug = 'principal'));
