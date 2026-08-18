import { useState, useEffect } from 'react'
import { useAdminAuth } from '../context/AdminAuthContext'
import { supabase } from '../lib/supabase'
import styles from './SignUp.module.css'
import { IconAlert, IconCheckCircle } from './ui/Icons'

/** Convierte el nombre del restaurante en una direccion web valida. */
function slugify(v: string) {
  return v.toLowerCase().trim()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32)
}

const PLATFORM_DOMAIN = (import.meta.env.VITE_PLATFORM_DOMAIN as string) || 'laplataforma.com'

type Step = 'cuenta' | 'empresa'

export default function SignUp({ onBack }: { onBack: () => void }) {
  const { user, signUp } = useAdminAuth()
  // Si ya hay sesion sin empresa, se salta directo al segundo paso.
  const [step, setStep] = useState<Step>(user ? 'empresa' : 'cuenta')

  useEffect(() => { if (user) setStep('empresa') }, [user])

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <div className={styles.steps}>
          <span className={step === 'cuenta' ? styles.stepOn : styles.stepDone}>1. Tu cuenta</span>
          <span className={styles.stepLine} />
          <span className={step === 'empresa' ? styles.stepOn : styles.step}>2. Tu restaurante</span>
        </div>

        {step === 'cuenta'
          ? <AccountStep signUp={signUp} onBack={onBack} />
          : <TenantStep />}
      </div>
    </div>
  )
}

/* ── Paso 1: la cuenta ────────────────────── */
function AccountStep({ signUp, onBack }: {
  signUp: (e: string, p: string, n: string) => Promise<string | null>
  onBack: () => void
}) {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [sent, setSent] = useState(false)

  const handle = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
    setErr('')
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setErr('Escribe tu nombre.'); return }
    if (form.password.length < 8) { setErr('La contraseña necesita al menos 8 caracteres.'); return }
    if (form.password !== form.confirm) { setErr('Las contraseñas no coinciden.'); return }

    setSaving(true)
    const error = await signUp(form.email.trim(), form.password, form.name.trim())
    setSaving(false)

    if (error) {
      setErr(error.includes('already registered')
        ? 'Ya existe una cuenta con ese correo. Inicia sesión.'
        : error)
      return
    }
    setSent(true)
  }

  if (sent) {
    return (
      <div className={styles.done}>
        <span className={styles.doneIcon}><IconCheckCircle size={38} /></span>
        <h2>Revisa tu correo</h2>
        <p>
          Enviamos un enlace de confirmación a <strong>{form.email}</strong>.
          Ábrelo para continuar con el registro de tu restaurante.
        </p>
        <button className={styles.btnGhost} onClick={onBack}>Volver</button>
      </div>
    )
  }

  return (
    <>
      <h1 className={styles.title}>Crea tu cuenta</h1>
      <p className={styles.sub}>14 días de prueba. Sin tarjeta.</p>

      <form className={styles.form} onSubmit={submit}>
        <div className={styles.field}>
          <label htmlFor="su-name">Tu nombre</label>
          <input id="su-name" name="name" value={form.name} onChange={handle}
            placeholder="Ana Ruiz" autoComplete="name" />
        </div>

        <div className={styles.field}>
          <label htmlFor="su-email">Correo</label>
          <input id="su-email" name="email" type="email" value={form.email} onChange={handle}
            placeholder="ana@restaurante.com" autoComplete="email" required />
        </div>

        <div className={styles.field}>
          <label htmlFor="su-pass">Contraseña</label>
          <input id="su-pass" name="password" type="password" value={form.password}
            onChange={handle} placeholder="Mínimo 8 caracteres" autoComplete="new-password" />
        </div>

        <div className={styles.field}>
          <label htmlFor="su-confirm">Confirmar contraseña</label>
          <input id="su-confirm" name="confirm" type="password" value={form.confirm}
            onChange={handle} autoComplete="new-password" />
        </div>

        {err && <p className={styles.err} role="alert"><IconAlert size={16} /><span>{err}</span></p>}

        <button type="submit" className={styles.btnPrimary} disabled={saving}>
          {saving ? 'Creando…' : 'Continuar'}
        </button>

        <button type="button" className={styles.btnLink} onClick={onBack}>
          Ya tengo cuenta
        </button>
      </form>
    </>
  )
}

/* ── Paso 2: la empresa ───────────────────── */
function TenantStep() {
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [touched, setTouched] = useState(false)
  const [available, setAvailable] = useState<boolean | null>(null)
  const [checking, setChecking] = useState(false)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  // El slug sigue al nombre hasta que el usuario lo edita a mano.
  const effectiveSlug = touched ? slug : slugify(name)

  useEffect(() => {
    if (!effectiveSlug || effectiveSlug.length < 3) { setAvailable(null); return }
    setChecking(true)
    const timer = setTimeout(() => {
      supabase.rpc('slug_available', { p_slug: effectiveSlug })
        .then(({ data, error }) => {
          setChecking(false)
          if (error) { console.error('Error verificando la dirección:', error.message); return }
          setAvailable(Boolean(data))
        })
    }, 400)
    return () => clearTimeout(timer)
  }, [effectiveSlug])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (name.trim().length < 2) { setErr('Escribe el nombre del restaurante.'); return }
    if (!available) { setErr('Elige una dirección disponible.'); return }

    setSaving(true)
    const { error } = await supabase.rpc('create_tenant', {
      p_slug: effectiveSlug,
      p_name: name.trim(),
      p_full_name: '',
    })
    setSaving(false)

    if (error) {
      console.error('Error creando la empresa:', error.message)
      setErr(error.message)
      return
    }
    // El panel lee el perfil al montar, así que basta recargar.
    window.location.href = '/admin'
  }

  return (
    <>
      <h1 className={styles.title}>Tu restaurante</h1>
      <p className={styles.sub}>Puedes cambiar todo esto después.</p>

      <form className={styles.form} onSubmit={submit}>
        <div className={styles.field}>
          <label htmlFor="tn-name">Nombre del restaurante</label>
          <input id="tn-name" value={name}
            onChange={e => { setName(e.target.value); setErr('') }}
            placeholder="Pizzería Napoli" />
        </div>

        <div className={styles.field}>
          <label htmlFor="tn-slug">Dirección de tu sitio</label>
          <div className={styles.slugRow}>
            <input id="tn-slug" value={effectiveSlug}
              onChange={e => { setTouched(true); setSlug(slugify(e.target.value)); setErr('') }}
              placeholder="pizzeria-napoli" />
            <span className={styles.slugSuffix}>.{PLATFORM_DOMAIN}</span>
          </div>

          {effectiveSlug.length >= 3 && (
            <p className={
              checking ? styles.slugChecking
                : available ? styles.slugOk : styles.slugBad
            }>
              {checking ? 'Verificando…'
                : available ? '✓ Disponible'
                : 'No disponible o no válida'}
            </p>
          )}
        </div>

        {err && <p className={styles.err} role="alert"><IconAlert size={16} /><span>{err}</span></p>}

        <button type="submit" className={styles.btnPrimary} disabled={saving || !available}>
          {saving ? 'Creando…' : 'Crear mi restaurante'}
        </button>
      </form>
    </>
  )
}
