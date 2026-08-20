import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import styles from './ImpersonationBar.module.css'
import { IconAlert } from './ui/Icons'

interface State {
  tenant_id: string
  tenant_name: string
  expires_at: string
}

/**
 * Aviso permanente mientras el operador ve el panel de un cliente.
 *
 * Existe para que nadie confunda la cuenta ajena con la propia y
 * haga un cambio creyendo que edita su propia empresa.
 */
export default function ImpersonationBar({ onExit }: { onExit: () => void }) {
  const [state, setState] = useState<State | null>(null)
  const [left, setLeft] = useState('')

  async function check() {
    const { data, error } = await supabase.rpc('impersonation_state')
    if (error) {
      // La funcion no existe hasta correr la migracion de soporte:
      // en ese caso simplemente no hay suplantacion activa.
      if (!error.message.includes('Could not find')) {
        console.error('Error leyendo la suplantación:', error.message)
      }
      return
    }
    setState((data?.[0] as State) ?? null)
  }

  useEffect(() => { check() }, [])

  // Cuenta atrás: la sesión caduca a los 60 minutos.
  useEffect(() => {
    if (!state) return
    const tick = () => {
      const ms = new Date(state.expires_at).getTime() - Date.now()
      if (ms <= 0) { onExit(); return }
      const min = Math.floor(ms / 60000)
      setLeft(min > 0 ? `${min} min` : 'menos de 1 min')
    }
    tick()
    const timer = setInterval(tick, 30000)
    return () => clearInterval(timer)
  }, [state, onExit])

  async function exit() {
    const { error } = await supabase.rpc('stop_impersonation')
    if (error) {
      console.error('Error saliendo de la cuenta:', error.message)
      return
    }
    onExit()
  }

  if (!state) return null

  return (
    <div className={styles.bar} role="status">
      <IconAlert size={17} />
      <span className={styles.text}>
        Estás viendo el panel de <strong>{state.tenant_name}</strong>.
        Los cambios que hagas afectan a ese cliente.
      </span>
      <span className={styles.timer}>{left}</span>
      <button className={styles.btn} onClick={exit}>Salir de la cuenta</button>
    </div>
  )
}
