import { useState, useEffect, useRef } from 'react'
import styles from './Navbar.module.css'
import type { PageId } from '../../../types/types'
import LangSwitch from './LangSwitch'
import Logo from '../ui/Logo'
import { useLang } from '../../../context/LangContext'
import { buildPath } from '../../../lib/routes'

interface NavbarProps {
  /** null en una URL desconocida: ningun link queda resaltado. */
  activePage: PageId | null
  setActivePage: (page: PageId) => void
}

export default function Navbar({ activePage, setActivePage }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const navRef = useRef<HTMLElement>(null)
  const { t } = useLang()

  const navLinks = [
    { id: 'home' as PageId, label: t('Inicio', 'Home') },
    { id: 'menu' as PageId, label: t('Menú', 'Menu') },
    { id: 'reservaciones' as PageId, label: t('Reservaciones', 'Reservations') },
    { id: 'contacto' as PageId, label: t('Contacto', 'Contact') },
  ]

  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  const navigate = (page: PageId) => {
    setActivePage(page)
    setMenuOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  /**
   * Los links son <a href> reales para que el crawler los siga y funcione
   * ctrl+click. Solo interceptamos el click simple, sin modificadores.
   */
  const handleClick = (page: PageId) => (e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
    e.preventDefault()
    navigate(page)
  }

  return (
    <nav ref={navRef} className={`${styles.nav} ${scrolled ? styles.scrolled : ''}`}>
      <a className={styles.logo} href={buildPath('home')} onClick={handleClick('home')}>
        <Logo height={52} className={styles.logoSvg} />
      </a>

      <ul id="nav-menu" className={`${styles.links} ${menuOpen ? styles.open : ''}`}>
        {navLinks.map(link => (
          <li key={link.id}>
            <a
              className={`${styles.link} ${activePage === link.id ? styles.active : ''}`}
              href={buildPath(link.id)}
              onClick={handleClick(link.id)}
              aria-current={activePage === link.id ? 'page' : undefined}
            >
              {link.label}
            </a>
          </li>
        ))}
        <li>
          <a className={styles.btnReserva} href={buildPath('reservaciones')} onClick={handleClick('reservaciones')}>
            {t('Reservar Mesa', 'Book a Table')}
          </a>
        </li>
      </ul>

      <LangSwitch />

      <button
        className={`${styles.hamburger} ${menuOpen ? styles.hamburgerOpen : ''}`}
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label={t('Abrir menú', 'Open menu')}
        aria-expanded={menuOpen}
        aria-controls="nav-menu"
      >
        <span /><span /><span />
      </button>
    </nav>
  )
}
