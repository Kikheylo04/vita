import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import styles from './PlatformFinanzas.module.css'
import { IconAlert, IconCheckCircle } from '../ui/Icons'

interface Summary {
  mrr: number
  paying_clients: number
  in_trial: number
  suspended: number
  total_clients: number
  monthly_costs: number
  collected_this_month: number
  spent_this_month: number
}

interface PlanRow {
  code: string
  name: string
  price: number
  clients: number
  revenue: number
}

interface PnlRow {
  month: string
  revenue: number
  expenses: number
  profit: number
  margin_pct: number
}

interface Expense {
  id: string
  concept: string
  category: string
  amount: number
  recurring: boolean
  incurred_on: string
  note: string
}

interface Payment {
  id: string
  tenant_name: string
  amount: number
  status: string
  paid_at: string
  plan: string | null
}

interface Operator {
  id: string
  email: string
}

interface AtRisk {
  id: string
  name: string
  status: string
  price: number
  reason: string | null
  trial_ends_at: string
  last_activity: string | null
}

const CATEGORIES = ['Hosting', 'Dominios', 'Herramientas', 'Marketing', 'Comisiones', 'Impuestos', 'Otros']

function money(n: number) {
  return Number(n).toLocaleString('es-MX', {
    style: 'currency', currency: 'MXN', maximumFractionDigits: 0,
  })
}

function monthLabel(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })
}

function fmtDate(iso: string | null) {
  if (!iso) return 'Sin actividad'
  return new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
}

export default function PlatformFinanzas() {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [byPlan, setByPlan] = useState<PlanRow[]>([])
  const [pnl, setPnl] = useState<PnlRow[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [risk, setRisk] = useState<AtRisk[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [operators, setOperators] = useState<Operator[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  async function load() {
    setLoading(true)
    const [s, p, l, e, r, pay, ops] = await Promise.all([
      supabase.from('platform_summary').select('*').maybeSingle(),
      supabase.from('platform_mrr_by_plan').select('*'),
      supabase.from('platform_pnl').select('*').limit(6),
      supabase.from('platform_expenses').select('*').order('incurred_on', { ascending: false }).limit(20),
      supabase.from('platform_at_risk').select('*').limit(10),
      supabase.from('platform_payments').select('*').limit(15),
      supabase.from('platform_operators').select('id,email'),
    ])
    setLoading(false)

    // Los cobros y operadores necesitan la migracion de soporte:
    // si falta, se muestran vacios en vez de romper la pantalla.
    if (pay.error && !pay.error.message.includes('does not exist')) {
      console.error('Error cargando cobros:', pay.error.message)
    }
    if (ops.error && !ops.error.message.includes('does not exist')) {
      console.error('Error cargando operadores:', ops.error.message)
    }
    setPayments((pay.data ?? []) as Payment[])
    setOperators((ops.data ?? []) as Operator[])

    const firstError = [s, p, l, e, r].find(x => x.error)?.error
    if (firstError) {
      console.error('Error cargando finanzas:', firstError.message)
      setMsg({ ok: false, text: 'No se pudieron cargar las finanzas.' })
    }

    setSummary(s.data as Summary | null)
    setByPlan((p.data ?? []) as PlanRow[])
    setPnl((l.data ?? []) as PnlRow[])
    setExpenses((e.data ?? []) as Expense[])
    setRisk((r.data ?? []) as AtRisk[])
  }

  useEffect(() => { load() }, [])

  async function addOperator() {
    const email = prompt('Correo del nuevo operador. La cuenta debe existir ya.')
    if (!email?.trim()) return

    const { error } = await supabase.rpc('grant_platform_access', { p_email: email.trim() })
    if (error) {
      console.error('Error dando acceso:', error.message)
      setMsg({ ok: false, text: error.message })
      return
    }
    setMsg({ ok: true, text: `${email.trim()} ahora es operador.` })
    load()
  }

  async function removeOperator(o: Operator) {
    if (!confirm(`¿Quitar el acceso de plataforma a ${o.email}?`)) return

    const { error } = await supabase.rpc('revoke_platform_access', { p_email: o.email })
    if (error) {
      console.error('Error quitando acceso:', error.message)
      setMsg({ ok: false, text: error.message })
      return
    }
    setMsg({ ok: true, text: `Acceso de ${o.email} retirado.` })
    load()
  }

  async function removeExpense(x: Expense) {
    if (!confirm(`¿Eliminar "${x.concept}"?`)) return
    const { error } = await supabase.from('platform_expenses').delete().eq('id', x.id)
    if (error) {
      console.error('Error eliminando el gasto:', error.message)
      setMsg({ ok: false, text: `No se pudo eliminar: ${error.message}` })
      return
    }
    setMsg({ ok: true, text: 'Gasto eliminado.' })
    load()
  }

  const profit = summary ? summary.collected_this_month - summary.spent_this_month : 0

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <div>
          <h2 className={styles.title}>Finanzas</h2>
          <p className={styles.sub}>Lo que gana y lo que cuesta la plataforma.</p>
        </div>
        <button className={styles.btnNew} onClick={() => { setAdding(true); setMsg(null) }}>
          + Registrar gasto
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
      ) : (
        <>
          {/* ── Cifras clave ── */}
          <div className={styles.kpis}>
            <div className={styles.kpi}>
              <span className={styles.kpiLabel}>Ingreso mensual recurrente</span>
              <span className={styles.kpiValue}>{money(summary?.mrr ?? 0)}</span>
              <span className={styles.kpiNote}>
                {summary?.paying_clients ?? 0} {summary?.paying_clients === 1 ? 'cliente activo' : 'clientes activos'}
              </span>
            </div>

            <div className={styles.kpi}>
              <span className={styles.kpiLabel}>Cobrado este mes</span>
              <span className={styles.kpiValue}>{money(summary?.collected_this_month ?? 0)}</span>
              <span className={styles.kpiNote}>Pagos confirmados</span>
            </div>

            <div className={styles.kpi}>
              <span className={styles.kpiLabel}>Gasto este mes</span>
              <span className={`${styles.kpiValue} ${styles.kpiSpend}`}>
                {money(summary?.spent_this_month ?? 0)}
              </span>
              <span className={styles.kpiNote}>
                {money(summary?.monthly_costs ?? 0)} fijos
              </span>
            </div>

            <div className={styles.kpi}>
              <span className={styles.kpiLabel}>Utilidad del mes</span>
              <span className={`${styles.kpiValue} ${profit >= 0 ? styles.kpiUp : styles.kpiDown}`}>
                {money(profit)}
              </span>
              <span className={styles.kpiNote}>Cobrado menos gastos</span>
            </div>
          </div>

          <div className={styles.grid2}>
            {/* ── Ingreso por plan ── */}
            <section className={styles.panel}>
              <h3 className={styles.panelTitle}>Ingreso por plan</h3>
              {byPlan.length === 0 ? (
                <p className={styles.empty}>Sin planes.</p>
              ) : (
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Plan</th>
                      <th className={styles.num}>Precio</th>
                      <th className={styles.num}>Clientes</th>
                      <th className={styles.num}>Ingreso</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byPlan.map(p => (
                      <tr key={p.code}>
                        <td className={styles.strong}>{p.name}</td>
                        <td className={styles.num}>{money(p.price)}</td>
                        <td className={styles.num}>{p.clients}</td>
                        <td className={`${styles.num} ${styles.strong}`}>{money(p.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>

            {/* ── Clientes en riesgo ── */}
            <section className={styles.panel}>
              <h3 className={styles.panelTitle}>
                Requieren seguimiento
                {risk.length > 0 && <span className={styles.countBadge}>{risk.length}</span>}
              </h3>
              {risk.length === 0 ? (
                <p className={styles.empty}>Nadie en riesgo. Buen momento.</p>
              ) : (
                <ul className={styles.riskList}>
                  {risk.map(r => (
                    <li key={r.id} className={styles.riskRow}>
                      <div className={styles.riskInfo}>
                        <span className={styles.riskName}>{r.name}</span>
                        <span className={styles.riskMeta}>
                          Último pedido: {fmtDate(r.last_activity)}
                        </span>
                      </div>
                      <span className={styles.riskTag}>{r.reason ?? r.status}</span>
                      <span className={styles.riskAmount}>{money(r.price)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          {/* ── Estado de resultados ── */}
          <section className={styles.panel}>
            <h3 className={styles.panelTitle}>Últimos meses</h3>
            {pnl.length === 0 ? (
              <p className={styles.empty}>Aún no hay movimientos registrados.</p>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Mes</th>
                      <th className={styles.num}>Ingresos</th>
                      <th className={styles.num}>Gastos</th>
                      <th className={styles.num}>Utilidad</th>
                      <th className={styles.num}>Margen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pnl.map(m => (
                      <tr key={m.month}>
                        <td className={styles.strong}>{monthLabel(m.month)}</td>
                        <td className={styles.num}>{money(m.revenue)}</td>
                        <td className={styles.num}>{money(m.expenses)}</td>
                        <td className={`${styles.num} ${m.profit >= 0 ? styles.up : styles.down}`}>
                          {money(m.profit)}
                        </td>
                        <td className={`${styles.num} ${m.margin_pct >= 0 ? styles.up : styles.down}`}>
                          {m.margin_pct}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* ── Historial de cobros ── */}
          <section className={styles.panel}>
            <h3 className={styles.panelTitle}>Cobros recibidos</h3>
            {payments.length === 0 ? (
              <p className={styles.empty}>
                Sin cobros todavía. Aparecerán cuando un cliente pague su suscripción.
              </p>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Cliente</th>
                      <th>Plan</th>
                      <th>Fecha</th>
                      <th>Estado</th>
                      <th className={styles.num}>Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map(x => (
                      <tr key={x.id}>
                        <td className={styles.strong}>{x.tenant_name}</td>
                        <td className={styles.muted}>{x.plan ?? '—'}</td>
                        <td className={styles.muted}>{fmtDate(x.paid_at)}</td>
                        <td>
                          <span className={x.status === 'approved' ? styles.up : styles.muted}>
                            {x.status === 'approved' ? 'Pagado' : x.status}
                          </span>
                        </td>
                        <td className={`${styles.num} ${styles.strong}`}>{money(x.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* ── Operadores ── */}
          <section className={styles.panel}>
            <h3 className={styles.panelTitle}>
              Operadores
              <button className={styles.btnGhostSm} onClick={addOperator}>+ Agregar</button>
            </h3>
            {operators.length === 0 ? (
              <p className={styles.empty}>Corre la migración de soporte para administrar operadores.</p>
            ) : (
              <ul className={styles.riskList}>
                {operators.map(o => (
                  <li key={o.id} className={styles.riskRow}>
                    <div className={styles.riskInfo}>
                      <span className={styles.riskName}>{o.email}</span>
                      <span className={styles.riskMeta}>Acceso completo a la plataforma</span>
                    </div>
                    {operators.length > 1 && (
                      <button className={styles.btnGhostSm} onClick={() => removeOperator(o)}>
                        Quitar
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* ── Gastos ── */}
          <section className={styles.panel}>
            <h3 className={styles.panelTitle}>Gastos registrados</h3>
            {expenses.length === 0 ? (
              <p className={styles.empty}>
                Sin gastos. Registra tu hosting y herramientas para ver tu margen real.
              </p>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Concepto</th>
                      <th>Categoría</th>
                      <th>Fecha</th>
                      <th className={styles.num}>Monto</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map(x => (
                      <tr key={x.id}>
                        <td>
                          <span className={styles.strong}>{x.concept}</span>
                          {x.recurring && <span className={styles.recurTag}>mensual</span>}
                        </td>
                        <td className={styles.muted}>{x.category}</td>
                        <td className={styles.muted}>{fmtDate(x.incurred_on)}</td>
                        <td className={styles.num}>{money(x.amount)}</td>
                        <td className={styles.num}>
                          <button className={styles.btnX} onClick={() => removeExpense(x)} aria-label="Eliminar">
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      {adding && (
        <ExpenseModal
          onClose={() => setAdding(false)}
          onDone={(text) => { setAdding(false); setMsg({ ok: true, text }); load() }}
        />
      )}
    </div>
  )
}

/* ── Registro de gasto ────────────────────── */
function ExpenseModal({ onClose, onDone }: {
  onClose: () => void
  onDone: (text: string) => void
}) {
  const [form, setForm] = useState({
    concept: '', category: 'Hosting', amount: '',
    recurring: false, incurred_on: new Date().toISOString().split('T')[0], note: '',
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const handle = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    setForm(f => ({
      ...f,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }))
    setErr('')
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const amount = Number(form.amount)
    if (form.concept.trim().length < 2) { setErr('Escribe el concepto.'); return }
    if (!form.amount || Number.isNaN(amount) || amount < 0) { setErr('Indica un monto válido.'); return }

    setSaving(true)
    const { error } = await supabase.rpc('add_expense', {
      p_concept: form.concept.trim(),
      p_category: form.category,
      p_amount: amount,
      p_recurring: form.recurring,
      p_incurred_on: form.incurred_on,
      p_note: form.note.trim(),
    })
    setSaving(false)

    if (error) {
      console.error('Error registrando el gasto:', error.message)
      setErr(error.message)
      return
    }
    onDone(`${form.concept.trim()} registrado.`)
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHead}>
          <h3>Registrar gasto</h3>
          <button onClick={onClose} aria-label="Cerrar">✕</button>
        </div>

        <form className={styles.modalBody} onSubmit={submit}>
          <div className={styles.field}>
            <label htmlFor="ex-concept">Concepto *</label>
            <input id="ex-concept" name="concept" value={form.concept} onChange={handle}
              placeholder="Supabase Pro" />
          </div>

          <div className={styles.row2}>
            <div className={styles.field}>
              <label htmlFor="ex-cat">Categoría</label>
              <select id="ex-cat" name="category" value={form.category} onChange={handle}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className={styles.field}>
              <label htmlFor="ex-amount">Monto *</label>
              <input id="ex-amount" name="amount" type="number" step="0.01"
                value={form.amount} onChange={handle} placeholder="0" />
            </div>
          </div>

          <div className={styles.field}>
            <label htmlFor="ex-date">Fecha</label>
            <input id="ex-date" name="incurred_on" type="date"
              value={form.incurred_on} onChange={handle} />
          </div>

          <label className={styles.check}>
            <input type="checkbox" name="recurring" checked={form.recurring} onChange={handle} />
            <span>Se repite cada mes</span>
          </label>

          <div className={styles.field}>
            <label htmlFor="ex-note">Nota</label>
            <input id="ex-note" name="note" value={form.note} onChange={handle}
              placeholder="opcional" />
          </div>

          {err && (
            <p className={styles.err} role="alert"><IconAlert size={16} /><span>{err}</span></p>
          )}

          <div className={styles.modalFoot}>
            <button type="submit" className={styles.btnSave} disabled={saving}>
              {saving ? 'Guardando…' : 'Registrar'}
            </button>
            <button type="button" className={styles.btnGhost} onClick={onClose}>Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  )
}
