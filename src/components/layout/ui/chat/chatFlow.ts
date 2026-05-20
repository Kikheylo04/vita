export type MessageRole = 'bot' | 'user'
export type FlowStep =
  | 'welcome'
  | 'main_menu'
  | 'hours'
  | 'location'
  | 'menu_categories'
  | 'menu_items'
  | 'faq'
  | 'occasion'
  | 'occasion_detail'
  | 'reserva_guests'
  | 'reserva_date'
  | 'reserva_time'
  | 'reserva_name'
  | 'reserva_email'
  | 'reserva_confirm'
  | 'reserva_done'
  | 'fallback'
  | 'whatsapp'

export interface Message {
  id: string
  role: MessageRole
  text: string
  options?: Option[]
}

export interface Option {
  label: string
  labelEn: string
  next: FlowStep
  value?: string
}

export interface ReservaData {
  guests?: string
  date?: string
  time?: string
  name?: string
  email?: string
  occasion?: string
}

import type { RestaurantConfig } from '../../../../context/RestaurantContext'

// Horarios
const HOURS_ES = `🕐 *Horarios*\nMartes a Jueves: 13:00 – 23:00\nViernes y Sábado: 13:00 – 00:00\nDomingo: 13:00 – 22:00\nLunes: Cerrado`
const HOURS_EN = `🕐 *Hours*\nTuesday to Thursday: 1:00 PM – 11:00 PM\nFriday & Saturday: 1:00 PM – 12:00 AM\nSunday: 1:00 PM – 10:00 PM\nMonday: Closed`

function getLocation(r: RestaurantConfig) {
  return {
    es: `📍 *Ubicación*\n${r.address}\n${r.neighborhood}, ${r.city} ${r.zip}\n\nA dos cuadras del metro Polanco (Línea 7).`,
    en: `📍 *Location*\n${r.address}\n${r.neighborhood}, ${r.city} ${r.zip}\n\nTwo blocks from Polanco metro station (Line 7).`,
  }
}

function getMenuPreview(fp: (p: number) => string) {
  return {
    es: `🍽️ *Nuestro menú*\n\n**Entradas** desde ${fp(5)}\nBruschetta, Carpaccio, Burrata\n\n**Pastas** desde ${fp(12)}\nTagliatelle al Ragù, Risotto al Tartufo\n\n**Carnes** desde ${fp(29)}\nBistecca alla Fiorentina (500g)\n\n**Postres** desde ${fp(6)}\nTiramisù, Panna Cotta`,
    en: `🍽️ *Our menu*\n\n**Starters** from ${fp(5)}\nBruschetta, Carpaccio, Burrata\n\n**Pastas** from ${fp(12)}\nTagliatelle al Ragù, Risotto al Tartufo\n\n**Meats** from ${fp(29)}\nBistecca alla Fiorentina (500g)\n\n**Desserts** from ${fp(6)}\nTiramisù, Panna Cotta`,
  }
}

export const MAIN_OPTIONS_ES: Option[] = [
  { label: '📅 Hacer una reservación', labelEn: '📅 Make a reservation', next: 'reserva_guests' },
  { label: '🕐 Horarios', labelEn: '🕐 Hours', next: 'hours' },
  { label: '📍 Ubicación', labelEn: '📍 Location', next: 'location' },
  { label: '🍽️ Ver el menú', labelEn: '🍽️ View menu', next: 'menu_categories' },
  { label: '🎉 Ocasión especial', labelEn: '🎉 Special occasion', next: 'occasion' },
  { label: '💬 Hablar con alguien', labelEn: '💬 Talk to someone', next: 'whatsapp' },
]

export const TIME_SLOTS = ['13:00', '13:30', '14:00', '14:30', '20:00', '20:30', '21:00', '21:30', '22:00']

export function getBotResponse(step: FlowStep, lang: string, input?: string, reserva?: ReservaData, restaurant?: RestaurantConfig, formatPrice?: (p: number) => string): { text: string; options?: Option[] } {
  const es = lang === 'es'
  const location = restaurant ? getLocation(restaurant) : { es: '', en: '' }
  const menuPreview = formatPrice ? getMenuPreview(formatPrice) : { es: '', en: '' }

  switch (step) {
    case 'welcome':
      return {
        text: es
          ? '👋 ¡Hola! Soy el asistente de VITA. ¿En qué puedo ayudarte hoy?'
          : '👋 Hello! I\'m VITA\'s assistant. How can I help you today?',
        options: MAIN_OPTIONS_ES,
      }

    case 'main_menu':
      return {
        text: es ? '¿Qué más puedo hacer por ti?' : 'What else can I do for you?',
        options: MAIN_OPTIONS_ES,
      }

    case 'hours':
      return {
        text: es ? HOURS_ES : HOURS_EN,
        options: [
          { label: '📅 Reservar mesa', labelEn: '📅 Book a table', next: 'reserva_guests' },
          { label: '← Volver', labelEn: '← Back', next: 'main_menu' },
        ],
      }

    case 'location':
      return {
        text: es ? location.es : location.en,
        options: [
          { label: '📅 Reservar mesa', labelEn: '📅 Book a table', next: 'reserva_guests' },
          { label: '← Volver', labelEn: '← Back', next: 'main_menu' },
        ],
      }

    case 'menu_categories':
      return {
        text: es ? menuPreview.es : menuPreview.en,
        options: [
          { label: '📅 Reservar para probar', labelEn: '📅 Book to try it', next: 'reserva_guests' },
          { label: '← Volver', labelEn: '← Back', next: 'main_menu' },
        ],
      }

    case 'occasion':
      return {
        text: es ? '¿Qué ocasión especial vas a celebrar? 🥂' : 'What special occasion are you celebrating? 🥂',
        options: [
          { label: '💑 Aniversario', labelEn: '💑 Anniversary', next: 'occasion_detail', value: 'Aniversario' },
          { label: '🎂 Cumpleaños', labelEn: '🎂 Birthday', next: 'occasion_detail', value: 'Cumpleaños' },
          { label: '💼 Cena de negocios', labelEn: '💼 Business dinner', next: 'occasion_detail', value: 'Cena de negocios' },
          { label: '💍 Propuesta de matrimonio', labelEn: '💍 Marriage proposal', next: 'occasion_detail', value: 'Propuesta de matrimonio' },
          { label: '🎉 Otra celebración', labelEn: '🎉 Other celebration', next: 'occasion_detail', value: 'Celebración especial' },
        ],
      }

    case 'occasion_detail':
      return {
        text: es
          ? `¡Perfecto! Para ${input} contamos con salones privados y podemos preparar una mesa especial con decoración. ¿Te ayudo a hacer la reservación?`
          : `Perfect! For ${input} we have private rooms and can prepare a special table with decoration. Shall I help you book?`,
        options: [
          { label: '📅 Sí, reservar ahora', labelEn: '📅 Yes, book now', next: 'reserva_guests' },
          { label: '💬 Prefiero hablar con alguien', labelEn: '💬 I prefer to talk to someone', next: 'whatsapp' },
          { label: '← Volver', labelEn: '← Back', next: 'main_menu' },
        ],
      }

    case 'reserva_guests':
      return {
        text: es ? '¿Para cuántas personas será la reservación?' : 'How many guests will be joining?',
        options: [1, 2, 3, 4, 5, 6, 7, 8].map(n => ({
          label: `${n} ${n === 1 ? 'persona' : 'personas'}`,
          labelEn: `${n} ${n === 1 ? 'guest' : 'guests'}`,
          next: 'reserva_date' as FlowStep,
          value: String(n),
        })),
      }

    case 'reserva_date':
      return {
        text: es
          ? `${reserva?.guests} ${Number(reserva?.guests) === 1 ? 'persona' : 'personas'} ✓\n\n¿Qué fecha tienes en mente? Escríbela en formato DD/MM/YYYY.\n\n_Abrimos martes a domingo. Los lunes estamos cerrados._`
          : `${reserva?.guests} ${Number(reserva?.guests) === 1 ? 'guest' : 'guests'} ✓\n\nWhat date do you have in mind? Write it as DD/MM/YYYY.\n\n_We're open Tuesday to Sunday. Closed on Mondays._`,
      }

    case 'reserva_time':
      return {
        text: es ? `Fecha: ${reserva?.date} ✓\n\n¿A qué hora prefieres?` : `Date: ${reserva?.date} ✓\n\nWhat time do you prefer?`,
        options: TIME_SLOTS.map(slot => ({
          label: `🕐 ${slot}`,
          labelEn: `🕐 ${slot}`,
          next: 'reserva_name' as FlowStep,
          value: slot,
        })),
      }

    case 'reserva_name':
      return {
        text: es
          ? `${reserva?.time} hrs ✓\n\n¿A nombre de quién hago la reservación?`
          : `${reserva?.time} hrs ✓\n\nWhat name should the reservation be under?`,
      }

    case 'reserva_email':
      return {
        text: es
          ? `¡Perfecto, ${reserva?.name}! ¿Cuál es tu correo para enviarte la confirmación?`
          : `Great, ${reserva?.name}! What's your email for the confirmation?`,
      }

    case 'reserva_confirm':
      return {
        text: es
          ? `📋 *Resumen de tu reservación*\n\n👥 ${reserva?.guests} personas\n📅 ${reserva?.date}\n🕐 ${reserva?.time} hrs\n👤 ${reserva?.name}\n📧 ${reserva?.email}${reserva?.occasion ? `\n🎉 ${reserva.occasion}` : ''}\n\n¿Confirmas?`
          : `📋 *Reservation summary*\n\n👥 ${reserva?.guests} guests\n📅 ${reserva?.date}\n🕐 ${reserva?.time}\n👤 ${reserva?.name}\n📧 ${reserva?.email}${reserva?.occasion ? `\n🎉 ${reserva.occasion}` : ''}\n\nConfirm?`,
        options: [
          { label: '✅ Confirmar', labelEn: '✅ Confirm', next: 'reserva_done' },
          { label: '✏️ Modificar', labelEn: '✏️ Edit', next: 'reserva_guests' },
        ],
      }

    case 'reserva_done':
      return {
        text: es
          ? `✅ ¡Reservación confirmada!\n\nTe esperamos el ${reserva?.date} a las ${reserva?.time} hrs. Recibirás un correo en ${reserva?.email}.\n\n_¿Algo más en lo que pueda ayudarte?_`
          : `✅ Reservation confirmed!\n\nWe'll see you on ${reserva?.date} at ${reserva?.time}. You'll receive an email at ${reserva?.email}.\n\n_Anything else I can help you with?_`,
        options: [
          { label: '← Menú principal', labelEn: '← Main menu', next: 'main_menu' },
        ],
      }

    case 'whatsapp':
      return {
        text: es
          ? '💬 Te vamos a conectar con nuestro equipo por WhatsApp ahora mismo.'
          : '💬 We\'ll connect you with our team via WhatsApp right now.',
        options: [
          { label: '← Volver', labelEn: '← Back', next: 'main_menu' },
        ],
      }

    case 'fallback':
      return {
        text: es
          ? 'No entendí bien tu pregunta 😅 ¿Te puedo ayudar con algo de esto?'
          : 'I didn\'t quite understand 😅 Can I help you with any of these?',
        options: MAIN_OPTIONS_ES,
      }

    default:
      return { text: '', options: MAIN_OPTIONS_ES }
  }
}
