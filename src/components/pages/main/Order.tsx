import { useState } from 'react'
import styles from './Order.module.css'
import { useCart } from '../../../context/CartContext'
import { useFormatPrice } from '../../../context/RestaurantContext'
import { useLang } from '../../../context/LangContext'
import { supabase } from '../../../lib/supabase'
import type { PageId } from '../../../types/types'

const timeSlots = ['13:00','13:30','14:00','14:30','20:00','20:30','21:00','21:30','22:00']

function getTodayStr() { return new Date().toISOString().split('T')[0] }
function isMonday(d: string) { return new Date(d + 'T12:00:00').getDay() === 1 }

interface OrderProps { setActivePage: (p: PageId) => void }

export default function Order({ setActivePage }: OrderProps) {
  const { t } = useLang()
  const { items, remove, updateQty, clear, total, count } = useCart()
  const formatPrice = useFormatPrice()
  const [form, setForm] = useState({ name: '', email: '', phone: '', date: '', time: '', guests: '2', notes: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

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

    const { data: order, error } = await supabase.from('orders').insert({
      name: form.name, email: form.email, phone: form.phone,
      date: form.date, time: form.time, guests: Number(form.guests),
      notes: form.notes, total, status: 'pending',
    }).select('id').single()

    if (!error && order) {
      await supabase.from('order_items').insert(
        items.map(i => ({ order_id: order.id, name: i.name, price: i.price, quantity: i.quantity }))
      )
      clear()
      setDone(true)
    }
    setLoading(false)
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
                <div key={item.name} className={styles.cartItem}>
                  {item.image && <img src={item.image} alt={item.name} className={styles.cartImg} />}
                  <div className={styles.cartItemInfo}>
                    <p className={styles.cartItemName}>{item.name}</p>
                    <p className={styles.cartItemPrice}>{formatPrice(item.price)}</p>
                  </div>
                  <div className={styles.qtyRow}>
                    <button onClick={() => updateQty(item.name, item.quantity - 1)}>−</button>
                    <span>{item.quantity}</span>
                    <button onClick={() => updateQty(item.name, item.quantity + 1)}>+</button>
                  </div>
                  <button className={styles.removeBtn} onClick={() => remove(item.name)}>✕</button>
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

            <button type="submit" className={styles.btnSubmit} disabled={loading || count === 0}>
              {loading ? t('Enviando...', 'Sending...') : t(`Confirmar pedido — ${formatPrice(total)}`, `Confirm order — ${formatPrice(total)}`)}
            </button>
            <p className={styles.note}>{t('Tu pedido estará listo al llegar. Sin pago por adelantado.', 'Your order will be ready on arrival. No advance payment.')}</p>
          </form>
        </div>
      )}
    </section>
  )
}
