import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import { C } from '../../lib/colors'
import { avisar, confirmar } from '../../lib/dialogo'
import { uid, fmtNum, today, calcEstado } from '../../lib/helpers'
import { TIPOS_MANT } from '../../lib/constants'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import Modal from '../ui/Modal'
import Ic from '../ui/Icons'
import { Inp, Sel, Field } from '../ui/Input'

const Mantenimiento = ({ mantenimientos, setMantenimientos, camiones }) => {
  const [modal, setModal] = useState(null)
  const [historial, setHistorial] = useState([])
  const [verHistorial, setVerHistorial] = useState(false)
  const [form, setForm] = useState({})
  const [guardando, setGuardando] = useState(false)
  const s = f => setForm(p => ({ ...p, ...f }))

  useEffect(() => {
    supabase.from('historial_mantenimientos_tonelaje').select('*').order('fecha_realizado', { ascending:false }).then(({ data }) => setHistorial(data || []))
  }, [])

  const openNew = () => {
    setForm({ id:uid(), intervalo_km:10000, intervalo_dias:90 })
    setModal("new")
  }
  const openEdit = m => { setForm({ ...m }); setModal("edit") }

  const save_ = async () => {
    if (guardando) return
    setGuardando(true)
    try {
      if (!form.camion_id || !form.tipo) return avisar("Completa los campos obligatorios")
      const { data: { user } } = await supabase.auth.getUser()
      if (modal === "new") {
        const { data, error } = await supabase.from('mantenimientos_tonelaje').insert([{ ...form, user_id: user.id }]).select()
        if (error || !data?.[0]) return avisar('No se pudo guardar: ' + (error?.message || 'intenta de nuevo'))
        setMantenimientos(p => [...p, data[0]])
      } else {
        await supabase.from('mantenimientos_tonelaje').update(form).eq('id', form.id)
        setMantenimientos(p => p.map(m => m.id === form.id ? form : m))
      }
      setModal(null)
    } finally {
      setGuardando(false)
    }
  }

  const del = async id => {
    if (!await confirmar("¿Eliminar?")) return
    const previos = mantenimientos
    setMantenimientos(p => p.filter(m => m.id !== id))
    const { error } = await supabase.from('mantenimientos_tonelaje').delete().eq('id', id)
    if (error) { setMantenimientos(previos); return avisar('No se pudo eliminar: ' + error.message) }
  }

  const marcarHecho = async m => {
    const cam = camiones.find(c => c.id === m.camion_id)
    const km  = cam?.km || m.km_ultimo
    const { data: { user } } = await supabase.auth.getUser()

    const registro = {
      id: uid(),
      camion_id: m.camion_id,
      tipo: m.tipo,
      fecha_realizado: today(),
      km_realizado: km,
      costo: 0,
      nota: m.nota || ''
    }
    await supabase.from('historial_mantenimientos_tonelaje').insert([{ ...registro, user_id: user.id }])
    setHistorial(p => [registro, ...p])

    const upd = {
      ...m,
      fecha_ultimo: today(),
      km_ultimo: km,
      proxima_fecha: new Date(Date.now() + m.intervalo_dias * 86400000).toISOString().split("T")[0],
      proximo_km: km + m.intervalo_km,
    }
    await supabase.from('mantenimientos_tonelaje').update(upd).eq('id', m.id)
    setMantenimientos(p => p.map(x => x.id === m.id ? upd : x))
  }

  const ec = { vencido:"red", pendiente:"yellow", ok:"green" }
  const el = { vencido:"Vencido", pendiente:"Próximo", ok:"Al día" }
  const grupos = camiones.map(c => ({ cam:c, items:mantenimientos.filter(m => m.camion_id === c.id) }))
  const total  = mantenimientos.filter(m => { const c = camiones.find(x => x.id === m.camion_id); return calcEstado(m, c?.km) !== "ok" }).length

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"13px" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:"9px" }}>
        <div>
          <h2 style={{ margin:"0 0 2px", fontSize:"19px", fontWeight:600, color:C.textPrimary }}>Mantenimiento preventivo</h2>
          <p style={{ margin:0, color:C.textSecondary, fontSize:"12px" }}>{total} alertas · estado automático</p>
        </div>
        <div style={{ display:"flex", gap:"6px" }}>
          <Button onClick={() => setVerHistorial(p => !p)} variant="ghost">{verHistorial ? "Ver tareas" : "Ver historial"}</Button>
          <Button onClick={openNew}><Ic n="plus" s={14}/> Agregar</Button>
        </div>
      </div>

      {verHistorial ? (
        <div style={{ display:"flex", flexDirection:"column", gap:"6px" }}>
          <h4 style={{ margin:"0 0 6px", fontSize:"11px", fontWeight:600, color:C.textMuted, textTransform:"uppercase", letterSpacing:"0.08em" }}>Historial de mantenimientos realizados</h4>
          {historial.length === 0 && <div style={{ color:C.textMuted, textAlign:"center", padding:"36px", fontSize:"12px" }}>Sin historial aún</div>}
          {historial.map(h => {
            const cam = camiones.find(c => c.id === h.camion_id)
            return (
              <div key={h.id} style={{ background:C.bg1, border:`1px solid ${C.border}`, borderRadius:"9px", padding:"11px 13px", display:"flex", justifyContent:"space-between", alignItems:"center", gap:"8px" }}>
                <div>
                  <div style={{ fontSize:"12px", fontWeight:600, color:C.textPrimary, marginBottom:"2px" }}>{h.tipo}</div>
                  <div style={{ fontSize:"10px", color:C.textMuted }}>Unidad {cam?.numero} · {h.fecha_realizado} · {fmtNum(h.km_realizado)} km</div>
                  {h.nota && <div style={{ fontSize:"10px", color:C.yellow }}>{h.nota}</div>}
                </div>
                <Badge label="Realizado" color="green"/>
              </div>
            )
          })}
        </div>
      ) : (
        grupos.map(({ cam, items }) => (
          <div key={cam.id} style={{ background:C.bg1, border:`1px solid ${C.border}`, borderRadius:"9px", overflow:"hidden" }}>
            <div style={{ padding:"10px 13px", borderBottom:`1px solid ${C.border}`, background:C.bg2, display:"flex", alignItems:"center", gap:"7px" }}>
              <span style={{ fontSize:"13px", fontWeight:700, color:C.accentLight }}>Unidad {cam.numero}</span>
              <span style={{ fontSize:"11px", color:C.textMuted }}>{cam.marca} {cam.modelo} · {fmtNum(cam.km)} km</span>
            </div>
            {items.length === 0 && <div style={{ padding:"12px 13px", color:C.textMuted, fontSize:"12px" }}>Sin tareas</div>}
            {items.map(m => {
              const est = calcEstado(m, cam.km)
              return (
                <div key={m.id} style={{ padding:"11px 13px", borderBottom:`1px solid ${C.bg3}`, display:"flex", justifyContent:"space-between", alignItems:"center", gap:"8px", flexWrap:"wrap" }}>
                  <div style={{ flex:1, minWidth:"150px" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:"6px", marginBottom:"2px" }}>
                      <span style={{ fontSize:"12px", fontWeight:600, color:C.textPrimary }}>{m.tipo}</span>
                      <Badge label={el[est] || est} color={ec[est] || "gray"}/>
                    </div>
                    <div style={{ fontSize:"10px", color:C.textMuted }}>Último: {m.fecha_ultimo || "—"}{m.km_ultimo ? ` · ${fmtNum(m.km_ultimo)} km` : ""}</div>
                    <div style={{ fontSize:"10px", color:C.textMuted }}>Próximo: {m.proxima_fecha || "—"}{m.proximo_km ? ` · ${fmtNum(m.proximo_km)} km` : ""}</div>
                    {m.nota && <div style={{ fontSize:"10px", color:C.yellow, marginTop:"1px" }}>{m.nota}</div>}
                  </div>
                  <div style={{ display:"flex", gap:"4px", alignItems:"center" }}>
                    {est !== "ok" && (
                      <button onClick={() => marcarHecho(m)} style={{ background:C.greenBg, border:`1px solid ${C.greenBorder}`, borderRadius:"6px", padding:"4px 9px", color:C.green, cursor:"pointer", fontSize:"11px", fontWeight:700 }}>
                        ✓ Hecho
                      </button>
                    )}
                    <Button onClick={() => openEdit(m)} variant="ghost" small><Ic n="edit" s={12}/></Button>
                    <Button onClick={() => del(m.id)} variant="danger" small><Ic n="trash" s={12}/></Button>
                  </div>
                </div>
              )
            })}
          </div>
        ))
      )}

      {modal && (
        <Modal title={modal === "new" ? "Nueva tarea" : "Editar tarea"} onClose={() => setModal(null)}>
          <Field label="Unidad *">
            <Sel value={form.camion_id || ""} onChange={e => s({ camion_id:e.target.value })}>
              <option value="">Seleccionar</option>
              {camiones.map(c => <option key={c.id} value={c.id}>Unidad {c.numero}</option>)}
            </Sel>
          </Field>
          <Field label="Tipo *">
            <Sel value={form.tipo || ""} onChange={e => s({ tipo:e.target.value })}>
              <option value="">Seleccionar</option>
              {TIPOS_MANT.map(t => <option key={t}>{t}</option>)}
            </Sel>
          </Field>
          <div className="form-grid">
            <Field label="Último realizado"><Inp type="date" value={form.fecha_ultimo || ""} onChange={e => s({ fecha_ultimo:e.target.value })}/></Field>
            <Field label="Km en último"><Inp type="number" value={form.km_ultimo || ""} onChange={e => s({ km_ultimo:+e.target.value })}/></Field>
            <Field label="Intervalo (km)"><Inp type="number" value={form.intervalo_km || ""} onChange={e => s({ intervalo_km:+e.target.value })}/></Field>
            <Field label="Intervalo (días)"><Inp type="number" value={form.intervalo_dias || ""} onChange={e => s({ intervalo_dias:+e.target.value })}/></Field>
            <Field label="Próxima fecha"><Inp type="date" value={form.proxima_fecha || ""} onChange={e => s({ proxima_fecha:e.target.value })}/></Field>
            <Field label="Próximo km"><Inp type="number" value={form.proximo_km || ""} onChange={e => s({ proximo_km:+e.target.value })}/></Field>
          </div>
          <Field label="Notas"><Inp value={form.nota || ""} onChange={e => s({ nota:e.target.value })}/></Field>
          <Button onClick={save_} disabled={guardando}>{modal === "new" ? "Agregar" : "Guardar"}</Button>
        </Modal>
      )}
    </div>
  )
}

export default Mantenimiento