import type { PageId } from '../../../types/types'
import styles from './NotFound.module.css'
import { useLang } from '../../../context/LangContext'

interface NotFoundProps {
  setActivePage: (page: PageId) => void
}

export default function NotFound({ setActivePage }: NotFoundProps) {
  const { t } = useLang()
  return (
    <section className={styles.page}>
      <div className={styles.bg} />
      <div className={styles.content}>
        <p className={styles.code}>404</p>
        <div className={styles.divider}><span>✦</span></div>
        <h1 className={styles.title}>{t('Página no encontrada', 'Page not found')}</h1>
        <p className={styles.desc}>
          {t(
            <>Parece que esta página no existe en nuestro menú.<br />Permítenos llevarte de vuelta a la experiencia.</>,
            <>This page doesn't seem to exist on our menu.<br />Let us take you back to the experience.</>
          )}
        </p>
        <div className={styles.actions}>
          <button className={styles.btnPrimary} onClick={() => setActivePage('home')}>
            {t('Volver al inicio', 'Back to home')}
          </button>
          <button className={styles.btnSecondary} onClick={() => setActivePage('menu')}>
            {t('Ver el menú', 'View the menu')}
          </button>
        </div>
      </div>
    </section>
  )
}
