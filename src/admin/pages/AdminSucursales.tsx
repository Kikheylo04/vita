import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { Branch } from '../../types/admin'
import styles from './AdminSucursales.module.css'
import { BRAND } from '../../config/brand'
import { IconPin, IconAlert, IconCheckCircle } from '../ui/Icons'

const EMPTY: Omit<Branch, 'id'> = {
  name: '', slug: '', address: '', neighborhood: '', city: '',
  phone: '', maps_embed: '', active: true, sort_order: 0,
}

// El slug viaja en la URL publica, asi que se normaliza.
function slugify(v: string) {
  return v.toLowerCase().trim()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export default function AdminSucursales() {
  const [rows, setRows] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Branch | null>(null)
  const [form, setForm] = useState<Omit<Branch, 'id'>>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  async function load() {
    const { data, error } = await supabase
      .from('branches').select('*').order('sort_order', { ascending: true })
    if (error) {
      console.error('Error cargando sucursales:', error.message)
      setMsg({ ok: false, text: 'No se pudieron cargar las sucursales.' })
      setLoading(false)
      return
    }
    setRows((data ?? []) as Branch[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openNew() {
    setForm({ ...EMPTY, sort_order: rows.length })
    setEditing({ id: '' } as Branch)
    setMsg(null)
  }

  function openEdit(b: Branch) {
    const { id, ...rest } = b
    void id
    setForm(rest)
    setEditing(b)
    setMsg(null)
  }

  const handle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target
    setForm(f => ({
      ...f,
      [name]: type === 'checkbox'
        ? (e.target as HTMLInputElement).checked
        : type === 'number' ? Number(value) : value,
    }))
    setMsg(null)
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setMsg({ ok: false, text: 'El nombre es obligatorio.' }); return }

    const payload = { ...form, slug: form.slug.trim() || slugify(form.name) }
    setSaving(true)

    const res = editing?.id
      ? await supabase.from('branches').update(payload).eq('id', editing.id)
      : await supabase.from('branches').insert(payload)

    setSaving(false)

    if (res.error) {
      console.error('Error guardando la sucursal:', res.error.message)
      setMsg({
        ok: false,
        text: res.error.code === '23505'
          ? 'Ya existe una sucursal con ese identificador.'
          : `No se pudo guardar: ${res.error.message}`,
      })
      return
    }

    setEditing(null)
    setMsg({ ok: true, text: editing?.id ? 'Sucursal actualizada.' : 'Sucursal creada.' })
    load()
  }

  async function toggleActive(b: Branch) {
    const { error } = await supabase
      .from('branches').update({ active: !b.active }).eq('id', b.id)
    if (error) {
      console.error('Error cambiando el estado:', error.message)
      setMsg({ ok: false, text: 'No se pudo cambiar el estado.' })
      return
    }
    setRows(prev => prev.map(r => r.id === b.id ? { ...r, active: !r.active } : r))
  }

  async function remove(b: Branch) {
    if (b.slug === 'principal') {
      setMsg({ ok: false, text: 'La sucursal principal no se puede eliminar.' })
      return
    }
    if (!confirm(`¿Eliminar "${b.name}"? Sus pedidos y reservaciones quedarán sin sucursal.`)) return

    const { error } = await supabase.from('branches').delete().eq('id', b.id)
    if (error) {
      console.error('Error eliminando:', error.message)
      setMsg({ ok: false, text: `No se pudo eliminar: ${error.message}` })
      return
    }
    setRows(prev => prev.filter(r => r.id !== b.id))
    setMsg({ ok: true, text: 'Sucursal eliminada.' })
  }

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <div>
          <h2 className={styles.title}>Sucursales</h2>
          <p className={styles.sub}>Los pedidos y reservaciones se registran por sucursal.</p>
        </div>
        <button className={styles.btnNew} onClick={openNew}>+ Nueva sucursal</button>
      </div>

      {msg && (
        <p className={msg.ok ? styles.ok : styles.err} role="alert">
          {msg.ok ? <IconCheckCircle size={16} /> : <IconAlert size={16} />}
          <span>{msg.text}</span>
        </p>
      )}

      {loading ? (
        <p className={styles.empty}>Cargando…</p>
      ) : rows.length === 0 ? (
        <p className={styles.empty}>Aún no hay sucursales.</p>
      ) : (
        <div className={styles.grid}>
          {rows.map(b => (
            <article key={b.id} className={`${styles.card} ${!b.active ? styles.cardOff : ''}`}>
              <div className={styles.cardTop}>
                <span className={styles.pin}><IconPin size={18} /></span>
                <div className={styles.cardInfo}>
                  <h3 className={styles.cardName}>{b.name}</h3>
                  <p className={styles.cardSlug}>/{b.slug}</p>
                </div>
                <span className={b.active ? styles.pillOn : styles.pillOff}>
                  {b.active ? 'Activa' : 'Inactiva'}
                </span>
              </div>

              <dl className={styles.facts}>
                <div>
                  <dt>Dirección</dt>
                  <dd>{b.address || '—'}{b.neighborhood ? `, ${b.neighborhood}` : ''}</dd>
                </div>
                <div>
                  <dt>Teléfono</dt>
                  <dd>{b.phone || '—'}</dd>
                </div>
              </dl>

              <div className={styles.cardActions}>
                <button className={styles.btnGhost} onClick={() => openEdit(b)}>Editar</button>
                <button className={styles.btnGhost} onClick={() => toggleActive(b)}>
                  {b.active ? 'Desactivar' : 'Activar'}
                </button>
                <button className={styles.btnDanger} onClick={() => remove(b)}>Eliminar</button>
              </div>
            </article>
          ))}
        </div>
      )}

      {editing && (
        <div className={styles.overlay} onClick={() => setEditing(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHead}>
              <h3>{editing.id ? 'Editar sucursal' : 'Nueva sucursal'}</h3>
              <button onClick={() => setEditing(null)} aria-label="Cerrar">✕</button>
            </div>

            <form className={styles.modalBody} onSubmit={save}>
              <div className={styles.row2}>
                <div className={styles.field}>
                  <label htmlFor="br-name">Nombre *</label>
                  <input id="br-name" name="name" value={form.name} onChange={handle}
                    placeholder={`${BRAND.name} Centro`} />
                </div>
                <div className={styles.field}>
                  <label htmlFor="br-slug">Identificador</label>
                  <input id="br-slug" name="slug" value={form.slug} onChange={handle}
                    placeholder={form.name ? slugify(form.name) : 'polanco'} />
                </div>
              </div>

              <div className={styles.field}>
                <label htmlFor="br-address">Dirección</label>
                <input id="br-address" name="address" value={form.address} onChange={handle}
                  placeholder="Av. Presidente Masaryk 123" />
              </div>

              <div className={styles.row2}>
                <div className={styles.field}>
                  <label htmlFor="br-hood">Colonia</label>
                  <input id="br-hood" name="neighborhood" value={form.neighborhood} onChange={handle}
                    placeholder="Polanco" />
                </div>
                <div className={styles.field}>
                  <label htmlFor="br-city">Ciudad</label>
                  <input id="br-city" name="city" value={form.city} onChange={handle}
                    placeholder="CDMX" />
                </div>
              </div>

              <div className={styles.row2}>
                <div className={styles.field}>
                  <label htmlFor="br-phone">Teléfono</label>
                  <input id="br-phone" name="phone" value={form.phone} onChange={handle}
                    placeholder="(55) 1234-5678" />
                </div>
                <div className={styles.field}>
                  <label htmlFor="br-order">Orden</label>
                  <input id="br-order" name="sort_order" type="number" value={form.sort_order}
                    onChange={handle} />
                </div>
              </div>

              <label className={styles.check}>
                <input type="checkbox" name="active" checked={form.active} onChange={handle} />
                <span>Activa</span>
              </label>

              {msg && !msg.ok && (
                <p className={styles.err} role="alert">
                  <IconAlert size={16} /><span>{msg.text}</span>
                </p>
              )}

              <div className={styles.modalFoot}>
                <button type="submit" className={styles.btnSave} disabled={saving}>
                  {saving ? 'Guardando…' : editing.id ? 'Guardar cambios' : 'Crear sucursal'}
                </button>
                <button type="button" className={styles.btnGhost} onClick={() => setEditing(null)}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
