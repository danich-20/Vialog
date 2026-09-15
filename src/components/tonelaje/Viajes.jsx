import { useState } from 'react'
import { supabase } from '../../supabase'
import { C } from '../../lib/colors'
import { avisar, confirmar } from '../../lib/dialogo'
import { uid, fmt, fmtNum, today, nombreMes, coincide } from '../../lib/helpers'
import { ESTADOS_TONELAJE } from '../../lib/constants'
import { subirArchivo } from '../../lib/upload'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import Modal from '../ui/Modal'
import Ic from '../ui/Icons'
import { Inp, Sel, Field, Archivo, Buscador } from '../ui/Input'

const Viajes = ({ viajes, setViajes, camiones, conductores, rutas }) => {
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({})
  const [guardando, setGuardando] = useState(false)
  const [busca, setBusca] = useState("")
  const [mes, setMes] = useState(() => {
    const hoy = new Date()
    return `${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,'0')}`
  })
  const s = f => setForm(p => ({ ...p, ...f }))

  const meses = [...new Set(viajes.map(v => v.fecha?.slice(0,7)).filter(Boolean))].sort().reverse()
  const viajesMes = viajes
    .filter(v => v.fecha?.startsWith(mes))
    .filter(v => coincide(
      busca,
      v.fecha, v.estado, v.observaciones,
      rutas.find(r => r.id === v.ruta_id)?.nombre,
      conductores.find(c => c.id === v.conductor_id)?.nombre,
      camiones.find(c => c.id === v.camion_id)?.numero,
    ))
    .sort((a,b) => new Date(b.fecha) - new Date(a.fecha))

  const openNew = () => {
    setForm({ id:uid(), fecha:today(), tickers:1, toneladas:0, tarifa_tonelada:0, ingreso_bruto:0, estado:"PENDIENTE" })
    setModal("new")
  }
  const openEdit = v => { setForm({ ...v }); setModal("edit") }

  // recalcula ingreso bruto cada vez que cambian toneladas o tarifa
  const setToneladas = val => {
    const ing = val * (form.tarifa_tonelada || 0)
    s({ toneladas: val, ingreso_bruto: +ing.toFixed(2) })
  }
  const setTarifa = val => {
    const ing = (form.toneladas || 0) * val
    s({ tarifa_tonelada: val, ingreso_bruto: +ing.toFixed(2) })
  }

  const save_ = async () => {
    if (guardando) return
    setGuardando(true)
    try {
      if (!form.camion_id || !form.ruta_id || !form.toneladas) return avisar("Completa los campos obligatorios")
      const { data: { user } } = await supabase.auth.getUser()
      const { ticketFile, ...rest } = form
      const ticket_url = ticketFile ? await subirArchivo(ticketFile, 'tickets') : rest.ticket_url
      const payload = { ...rest, ticket_url }
      if (modal === "new") {
        const { data, error } = await supabase.from('viajes_tonelaje').insert([{ ...payload, user_id: user.id }]).select()
        if (error || !data?.[0]) return avisar('No se pudo guardar: ' + (error?.message || 'intenta de nuevo'))
        setViajes(p => [...p, data[0]])
      } else {
        await supabase.from('viajes_tonelaje').update(payload).eq('id', form.id)
        setViajes(p => p.map(v => v.id === form.id ? payload : v))
      }
      setModal(null)
    } finally {
      setGuardando(false)
    }
  }

  const del = async id => {
    if (!await confirmar("¿Eliminar viaje?")) return
    const previos = viajes
    setViajes(p => p.filter(v => v.id !== id))
    const { error } = await supabase.from('viajes_tonelaje').delete().eq('id', id)
    if (error) { setViajes(previos); return avisar('No se pudo eliminar: ' + error.message) }
  }

  const ec = { PAGADO:"green", PENDIENTE:"yellow" }

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"13px" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:"9px" }}>
        <div>
          <h2 style={{ margin:"0 0 2px", fontSize:"19px", fontWeight:600, color:C.textPrimary }}>Operación diaria</h2>
          <p style={{ margin:0, color:C.textSecondary, fontSize:"12px" }}>{viajesMes.length} este mes · {viajes.length} total</p>
        </div>
        <Button onClick={openNew}><Ic n="plus" s={14}/> Nuevo viaje</Button>
      </div>

      <div style={{ display:"flex", alignItems:"center", gap:"6px", flexWrap:"wrap" }}>
        {meses.map(m => (
          <button key={m} onClick={() => setMes(m)} style={{ padding:"3px 10px", borderRadius:"20px", border:"1px solid", fontSize:"11px", fontWeight:600, cursor:"pointer", background:mes===m?C.accent:"transparent", color:mes===m?"#fff":C.textMuted, borderColor:mes===m?C.accent:C.border }}>
            {nombreMes(m)}
          </button>
        ))}
      </div>

      <Buscador value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar ruta, chofer, unidad..."/>

      <div style={{ display:"flex", flexDirection:"column", gap:"6px" }}>
        {viajesMes.length === 0 && <div style={{ color:C.textMuted, textAlign:"center", padding:"36px", fontSize:"12px" }}>Sin viajes este mes</div>}
        {viajesMes.map(v => {
          const cam = camiones.find(c => c.id === v.camion_id)
          const cond = conductores.find(c => c.id === v.conductor_id)
          const ruta = rutas.find(r => r.id === v.ruta_id)
          const pagoChofer = (v.ingreso_bruto || 0) * ((cond?.porcentaje || 0) / 100)
          return (
            <div key={v.id} style={{ background:C.bg1, border:`1px solid ${C.border}`, borderRadius:"9px", padding:"12px 14px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:"8px", flexWrap:"wrap" }}>
                <div style={{ flex:1, minWidth:"170px" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:"6px", marginBottom:"4px" }}>
                    <span style={{ fontSize:"12px", fontWeight:700, color:C.accentLight }}>{v.fecha}</span>
                    <Badge label={v.estado} color={ec[v.estado] || "gray"}/>
                  </div>
                  <div style={{ fontSize:"13px", fontWeight:600, color:C.textPrimary, marginBottom:"2px" }}>{ruta?.nombre || "Sin ruta"}</div>
                  <div style={{ fontSize:"11px", color:C.textMuted }}>Unidad {cam?.numero} · {cond?.nombre}</div>
                  <div style={{ fontSize:"10px", color:C.textMuted, marginTop:"1px" }}>{fmtNum(v.toneladas)} ton · {v.tickers} tickers · ${v.tarifa_tonelada}/ton</div>
                  {v.observaciones && <div style={{ fontSize:"10px", color:C.textMuted, marginTop:"1px" }}>{v.observaciones}</div>}
                </div>
                {v.ticket_url && (
                  <a href={v.ticket_url} target="_blank" rel="noreferrer" style={{ flexShrink:0 }}>
                    <img src={v.ticket_url} alt="Ticket" style={{ width:"44px", height:"44px", objectFit:"cover", borderRadius:"6px", border:`1px solid ${C.border}`, display:"block" }}/>
                  </a>
                )}
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontSize:"15px", fontWeight:700, color:C.textPrimary }}>${fmt(v.ingreso_bruto)}</div>
                  <div style={{ fontSize:"11px", color:C.green }}>Chofer: ${fmt(pagoChofer)}</div>
                  <div style={{ display:"flex", gap:"4px", marginTop:"6px", justifyContent:"flex-end" }}>
                    <Button onClick={() => openEdit(v)} variant="ghost" small><Ic n="edit" s={12}/></Button>
                    <Button onClick={() => del(v.id)} variant="danger" small><Ic n="trash" s={12}/></Button>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {modal && (
        <Modal title={modal === "new" ? "Nuevo viaje" : "Editar viaje"} onClose={() => setModal(null)}>
          <div className="form-grid">
            <Field label="Fecha"><Inp type="date" value={form.fecha || ""} onChange={e => s({ fecha:e.target.value })}/></Field>
            <Field label="Estado"><Sel value={form.estado || ""} onChange={e => s({ estado:e.target.value })}>{ESTADOS_TONELAJE.map(x => <option key={x}>{x}</option>)}</Sel></Field>
            <Field label="Unidad *"><Sel value={form.camion_id || ""} onChange={e => s({ camion_id:e.target.value })}><option value="">Seleccionar</option>{camiones.map(c => <option key={c.id} value={c.id}>Unidad {c.numero}</option>)}</Sel></Field>
            <Field label="Chofer"><Sel value={form.conductor_id || ""} onChange={e => s({ conductor_id:e.target.value })}><option value="">Seleccionar</option>{conductores.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</Sel></Field>
            <Field label="Ruta *"><Sel value={form.ruta_id || ""} onChange={e => s({ ruta_id:e.target.value })}><option value="">Seleccionar</option>{rutas.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}</Sel></Field>
            <Field label="Tickers"><Inp type="number" value={form.tickers || ""} onChange={e => s({ tickers:+e.target.value })}/></Field>
            <Field label="Toneladas *"><Inp type="number" step="0.01" value={form.toneladas || ""} onChange={e => setToneladas(+e.target.value)}/></Field>
            <Field label="Tarifa x tonelada *"><Inp type="number" step="0.01" value={form.tarifa_tonelada || ""} onChange={e => setTarifa(+e.target.value)}/></Field>
          </div>
          <Field label="Ingreso bruto (calculado)">
            <div style={{ background:C.bg2, border:`1px solid ${C.border}`, borderRadius:"7px", padding:"9px 11px", fontSize:"15px", fontWeight:700, color:C.green }}>
              ${fmt(form.ingreso_bruto || 0)}
            </div>
          </Field>
          <Field label="Observaciones"><Inp value={form.observaciones || ""} onChange={e => s({ observaciones:e.target.value })}/></Field>
          <Field label="Foto del ticket">
            <Archivo accept="image/*" onChange={e => s({ ticketFile:e.target.files[0] })}/>
            {form.ticket_url && !form.ticketFile && (
              <img src={form.ticket_url} alt="Ticket" style={{ marginTop:"8px", maxHeight:"90px", borderRadius:"7px", border:`1px solid ${C.border}` }}/>
            )}
          </Field>
          <Button onClick={save_} disabled={guardando}>{modal === "new" ? "Registrar" : "Guardar"}</Button>
        </Modal>
      )}
    </div>
  )
}

export default Viajes