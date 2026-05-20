import { useState } from 'react'
import emailjs from '@emailjs/browser'
import styles from './Reservations.module.css'
import type { ReservationForm } from '../../../types/types'
import { useLang } from '../../../context/LangContext'
import { useRestaurant } from '../../../context/RestaurantContext'
import { supabase } from '../../../lib/supabase'

const timeSlots: string[] = ['13:00', '13:30', '14:00', '14:30', '20:00', '20:30', '21:00', '21:30', '22:00']

function getTodayStr() {
  return new Date().toISOString().split('T')[0]
}

function isMonday(dateStr: string): boolean {
  if (!dateStr) return false
  const d = new Date(dateStr + 'T12:00:00')
  return d.getDay() === 1
}

function isPast(dateStr: string): boolean {
  if (!dateStr) return false
  return dateStr < getTodayStr()
}

type FormErrors = Partial<Record<keyof ReservationForm, string>>

export default function Reservations() {
  const { t } = useLang()
  const RESTAURANT = useRestaurant()
  const [form, setForm] = useState<ReservationForm>({
    name: '', email: '', phone: '', date: '', time: '', guests: '2', notes: ''
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [sendError, setSendError] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
    setErrors(prev => ({ ...prev, [name]: undefined }))
  }

  const validate = (): FormErrors => {
    const errs: FormErrors = {}
    if (!form.name.trim()) errs.name = t('El nombre es requerido', 'Name is required')
    if (!form.email.trim()) errs.email = t('El correo es requerido', 'Email is required')
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = t('Correo inválido', 'Invalid email')
    if (!form.phone.trim()) errs.phone = t('El teléfono es requerido', 'Phone is required')
    if (!form.date) {
      errs.date = t('Selecciona una fecha', 'Select a date')
    } else if (isPast(form.date)) {
      errs.date = t('La fecha no puede ser en el pasado', 'Date cannot be in the past')
    } else if (isMonday(form.date)) {
      errs.date = t('Los lunes estamos cerrados', 'We are closed on Mondays')
    }
    if (!form.time) errs.time = t('Selecciona un horario', 'Select a time')
    return errs
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }

    setLoading(true)
    setSendError(false)

    const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID
    const TEMPLATE_RESERVA = import.meta.env.VITE_EMAILJS_TEMPLATE_RESERVA
    const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY

    try {
      await supabase.from('reservations').insert({
        name: form.name,
        email: form.email,
        phone: form.phone,
        date: form.date,
        time: form.time,
        guests: Number(form.guests),
        notes: form.notes || '',
        status: 'pending',
      })

      if (SERVICE_ID && TEMPLATE_RESERVA && PUBLIC_KEY) {
        await emailjs.send(SERVICE_ID, TEMPLATE_RESERVA, {
          from_name: form.name,
          from_email: form.email,
          phone: form.phone,
          date: form.date,
          time: form.time,
          guests: form.guests,
          notes: form.notes || '—',
        }, PUBLIC_KEY)
      }
      setSubmitted(true)
    } catch {
      setSendError(true)
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <section className={styles.page}>
        <div className={styles.success}>
          <div className={styles.successIcon}>✓</div>
          <h2 className={styles.successTitle}>{t('¡Reservación confirmada!', 'Reservation confirmed!')}</h2>
          <p className={styles.successText}>
            {t(
              <>Hemos recibido tu solicitud para <strong>{form.guests} personas</strong> el <strong>{form.date}</strong> a las <strong>{form.time}</strong>. Te enviaremos una confirmación a <strong>{form.email}</strong> en breve.</>,
              <>We received your request for <strong>{form.guests} guests</strong> on <strong>{form.date}</strong> at <strong>{form.time}</strong>. We'll send a confirmation to <strong>{form.email}</strong> shortly.</>
            )}
          </p>
          <p className={styles.successNote}>{t(`¿Tienes preguntas? Llámanos al ${RESTAURANT.phone}`, `Questions? Call us at ${RESTAURANT.phone}`)}</p>
          <button className={styles.btnBack} onClick={() => { setSubmitted(false); setForm({ name: '', email: '', phone: '', date: '', time: '', guests: '2', notes: '' }) }}>
            {t('Hacer otra reservación', 'Make another reservation')}
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className={styles.page}>
      <div className={styles.container}>
        <div className={styles.info}>
          <p className={styles.tag}>{t('Reservaciones', 'Reservations')}</p>
          <h2 className={styles.title}>{t('Reserve su mesa', 'Reserve your table')}</h2>
          <div className={styles.line} />
          <p className={styles.body}>
            {t(
              'Para una experiencia perfecta, le recomendamos hacer su reservación con al menos 24 horas de anticipación. Para grupos de más de 8 personas, contáctenos directamente.',
              'For a perfect experience, we recommend reserving at least 24 hours in advance. For groups of more than 8, please contact us directly.'
            )}
          </p>

          <div className={styles.infoCards}>
            <div className={styles.infoCard}>
              <span>🕐</span>
              <div>
                <strong>{t('Horarios', 'Hours')}</strong>
                <p>{t('Martes – Domingo', 'Tuesday – Sunday')}</p>
                <p>{t('Comida: 13:00 – 16:00', 'Lunch: 13:00 – 16:00')}</p>
                <p>{t('Cena: 20:00 – 23:00', 'Dinner: 20:00 – 23:00')}</p>
              </div>
            </div>
            <div className={styles.infoCard}>
              <span>📞</span>
              <div>
                <strong>{t('Teléfono', 'Phone')}</strong>
                <p>{RESTAURANT.phone}</p>
                <p>{t('WhatsApp disponible', 'WhatsApp available')}</p>
              </div>
            </div>
            <div className={styles.infoCard}>
              <span>📍</span>
              <div>
                <strong>{t('Ubicación', 'Location')}</strong>
                <p>{RESTAURANT.address}</p>
                <p>{RESTAURANT.neighborhood}, {RESTAURANT.city}</p>
              </div>
            </div>
          </div>
        </div>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <h3 className={styles.formTitle}>{t('Datos de la reservación', 'Reservation details')}</h3>

          <div className={styles.row}>
            <div className={styles.field}>
              <label htmlFor="res-name">{t('Nombre completo *', 'Full name *')}</label>
              <input
                id="res-name" name="name" value={form.name} onChange={handleChange}
                placeholder={t('Juan García', 'John Smith')}
                className={errors.name ? styles.inputError : ''}
                aria-describedby={errors.name ? 'res-name-err' : undefined}
              />
              {errors.name && <span id="res-name-err" className={styles.error} role="alert">{errors.name}</span>}
            </div>
            <div className={styles.field}>
              <label htmlFor="res-email">{t('Correo electrónico *', 'Email address *')}</label>
              <input
                id="res-email" name="email" type="email" value={form.email} onChange={handleChange}
                placeholder="juan@email.com"
                className={errors.email ? styles.inputError : ''}
                aria-describedby={errors.email ? 'res-email-err' : undefined}
              />
              {errors.email && <span id="res-email-err" className={styles.error} role="alert">{errors.email}</span>}
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label htmlFor="res-phone">{t('Teléfono *', 'Phone *')}</label>
              <input
                id="res-phone" name="phone" type="tel" value={form.phone} onChange={handleChange}
                placeholder="(55) 1234-5678"
                className={errors.phone ? styles.inputError : ''}
                aria-describedby={errors.phone ? 'res-phone-err' : undefined}
              />
              {errors.phone && <span id="res-phone-err" className={styles.error} role="alert">{errors.phone}</span>}
            </div>
            <div className={styles.field}>
              <label htmlFor="res-guests">{t('Número de personas *', 'Number of guests *')}</label>
              <select id="res-guests" name="guests" value={form.guests} onChange={handleChange}>
                {[1,2,3,4,5,6,7,8].map(n => (
                  <option key={n} value={n}>{n} {t(n === 1 ? 'persona' : 'personas', n === 1 ? 'guest' : 'guests')}</option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label htmlFor="res-date">{t('Fecha *', 'Date *')}</label>
              <input
                id="res-date" name="date" type="date" value={form.date} onChange={handleChange}
                min={getTodayStr()}
                className={errors.date ? styles.inputError : ''}
                aria-describedby={errors.date ? 'res-date-err' : undefined}
              />
              {errors.date && <span id="res-date-err" className={styles.error} role="alert">{errors.date}</span>}
            </div>
            <div className={styles.field}>
              <label htmlFor="res-time">{t('Hora *', 'Time *')}</label>
              <select
                id="res-time" name="time" value={form.time} onChange={handleChange}
                className={errors.time ? styles.inputError : ''}
                aria-describedby={errors.time ? 'res-time-err' : undefined}
              >
                <option value="">{t('Selecciona hora', 'Select time')}</option>
                {timeSlots.map(slot => <option key={slot} value={slot}>{slot} hrs</option>)}
              </select>
              {errors.time && <span id="res-time-err" className={styles.error} role="alert">{errors.time}</span>}
            </div>
          </div>

          <div className={styles.field}>
            <label htmlFor="res-notes">{t('Notas especiales', 'Special notes')}</label>
            <textarea
              id="res-notes" name="notes" value={form.notes} onChange={handleChange} rows={3}
              placeholder={t('Alergias, ocasión especial, preferencias de mesa...', 'Allergies, special occasion, seating preferences...')}
            />
          </div>

          {sendError && (
            <p className={styles.sendError} role="alert">
              {t(`Hubo un error al enviar. Por favor llámanos al ${RESTAURANT.phone}.`, `There was an error sending. Please call us at ${RESTAURANT.phone}.`)}
            </p>
          )}

          <button type="submit" className={styles.btnSubmit} disabled={loading} aria-busy={loading}>
            {loading ? t('Enviando...', 'Sending...') : t('Confirmar Reservación', 'Confirm Reservation')}
          </button>
          <p className={styles.disclaimer}>{t('* Campos obligatorios. Recibirás confirmación por correo.', '* Required fields. You will receive a confirmation by email.')}</p>
        </form>
      </div>
    </section>
  )
}
