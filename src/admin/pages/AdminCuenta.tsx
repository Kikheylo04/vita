import { useState } from 'react'
import { useAdminAuth } from '../../context/AdminAuthContext'
import styles from './AdminCuenta.module.css'
import { IconCheckCircle, IconAlert } from '../ui/Icons'

export type AccountTab = 'perfil' | 'datos' | 'password'

const TABS: { id: AccountTab; label: string }[] = [
  { id: 'perfil',   label: 'Mi perfil' },
  { id: 'datos',    label: 'Datos personales' },
  { id: 'password', label: 'Cambiar contraseña' },
]

function formatDate(iso?: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-MX', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

export default function AdminCuenta({ initialTab = 'perfil' }: { initialTab?: AccountTab }) {
  const { user, updateProfile, changePassword } = useAdminAuth()
  const [tab, setTab] = useState<AccountTab>(initialTab)

  const meta = (user?.user_metadata ?? {}) as { full_name?: string; phone?: string }

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <h2 className={styles.title}>Mi cuenta</h2>
        <p className={styles.sub}>Administra tu perfil y el acceso al panel.</p>
      </div>

      <div className={styles.tabs} role="tablist">
        {TABS.map(t => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            className={`${styles.tab} ${tab === t.id ? styles.tabActive : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'perfil' && <ProfileTab user={user} meta={meta} />}
      {tab === 'datos' && <DataTab meta={meta} onSave={updateProfile} />}
      {tab === 'password' && <PasswordTab onSave={changePassword} />}
    </div>
  )
}

/* ── Mi perfil: solo lectura ──────────────── */
function ProfileTab({ user, meta }: { user: { email?: string; created_at?: string; last_sign_in_at?: string } | null; meta: { full_name?: string; phone?: string } }) {
  const initial = (meta.full_name || user?.email || 'A').charAt(0).toUpperCase()

  return (
    <section className={styles.card}>
      <div className={styles.profileTop}>
        <span className={styles.bigAvatar} aria-hidden="true">{initial}</span>
        <div>
          <h3 className={styles.profileName}>{meta.full_name || 'Administrador'}</h3>
          <p className={styles.profileMail}>{user?.email}</p>
          <span className={styles.roleTag}>Administrador</span>
        </div>
      </div>

      <dl className={styles.factList}>
        <div>
          <dt>Teléfono</dt>
          <dd>{meta.phone || 'Sin registrar'}</dd>
        </div>
        <div>
          <dt>Cuenta creada</dt>
          <dd>{formatDate(user?.created_at)}</dd>
        </div>
        <div>
          <dt>Último acceso</dt>
          <dd>{formatDate(user?.last_sign_in_at)}</dd>
        </div>
      </dl>

      <p className={styles.hint}>
        Para editar tu nombre o teléfono, usa la pestaña «Datos personales».
      </p>
    </section>
  )
}

/* ── Datos personales: editable ───────────── */
function DataTab({ meta, onSave }: {
  meta: { full_name?: string; phone?: string }
  onSave: (f: { full_name?: string; phone?: string }) => Promise<string | null>
}) {
  const [form, setForm] = useState({ full_name: meta.full_name ?? '', phone: meta.phone ?? '' })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const handle = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
    setMsg(null)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const err = await onSave({ full_name: form.full_name.trim(), phone: form.phone.trim() })
    setSaving(false)
    setMsg(err
      ? { ok: false, text: `No se pudo guardar: ${err}` }
      : { ok: true, text: 'Datos actualizados.' })
  }

  return (
    <section className={styles.card}>
      <form className={styles.form} onSubmit={submit}>
        <div className={styles.field}>
          <label htmlFor="ac-name">Nombre completo</label>
          <input
            id="ac-name" name="full_name" value={form.full_name}
            onChange={handle} placeholder="Tu nombre"
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="ac-phone">Teléfono</label>
          <input
            id="ac-phone" name="phone" type="tel" value={form.phone}
            onChange={handle} placeholder="(55) 1234-5678"
          />
        </div>

        {msg && (
          <p className={msg.ok ? styles.ok : styles.err} role="alert">
            {msg.ok ? <IconCheckCircle size={16} /> : <IconAlert size={16} />}
            <span>{msg.text}</span>
          </p>
        )}

        <button type="submit" className={styles.btn} disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </form>
    </section>
  )
}

/* ── Contraseña ───────────────────────────── */
function PasswordTab({ onSave }: { onSave: (p: string) => Promise<string | null> }) {
  const [form, setForm] = useState({ pass: '', confirm: '' })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const handle = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
    setMsg(null)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.pass.length < 8) {
      setMsg({ ok: false, text: 'La contraseña debe tener al menos 8 caracteres.' })
      return
    }
    if (form.pass !== form.confirm) {
      setMsg({ ok: false, text: 'Las contraseñas no coinciden.' })
      return
    }
    setSaving(true)
    const err = await onSave(form.pass)
    setSaving(false)
    if (err) {
      setMsg({ ok: false, text: `No se pudo cambiar: ${err}` })
      return
    }
    setForm({ pass: '', confirm: '' })
    setMsg({ ok: true, text: 'Contraseña actualizada. Úsala la próxima vez que entres.' })
  }

  return (
    <section className={styles.card}>
      <form className={styles.form} onSubmit={submit}>
        <div className={styles.field}>
          <label htmlFor="ac-pass">Nueva contraseña</label>
          <input
            id="ac-pass" name="pass" type="password" value={form.pass}
            onChange={handle} autoComplete="new-password" placeholder="Mínimo 8 caracteres"
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="ac-confirm">Confirmar contraseña</label>
          <input
            id="ac-confirm" name="confirm" type="password" value={form.confirm}
            onChange={handle} autoComplete="new-password" placeholder="Repite la contraseña"
          />
        </div>

        {msg && (
          <p className={msg.ok ? styles.ok : styles.err} role="alert">
            {msg.ok ? <IconCheckCircle size={16} /> : <IconAlert size={16} />}
            <span>{msg.text}</span>
          </p>
        )}

        <button type="submit" className={styles.btn} disabled={saving}>
          {saving ? 'Guardando…' : 'Cambiar contraseña'}
        </button>
      </form>
    </section>
  )
}
