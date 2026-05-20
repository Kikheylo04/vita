import { useState, useRef, useEffect } from 'react'
import emailjs from '@emailjs/browser'
import styles from './ChatBot.module.css'
import { useLang } from '../../../../context/LangContext'
import { useRestaurant, useFormatPrice } from '../../../../context/RestaurantContext'
import { getBotResponse } from './chatFlow'
import type { Message, FlowStep, Option, ReservaData } from './chatFlow'

function genId() { return Math.random().toString(36).slice(2) }

function parseDate(input: string): string | null {
  const match = input.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/)
  if (!match) return null
  const [, d, m, y] = match
  const year = y.length === 2 ? `20${y}` : y
  const date = new Date(`${year}-${m.padStart(2,'0')}-${d.padStart(2,'0')}T12:00:00`)
  if (isNaN(date.getTime())) return null
  if (date.getDay() === 1) return 'monday'
  const today = new Date(); today.setHours(0,0,0,0)
  if (date < today) return 'past'
  return `${d.padStart(2,'0')}/${m.padStart(2,'0')}/${year}`
}

function renderText(text: string) {
  return text.split('\n').map((line, i) => {
    const bold = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<strong>$1</strong>')
    const italic = bold.replace(/_(.*?)_/g, '<em>$1</em>')
    return <p key={i} dangerouslySetInnerHTML={{ __html: italic }} />
  })
}

interface ChatBotProps {
  externalOpen?: boolean
  onExternalClose?: () => void
}

export default function ChatBot({ externalOpen, onExternalClose }: ChatBotProps = {}) {
  const { lang, t } = useLang()
  const RESTAURANT = useRestaurant()
  const formatPrice = useFormatPrice()
  const WHATSAPP_PHONE = import.meta.env.VITE_WHATSAPP_PHONE ?? RESTAURANT.phoneRaw
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (externalOpen) handleOpen()
  }, [externalOpen])
  const [messages, setMessages] = useState<Message[]>([])
  const [step, setStep] = useState<FlowStep>('welcome')
  const [reserva, setReserva] = useState<ReservaData>({})
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const [started, setStarted] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typing])

  const addMessage = (msg: Omit<Message, 'id'>) => {
    setMessages(prev => [...prev, { ...msg, id: genId() }])
  }

  const botReply = (nextStep: FlowStep, newReserva?: ReservaData, occasionValue?: string) => {
    setTyping(true)
    setTimeout(() => {
      setTyping(false)
      const data = newReserva ?? reserva
      const res = getBotResponse(nextStep, lang, occasionValue, data, RESTAURANT, formatPrice)
      addMessage({ role: 'bot', text: res.text, options: res.options })
      setStep(nextStep)

      if (nextStep === 'reserva_done') {
        sendReservation(data)
      }
      if (nextStep === 'whatsapp') {
        setTimeout(() => {
          const msg = encodeURIComponent(t(RESTAURANT.whatsappMessage, RESTAURANT.whatsappMessageEn))
          window.open(`https://wa.me/${WHATSAPP_PHONE}?text=${msg}`, '_blank')
        }, 800)
      }
    }, 700)
  }

  const sendReservation = async (data: ReservaData) => {
    const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID
    const TEMPLATE = import.meta.env.VITE_EMAILJS_TEMPLATE_RESERVA
    const KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY
    if (!SERVICE_ID || !TEMPLATE || !KEY) return
    try {
      await emailjs.send(SERVICE_ID, TEMPLATE, {
        from_name: data.name,
        from_email: data.email,
        guests: data.guests,
        date: data.date,
        time: data.time,
        notes: data.occasion ? `Ocasión especial: ${data.occasion}` : '—',
      }, KEY)
    } catch { /* silent fail — reservation shown in chat */ }
  }

  const handleOpen = () => {
    setOpen(true)
    if (!started) {
      setStarted(true)
      setTimeout(() => {
        const res = getBotResponse('welcome', lang, undefined, undefined, RESTAURANT, formatPrice)
        addMessage({ role: 'bot', text: res.text, options: res.options })
        setStep('welcome')
      }, 400)
    }
  }

  const handleOption = (opt: Option) => {
    addMessage({ role: 'user', text: lang === 'es' ? opt.label : opt.labelEn })

    if (opt.next === 'reserva_guests' && opt.value) {
      // viene de occasion_detail con ocasión guardada
      const newReserva = { ...reserva, occasion: opt.value }
      setReserva(newReserva)
      botReply('reserva_guests', newReserva)
      return
    }

    if (opt.next === 'occasion_detail' && opt.value) {
      const newReserva = { ...reserva, occasion: opt.value }
      setReserva(newReserva)
      botReply('occasion_detail', newReserva, opt.value)
      return
    }

    if (opt.next === 'reserva_date' && opt.value) {
      const newReserva = { ...reserva, guests: opt.value }
      setReserva(newReserva)
      botReply('reserva_date', newReserva)
      return
    }

    if (opt.next === 'reserva_name' && opt.value) {
      const newReserva = { ...reserva, time: opt.value }
      setReserva(newReserva)
      botReply('reserva_name', newReserva)
      return
    }

    botReply(opt.next)
  }

  const handleSend = () => {
    const val = input.trim()
    if (!val) return
    addMessage({ role: 'user', text: val })
    setInput('')

    if (step === 'reserva_date') {
      const parsed = parseDate(val)
      if (parsed === 'monday') {
        setTyping(true)
        setTimeout(() => {
          setTyping(false)
          addMessage({ role: 'bot', text: lang === 'es' ? '😔 Los lunes estamos cerrados. Por favor elige otro día.' : '😔 We\'re closed on Mondays. Please choose another day.' })
        }, 600)
        return
      }
      if (parsed === 'past') {
        setTyping(true)
        setTimeout(() => {
          setTyping(false)
          addMessage({ role: 'bot', text: lang === 'es' ? '⚠️ La fecha ya pasó. Por favor elige una fecha futura.' : '⚠️ That date has passed. Please choose a future date.' })
        }, 600)
        return
      }
      if (!parsed) {
        setTyping(true)
        setTimeout(() => {
          setTyping(false)
          addMessage({ role: 'bot', text: lang === 'es' ? '⚠️ Formato no reconocido. Usa DD/MM/YYYY, por ejemplo 25/07/2026.' : '⚠️ Format not recognized. Use DD/MM/YYYY, e.g. 25/07/2026.' })
        }, 600)
        return
      }
      const newReserva = { ...reserva, date: parsed }
      setReserva(newReserva)
      botReply('reserva_time', newReserva)
      return
    }

    if (step === 'reserva_name') {
      const newReserva = { ...reserva, name: val }
      setReserva(newReserva)
      botReply('reserva_email', newReserva)
      return
    }

    if (step === 'reserva_email') {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
        setTyping(true)
        setTimeout(() => {
          setTyping(false)
          addMessage({ role: 'bot', text: lang === 'es' ? '⚠️ Correo inválido. Intenta de nuevo.' : '⚠️ Invalid email. Please try again.' })
        }, 600)
        return
      }
      const newReserva = { ...reserva, email: val }
      setReserva(newReserva)
      botReply('reserva_confirm', newReserva)
      return
    }

    botReply('fallback')
  }

  const needsInput = ['reserva_date', 'reserva_name', 'reserva_email'].includes(step)
  const lastMsg = messages[messages.length - 1]
  const currentOptions = lastMsg?.options

  const handleClose = () => { setOpen(false); onExternalClose?.() }

  return (
    <>
      {open && (
        <div className={styles.window} role="dialog" aria-label={t('Asistente VITA', 'VITA Assistant')}>
          <div className={styles.header}>
            <div className={styles.headerAvatar}>
              <svg viewBox="0 0 40 40" width="22" height="22">
                <text x="20" y="29" fontFamily="Georgia,'Times New Roman',serif" fontSize="28" fontStyle="italic" fill="#D4A843" textAnchor="middle">V</text>
              </svg>
            </div>
            <div>
              <p className={styles.headerName}>VITA Assistant</p>
              <p className={styles.headerStatus}>{t('En línea', 'Online')}</p>
            </div>
            <button className={styles.closeBtn} onClick={handleClose} aria-label={t('Cerrar', 'Close')}>✕</button>
          </div>

          <div className={styles.messages}>
            {messages.map(msg => (
              <div key={msg.id} className={`${styles.msg} ${msg.role === 'user' ? styles.msgUser : styles.msgBot}`}>
                <div className={styles.bubble}>
                  {renderText(msg.text)}
                </div>
              </div>
            ))}

            {typing && (
              <div className={`${styles.msg} ${styles.msgBot}`}>
                <div className={`${styles.bubble} ${styles.typingBubble}`}>
                  <span className={styles.dot} /><span className={styles.dot} /><span className={styles.dot} />
                </div>
              </div>
            )}

            {!typing && currentOptions && currentOptions.length > 0 && (
              <div className={styles.options}>
                {currentOptions.map((opt, i) => (
                  <button key={i} className={styles.optBtn} onClick={() => handleOption(opt)}>
                    {lang === 'es' ? opt.label : opt.labelEn}
                  </button>
                ))}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {needsInput && (
            <div className={styles.inputRow}>
              <input
                className={styles.input}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder={
                  step === 'reserva_date' ? 'DD/MM/YYYY' :
                  step === 'reserva_name' ? t('Tu nombre', 'Your name') :
                  'email@ejemplo.com'
                }
                autoFocus
              />
              <button className={styles.sendBtn} onClick={handleSend} aria-label={t('Enviar', 'Send')}>➤</button>
            </div>
          )}
        </div>
      )}
    </>
  )
}
