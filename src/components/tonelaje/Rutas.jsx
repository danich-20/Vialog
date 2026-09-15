import { useState } from 'react'
import { supabase } from '../../supabase'
import { C } from '../../lib/colors'
import { avisar, confirmar } from '../../lib/dialogo'
import { uid } from '../../lib/helpers'
import Button from '../ui/Button'
import Modal from '../ui/Modal'
import Ic from '../ui/Icons'
import { Inp, Field } from '../ui/Input'

const Rutas = ({ rutas, setRutas }) => {
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({})
  const [guardando, setGuardando] = useState(false)
  const s = f => setForm(p => ({ ...p, ...f }))

  const openNew = () => { setForm({ id:uid() }); setModal("new") }
  const openEdit = r => { setForm({ ...r }); setModal("edit") }

  const save_ = async () => {
    if (guardando) return
    setGuardando(true)
    try {
      if (!form.nombre) return avisar("El nombre es obligatorio")
      const { data: { user } } = await supabase.auth.getUser()
      if (modal === "new") {
        const { data, error } = await supabase.from('rutas_tonelaje').insert([{ ...form, user_id: user.id }]).select()
        if (error || !data?.[0]) return avisar('No se pudo guardar: ' + (error?.message || 'intenta de nuevo'))
        setRutas(p => [...p, data[0]])
      } else {
        await supabase.from('rutas_tonelaje').update(form).eq('id', form.id)
        setRutas(p => p.map(r => r.id === form.id ? form : r))
      }
      setModal(null)
    } finally {
      setGuardando(false)
    }
  }

  const del = async id => {
    if (!await confirmar("¿Eliminar?")) return
    const previos = rutas
    setRutas(p => p.filter(r => r.id !== id))
    const { error } = await supabase.from('rutas_tonelaje').delete().eq('id', id)
    if (error) { setRutas(previos); return avisar('No se pudo eliminar: ' + error.message) }
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"13px" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:"9px" }}>
        <div>
          <h2 style={{ margin:"0 0 2px", fontSize:"19px", fontWeight:600, color:C.textPrimary }}>Rutas</h2>
          <p style={{ margin:0, color:C.textSecondary, fontSize:"12px" }}>{rutas.length} registros</p>
        </div>
        <Button onClick={openNew}><Ic n="plus" s={14}/> Agregar</Button>
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:"6px" }}>
        {rutas.map(r => (
          <div key={r.id} style={{ background:C.bg1, border:`1px solid ${C.border}`, borderRadius:"9px", padding:"12px 13px", display:"flex", justifyContent:"space-between", alignItems:"center", gap:"8px", flexWrap:"wrap" }}>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:"13px", fontWeight:700, color:C.textPrimary, marginBottom:"2px" }}>{r.nombre}</div>
              <div style={{ fontSize:"10px", color:C.textMuted }}>{r.centro_produccion}</div>
              {r.molino && <div style={{ fontSize:"10px", color:C.textMuted }}>{r.molino}</div>}
            </div>
            <div style={{ display:"flex", gap:"4px" }}>
              <Button onClick={() => openEdit(r)} variant="ghost" small><Ic n="edit" s={12}/></Button>
              <Button onClick={() => del(r.id)} variant="danger" small><Ic n="trash" s={12}/></Button>
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <Modal title={modal === "new" ? "Nueva ruta" : "Editar ruta"} onClose={() => setModal(null)}>
          <Field label="Nombre de la ruta *"><Inp value={form.nombre || ""} onChange={e => s({ nombre:e.target.value })}/></Field>
          <Field label="Centro de producción"><Inp value={form.centro_produccion || ""} onChange={e => s({ centro_produccion:e.target.value })}/></Field>
          <Field label="Molino / Destino"><Inp value={form.molino || ""} onChange={e => s({ molino:e.target.value })}/></Field>
          <Button onClick={save_} disabled={guardando}>{modal === "new" ? "Agregar" : "Guardar"}</Button>
        </Modal>
      )}
    </div>
  )
}

export default Rutas