import { useState } from 'react'
import styles from './Gallery.module.css'
import type { GalleryItem, MenuCategory } from '../../../types/types'
import { useIntersection } from '../../../hooks/useIntersection'
import { useLang } from '../../../context/LangContext'
import Lightbox from '../../layout/ui/Lightbox'

interface GalleryProps {
  goToMenu: (category: MenuCategory) => void
}

export default function Gallery({ goToMenu }: GalleryProps) {
  const { t } = useLang()
  const [headerRef, headerVisible] = useIntersection<HTMLDivElement>({ threshold: 0.1 })
  const [gridRef, gridVisible] = useIntersection<HTMLDivElement>({ threshold: 0.05 })
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  const items: (GalleryItem & { labelEn: string })[] = [
    { color: '#2d1b1b', label: 'Pasta Fresca', labelEn: 'Fresh Pasta', emoji: '🍝', category: 'Pastas', image: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=1200&auto=format&fit=crop&q=85' },
    { color: '#1b2d1b', label: 'Ensaladas', labelEn: 'Salads', emoji: '🥗', category: 'Entradas', image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=900&auto=format&fit=crop&q=85' },
    { color: '#1b1b2d', label: 'Risotto', labelEn: 'Risotto', emoji: '🍚', category: 'Pastas', image: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=900&auto=format&fit=crop&q=85' },
    { color: '#2d2b1b', label: 'Mariscos', labelEn: 'Seafood', emoji: '🦞', category: 'Mariscos', image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=900&auto=format&fit=crop&q=85' },
    { color: '#2d1b2b', label: 'Postres', labelEn: 'Desserts', emoji: '🍮', category: 'Postres', image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=900&auto=format&fit=crop&q=85' },
    { color: '#1b2b2d', label: 'Vinos', labelEn: 'Wines', emoji: '🍷', category: 'Bebidas', image: 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=900&auto=format&fit=crop&q=85' },
  ]

  return (
    <>
      <section className={styles.gallery}>
        <div ref={headerRef} className={`${styles.header} fade-up ${headerVisible ? 'visible' : ''}`}>
          <h2 className={styles.title}>VITA</h2>
        </div>
        <div ref={gridRef} className={`${styles.grid} fade-in ${gridVisible ? 'visible' : ''}`}>
          {items.map((item, i) => (
            <div
              key={i}
              className={`${styles.item} ${i === 0 ? styles.large : ''}`}
              role="button"
              tabIndex={0}
              aria-label={t(`Ver ${item.label}`, `View ${item.labelEn}`)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goToMenu(item.category) } }}
            >
              <img src={item.image} alt={t(item.label, item.labelEn)} className={styles.itemImg} loading="lazy" decoding="async" />
              <div className={styles.itemOverlay} />
              <div className={styles.itemContent}>
                <span className={styles.label}>{t(item.label, item.labelEn)}</span>
                <div className={styles.actions}>
                  <button
                    className={styles.btnMenu}
                    onClick={() => goToMenu(item.category)}
                    aria-label={t(`Ver platos de ${item.label}`, `View ${item.labelEn} dishes`)}
                  >
                    {t('Ver platos →', 'View dishes →')}
                  </button>
                  <button
                    className={styles.btnZoom}
                    onClick={e => { e.stopPropagation(); setLightboxIndex(i) }}
                    aria-label={t('Ampliar imagen', 'Enlarge image')}
                  >
                    🔍
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {lightboxIndex !== null && (
        <Lightbox
          src={items[lightboxIndex].image}
          alt={t(items[lightboxIndex].label, items[lightboxIndex].labelEn)}
          onClose={() => setLightboxIndex(null)}
          onPrev={lightboxIndex > 0 ? () => setLightboxIndex(i => i! - 1) : undefined}
          onNext={lightboxIndex < items.length - 1 ? () => setLightboxIndex(i => i! + 1) : undefined}
        />
      )}
    </>
  )
}
