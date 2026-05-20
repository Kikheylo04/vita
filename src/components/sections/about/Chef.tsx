import styles from './Chef.module.css'
import { useIntersection } from '../../../hooks/useIntersection'
import { useLang } from '../../../context/LangContext'
import { useRestaurant } from '../../../context/RestaurantContext'

export default function Chef() {
  const { t } = useLang()
  const RESTAURANT = useRestaurant()
  const [imgRef, imgVisible] = useIntersection<HTMLDivElement>({ threshold: 0.1 })
  const [textRef, textVisible] = useIntersection<HTMLDivElement>({ threshold: 0.1 })

  const awards = [
    { year: '2018', title: t('Mejor Restaurante Italiano', 'Best Italian Restaurant'), org: t('Guía México Gastronómico', 'Mexico Gastronomic Guide') },
    { year: '2020', title: t('Chef del Año', 'Chef of the Year'), org: 'Premios Culinaria LATAM' },
    { year: '2022', title: t('Estrella de Oro', 'Gold Star'), org: 'Fine Dining World Awards' },
    { year: '2024', title: t('Top 50 Restaurantes México', 'Top 50 Restaurants Mexico'), org: t('Revista Sabores', 'Sabores Magazine') },
  ]

  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <div ref={imgRef} className={`${styles.imgCol} slide-left ${imgVisible ? 'visible' : ''}`}>
          <div className={styles.imgWrapper}>
            <img
              src="https://images.unsplash.com/photo-1607631568010-a87245c0daf8?w=700&auto=format&fit=crop&q=80"
              alt={`Chef ${RESTAURANT.chef.name}`}
              className={styles.img}
              loading="lazy"
              decoding="async"
            />
            <div className={styles.expBadge}>
              <span className={styles.expNum}>20+</span>
              <span className={styles.expLabel}>{t('años de experiencia', 'years of experience')}</span>
            </div>
          </div>
        </div>

        <div ref={textRef} className={`${styles.content} fade-up ${textVisible ? 'visible' : ''}`}>
          <p className={styles.tag}>{t('Conoce al artista', 'Meet the artist')}</p>
          <h2 className={styles.title}>Chef {RESTAURANT.chef.name}</h2>
          <div className={styles.line} />
          <p className={styles.bio}>
            {t(
              'Nacido en Florencia, Italia, Marco Rossi creció entre los sabores de la cocina toscana de su abuela. A los 18 años ingresó al prestigioso Institut Paul Bocuse en Lyon, donde perfeccionó su técnica bajo la tutela de maestros europeos.',
              'Born in Florence, Italy, Marco Rossi grew up immersed in the flavors of his grandmother\'s Tuscan kitchen. At 18 he enrolled at the prestigious Institut Paul Bocuse in Lyon, where he refined his technique under European masters.'
            )}
          </p>
          <p className={styles.bio}>
            {t(
              'Tras trabajar en restaurantes con estrella Michelin en Milán, París y Nueva York, Marco llegó a México en 2009 con un sueño: crear un espacio donde la autenticidad italiana conviviera con los sabores del mundo. Así nació VITA.',
              'After working in Michelin-starred restaurants in Milan, Paris, and New York, Marco arrived in Mexico in 2009 with a dream: to create a space where Italian authenticity meets the flavors of the world. That\'s how VITA was born.'
            )}
          </p>
          <p className={styles.bio}>
            {t(
              <>Su filosofía es simple: <em>"Los mejores ingredientes, las recetas más honestas, y el corazón puesto en cada plato."</em></>,
              <>His philosophy is simple: <em>"The finest ingredients, the most honest recipes, and a heart poured into every dish."</em></>
            )}
          </p>

          <div className={styles.awards}>
            <h3 className={styles.awardsTitle}>{t('Reconocimientos', 'Awards')}</h3>
            <div className={styles.awardsList}>
              {awards.map(a => (
                <div key={a.year} className={styles.award}>
                  <span className={styles.awardYear}>{a.year}</span>
                  <div>
                    <p className={styles.awardTitle}>{a.title}</p>
                    <p className={styles.awardOrg}>{a.org}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
