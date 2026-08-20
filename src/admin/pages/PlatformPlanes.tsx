import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import styles from './PlatformFinanzas.module.css'
import { IconAlert, IconCheckCircle } from '../ui/Icons'

interface Plan {
  code: string
  name: string
  price: number
  max_branches: number
  max_users: number
  has_inventory: boolean
  has_custom_domain: boolean
  active: boolean
  sort_order: number
  clients?: number
}

const EMPTY: Plan = {
  code: '', name: '', price: 0,
  max_branches: 1, max_users: 2,
  has_inventory: false, has_custom_domain: false,
  active: true, sort_order: 0,
}

function money(n: number) {
  return Number(n).toLocaleString('es-MX', {
    style: 'currency', currency: 'MXN', maximumFractionDigits: 0,
  })
}

function limitText(n: number) {
  return n < 0 ? 'Sin límite' : String(n)
}

export default function PlatformPlanes() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Plan | null>(null)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  async function load() {
    setLoading(true)
    // Se cruza con el uso real para no dejar archivar un plan con clientes.
    const [p, u] = await Promise.all([
      supabase.from('plans').select('*').order('sort_order'),
      supabase.from('platform_mrr_by_plan').select('code,clients'),
    ])
    setLoading(false)

    if (p.error) {
      console.error('Error cargando planes:', p.error.message)
      setMsg({ ok: false, text: 'No se pudieron cargar los planes.' })
      return
    }
    if (u.error) console.error('Error cargando uso:', u.error.message)

    const usage = new Map((u.data ?? []).map(r => [r.code, r.clients as number]))
    setPlans(((p.data ?? []) as Plan[]).map(pl => ({ ...pl, clients: usage.get(pl.code) ?? 0 })))
  }

  useEffect(() => { load() }, [])

  async function archive(p: Plan) {
    if (!confirm(`¿Archivar el plan "${p.name}"? Dejará de ofrecerse a nuevos clientes.`)) return
    const { error } = await supabase.rpc('archive_plan', { p_code: p.code })
    if (error) {
      console.error('Error archivando el plan:', error.message)
      setMsg({ ok: false, text: error.message })
      return
    }
    setMsg({ ok: true, text: `${p.name} archivado.` })
    load()
  }

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <div>
          <h2 className={styles.title}>Planes</h2>
          <p className={styles.sub}>Precios y límites que ofreces a tus clientes.</p>
        </div>
        <button
          className={styles.btnNew}
          onClick={() => { setEditing({ ...EMPTY, sort_order: plans.length + 1 }); setMsg(null) }}
        >
          + Nuevo plan
        </button>
      </div>

      {msg && (
        <p className={msg.ok ? styles.ok : styles.err} role="alert">
          {msg.ok ? <IconCheckCircle size={16} /> : <IconAlert size={16} />}
          <span>{msg.text}</span>
        </p>
      )}

      {loading ? (
        <p className={styles.empty}>Cargando…</p>
      ) : plans.length === 0 ? (
        <p className={styles.empty}>Aún no hay planes.</p>
      ) : (
        <section className={styles.panel}>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Plan</th>
                  <th className={styles.num}>Precio</th>
                  <th className={styles.num}>Sucursales</th>
                  <th className={styles.num}>Usuarios</th>
                  <th>Módulos</th>
                  <th className={styles.num}>Clientes</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {plans.map(p => (
                  <tr key={p.code} className={!p.active ? styles.rowOff : ''}>
                    <td>
                      <span className={styles.strong}>{p.name}</span>
                      <span className={styles.planCode}>{p.code}</span>
                      {!p.active && <span className={styles.recurTag}>archivado</span>}
                    </td>
                    <td className={`${styles.num} ${styles.strong}`}>{money(p.price)}</td>
                    <td className={styles.num}>{limitText(p.max_branches)}</td>
                    <td className={styles.num}>{limitText(p.max_users)}</td>
                    <td className={styles.muted}>
                      {[
                        p.has_inventory ? 'Inventario' : null,
                        p.has_custom_domain ? 'Dominio propio' : null,
                      ].filter(Boolean).join(' · ') || '—'}
                    </td>
                    <td className={styles.num}>{p.clients}</td>
                    <td className={styles.num}>
                      <button className={styles.btnGhostSm} onClick={() => { setEditing(p); setMsg(null) }}>
                        Editar
                      </button>
                      {p.active && p.clients === 0 && (
                        <button className={styles.btnGhostSm} onClick={() => archive(p)}>
                          Archivar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <p className={styles.footNote}>
        Cambiar un precio no afecta a las suscripciones ya activas en MercadoPago:
        el monto acordado sigue vigente hasta que el cliente vuelva a suscribirse.
      </p>

      {editing && (
        <PlanModal
          plan={editing}
          isNew={!plans.some(p => p.code === editing.code)}
          onClose={() => setEditing(null)}
          onDone={(text) => { setEditing(null); setMsg({ ok: true, text }); load() }}
        />
      )}
    </div>
  )
}

/* ── Editor de plan ───────────────────────── */
function PlanModal({ plan, isNew, onClose, onDone }: {
  plan: Plan
  isNew: boolean
  onClose: () => void
  onDone: (text: string) => void
}) {
  const [form, setForm] = useState<Plan>(plan)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const handle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target
    setForm(f => ({
      ...f,
      [name]: type === 'checkbox'
        ? (e.target as HTMLInputElement).checked
        : type === 'number' ? Number(value) : value,
    }))
    setErr('')
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.code.trim()) { setErr('El código es obligatorio.'); return }
    if (!form.name.trim()) { setErr('El nombre es obligatorio.'); return }

    setSaving(true)
    const { error } = await supabase.rpc('upsert_plan', {
      p_code: form.code.trim().toLowerCase(),
      p_name: form.name.trim(),
      p_price: form.price,
      p_max_branches: form.max_branches,
      p_max_users: form.max_users,
      p_has_inventory: form.has_inventory,
      p_has_custom_domain: form.has_custom_domain,
      p_active: form.active,
      p_sort_order: form.sort_order,
    })
    setSaving(false)

    if (error) {
      console.error('Error guardando el plan:', error.message)
      setErr(error.message)
      return
    }
    onDone(`Plan ${form.name.trim()} guardado.`)
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHead}>
          <h3>{isNew ? 'Nuevo plan' : `Editar ${plan.name}`}</h3>
          <button onClick={onClose} aria-label="Cerrar">✕</button>
        </div>

        <form className={styles.modalBody} onSubmit={submit}>
          <div className={styles.row2}>
            <div className={styles.field}>
              <label htmlFor="pl-name">Nombre *</label>
              <input id="pl-name" name="name" value={form.name} onChange={handle}
                placeholder="Pro" />
            </div>
            <div className={styles.field}>
              <label htmlFor="pl-code">Código *</label>
              <input id="pl-code" name="code" value={form.code} onChange={handle}
                placeholder="pro" disabled={!isNew} />
              {!isNew && <p className={styles.fieldHint}>El código no se puede cambiar.</p>}
            </div>
          </div>

          <div className={styles.field}>
            <label htmlFor="pl-price">Precio mensual (MXN) *</label>
            <input id="pl-price" name="price" type="number" step="1"
              value={form.price} onChange={handle} />
          </div>

          <div className={styles.row2}>
            <div className={styles.field}>
              <label htmlFor="pl-branches">Sucursales</label>
              <input id="pl-branches" name="max_branches" type="number"
                value={form.max_branches} onChange={handle} />
              <p className={styles.fieldHint}>-1 para sin límite.</p>
            </div>
            <div className={styles.field}>
              <label htmlFor="pl-users">Usuarios</label>
              <input id="pl-users" name="max_users" type="number"
                value={form.max_users} onChange={handle} />
              <p className={styles.fieldHint}>-1 para sin límite.</p>
            </div>
          </div>

          <label className={styles.check}>
            <input type="checkbox" name="has_inventory"
              checked={form.has_inventory} onChange={handle} />
            <span>Incluye inventario y recetas</span>
          </label>

          <label className={styles.check}>
            <input type="checkbox" name="has_custom_domain"
              checked={form.has_custom_domain} onChange={handle} />
            <span>Incluye dominio propio</span>
          </label>

          <label className={styles.check}>
            <input type="checkbox" name="active" checked={form.active} onChange={handle} />
            <span>Se ofrece a nuevos clientes</span>
          </label>

          {err && (
            <p className={styles.err} role="alert"><IconAlert size={16} /><span>{err}</span></p>
          )}

          <div className={styles.modalFoot}>
            <button type="submit" className={styles.btnSave} disabled={saving}>
              {saving ? 'Guardando…' : isNew ? 'Crear plan' : 'Guardar cambios'}
            </button>
            <button type="button" className={styles.btnGhost} onClick={onClose}>Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  )
}
