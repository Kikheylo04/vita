import { useState, useEffect, useRef, type ReactElement } from 'react'
import { useAdminAuth } from '../context/AdminAuthContext'
import type { AdminPage } from '../types/admin'
import styles from './AdminLayout.module.css'
import {
  IconDashboard, IconCalendar, IconMenu, IconStar, IconEvent, IconCart,
  IconMail, IconSettings, IconBell, IconSearch,
  IconGlobe, IconExternal, IconHamburger, IconLogout,
  IconUser, IconIdCard, IconLock, IconPin, IconBox, IconRecipe, IconCard,
} from './ui/Icons'
import { supabase } from '../lib/supabase'
import { BRAND } from '../config/brand'

import AdminDashboard from './pages/AdminDashboard'
import AdminReservaciones from './pages/AdminReservaciones'
import AdminMenu from './pages/AdminMenu'
import AdminTestimonios from './pages/AdminTestimonios'
import AdminEventos from './pages/AdminEventos'
import AdminConfig from './pages/AdminConfig'
import AdminMensajes from './pages/AdminMensajes'
import AdminPedidos from './pages/AdminPedidos'
import AdminCuenta, { type AccountTab } from './pages/AdminCuenta'
import AdminSucursales from './pages/AdminSucursales'
import AdminInventario from './pages/AdminInventario'
import AdminRecetas from './pages/AdminRecetas'
import AdminCartaSucursal from './pages/AdminCartaSucursal'
import PlatformTenants from './pages/PlatformTenants'
import AdminPlan from './pages/AdminPlan'

type IconCmp = ({ size }: { size?: number }) => ReactElement

// El rol se lee del almacenamiento local para elegir la pantalla
// inicial sin esperar a la consulta del perfil.
function profileRole() {
  try { return localStorage.getItem('admin_role') } catch { return null }
}

const PLATFORM_NAV: { id: AdminPage; label: string; Icon: IconCmp }[] = [
  { id: 'clientes', label: 'Clientes', Icon: IconDashboard },
]

const NAV: { id: AdminPage; label: string; Icon: IconCmp }[] = [
  { id: 'dashboard',     label: 'Dashboard',     Icon: IconDashboard },
  { id: 'reservaciones', label: 'Reservaciones', Icon: IconCalendar },
  { id: 'menu',          label: 'Menú',          Icon: IconMenu },
  { id: 'testimonios',   label: 'Testimonios',   Icon: IconStar },
  { id: 'eventos',       label: 'Eventos',       Icon: IconEvent },
  { id: 'pedidos',       label: 'Pedidos',       Icon: IconCart },
  { id: 'mensajes',      label: 'Mensajes',      Icon: IconMail },
  { id: 'carta',         label: 'Carta',         Icon: IconMenu },
  { id: 'recetas',       label: 'Recetas',       Icon: IconRecipe },
  { id: 'inventario',    label: 'Inventario',    Icon: IconBox },
  { id: 'sucursales',    label: 'Sucursales',    Icon: IconPin },
  { id: 'config',        label: 'Configuración', Icon: IconSettings },
  { id: 'plan',          label: 'Plan',          Icon: IconCard },
]

export default function AdminLayout() {
  const { user, signOut, profile } = useAdminAuth()
  const isPlatform = profile?.role === 'platform'
  const [page, setPage] = useState<AdminPage>(
    () => (profileRole() === 'platform' ? 'clientes' : 'dashboard')
  )
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [unread, setUnread] = useState(0)
  const [userMenu, setUserMenu] = useState(false)
  const [accountTab, setAccountTab] = useState<AccountTab>('perfil')
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

  // El operador de la plataforma administra clientes, no un menu.
  const isOwner = profile?.role === 'owner'
  const nav = isPlatform
    ? PLATFORM_NAV
    : isOwner ? NAV : NAV.filter(n => n.id !== 'plan')
  const current = nav.find(n => n.id === page)
  const initial = (user?.email ?? 'A').charAt(0).toUpperCase()

  return (
    <div className={styles.wrap}>
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.brand}>
          <svg viewBox="0 0 60 60" width="40" height="40" aria-hidden="true">
            <path d="M12 14 L30 46 L48 14" fill="none" stroke="#d4a843" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className={styles.brandName}>{BRAND.name}</span>
          <span className={styles.brandSub}>Administración</span>
        </div>

        <nav className={styles.nav} aria-label="Secciones">
          {nav.map(({ id, label, Icon }) => (
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

          <h1 className={styles.pageTitle}>{page === 'cuenta' ? 'Mi cuenta' : current?.label}</h1>

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
                <div className={styles.userPopHead}>
                  <span className={styles.userPopName}>
                    {(user?.user_metadata as { full_name?: string })?.full_name || `Admin ${BRAND.name}`}
                  </span>
                  <span className={styles.userPopMail}>{user?.email}</span>
                </div>

                <button className={styles.userPopBtn} role="menuitem"
                  onClick={() => { setAccountTab('perfil'); setPage('cuenta'); setUserMenu(false) }}>
                  <IconUser size={16} />
                  <span>Mi perfil</span>
                </button>
                <button className={styles.userPopBtn} role="menuitem"
                  onClick={() => { setAccountTab('datos'); setPage('cuenta'); setUserMenu(false) }}>
                  <IconIdCard size={16} />
                  <span>Datos personales</span>
                </button>
                <button className={styles.userPopBtn} role="menuitem"
                  onClick={() => { setAccountTab('password'); setPage('cuenta'); setUserMenu(false) }}>
                  <IconLock size={16} />
                  <span>Cambiar contraseña</span>
                </button>

                <div className={styles.userPopSep} />

                <button className={`${styles.userPopBtn} ${styles.userPopOut}`} onClick={signOut} role="menuitem">
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
          {page === 'cuenta'        && <AdminCuenta initialTab={accountTab} />}
          {page === 'sucursales'    && <AdminSucursales />}
          {page === 'inventario'    && <AdminInventario />}
          {page === 'recetas'       && <AdminRecetas />}
          {page === 'carta'         && <AdminCartaSucursal />}
          {page === 'clientes'      && <PlatformTenants />}
          {page === 'plan'          && <AdminPlan />}
        </div>
      </div>
    </div>
  )
}
