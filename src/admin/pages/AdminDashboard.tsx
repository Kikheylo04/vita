import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { AdminPage } from '../../types/admin'
import styles from './AdminDashboard.module.css'

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
  date: string
  time: string
  guests: number
  status: string
}

export default function AdminDashboard({ setPage }: { setPage: (p: AdminPage) => void }) {
  const [stats, setStats] = useState<Stats>({ todayReservations: 0, pendingReservations: 0, totalMenuItems: 0, pendingTestimonials: 0, unreadMessages: 0 })
  const [recent, setRecent] = useState<RecentReservation[]>([])
  const [loading, setLoading] = useState(true)

  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    async function load() {
      const [todayRes, pendingRes, menuItems, pendingTest, unreadMsg, recentRes] = await Promise.all([
        supabase.from('reservations').select('id', { count: 'exact', head: true }).eq('date', today),
        supabase.from('reservations').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('menu_items').select('id', { count: 'exact', head: true }).eq('active', true),
        supabase.from('testimonials').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('contact_messages').select('id', { count: 'exact', head: true }).eq('read', false),
        supabase.from('reservations').select('id,name,date,time,guests,status').order('created_at', { ascending: false }).limit(5),
      ])

      setStats({
        todayReservations: todayRes.count ?? 0,
        pendingReservations: pendingRes.count ?? 0,
        totalMenuItems: menuItems.count ?? 0,
        pendingTestimonials: pendingTest.count ?? 0,
        unreadMessages: unreadMsg.count ?? 0,
      })
      setRecent(recentRes.data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const statusLabel: Record<string, string> = {
    pending: 'Pendiente', confirmed: 'Confirmada', cancelled: 'Cancelada'
  }
  const statusClass: Record<string, string> = {
    pending: styles.statusPending, confirmed: styles.statusConfirmed, cancelled: styles.statusCancelled
  }

  const cards = [
    { label: 'Reservas hoy', value: stats.todayReservations, icon: '📅', action: () => setPage('reservaciones'), color: '#D4A843' },
    { label: 'Pendientes de confirmar', value: stats.pendingReservations, icon: '⏳', action: () => setPage('reservaciones'), color: '#f59e0b' },
    { label: 'Platos activos', value: stats.totalMenuItems, icon: '🍽️', action: () => setPage('menu'), color: '#34d399' },
    { label: 'Testimonios por revisar', value: stats.pendingTestimonials, icon: '⭐', action: () => setPage('testimonios'), color: '#818cf8' },
    { label: 'Mensajes no leídos', value: stats.unreadMessages, icon: '✉️', action: () => setPage('mensajes'), color: '#38bdf8' },
  ]

  if (loading) return <div className={styles.loading}>Cargando...</div>

  return (
    <div className={styles.page}>
      <div className={styles.greeting}>
        <h2>Buen día 👋</h2>
        <p>Aquí tienes el resumen de hoy — {new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
      </div>

      <div className={styles.cards}>
        {cards.map(c => (
          <button key={c.label} className={styles.card} onClick={c.action}>
            <div className={styles.cardIcon} style={{ color: c.color }}>{c.icon}</div>
            <div className={styles.cardValue} style={{ color: c.color }}>{c.value}</div>
            <div className={styles.cardLabel}>{c.label}</div>
          </button>
        ))}
      </div>

      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3>Últimas reservaciones</h3>
          <button className={styles.seeAll} onClick={() => setPage('reservaciones')}>Ver todas →</button>
        </div>
        {recent.length === 0 ? (
          <p className={styles.empty}>No hay reservaciones aún.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Fecha</th>
                  <th>Hora</th>
                  <th>Personas</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {recent.map(r => (
                  <tr key={r.id}>
                    <td>{r.name}</td>
                    <td>{r.date}</td>
                    <td>{r.time}</td>
                    <td>{r.guests}</td>
                    <td><span className={`${styles.status} ${statusClass[r.status] ?? ''}`}>{statusLabel[r.status] ?? r.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
