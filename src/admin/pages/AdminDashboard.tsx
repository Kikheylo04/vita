import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { AdminPage } from '../../types/admin'
import styles from './AdminDashboard.module.css'
import { BRAND } from '../../config/brand'
import {
  IconCalendar, IconHourglass, IconMenu, IconStar, IconMail, IconCart,
  IconEvent, IconChevronRight, IconClock, IconPin, IconCheckCircle, IconAlert,
} from '../ui/Icons'

interface Stats {
  todayReservations: number
  pendingReservations: number
  totalMenuItems: number
  pendingTestimonials: number
  unreadMessages: number
}

interface RecentReservation {
  id: string
  name: string
  phone: string
  date: string
  time: string
  guests: number
  status: string
}

interface UpcomingEvent {
  id: string
  title: string
  date: string
  description: string
  image_url: string
}

interface WeekPoint { label: string; value: number }

interface Totals {
  reservations: number
  orders: number
  events: number
  testimonials: number
  messages: number
}

// Delta real contra el periodo anterior. null = no hay con que comparar.
interface Deltas {
  todayReservations: number | null
  unreadMessages: number | null
}

const DAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

function isoDay(d: Date) {
  return d.toISOString().split('T')[0]
}

// Lunes de la semana en curso.
function startOfWeek() {
  const d = new Date()
  const dow = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - dow)
  d.setHours(0, 0, 0, 0)
  return d
}

function formatDate(iso: string) {
  const d = new Date(iso + (iso.length === 10 ? 'T12:00:00' : ''))
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.round(diff / 60000)
  if (min < 1) return 'Hace un momento'
  if (min < 60) return `Hace ${min} min`
  const h = Math.round(min / 60)
  if (h < 24) return `Hace ${h} h`
  const d = Math.round(h / 24)
  return `Hace ${d} d`
}

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w.charAt(0).toUpperCase()).join('')
}

// Color estable por nombre, para el avatar.
const AVATAR_HUES = ['--ad-violet', '--ad-info', '--ad-ok', '--ad-pink', '--ad-warn']
function avatarVar(name: string) {
  let sum = 0
  for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i)
  return AVATAR_HUES[sum % AVATAR_HUES.length]
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendiente', confirmed: 'Confirmada', cancelled: 'Cancelada',
}

const STATUS_PILL: Record<string, string> = {
  pending: styles.pillWarn, confirmed: styles.pillOk, cancelled: styles.pillMute,
}

interface Notice {
  id: string
  kind: 'ok' | 'warn' | 'info'
  text: string
  when: string
}

export default function AdminDashboard({ setPage }: { setPage: (p: AdminPage) => void }) {
  const [stats, setStats] = useState<Stats>({
    todayReservations: 0, pendingReservations: 0, totalMenuItems: 0,
    pendingTestimonials: 0, unreadMessages: 0,
  })
  const [deltas, setDeltas] = useState<Deltas>({ todayReservations: null, unreadMessages: null })
  const [recent, setRecent] = useState<RecentReservation[]>([])
  const [week, setWeek] = useState<WeekPoint[]>([])
  const [totals, setTotals] = useState<Totals>({ reservations: 0, orders: 0, events: 0, testimonials: 0, messages: 0 })
  const [event, setEvent] = useState<UpcomingEvent | null>(null)
  const [notices, setNotices] = useState<Notice[]>([])
  const [loading, setLoading] = useState(true)

  const today = isoDay(new Date())

  useEffect(() => {
    const weekStart = startOfWeek()
    const weekStartIso = weekStart.toISOString()
    const yesterday = isoDay(new Date(Date.now() - 86400000))

    Promise.all([
      supabase.from('reservations').select('id', { count: 'exact', head: true }).eq('date', today),
      supabase.from('reservations').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('menu_items').select('id', { count: 'exact', head: true }).eq('active', true),
      supabase.from('testimonials').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('contact_messages').select('id', { count: 'exact', head: true }).eq('read', false),
      supabase.from('reservations').select('id,name,phone,date,time,guests,status,created_at').order('created_at', { ascending: false }).limit(5),
      // Serie semanal y totales
      supabase.from('reservations').select('created_at').gte('created_at', weekStartIso),
      supabase.from('orders').select('created_at').gte('created_at', weekStartIso),
      supabase.from('testimonials').select('created_at').gte('created_at', weekStartIso),
      supabase.from('contact_messages').select('created_at,name,read').gte('created_at', weekStartIso),
      supabase.from('events').select('id,title,date,description,image_url').eq('active', true).gte('date', today).order('date', { ascending: true }).limit(1),
      // Comparativo real: reservaciones de ayer
      supabase.from('reservations').select('id', { count: 'exact', head: true }).eq('date', yesterday),
      supabase.from('events').select('id', { count: 'exact', head: true }).eq('active', true),
    ]).then(([
      todayRes, pendRes, menuCount, pendTest, unread, recentRes,
      weekRes, weekOrders, weekTest, weekMsgs, nextEvent, yestRes, eventCount,
    ]) => {
      const firstError = [todayRes, pendRes, menuCount, pendTest, unread, recentRes,
        weekRes, weekOrders, weekTest, weekMsgs, nextEvent, yestRes, eventCount]
        .find(r => r.error)?.error
      if (firstError) console.error('Error cargando el dashboard:', firstError.message)

      setStats({
        todayReservations: todayRes.count ?? 0,
        pendingReservations: pendRes.count ?? 0,
        totalMenuItems: menuCount.count ?? 0,
        pendingTestimonials: pendTest.count ?? 0,
        unreadMessages: unread.count ?? 0,
      })

      // Solo se calcula el delta donde existe un periodo anterior comparable.
      const yCount = yestRes.count ?? 0
      setDeltas({
        todayReservations: yCount === 0 ? null : Math.round((((todayRes.count ?? 0) - yCount) / yCount) * 100),
        unreadMessages: null,
      })

      setRecent((recentRes.data ?? []) as RecentReservation[])

      // Actividad = filas creadas por dia de la semana en curso.
      const buckets = new Array(7).fill(0)
      const addRows = (rows: { created_at: string }[] | null) => {
        for (const r of rows ?? []) {
          const idx = Math.floor((new Date(r.created_at).getTime() - weekStart.getTime()) / 86400000)
          if (idx >= 0 && idx < 7) buckets[idx]++
        }
      }
      addRows(weekRes.data)
      addRows(weekOrders.data)
      addRows(weekTest.data)
      addRows(weekMsgs.data)
      setWeek(DAY_LABELS.map((label, i) => ({ label, value: buckets[i] })))

      setTotals({
        reservations: weekRes.data?.length ?? 0,
        orders: weekOrders.data?.length ?? 0,
        events: eventCount.count ?? 0,
        testimonials: weekTest.data?.length ?? 0,
        messages: weekMsgs.data?.length ?? 0,
      })

      setEvent((nextEvent.data?.[0] as UpcomingEvent) ?? null)

      // Notificaciones derivadas de lo que ya se consulto.
      const list: Notice[] = []
      const lastConfirmed = (recentRes.data ?? []).find(r => r.status === 'confirmed')
      if (lastConfirmed) {
        list.push({
          id: 'confirmed',
          kind: 'ok',
          text: `Reservación confirmada de ${lastConfirmed.name}`,
          when: relativeTime(lastConfirmed.created_at),
        })
      }
      if ((pendRes.count ?? 0) > 0) {
        list.push({
          id: 'pending',
          kind: 'warn',
          text: `Tienes ${pendRes.count} ${pendRes.count === 1 ? 'reservación pendiente' : 'reservaciones pendientes'}`,
          when: 'Requiere respuesta',
        })
      }
      const lastUnread = (weekMsgs.data ?? []).filter(m => !m.read).slice(-1)[0] as { name: string; created_at: string } | undefined
      if (lastUnread) {
        list.push({
          id: 'msg',
          kind: 'info',
          text: `Nuevo mensaje de ${lastUnread.name}`,
          when: relativeTime(lastUnread.created_at),
        })
      }
      setNotices(list)

      setLoading(false)
    })
  }, [today])

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Buenos días'
    if (h < 19) return 'Buenas tardes'
    return 'Buenas noches'
  })()

  const dateLabel = new Date().toLocaleDateString('es-MX', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  const cards = [
    { key: 'res',   label: 'Reservas hoy',          value: stats.todayReservations,    Icon: IconCalendar,  tint: styles.tintViolet, delta: deltas.todayReservations, page: 'reservaciones' as AdminPage },
    { key: 'pend',  label: 'Pendientes de confirmar', value: stats.pendingReservations, Icon: IconHourglass, tint: styles.tintWarn,   delta: null,                     page: 'reservaciones' as AdminPage },
    { key: 'menu',  label: 'Platos activos',        value: stats.totalMenuItems,       Icon: IconMenu,      tint: styles.tintOk,     delta: null,                     page: 'menu' as AdminPage },
    { key: 'test',  label: 'Testimonios por revisar', value: stats.pendingTestimonials, Icon: IconStar,     tint: styles.tintGold,   delta: null,                     page: 'testimonios' as AdminPage },
    { key: 'msg',   label: 'Mensajes no leídos',    value: stats.unreadMessages,       Icon: IconMail,      tint: styles.tintInfo,   delta: deltas.unreadMessages,    page: 'mensajes' as AdminPage },
  ]

  const totalCards = [
    { label: 'Reservaciones', value: totals.reservations, Icon: IconCalendar, cls: styles.tGold },
    { label: 'Pedidos',       value: totals.orders,       Icon: IconCart,     cls: styles.tOk },
    { label: 'Eventos',       value: totals.events,       Icon: IconEvent,    cls: styles.tWarn },
    { label: 'Testimonios',   value: totals.testimonials, Icon: IconStar,     cls: styles.tViolet },
    { label: 'Mensajes',      value: totals.messages,     Icon: IconMail,     cls: styles.tInfo },
  ]

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <div>
          <h2 className={styles.greeting}>¡{greeting}, Admin!</h2>
          <p className={styles.sub}>Resumen general de tu actividad en {BRAND.name}.</p>
        </div>
        <div className={styles.datePill}>
          <IconCalendar size={16} />
          <span>Hoy, {dateLabel}</span>
        </div>
      </div>

      {/* ── Tarjetas de estado ── */}
      <div className={styles.statGrid}>
        {cards.map(({ key, label, value, Icon, tint, delta, page }) => (
          <button key={key} className={styles.statCard} onClick={() => setPage(page)}>
            <span className={`${styles.statIcon} ${tint}`}><Icon size={20} /></span>
            <span className={styles.statLabel}>{label}</span>
            <span className={styles.statValue}>{loading ? '—' : value}</span>
            {delta !== null && (
              <span className={delta >= 0 ? styles.deltaUp : styles.deltaDown}>
                {delta >= 0 ? '↑' : '↓'} {Math.abs(delta)}% vs ayer
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Actividad + recientes ── */}
      <div className={styles.midGrid}>
        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <h3 className={styles.panelTitle}>Resumen de actividad</h3>
            <span className={styles.panelNote}>Esta semana</span>
          </div>

          <div className={styles.chartBox}>
            <Sparkline points={week} />
          </div>

          <div className={styles.totalsRow}>
            {totalCards.map(({ label, value, Icon, cls }) => (
              <div key={label} className={styles.totalItem}>
                <span className={`${styles.totalValue} ${cls}`}>{value}</span>
                <span className={styles.totalIcon}><Icon size={15} /></span>
                <span className={styles.totalLabel}>{label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <h3 className={styles.panelTitle}>Reservaciones recientes</h3>
            <button className={styles.seeAll} onClick={() => setPage('reservaciones')}>Ver todas</button>
          </div>

          {loading ? (
            <p className={styles.empty}>Cargando…</p>
          ) : recent.length === 0 ? (
            <p className={styles.empty}>No hay reservaciones aún.</p>
          ) : (
            <ul className={styles.resList}>
              {recent.map(r => (
                <li key={r.id}>
                  <button className={styles.resRow} onClick={() => setPage('reservaciones')}>
                    <span
                      className={styles.resAvatar}
                      style={{ background: `color-mix(in srgb, var(${avatarVar(r.name)}) 22%, transparent)`, color: `var(${avatarVar(r.name)})` }}
                      aria-hidden="true"
                    >
                      {initials(r.name)}
                    </span>
                    <span className={styles.resInfo}>
                      <span className={styles.resName}>{r.name}</span>
                      <span className={styles.resMeta}>{r.phone || `${r.guests} personas`}</span>
                    </span>
                    <span className={styles.resDate}>{formatDate(r.date)}</span>
                    <span className={`${styles.pill} ${STATUS_PILL[r.status] ?? styles.pillMute}`}>
                      {STATUS_LABEL[r.status] ?? r.status}
                    </span>
                    <IconChevronRight size={16} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* ── Evento + notificaciones ── */}
      <div className={styles.botGrid}>
        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <h3 className={styles.panelTitle}>Próximo evento</h3>
            <button className={styles.seeAll} onClick={() => setPage('eventos')}>Ver todos</button>
          </div>

          {loading ? (
            <p className={styles.empty}>Cargando…</p>
          ) : !event ? (
            <p className={styles.empty}>No hay eventos programados.</p>
          ) : (
            <div className={styles.eventRow}>
              {event.image_url && (
                <img src={event.image_url} alt="" className={styles.eventImg} loading="lazy" />
              )}
              <div className={styles.eventDate}>
                <span className={styles.eventDay}>{new Date(event.date + 'T12:00:00').getDate()}</span>
                <span className={styles.eventMon}>
                  {new Date(event.date + 'T12:00:00').toLocaleDateString('es-MX', { month: 'short' }).toUpperCase()}
                </span>
              </div>
              <div className={styles.eventBody}>
                <h4 className={styles.eventTitle}>{event.title}</h4>
                <p className={styles.eventDesc}>{event.description}</p>
                <div className={styles.eventMeta}>
                  <span><IconClock size={14} /> {formatDate(event.date)}</span>
                  <span><IconPin size={14} /> Salón principal</span>
                </div>
              </div>
              <button className={styles.eventBtn} onClick={() => setPage('eventos')}>Ver detalles</button>
            </div>
          )}
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <h3 className={styles.panelTitle}>Notificaciones</h3>
          </div>

          {loading ? (
            <p className={styles.empty}>Cargando…</p>
          ) : notices.length === 0 ? (
            <p className={styles.empty}>Nada pendiente por ahora.</p>
          ) : (
            <ul className={styles.noticeList}>
              {notices.map(n => (
                <li key={n.id} className={styles.noticeRow}>
                  <span className={`${styles.noticeIcon} ${n.kind === 'ok' ? styles.nOk : n.kind === 'warn' ? styles.nWarn : styles.nInfo}`}>
                    {n.kind === 'ok' ? <IconCheckCircle size={17} /> : n.kind === 'warn' ? <IconAlert size={17} /> : <IconMail size={17} />}
                  </span>
                  <span className={styles.noticeBody}>
                    <span className={styles.noticeText}>{n.text}</span>
                    <span className={styles.noticeWhen}>{n.when}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}

/* ── Gráfica de área ─────────────────────── */
function Sparkline({ points }: { points: WeekPoint[] }) {
  if (points.length === 0) return null

  const W = 560
  const H = 190
  const padL = 30
  const padB = 26
  const padT = 12

  const max = Math.max(5, ...points.map(p => p.value))
  const step = (W - padL) / Math.max(1, points.length - 1)
  const y = (v: number) => padT + (1 - v / max) * (H - padT - padB)
  const x = (i: number) => padL + i * step

  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ')
  const area = `${line} L${x(points.length - 1).toFixed(1)},${H - padB} L${padL},${H - padB} Z`

  const ticks = [0, Math.round(max / 2), max]

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={styles.chart} role="img" aria-label="Actividad de la semana">
      <defs>
        <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--ad-gold)" stopOpacity="0.28" />
          <stop offset="100%" stopColor="var(--ad-gold)" stopOpacity="0" />
        </linearGradient>
      </defs>

      {ticks.map(t => (
        <g key={t}>
          <line x1={padL} y1={y(t)} x2={W} y2={y(t)} stroke="var(--ad-line)" strokeWidth="1" />
          <text x={padL - 8} y={y(t) + 4} textAnchor="end" className={styles.axis}>{t}</text>
        </g>
      ))}

      <path d={area} fill="url(#areaFill)" />
      <path d={line} fill="none" stroke="var(--ad-gold)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

      {points.map((p, i) => (
        <circle key={p.label} cx={x(i)} cy={y(p.value)} r="3.6" fill="var(--ad-gold)" />
      ))}

      {points.map((p, i) => (
        <text key={p.label} x={x(i)} y={H - 7} textAnchor="middle" className={styles.axis}>{p.label}</text>
      ))}
    </svg>
  )
}
