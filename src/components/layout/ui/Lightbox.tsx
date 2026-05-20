import { useEffect, useRef } from 'react'
import styles from './Lightbox.module.css'
import { useLang } from '../../../context/LangContext'

interface LightboxProps {
  src: string
  alt: string
  onClose: () => void
  onPrev?: () => void
  onNext?: () => void
}

export default function Lightbox({ src, alt, onClose, onPrev, onNext }: LightboxProps) {
  const { t } = useLang()
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    closeRef.current?.focus()
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') onPrev?.()
      if (e.key === 'ArrowRight') onNext?.()
      // focus trap — Tab cycles within lightbox
      if (e.key === 'Tab') {
        const focusable = document.querySelectorAll<HTMLElement>('[data-lightbox-focus]')
        if (!focusable.length) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey) {
          if (document.activeElement === first) { e.preventDefault(); last.focus() }
        } else {
          if (document.activeElement === last) { e.preventDefault(); first.focus() }
        }
      }
    }
    document.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [onClose, onPrev, onNext])

  return (
    <div className={styles.backdrop} onClick={onClose} role="dialog" aria-modal="true" aria-label={alt}>
      <button
        ref={closeRef}
        data-lightbox-focus
        className={styles.close}
        onClick={onClose}
        aria-label={t('Cerrar', 'Close')}
      >✕</button>

      {onPrev && (
        <button
          data-lightbox-focus
          className={`${styles.nav} ${styles.navPrev}`}
          onClick={e => { e.stopPropagation(); onPrev() }}
          aria-label={t('Anterior', 'Previous')}
        >‹</button>
      )}

      <div className={styles.imgWrap} onClick={e => e.stopPropagation()}>
        <img src={src} alt={alt} className={styles.img} />
        <p className={styles.caption}>{alt}</p>
      </div>

      {onNext && (
        <button
          data-lightbox-focus
          className={`${styles.nav} ${styles.navNext}`}
          onClick={e => { e.stopPropagation(); onNext() }}
          aria-label={t('Siguiente', 'Next')}
        >›</button>
      )}
    </div>
  )
}
