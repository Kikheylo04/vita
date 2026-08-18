import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { AdminOrder, OrderStatus, PaymentStatus } from '../../types/admin'
import styles from './AdminPedidos.module.css'

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending:   'Pendiente',
  confirmed: 'Confirmado',
  ready:     'Listo',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
}

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending:   '#f59e0b',
  confirmed: '#3b82f6',
  ready:     '#10b981',
  delivered: '#6b7280',
  cancelled: '#ef4444',
}

// Etiquetas del cobro. Se muestran aparte del estado en cocina porque un
// pedido puede estar listo y sin pagar, o pagado y aun sin preparar.
const PAY_LABELS: Record<PaymentStatus, string> = {
  unpaid:   'Por cobrar',
  pending:  'Pago en proceso',
  paid:     'Pagado',
  failed:   'Pago fallido',
  refunded: 'Reembolsado',
}

// adPill da forma y tamano; la variante solo el color. theme.css es un import
// global (no .module.css), asi que estas clases se usan como string literal.
const PAY_PILL: Record<PaymentStatus, string> = {
  unpaid:   'adPill adPillMute',
  pending:  'adPill adPillWarn',
  paid:     'adPill adPillOk',
  failed:   'adPill adPillCrit',
  refunded: 'adPill adPillMute',
}

export default function AdminPedidos() {
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [filter, setFilter] = useState<OrderStatus | 'all'>('all')

  const load = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('orders')
      .select('*, order_items(name, price, quantity)')
      .order('created_at', { ascending: false })
    setOrders((data as AdminOrder[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const updateStatus = async (id: string, status: OrderStatus) => {
    await supabase.from('orders').update({ status }).eq('id', id)
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o))
  }

  const deleteOrder = async (id: string) => {
    if (!confirm('¿Eliminar este pedido?')) return
    await supabase.from('orders').delete().eq('id', id)
    setOrders(prev => prev.filter(o => o.id !== id))
    if (expanded === id) setExpanded(null)
  }

  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter)

  const counts = orders.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div className={styles.wrap}>
      <div className={styles.topbar}>
        <div className={styles.stats}>
          {(['all', 'pending', 'confirmed', 'ready', 'delivered', 'cancelled'] as const).map(s => (
            <button
              key={s}
              className={`${styles.statBtn} ${filter === s ? styles.statActive : ''}`}
              onClick={() => setFilter(s)}
            >
              {s === 'all' ? 'Todos' : STATUS_LABELS[s]}
              <span className={styles.statCount}>{s === 'all' ? orders.length : (counts[s] ?? 0)}</span>
            </button>
          ))}
        </div>
        <button className={styles.refreshBtn} onClick={load}>↻ Actualizar</button>
      </div>

      {loading ? (
        <p className={styles.loading}>Cargando pedidos...</p>
      ) : filtered.length === 0 ? (
        <p className={styles.empty}>No hay pedidos{filter !== 'all' ? ` con estado "${STATUS_LABELS[filter as OrderStatus]}"` : ''}.</p>
      ) : (
        <div className={styles.list}>
          {filtered.map(order => (
            <div key={order.id} className={styles.card}>
              <div className={styles.cardHeader} onClick={() => setExpanded(expanded === order.id ? null : order.id)}>
                <div className={styles.cardLeft}>
                  <span className={styles.statusDot} style={{ background: STATUS_COLORS[order.status] }} />
                  <div>
                    <p className={styles.cardName}>{order.name}</p>
                    <p className={styles.cardMeta}>{order.date} · {order.time} · {order.guests} pax</p>
                  </div>
                </div>
                <div className={styles.cardRight}>
                  <span className={PAY_PILL[order.payment_status] ?? 'adPill adPillMute'}>
                    {PAY_LABELS[order.payment_status] ?? order.payment_status}
                  </span>
                  <span className={styles.cardTotal}>${Number(order.total).toFixed(2)}</span>
                  <span className={styles.cardChevron}>{expanded === order.id ? '▲' : '▼'}</span>
                </div>
              </div>

              {expanded === order.id && (
                <div className={styles.cardBody}>
                  <div className={styles.infoGrid}>
                    <div><span className={styles.infoLabel}>Correo</span><p>{order.email}</p></div>
                    <div><span className={styles.infoLabel}>Teléfono</span><p>{order.phone}</p></div>
                    <div>
                      <span className={styles.infoLabel}>Cobro</span>
                      <p>
                        {PAY_LABELS[order.payment_status] ?? order.payment_status}
                        {order.payment_method === 'mercadopago' ? ' · MercadoPago' : ' · En restaurante'}
                      </p>
                    </div>
                    {order.paid_at && (
                      <div>
                        <span className={styles.infoLabel}>Pagado el</span>
                        <p>{new Date(order.paid_at).toLocaleString('es-MX')}</p>
                      </div>
                    )}
                    {order.amount_paid != null && Number(order.amount_paid) !== Number(order.total) && (
                      <div className={styles.infoFull}>
                        <span className={styles.infoLabel}>Revisar</span>
                        <p>Cobrado ${Number(order.amount_paid).toFixed(2)} contra un total de ${Number(order.total).toFixed(2)}.</p>
                      </div>
                    )}
                    {order.notes && <div className={styles.infoFull}><span className={styles.infoLabel}>Notas</span><p>{order.notes}</p></div>}
                  </div>

                  {order.order_items && order.order_items.length > 0 && (
                    <div className={styles.items}>
                      <p className={styles.itemsTitle}>Platillos</p>
                      {order.order_items.map((item, i) => (
                        <div key={i} className={styles.item}>
                          <span className={styles.itemQty}>{item.quantity}×</span>
                          <span className={styles.itemName}>{item.name}</span>
                          <span className={styles.itemPrice}>${(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className={styles.actions}>
                    <div className={styles.statusBtns}>
                      {(['pending', 'confirmed', 'ready', 'delivered', 'cancelled'] as OrderStatus[]).map(s => (
                        <button
                          key={s}
                          className={`${styles.statusBtn} ${order.status === s ? styles.statusBtnActive : ''}`}
                          style={order.status === s ? { background: STATUS_COLORS[s], borderColor: STATUS_COLORS[s] } : {}}
                          onClick={() => updateStatus(order.id, s)}
                        >
                          {STATUS_LABELS[s]}
                        </button>
                      ))}
                    </div>
                    <button className={styles.deleteBtn} onClick={() => deleteOrder(order.id)}>🗑 Eliminar</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
