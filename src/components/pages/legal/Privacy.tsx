import styles from './Privacy.module.css'
import { useLang } from '../../../context/LangContext'
import { useRestaurant } from '../../../context/RestaurantContext'

export default function Privacy() {
  const { t } = useLang()
  const RESTAURANT = useRestaurant()

  return (
    <section className={styles.page}>
      <div className={styles.container}>
        <p className={styles.tag}>{t('Legal', 'Legal')}</p>
        <h1 className={styles.title}>{t('Aviso de Privacidad', 'Privacy Policy')}</h1>
        <div className={styles.line} />
        <p className={styles.updated}>{t('Última actualización: enero 2026', 'Last updated: January 2026')}</p>

        <div className={styles.body}>
          <h2>{t('1. Responsable de los datos', '1. Data Controller')}</h2>
          <p>{t(
            `${RESTAURANT.name} Restaurante, con domicilio en ${RESTAURANT.address}, ${RESTAURANT.neighborhood}, ${RESTAURANT.city} ${RESTAURANT.zip}, es responsable del tratamiento de sus datos personales.`,
            `${RESTAURANT.name} Restaurant, located at ${RESTAURANT.address}, ${RESTAURANT.neighborhood}, ${RESTAURANT.city} ${RESTAURANT.zip}, is responsible for the processing of your personal data.`
          )}</p>

          <h2>{t('2. Datos que recopilamos', '2. Data We Collect')}</h2>
          <p>{t(
            'A través de nuestros formularios de reservación y contacto recopilamos: nombre completo, correo electrónico, número de teléfono, fecha y hora de reservación, y notas especiales que usted proporcione voluntariamente.',
            'Through our reservation and contact forms we collect: full name, email address, phone number, reservation date and time, and any special notes you voluntarily provide.'
          )}</p>

          <h2>{t('3. Finalidad del tratamiento', '3. Purpose of Processing')}</h2>
          <p>{t(
            'Sus datos son utilizados exclusivamente para: confirmar y gestionar su reservación, responder a sus mensajes de contacto, y mejorar nuestro servicio. No compartimos sus datos con terceros ni los usamos con fines publicitarios.',
            'Your data is used exclusively to: confirm and manage your reservation, respond to your contact messages, and improve our service. We do not share your data with third parties or use it for advertising purposes.'
          )}</p>

          <h2>{t('4. Almacenamiento y seguridad', '4. Storage and Security')}</h2>
          <p>{t(
            'Sus datos son tratados con medidas de seguridad técnicas y organizativas adecuadas. No almacenamos información de tarjetas de crédito ni datos de pago.',
            'Your data is handled with appropriate technical and organizational security measures. We do not store credit card information or payment data.'
          )}</p>

          <h2>{t('5. Sus derechos', '5. Your Rights')}</h2>
          <p>{t(
            `Tiene derecho a acceder, rectificar, cancelar u oponerse al tratamiento de sus datos (derechos ARCO). Para ejercerlos, contáctenos en: ${RESTAURANT.email}`,
            `You have the right to access, rectify, cancel or object to the processing of your data (ARCO rights). To exercise them, contact us at: ${RESTAURANT.email}`
          )}</p>

          <h2>{t('6. Cambios a este aviso', '6. Changes to This Policy')}</h2>
          <p>{t(
            'Podemos actualizar este aviso en cualquier momento. La versión vigente siempre estará disponible en esta página.',
            'We may update this policy at any time. The current version will always be available on this page.'
          )}</p>

          <h2>{t('7. Contacto', '7. Contact')}</h2>
          <p>{t(
            `Para cualquier consulta sobre privacidad: ${RESTAURANT.email} · ${RESTAURANT.phone}`,
            `For any privacy inquiries: ${RESTAURANT.email} · ${RESTAURANT.phone}`
          )}</p>
        </div>
      </div>
    </section>
  )
}
