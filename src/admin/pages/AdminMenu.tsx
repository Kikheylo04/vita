import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { AdminMenuItem } from '../../types/admin'
import type { MenuCategory } from '../../types/types'
import { formatPrice } from '../../config/restaurant'
import styles from './AdminMenu.module.css'

const CATEGORIES: MenuCategory[] = ['Entradas', 'Pastas', 'Carnes', 'Mariscos', 'Postres', 'Bebidas']
const BADGES = ['', 'Popular', "Chef's Choice", 'Signature', 'Temporada']

const EMPTY: Omit<AdminMenuItem, 'id'> = {
  cat: 'Entradas', name: '', description: '', description_en: '', price: 0, badge: '', image: '', active: true, sort_order: 0
}

export default function AdminMenu() {
  const [items, setItems] = useState<AdminMenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [catFilter, setCatFilter] = useState<MenuCategory | 'Todo'>('Todo')
  const [editing, setEditing] = useState<AdminMenuItem | null>(null)
  const [form, setForm] = useState<Omit<AdminMenuItem, 'id'>>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [isNew, setIsNew] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const { data } = await supabase.from('menu_items').select('*').order('sort_order').order('cat')
    setItems(data ?? [])
    setLoading(false)
  }

  const filtered = catFilter === 'Todo' ? items : items.filter(i => i.cat === catFilter)

  function openEdit(item: AdminMenuItem) {
    setEditing(item)
    setForm({ cat: item.cat, name: item.name, description: item.description, description_en: item.description_en, price: item.price, badge: item.badge, image: item.image, active: item.active, sort_order: item.sort_order })
    setIsNew(false)
    setUploadError('')
  }

  function openNew() {
    setEditing({ id: '' } as AdminMenuItem)
    setForm({ ...EMPTY, cat: catFilter === 'Todo' ? 'Entradas' : catFilter })
    setIsNew(true)
    setUploadError('')
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value, type } = e.target
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : type === 'number' ? Number(value) : value }))
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      setUploadError('La imagen no puede superar 5 MB.')
      return
    }

    setUploading(true)
    setUploadError('')

    const ext = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const { error } = await supabase.storage
      .from('menu-images')
      .upload(fileName, file, { cacheControl: '3600', upsert: false })

    if (error) {
      setUploadError('Error al subir la imagen. Intenta de nuevo.')
      setUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage
      .from('menu-images')
      .getPublicUrl(fileName)

    setForm(f => ({ ...f, image: publicUrl }))
    setUploading(false)

    // reset input so same file can be re-selected if needed
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleSave() {
    if (!form.name.trim() || !form.price) return
    setSaving(true)
    if (isNew) {
      const { data } = await supabase.from('menu_items').insert([form]).select().single()
      if (data) setItems(prev => [...prev, data])
    } else if (editing) {
      await supabase.from('menu_items').update(form).eq('id', editing.id)
      setItems(prev => prev.map(i => i.id === editing.id ? { ...i, ...form } : i))
    }
    setSaving(false)
    setEditing(null)
  }

  async function toggleActive(id: string, current: boolean) {
    await supabase.from('menu_items').update({ active: !current }).eq('id', id)
    setItems(prev => prev.map(i => i.id === id ? { ...i, active: !current } : i))
  }

  async function deleteItem(id: string) {
    if (!confirm('¿Eliminar este plato?')) return
    await supabase.from('menu_items').delete().eq('id', id)
    setItems(prev => prev.filter(i => i.id !== id))
    setEditing(null)
  }

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <div className={styles.tabs}>
          {(['Todo', ...CATEGORIES] as const).map(c => (
            <button key={c} className={`${styles.tab} ${catFilter === c ? styles.tabActive : ''}`} onClick={() => setCatFilter(c)}>{c}</button>
          ))}
        </div>
        <button className={styles.btnNew} onClick={openNew}>+ Nuevo plato</button>
      </div>

      {loading ? <p className={styles.loading}>Cargando...</p> : (
        <div className={styles.grid}>
          {filtered.map(item => (
            <div key={item.id} className={`${styles.card} ${!item.active ? styles.cardInactive : ''}`}>
              {item.image && <img src={item.image} alt={item.name} className={styles.cardImg} />}
              <div className={styles.cardBody}>
                <div className={styles.cardTop}>
                  <span className={styles.cardCat}>{item.cat}</span>
                  {item.badge && <span className={styles.badge}>{item.badge}</span>}
                </div>
                <h3 className={styles.cardName}>{item.name}</h3>
                <p className={styles.cardDesc}>{item.description}</p>
                <div className={styles.cardFooter}>
                  <span className={styles.price}>{formatPrice(item.price)}</span>
                  <div className={styles.cardActions}>
                    <button className={styles.btnToggle} onClick={() => toggleActive(item.id, item.active)} title={item.active ? 'Desactivar' : 'Activar'}>
                      {item.active ? '👁' : '🚫'}
                    </button>
                    <button className={styles.btnEdit} onClick={() => openEdit(item)}>✏️</button>
                    <button className={styles.btnDel} onClick={() => deleteItem(item.id)}>🗑</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal editar / crear */}
      {editing !== null && (
        <div className={styles.overlay} onClick={() => setEditing(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>{isNew ? 'Nuevo plato' : 'Editar plato'}</h3>
              <button onClick={() => setEditing(null)}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.row2}>
                <div className={styles.field}>
                  <label>Categoría</label>
                  <select name="cat" value={form.cat} onChange={handleChange}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className={styles.field}>
                  <label>Badge</label>
                  <select name="badge" value={form.badge} onChange={handleChange}>
                    {BADGES.map(b => <option key={b} value={b}>{b || '(ninguno)'}</option>)}
                  </select>
                </div>
              </div>
              <div className={styles.field}>
                <label>Nombre del plato *</label>
                <input name="name" value={form.name} onChange={handleChange} placeholder="Ej: Tagliatelle al Ragù" />
              </div>
              <div className={styles.field}>
                <label>Descripción (ES) *</label>
                <textarea name="description" value={form.description} onChange={handleChange} rows={2} placeholder="Descripción en español" />
              </div>
              <div className={styles.field}>
                <label>Descripción (EN)</label>
                <textarea name="description_en" value={form.description_en} onChange={handleChange} rows={2} placeholder="Description in English" />
              </div>
              <div className={styles.row2}>
                <div className={styles.field}>
                  <label>Precio (USD) *</label>
                  <input name="price" type="number" min="0" step="0.01" value={form.price} onChange={handleChange} />
                </div>
                <div className={styles.field}>
                  <label>Orden</label>
                  <input name="sort_order" type="number" min="0" value={form.sort_order} onChange={handleChange} />
                </div>
              </div>

              {/* Imagen */}
              <div className={styles.field}>
                <label>Imagen</label>

                {/* Preview */}
                {form.image && (
                  <div className={styles.imgPreview}>
                    <img src={form.image} alt="preview" />
                    <button className={styles.imgRemove} onClick={() => setForm(f => ({ ...f, image: '' }))} title="Quitar imagen">✕</button>
                  </div>
                )}

                {/* Upload */}
                <div className={styles.imageActions}>
                  <label className={`${styles.btnUpload} ${uploading ? styles.btnUploadLoading : ''}`}>
                    {uploading ? 'Subiendo...' : '📁 Subir desde computadora'}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      onChange={handleImageUpload}
                      disabled={uploading}
                      style={{ display: 'none' }}
                    />
                  </label>
                  <span className={styles.orText}>o</span>
                  <input
                    name="image"
                    value={form.image}
                    onChange={handleChange}
                    placeholder="https://... (URL externa)"
                    className={styles.urlInput}
                  />
                </div>
                {uploadError && <p className={styles.uploadError}>{uploadError}</p>}
                <p className={styles.imgHint}>JPG, PNG o WebP · Máximo 5 MB</p>
              </div>

              <label className={styles.checkLabel}>
                <input type="checkbox" name="active" checked={form.active} onChange={handleChange} />
                Visible en el menú público
              </label>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.btnSave} onClick={handleSave} disabled={saving || uploading || !form.name.trim() || !form.price}>
                {saving ? 'Guardando...' : isNew ? 'Crear plato' : 'Guardar cambios'}
              </button>
              {!isNew && <button className={styles.btnDelModal} onClick={() => deleteItem(editing.id)}>Eliminar</button>}
              <button className={styles.btnCancel} onClick={() => setEditing(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
