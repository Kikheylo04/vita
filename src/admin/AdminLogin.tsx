import { useState } from 'react'
import { useAdminAuth } from '../context/AdminAuthContext'
import styles from './AdminLogin.module.css'

export default function AdminLogin() {
  const { signIn } = useAdminAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const err = await signIn(email, password)
    if (err) setError('Credenciales incorrectas. Verifica tu correo y contraseña.')
    setLoading(false)
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>
          <svg viewBox="0 0 40 40" width="36" height="36">
            <text x="20" y="30" fontFamily="Georgia,'Times New Roman',serif" fontSize="32" fontStyle="italic" fill="#D4A843" textAnchor="middle">V</text>
          </svg>
          <span>VITA Admin</span>
        </div>
        <h1 className={styles.title}>Iniciar sesión</h1>
        <p className={styles.subtitle}>Panel de administración</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="adm-email">Correo</label>
            <input
              id="adm-email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@vitarestaurante.mx"
              required
              autoFocus
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="adm-pass">Contraseña</label>
            <input
              id="adm-pass"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {error && <p className={styles.error} role="alert">{error}</p>}

          <button type="submit" className={styles.btn} disabled={loading} aria-busy={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
