import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { AdminReservation, ReservationStatus } from '../../types/admin'
import styles from './AdminReservaciones.module.css'

const STATUS_LABEL: Record<ReservationStatus, string> = {
  pending: 'Pendiente', confirmed: 'Confirmada', cancelled: 'Cancelada'
}
const STATUS_CLASS: Record<ReservationStatus, string> = {
  pending: styles.statusPending, confirmed: styles.statusConfirmed, cancelled: styles.statusCancelled
}

export default function AdminReservaciones() {
  const [rows, setRows] = useState<AdminReservation[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<ReservationStatus | 'all'>('all')
  const [dateFilter, setDateFilter] = useState('')
  const [selected, setSelected] = useState<AdminReservation | null>(null)
  const [updating, setUpdating] = useState(false)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const { data } = await supabase
      .from('reservations')
      .select('*')
      .order('date', { ascending: true })
      .order('time', { ascending: true })
    setRows(data ?? [])
    setLoading(false)
  }

  const filtered = rows.filter(r => {
    if (filter !== 'all' && r.status !== filter) return false
    if (dateFilter && r.date !== dateFilter) return false
    return true
  })

  async function updateStatus(id: string, status: ReservationStatus) {
    setUpdating(true)
    await supabase.from('reservations').update({ status }).eq('id', id)
    setRows(prev => prev.map(r => r.id === id ? { ...r, status } : r))
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, status } : null)
    setUpdating(false)
  }

  async function deleteRow(id: string) {
    if (!confirm('¿Eliminar esta reservación?')) return
    await supabase.from('reservations').delete().eq('id', id)
    setRows(prev => prev.filter(r => r.id !== id))
    setSelected(null)
  }

  return (
    <div className={styles.page}>
      {/* Filtros */}
      <div className={styles.filters}>
        <div className={styles.tabs}>
          {(['all', 'pending', 'confirmed', 'cancelled'] as const).map(s => (
            <button key={s} className={`${styles.tab} ${filter === s ? styles.tabActive : ''}`} onClick={() => setFilter(s)}>
              {s === 'all' ? 'Todas' : STATUS_LABEL[s]}
              <span className={styles.count}>{s === 'all' ? rows.length : rows.filter(r => r.status === s).length}</span>
            </button>
          ))}
        </div>
        <input
          type="date"
          className={styles.dateInput}
          value={dateFilter}
          onChange={e => setDateFilter(e.target.value)}
          title="Filtrar por fecha"
        />
        {dateFilter && <button className={styles.clearDate} onClick={() => setDateFilter('')}>✕ Limpiar fecha</button>}
      </div>

      {loading ? (
        <p className={styles.loading}>Cargando...</p>
      ) : filtered.length === 0 ? (
        <p className={styles.empty}>No hay reservaciones con estos filtros.</p>
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
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id} className={styles.row} onClick={() => setSelected(r)}>
                  <td>
                    <div className={styles.nameCell}>
                      <span className={styles.name}>{r.name}</span>
                      <span className={styles.email}>{r.email}</span>
                    </div>
                  </td>
                  <td>{r.date}</td>
                  <td>{r.time}</td>
                  <td>{r.guests}</td>
                  <td><span className={`${styles.status} ${STATUS_CLASS[r.status]}`}>{STATUS_LABEL[r.status]}</span></td>
                  <td onClick={e => e.stopPropagation()}>
                    <div className={styles.actions}>
                      {r.status !== 'confirmed' && (
                        <button className={styles.btnConfirm} onClick={() => updateStatus(r.id, 'confirmed')} disabled={updating}>✓</button>
                      )}
                      {r.status !== 'cancelled' && (
                        <button className={styles.btnCancel} onClick={() => updateStatus(r.id, 'cancelled')} disabled={updating}>✕</button>
                      )}
                      <button className={styles.btnDelete} onClick={() => deleteRow(r.id)}>🗑</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detalle */}
      {selected && (
        <div className={styles.detailOverlay} onClick={() => setSelected(null)}>
          <div className={styles.detail} onClick={e => e.stopPropagation()}>
            <div className={styles.detailHeader}>
              <h3>Detalle de reservación</h3>
              <button onClick={() => setSelected(null)}>✕</button>
            </div>
            <div className={styles.detailBody}>
              <Row label="Cliente" value={selected.name} />
              <Row label="Email" value={selected.email} />
              <Row label="Teléfono" value={selected.phone} />
              <Row label="Fecha" value={selected.date} />
              <Row label="Hora" value={selected.time} />
              <Row label="Personas" value={String(selected.guests)} />
              {selected.notes && <Row label="Notas" value={selected.notes} />}
              <Row label="Estado" value={STATUS_LABEL[selected.status]} />
              <Row label="Recibida" value={new Date(selected.created_at).toLocaleString('es-MX')} />
            </div>
            <div className={styles.detailFooter}>
              {selected.status !== 'confirmed' && (
                <button className={styles.btnConfirmLg} onClick={() => updateStatus(selected.id, 'confirmed')} disabled={updating}>
                  ✓ Confirmar
                </button>
              )}
              {selected.status !== 'cancelled' && (
                <button className={styles.btnCancelLg} onClick={() => updateStatus(selected.id, 'cancelled')} disabled={updating}>
                  ✕ Cancelar
                </button>
              )}
              <button className={styles.btnDeleteLg} onClick={() => deleteRow(selected.id)}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.detailRow}>
      <span className={styles.detailLabel}>{label}</span>
      <span className={styles.detailValue}>{value}</span>
    </div>
  )
}
