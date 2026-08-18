import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import styles from './AdminPlan.module.css'
import { IconCheckCircle, IconAlert } from '../ui/Icons'

interface Plan {
  code: string
  name: string
  price: number
  currency: string
  max_branches: number
  max_users: number
  has_inventory: boolean
  has_custom_domain: boolean
  sort_order: number
}

interface Billing {
  tenant_id: string
  name: string
  status: 'trial' | 'active' | 'suspended' | 'cancelled'
  trial_days_left: number
  plan_code: string
  plan_name: string
  plan_price: number
  currency: string
  subscription_status: string | null
  current_period_end: string | null
  payments_made: number
}

interface Limits {
  branches_used: number
  branches_max: number
  users_used: number
  users_max: number
}

function money(n: number, currency = 'MXN') {
  return n.toLocaleString('es-MX', { style: 'currency', currency, maximumFractionDigits: 0 })
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
}

function limitLabel(used: number, max: number) {
  return max < 0 ? `${used} · sin límite` : `${used} de ${max}`
}

export default function AdminPlan() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [billing, setBilling] = useState<Billing | null>(null)
  const [limits, setLimits] = useState<Limits | null>(null)
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  async function load() {
    setLoading(true)
    const [p, b] = await Promise.all([
      supabase.from('plans').select('*').eq('active', true).order('sort_order'),
      supabase.from('tenant_billing').select('*').maybeSingle(),
    ])
    setLoading(false)

    if (p.error) console.error('Error cargando planes:', p.error.message)
    if (b.error) console.error('Error cargando facturación:', b.error.message)

    setPlans((p.data ?? []) as Plan[])
    const bill = b.data as Billing | null
    setBilling(bill)

    if (bill) {
      const { data } = await supabase.rpc('tenant_limits', { p_tenant: bill.tenant_id })
      if (data && data.length > 0) setLimits(data[0] as Limits)
    }
  }

  useEffect(() => { load() }, [])

  // El resultado del checkout vuelve en la URL.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('suscripcion') === 'ok') {
      setMsg({
        ok: true,
        text: 'Suscripción enviada. La activación puede tardar unos minutos en confirmarse.',
      })
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  async function choose(code: string) {
    setWorking(true)
    const { error } = await supabase.rpc('choose_plan', { p_plan: code })
    setWorking(false)
    if (error) {
      console.error('Error cambiando de plan:', error.message)
      setMsg({ ok: false, text: error.message })
      return
    }
    setMsg({ ok: true, text: 'Plan actualizado. Continúa con el pago para activarlo.' })
    load()
  }

  async function subscribe() {
    setWorking(true)
    setMsg(null)

    const { data, error } = await supabase.functions.invoke<{ checkoutUrl: string }>(
      'create-subscription', { body: {} },
    )
    setWorking(false)

    if (error) {
      // El cuerpo de la funcion trae el motivo real; sin el, el
      // usuario solo veria "failed to fetch".
      let detail = error.message
      const ctx = (error as { context?: Response }).context
      if (ctx && typeof ctx.json === 'function') {
        try {
          const b = await ctx.json()
          if (b?.error) detail = b.error
        } catch { /* la funcion no devolvio JSON */ }
      }
      console.error('Error creando la suscripción:', detail)
      setMsg({ ok: false, text: detail })
      return
    }

    if (!data?.checkoutUrl) {
      setMsg({ ok: false, text: 'La pasarela no devolvió un link de pago.' })
      return
    }
    window.location.href = data.checkoutUrl
  }

  const active = billing?.subscription_status === 'authorized'

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <div>
          <h2 className={styles.title}>Plan y facturación</h2>
          <p className={styles.sub}>Tu suscripción a la plataforma.</p>
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
      ) : !billing ? (
        <p className={styles.empty}>No se encontró la información de tu empresa.</p>
      ) : (
        <>
          {/* ── Estado actual ── */}
          <section className={styles.current}>
            <div className={styles.currentTop}>
              <div>
                <p className={styles.currentLabel}>Plan actual</p>
                <h3 className={styles.currentPlan}>{billing.plan_name}</h3>
              </div>
              <span className={`${styles.badge} ${styles['badge_' + billing.status]}`}>
                {billing.status === 'trial' ? 'Prueba'
                  : billing.status === 'active' ? 'Activa'
                  : billing.status === 'suspended' ? 'Suspendida' : 'Cancelada'}
              </span>
            </div>

            {billing.status === 'trial' && (
              <p className={billing.trial_days_left <= 3 ? styles.trialSoon : styles.trialInfo}>
                {billing.trial_days_left > 0
                  ? `Te quedan ${billing.trial_days_left} ${billing.trial_days_left === 1 ? 'día' : 'días'} de prueba.`
                  : 'Tu prueba terminó. Activa tu plan para seguir publicando tu sitio.'}
              </p>
            )}

            {active && billing.current_period_end && (
              <p className={styles.trialInfo}>
                Próximo cobro el {fmtDate(billing.current_period_end)} · {billing.payments_made} {billing.payments_made === 1 ? 'pago realizado' : 'pagos realizados'}
              </p>
            )}

            {limits && (
              <dl className={styles.usage}>
                <div>
                  <dt>Sucursales</dt>
                  <dd>{limitLabel(limits.branches_used, limits.branches_max)}</dd>
                </div>
                <div>
                  <dt>Usuarios</dt>
                  <dd>{limitLabel(limits.users_used, limits.users_max)}</dd>
                </div>
              </dl>
            )}

            {!active && (
              <button className={styles.btnPay} onClick={subscribe} disabled={working}>
                {working ? 'Abriendo pasarela…' : `Activar por ${money(billing.plan_price, billing.currency)} al mes`}
              </button>
            )}
          </section>

          {/* ── Planes ── */}
          <h3 className={styles.plansTitle}>Planes disponibles</h3>

          <div className={styles.plans}>
            {plans.map(p => {
              const isCurrent = p.code === billing.plan_code
              return (
                <article key={p.code} className={`${styles.plan} ${isCurrent ? styles.planOn : ''}`}>
                  <h4 className={styles.planName}>{p.name}</h4>
                  <p className={styles.planPrice}>
                    {money(p.price, p.currency)}
                    <span className={styles.planPer}>/mes</span>
                  </p>

                  <ul className={styles.features}>
                    <li>
                      {p.max_branches < 0 ? 'Sucursales ilimitadas'
                        : `${p.max_branches} ${p.max_branches === 1 ? 'sucursal' : 'sucursales'}`}
                    </li>
                    <li>
                      {p.max_users < 0 ? 'Usuarios ilimitados' : `Hasta ${p.max_users} usuarios`}
                    </li>
                    <li>Menú, reservaciones y pedidos</li>
                    <li className={p.has_inventory ? '' : styles.featureOff}>
                      {p.has_inventory ? 'Inventario y recetas' : 'Sin inventario'}
                    </li>
                    <li className={p.has_custom_domain ? '' : styles.featureOff}>
                      {p.has_custom_domain ? 'Dominio propio' : 'Subdominio incluido'}
                    </li>
                  </ul>

                  {isCurrent ? (
                    <span className={styles.planCurrent}>Tu plan</span>
                  ) : (
                    <button
                      className={styles.btnChoose}
                      onClick={() => choose(p.code)}
                      disabled={working}
                    >
                      Cambiar a {p.name}
                    </button>
                  )}
                </article>
              )
            })}
          </div>

          <p className={styles.note}>
            El cobro se hace por MercadoPago y se renueva cada mes. Puedes cancelarlo
            cuando quieras desde tu cuenta de MercadoPago.
          </p>
        </>
      )}
    </div>
  )
}
