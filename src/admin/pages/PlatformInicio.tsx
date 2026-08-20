import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { AdminPage } from '../../types/admin'
import styles from './PlatformInicio.module.css'
import { IconAlert, IconChevronRight } from '../ui/Icons'

interface Dashboard {
  clients_total: number
  clients_active: number
  clients_trial: number
  clients_suspended: number
  new_30d: number
  trials_ending: number
  idle_clients: number
  mrr: number
  collected_this_month: number
}

interface Signup {
  tenant_id: string
  name: string
  slug: string
  status: string
  plan: string
  created_at: string
  owner_email: string | null
  menu_items: number
}

interface Idle {
  tenant_id: string
  name: string
  status: string
  last_seen: string
  days_idle: number
  menu_items: number
}

interface Ending {
  id: string
  name: string
  trial_ends_at: string
  reason: string | null
}

function money(n: number) {
  return Number(n).toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 })
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
}

function daysTo(iso: string) {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000)
}

export default function PlatformInicio({ setPage, openClient }: {
  setPage: (p: AdminPage) => void
  openClient: (id: string) => void
}) {
  const [d, setD] = useState<Dashboard | null>(null)
  const [signups, setSignups] = useState<Signup[]>([])
  const [idle, setIdle] = useState<Idle[]>([])
  const [ending, setEnding] = useState<Ending[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      supabase.from('platform_dashboard').select('*').maybeSingle(),
      supabase.from('platform_recent_signups').select('*').limit(5),
      supabase.from('platform_idle').select('*').limit(5),
      supabase.from('platform_at_risk').select('id,name,trial_ends_at,reason').limit(5),
    ]).then(([a, b, c, e]) => {
      setLoading(false)
      const err = [a, b, c, e].find(x => x.error)?.error
      // La migracion de insight puede no estar corrida: se muestra
      // vacio en vez de romper la pantalla.
      if (err && !err.message.includes('does not exist')) {
        console.error('Error cargando el tablero:', err.message)
      }
      setD(a.data as Dashboard | null)
      setSignups((b.data ?? []) as Signup[])
      setIdle((c.data ?? []) as Idle[])
      setEnding((e.data ?? []) as Ending[])
    })
  }, [])

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Buenos días'
    if (h < 19) return 'Buenas tardes'
    return 'Buenas noches'
  })()

  // Lo que pide accion hoy, en un solo lugar.
  const alerts = [
    d?.trials_ending ? {
      key: 'trials',
      text: `${d.trials_ending} ${d.trials_ending === 1 ? 'prueba vence' : 'pruebas vencen'} esta semana`,
      tone: styles.alertWarn,
    } : null,
    d?.idle_clients ? {
      key: 'idle',
      text: `${d.idle_clients} ${d.idle_clients === 1 ? 'cliente activo no usa' : 'clientes activos no usan'} el sistema`,
      tone: styles.alertCrit,
    } : null,
    d?.clients_suspended ? {
      key: 'susp',
      text: `${d.clients_suspended} ${d.clients_suspended === 1 ? 'cuenta suspendida' : 'cuentas suspendidas'}`,
      tone: styles.alertWarn,
    } : null,
  ].filter(Boolean) as { key: string; text: string; tone: string }[]

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <h2 className={styles.greeting}>{greeting}</h2>
        <p className={styles.sub}>
          {loading ? 'Cargando…'
            : d?.clients_total
              ? `${d.clients_total} ${d.clients_total === 1 ? 'restaurante' : 'restaurantes'} en la plataforma.`
              : 'Aún no hay clientes registrados.'}
        </p>
      </div>

      {/* ── Cifras ── */}
      <div className={styles.kpis}>
        <button className={styles.kpi} onClick={() => setPage('finanzas')}>
          <span className={styles.kpiLabel}>Ingreso recurrente</span>
          <span className={styles.kpiValue}>{money(d?.mrr ?? 0)}</span>
          <span className={styles.kpiNote}>al mes</span>
        </button>

        <button className={styles.kpi} onClick={() => setPage('clientes')}>
          <span className={styles.kpiLabel}>Clientes activos</span>
          <span className={styles.kpiValue}>{d?.clients_active ?? 0}</span>
          <span className={styles.kpiNote}>{d?.clients_trial ?? 0} en prueba</span>
        </button>

        <button className={styles.kpi} onClick={() => setPage('clientes')}>
          <span className={styles.kpiLabel}>Altas del mes</span>
          <span className={styles.kpiValue}>{d?.new_30d ?? 0}</span>
          <span className={styles.kpiNote}>últimos 30 días</span>
        </button>

        <button className={styles.kpi} onClick={() => setPage('finanzas')}>
          <span className={styles.kpiLabel}>Cobrado este mes</span>
          <span className={styles.kpiValue}>{money(d?.collected_this_month ?? 0)}</span>
          <span className={styles.kpiNote}>pagos confirmados</span>
        </button>
      </div>

      {/* ── Requiere atención ── */}
      {alerts.length > 0 && (
        <section className={styles.alerts}>
          {alerts.map(a => (
            <p key={a.key} className={`${styles.alert} ${a.tone}`}>
              <IconAlert size={16} />
              <span>{a.text}</span>
            </p>
          ))}
        </section>
      )}

      <div className={styles.grid}>
        {/* ── Altas recientes ── */}
        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <h3 className={styles.panelTitle}>Altas recientes</h3>
            <button className={styles.seeAll} onClick={() => setPage('clientes')}>Ver todos</button>
          </div>

          {loading ? (
            <p className={styles.empty}>Cargando…</p>
          ) : signups.length === 0 ? (
            <p className={styles.empty}>Sin clientes todavía.</p>
          ) : (
            <ul className={styles.list}>
              {signups.map(s => (
                <li key={s.tenant_id}>
                  <button className={styles.row} onClick={() => openClient(s.tenant_id)}>
                    <div className={styles.rowInfo}>
                      <span className={styles.rowMain}>{s.name}</span>
                      <span className={styles.rowSub}>
                        {s.owner_email ?? 'sin dueño'} · {s.menu_items} platillos
                      </span>
                    </div>
                    <span className={styles.rowMeta}>{fmtDate(s.created_at)}</span>
                    <IconChevronRight size={15} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ── Pruebas por vencer ── */}
        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <h3 className={styles.panelTitle}>Por vencer</h3>
          </div>

          {loading ? (
            <p className={styles.empty}>Cargando…</p>
          ) : ending.length === 0 ? (
            <p className={styles.empty}>Nada por vencer.</p>
          ) : (
            <ul className={styles.list}>
              {ending.map(e => {
                const left = daysTo(e.trial_ends_at)
                return (
                  <li key={e.id}>
                    <button className={styles.row} onClick={() => openClient(e.id)}>
                      <div className={styles.rowInfo}>
                        <span className={styles.rowMain}>{e.name}</span>
                        <span className={styles.rowSub}>{e.reason ?? 'Prueba'}</span>
                      </div>
                      <span className={left < 0 ? styles.tagCrit : styles.tagWarn}>
                        {left < 0 ? 'vencida' : left === 0 ? 'hoy' : `${left} d`}
                      </span>
                      <IconChevronRight size={15} />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>

      {/* ── Sin actividad ── */}
      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <h3 className={styles.panelTitle}>Sin actividad reciente</h3>
          <span className={styles.panelNote}>Riesgo de cancelación</span>
        </div>

        {loading ? (
          <p className={styles.empty}>Cargando…</p>
        ) : idle.length === 0 ? (
          <p className={styles.empty}>Todos los clientes están usando el sistema.</p>
        ) : (
          <ul className={styles.list}>
            {idle.map(c => (
              <li key={c.tenant_id}>
                <button className={styles.row} onClick={() => openClient(c.tenant_id)}>
                  <div className={styles.rowInfo}>
                    <span className={styles.rowMain}>{c.name}</span>
                    <span className={styles.rowSub}>
                      {c.menu_items} platillos · último uso {fmtDate(c.last_seen)}
                    </span>
                  </div>
                  <span className={c.days_idle > 21 ? styles.tagCrit : styles.tagWarn}>
                    {c.days_idle} días
                  </span>
                  <IconChevronRight size={15} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
