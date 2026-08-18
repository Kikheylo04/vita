import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import styles from './PlatformTenants.module.css'
import { IconSearch, IconAlert, IconCheckCircle, IconExternal } from '../ui/Icons'

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

  useEffect(() => { load(); loadDomains() }, [])

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
