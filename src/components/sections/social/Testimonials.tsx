import { useState, useEffect } from 'react'
import type { Testimonial } from '../../../types/types'
import { useIntersection } from '../../../hooks/useIntersection'
import { useLang } from '../../../context/LangContext'
import styles from './Testimonials.module.css'
import { supabase } from '../../../lib/supabase'

function TestimonialForm() {
  const { t } = useLang()
  const [form, setForm] = useState({ name: '', role: '', rating: 5, comment: '' })
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || !form.comment.trim()) return
    setLoading(true)
    await supabase.from('testimonials').insert({
      name: form.name.trim(),
      role: form.role.trim(),
      rating: form.rating,
      comment: form.comment.trim(),
      status: 'pending',
    })
    setLoading(false)
    setSent(true)
  }

  if (!open) {
    return (
      <div className={styles.formToggle}>
        <button className={styles.btnLeaveReview} onClick={() => setOpen(true)}>
          ★ {t('Deja tu reseña', 'Leave a review')}
        </button>
      </div>
    )
  }

  if (sent) {
    return (
      <div className={styles.formWrap}>
        <div className={styles.formThanks}>
          <span>✓</span>
          <p>{t('¡Gracias por tu reseña! La publicaremos pronto.', 'Thank you for your review! We\'ll publish it soon.')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.formWrap}>
      <h3 className={styles.formTitle}>{t('Comparte tu experiencia', 'Share your experience')}</h3>
      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.formRow}>
          <div className={styles.formField}>
            <label>{t('Tu nombre *', 'Your name *')}</label>
            <input name="name" value={form.name} onChange={handleChange} placeholder={t('María García', 'Maria Garcia')} required />
          </div>
          <div className={styles.formField}>
            <label>{t('Ocasión (opcional)', 'Occasion (optional)')}</label>
            <input name="role" value={form.role} onChange={handleChange} placeholder={t('Cena de aniversario', 'Anniversary dinner')} />
          </div>
        </div>

        <div className={styles.formField}>
          <label>{t('Calificación', 'Rating')}</label>
          <div className={styles.ratingRow}>
            {[1,2,3,4,5].map(n => (
              <button
                key={n}
                type="button"
                className={`${styles.ratingStar} ${n <= form.rating ? styles.ratingStarOn : ''}`}
                onClick={() => setForm(f => ({ ...f, rating: n }))}
              >★</button>
            ))}
          </div>
        </div>

        <div className={styles.formField}>
          <label>{t('Tu reseña *', 'Your review *')}</label>
          <textarea
            name="comment"
            value={form.comment}
            onChange={handleChange}
            rows={4}
            placeholder={t('Cuéntanos tu experiencia en VITA...', 'Tell us about your experience at VITA...')}
            required
          />
        </div>

        <div className={styles.formActions}>
          <button type="button" className={styles.btnCancel} onClick={() => setOpen(false)}>
            {t('Cancelar', 'Cancel')}
          </button>
          <button type="submit" className={styles.btnSubmit} disabled={loading}>
            {loading ? t('Enviando...', 'Sending...') : t('Enviar reseña', 'Submit review')}
          </button>
        </div>
        <p className={styles.formNote}>{t('Tu reseña será revisada antes de publicarse.', 'Your review will be moderated before publishing.')}</p>
      </form>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className={styles.skeletonCard}>
      <div className={styles.skeletonLine} style={{ width: '60%', height: '12px' }} />
      <div className={styles.skeletonLine} style={{ width: '100%', height: '10px', marginTop: '0.8rem' }} />
      <div className={styles.skeletonLine} style={{ width: '80%', height: '10px' }} />
      <div className={styles.skeletonAuthor}>
        <div className={styles.skeletonAvatar} />
        <div>
          <div className={styles.skeletonLine} style={{ width: '80px', height: '10px' }} />
          <div className={styles.skeletonLine} style={{ width: '60px', height: '8px' }} />
        </div>
      </div>
    </div>
  )
}

const STATIC_TESTIMONIALS_ES: Testimonial[] = [
  { id: '1', name: 'Sofía Martínez', role: 'Cliente frecuente', rating: 5, comment: 'Cada visita a VITA es una experiencia única. La pasta fresca es simplemente extraordinaria y el servicio impecable. Sin duda el mejor restaurante italiano de la ciudad.', date: '2024-11-15' },
  { id: '2', name: 'Carlos Herrera', role: 'Cena de aniversario', rating: 5, comment: 'Celebramos nuestro aniversario aquí y fue mágico. El ambiente, la comida, los vinos... todo perfectamente coordinado. El chef Marco nos sorprendió con un postre especial.', date: '2024-10-28' },
  { id: '3', name: 'Andrea López', role: 'Cena de negocios', rating: 5, comment: 'Llevé a clientes importantes y quedaron impresionados. El salón privado es perfecto para reuniones. La Bistecca alla Fiorentina es un plato que hablan mis clientes hasta hoy.', date: '2024-12-03' },
  { id: '4', name: 'Roberto Díaz', role: 'Foodie & crítico', rating: 5, comment: 'El Risotto al Tartufo es de otro nivel. He comido en restaurantes de toda Europa y VITA está a la altura de los mejores. Los ingredientes importados directamente de Italia marcan la diferencia.', date: '2024-09-20' },
]

const STATIC_TESTIMONIALS_EN: Testimonial[] = [
  { id: '1', name: 'Sofía Martínez', role: 'Regular guest', rating: 5, comment: 'Every visit to VITA is a unique experience. The fresh pasta is simply extraordinary and the service impeccable. Undoubtedly the best Italian restaurant in the city.', date: '2024-11-15' },
  { id: '2', name: 'Carlos Herrera', role: 'Anniversary dinner', rating: 5, comment: 'We celebrated our anniversary here and it was magical. The atmosphere, the food, the wines... everything perfectly coordinated. Chef Marco surprised us with a special dessert.', date: '2024-10-28' },
  { id: '3', name: 'Andrea López', role: 'Business dinner', rating: 5, comment: 'I brought important clients and they were impressed. The private room is perfect for meetings. The Bistecca alla Fiorentina is a dish my clients still talk about today.', date: '2024-12-03' },
  { id: '4', name: 'Roberto Díaz', role: 'Foodie & critic', rating: 5, comment: 'The Risotto al Tartufo is on another level. I\'ve dined at restaurants across Europe and VITA holds its own against the best. Ingredients imported directly from Italy make all the difference.', date: '2024-09-20' },
]

function StarRating({ rating }: { rating: number }) {
  return (
    <div className={styles.stars}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={i < rating ? styles.starFilled : styles.starEmpty}>★</span>
      ))}
    </div>
  )
}

function Avatar({ name, avatar }: { name: string; avatar?: string }) {
  if (avatar) return <img src={avatar} alt={name} className={styles.avatarImg} />
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2)
  return <div className={styles.avatarInitials}>{initials}</div>
}

export default function Testimonials() {
  const { t, lang } = useLang()
  const [sectionRef, isVisible] = useIntersection<HTMLElement>({ threshold: 0.1 })
  const staticFallback = lang === 'es' ? STATIC_TESTIMONIALS_ES : STATIC_TESTIMONIALS_EN
  const [testimonials, setTestimonials] = useState<Testimonial[]>(staticFallback)
  const [loading, setLoading] = useState(true)
  const [active, setActive] = useState(0)

  useEffect(() => {
    supabase
      .from('testimonials')
      .select('*')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data && data.length > 0) {
          setTestimonials(data.map(r => ({
            id: String(r.id),
            name: r.name,
            role: r.role ?? '',
            avatar: r.avatar ?? undefined,
            rating: r.rating,
            comment: r.comment,
            date: r.created_at?.slice(0, 10) ?? '',
          })))
        }
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    setActive(0)
  }, [lang])

  useEffect(() => {
    const timer = setInterval(() => {
      setActive(prev => (prev + 1) % testimonials.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [testimonials.length])

  const current = testimonials[active]

  return (
    <section ref={sectionRef} className={`${styles.section} fade-in ${isVisible ? 'visible' : ''}`}>
      <div className={styles.header}>
        <p className={styles.tag}>{t('Lo que dicen nuestros clientes', 'What our guests say')}</p>
        <h2 className={styles.title}>{t('Experiencias que hablan por sí solas', 'Experiences that speak for themselves')}</h2>
        <div className={styles.divider}><span>✦</span></div>
      </div>

      <div className={styles.featured}>
        <div className={styles.quoteIcon}>"</div>
        <p className={styles.comment}>{current.comment}</p>
        <div className={styles.author}>
          <Avatar name={current.name} avatar={current.avatar} />
          <div>
            <p className={styles.name}>{current.name}</p>
            <p className={styles.role}>{current.role}</p>
          </div>
          <StarRating rating={current.rating} />
        </div>
      </div>

      <div className={styles.grid}>
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          : testimonials.map((testimonial, i) => (
            <button
              key={testimonial.id}
              className={`${styles.card} ${i === active ? styles.cardActive : ''}`}
              onClick={() => setActive(i)}
            >
              <StarRating rating={testimonial.rating} />
              <p className={styles.cardComment}>"{testimonial.comment.slice(0, 100)}..."</p>
              <div className={styles.cardAuthor}>
                <Avatar name={testimonial.name} avatar={testimonial.avatar} />
                <div>
                  <p className={styles.cardName}>{testimonial.name}</p>
                  <p className={styles.cardRole}>{testimonial.role}</p>
                </div>
              </div>
            </button>
          ))
        }
      </div>

      <div className={styles.dots}>
        {testimonials.map((_, i) => (
          <button
            key={i}
            className={`${styles.dot} ${i === active ? styles.dotActive : ''}`}
            onClick={() => setActive(i)}
          />
        ))}
      </div>

      <TestimonialForm />
    </section>
  )
}
