import { useState, useEffect, useRef } from 'react'
import styles from './Navbar.module.css'
import type { PageId } from '../../../types/types'
import LangSwitch from './LangSwitch'
import { useLang } from '../../../context/LangContext'

interface NavbarProps {
  activePage: PageId
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

  return (
    <nav ref={navRef} className={`${styles.nav} ${scrolled ? styles.scrolled : ''}`}>
      <div className={styles.logo} onClick={() => navigate('home')} role="button" tabIndex={0}>
        <svg className={styles.logoSvg} viewBox="0 0 120 60" xmlns="http://www.w3.org/2000/svg" aria-label="Vita Restaurant">
          <path d="M52 28 C48 18, 38 14, 36 8 C36 8, 46 6, 54 18 C56 22, 56 26, 52 28Z" fill="#6aaa4b"/>
          <path d="M56 28 C60 18, 68 16, 72 10 C72 10, 64 6, 56 18 C54 22, 54 26, 56 28Z" fill="#a0a8a0"/>
          <text x="60" y="42" fontFamily="Arial, sans-serif" fontSize="7" fill="#fff" textAnchor="middle" letterSpacing="2">RESTAURANT</text>
          <text x="60" y="56" fontFamily="Georgia, 'Times New Roman', serif" fontSize="16" fill="#fff" textAnchor="middle" letterSpacing="3">vita</text>
        </svg>
      </div>

      <ul id="nav-menu" className={`${styles.links} ${menuOpen ? styles.open : ''}`}>
        {navLinks.map(link => (
          <li key={link.id}>
            <button
              className={`${styles.link} ${activePage === link.id ? styles.active : ''}`}
              onClick={() => navigate(link.id)}
            >
              {link.label}
            </button>
          </li>
        ))}
        <li>
          <button className={styles.btnReserva} onClick={() => navigate('reservaciones')}>
            {t('Reservar Mesa', 'Book a Table')}
          </button>
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
