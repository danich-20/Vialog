import { useState } from 'react'
import { supabase } from '../supabase'
import { C } from '../lib/colors'
import { avisar, confirmar } from '../lib/dialogo'
import { uid, fmt } from '../lib/helpers'
import Button from './ui/Button'
import Modal from './ui/Modal'
import Ic from './ui/Icons'
import { Inp, Field } from './ui/Input'

const Clientes = ({ clientes, setClientes, viajes }) => {
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({})
  const [guardando, setGuardando] = useState(false)
  const s = f => setForm(p => ({ ...p, ...f }))

  const openNew = () => {
    setForm({ id:uid() })
    setModal("new")
  }
  const openEdit = c => { setForm({ ...c }); setModal("edit") }

  const save_ = async () => {
    if (guardando) return
    setGuardando(true)
    try {
      if (!form.nombre) return avisar("El nombre es obligatorio")
      if (modal === "new") {
        const { data: { user } } = await supabase.auth.getUser()
        const { data, error } = await supabase.from('clientes').insert([{ ...form, user_id: user.id }]).select()
        if (error || !data?.[0]) return avisar('No se pudo guardar: ' + (error?.message || 'intenta de nuevo'))
        setClientes(p => [...p, data[0]])
      } else {
        await supabase.from('clientes').update(form).eq('id', form.id)
        setClientes(p => p.map(c => c.id === form.id ? form : c))
      }
      setModal(null)
    } finally {
      setGuardando(false)
    }
  }

  const del = async id => {
    if (!await confirmar("¿Eliminar?")) return
    const previos = clientes
    setClientes(p => p.filter(c => c.id !== id))
    const { error } = await supabase.from('clientes').delete().eq('id', id)
    if (error) { setClientes(previos); return avisar('No se pudo eliminar: ' + error.message) }
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"13px" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:"9px" }}>
        <div>
          <h2 style={{ margin:"0 0 2px", fontSize:"19px", fontWeight:600, color:C.textPrimary }}>Clientes</h2>
          <p style={{ margin:0, color:C.textSecondary, fontSize:"12px" }}>{clientes.length} registros</p>
        </div>
        <Button onClick={openNew}><Ic n="plus" s={14}/> Agregar</Button>
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:"6px" }}>
        {clientes.map(c => {
          const mis = viajes.filter(v => v.cliente_id === c.id)
          const pc  = mis.filter(v => !v.pagado).reduce((s,v) => s + v.flete, 0)
          const fact = mis.reduce((s,v) => s + v.flete, 0)
          return (
            <div key={c.id} style={{ background:C.bg1, border:`1px solid ${C.border}`, borderRadius:"9px", padding:"12px 13px", display:"flex", justifyContent:"space-between", alignItems:"center", gap:"8px", flexWrap:"wrap" }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:"13px", fontWeight:700, color:C.textPrimary, marginBottom:"2px" }}>{c.nombre}</div>
                <div style={{ fontSize:"10px", color:C.textMuted }}>{c.rif}{c.tel ? ` · ${c.tel}` : ""}</div>
                <div style={{ fontSize:"10px", color:C.textMuted, marginTop:"1px" }}>{mis.length} viajes · Facturado: ${fmt(fact)}</div>
              </div>
              <div style={{ textAlign:"right" }}>
                {pc > 0 && (
                  <div>
                    <div style={{ fontSize:"14px", fontWeight:700, color:C.yellow }}>${fmt(pc)}</div>
                    <div style={{ fontSize:"10px", color:C.textMuted }}>por cobrar</div>
                  </div>
                )}
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
        <Modal title={modal === "new" ? "Nuevo cliente" : "Editar cliente"} onClose={() => setModal(null)}>
          <Field label="Nombre / Empresa *"><Inp value={form.nombre || ""} onChange={e => s({ nombre:e.target.value })}/></Field>
          <Field label="RIF"><Inp value={form.rif || ""} onChange={e => s({ rif:e.target.value })}/></Field>
          <Field label="Teléfono"><Inp value={form.tel || ""} onChange={e => s({ tel:e.target.value })}/></Field>
          <Button onClick={save_} disabled={guardando}>{modal === "new" ? "Agregar" : "Guardar"}</Button>
        </Modal>
      )}
    </div>
  )
}

export default Clientes