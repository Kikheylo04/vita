import { useState } from 'react'
import { useAdminAuth } from '../context/AdminAuthContext'
import type { AdminPage } from '../types/admin'
import styles from './AdminLayout.module.css'

import AdminDashboard from './pages/AdminDashboard'
import AdminReservaciones from './pages/AdminReservaciones'
import AdminMenu from './pages/AdminMenu'
import AdminTestimonios from './pages/AdminTestimonios'
import AdminEventos from './pages/AdminEventos'
import AdminConfig from './pages/AdminConfig'
import AdminMensajes from './pages/AdminMensajes'
import AdminPedidos from './pages/AdminPedidos'

const NAV: { id: AdminPage; label: string; icon: string }[] = [
  { id: 'dashboard',     label: 'Dashboard',      icon: '▦' },
  { id: 'reservaciones', label: 'Reservaciones',  icon: '📅' },
  { id: 'menu',          label: 'Menú',           icon: '🍽️' },
  { id: 'testimonios',   label: 'Testimonios',    icon: '⭐' },
  { id: 'eventos',       label: 'Eventos',        icon: '🎉' },
  { id: 'pedidos',       label: 'Pedidos',        icon: '🛒' },
  { id: 'mensajes',      label: 'Mensajes',       icon: '✉️' },
  { id: 'config',        label: 'Configuración',  icon: '⚙️' },
]

export default function AdminLayout() {
  const { user, signOut } = useAdminAuth()
  const [page, setPage] = useState<AdminPage>('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleNav = (id: AdminPage) => { setPage(id); setSidebarOpen(false) }

  return (
    <div className={styles.wrap}>
      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.sidebarHeader}>
          <div className={styles.logo}>
            <svg viewBox="0 0 40 40" width="28" height="28">
              <text x="20" y="29" fontFamily="Georgia,'Times New Roman',serif" fontSize="28" fontStyle="italic" fill="#D4A843" textAnchor="middle">V</text>
            </svg>
            <span>VITA Admin</span>
          </div>
        </div>

        <nav className={styles.nav}>
          {NAV.map(n => (
            <button
              key={n.id}
              className={`${styles.navBtn} ${page === n.id ? styles.navActive : ''}`}
              onClick={() => handleNav(n.id)}
            >
              <span className={styles.navIcon}>{n.icon}</span>
              <span>{n.label}</span>
            </button>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          <p className={styles.userEmail}>{user?.email}</p>
          <button className={styles.signOutBtn} onClick={signOut}>Cerrar sesión</button>
        </div>
      </aside>

      {/* Overlay móvil */}
      {sidebarOpen && <div className={styles.overlay} onClick={() => setSidebarOpen(false)} />}

      {/* Main */}
      <div className={styles.main}>
        <header className={styles.topbar}>
          <button className={styles.hamburger} onClick={() => setSidebarOpen(o => !o)} aria-label="Menú">
            ☰
          </button>
          <h1 className={styles.pageTitle}>
            {NAV.find(n => n.id === page)?.icon} {NAV.find(n => n.id === page)?.label}
          </h1>
        </header>

        <div className={styles.content}>
          {page === 'dashboard'     && <AdminDashboard setPage={setPage} />}
          {page === 'reservaciones' && <AdminReservaciones />}
          {page === 'menu'          && <AdminMenu />}
          {page === 'testimonios'   && <AdminTestimonios />}
          {page === 'eventos'       && <AdminEventos />}
          {page === 'pedidos'       && <AdminPedidos />}
          {page === 'mensajes'      && <AdminMensajes />}
          {page === 'config'        && <AdminConfig />}
        </div>
      </div>
    </div>
  )
}
