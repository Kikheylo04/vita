import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import styles from './AdminMensajes.module.css'

interface ContactMessage {
  id: string
  name: string
  email: string
  subject: string
  message: string
  read: boolean
  created_at: string
}

export default function AdminMensajes() {
  const [messages, setMessages] = useState<ContactMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase
      .from('contact_messages')
      .select('*')
      .order('created_at', { ascending: false })
    setMessages(data ?? [])
    setLoading(false)
  }

  async function markRead(id: string, read: boolean) {
    await supabase.from('contact_messages').update({ read }).eq('id', id)
    setMessages(prev => prev.map(m => m.id === id ? { ...m, read } : m))
  }

  async function deleteMsg(id: string) {
    if (!confirm('¿Eliminar este mensaje?')) return
    await supabase.from('contact_messages').delete().eq('id', id)
    setMessages(prev => prev.filter(m => m.id !== id))
    if (expanded === id) setExpanded(null)
  }

  const filtered = filter === 'unread' ? messages.filter(m => !m.read) : messages
  const unreadCount = messages.filter(m => !m.read).length

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  if (loading) return <div className={styles.loading}>Cargando mensajes...</div>

  return (
    <div className={styles.page}>
      <div className={styles.filters}>
        <button className={`${styles.tab} ${filter === 'all' ? styles.tabActive : ''}`} onClick={() => setFilter('all')}>
          Todos <span className={styles.count}>{messages.length}</span>
        </button>
        <button className={`${styles.tab} ${filter === 'unread' ? styles.tabActive : ''}`} onClick={() => setFilter('unread')}>
          No leídos <span className={styles.count}>{unreadCount}</span>
        </button>
      </div>

      {filtered.length === 0 ? (
        <p className={styles.empty}>No hay mensajes.</p>
      ) : (
        <div className={styles.list}>
          {filtered.map(msg => (
            <div key={msg.id} className={`${styles.card} ${!msg.read ? styles.cardUnread : ''}`}>
              <div className={styles.cardHeader} onClick={() => {
                setExpanded(expanded === msg.id ? null : msg.id)
                if (!msg.read) markRead(msg.id, true)
              }}>
                <div className={styles.meta}>
                  {!msg.read && <span className={styles.dot} />}
                  <div>
                    <p className={styles.name}>{msg.name}</p>
                    <p className={styles.email}>{msg.email}</p>
                  </div>
                </div>
                <div className={styles.right}>
                  <p className={styles.subject}>{msg.subject}</p>
                  <p className={styles.date}>{formatDate(msg.created_at)}</p>
                </div>
                <span className={styles.chevron}>{expanded === msg.id ? '▲' : '▼'}</span>
              </div>

              {expanded === msg.id && (
                <div className={styles.body}>
                  <p className={styles.message}>{msg.message}</p>
                  <div className={styles.actions}>
                    <a href={`mailto:${msg.email}?subject=Re: ${msg.subject}`} className={styles.btnReply}>
                      ✉️ Responder
                    </a>
                    <button className={styles.btnToggle} onClick={() => markRead(msg.id, !msg.read)}>
                      {msg.read ? 'Marcar no leído' : 'Marcar leído'}
                    </button>
                    <button className={styles.btnDelete} onClick={() => deleteMsg(msg.id)}>
                      🗑 Eliminar
                    </button>
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
