import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { getTemplate } from '../../config/templates'
import styles from './PlatformCliente.module.css'
import { IconAlert, IconCheckCircle, IconExternal, IconChevronRight } from '../ui/Icons'

interface Detail {
  tenant: {
    id: string
    name: string
    slug: string
    status: string
    plan: string
    template: string
    custom_domain: string | null
    domain_status: string
    trial_ends_at: string
    created_at: string
  }
  activity: {
    last_seen: string
    orders_total: number
    orders_30d: number
    reservations_30d: number
    menu_items: number
    branches: number
    users: number
  } | null
  plan: { name: string; price: number; max_branches: number; max_users: number } | null
  users: { email: string; role: string; branch_name: string | null; last_sign_in_at: string | null }[]
  branches: { id: string; name: string; slug: string; active: boolean }[]
  payments: { amount: number; status: string; paid_at: string | null }[]
  notes: { id: string; body: string; author: string; created_at: string }[]
  audit: { action: string; actor: string; created_at: string }[]
}

const PLATFORM_DOMAIN = (import.meta.env.VITE_PLATFORM_DOMAIN as string) || 'laplataforma.com'

const STATUS_LABEL: Record<string, string> = {
  trial: 'Prueba', active: 'Activa', suspended: 'Suspendida', cancelled: 'Cancelada',
}

const ROLE_LABEL: Record<string, string> = {
  owner: 'Dueño', manager: 'Encargado', platform: 'Plataforma',
}

const ACTION_LABEL: Record<string, string> = {
  status_change: 'Cambio de estado',
  trial_extended: 'Prueba extendida',
  impersonation_start: 'Entró a la cuenta',
  impersonation_end: 'Salió de la cuenta',
  grant_platform: 'Acceso de operador',
  revoke_platform: 'Acceso retirado',
}

function money(n: number) {
  return Number(n).toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 })
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
}

function relative(iso: string | null) {
  if (!iso) return 'nunca'
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (days === 0) return 'hoy'
  if (days === 1) return 'ayer'
  if (days < 30) return `hace ${days} días`
  const months = Math.floor(days / 30)
  return `hace ${months} ${months === 1 ? 'mes' : 'meses'}`
}

export default function PlatformCliente({ tenantId, onBack }: {
  tenantId: string
  onBack: () => void
}) {
  const [d, setD] = useState<Detail | null>(null)
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [note, setNote] = useState('')

  async function load() {
    setLoading(true)
    const { data, error } = await supabase.rpc('tenant_detail', { p_tenant: tenantId })
    setLoading(false)
    if (error) {
      console.error('Error cargando la ficha:', error.message)
      setMsg({ ok: false, text: error.message })
      return
    }
    setD(data as Detail)
  }

  useEffect(() => { load() }, [tenantId])

  async function saveNote(e: React.FormEvent) {
    e.preventDefault()
    if (note.trim().length < 2) return

    const { error } = await supabase.rpc('add_tenant_note', {
      p_tenant: tenantId, p_body: note.trim(),
    })
    if (error) {
      console.error('Error guardando la nota:', error.message)
      setMsg({ ok: false, text: error.message })
      return
    }
    setNote('')
    load()
  }

  async function removeNote(id: string) {
    const { error } = await supabase.rpc('delete_tenant_note', { p_note: id })
    if (error) {
      console.error('Error borrando la nota:', error.message)
      setMsg({ ok: false, text: error.message })
      return
    }
    load()
  }

  async function enterAccount() {
    const { error } = await supabase.rpc('start_impersonation', { p_tenant: tenantId })
    if (error) {
      console.error('Error entrando a la cuenta:', error.message)
      setMsg({ ok: false, text: error.message })
      return
    }
    window.location.reload()
  }

  if (loading) return <p className={styles.empty}>Cargando…</p>

  if (!d?.tenant) {
    return (
      <div className={styles.page}>
        <button className={styles.back} onClick={onBack}>← Clientes</button>
        <p className={styles.empty}>No se encontró el cliente.</p>
      </div>
    )
  }

  const t = d.tenant
  const url = t.custom_domain && t.domain_status === 'connected'
    ? t.custom_domain
    : `${t.slug}.${PLATFORM_DOMAIN}`

  const idleDays = d.activity
    ? Math.floor((Date.now() - new Date(d.activity.last_seen).getTime()) / 86400000)
    : 0

  return (
    <div className={styles.page}>
      <button className={styles.back} onClick={onBack}>← Clientes</button>

      {msg && (
        <p className={msg.ok ? styles.ok : styles.err} role="alert">
          {msg.ok ? <IconCheckCircle size={16} /> : <IconAlert size={16} />}
          <span>{msg.text}</span>
        </p>
      )}

      {/* ── Encabezado ── */}
      <header className={styles.head}>
        <div>
          <h2 className={styles.title}>{t.name}</h2>
          <a className={styles.url} href={`https://${url}`} target="_blank" rel="noreferrer">
            {url} <IconExternal size={12} />
          </a>
        </div>
        <div className={styles.headRight}>
          <span className={`${styles.badge} ${styles['badge_' + t.status]}`}>
            {STATUS_LABEL[t.status] ?? t.status}
          </span>
          <button className={styles.btnEnter} onClick={enterAccount}>Entrar a su panel</button>
        </div>
      </header>

      {/* ── Aviso de inactividad ── */}
      {idleDays >= 7 && (
        <p className={styles.warn}>
          <IconAlert size={16} />
          <span>
            Sin actividad desde {relative(d.activity?.last_seen ?? null)}.
            Un cliente que no usa el sistema no lo renueva.
          </span>
        </p>
      )}

      {/* ── Datos ── */}
      <div className={styles.grid}>
        <section className={styles.panel}>
          <h3 className={styles.panelTitle}>Cuenta</h3>
          <dl className={styles.facts}>
            <div><dt>Plan</dt><dd>{d.plan?.name ?? t.plan} · {money(d.plan?.price ?? 0)}/mes</dd></div>
            <div><dt>Diseño</dt><dd>{getTemplate(t.template).name}</dd></div>
            <div><dt>Alta</dt><dd>{fmtDate(t.created_at)}</dd></div>
            {t.status === 'trial' && (
              <div><dt>Prueba vence</dt><dd>{fmtDate(t.trial_ends_at)}</dd></div>
            )}
            <div>
              <dt>Dominio propio</dt>
              <dd>{t.custom_domain ? `${t.custom_domain} (${t.domain_status})` : 'No'}</dd>
            </div>
          </dl>
        </section>

        <section className={styles.panel}>
          <h3 className={styles.panelTitle}>Uso</h3>
          <dl className={styles.facts}>
            <div><dt>Última actividad</dt><dd>{relative(d.activity?.last_seen ?? null)}</dd></div>
            <div><dt>Pedidos (30 días)</dt><dd>{d.activity?.orders_30d ?? 0}</dd></div>
            <div><dt>Reservaciones (30 días)</dt><dd>{d.activity?.reservations_30d ?? 0}</dd></div>
            <div>
              <dt>Platillos</dt>
              <dd>{d.activity?.menu_items ?? 0}</dd>
            </div>
            <div>
              <dt>Sucursales</dt>
              <dd>
                {d.activity?.branches ?? 0}
                {d.plan && d.plan.max_branches > 0 && ` de ${d.plan.max_branches}`}
              </dd>
            </div>
          </dl>
        </section>
      </div>

      {/* ── Usuarios ── */}
      <section className={styles.panel}>
        <h3 className={styles.panelTitle}>Usuarios</h3>
        {d.users.length === 0 ? (
          <p className={styles.inner}>Sin usuarios. Este cliente no puede entrar a su panel.</p>
        ) : (
          <ul className={styles.list}>
            {d.users.map(u => (
              <li key={u.email} className={styles.row}>
                <div className={styles.rowInfo}>
                  <span className={styles.rowMain}>{u.email}</span>
                  <span className={styles.rowSub}>
                    {ROLE_LABEL[u.role] ?? u.role}
                    {u.branch_name && ` · ${u.branch_name}`}
                  </span>
                </div>
                <span className={styles.rowMeta}>
                  Último acceso {relative(u.last_sign_in_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Sucursales ── */}
      {d.branches.length > 0 && (
        <section className={styles.panel}>
          <h3 className={styles.panelTitle}>Sucursales</h3>
          <ul className={styles.list}>
            {d.branches.map(b => (
              <li key={b.id} className={styles.row}>
                <div className={styles.rowInfo}>
                  <span className={styles.rowMain}>{b.name}</span>
                  <span className={styles.rowSub}>/{b.slug}</span>
                </div>
                <span className={b.active ? styles.pillOk : styles.pillOff}>
                  {b.active ? 'Activa' : 'Inactiva'}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── Cobros ── */}
      <section className={styles.panel}>
        <h3 className={styles.panelTitle}>Cobros</h3>
        {d.payments.length === 0 ? (
          <p className={styles.inner}>Sin cobros registrados.</p>
        ) : (
          <ul className={styles.list}>
            {d.payments.map((p, i) => (
              <li key={i} className={styles.row}>
                <div className={styles.rowInfo}>
                  <span className={styles.rowMain}>{money(p.amount)}</span>
                  <span className={styles.rowSub}>{fmtDate(p.paid_at)}</span>
                </div>
                <span className={p.status === 'approved' ? styles.pillOk : styles.pillOff}>
                  {p.status === 'approved' ? 'Pagado' : p.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Notas ── */}
      <section className={styles.panel}>
        <h3 className={styles.panelTitle}>Notas internas</h3>
        <form className={styles.noteForm} onSubmit={saveNote}>
          <input
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Lo acordado en la última llamada…"
            aria-label="Nueva nota"
          />
          <button type="submit" disabled={note.trim().length < 2}>Guardar</button>
        </form>

        {d.notes.length === 0 ? (
          <p className={styles.inner}>Sin notas.</p>
        ) : (
          <ul className={styles.list}>
            {d.notes.map(n => (
              <li key={n.id} className={styles.row}>
                <div className={styles.rowInfo}>
                  <span className={styles.noteBody}>{n.body}</span>
                  <span className={styles.rowSub}>
                    {n.author} · {fmtDate(n.created_at)}
                  </span>
                </div>
                <button
                  className={styles.btnX}
                  onClick={() => removeNote(n.id)}
                  aria-label="Borrar nota"
                >✕</button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Historial ── */}
      <section className={styles.panel}>
        <h3 className={styles.panelTitle}>Historial</h3>
        {d.audit.length === 0 ? (
          <p className={styles.inner}>Sin acciones registradas.</p>
        ) : (
          <ul className={styles.list}>
            {d.audit.map((a, i) => (
              <li key={i} className={styles.row}>
                <span className={styles.auditIcon}><IconChevronRight size={14} /></span>
                <div className={styles.rowInfo}>
                  <span className={styles.rowMain}>{ACTION_LABEL[a.action] ?? a.action}</span>
                  <span className={styles.rowSub}>{a.actor}</span>
                </div>
                <span className={styles.rowMeta}>{fmtDate(a.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
