import { useState } from 'react'
import { supabase } from '../../supabase'
import { C } from '../../lib/colors'
import { avisar, confirmar } from '../../lib/dialogo'
import { uid, fmt } from '../../lib/helpers'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import Modal from '../ui/Modal'
import Ic from '../ui/Icons'
import { Inp, Field } from '../ui/Input'

const Conductores = ({ conductores, setConductores, viajes, pagos = [], pagosComision = [] }) => {
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({})
  const [guardando, setGuardando] = useState(false)
  const s = f => setForm(p => ({ ...p, ...f }))

  const openNew = () => { setForm({ id:uid(), porcentaje:14, activo:true }); setModal("new") }
  const openEdit = c => { setForm({ ...c }); setModal("edit") }

  const save_ = async () => {
    if (guardando) return
    setGuardando(true)
    try {
      if (!form.nombre) return avisar("El nombre es obligatorio")
      const { data: { user } } = await supabase.auth.getUser()
      if (modal === "new") {
        const { data, error } = await supabase.from('conductores_tonelaje').insert([{ ...form, user_id: user.id }]).select()
        if (error || !data?.[0]) return avisar('No se pudo guardar: ' + (error?.message || 'intenta de nuevo'))
        setConductores(p => [...p, data[0]])
      } else {
        await supabase.from('conductores_tonelaje').update(form).eq('id', form.id)
        setConductores(p => p.map(c => c.id === form.id ? form : c))
      }
      setModal(null)
    } finally {
      setGuardando(false)
    }
  }

  const del = async id => {
    if (!await confirmar("¿Eliminar?")) return
    const previos = conductores
    setConductores(p => p.filter(c => c.id !== id))
    const { error } = await supabase.from('conductores_tonelaje').delete().eq('id', id)
    if (error) { setConductores(previos); return avisar('No se pudo eliminar: ' + error.message) }
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"13px" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:"9px" }}>
        <div>
          <h2 style={{ margin:"0 0 2px", fontSize:"19px", fontWeight:600, color:C.textPrimary }}>Choferes</h2>
          <p style={{ margin:0, color:C.textSecondary, fontSize:"12px" }}>{conductores.length} registros</p>
        </div>
        <Button onClick={openNew}><Ic n="plus" s={14}/> Agregar</Button>
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:"6px" }}>
        {conductores.map(c => {
          const mis = viajes.filter(v => v.conductor_id === c.id)
          const cobrado = mis.reduce((s,v) => s + pagos.filter(p => p.viaje_id === v.id).reduce((a,p) => a + (p.monto_usd || 0), 0), 0)
          const pagado = pagosComision.filter(p => p.conductor_id === c.id).reduce((s,p) => s + (p.monto_usd || 0), 0)
          const totalChofer = cobrado * ((c.porcentaje || 0) / 100) - pagado
          return (
            <div key={c.id} style={{ background:C.bg1, border:`1px solid ${C.border}`, borderRadius:"9px", padding:"12px 13px", display:"flex", justifyContent:"space-between", alignItems:"center", gap:"8px", flexWrap:"wrap" }}>
              <div style={{ flex:1 }}>
                <div style={{ display:"flex", alignItems:"center", gap:"6px", marginBottom:"2px" }}>
                  <span style={{ fontSize:"13px", fontWeight:700, color:C.textPrimary }}>{c.nombre}</span>
                  <Badge label={c.activo ? "Activo" : "Inactivo"} color={c.activo ? "green" : "gray"}/>
                </div>
                <div style={{ fontSize:"10px", color:C.textMuted }}>{c.cedula} · {c.tel}</div>
                <div style={{ fontSize:"10px", color:C.textMuted, marginTop:"1px" }}>{mis.length} viajes · {c.porcentaje}%</div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:"14px", fontWeight:700, color:C.green }}>${fmt(totalChofer)}</div>
                <div style={{ fontSize:"10px", color:C.textMuted }}>por pagar</div>
                <div style={{ display:"flex", gap:"4px", marginTop:"6px", justifyContent:"flex-end" }}>
                  <Button onClick={() => openEdit(c)} variant="ghost" small><Ic n="edit" s={12}/></Button>
                  <Button onClick={() => del(c.id)} variant="danger" small><Ic n="trash" s={12}/></Button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {modal && (
        <Modal title={modal === "new" ? "Nuevo chofer" : "Editar chofer"} onClose={() => setModal(null)}>
          <Field label="Nombre *"><Inp value={form.nombre || ""} onChange={e => s({ nombre:e.target.value })}/></Field>
          <Field label="Cédula"><Inp value={form.cedula || ""} onChange={e => s({ cedula:e.target.value })}/></Field>
          <Field label="Teléfono"><Inp value={form.tel || ""} onChange={e => s({ tel:e.target.value })}/></Field>
          <Field label="% Chofer"><Inp type="number" value={form.porcentaje ?? 14} onChange={e => s({ porcentaje:+e.target.value })}/></Field>
          <div style={{ display:"flex", alignItems:"center", gap:"7px", marginBottom:"12px" }}>
            <input type="checkbox" id="ac" checked={form.activo ?? true} onChange={e => s({ activo:e.target.checked })} style={{ width:"13px", height:"13px", accentColor:C.accent }}/>
            <label htmlFor="ac" style={{ fontSize:"12px", color:C.textSecondary, cursor:"pointer" }}>Activo</label>
          </div>
          <Button onClick={save_} disabled={guardando}>{modal === "new" ? "Agregar" : "Guardar"}</Button>
        </Modal>
      )}
    </div>
  )
}

export default Conductores