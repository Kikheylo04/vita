import { useState, useEffect } from 'react'
import type { SpecialEvent, PageId } from '../../../types/types'
import styles from './Events.module.css'
import { useIntersection } from '../../../hooks/useIntersection'
import { useLang } from '../../../context/LangContext'
import { supabase } from '../../../lib/supabase'

interface EventsProps {
  setActivePage: (page: PageId) => void
}

const STATIC_EVENTS: SpecialEvent[] = [
  {
    id: '1',
    title: 'Cena de Degustación / Tasting Dinner',
    date: '2026-07-11',
    description: 'es:Una experiencia de 7 tiempos maridada con vinos toscanos seleccionados. Cupo limitado a 20 personas.|en:A 7-course experience paired with selected Tuscan wines. Limited to 20 guests.',
    imageUrl: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: '2',
    title: 'Noche de Trufa Blanca / White Truffle Night',
    date: '2026-08-08',
    description: 'es:Menú especial dedicado a la trufa blanca de temporada. Chef Marco Rossi en vivo explicando cada platillo.|en:Special menu dedicated to seasonal white truffle. Chef Marco Rossi live explaining each dish.',
    imageUrl: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: '3',
    title: 'Maridaje Prosecco & Pasta / Prosecco & Pasta Pairing',
    date: '2026-09-05',
    description: 'es:Tarde de sábado con taller de pasta artesanal y maridaje de proseccos italianos. Incluye cena.|en:Saturday afternoon with artisan pasta workshop and Italian prosecco pairing. Dinner included.',
    imageUrl: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=600&auto=format&fit=crop&q=80',
  },
]

function formatDate(iso: string, lang: string): string {
  const date = new Date(iso)
  return date.toLocaleDateString(lang === 'es' ? 'es-MX' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' })
}

function getDesc(description: string, lang: string): string {
  if (!description.startsWith('es:')) return description
  const parts = description.split('|')
  const esPart = parts.find(p => p.startsWith('es:'))?.slice(3) ?? description
  const enPart = parts.find(p => p.startsWith('en:'))?.slice(3) ?? description
  return lang === 'es' ? esPart : enPart
}

function getTitle(title: string, lang: string): string {
  const parts = title.split(' / ')
  return lang === 'es' ? parts[0] : (parts[1] ?? parts[0])
}

export default function Events({ setActivePage }: EventsProps) {
  const { t, lang } = useLang()
  const [headerRef, headerVisible] = useIntersection<HTMLDivElement>({ threshold: 0.1 })
  const [gridRef, gridVisible] = useIntersection<HTMLDivElement>({ threshold: 0.05 })
  const [events, setEvents] = useState<SpecialEvent[]>(STATIC_EVENTS)

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    supabase
      .from('events')
      .select('*')
      .eq('active', true)
      .gte('date', today)
      .order('date', { ascending: true })
      .then(({ data }) => {
        if (!data || data.length === 0) return
        setEvents(data.map(r => ({
          id: String(r.id),
          title: r.title_en ? `${r.title} / ${r.title_en}` : r.title,
          date: r.date,
          description: r.description_en
            ? `es:${r.description}|en:${r.description_en}`
            : r.description,
          imageUrl: r.image_url ?? '',
        })))
      })
  }, [])

  return (
    <section className={styles.section}>
      <div ref={headerRef} className={`${styles.header} fade-up ${headerVisible ? 'visible' : ''}`}>
        <p className={styles.tag}>{t('Próximamente', 'Coming Soon')}</p>
        <h2 className={styles.title}>{t('Eventos especiales', 'Special Events')}</h2>
        <div className={styles.divider}><span>✦</span></div>
        <p className={styles.subtitle}>{t('Experiencias únicas que van más allá de una cena.', 'Unique experiences that go beyond a dinner.')}</p>
      </div>

      <div ref={gridRef} className={`${styles.grid} fade-up ${gridVisible ? 'visible' : ''}`}>
        {events.map((event, i) => (
          <div key={event.id} className={`${styles.card} ${i === 0 ? styles.featured : ''}`}>
            {event.imageUrl && (
              <div className={styles.imgWrapper}>
                <img src={event.imageUrl} alt={getTitle(event.title, lang)} className={styles.img} loading="lazy" decoding="async" />
                {i === 0 && <span className={styles.featuredBadge}>{t('Próximo evento', 'Next event')}</span>}
              </div>
            )}
            <div className={styles.body}>
              <p className={styles.date}>📅 {formatDate(event.date, lang)}</p>
              <h3 className={styles.eventTitle}>{getTitle(event.title, lang)}</h3>
              <p className={styles.desc}>{getDesc(event.description, lang)}</p>
              <button
                className={styles.btn}
                onClick={() => setActivePage('reservaciones')}
              >
                {t('Reservar lugar →', 'Reserve a spot →')}
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
