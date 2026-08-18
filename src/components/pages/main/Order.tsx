import { useState, useEffect } from 'react'
import styles from './Order.module.css'
import { useCart } from '../../../context/CartContext'
import { useBranch } from '../../../context/BranchContext'
import { useFormatPrice } from '../../../context/RestaurantContext'
import { useLang } from '../../../context/LangContext'
import { supabase } from '../../../lib/supabase'
import type { PageId } from '../../../types/types'
import { createCheckout, readPaymentOutcome, type PaymentMethod } from '../../../lib/payments'

const timeSlots = ['13:00','13:30','14:00','14:30','20:00','20:30','21:00','21:30','22:00']

function getTodayStr() { return new Date().toISOString().split('T')[0] }
function isMonday(d: string) { return new Date(d + 'T12:00:00').getDay() === 1 }

interface OrderProps { setActivePage: (p: PageId) => void }

export default function Order({ setActivePage }: OrderProps) {
  const { t } = useLang()
  const { items, remove, updateQty, clear, total, count } = useCart()
  const { branch } = useBranch()
  const formatPrice = useFormatPrice()
  const [form, setForm] = useState({ name: '', email: '', phone: '', date: '', time: '', guests: '2', notes: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [sendError, setSendError] = useState(false)
  const [payMethod, setPayMethod] = useState<PaymentMethod>('onsite')
  // Mensaje de error de la pasarela: distinto al fallo al guardar el pedido.
  const [payError, setPayError] = useState('')
  // Resultado que MercadoPago deja en ?pago= al devolver al usuario. Al volver
  // el carrito ya esta vacio, asi que esta pantalla no depende de items.
  const [outcome, setOutcome] = useState(() => readPaymentOutcome())

  // Limpia el ?pago= de la URL para que un refresh no repita el mensaje.
  useEffect(() => {
    if (!outcome) return
    window.history.replaceState({}, '', '/pedido')
  }, [outcome])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
    setErrors(p => ({ ...p, [name]: '' }))
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = t('Requerido', 'Required')
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = t('Correo inválido', 'Invalid email')
    if (!form.phone.trim()) e.phone = t('Requerido', 'Required')
    if (!form.date) e.date = t('Selecciona fecha', 'Select date')
    else if (form.date < getTodayStr()) e.date = t('Fecha pasada', 'Past date')
    else if (isMonday(form.date)) e.date = t('Lunes cerrado', 'Closed on Mondays')
    if (!form.time) e.time = t('Selecciona hora', 'Select time')
    return e
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (items.length === 0) return
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setLoading(true)
    setSendError(false)

    // El id lo genera el navegador. Antes se hacia .select('id').single(),
    // que en PostgREST pide "return=representation" y exige permiso de
    // SELECT; la policy publica solo da INSERT, asi que la fila se grababa
    // pero la respuesta era 401 y el pedido se borraba como si hubiera
    // fallado. Generando el uuid aqui no hace falta leerlo de vuelta.
    const orderId = crypto.randomUUID()

    const { error } = await supabase.from('orders').insert({
      id: orderId,
      name: form.name, email: form.email, phone: form.phone,
      date: form.date, time: form.time, guests: Number(form.guests),
      notes: form.notes, total, status: 'pending',
      payment_method: payMethod,
      // Sin sucursal el trigger la asigna a la principal.
      branch_id: branch?.id ?? null,
    })

    if (error) {
      console.error('Error creando el pedido:', error.message)
      setSendError(true)
      setLoading(false)
      return
    }

    const { error: itemsError } = await supabase.from('order_items').insert(
      // price/name los reescribe el trigger desde menu_items.
      items.map(i => ({ order_id: orderId, menu_item_id: i.menuItemId, name: i.name, price: i.price, quantity: i.quantity }))
    )

    if (itemsError) {
      // El pedido quedaria sin platillos: lo borramos para no dejar basura en el panel.
      console.error('Error guardando los platillos:', itemsError.message)
      await supabase.from('orders').delete().eq('id', orderId)
      setSendError(true)
      setLoading(false)
      return
    }

    if (payMethod === 'mercadopago') {
      // El importe lo calcula la Edge Function desde la BD; aqui solo se
      // manda el id. Si la pasarela falla el pedido ya quedo guardado y
      // se puede pagar al llegar, asi que no se borra.
      try {
        const url = await createCheckout(orderId)
        clear()
        window.location.href = url
        return
      } catch (err) {
        console.error('Error iniciando el pago:', err)
        setPayError(
          t('No pudimos abrir la pasarela de pago. Tu pedido quedo guardado: puedes pagar al llegar.',
            'We could not open the payment gateway. Your order was saved: you can pay on arrival.')
        )
        setLoading(false)
        return
      }
    }

    clear()
    setDone(true)
    setLoading(false)
  }

  // Retorno desde MercadoPago. Va antes que el resto porque al volver el
  // carrito esta vacio y se mostraria la pantalla de "no tienes platillos".
  if (outcome) {
    const copy = {
      exito: {
        icon: '✓',
        title: t('¡Pago recibido!', 'Payment received!'),
        text: t('Tu pedido esta confirmado y pagado. Te esperamos a la hora que elegiste.',
                'Your order is confirmed and paid. See you at your chosen time.'),
      },
      pendiente: {
        icon: '⋯',
        title: t('Pago en proceso', 'Payment processing'),
        text: t('MercadoPago aun esta procesando tu pago. Te confirmaremos por correo en cuanto se acredite; si pagaste en efectivo puede tardar unas horas.',
                'MercadoPago is still processing your payment. We will confirm by email once it clears; cash payments can take a few hours.'),
      },
      fallido: {
        icon: '✕',
        title: t('El pago no se completo', 'Payment did not go through'),
        text: t('Tu pedido quedo guardado y puedes pagarlo al llegar al restaurante.',
                'Your order was saved and you can pay at the restaurant.'),
      },
    }[outcome]

    return (
      <section className={styles.page}>
        <div className={styles.success}>
          <div className={styles.successIcon}>{copy.icon}</div>
          <h2>{copy.title}</h2>
          <p>{copy.text}</p>
          <button onClick={() => { setOutcome(null); setActivePage('home') }}>
            {t('Volver al inicio', 'Back to home')}
          </button>
        </div>
      </section>
    )
  }

  if (done) return (
    <section className={styles.page}>
      <div className={styles.success}>
        <div className={styles.successIcon}>✓</div>
        <h2>{t('¡Pedido confirmado!', 'Order confirmed!')}</h2>
        <p>{t(`Tu pedido estará listo cuando llegues el ${form.date} a las ${form.time}. Recibirás confirmación en ${form.email}.`, `Your order will be ready when you arrive on ${form.date} at ${form.time}. Confirmation sent to ${form.email}.`)}</p>
        <button onClick={() => setActivePage('home')}>{t('Volver al inicio', 'Back to home')}</button>
      </div>
    </section>
  )

  return (
    <section className={styles.page}>
      <div className={styles.header}>
        <p className={styles.tag}>{t('Pedido anticipado', 'Pre-order')}</p>
        <h2 className={styles.title}>{t('Tu pedido', 'Your order')}</h2>
        <div className={styles.line} />
        <p className={styles.subtitle}>{t('Llega y tu comida estará lista.', 'Arrive and your food will be ready.')}</p>
      </div>

      {items.length === 0 ? (
        <div className={styles.empty}>
          <p>{t('No tienes platillos en tu pedido.', 'No dishes in your order.')}</p>
          <button onClick={() => setActivePage('menu')}>{t('← Ver menú', '← View menu')}</button>
        </div>
      ) : (
        <div className={styles.container}>
          {/* Carrito */}
          <div className={styles.cart}>
            <h3 className={styles.cartTitle}>{t('Resumen del pedido', 'Order summary')}</h3>
            <div className={styles.cartItems}>
              {items.map(item => (
                <div key={item.menuItemId} className={styles.cartItem}>
                  {item.image && <img src={item.image} alt={item.name} className={styles.cartImg} />}
                  <div className={styles.cartItemInfo}>
                    <p className={styles.cartItemName}>{item.name}</p>
                    <p className={styles.cartItemPrice}>{formatPrice(item.price)}</p>
                  </div>
                  <div className={styles.qtyRow}>
                    <button onClick={() => updateQty(item.menuItemId, item.quantity - 1)}>−</button>
                    <span>{item.quantity}</span>
                    <button onClick={() => updateQty(item.menuItemId, item.quantity + 1)}>+</button>
                  </div>
                  <button className={styles.removeBtn} onClick={() => remove(item.menuItemId)}>✕</button>
                </div>
              ))}
            </div>
            <div className={styles.cartTotal}>
              <span>{t('Total', 'Total')}</span>
              <span className={styles.totalAmount}>{formatPrice(total)}</span>
            </div>
            <button className={styles.btnAddMore} onClick={() => setActivePage('menu')}>
              {t('+ Agregar más platillos', '+ Add more dishes')}
            </button>
          </div>

          {/* Formulario */}
          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            <h3 className={styles.formTitle}>{t('¿Cuándo llegas?', 'When are you arriving?')}</h3>

            <div className={styles.row}>
              <div className={styles.field}>
                <label>{t('Nombre *', 'Name *')}</label>
                <input name="name" value={form.name} onChange={handleChange} placeholder={t('Tu nombre', 'Your name')} className={errors.name ? styles.err : ''} />
                {errors.name && <span className={styles.errMsg}>{errors.name}</span>}
              </div>
              <div className={styles.field}>
                <label>{t('Correo *', 'Email *')}</label>
                <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="tu@email.com" className={errors.email ? styles.err : ''} />
                {errors.email && <span className={styles.errMsg}>{errors.email}</span>}
              </div>
            </div>

            <div className={styles.row}>
              <div className={styles.field}>
                <label>{t('Teléfono *', 'Phone *')}</label>
                <input name="phone" type="tel" value={form.phone} onChange={handleChange} placeholder="(55) 1234-5678" className={errors.phone ? styles.err : ''} />
                {errors.phone && <span className={styles.errMsg}>{errors.phone}</span>}
              </div>
              <div className={styles.field}>
                <label>{t('Personas', 'Guests')}</label>
                <select name="guests" value={form.guests} onChange={handleChange}>
                  {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>

            <div className={styles.row}>
              <div className={styles.field}>
                <label>{t('Fecha de llegada *', 'Arrival date *')}</label>
                <input name="date" type="date" value={form.date} onChange={handleChange} min={getTodayStr()} className={errors.date ? styles.err : ''} />
                {errors.date && <span className={styles.errMsg}>{errors.date}</span>}
              </div>
              <div className={styles.field}>
                <label>{t('Hora de llegada *', 'Arrival time *')}</label>
                <select name="time" value={form.time} onChange={handleChange} className={errors.time ? styles.err : ''}>
                  <option value="">{t('Selecciona', 'Select')}</option>
                  {timeSlots.map(s => <option key={s} value={s}>{s} hrs</option>)}
                </select>
                {errors.time && <span className={styles.errMsg}>{errors.time}</span>}
              </div>
            </div>

            <div className={styles.field}>
              <label>{t('Notas especiales', 'Special notes')}</label>
              <textarea name="notes" value={form.notes} onChange={handleChange} rows={3}
                placeholder={t('Alergias, preferencias...', 'Allergies, preferences...')} />
            </div>

            {sendError && (
              <p className={styles.errMsg} role="alert">
                {t('Hubo un error al enviar tu pedido. Intenta de nuevo por favor.', 'There was an error sending your order. Please try again.')}
              </p>
            )}

            <fieldset className={styles.payGroup}>
              <legend className={styles.payLegend}>{t('¿Cómo quieres pagar?', 'How do you want to pay?')}</legend>

              <label className={`${styles.payOption} ${payMethod === 'onsite' ? styles.payActive : ''}`}>
                <input type="radio" name="payMethod" value="onsite"
                  checked={payMethod === 'onsite'}
                  onChange={() => { setPayMethod('onsite'); setPayError('') }} />
                <span className={styles.payText}>
                  <strong>{t('Pagar al llegar', 'Pay on arrival')}</strong>
                  <em>{t('Efectivo o tarjeta en el restaurante', 'Cash or card at the restaurant')}</em>
                </span>
              </label>

              <label className={`${styles.payOption} ${payMethod === 'mercadopago' ? styles.payActive : ''}`}>
                <input type="radio" name="payMethod" value="mercadopago"
                  checked={payMethod === 'mercadopago'}
                  onChange={() => { setPayMethod('mercadopago'); setPayError('') }} />
                <span className={styles.payText}>
                  <strong>{t('Pagar ahora', 'Pay now')}</strong>
                  <em>{t('Tarjeta, SPEI u OXXO vía MercadoPago', 'Card, SPEI or OXXO via MercadoPago')}</em>
                </span>
              </label>
            </fieldset>

            {payError && <p className={styles.errMsg} role="alert">{payError}</p>}

            <button type="submit" className={styles.btnSubmit} disabled={loading || count === 0}>
              {loading
                ? (payMethod === 'mercadopago' ? t('Abriendo pago...', 'Opening payment...') : t('Enviando...', 'Sending...'))
                : payMethod === 'mercadopago'
                  ? t(`Pagar ${formatPrice(total)}`, `Pay ${formatPrice(total)}`)
                  : t(`Confirmar pedido — ${formatPrice(total)}`, `Confirm order — ${formatPrice(total)}`)}
            </button>
            <p className={styles.note}>
              {payMethod === 'mercadopago'
                ? t('Te llevamos a MercadoPago para completar el pago de forma segura.', 'We will take you to MercadoPago to complete the payment securely.')
                : t('Tu pedido estará listo al llegar. Sin pago por adelantado.', 'Your order will be ready on arrival. No advance payment.')}
            </p>
          </form>
        </div>
      )}
    </section>
  )
}
