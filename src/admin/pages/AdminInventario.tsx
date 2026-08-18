import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import type { Branch, Ingredient, StockRow, StockUnit, MovementKind } from '../../types/admin'
import styles from './AdminInventario.module.css'
import { IconAlert, IconCheckCircle, IconSearch } from '../ui/Icons'

const UNITS: StockUnit[] = ['kg', 'g', 'l', 'ml', 'pza', 'paq']

const KIND_LABEL: Record<MovementKind, string> = {
  entrada: 'Entrada', salida: 'Salida', merma: 'Merma', ajuste: 'Ajuste',
  consumo: 'Consumo',
}

// 'consumo' lo genera el sistema al marcar un pedido como listo:
// no se ofrece como opcion manual.
const MANUAL_KINDS: MovementKind[] = ['entrada', 'salida', 'merma', 'ajuste']

const EMPTY_ING = { name: '', unit: 'kg' as StockUnit, category: 'General', cost: 0, active: true }

function fmtQty(n: number) {
  return Number(n).toLocaleString('es-MX', { maximumFractionDigits: 3 })
}

export default function AdminInventario() {
  const [branches, setBranches] = useState<Branch[]>([])
  const [branch, setBranch] = useState<string>('')
  const [rows, setRows] = useState<StockRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [onlyLow, setOnlyLow] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  // Modales
  const [movingRow, setMovingRow] = useState<StockRow | null>(null)
  const [newIng, setNewIng] = useState(false)

  useEffect(() => {
    supabase.from('branches').select('*').eq('active', true).order('sort_order')
      .then(({ data, error }) => {
        if (error) { console.error('Error cargando sucursales:', error.message); return }
        const list = (data ?? []) as Branch[]
        setBranches(list)
        if (list.length > 0) setBranch(b => b || list[0].id)
      })
  }, [])

  async function loadStock(branchId: string) {
    if (!branchId) return
    setLoading(true)
    const { data, error } = await supabase
      .from('branch_stock')
      .select('branch_id,ingredient_id,quantity,min_quantity,ingredients(id,name,unit,category,cost,active)')
      .eq('branch_id', branchId)
    setLoading(false)
    if (error) {
      console.error('Error cargando el inventario:', error.message)
      setMsg({ ok: false, text: 'No se pudo cargar el inventario.' })
      return
    }
    const list = ((data ?? []) as unknown as StockRow[]).filter(r => r.ingredients?.active)
    list.sort((a, b) => (a.ingredients?.name ?? '').localeCompare(b.ingredients?.name ?? ''))
    setRows(list)
  }

  useEffect(() => { loadStock(branch) }, [branch])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter(r => {
      const low = r.min_quantity > 0 && r.quantity <= r.min_quantity
      if (onlyLow && !low) return false
      if (!q) return true
      const ing = r.ingredients
      return (ing?.name ?? '').toLowerCase().includes(q)
        || (ing?.category ?? '').toLowerCase().includes(q)
    })
  }, [rows, search, onlyLow])

  const lowCount = rows.filter(r => r.min_quantity > 0 && r.quantity <= r.min_quantity).length
  const negCount = rows.filter(r => r.quantity < 0).length

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <div>
          <h2 className={styles.title}>Inventario</h2>
          <p className={styles.sub}>Existencias de ingredientes por sucursal.</p>
        </div>
        <button className={styles.btnNew} onClick={() => { setNewIng(true); setMsg(null) }}>
          + Nuevo ingrediente
        </button>
      </div>

      {msg && (
        <p className={msg.ok ? styles.ok : styles.err} role="alert">
          {msg.ok ? <IconCheckCircle size={16} /> : <IconAlert size={16} />}
          <span>{msg.text}</span>
        </p>
      )}

      {branches.length === 0 ? (
        <p className={styles.empty}>
          Primero crea una sucursal en la sección «Sucursales».
        </p>
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
                placeholder="Buscar ingrediente…" aria-label="Buscar ingrediente"
              />
            </div>

            <button
              className={`${styles.chip} ${onlyLow ? styles.chipOn : ''}`}
              onClick={() => setOnlyLow(o => !o)}
            >
              Por reponer <span className={styles.chipNum}>{lowCount}</span>
            </button>

            {negCount > 0 && (
              <span className={styles.negTag}>{negCount} en negativo</span>
            )}
          </div>

          {loading ? (
            <p className={styles.empty}>Cargando…</p>
          ) : filtered.length === 0 ? (
            <p className={styles.empty}>
              {rows.length === 0
                ? 'Aún no hay ingredientes. Crea el primero con «Nuevo ingrediente».'
                : 'Ningún ingrediente coincide con el filtro.'}
            </p>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Ingrediente</th>
                    <th>Categoría</th>
                    <th className={styles.num}>Existencia</th>
                    <th className={styles.num}>Mínimo</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r => {
                    const low = r.min_quantity > 0 && r.quantity <= r.min_quantity
                    const neg = r.quantity < 0
                    return (
                      <tr key={r.ingredient_id}>
                        <td>
                          <span className={styles.ingName}>{r.ingredients?.name}</span>
                        </td>
                        <td className={styles.muted}>{r.ingredients?.category}</td>
                        <td className={styles.num}>
                          <span className={neg ? styles.qtyNeg : low ? styles.qtyLow : styles.qtyOk}>
                            {fmtQty(r.quantity)} {r.ingredients?.unit}
                          </span>
                        </td>
                        <td className={`${styles.num} ${styles.muted}`}>
                          {r.min_quantity > 0 ? `${fmtQty(r.min_quantity)} ${r.ingredients?.unit}` : '—'}
                        </td>
                        <td className={styles.num}>
                          <button className={styles.btnGhost} onClick={() => { setMovingRow(r); setMsg(null) }}>
                            Movimiento
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {movingRow && (
        <MovementModal
          row={movingRow}
          branchId={branch}
          onClose={() => setMovingRow(null)}
          onDone={(text) => { setMovingRow(null); setMsg({ ok: true, text }); loadStock(branch) }}
        />
      )}

      {newIng && (
        <IngredientModal
          onClose={() => setNewIng(false)}
          onDone={(text) => { setNewIng(false); setMsg({ ok: true, text }); loadStock(branch) }}
        />
      )}
    </div>
  )
}

/* ── Registrar movimiento ─────────────────── */
function MovementModal({ row, branchId, onClose, onDone }: {
  row: StockRow
  branchId: string
  onClose: () => void
  onDone: (text: string) => void
}) {
  const [kind, setKind] = useState<MovementKind>('entrada')
  const [qty, setQty] = useState('')
  const [note, setNote] = useState('')
  const [minQty, setMinQty] = useState(String(row.min_quantity))
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const unit = row.ingredients?.unit ?? ''
  const amount = Number(qty)

  const preview = (() => {
    if (!qty || Number.isNaN(amount)) return null
    const delta = kind === 'entrada' ? Math.abs(amount)
      : kind === 'ajuste' ? amount : -Math.abs(amount)
    return row.quantity + delta
  })()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!qty || Number.isNaN(amount) || amount === 0) {
      setErr('Indica una cantidad distinta de cero.')
      return
    }
    setSaving(true)

    const { error } = await supabase.from('stock_movements').insert({
      branch_id: branchId,
      ingredient_id: row.ingredient_id,
      kind,
      quantity: amount,
      note: note.trim(),
    })

    if (error) {
      setSaving(false)
      console.error('Error registrando el movimiento:', error.message)
      setErr(`No se pudo registrar: ${error.message}`)
      return
    }

    // El minimo vive en la existencia, no en el movimiento.
    const newMin = Number(minQty)
    if (!Number.isNaN(newMin) && newMin !== row.min_quantity) {
      const { error: minErr } = await supabase
        .from('branch_stock')
        .update({ min_quantity: newMin })
        .eq('branch_id', branchId)
        .eq('ingredient_id', row.ingredient_id)
      if (minErr) console.error('Error guardando el mínimo:', minErr.message)
    }

    setSaving(false)
    onDone(`${KIND_LABEL[kind]} registrada en ${row.ingredients?.name}.`)
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHead}>
          <h3>{row.ingredients?.name}</h3>
          <button onClick={onClose} aria-label="Cerrar">✕</button>
        </div>

        <form className={styles.modalBody} onSubmit={submit}>
          <p className={styles.current}>
            Existencia actual: <strong>{fmtQty(row.quantity)} {unit}</strong>
          </p>

          <div className={styles.kinds}>
            {MANUAL_KINDS.map(k => (
              <button
                key={k} type="button"
                className={`${styles.kindBtn} ${kind === k ? styles.kindOn : ''}`}
                onClick={() => { setKind(k); setErr('') }}
              >
                {KIND_LABEL[k]}
              </button>
            ))}
          </div>

          <div className={styles.row2}>
            <div className={styles.field}>
              <label htmlFor="mv-qty">
                Cantidad ({unit}){kind === 'ajuste' ? ' — usa negativo para restar' : ''}
              </label>
              <input
                id="mv-qty" type="number" step="0.001" value={qty}
                onChange={e => { setQty(e.target.value); setErr('') }}
                placeholder="0"
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="mv-min">Mínimo para reponer</label>
              <input
                id="mv-min" type="number" step="0.001" value={minQty}
                onChange={e => setMinQty(e.target.value)}
              />
            </div>
          </div>

          <div className={styles.field}>
            <label htmlFor="mv-note">Nota</label>
            <input
              id="mv-note" value={note} onChange={e => setNote(e.target.value)}
              placeholder="Proveedor, factura, motivo de la merma…"
            />
          </div>

          {preview !== null && (
            <p className={styles.preview}>
              Quedará en <strong className={preview < 0 ? styles.qtyNeg : ''}>
                {fmtQty(preview)} {unit}
              </strong>
            </p>
          )}

          {err && <p className={styles.err} role="alert"><IconAlert size={16} /><span>{err}</span></p>}

          <div className={styles.modalFoot}>
            <button type="submit" className={styles.btnSave} disabled={saving}>
              {saving ? 'Registrando…' : 'Registrar movimiento'}
            </button>
            <button type="button" className={styles.btnGhost} onClick={onClose}>Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ── Nuevo ingrediente ────────────────────── */
function IngredientModal({ onClose, onDone }: {
  onClose: () => void
  onDone: (text: string) => void
}) {
  const [form, setForm] = useState<Omit<Ingredient, 'id'>>(EMPTY_ING)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const handle = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    setForm(f => ({ ...f, [name]: type === 'number' ? Number(value) : value }))
    setErr('')
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setErr('El nombre es obligatorio.'); return }
    setSaving(true)

    const { error } = await supabase.from('ingredients').insert({
      ...form, name: form.name.trim(),
    })
    setSaving(false)

    if (error) {
      console.error('Error creando el ingrediente:', error.message)
      setErr(error.code === '23505'
        ? 'Ya existe un ingrediente con ese nombre.'
        : `No se pudo crear: ${error.message}`)
      return
    }
    onDone(`${form.name.trim()} agregado al catálogo.`)
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHead}>
          <h3>Nuevo ingrediente</h3>
          <button onClick={onClose} aria-label="Cerrar">✕</button>
        </div>

        <form className={styles.modalBody} onSubmit={submit}>
          <div className={styles.field}>
            <label htmlFor="ig-name">Nombre *</label>
            <input id="ig-name" name="name" value={form.name} onChange={handle}
              placeholder="Pasta fresca" />
          </div>

          <div className={styles.row2}>
            <div className={styles.field}>
              <label htmlFor="ig-unit">Unidad</label>
              <select id="ig-unit" name="unit" value={form.unit} onChange={handle}>
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div className={styles.field}>
              <label htmlFor="ig-cat">Categoría</label>
              <input id="ig-cat" name="category" value={form.category} onChange={handle}
                placeholder="Abarrotes" />
            </div>
          </div>

          <div className={styles.field}>
            <label htmlFor="ig-cost">Costo por {form.unit}</label>
            <input id="ig-cost" name="cost" type="number" step="0.01" value={form.cost}
              onChange={handle} />
          </div>

          <p className={styles.hint}>
            El ingrediente se agrega a todas las sucursales con existencia en cero.
          </p>

          {err && <p className={styles.err} role="alert"><IconAlert size={16} /><span>{err}</span></p>}

          <div className={styles.modalFoot}>
            <button type="submit" className={styles.btnSave} disabled={saving}>
              {saving ? 'Creando…' : 'Crear ingrediente'}
            </button>
            <button type="button" className={styles.btnGhost} onClick={onClose}>Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  )
}
