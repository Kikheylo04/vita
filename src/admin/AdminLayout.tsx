import { useState, useEffect, useRef, type ReactElement } from 'react'
import { useAdminAuth } from '../context/AdminAuthContext'
import type { AdminPage } from '../types/admin'
import styles from './AdminLayout.module.css'
import {
  IconDashboard, IconCalendar, IconMenu, IconStar, IconEvent, IconCart,
  IconMail, IconSettings, IconBell, IconSearch,
  IconGlobe, IconExternal, IconHamburger, IconLogout,
} from './ui/Icons'
import { supabase } from '../lib/supabase'

import AdminDashboard from './pages/AdminDashboard'
import AdminReservaciones from './pages/AdminReservaciones'
import AdminMenu from './pages/AdminMenu'
import AdminTestimonios from './pages/AdminTestimonios'
import AdminEventos from './pages/AdminEventos'
import AdminConfig from './pages/AdminConfig'
import AdminMensajes from './pages/AdminMensajes'
import AdminPedidos from './pages/AdminPedidos'

type IconCmp = ({ size }: { size?: number }) => ReactElement

const NAV: { id: AdminPage; label: string; Icon: IconCmp }[] = [
  { id: 'dashboard',     label: 'Dashboard',     Icon: IconDashboard },
  { id: 'reservaciones', label: 'Reservaciones', Icon: IconCalendar },
  { id: 'menu',          label: 'Menú',          Icon: IconMenu },
  { id: 'testimonios',   label: 'Testimonios',   Icon: IconStar },
  { id: 'eventos',       label: 'Eventos',       Icon: IconEvent },
  { id: 'pedidos',       label: 'Pedidos',       Icon: IconCart },
  { id: 'mensajes',      label: 'Mensajes',      Icon: IconMail },
  { id: 'config',        label: 'Configuración', Icon: IconSettings },
]

export default function AdminLayout() {
  const { user, signOut } = useAdminAuth()
  const [page, setPage] = useState<AdminPage>('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [unread, setUnread] = useState(0)
  const [userMenu, setUserMenu] = useState(false)
  const userRef = useRef<HTMLDivElement>(null)

  const handleNav = (id: AdminPage) => { setPage(id); setSidebarOpen(false) }

  // Badge de mensajes sin leer, compartido por el sidebar y la campana.
  useEffect(() => {
    supabase
      .from('contact_messages')
      .select('id', { count: 'exact', head: true })
      .eq('read', false)
      .then(({ count, error }) => {
        if (error) { console.error('Error contando mensajes:', error.message); return }
        setUnread(count ?? 0)
      })
  }, [page])

  useEffect(() => {
    if (!userMenu) return
    const onDown = (e: MouseEvent) => {
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserMenu(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [userMenu])

  const current = NAV.find(n => n.id === page)
  const initial = (user?.email ?? 'A').charAt(0).toUpperCase()

  return (
    <div className={styles.wrap}>
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.brand}>
          <svg viewBox="0 0 60 60" width="40" height="40" aria-hidden="true">
            <path d="M12 14 L30 46 L48 14" fill="none" stroke="#d4a843" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className={styles.brandName}>VITA</span>
          <span className={styles.brandSub}>Administración</span>
        </div>

        <nav className={styles.nav} aria-label="Secciones">
          {NAV.map(({ id, label, Icon }) => (
            <button
              key={id}
              className={`${styles.navBtn} ${page === id ? styles.navActive : ''}`}
              onClick={() => handleNav(id)}
              aria-current={page === id ? 'page' : undefined}
            >
              <span className={styles.navIcon}><Icon size={19} /></span>
              <span className={styles.navLabel}>{label}</span>
              {id === 'mensajes' && unread > 0 && (
                <span className={styles.navBadge}>{unread}</span>
              )}
            </button>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          <a className={styles.siteLink} href="/" target="_blank" rel="noreferrer">
            <IconGlobe size={17} />
            <span>Ver sitio web</span>
            <IconExternal size={14} />
          </a>
        </div>
      </aside>

      {sidebarOpen && <div className={styles.overlay} onClick={() => setSidebarOpen(false)} />}

      <div className={styles.main}>
        <header className={styles.topbar}>
          <button
            className={styles.hamburger}
            onClick={() => setSidebarOpen(o => !o)}
            aria-label="Abrir menú"
          >
            <IconHamburger size={20} />
          </button>

          <h1 className={styles.pageTitle}>{current?.label}</h1>

          <div className={styles.search}>
            <IconSearch size={17} />
            <input
              type="search"
              placeholder="Buscar..."
              aria-label="Buscar en el panel"
              className={styles.searchInput}
            />
          </div>

          <button
            className={styles.bellBtn}
            onClick={() => handleNav('mensajes')}
            aria-label={`Mensajes sin leer: ${unread}`}
          >
            <IconBell size={20} />
            {unread > 0 && <span className={styles.bellBadge}>{unread}</span>}
          </button>

          <div className={styles.userBlock} ref={userRef}>
            <button
              className={styles.topAvatar}
              onClick={() => setUserMenu(o => !o)}
              aria-expanded={userMenu}
              aria-label="Cuenta"
            >
              {initial}
            </button>
            {userMenu && (
              <div className={styles.userPop} role="menu">
                <p className={styles.userPopMail}>{user?.email}</p>
                <button className={styles.userPopBtn} onClick={signOut} role="menuitem">
                  <IconLogout size={16} />
                  <span>Cerrar sesión</span>
                </button>
              </div>
            )}
          </div>
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
