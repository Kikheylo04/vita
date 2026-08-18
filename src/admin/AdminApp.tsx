import { useEffect } from 'react'
import './theme.css'
import { AdminAuthProvider, useAdminAuth } from '../context/AdminAuthContext'
import AdminLogin from './AdminLogin'
import AdminLayout from './AdminLayout'

function AdminGate() {
  const { user, loading } = useAdminAuth()

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--ad-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.4)', fontFamily: 'sans-serif' }}>
        Cargando...
      </div>
    )
  }

  return user ? <AdminLayout /> : <AdminLogin />
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
