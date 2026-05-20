import styles from './WhatsApp.module.css'
import { useLang } from '../../../context/LangContext'

const PHONE = import.meta.env.VITE_WHATSAPP_PHONE ?? '5512345678'

export default function WhatsApp() {
  const { t } = useLang()
  const message = encodeURIComponent(
    t('Hola, me gustaría hacer una reservación en VITA.', 'Hello, I would like to make a reservation at VITA.')
  )
  const url = `https://wa.me/${PHONE}?text=${message}`

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={styles.btn}
      aria-label={t('Contactar por WhatsApp', 'Contact via WhatsApp')}
    >
      <svg viewBox="0 0 24 24" fill="currentColor" className={styles.icon}>
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
        <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.122 1.532 5.856L.057 23.882a.5.5 0 00.61.61l6.057-1.484A11.94 11.94 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.9a9.9 9.9 0 01-5.031-1.371l-.361-.214-3.737.915.944-3.63-.235-.374A9.861 9.861 0 012.1 12C2.1 6.533 6.533 2.1 12 2.1S21.9 6.533 21.9 12 17.467 21.9 12 21.9z"/>
      </svg>
      <span className={styles.tooltip}>{t('¿Reservas por WhatsApp?', 'Reserve via WhatsApp?')}</span>
    </a>
  )
}
