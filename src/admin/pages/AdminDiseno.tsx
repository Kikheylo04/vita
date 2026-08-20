import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { TEMPLATE_LIST, getTemplate, type TemplateId } from '../../config/templates'
import styles from './AdminDiseno.module.css'
import { IconCheckCircle, IconAlert } from '../ui/Icons'

/** Colores que el dueño puede pisar sobre la plantilla. */
interface ThemeOverride {
  primary?: string
  gold?: string
}

export default function AdminDiseno() {
  const [current, setCurrent] = useState<TemplateId>('classic')
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [colors, setColors] = useState<ThemeOverride>({})
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  async function load() {
    setLoading(true)
    const { data: billing } = await supabase
      .from('tenant_billing').select('tenant_id').maybeSingle()

    if (!billing) { setLoading(false); return }
    setTenantId(billing.tenant_id)

    const { data, error } = await supabase
      .from('tenants').select('template, brand').eq('id', billing.tenant_id).maybeSingle()
    setLoading(false)

    if (error) { console.error('Error cargando el diseño:', error.message); return }
    if (data) {
      setCurrent((data.template ?? 'classic') as TemplateId)
      const theme = (data.brand as { theme?: ThemeOverride })?.theme ?? {}
      setColors({ primary: theme.primary, gold: theme.gold })
    }
  }

  useEffect(() => { load() }, [])

  async function choose(id: TemplateId) {
    if (!tenantId || id === current) return
    setWorking(true)

    const { error } = await supabase.from('tenants').update({ template: id }).eq('id', tenantId)
    setWorking(false)

    if (error) {
      console.error('Error cambiando la plantilla:', error.message)
      setMsg({ ok: false, text: `No se pudo cambiar: ${error.message}` })
      return
    }
    setCurrent(id)
    setMsg({ ok: true, text: 'Diseño actualizado. Recarga tu sitio para verlo.' })
  }

  async function saveColors() {
    if (!tenantId) return
    setWorking(true)

    // brand es jsonb: se lee, se mezcla y se guarda, para no borrar
    // los demas campos de identidad.
    const { data: row } = await supabase
      .from('tenants').select('brand').eq('id', tenantId).maybeSingle()

    const brand = (row?.brand ?? {}) as Record<string, unknown>
    const theme = { ...(brand.theme as object ?? {}) }

    // Un color vacio vuelve al de la plantilla.
    if (colors.primary) Object.assign(theme, { primary: colors.primary })
    else delete (theme as ThemeOverride).primary
    if (colors.gold) Object.assign(theme, { gold: colors.gold })
    else delete (theme as ThemeOverride).gold

    const { error } = await supabase
      .from('tenants')
      .update({ brand: { ...brand, theme } })
      .eq('id', tenantId)
    setWorking(false)

    if (error) {
      console.error('Error guardando los colores:', error.message)
      setMsg({ ok: false, text: `No se pudo guardar: ${error.message}` })
      return
    }
    setMsg({ ok: true, text: 'Colores guardados.' })
  }

  const tpl = getTemplate(current)

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <div>
          <h2 className={styles.title}>Diseño</h2>
          <p className={styles.sub}>Elige cómo se ve tu sitio público.</p>
        </div>
      </div>

      {msg && (
        <p className={msg.ok ? styles.ok : styles.err} role="alert">
          {msg.ok ? <IconCheckCircle size={16} /> : <IconAlert size={16} />}
          <span>{msg.text}</span>
        </p>
      )}

      {loading ? (
        <p className={styles.empty}>Cargando…</p>
      ) : (
        <>
          <div className={styles.grid}>
            {TEMPLATE_LIST.map(t => {
              const on = t.id === current
              return (
                <article key={t.id} className={`${styles.card} ${on ? styles.cardOn : ''}`}>
                  {/* Vista previa con los colores reales de la plantilla. */}
                  <div
                    className={styles.preview}
                    style={{ background: t.palette.dark, borderRadius: t.radius }}
                  >
                    <div
                      className={styles.previewBar}
                      style={{ background: t.palette.dark2 }}
                    >
                      <span style={{ background: t.palette.gold }} />
                      <span style={{ background: t.palette.textLight }} />
                      <span style={{ background: t.palette.textLight }} />
                    </div>
                    <p
                      className={styles.previewTitle}
                      style={{
                        color: t.palette.text,
                        fontFamily: t.palette.fontHeading,
                        textTransform: t.headingTransform,
                        letterSpacing: t.headingSpacing,
                      }}
                    >
                      Nuestro menú
                    </p>
                    <p className={styles.previewBody} style={{ color: t.palette.textLight }}>
                      Cocina de temporada
                    </p>
                    <span
                      className={styles.previewBtn}
                      style={{
                        background: t.palette.primary,
                        color: t.palette.dark,
                        borderRadius: t.radius,
                      }}
                    >
                      Reservar
                    </span>
                  </div>

                  <div className={styles.cardBody}>
                    <h3 className={styles.cardName}>
                      {t.name}
                      {on && <span className={styles.badge}>Activo</span>}
                    </h3>
                    <p className={styles.cardDesc}>{t.description}</p>
                    <p className={styles.cardMeta}>
                      {t.sections.length} secciones
                    </p>
                  </div>

                  {on ? (
                    <span className={styles.currentTag}>Tu diseño</span>
                  ) : (
                    <button
                      className={styles.btnChoose}
                      onClick={() => choose(t.id)}
                      disabled={working}
                    >
                      Usar este
                    </button>
                  )}
                </article>
              )
            })}
          </div>

          {/* ── Colores propios ── */}
          <section className={styles.colorPanel}>
            <h3 className={styles.panelTitle}>Tus colores</h3>
            <p className={styles.panelSub}>
              Opcional. Si los dejas vacíos se usan los de {tpl.name}.
            </p>

            <div className={styles.colorRow}>
              <label className={styles.colorField}>
                <span>Color principal</span>
                <input
                  type="color"
                  value={colors.primary ?? tpl.palette.primary}
                  onChange={e => setColors(c => ({ ...c, primary: e.target.value }))}
                />
                <code>{colors.primary ?? tpl.palette.primary}</code>
              </label>

              <label className={styles.colorField}>
                <span>Color de acento</span>
                <input
                  type="color"
                  value={colors.gold ?? tpl.palette.gold}
                  onChange={e => setColors(c => ({ ...c, gold: e.target.value }))}
                />
                <code>{colors.gold ?? tpl.palette.gold}</code>
              </label>
            </div>

            <div className={styles.colorActions}>
              <button className={styles.btnSave} onClick={saveColors} disabled={working}>
                {working ? 'Guardando…' : 'Guardar colores'}
              </button>
              <button
                className={styles.btnGhost}
                onClick={() => { setColors({}); saveColors() }}
                disabled={working}
              >
                Usar los de la plantilla
              </button>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
