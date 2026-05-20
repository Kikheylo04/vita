import { useLang } from '../../../context/LangContext'
import styles from './LangSwitch.module.css'

export default function LangSwitch() {
  const { lang, setLang } = useLang()

  return (
    <div className={styles.switch}>
      <button
        className={`${styles.btn} ${lang === 'es' ? styles.active : ''}`}
        onClick={() => setLang('es')}
      >
        ES
      </button>
      <span className={styles.sep}>|</span>
      <button
        className={`${styles.btn} ${lang === 'en' ? styles.active : ''}`}
        onClick={() => setLang('en')}
      >
        EN
      </button>
    </div>
  )
}
