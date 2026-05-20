import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { AdminEvent } from '../../types/admin'
import styles from './AdminEventos.module.css'

const EMPTY: Omit<AdminEvent, 'id'> = {
  title: '', title_en: '', date: '', description: '', description_en: '', image_url: '', active: true
}

export default function AdminEventos() {
  const [events, setEvents] = useState<AdminEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<AdminEvent | null>(null)
  const [form, setForm] = useState<Omit<AdminEvent, 'id'>>(EMPTY)
  const [isNew, setIsNew] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const { data } = await supabase.from('events').select('*').order('date', { ascending: false })
    setEvents(data ?? [])
    setLoading(false)
  }

  function openEdit(ev: AdminEvent) {
    setEditing(ev)
    setForm({ title: ev.title, title_en: ev.title_en, date: ev.date, description: ev.description, description_en: ev.description_en, image_url: ev.image_url, active: ev.active })
    setIsNew(false)
  }

  function openNew() {
    setEditing({ id: '' } as AdminEvent)
    setForm(EMPTY)
    setIsNew(true)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value, type } = e.target
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value }))
  }

  async function handleSave() {
    if (!form.title.trim() || !form.date) return
    setSaving(true)
    if (isNew) {
      const { data } = await supabase.from('events').insert([form]).select().single()
      if (data) setEvents(prev => [data, ...prev])
    } else if (editing) {
      await supabase.from('events').update(form).eq('id', editing.id)
      setEvents(prev => prev.map(e => e.id === editing.id ? { ...e, ...form } : e))
    }
    setSaving(false)
    setEditing(null)
  }

  async function deleteEvent(id: string) {
    if (!confirm('¿Eliminar este evento?')) return
    await supabase.from('events').delete().eq('id', id)
    setEvents(prev => prev.filter(e => e.id !== id))
    setEditing(null)
  }

  async function toggleActive(id: string, current: boolean) {
    await supabase.from('events').update({ active: !current }).eq('id', id)
    setEvents(prev => prev.map(e => e.id === id ? { ...e, active: !current } : e))
  }

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <p className={styles.hint}>Los eventos activos aparecen en la sección de eventos del sitio.</p>
        <button className={styles.btnNew} onClick={openNew}>+ Nuevo evento</button>
      </div>

      {loading ? <p className={styles.loading}>Cargando...</p> :
       events.length === 0 ? <p className={styles.empty}>No hay eventos creados.</p> : (
        <div className={styles.list}>
          {events.map(ev => (
            <div key={ev.id} className={`${styles.card} ${!ev.active ? styles.cardInactive : ''}`}>
              {ev.image_url && <img src={ev.image_url} alt={ev.title} className={styles.cardImg} />}
              <div className={styles.cardBody}>
                <div className={styles.cardMeta}>
                  <span className={styles.date}>{new Date(ev.date + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                  <span className={ev.active ? styles.activeTag : styles.inactiveTag}>{ev.active ? 'Activo' : 'Inactivo'}</span>
                </div>
                <h3 className={styles.title}>{ev.title}</h3>
                <p className={styles.desc}>{ev.description}</p>
                <div className={styles.cardActions}>
                  <button className={styles.btnToggle} onClick={() => toggleActive(ev.id, ev.active)}>{ev.active ? 'Desactivar' : 'Activar'}</button>
                  <button className={styles.btnEdit} onClick={() => openEdit(ev)}>✏️ Editar</button>
                  <button className={styles.btnDel} onClick={() => deleteEvent(ev.id)}>🗑</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing !== null && (
        <div className={styles.overlay} onClick={() => setEditing(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>{isNew ? 'Nuevo evento' : 'Editar evento'}</h3>
              <button onClick={() => setEditing(null)}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.row2}>
                <div className={styles.field}>
                  <label>Título (ES) *</label>
                  <input name="title" value={form.title} onChange={handleChange} placeholder="Nombre del evento" />
                </div>
                <div className={styles.field}>
                  <label>Título (EN)</label>
                  <input name="title_en" value={form.title_en} onChange={handleChange} placeholder="Event name" />
                </div>
              </div>
              <div className={styles.field}>
                <label>Fecha *</label>
                <input name="date" type="date" value={form.date} onChange={handleChange} />
              </div>
              <div className={styles.field}>
                <label>Descripción (ES)</label>
                <textarea name="description" value={form.description} onChange={handleChange} rows={3} placeholder="Descripción del evento..." />
              </div>
              <div className={styles.field}>
                <label>Descripción (EN)</label>
                <textarea name="description_en" value={form.description_en} onChange={handleChange} rows={3} placeholder="Event description..." />
              </div>
              <div className={styles.field}>
                <label>URL de imagen</label>
                <input name="image_url" value={form.image_url} onChange={handleChange} placeholder="https://..." />
              </div>
              <label className={styles.checkLabel}>
                <input type="checkbox" name="active" checked={form.active} onChange={handleChange} />
                Mostrar en el sitio
              </label>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.btnSave} onClick={handleSave} disabled={saving || !form.title.trim() || !form.date}>
                {saving ? 'Guardando...' : isNew ? 'Crear evento' : 'Guardar'}
              </button>
              {!isNew && <button className={styles.btnDelModal} onClick={() => deleteEvent(editing.id)}>Eliminar</button>}
              <button className={styles.btnCancel} onClick={() => setEditing(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
