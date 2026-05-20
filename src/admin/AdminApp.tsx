import { AdminAuthProvider, useAdminAuth } from '../context/AdminAuthContext'
import AdminLogin from './AdminLogin'
import AdminLayout from './AdminLayout'

function AdminGate() {
  const { user, loading } = useAdminAuth()

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0f0c08', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.4)', fontFamily: 'sans-serif' }}>
        Cargando...
      </div>
    )
  }

  return user ? <AdminLayout /> : <AdminLogin />
}

export default function AdminApp() {
  return (
    <AdminAuthProvider>
      <AdminGate />
    </AdminAuthProvider>
  )
}
