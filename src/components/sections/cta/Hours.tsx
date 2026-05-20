import styles from './Hours.module.css'
import { useIntersection } from '../../../hooks/useIntersection'
import { useLang } from '../../../context/LangContext'
import { useRestaurant } from '../../../context/RestaurantContext'

const today = new Date().getDay()

function isToday(key: string): boolean {
  if (key === 'mon' && today === 1) return true
  if (key === 'tue' && today >= 2 && today <= 4) return true
  if (key === 'fri' && (today === 5 || today === 6)) return true
  if (key === 'sun' && today === 0) return true
  return false
}

export default function Hours() {
  const { t } = useLang()
  const RESTAURANT = useRestaurant()
  const [ref, visible] = useIntersection<HTMLElement>({ threshold: 0.1 })

  const schedule = [
    { key: 'mon', day: t('Lunes', 'Monday'), hours: t('Cerrado', 'Closed'), closed: true },
    { key: 'tue', day: t('Mar – Jue', 'Tue – Thu'), hours: '13:00 – 23:00', closed: false },
    { key: 'fri', day: t('Vie – Sáb', 'Fri – Sat'), hours: '13:00 – 00:00', closed: false },
    { key: 'sun', day: t('Domingo', 'Sunday'), hours: '13:00 – 22:00', closed: false },
  ]

  return (
    <section ref={ref} className={`${styles.hours} fade-up ${visible ? 'visible' : ''}`}>
      <div className={styles.inner}>
        <div className={styles.left}>
          <p className={styles.tag}>{t('Visítanos', 'Visit Us')}</p>
          <h3 className={styles.title}>{t('Horarios', 'Hours')}</h3>
        </div>

        <div className={styles.schedule}>
          {schedule.map(s => (
            <div key={s.key} className={`${styles.row} ${isToday(s.key) ? styles.today : ''} ${s.closed ? styles.closed : ''}`}>
              <span className={styles.dayName}>
                {isToday(s.key) && <span className={styles.todayDot} />}
                {s.day}
              </span>
              <span className={styles.separator} />
              <span className={styles.dayHours}>{s.hours}</span>
            </div>
          ))}
        </div>

        <div className={styles.meta}>
          <span>📍 {RESTAURANT.neighborhood}, {RESTAURANT.city}</span>
          <span>📞 {RESTAURANT.phone}</span>
          <span className={styles.note}>{t('Reservaciones recomendadas con 24h de anticipación.', 'Reservations recommended 24h in advance.')}</span>
        </div>
      </div>
    </section>
  )
}
