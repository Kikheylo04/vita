import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import styles from './AdminDominio.module.css'
import { IconCheckCircle, IconAlert, IconGlobe, IconExternal } from '../ui/Icons'

interface Setup {
  domain: string
  status: 'none' | 'pending' | 'verified' | 'connected' | 'failed'
  txt_name: string
  txt_value: string
  cname_name: string
  cname_value: string
  a_value: string
}

interface VerifyResult {
  ok: boolean
  ownership: boolean
  pointing: boolean
  found: { txt: string[]; a: string[]; cname: string[] }
}

const PLATFORM_DOMAIN = (import.meta.env.VITE_PLATFORM_DOMAIN as string) || 'laplataforma.com'

/** Fila de un registro DNS, con botón para copiar el valor. */
function DnsRow({ type, name, value }: { type: string; name: string; value: string }) {
  const [copied, setCopied] = useState(false)

  function copy() {
    navigator.clipboard.writeText(value).then(
      () => { setCopied(true); setTimeout(() => setCopied(false), 1500) },
      () => { /* sin permiso de portapapeles: el valor se puede seleccionar */ },
    )
  }

  return (
    <tr>
      <td><span className={styles.dnsType}>{type}</span></td>
      <td className={styles.dnsName}>{name}</td>
      <td className={styles.dnsValue}>
        <code>{value}</code>
        <button className={styles.copyBtn} onClick={copy} aria-label={`Copiar ${type}`}>
          {copied ? '✓' : 'Copiar'}
        </button>
      </td>
    </tr>
  )
}

export default function AdminDominio() {
  const [setup, setSetup] = useState<Setup | null>(null)
  const [allowed, setAllowed] = useState(true)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [result, setResult] = useState<VerifyResult | null>(null)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  async function load() {
    setLoading(true)
    const { data: billing } = await supabase
      .from('tenant_billing').select('tenant_id, plan_code').maybeSingle()

    if (!billing) { setLoading(false); return }

    const { data: limits } = await supabase.rpc('tenant_limits', { p_tenant: billing.tenant_id })
    if (limits?.[0]) setAllowed(Boolean(limits[0].has_custom_domain))

    const { data, error } = await supabase.rpc('domain_setup', { p_tenant: billing.tenant_id })
    setLoading(false)

    if (error) { console.error('Error cargando el dominio:', error.message); return }
    const row = data?.[0] as Setup | undefined
    if (row?.domain) { setSetup(row); setInput(row.domain) }
  }

  useEffect(() => { load() }, [])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim()) { setMsg({ ok: false, text: 'Escribe tu dominio.' }); return }

    setWorking(true)
    setResult(null)
    const { error } = await supabase.rpc('set_custom_domain', { p_domain: input.trim() })
    setWorking(false)

    if (error) {
      console.error('Error guardando el dominio:', error.message)
      setMsg({ ok: false, text: error.message })
      return
    }
    setMsg({ ok: true, text: 'Dominio guardado. Ahora crea los registros DNS.' })
    load()
  }

  async function verify() {
    setWorking(true)
    setMsg(null)

    const { data, error } = await supabase.functions.invoke<VerifyResult>('verify-domain', { body: {} })
    setWorking(false)

    if (error) {
      let detail = error.message
      const ctx = (error as { context?: Response }).context
      if (ctx && typeof ctx.json === 'function') {
        try {
          const b = await ctx.json()
          if (b?.error) detail = b.error
        } catch { /* la funcion no devolvio JSON */ }
      }
      console.error('Error verificando el dominio:', detail)
      setMsg({ ok: false, text: detail })
      return
    }

    setResult(data ?? null)
    setMsg(data?.ok
      ? { ok: true, text: 'Dominio verificado. Lo conectaremos en las próximas horas.' }
      : { ok: false, text: 'El DNS todavía no apunta aquí. Los cambios tardan hasta 48 horas.' })
    load()
  }

  async function remove() {
    if (!confirm('¿Quitar el dominio? Tu sitio volverá a usar el subdominio.')) return
    const { error } = await supabase.rpc('remove_custom_domain')
    if (error) {
      console.error('Error quitando el dominio:', error.message)
      setMsg({ ok: false, text: error.message })
      return
    }
    setSetup(null)
    setInput('')
    setResult(null)
    setMsg({ ok: true, text: 'Dominio eliminado.' })
    load()
  }

  const status = setup?.status ?? 'none'

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <div>
          <h2 className={styles.title}>Dominio propio</h2>
          <p className={styles.sub}>
            Usa tu propia dirección web en lugar del subdominio de la plataforma.
          </p>
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
      ) : !allowed ? (
        <section className={styles.card}>
          <p className={styles.locked}>
            Tu plan actual no incluye dominio propio. Cambia a un plan superior
            desde la sección «Plan» para activarlo.
          </p>
        </section>
      ) : (
        <>
          {/* ── Dirección actual ── */}
          <section className={styles.card}>
            <div className={styles.currentTop}>
              <span className={styles.globe}><IconGlobe size={20} /></span>
              <div className={styles.currentInfo}>
                <p className={styles.currentLabel}>Tu sitio está en</p>
                <p className={styles.currentUrl}>
                  {status === 'connected' && setup
                    ? setup.domain
                    : `tu-restaurante.${PLATFORM_DOMAIN}`}
                </p>
              </div>
              {setup && (
                <span className={`${styles.badge} ${styles['badge_' + status]}`}>
                  {status === 'pending' ? 'Falta el DNS'
                    : status === 'verified' ? 'Verificado'
                    : status === 'connected' ? 'Conectado'
                    : status === 'failed' ? 'Sin verificar' : ''}
                </span>
              )}
            </div>

            <form className={styles.form} onSubmit={save}>
              <div className={styles.field}>
                <label htmlFor="dm-input">Tu dominio</label>
                <input
                  id="dm-input" value={input}
                  onChange={e => { setInput(e.target.value); setMsg(null) }}
                  placeholder="mirestaurante.com"
                />
                <p className={styles.hint}>
                  Sin «https://» ni «www». El dominio debe estar registrado a tu nombre.
                </p>
              </div>

              <div className={styles.actions}>
                <button type="submit" className={styles.btnPrimary} disabled={working}>
                  {working ? 'Guardando…' : setup ? 'Actualizar dominio' : 'Registrar dominio'}
                </button>
                {setup && (
                  <button type="button" className={styles.btnDanger} onClick={remove}>
                    Quitar
                  </button>
                )}
              </div>
            </form>
          </section>

          {/* ── Instrucciones DNS ── */}
          {setup && status !== 'connected' && (
            <section className={styles.card}>
              <h3 className={styles.cardTitle}>Crea estos registros en tu proveedor de dominio</h3>
              <p className={styles.cardSub}>
                En el panel donde compraste tu dominio (GoDaddy, Namecheap, Cloudflare…),
                busca la sección de DNS y agrega:
              </p>

              <div className={styles.tableWrap}>
                <table className={styles.dnsTable}>
                  <thead>
                    <tr><th>Tipo</th><th>Nombre</th><th>Valor</th></tr>
                  </thead>
                  <tbody>
                    <DnsRow type="TXT" name={setup.txt_name} value={setup.txt_value} />
                    <DnsRow type="A" name="@" value={setup.a_value} />
                    <DnsRow type="CNAME" name="www" value={setup.cname_value} />
                  </tbody>
                </table>
              </div>

              <p className={styles.hint}>
                Los cambios de DNS tardan entre 10 minutos y 48 horas en propagarse.
              </p>

              <button className={styles.btnPrimary} onClick={verify} disabled={working}>
                {working ? 'Verificando…' : 'Verificar ahora'}
              </button>

              {result && !result.ok && (
                <div className={styles.diag}>
                  <p className={styles.diagTitle}>Qué falta</p>
                  <ul>
                    <li className={result.ownership ? styles.diagOk : styles.diagBad}>
                      {result.ownership
                        ? 'Propiedad del dominio confirmada'
                        : 'No encontramos el registro TXT de verificación'}
                    </li>
                    <li className={result.pointing ? styles.diagOk : styles.diagBad}>
                      {result.pointing
                        ? 'El dominio ya apunta a la plataforma'
                        : 'El dominio todavía no apunta aquí'}
                    </li>
                  </ul>
                </div>
              )}
            </section>
          )}

          {status === 'verified' && (
            <section className={styles.card}>
              <p className={styles.waiting}>
                <IconCheckCircle size={18} />
                <span>
                  Tu DNS está correcto. Estamos conectando tu dominio; en cuanto
                  esté listo tu sitio responderá en <strong>{setup?.domain}</strong>.
                </span>
              </p>
            </section>
          )}

          {status === 'connected' && setup && (
            <section className={styles.card}>
              <p className={styles.waiting}>
                <IconCheckCircle size={18} />
                <span>Tu dominio está activo.</span>
              </p>
              <a
                className={styles.visitLink}
                href={`https://${setup.domain}`}
                target="_blank" rel="noreferrer"
              >
                Visitar {setup.domain} <IconExternal size={13} />
              </a>
            </section>
          )}
        </>
      )}
    </div>
  )
}
