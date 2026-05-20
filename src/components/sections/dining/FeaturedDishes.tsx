import { useState } from 'react'
import styles from './FeaturedDishes.module.css'
import type { PageId } from '../../../types/types'
import { useIntersection } from '../../../hooks/useIntersection'
import { useLang } from '../../../context/LangContext'
import { useFormatPrice } from '../../../context/RestaurantContext'
import { useCart } from '../../../context/CartContext'

interface FeaturedDishesProps {
  setActivePage: (page: PageId) => void
}

const dishes = [
  {
    name: 'Bistecca alla Fiorentina',
    descEs: 'Corte T-Bone de 500g con papas al romero. La estrella de nuestra carta desde el primer día.',
    descEn: '500g T-Bone cut with rosemary potatoes. The star of our menu since day one.',
    price: 28.99,
    badge: 'Signature',
    image: 'https://images.unsplash.com/photo-1558030006-450675393462?w=800&auto=format&fit=crop&q=85',
  },
  {
    name: 'Risotto al Tartufo',
    descEs: 'Arroz carnaroli cremoso con trufa blanca de temporada importada directamente de Italia.',
    descEn: 'Creamy carnaroli rice with seasonal white truffle imported directly from Italy.',
    price: 16.99,
    badge: 'Temporada',
    image: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=800&auto=format&fit=crop&q=85',
  },
  {
    name: 'Tagliatelle al Ragù',
    descEs: 'Pasta fresca artesanal con ragù de res y cerdo cocinado a fuego lento durante 6 horas.',
    descEn: 'Artisan fresh pasta with beef and pork ragù slow-cooked for 6 hours.',
    price: 11.99,
    badge: "Chef's Choice",
    image: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=800&auto=format&fit=crop&q=85',
  },
]

export default function FeaturedDishes({ setActivePage }: FeaturedDishesProps) {
  const { t, lang } = useLang()
  const formatPrice = useFormatPrice()
  const { add } = useCart()
  const [added, setAdded] = useState<string | null>(null)
  const [headerRef, headerVisible] = useIntersection<HTMLDivElement>({ threshold: 0.1 })
  const [gridRef, gridVisible] = useIntersection<HTMLDivElement>({ threshold: 0.05 })

  const handlePreOrder = (dish: typeof dishes[0]) => {
    add({ name: dish.name, price: dish.price, image: dish.image })
    setAdded(dish.name)
    setTimeout(() => { setAdded(null); setActivePage('pedido') }, 800)
  }

  return (
    <section className={styles.section}>
      <div ref={headerRef} className={`${styles.header} fade-up ${headerVisible ? 'visible' : ''}`}>
        <p className={styles.tag}>{t('Lo mejor de nuestra cocina', 'The best of our kitchen')}</p>
        <h2 className={styles.title}>{t('Platos Estrella', 'Signature Dishes')}</h2>
        <div className={styles.divider}><span>✦</span></div>
      </div>

      <div ref={gridRef} className={`${styles.grid} fade-up ${gridVisible ? 'visible' : ''}`}>
        {dishes.map((dish, i) => (
          <div key={i} className={styles.card}>
            <div className={styles.imgWrapper}>
              <img src={dish.image} alt={dish.name} className={styles.img} loading="lazy" decoding="async" />
              <span className={styles.badge}>{dish.badge}</span>
            </div>
            <div className={styles.body}>
              <h3 className={styles.name}>{dish.name}</h3>
              <p className={styles.desc}>{lang === 'es' ? dish.descEs : dish.descEn}</p>
              <div className={styles.footer}>
                <span className={styles.price}>{formatPrice(dish.price)}</span>
                <button
                  className={`${styles.btn} ${added === dish.name ? styles.btnAdded : ''}`}
                  onClick={() => handlePreOrder(dish)}
                >
                  {added === dish.name ? t('✓ Agregado', '✓ Added') : t('Pedir anticipado', 'Pre-order')}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className={`${styles.cta} fade-up ${gridVisible ? 'visible' : ''}`}>
        <button className={styles.ctaBtn} onClick={() => setActivePage('menu')}>
          {t('Ver menú completo →', 'View full menu →')}
        </button>
      </div>
    </section>
  )
}
