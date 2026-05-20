import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import styles from './AdminConfig.module.css'

interface ConfigRow {
  key: string
  value: string
  label: string
  type: 'text' | 'email' | 'tel' | 'url' | 'number' | 'textarea'
  group: string
}

const CONFIG_SCHEMA: Omit<ConfigRow, 'value'>[] = [
  { key: 'name',             label: 'Nombre corto',          type: 'text',     group: 'Restaurante' },
  { key: 'full_name',        label: 'Nombre completo',       type: 'text',     group: 'Restaurante' },
  { key: 'tagline',          label: 'Tagline',               type: 'text',     group: 'Restaurante' },
  { key: 'founded_year',     label: 'Año de fundación',      type: 'text',     group: 'Restaurante' },
  { key: 'phone',            label: 'Teléfono (visible)',    type: 'tel',      group: 'Contacto' },
  { key: 'phone_raw',        label: 'Teléfono WhatsApp (sin símbolos)', type: 'tel', group: 'Contacto' },
  { key: 'email',            label: 'Correo de contacto',   type: 'email',    group: 'Contacto' },
  { key: 'address',          label: 'Dirección',             type: 'text',     group: 'Ubicación' },
  { key: 'neighborhood',     label: 'Colonia / Barrio',      type: 'text',     group: 'Ubicación' },
  { key: 'city',             label: 'Ciudad (corto)',        type: 'text',     group: 'Ubicación' },
  { key: 'city_full',        label: 'Ciudad (completo)',     type: 'text',     group: 'Ubicación' },
  { key: 'zip',              label: 'Código postal',         type: 'text',     group: 'Ubicación' },
  { key: 'maps_embed',       label: 'URL del embed de Google Maps', type: 'textarea', group: 'Ubicación' },
  { key: 'instagram',        label: 'Instagram (sin @)',     type: 'text',     group: 'Redes sociales' },
  { key: 'instagram_url',    label: 'URL de Instagram',      type: 'url',      group: 'Redes sociales' },
  { key: 'facebook_url',     label: 'URL de Facebook',       type: 'url',      group: 'Redes sociales' },
  { key: 'chef_name',        label: 'Nombre del chef',       type: 'text',     group: 'Chef' },
  { key: 'chef_title',       label: 'Título del chef (ES)',  type: 'text',     group: 'Chef' },
  { key: 'chef_title_en',    label: 'Título del chef (EN)',  type: 'text',     group: 'Chef' },
  { key: 'hours_lunch',      label: 'Horario de comida',     type: 'text',     group: 'Horarios' },
  { key: 'hours_dinner',     label: 'Horario de cena',       type: 'text',     group: 'Horarios' },
  { key: 'hours_note',       label: 'Nota de horarios (ES)', type: 'text',     group: 'Horarios' },
  { key: 'hours_note_en',    label: 'Nota de horarios (EN)', type: 'text',     group: 'Horarios' },
  { key: 'currency',         label: 'Código de moneda (ISO)', type: 'text',    group: 'Moneda' },
  { key: 'currency_symbol',  label: 'Símbolo de moneda',     type: 'text',     group: 'Moneda' },
  { key: 'currency_locale',  label: 'Locale (ej: es-MX)',    type: 'text',     group: 'Moneda' },
  { key: 'usd_rate',         label: 'Tipo de cambio (1 USD = ?)', type: 'number', group: 'Moneda' },
]

export default function AdminConfig() {
  const [values, setValues] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const { data } = await supabase.from('config').select('key,value')
    // Precarga los valores del schema con string vacío, luego sobreescribe con lo que haya en BD
    const map: Record<string, string> = {}
    for (const field of CONFIG_SCHEMA) map[field.key] = ''
    for (const row of data ?? []) map[row.key] = row.value
    setValues(map)
    setLoading(false)
  }

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    const rows = Object.entries(values).map(([key, value]) => ({ key, value }))
    await supabase.from('config').upsert(rows, { onConflict: 'key' })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const groups = [...new Set(CONFIG_SCHEMA.map(f => f.group))]

  if (loading) return <p className={styles.loading}>Cargando configuración...</p>

  return (
    <div className={styles.page}>
      <div className={styles.banner}>
        <span>⚙️</span>
        <p>Los cambios aquí se guardan en la base de datos. Para que afecten el sitio, conecta los componentes a esta tabla o haz un redeploy después de exportar.</p>
      </div>

      <div className={styles.groups}>
        {groups.map(group => (
          <div key={group} className={styles.group}>
            <h3 className={styles.groupTitle}>{group}</h3>
            <div className={styles.fields}>
              {CONFIG_SCHEMA.filter(f => f.group === group).map(field => (
                <div key={field.key} className={styles.field}>
                  <label htmlFor={`cfg-${field.key}`}>{field.label}</label>
                  {field.type === 'textarea' ? (
                    <textarea
                      id={`cfg-${field.key}`}
                      rows={3}
                      value={values[field.key] ?? ''}
                      onChange={e => setValues(v => ({ ...v, [field.key]: e.target.value }))}
                    />
                  ) : (
                    <input
                      id={`cfg-${field.key}`}
                      type={field.type}
                      value={values[field.key] ?? ''}
                      onChange={e => setValues(v => ({ ...v, [field.key]: e.target.value }))}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className={styles.footer}>
        {saved && <span className={styles.savedMsg}>✓ Guardado correctamente</span>}
        <button className={styles.btnSave} onClick={handleSave} disabled={saving}>
          {saving ? 'Guardando...' : 'Guardar configuración'}
        </button>
      </div>
    </div>
  )
}
