import styles from './Hero.module.css'
import type { PageId } from '../../../types/types'
import { useLang } from '../../../context/LangContext'
import { useCountUp } from '../../../hooks/useCountUp'

interface HeroProps {
  setActivePage: (page: PageId) => void
}

function AnimatedStat({ target, suffix, label }: { target: number; suffix: string; label: string }) {
  const [count, ref] = useCountUp(target, 1600)
  return (
    <div className={styles.badge} ref={ref as React.RefObject<HTMLDivElement>}>
      <span className={styles.badgeNum}>{suffix === '★' ? `★ ${(count / 10).toFixed(1)}` : `${count}${suffix}`}</span>
      <span className={styles.badgeLabel}>{label}</span>
    </div>
  )
}

export default function Hero({ setActivePage }: HeroProps) {
  const { t } = useLang()

  return (
    <section className={styles.hero}>
      <div className={styles.heroBg} />
      <div className={styles.overlay} />
      <div className={styles.content}>
        <p className={styles.subtitle}>Vera Italia Tavola Autentica</p>
        <h1 className={styles.title}>VITA</h1>
        <div className={styles.divider}><span>✦</span></div>
        <p className={styles.description}>
          {t(
            'Donde cada plato es una obra de arte y cada momento se convierte en un recuerdo inolvidable. Cocina italiana auténtica en el corazón de la ciudad.',
            'Where every dish is a work of art and every moment becomes an unforgettable memory. Authentic Italian cuisine in the heart of the city.'
          )}
        </p>
        <div className={styles.actions}>
          <button className={styles.btnPrimary} onClick={() => setActivePage('menu')}>
            {t('Ver Menú', 'View Menu')}
          </button>
          <button className={styles.btnSecondary} onClick={() => setActivePage('reservaciones')}>
            {t('Reservar Mesa', 'Book a Table')}
          </button>
        </div>
        <div className={styles.badges}>
          <AnimatedStat target={15} suffix="+" label={t('Años de experiencia', 'Years of experience')} />
          <div className={styles.badgeDivider} />
          <AnimatedStat target={50} suffix="+" label={t('Platos en el menú', 'Dishes on the menu')} />
          <div className={styles.badgeDivider} />
          <AnimatedStat target={49} suffix="★" label={t('Calificación promedio', 'Average rating')} />
        </div>
      </div>
      <div className={styles.scrollIndicator} aria-hidden="true">
        <span className={styles.scrollLine} />
      </div>
    </section>
  )
}
