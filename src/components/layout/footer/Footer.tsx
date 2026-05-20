import styles from './Footer.module.css'
import type { PageId } from '../../../types/types'
import { useLang } from '../../../context/LangContext'
import { useRestaurant } from '../../../context/RestaurantContext'

interface FooterProps {
  setActivePage: (page: PageId) => void
}

export default function Footer({ setActivePage }: FooterProps) {
  const { t } = useLang()
  const RESTAURANT = useRestaurant()

  const navLinks: [PageId, string, string][] = [
    ['home', 'Inicio', 'Home'],
    ['menu', 'Menú', 'Menu'],
    ['reservaciones', 'Reservaciones', 'Reservations'],
    ['contacto', 'Contacto', 'Contact'],
  ]

  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.brand}>
          <div className={styles.logo}>
            <svg className={styles.logoSvg} viewBox="0 0 200 220" xmlns="http://www.w3.org/2000/svg" aria-label="Vita Vita Restaurant">
              {/* Outer rustic circle */}
              <circle cx="100" cy="100" r="88" fill="none" stroke="rgba(201,168,76,0.4)" strokeWidth="1.5" strokeDasharray="5 3"/>
              <circle cx="100" cy="100" r="82" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="0.8"/>
              {/* Fork handle */}
              <rect x="98.5" y="52" width="3" height="28" rx="1.5" fill="rgba(201,168,76,0.85)"/>
              {/* Fork tines */}
              <rect x="92" y="22" width="2" height="18" rx="1" fill="rgba(201,168,76,0.85)"/>
              <rect x="97" y="22" width="2" height="20" rx="1" fill="rgba(201,168,76,0.85)"/>
              <rect x="102" y="22" width="2" height="20" rx="1" fill="rgba(201,168,76,0.85)"/>
              <rect x="107" y="22" width="2" height="18" rx="1" fill="rgba(201,168,76,0.85)"/>
              {/* Fork tine connector */}
              <path d="M92 40 Q100 48 108 40" fill="none" stroke="rgba(201,168,76,0.85)" strokeWidth="2"/>
              {/* Gold arc */}
              <path d="M78 58 A25 25 0 0 1 122 58" fill="none" stroke="rgba(201,168,76,0.45)" strokeWidth="1.5"/>
              {/* vita italic */}
              <text x="100" y="112" fontFamily="Georgia,'Times New Roman',serif" fontSize="32" fontStyle="italic" fill="rgba(201,168,76,0.95)" textAnchor="middle" letterSpacing="1">vita</text>
              {/* · vita · */}
              <text x="100" y="138" fontFamily="Georgia,'Times New Roman',serif" fontSize="15" fill="rgba(255,255,255,0.65)" textAnchor="middle" letterSpacing="5">·vita·</text>
              {/* RESTAURANT */}
              <text x="100" y="168" fontFamily="Arial,sans-serif" fontSize="9" fill="rgba(255,255,255,0.45)" textAnchor="middle" letterSpacing="4">RESTAURANT</text>
            </svg>
          </div>
          <p className={styles.tagline}>{RESTAURANT.taglineFull}</p>
          <p className={styles.desc}>
            {t('Una experiencia gastronómica única en el corazón de Polanco, Ciudad de México.', 'A unique gastronomic experience in the heart of Polanco, Mexico City.')}
          </p>
        </div>

        <div className={styles.col}>
          <h4>{t('Navegación', 'Navigation')}</h4>
          <ul>
            {navLinks.map(([id, es, en]) => (
              <li key={id}><button onClick={() => setActivePage(id)}>{t(es, en)}</button></li>
            ))}
          </ul>
        </div>

        <div className={styles.col}>
          <h4>{t('Horarios', 'Hours')}</h4>
          <p>{t('Martes a Domingo', 'Tuesday to Sunday')}</p>
          <p>{t(`Comida: ${RESTAURANT.hours.lunch}`, `Lunch: ${RESTAURANT.hours.lunch}`)}</p>
          <p>{t(`Cena: ${RESTAURANT.hours.dinner}`, `Dinner: ${RESTAURANT.hours.dinner}`)}</p>
          <p className={styles.closed}>{t(RESTAURANT.hours.note, RESTAURANT.hours.noteEn)}</p>
        </div>

        <div className={styles.col}>
          <h4>{t('Contacto', 'Contact')}</h4>
          <p>{RESTAURANT.address}</p>
          <p>{RESTAURANT.neighborhood}, {RESTAURANT.city} {RESTAURANT.zip}</p>
          <p>{RESTAURANT.phone}</p>
          <p>{RESTAURANT.email}</p>
          <div className={styles.social}>
            <a href={RESTAURANT.instagramUrl} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className={styles.socialLink}>
              <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
            </a>
            <a href={RESTAURANT.facebookUrl} target="_blank" rel="noopener noreferrer" aria-label="Facebook" className={styles.socialLink}>
              <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            </a>
          </div>
        </div>
      </div>
      <div className={styles.bottom}>
        <p>© 2026 {RESTAURANT.fullName}. {t('Todos los derechos reservados.', 'All rights reserved.')}</p>
        <button className={styles.privacyLink} onClick={() => setActivePage('privacidad')}>
          {t('Aviso de Privacidad', 'Privacy Policy')}
        </button>
      </div>
    </footer>
  )
}
