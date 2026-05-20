import type { PageId } from '../../../types/types'
import styles from './CallToAction.module.css'
import { useLang } from '../../../context/LangContext'
import { useRestaurant } from '../../../context/RestaurantContext'

interface CallToActionProps {
  setActivePage: (page: PageId) => void
}

export default function CallToAction({ setActivePage }: CallToActionProps) {
  const { t } = useLang()
  const RESTAURANT = useRestaurant()
  return (
    <section className={styles.cta}>
      <div className={styles.bg} />
      <div className={styles.overlay} />
      <div className={styles.content}>
        <p className={styles.tag}>{t('¿Listo para la experiencia?', 'Ready for the experience?')}</p>
        <h2 className={styles.title}>{t('Una mesa está esperando por ti', 'A table is waiting for you')}</h2>
        <div className={styles.divider}><span>✦</span></div>
        <p className={styles.desc}>
          {t('Reserva ahora y vive una noche que recordarás. Disponibilidad limitada.', 'Book now and live a night you\'ll remember. Limited availability.')}
        </p>
        <div className={styles.actions}>
          <button className={styles.btnPrimary} onClick={() => setActivePage('reservaciones')}>
            {t('Reservar Mesa', 'Book a Table')}
          </button>
          <button className={styles.btnSecondary} onClick={() => setActivePage('menu')}>
            {t('Ver Menú', 'View Menu')}
          </button>
        </div>
        <div className={styles.info}>
          <span>📞 {RESTAURANT.phone}</span>
          <span className={styles.sep}>·</span>
          <span>🕐 {t('Mar–Dom  13:00 – 23:00', 'Tue–Sun  13:00 – 23:00')}</span>
          <span className={styles.sep}>·</span>
          <span>📍 {RESTAURANT.neighborhood}, {RESTAURANT.city}</span>
        </div>
      </div>
    </section>
  )
}
