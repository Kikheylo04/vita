import { useState, useEffect } from 'react'
import styles from './CookieBanner.module.css'
import { useLang } from '../../../context/LangContext'
import type { PageId } from '../../../types/types'

const STORAGE_KEY = 'vita_cookie_consent'

interface CookieBannerProps {
  setActivePage: (page: PageId) => void
}

export default function CookieBanner({ setActivePage }: CookieBannerProps) {
  const { t } = useLang()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      const timer = setTimeout(() => setVisible(true), 1200)
      return () => clearTimeout(timer)
    }
  }, [])

  const accept = () => {
    localStorage.setItem(STORAGE_KEY, 'accepted')
    setVisible(false)
  }

  const decline = () => {
    localStorage.setItem(STORAGE_KEY, 'declined')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className={styles.banner} role="dialog" aria-live="polite" aria-label={t('Aviso de cookies', 'Cookie notice')}>
      <div className={styles.inner}>
        <div className={styles.text}>
          <p className={styles.title}>{t('Usamos cookies', 'We use cookies')}</p>
          <p className={styles.desc}>
            {t(
              'Utilizamos cookies para mejorar tu experiencia en nuestro sitio. Al continuar navegando, aceptas su uso conforme a nuestro ',
              'We use cookies to improve your experience. By continuing to browse, you agree to their use in accordance with our '
            )}
            <button className={styles.link} onClick={() => { setVisible(false); setActivePage('privacidad') }}>
              {t('Aviso de Privacidad', 'Privacy Policy')}
            </button>.
          </p>
        </div>
        <div className={styles.actions}>
          <button className={styles.btnDecline} onClick={decline}>
            {t('Rechazar', 'Decline')}
          </button>
          <button className={styles.btnAccept} onClick={accept}>
            {t('Aceptar', 'Accept')}
          </button>
        </div>
      </div>
    </div>
  )
}
