import { useState } from 'react'
import emailjs from '@emailjs/browser'
import styles from './Contact.module.css'
import type { ContactForm } from '../../../types/types'
import { useLang } from '../../../context/LangContext'
import { useRestaurant } from '../../../context/RestaurantContext'
import { supabase } from '../../../lib/supabase'

type ContactErrors = Partial<Record<keyof ContactForm, string>>

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function Contact() {
  const { t } = useLang()
  const RESTAURANT = useRestaurant()
  const [form, setForm] = useState<ContactForm>({ name: '', email: '', subject: '', message: '' })
  const [errors, setErrors] = useState<ContactErrors>({})
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [sendError, setSendError] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
    if (errors[name as keyof ContactForm]) setErrors(er => ({ ...er, [name]: '' }))
  }

  const validate = (): ContactErrors => {
    const e: ContactErrors = {}
    if (!form.name.trim()) e.name = t('El nombre es requerido', 'Name is required')
    if (!form.email.trim()) e.email = t('El correo es requerido', 'Email is required')
    else if (!EMAIL_RE.test(form.email)) e.email = t('Correo inválido', 'Invalid email')
    if (!form.subject.trim()) e.subject = t('El asunto es requerido', 'Subject is required')
    if (!form.message.trim()) e.message = t('El mensaje es requerido', 'Message is required')
    else if (form.message.trim().length < 10) e.message = t('El mensaje es muy corto', 'Message is too short')
    return e
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }

    setLoading(true)
    setSendError(false)

    const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID
    const TEMPLATE_CONTACT = import.meta.env.VITE_EMAILJS_TEMPLATE_CONTACT
    const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY

    try {
      await supabase.from('contact_messages').insert({
        name: form.name,
        email: form.email,
        subject: form.subject,
        message: form.message,
      })

      if (SERVICE_ID && TEMPLATE_CONTACT && PUBLIC_KEY) {
        await emailjs.send(SERVICE_ID, TEMPLATE_CONTACT, {
          from_name: form.name,
          from_email: form.email,
          subject: form.subject,
          message: form.message,
        }, PUBLIC_KEY)
      }
      setSent(true)
    } catch {
      setSendError(true)
    } finally {
      setLoading(false)
    }
  }

  const contactItems = [
    { icon: '📞', label: t('Teléfono', 'Phone'), value: RESTAURANT.phone },
    { icon: '📧', label: t('Correo', 'Email'), value: RESTAURANT.email },
    { icon: '📸', label: 'Instagram', value: `@${RESTAURANT.instagram}` },
    { icon: '🕐', label: t('Horarios', 'Hours'), value: t('Mar–Dom 13:00–23:00', 'Tue–Sun 13:00–23:00') },
  ]

  return (
    <section className={styles.page}>
      <div className={styles.header}>
        <p className={styles.tag}>{t('Contáctanos', 'Contact Us')}</p>
        <h2 className={styles.title}>{t('Estamos para servirte', 'We are here for you')}</h2>
        <div className={styles.divider}><span>✦</span></div>
      </div>

      <div className={styles.container}>
        <div className={styles.map}>
          <div className={styles.mapWrapper}>
            <iframe
              title={t('Ubicación VITA Restaurante', 'VITA Restaurant Location')}
              src={RESTAURANT.mapsEmbed}
              width="100%"
              height="260"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
          <div className={styles.contactInfo}>
            {contactItems.map(item => (
              <div key={item.label} className={styles.contactRow}>
                <span className={styles.contactIcon}>{item.icon}</span>
                <div>
                  <span className={styles.contactLabel}>{item.label}</span>
                  <span className={styles.contactValue}>{item.value}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {sent ? (
          <div className={styles.thanks}>
            <div className={styles.thanksIcon}>✉️</div>
            <h3>{t('¡Mensaje enviado!', 'Message sent!')}</h3>
            <p>{t('Te responderemos en menos de 24 horas.', 'We\'ll get back to you within 24 hours.')}</p>
            <button onClick={() => setSent(false)}>{t('Enviar otro mensaje', 'Send another message')}</button>
          </div>
        ) : (
          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            <h3 className={styles.formTitle}>{t('Envíanos un mensaje', 'Send us a message')}</h3>
            <div className={styles.row}>
              <div className={styles.field}>
                <label htmlFor="ct-name">{t('Nombre *', 'Name *')}</label>
                <input id="ct-name" name="name" value={form.name} onChange={handleChange}
                  placeholder={t('Tu nombre', 'Your name')}
                  className={errors.name ? styles.inputError : ''}
                  aria-describedby={errors.name ? 'ct-name-err' : undefined}
                />
                {errors.name && <span id="ct-name-err" className={styles.error} role="alert">{errors.name}</span>}
              </div>
              <div className={styles.field}>
                <label htmlFor="ct-email">{t('Correo *', 'Email *')}</label>
                <input id="ct-email" name="email" type="email" value={form.email} onChange={handleChange}
                  placeholder="tu@email.com"
                  className={errors.email ? styles.inputError : ''}
                  aria-describedby={errors.email ? 'ct-email-err' : undefined}
                />
                {errors.email && <span id="ct-email-err" className={styles.error} role="alert">{errors.email}</span>}
              </div>
            </div>
            <div className={styles.field}>
              <label htmlFor="ct-subject">{t('Asunto *', 'Subject *')}</label>
              <input id="ct-subject" name="subject" value={form.subject} onChange={handleChange}
                placeholder={t('¿En qué podemos ayudarte?', 'How can we help you?')}
                className={errors.subject ? styles.inputError : ''}
                aria-describedby={errors.subject ? 'ct-subject-err' : undefined}
              />
              {errors.subject && <span id="ct-subject-err" className={styles.error} role="alert">{errors.subject}</span>}
            </div>
            <div className={styles.field}>
              <label htmlFor="ct-message">{t('Mensaje *', 'Message *')}</label>
              <textarea id="ct-message" name="message" value={form.message} onChange={handleChange}
                rows={5} placeholder={t('Escribe tu mensaje aquí...', 'Write your message here...')}
                className={errors.message ? styles.inputError : ''}
                aria-describedby={errors.message ? 'ct-message-err' : undefined}
              />
              {errors.message && <span id="ct-message-err" className={styles.error} role="alert">{errors.message}</span>}
            </div>

            {sendError && (
              <p className={styles.sendError} role="alert">
                {t(`Hubo un error al enviar. Por favor escríbenos a ${RESTAURANT.email}`, `There was an error. Please email us at ${RESTAURANT.email}`)}
              </p>
            )}

            <button type="submit" className={styles.btnSend} disabled={loading} aria-busy={loading}>
              {loading ? t('Enviando...', 'Sending...') : t('Enviar Mensaje', 'Send Message')}
            </button>
          </form>
        )}
      </div>
    </section>
  )
}
