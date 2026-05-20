import styles from './About.module.css'
import { useIntersection } from '../../../hooks/useIntersection'
import { useLang } from '../../../context/LangContext'
import { useRestaurant } from '../../../context/RestaurantContext'

export default function About() {
  const { t } = useLang()
  const RESTAURANT = useRestaurant()
  const [imgRef, imgVisible] = useIntersection<HTMLDivElement>({ threshold: 0.1 })
  const [textRef, textVisible] = useIntersection<HTMLDivElement>({ threshold: 0.1 })
  const [featRef, featVisible] = useIntersection<HTMLDivElement>({ threshold: 0.1 })

  const features = [
    {
      image: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&auto=format&fit=crop&q=80',
      title: t('Vinos Selectos', 'Curated Wines'),
      desc: t('Cava con más de 200 etiquetas de los mejores viñedos del mundo.', 'Cellar with over 200 labels from the world\'s finest vineyards.'),
      imgPosition: 'center',
    },
    {
      image: 'https://images.unsplash.com/photo-1607631568010-a87245c0daf8?w=400&auto=format&fit=crop&q=80',
      title: t('Chef Premiado', 'Award-Winning Chef'),
      desc: t('Nuestro chef ejecutivo cuenta con dos estrellas Michelin y 20 años de experiencia.', 'Our executive chef holds two Michelin stars and 20 years of experience.'),
      imgPosition: 'top center',
    },
    {
      image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&auto=format&fit=crop&q=80',
      title: t('Ingredientes Frescos', 'Fresh Ingredients'),
      desc: t('Productos de temporada de productores locales y seleccionados directamente en Italia.', 'Seasonal produce from local growers and direct suppliers in Italy.'),
      imgPosition: 'center',
    },
    {
      image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&auto=format&fit=crop&q=80',
      title: t('Ambiente Íntimo', 'Intimate Atmosphere'),
      desc: t('Salones privados disponibles para celebraciones y cenas de negocios.', 'Private rooms available for celebrations and business dinners.'),
      imgPosition: 'center',
    },
  ]

  return (
    <section className={styles.about}>
      <div className={styles.container}>
        <div ref={imgRef} className={`${styles.imageCol} slide-left ${imgVisible ? 'visible' : ''}`}>
          <div className={styles.imageWrapper}>
            <img
              src="https://images.unsplash.com/photo-1581299894007-aaa50297cf16?w=800&auto=format&fit=crop&q=80"
              alt={t(`Chef ${RESTAURANT.chef.name} en la cocina`, `Chef ${RESTAURANT.chef.name} in the kitchen`)}
              className={styles.chefImg}
              loading="lazy"
              decoding="async"
            />
            <div className={styles.imageBadge}>
              <span>✦</span>
              <strong>{t(`Desde ${RESTAURANT.foundedYear}`, `Since ${RESTAURANT.foundedYear}`)}</strong>
            </div>
          </div>
        </div>
        <div ref={textRef} className={`${styles.text} fade-up ${textVisible ? 'visible' : ''}`}>
          <p className={styles.tag}>{t('Nuestra historia', 'Our story')}</p>
          <h2 className={styles.title}>{t('Una pasión que se convirtió en tradición', 'A passion that became a tradition')}</h2>
          <div className={styles.line} />
          <p className={styles.body}>
            {t(
              'Fundado en 2009 por la familia Rossi, VITA nació del sueño de traer la auténtica cocina italiana a nuestra ciudad. Cada receta es un homenaje a las abuelas de Toscana, combinando técnicas tradicionales con la creatividad de la cocina contemporánea.',
              'Founded in 2009 by the Rossi family, VITA was born from the dream of bringing authentic Italian cuisine to our city. Every recipe is a tribute to the grandmothers of Tuscany, blending traditional techniques with contemporary culinary creativity.'
            )}
          </p>
          <p className={styles.body}>
            {t(
              'Hoy, más de 15 años después, seguimos siendo el mismo restaurante familiar donde el cliente es tratado como un invitado en casa. Nuestro compromiso: que cada visita sea una experiencia que valga la pena recordar.',
              'Today, more than 15 years later, we remain the same family restaurant where every guest is treated like a visitor at home. Our commitment: to make every visit an experience worth remembering.'
            )}
          </p>
          <div className={styles.signature}>— {RESTAURANT.chef.name}, {t(RESTAURANT.chef.title, RESTAURANT.chef.titleEn)}</div>
        </div>
        <div ref={featRef} className={`${styles.features} slide-right ${featVisible ? 'visible' : ''}`}>
          {features.map(f => (
            <div key={f.title} className={styles.card}>
              <div className={styles.cardImgWrapper}>
                <img src={f.image} alt={f.title} className={styles.cardImg} loading="lazy" decoding="async" style={{ objectPosition: f.imgPosition }} />
              </div>
              <div className={styles.cardBody}>
                <h3 className={styles.cardTitle}>{f.title}</h3>
                <p className={styles.cardDesc}>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
