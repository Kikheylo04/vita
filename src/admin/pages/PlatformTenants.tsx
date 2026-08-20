import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import styles from './PlatformTenants.module.css'
import { IconSearch, IconAlert, IconCheckCircle, IconExternal } from '../ui/Icons'

interface Plan {
  code: string
  name: string
  price: number
}

interface Owner {
  tenant_id: string
  email: string
}

interface PendingDomain {
  tenant_id: string
  name: string
  custom_domain: string
  domain_status: string
  domain_checked_at: string | null
}

interface PlatformTenant {
  id: string
  slug: string
  name: string
  custom_domain: string | null
  template: string
  status: 'trial' | 'active' | 'suspended' | 'cancelled'
  plan: string
  trial_ends_at: string
  created_at: string
  trial_expired: boolean
  users: number
  branches: number
  menu_items: number
  orders: number
  last_order_at: string | null
}

const PLATFORM_DOMAIN = (import.meta.env.VITE_PLATFORM_DOMAIN as string) || 'laplataforma.com'

const STATUS_LABEL: Record<string, string> = {
  trial: 'Prueba', active: 'Activa', suspended: 'Suspendida', cancelled: 'Cancelada',
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
}

function daysLeft(iso: string) {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000)
}

export default function PlatformTenants() {
  const [rows, setRows] = useState<PlatformTenant[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'trial' | 'active' | 'suspended'>('all')
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [domains, setDomains] = useState<PendingDomain[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [owners, setOwners] = useState<Record<string, string>>({})
  const [creating, setCreating] = useState(false)

  async function loadDomains() {
    // Solo lo verificado espera accion nuestra: lo pendiente sigue
    // en manos del cliente.
    const { data, error } = await supabase
      .from('platform_domains')
      .select('tenant_id,name,custom_domain,domain_status,domain_checked_at')
      .eq('domain_status', 'verified')
    if (error) { console.error('Error cargando dominios:', error.message); return }
    setDomains((data ?? []) as PendingDomain[])
  }

  async function connectDomain(d: PendingDomain) {
    const { error } = await supabase.rpc('mark_domain_connected', { p_tenant: d.tenant_id })
    if (error) {
      console.error('Error conectando el dominio:', error.message)
      setMsg({ ok: false, text: `No se pudo marcar: ${error.message}` })
      return
    }
    setMsg({ ok: true, text: `${d.custom_domain} marcado como conectado.` })
    loadDomains()
  }

  async function load() {
    setLoading(true)
    const { data, error } = await supabase
      .from('platform_tenants')
      .select('*')
      .order('created_at', { ascending: false })
    setLoading(false)
    if (error) {
      console.error('Error cargando clientes:', error.message)
      setMsg({ ok: false, text: 'No se pudieron cargar los clientes.' })
      return
    }
    setRows((data ?? []) as PlatformTenant[])
  }

  async function loadMeta() {
    const [p, o] = await Promise.all([
      supabase.from('plans').select('code,name,price').eq('active', true).order('sort_order'),
      supabase.from('platform_tenant_owners').select('tenant_id,email'),
    ])
    if (p.error) console.error('Error cargando planes:', p.error.message)
    else setPlans((p.data ?? []) as Plan[])

    if (o.error) console.error('Error cargando dueños:', o.error.message)
    else {
      const map: Record<string, string> = {}
      for (const row of (o.data ?? []) as Owner[]) map[row.tenant_id] = row.email
      setOwners(map)
    }
  }

  useEffect(() => { load(); loadDomains(); loadMeta() }, [])

  async function enterAccount(t: PlatformTenant) {
    const { error } = await supabase.rpc('start_impersonation', { p_tenant: t.id })
    if (error) {
      console.error('Error entrando a la cuenta:', error.message)
      setMsg({ ok: false, text: error.message })
      return
    }
    // El panel decide su navegacion al montar, asi que se recarga.
    window.location.reload()
  }

  async function addNote(t: PlatformTenant) {
    const body = prompt(`Nota interna sobre ${t.name}:`)
    if (!body?.trim()) return

    const { error } = await supabase.rpc('add_tenant_note', {
      p_tenant: t.id, p_body: body.trim(),
    })
    if (error) {
      console.error('Error guardando la nota:', error.message)
      setMsg({ ok: false, text: error.message })
      return
    }
    setMsg({ ok: true, text: 'Nota guardada.' })
  }

  async function assignOwner(t: PlatformTenant) {
    const email = prompt(`Correo del dueño de ${t.name}. La cuenta debe existir ya.`)
    if (!email?.trim()) return

    const { error } = await supabase.rpc('platform_assign_owner', {
      p_tenant: t.id, p_email: email.trim(),
    })
    if (error) {
      console.error('Error asignando dueño:', error.message)
      setMsg({ ok: false, text: error.message })
      return
    }
    setMsg({ ok: true, text: `${email.trim()} es ahora dueño de ${t.name}.` })
    load(); loadMeta()
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter(r => {
      if (filter !== 'all' && r.status !== filter) return false
      if (!q) return true
      return r.name.toLowerCase().includes(q)
        || r.slug.toLowerCase().includes(q)
        || (r.custom_domain ?? '').toLowerCase().includes(q)
    })
  }, [rows, search, filter])

  const counts = useMemo(() => ({
    all: rows.length,
    trial: rows.filter(r => r.status === 'trial').length,
    active: rows.filter(r => r.status === 'active').length,
    suspended: rows.filter(r => r.status === 'suspended').length,
  }), [rows])

  async function setStatus(t: PlatformTenant, status: string) {
    const { error } = await supabase.rpc('set_tenant_status', {
      p_tenant: t.id, p_status: status,
    })
    if (error) {
      console.error('Error cambiando el estado:', error.message)
      setMsg({ ok: false, text: `No se pudo cambiar: ${error.message}` })
      return
    }
    setMsg({ ok: true, text: `${t.name} ahora está ${STATUS_LABEL[status].toLowerCase()}.` })
    load()
  }

  async function extend(t: PlatformTenant) {
    const { error } = await supabase.rpc('extend_trial', { p_tenant: t.id, p_days: 14 })
    if (error) {
      console.error('Error extendiendo la prueba:', error.message)
      setMsg({ ok: false, text: `No se pudo extender: ${error.message}` })
      return
    }
    setMsg({ ok: true, text: `Prueba de ${t.name} extendida 14 días.` })
    load()
  }

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <div>
          <h2 className={styles.title}>Clientes</h2>
          <p className={styles.sub}>Restaurantes registrados en la plataforma.</p>
        </div>
        <button className={styles.btnNew} onClick={() => { setCreating(true); setMsg(null) }}>
          + Nuevo cliente
        </button>
      </div>

      {msg && (
        <p className={msg.ok ? styles.ok : styles.err} role="alert">
          {msg.ok ? <IconCheckCircle size={16} /> : <IconAlert size={16} />}
          <span>{msg.text}</span>
        </p>
      )}

      {domains.length > 0 && (
        <section className={styles.domainQueue}>
          <h3 className={styles.queueTitle}>
            Dominios listos para conectar
            <span className={styles.queueNum}>{domains.length}</span>
          </h3>
          <p className={styles.queueSub}>
            Su DNS ya apunta aquí. Agrégalos en el proveedor de hosting y márcalos como conectados.
          </p>
          <ul className={styles.queueList}>
            {domains.map(d => (
              <li key={d.tenant_id} className={styles.queueRow}>
                <div className={styles.queueInfo}>
                  <span className={styles.queueDomain}>{d.custom_domain}</span>
                  <span className={styles.queueClient}>{d.name}</span>
                </div>
                <button className={styles.btnOk} onClick={() => connectDomain(d)}>
                  Marcar conectado
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {creating && (
        <NewTenantModal
          plans={plans}
          onClose={() => setCreating(false)}
          onDone={(text) => { setCreating(false); setMsg({ ok: true, text }); load(); loadMeta() }}
        />
      )}

      <div className={styles.toolbar}>
        <div className={styles.tabs}>
          {(['all', 'trial', 'active', 'suspended'] as const).map(f => (
            <button
              key={f}
              className={`${styles.tab} ${filter === f ? styles.tabOn : ''}`}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'Todos' : STATUS_LABEL[f]}
              <span className={styles.tabNum}>{counts[f]}</span>
            </button>
          ))}
        </div>

        <div className={styles.searchBox}>
          <IconSearch size={16} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar cliente…" aria-label="Buscar cliente"
          />
        </div>
      </div>

      {loading ? (
        <p className={styles.empty}>Cargando…</p>
      ) : filtered.length === 0 ? (
        <p className={styles.empty}>
          {rows.length === 0 ? 'Aún no hay clientes registrados.' : 'Ningún cliente coincide.'}
        </p>
      ) : (
        <div className={styles.grid}>
          {filtered.map(t => {
            const left = daysLeft(t.trial_ends_at)
            return (
              <article key={t.id} className={styles.card}>
                <div className={styles.cardTop}>
                  <div className={styles.cardInfo}>
                    <h3 className={styles.cardName}>{t.name}</h3>
                    <a
                      className={styles.cardUrl}
                      href={`https://${t.custom_domain ?? `${t.slug}.${PLATFORM_DOMAIN}`}`}
                      target="_blank" rel="noreferrer"
                    >
                      {t.custom_domain ?? `${t.slug}.${PLATFORM_DOMAIN}`}
                      <IconExternal size={12} />
                    </a>
                  </div>
                  <span className={`${styles.pill} ${styles['pill_' + t.status]}`}>
                    {STATUS_LABEL[t.status]}
                  </span>
                </div>

                {t.status === 'trial' && (
                  <p className={left < 0 ? styles.trialOver : left <= 3 ? styles.trialSoon : styles.trialOk}>
                    {left < 0
                      ? `Prueba vencida hace ${Math.abs(left)} ${Math.abs(left) === 1 ? 'día' : 'días'}`
                      : `${left} ${left === 1 ? 'día' : 'días'} de prueba`}
                  </p>
                )}

                <p className={styles.owner}>
                  {owners[t.id]
                    ? <>Dueño: <strong>{owners[t.id]}</strong></>
                    : <span className={styles.noOwner}>Sin dueño asignado</span>}
                </p>

                <dl className={styles.stats}>
                  <div><dt>Sucursales</dt><dd>{t.branches}</dd></div>
                  <div><dt>Platillos</dt><dd>{t.menu_items}</dd></div>
                  <div><dt>Pedidos</dt><dd>{t.orders}</dd></div>
                  <div><dt>Usuarios</dt><dd>{t.users}</dd></div>
                </dl>

                <p className={styles.meta}>
                  Alta {fmtDate(t.created_at)}
                  {t.last_order_at && ` · último pedido ${fmtDate(t.last_order_at)}`}
                </p>

                <div className={styles.actions}>
                  {t.status !== 'active' && (
                    <button className={styles.btnOk} onClick={() => setStatus(t, 'active')}>
                      Activar
                    </button>
                  )}
                  {t.status === 'trial' && (
                    <button className={styles.btnGhost} onClick={() => extend(t)}>
                      +14 días
                    </button>
                  )}
                  {!owners[t.id] && (
                    <button className={styles.btnGhost} onClick={() => assignOwner(t)}>
                      Asignar dueño
                    </button>
                  )}
                  <button className={styles.btnGhost} onClick={() => enterAccount(t)}>
                    Entrar
                  </button>
                  <button className={styles.btnGhost} onClick={() => addNote(t)}>
                    Nota
                  </button>
                  {t.status !== 'suspended' && t.status !== 'cancelled' && (
                    <button className={styles.btnWarn} onClick={() => setStatus(t, 'suspended')}>
                      Suspender
                    </button>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ── Alta de cliente ──────────────────────── */
function slugify(v: string) {
  return v.toLowerCase().trim()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32)
}

function NewTenantModal({ plans, onClose, onDone }: {
  plans: Plan[]
  onClose: () => void
  onDone: (text: string) => void
}) {
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [touched, setTouched] = useState(false)
  const [email, setEmail] = useState('')
  const [plan, setPlan] = useState('basic')
  const [days, setDays] = useState('14')
  const [available, setAvailable] = useState<boolean | null>(null)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  // El slug sigue al nombre hasta que se edita a mano.
  const effectiveSlug = touched ? slug : slugify(name)

  useEffect(() => {
    if (effectiveSlug.length < 3) { setAvailable(null); return }
    const timer = setTimeout(() => {
      supabase.rpc('slug_available', { p_slug: effectiveSlug })
        .then(({ data, error }) => {
          if (error) { console.error('Error verificando la dirección:', error.message); return }
          setAvailable(Boolean(data))
        })
    }, 350)
    return () => clearTimeout(timer)
  }, [effectiveSlug])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (name.trim().length < 2) { setErr('Escribe el nombre del restaurante.'); return }
    if (!available) { setErr('Elige una dirección disponible.'); return }

    setSaving(true)
    const { error } = await supabase.rpc('platform_create_tenant', {
      p_slug: effectiveSlug,
      p_name: name.trim(),
      // Vacio deja la empresa sin dueno, para asignarlo despues.
      p_owner_email: email.trim() || null,
      p_plan: plan,
      p_trial_days: Number(days) || 0,
    })
    setSaving(false)

    if (error) {
      console.error('Error creando el cliente:', error.message)
      setErr(error.message)
      return
    }
    onDone(`${name.trim()} dado de alta.`)
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHead}>
          <h3>Nuevo cliente</h3>
          <button onClick={onClose} aria-label="Cerrar">✕</button>
        </div>

        <form className={styles.modalBody} onSubmit={submit}>
          <div className={styles.field}>
            <label htmlFor="nt-name">Nombre del restaurante *</label>
            <input id="nt-name" value={name}
              onChange={e => { setName(e.target.value); setErr('') }}
              placeholder="Pizzería Napoli" />
          </div>

          <div className={styles.field}>
            <label htmlFor="nt-slug">Dirección web</label>
            <div className={styles.slugRow}>
              <input id="nt-slug" value={effectiveSlug}
                onChange={e => { setTouched(true); setSlug(slugify(e.target.value)); setErr('') }}
                placeholder="pizzeria-napoli" />
              <span className={styles.slugSuffix}>.{PLATFORM_DOMAIN}</span>
            </div>
            {effectiveSlug.length >= 3 && (
              <p className={available ? styles.slugOk : styles.slugBad}>
                {available ? '✓ Disponible' : 'No disponible o no válida'}
              </p>
            )}
          </div>

          <div className={styles.field}>
            <label htmlFor="nt-email">Correo del dueño</label>
            <input id="nt-email" type="email" value={email}
              onChange={e => { setEmail(e.target.value); setErr('') }}
              placeholder="opcional" />
            <p className={styles.fieldHint}>
              La cuenta debe existir ya. Si lo dejas vacío, podrás asignar el dueño después.
            </p>
          </div>

          <div className={styles.row2}>
            <div className={styles.field}>
              <label htmlFor="nt-plan">Plan</label>
              <select id="nt-plan" value={plan} onChange={e => setPlan(e.target.value)}>
                {plans.map(p => (
                  <option key={p.code} value={p.code}>
                    {p.name} — ${p.price}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label htmlFor="nt-days">Días de prueba</label>
              <input id="nt-days" type="number" min="0" value={days}
                onChange={e => setDays(e.target.value)} />
            </div>
          </div>

          {err && (
            <p className={styles.err} role="alert">
              <IconAlert size={16} /><span>{err}</span>
            </p>
          )}

          <div className={styles.modalFoot}>
            <button type="submit" className={styles.btnSave} disabled={saving || !available}>
              {saving ? 'Creando…' : 'Crear cliente'}
            </button>
            <button type="button" className={styles.btnGhost} onClick={onClose}>Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  )
}
