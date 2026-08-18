import { useEffect, useState } from 'react'
import './theme.css'
import { AdminAuthProvider, useAdminAuth } from '../context/AdminAuthContext'
import AdminLogin from './AdminLogin'
import AdminLayout from './AdminLayout'
import SignUp from './SignUp'

function AdminGate() {
  const { user, loading, profile } = useAdminAuth()
  const [wantsSignUp, setWantsSignUp] = useState(
    () => new URLSearchParams(window.location.search).has('registro')
  )

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--ad-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.4)', fontFamily: 'sans-serif' }}>
        Cargando...
      </div>
    )
  }

  // Sin sesion: entrar o registrarse.
  if (!user) {
    return wantsSignUp
      ? <SignUp onBack={() => setWantsSignUp(false)} />
      : <AdminLogin onSignUp={() => setWantsSignUp(true)} />
  }

  // El perfil llega un instante despues de la sesion.
  if (!profile) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--ad-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ad-ink-3)', fontFamily: 'sans-serif' }}>
        Cargando...
      </div>
    )
  }

  // Con sesion pero sin empresa: falta el segundo paso del registro.
  if (profile.role !== 'platform' && !profile.tenant_id) {
    return <SignUp onBack={() => setWantsSignUp(false)} />
  }

  return <AdminLayout />
}

export default function AdminApp() {
  // index.css pinta el body con el marron del sitio publico. El panel
  // necesita su propio lienzo, asi que lo sobrescribe mientras esta montado.
  useEffect(() => {
    const prev = document.body.style.backgroundColor
    document.body.style.backgroundColor = '#0a0c10'  // = --ad-bg
    return () => { document.body.style.backgroundColor = prev }
  }, [])

  return (
    <AdminAuthProvider>
      <AdminGate />
    </AdminAuthProvider>
  )
}
