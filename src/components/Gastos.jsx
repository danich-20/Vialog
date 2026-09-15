import { useState } from 'react'
import { supabase } from '../supabase'
import { C } from '../lib/colors'
import { avisar, confirmar } from '../lib/dialogo'
import { uid, fmt, today, nombreMes, coincide } from '../lib/helpers'
import { SUBCATS, METODOS } from '../lib/constants'
import { subirArchivo, borrarArchivo } from '../lib/upload'
import Badge from './ui/Badge'
import Button from './ui/Button'
import Modal from './ui/Modal'
import Ic from './ui/Icons'
import { Inp, Sel, Field, Archivo, Buscador } from './ui/Input'

const Gastos = ({ gastos, setGastos, viajes, camiones }) => {
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({})
  const [guardando, setGuardando] = useState(false)
  const [busca, setBusca] = useState("")
  const [mes, setMes] = useState(() => {
    const hoy = new Date()
    return `${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,'0')}`
  })
  const s = f => setForm(p => ({ ...p, ...f }))

  const meses = [...new Set(gastos.map(g => g.fecha?.slice(0,7)).filter(Boolean))].sort().reverse()
  const gastosMes = gastos
    .filter(g => g.fecha?.startsWith(mes))
    .filter(g => coincide(
      busca,
      g.subcategoria, g.descripcion, g.referencia, g.metodo_pago,
      camiones.find(c => c.id === g.camion_id)?.placa,
      viajes.find(v => v.id === g.viaje_id)?.numero,
    ))
  const total = gastosMes.reduce((s,g) => s + g.monto_usd, 0)

  const openNew = () => {
    setForm({ id:uid(), fecha:today(), tasa:0, monto_bs:0, monto_usd:0 })
    setModal("new")
  }
  const openEdit = g => { setForm({ ...g }); setModal("edit") }

  const save_ = async () => {
    if (guardando) return
    setGuardando(true)
    try {
      if (!form.subcategoria || !form.camion_id) return avisar("Completa los campos obligatorios")
      const { comprobanteFile, ...rest } = form
      let comprobante_url = rest.comprobante_url || null
      if (comprobanteFile) {
        comprobante_url = await subirArchivo(comprobanteFile, 'gastos')
        if (rest.comprobante_url) await borrarArchivo(rest.comprobante_url)
      }
      const payload = { ...rest, comprobante_url }
      if (modal === "new") {
        const { data: { user } } = await supabase.auth.getUser()
        const { data, error } = await supabase.from('gastos').insert([{ ...payload, user_id: user.id }]).select()
        if (error || !data?.[0]) return avisar('No se pudo guardar: ' + (error?.message || 'intenta de nuevo'))
        setGastos(p => [...p, data[0]])
      } else {
        await supabase.from('gastos').update(payload).eq('id', payload.id)
        setGastos(p => p.map(g => g.id === payload.id ? payload : g))
      }
      setModal(null)
    } finally {
      setGuardando(false)
    }
  }

  const del = async g => {
    if (!await confirmar("¿Eliminar?")) return
    const previos = gastos
    setGastos(p => p.filter(x => x.id !== g.id))
    const { error } = await supabase.from('gastos').delete().eq('id', g.id)
    if (error) { setGastos(previos); return avisar('No se pudo eliminar: ' + error.message) }
    await borrarArchivo(g.comprobante_url)
  }

  const tc = { Gasoil:"blue", Viáticos:"yellow", Peajes:"gray", "Pago del chofer":"green", Repuestos:"blue", Reparación:"red", Multa:"red", Grúa:"red", Otros:"gray" }

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"13px" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:"9px" }}>
        <div>
          <h2 style={{ margin:"0 0 2px", fontSize:"19px", fontWeight:600, color:C.textPrimary }}>Gastos operativos</h2>
          <p style={{ margin:0, color:C.textSecondary, fontSize:"12px" }}>{busca ? "Total filtrado" : "Total mes"}: ${fmt(total)}</p>
        </div>
        <Button onClick={openNew}><Ic n="plus" s={14}/> Registrar gasto</Button>
      </div>

      <div style={{ display:"flex", alignItems:"center", gap:"6px", flexWrap:"wrap" }}>
        {meses.map(m => (
          <button key={m} onClick={() => setMes(m)} style={{ padding:"3px 10px", borderRadius:"20px", border:"1px solid", fontSize:"11px", fontWeight:600, cursor:"pointer", background:mes===m?C.accent:"transparent", color:mes===m?"#fff":C.textMuted, borderColor:mes===m?C.accent:C.border }}>
            {nombreMes(m)}
          </button>
        ))}
      </div>

      <Buscador value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar categoría, placa, referencia..."/>

      <div style={{ display:"flex", flexDirection:"column", gap:"6px" }}>
        {gastosMes.length === 0 && <div style={{ color:C.textMuted, textAlign:"center", padding:"36px", fontSize:"12px" }}>{busca ? "Sin resultados" : "Sin gastos este mes"}</div>}
        {[...gastosMes].reverse().map(g => {
          const cam   = camiones.find(c => c.id === g.camion_id)
          const viaje = viajes.find(v => v.id === g.viaje_id)
          return (
            <div key={g.id} style={{ background:C.bg1, border:`1px solid ${C.border}`, borderRadius:"9px", padding:"11px 13px", display:"flex", justifyContent:"space-between", alignItems:"center", gap:"8px" }}>
              <div style={{ flex:1 }}>
                <div style={{ display:"flex", alignItems:"center", gap:"6px", marginBottom:"2px" }}>
                  <Badge label={g.subcategoria} color={tc[g.subcategoria] || "gray"}/>
                  <span style={{ fontSize:"10px", color:C.textMuted }}>{g.fecha}</span>
                  {g.metodo_pago && <span style={{ fontSize:"10px", color:C.textMuted }}>· {g.metodo_pago}</span>}
                </div>
                <div style={{ fontSize:"11px", color:C.textSecondary }}>{cam?.placa}{viaje ? ` · ${viaje.numero}` : ""}{g.descripcion ? ` · ${g.descripcion}` : ""}</div>
                {g.referencia && <div style={{ fontSize:"10px", color:C.textMuted }}>Ref: {g.referencia}</div>}
                {g.tasa > 0 && <div style={{ fontSize:"10px", color:C.textMuted }}>Bs {fmt(g.monto_bs)} · Tasa {g.tasa}</div>}
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:"7px" }}>
                {g.comprobante_url && (
                  <a href={g.comprobante_url} target="_blank" rel="noreferrer" style={{ color:C.blue, display:"flex" }}>
                    <Ic n="file" s={14}/>
                  </a>
                )}
                <span style={{ fontSize:"14px", fontWeight:700, color:C.red }}>${fmt(g.monto_usd)}</span>
                <Button onClick={() => openEdit(g)} variant="ghost" small><Ic n="edit" s={12}/></Button>
                <Button onClick={() => del(g)} variant="danger" small><Ic n="trash" s={12}/></Button>
              </div>
            </div>
          )
        })}
      </div>

      {modal && (
        <Modal title={modal === "new" ? "Registrar gasto" : "Editar gasto"} onClose={() => setModal(null)}>
          <Field label="Subcategoría *">
            <Sel value={form.subcategoria || ""} onChange={e => s({ subcategoria:e.target.value })}>
              <option value="">Seleccionar</option>
              {SUBCATS.map(t => <option key={t}>{t}</option>)}
            </Sel>
          </Field>
          <Field label="Unidad *">
            <Sel value={form.camion_id || ""} onChange={e => s({ camion_id:e.target.value })}>
              <option value="">Seleccionar</option>
              {camiones.map(c => <option key={c.id} value={c.id}>{c.placa}</option>)}
            </Sel>
          </Field>
          <Field label="Viaje">
            <Sel value={form.viaje_id || ""} onChange={e => s({ viaje_id:e.target.value })}>
              <option value="">Ninguno</option>
              {viajes.map(v => <option key={v.id} value={v.id}>{v.numero} – {v.origen}→{v.destino}</option>)}
            </Sel>
          </Field>
          <div className="form-grid">
            <Field label="Monto (USD)">
              <Inp type="number" value={form.monto_usd || ""} onChange={e => s({ monto_usd:+e.target.value, monto_bs:+((+e.target.value)*(form.tasa||0)).toFixed(2) })}/>
            </Field>
            <Field label="Tasa BCV">
              <Inp type="number" value={form.tasa || ""} onChange={e => s({ tasa:+e.target.value, monto_bs:+((form.monto_usd||0)*(+e.target.value)).toFixed(2) })}/>
            </Field>
            <Field label="Monto (Bs)">
              <Inp type="number" value={form.monto_bs || ""} onChange={e => s({ monto_bs:+e.target.value })}/>
            </Field>
            <Field label="Fecha">
              <Inp type="date" value={form.fecha || ""} onChange={e => s({ fecha:e.target.value })}/>
            </Field>
          </div>
          <Field label="Método de pago">
            <Sel value={form.metodo_pago || ""} onChange={e => s({ metodo_pago:e.target.value })}>
              <option value="">Seleccionar</option>
              {METODOS.map(m => <option key={m}>{m}</option>)}
            </Sel>
          </Field>
          <Field label="Referencia"><Inp value={form.referencia || ""} onChange={e => s({ referencia:e.target.value })}/></Field>
          <Field label="Descripción"><Inp value={form.descripcion || ""} onChange={e => s({ descripcion:e.target.value })}/></Field>
          <Field label="Comprobante">
            <Archivo accept="image/*,.pdf" onChange={e => s({ comprobanteFile:e.target.files[0] })}/>
            {form.comprobante_url && !form.comprobanteFile && (
              <a href={form.comprobante_url} target="_blank" rel="noreferrer" style={{ display:"inline-flex", alignItems:"center", gap:"5px", marginTop:"7px", fontSize:"11px", color:C.blue }}>
                <Ic n="file" s={13}/> Ver comprobante actual
              </a>
            )}
          </Field>
          <Button onClick={save_} disabled={guardando}>{modal === "new" ? "Guardar gasto" : "Guardar cambios"}</Button>
        </Modal>
      )}
    </div>
  )
}

export default Gastos