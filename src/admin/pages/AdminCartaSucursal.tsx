import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import type { Branch } from '../../types/admin'
import styles from './AdminCartaSucursal.module.css'
import { IconAlert, IconCheckCircle, IconSearch } from '../ui/Icons'

interface CartaRow {
  menu_item_id: string
  name: string
  cat: string
  base_price: number
  available: boolean
  price_override: number | null
}

function money(n: number) {
  return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 })
}

export default function AdminCartaSucursal() {
  const [branches, setBranches] = useState<Branch[]>([])
  const [branch, setBranch] = useState('')
  const [rows, setRows] = useState<CartaRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState('')

  useEffect(() => {
    supabase.from('branches').select('*').eq('active', true).order('sort_order')
      .then(({ data, error }) => {
        if (error) { console.error('Error cargando sucursales:', error.message); return }
        const list = (data ?? []) as Branch[]
        setBranches(list)
        if (list.length > 0) setBranch(b => b || list[0].id)
      })
  }, [])

  async function load(branchId: string) {
    if (!branchId) return
    setLoading(true)
    const [menu, carta] = await Promise.all([
      supabase.from('menu_items').select('id,name,cat,price,active,sort_order')
        .eq('active', true).order('sort_order'),
      supabase.from('branch_menu').select('menu_item_id,available,price_override')
        .eq('branch_id', branchId),
    ])
    setLoading(false)

    if (menu.error || carta.error) {
      console.error('Error cargando la carta:', (menu.error ?? carta.error)?.message)
      setMsg({ ok: false, text: 'No se pudo cargar la carta.' })
      return
    }

    const byId = new Map(
      (carta.data ?? []).map(c => [c.menu_item_id, c])
    )

    setRows((menu.data ?? []).map(m => {
      const c = byId.get(m.id)
      return {
        menu_item_id: String(m.id),
        name: m.name,
        cat: m.cat,
        base_price: m.price,
        // Sin fila en branch_menu se asume disponible: el trigger de
        // alta la crea, pero un catalogo previo puede no tenerla.
        available: c ? c.available : true,
        price_override: c?.price_override ?? null,
      }
    }))
  }

  useEffect(() => { load(branch) }, [branch])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(r => r.name.toLowerCase().includes(q) || r.cat.toLowerCase().includes(q))
  }, [rows, search])

  const offered = rows.filter(r => r.available).length
  const custom = rows.filter(r => r.price_override !== null).length

  async function toggle(row: CartaRow) {
    const next = !row.available
    setRows(prev => prev.map(r => r.menu_item_id === row.menu_item_id ? { ...r, available: next } : r))

    const { error } = await supabase.from('branch_menu').upsert({
      branch_id: branch, menu_item_id: row.menu_item_id, available: next,
      price_override: row.price_override,
    })

    if (error) {
      console.error('Error cambiando disponibilidad:', error.message)
      setRows(prev => prev.map(r => r.menu_item_id === row.menu_item_id ? { ...r, available: !next } : r))
      setMsg({ ok: false, text: `No se pudo guardar: ${error.message}` })
    }
  }

  async function savePrice(row: CartaRow) {
    const raw = draft.trim()
    const value = raw === '' ? null : Number(raw)

    if (value !== null && (Number.isNaN(value) || value < 0)) {
      setMsg({ ok: false, text: 'El precio debe ser un número mayor o igual a cero.' })
      return
    }

    setEditing(null)
    setRows(prev => prev.map(r => r.menu_item_id === row.menu_item_id ? { ...r, price_override: value } : r))

    const { error } = await supabase.from('branch_menu').upsert({
      branch_id: branch, menu_item_id: row.menu_item_id,
      available: row.available, price_override: value,
    })

    if (error) {
      console.error('Error guardando el precio:', error.message)
      setRows(prev => prev.map(r => r.menu_item_id === row.menu_item_id ? { ...r, price_override: row.price_override } : r))
      setMsg({ ok: false, text: `No se pudo guardar: ${error.message}` })
      return
    }
    setMsg({ ok: true, text: value === null ? 'Precio devuelto al del catálogo.' : 'Precio actualizado.' })
  }

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <div>
          <h2 className={styles.title}>Carta por sucursal</h2>
          <p className={styles.sub}>
            Qué platillos ofrece cada sucursal y a qué precio. Sin precio propio se usa el del catálogo.
          </p>
        </div>
      </div>

      {msg && (
        <p className={msg.ok ? styles.ok : styles.err} role="alert">
          {msg.ok ? <IconCheckCircle size={16} /> : <IconAlert size={16} />}
          <span>{msg.text}</span>
        </p>
      )}

      {branches.length === 0 ? (
        <p className={styles.empty}>Primero crea una sucursal en «Sucursales».</p>
      ) : (
        <>
          <div className={styles.toolbar}>
            <select
              className={styles.select} value={branch}
              onChange={e => setBranch(e.target.value)} aria-label="Sucursal"
            >
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>

            <div className={styles.searchBox}>
              <IconSearch size={16} />
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Buscar platillo…" aria-label="Buscar platillo"
              />
            </div>

            {!loading && (
              <span className={styles.tally}>
                {offered} de {rows.length} en carta
                {custom > 0 && ` · ${custom} con precio propio`}
              </span>
            )}
          </div>

          {loading ? (
            <p className={styles.empty}>Cargando…</p>
          ) : filtered.length === 0 ? (
            <p className={styles.empty}>
              {rows.length === 0 ? 'No hay platillos en el catálogo.' : 'Ningún platillo coincide.'}
            </p>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Platillo</th>
                    <th>Categoría</th>
                    <th className={styles.num}>Catálogo</th>
                    <th className={styles.num}>Precio aquí</th>
                    <th className={styles.center}>En carta</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r => (
                    <tr key={r.menu_item_id} className={!r.available ? styles.rowOff : ''}>
                      <td><span className={styles.dishName}>{r.name}</span></td>
                      <td className={styles.muted}>{r.cat}</td>
                      <td className={`${styles.num} ${styles.muted}`}>{money(r.base_price)}</td>
                      <td className={styles.num}>
                        {editing === r.menu_item_id ? (
                          <input
                            className={styles.priceInput}
                            type="number" step="1" autoFocus
                            value={draft}
                            onChange={e => setDraft(e.target.value)}
                            onBlur={() => savePrice(r)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') savePrice(r)
                              if (e.key === 'Escape') setEditing(null)
                            }}
                            placeholder="Catálogo"
                            aria-label={`Precio de ${r.name}`}
                          />
                        ) : (
                          <button
                            className={styles.priceBtn}
                            onClick={() => {
                              setEditing(r.menu_item_id)
                              setDraft(r.price_override === null ? '' : String(r.price_override))
                              setMsg(null)
                            }}
                          >
                            {r.price_override === null
                              ? <span className={styles.inherit}>heredado</span>
                              : money(r.price_override)}
                          </button>
                        )}
                      </td>
                      <td className={styles.center}>
                        <button
                          className={`${styles.toggle} ${r.available ? styles.toggleOn : ''}`}
                          onClick={() => toggle(r)}
                          role="switch"
                          aria-checked={r.available}
                          aria-label={`${r.name} en carta`}
                        >
                          <span className={styles.knob} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
