import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { AdminTestimonial, TestimonialStatus } from '../../types/admin'
import styles from './AdminTestimonios.module.css'

const STATUS_LABEL: Record<TestimonialStatus, string> = {
  pending: 'Pendiente', approved: 'Aprobado', rejected: 'Rechazado'
}

export default function AdminTestimonios() {
  const [rows, setRows] = useState<AdminTestimonial[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<TestimonialStatus | 'all'>('pending')
  const [updating, setUpdating] = useState<string | null>(null)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const { data } = await supabase.from('testimonials').select('*').order('created_at', { ascending: false })
    setRows(data ?? [])
    setLoading(false)
  }

  const filtered = filter === 'all' ? rows : rows.filter(r => r.status === filter)

  async function updateStatus(id: string, status: TestimonialStatus) {
    setUpdating(id)
    await supabase.from('testimonials').update({ status }).eq('id', id)
    setRows(prev => prev.map(r => r.id === id ? { ...r, status } : r))
    setUpdating(null)
  }

  async function deleteRow(id: string) {
    if (!confirm('¿Eliminar este testimonio?')) return
    await supabase.from('testimonials').delete().eq('id', id)
    setRows(prev => prev.filter(r => r.id !== id))
  }

  const stars = (n: number) => '★'.repeat(n) + '☆'.repeat(5 - n)

  const counts = {
    all: rows.length,
    pending: rows.filter(r => r.status === 'pending').length,
    approved: rows.filter(r => r.status === 'approved').length,
    rejected: rows.filter(r => r.status === 'rejected').length,
  }

  return (
    <div className={styles.page}>
      <div className={styles.filters}>
        {(['pending', 'approved', 'rejected', 'all'] as const).map(s => (
          <button key={s} className={`${styles.tab} ${filter === s ? styles.tabActive : ''}`} onClick={() => setFilter(s)}>
            {s === 'all' ? 'Todos' : STATUS_LABEL[s]}
            <span className={styles.count}>{counts[s]}</span>
          </button>
        ))}
      </div>

      {loading ? <p className={styles.loading}>Cargando...</p> :
       filtered.length === 0 ? <p className={styles.empty}>No hay testimonios en este estado.</p> : (
        <div className={styles.list}>
          {filtered.map(r => (
            <div key={r.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.author}>
                  {r.avatar ? <img src={r.avatar} alt={r.name} className={styles.avatar} /> : <div className={styles.avatarFallback}>{r.name[0]}</div>}
                  <div>
                    <p className={styles.name}>{r.name}</p>
                    <p className={styles.role}>{r.role}</p>
                  </div>
                </div>
                <div className={styles.meta}>
                  <span className={styles.stars}>{stars(r.rating)}</span>
                  <span className={styles.date}>{new Date(r.created_at).toLocaleDateString('es-MX')}</span>
                </div>
              </div>
              <p className={styles.comment}>"{r.comment}"</p>
              <div className={styles.actions}>
                {r.status !== 'approved' && (
                  <button className={styles.btnApprove} onClick={() => updateStatus(r.id, 'approved')} disabled={updating === r.id}>
                    ✓ Aprobar
                  </button>
                )}
                {r.status !== 'rejected' && (
                  <button className={styles.btnReject} onClick={() => updateStatus(r.id, 'rejected')} disabled={updating === r.id}>
                    ✕ Rechazar
                  </button>
                )}
                {r.status === 'approved' && <span className={styles.live}>● En vivo</span>}
                <button className={styles.btnDelete} onClick={() => deleteRow(r.id)}>🗑</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
