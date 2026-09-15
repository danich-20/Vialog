import { useState } from 'react'
import { supabase } from '../../supabase'
import { C } from '../../lib/colors'
import { avisar, confirmar } from '../../lib/dialogo'
import { uid, fmt, fmtNum, today, nombreMes } from '../../lib/helpers'
import { METODOS } from '../../lib/constants'
import { subirArchivo, borrarArchivo } from '../../lib/upload'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import Modal from '../ui/Modal'
import Ic from '../ui/Icons'
import { Inp, Sel, Field, Archivo } from '../ui/Input'

const Stat = ({ label, valor, color }) => (
  <div style={{ flex:"1 1 120px", minWidth:0 }}>
    <div style={{ fontSize:"9px", fontWeight:600, color:C.textMuted, textTransform:"uppercase", letterSpacing:"0.07em" }}>{label}</div>
    <div style={{ fontSize:"14px", fontWeight:700, color }}>${fmt(valor)}</div>
  </div>
)

const Comisiones = ({ conductores, viajes, rutas, pagos, camiones, pagosComision = [], setPagosComision }) => {
  // Arranca en "todo": filtrar por mes por defecto escondería comisiones viejas sin pagar
  const [mes, setMes] = useState("todo")
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({})
  const [guardando, setGuardando] = useState(false)
  const s = f => setForm(p => ({ ...p, ...f }))

  const meses = [...new Set(viajes.map(v => v.fecha?.slice(0,7)).filter(Boolean))].sort().reverse()
  const enMes = fecha => mes === "todo" || fecha?.startsWith(mes)

  const openNew = (conductor, saldo) => {
    setForm({ id:uid(), conductor_id:conductor.id, fecha:today(), monto_usd:saldo > 0 ? +saldo.toFixed(2) : 0, monto_bs:0, tasa:0, metodo:"Efectivo" })
    setModal("new")
  }

  const save_ = async () => {
    if (guardando) return
    setGuardando(true)
    try {
      if (!form.monto_usd) return avisar("Indica el monto pagado")
      const { comprobanteFile, ...rest } = form
      const comprobante_url = comprobanteFile ? await subirArchivo(comprobanteFile, 'comisiones') : null
      const { data: { user } } = await supabase.auth.getUser()
      const { data, error } = await supabase.from('pagos_comision_tonelaje').insert([{ ...rest, comprobante_url, user_id: user.id }]).select()
      if (error || !data?.[0]) return avisar('No se pudo guardar: ' + (error?.message || 'intenta de nuevo'))
      setPagosComision(p => [...p, data[0]])
      setModal(null)
    } finally {
      setGuardando(false)
    }
  }

  const del = async p => {
    if (!await confirmar("¿Eliminar este pago al chofer?")) return
    const previos = pagosComision
    setPagosComision(x => x.filter(y => y.id !== p.id))
    const { error } = await supabase.from('pagos_comision_tonelaje').delete().eq('id', p.id)
    if (error) { setPagosComision(previos); return avisar('No se pudo eliminar: ' + error.message) }
    await borrarArchivo(p.comprobante_url)
  }

  const data = conductores.map(c => {
    const pct = (c.porcentaje || 0) / 100
    const detalle = viajes
      .filter(v => v.conductor_id === c.id && enMes(v.fecha))
      .map(v => {
        const cobradoViaje = pagos.filter(p => p.viaje_id === v.id).reduce((s,p) => s + (p.monto_usd || 0), 0)
        return {
          viaje: v,
          ruta: rutas.find(r => r.id === v.ruta_id),
          cam: camiones.find(x => x.id === v.camion_id),
          generado: (v.ingreso_bruto || 0) * pct,
          porPagar: cobradoViaje * pct,
          saldado: (v.ingreso_bruto || 0) > 0 && cobradoViaje >= v.ingreso_bruto,
        }
      })
      .sort((a,b) => (b.viaje.fecha || "").localeCompare(a.viaje.fecha || ""))

    const misPagos = pagosComision
      .filter(p => p.conductor_id === c.id && enMes(p.fecha))
      .sort((a,b) => (b.fecha || "").localeCompare(a.fecha || ""))

    const generado = detalle.reduce((s,d) => s + d.generado, 0)
    const porPagar = detalle.reduce((s,d) => s + d.porPagar, 0)
    const pagado = misPagos.reduce((s,p) => s + (p.monto_usd || 0), 0)
    return { conductor:c, detalle, misPagos, generado, porPagar, pagado, saldo: porPagar - pagado }
  }).filter(x => x.detalle.length > 0 || x.misPagos.length > 0)

  const totSaldo = data.reduce((s,d) => s + d.saldo, 0)
  const totGenerado = data.reduce((s,d) => s + d.generado, 0)

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"13px" }}>
      <div>
        <h2 style={{ margin:"0 0 2px", fontSize:"19px", fontWeight:600, color:C.textPrimary }}>Comisiones</h2>
        <p style={{ margin:0, color:C.textSecondary, fontSize:"12px" }}>
          Generado: ${fmt(totGenerado)} · Saldo por pagar: ${fmt(totSaldo)}
        </p>
      </div>

      <div style={{ display:"flex", alignItems:"center", gap:"6px", flexWrap:"wrap" }}>
        {["todo", ...meses].map(m => (
          <button key={m} onClick={() => setMes(m)} style={{ padding:"3px 10px", borderRadius:"20px", border:"1px solid", fontSize:"11px", fontWeight:600, cursor:"pointer", background:mes===m?C.accent:"transparent", color:mes===m?"#fff":C.textMuted, borderColor:mes===m?C.accent:C.border }}>
            {m === "todo" ? "Todo" : nombreMes(m)}
          </button>
        ))}
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
        {data.length === 0 && <div style={{ color:C.textMuted, textAlign:"center", padding:"36px", fontSize:"12px" }}>Sin viajes en este período</div>}
        {data.map(({ conductor, detalle, misPagos, generado, porPagar, pagado, saldo }) => (
          <div key={conductor.id} style={{ background:C.bg1, border:`1px solid ${C.border}`, borderRadius:"9px", overflow:"hidden" }}>
            <div style={{ padding:"10px 13px", background:C.bg2, borderBottom:`1px solid ${C.border}` }}>
              <div style={{ display:"flex", alignItems:"center", gap:"6px", marginBottom:"8px" }}>
                <span style={{ fontSize:"13px", fontWeight:700, color:C.textPrimary }}>{conductor.nombre}</span>
                <Badge label={`${conductor.porcentaje || 0}%`} color="blue"/>
                <span style={{ fontSize:"10px", color:C.textMuted, marginLeft:"auto" }}>{detalle.length} viajes</span>
              </div>
              <div style={{ display:"flex", gap:"10px", flexWrap:"wrap", marginBottom:"9px" }}>
                <Stat label="Generado" valor={generado} color={C.textPrimary}/>
                <Stat label="Le corresponde" valor={porPagar} color={C.textSecondary}/>
                <Stat label="Ya pagado" valor={pagado} color={C.blue}/>
                <Stat label="Saldo" valor={saldo} color={saldo > 0.005 ? C.green : C.textMuted}/>
              </div>
              <Button onClick={() => openNew(conductor, saldo)} variant="ghost" small>
                <Ic n="plus" s={12}/> Registrar pago al chofer
              </Button>
            </div>

            {misPagos.map(p => (
              <div key={p.id} style={{ padding:"8px 13px", borderBottom:`1px solid ${C.bg3}`, background:C.blueBg, display:"flex", justifyContent:"space-between", alignItems:"center", gap:"8px" }}>
                <div style={{ minWidth:0 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:"6px", flexWrap:"wrap" }}>
                    <Badge label="Pagado al chofer" color="blue"/>
                    <span style={{ fontSize:"10px", color:C.textMuted }}>{p.fecha} · {p.metodo}</span>
                  </div>
                  {p.referencia && <div style={{ fontSize:"10px", color:C.textMuted, marginTop:"1px" }}>Ref: {p.referencia}</div>}
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:"7px", flexShrink:0 }}>
                  {p.comprobante_url && (
                    <a href={p.comprobante_url} target="_blank" rel="noreferrer" style={{ color:C.blue, display:"flex" }}>
                      <Ic n="file" s={14}/>
                    </a>
                  )}
                  <span style={{ fontSize:"13px", fontWeight:700, color:C.blue }}>−${fmt(p.monto_usd)}</span>
                  <Button onClick={() => del(p)} variant="danger" small><Ic n="trash" s={12}/></Button>
                </div>
              </div>
            ))}

            {detalle.map(({ viaje, ruta, cam, generado:gen, porPagar:pp, saldado }) => (
              <div key={viaje.id} style={{ padding:"9px 13px", borderBottom:`1px solid ${C.bg3}`, display:"flex", justifyContent:"space-between", alignItems:"center", gap:"8px" }}>
                <div style={{ minWidth:0, flex:1 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:"6px", flexWrap:"wrap" }}>
                    <span style={{ fontSize:"11px", fontWeight:700, color:C.accentLight }}>{viaje.fecha}</span>
                    <span style={{ fontSize:"10px", color:C.textMuted }}>{ruta?.nombre || "Sin ruta"}</span>
                    <Badge label={saldado ? "Cobrado" : "Por cobrar"} color={saldado ? "green" : "yellow"}/>
                  </div>
                  <div style={{ fontSize:"10px", color:C.textMuted, marginTop:"1px" }}>
                    {cam ? `Unidad ${cam.numero} · ` : ""}{fmtNum(viaje.toneladas)} ton · Ingreso ${fmt(viaje.ingreso_bruto)}
                  </div>
                </div>
                <div style={{ textAlign:"right", flexShrink:0 }}>
                  <div style={{ fontSize:"13px", fontWeight:700, color:C.textPrimary }}>${fmt(gen)}</div>
                  <div style={{ fontSize:"10px", color:pp > 0 ? C.green : C.textMuted }}>le toca ${fmt(pp)}</div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {modal && (
        <Modal title={`Pago a ${conductores.find(c => c.id === form.conductor_id)?.nombre || "chofer"}`} onClose={() => setModal(null)}>
          <div className="form-grid">
            <Field label="Monto (USD) *">
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
          <Field label="Método">
            <Sel value={form.metodo || "Efectivo"} onChange={e => s({ metodo:e.target.value })}>
              {METODOS.map(m => <option key={m}>{m}</option>)}
            </Sel>
          </Field>
          <Field label="Referencia">
            <Inp value={form.referencia || ""} onChange={e => s({ referencia:e.target.value })} placeholder="Número de referencia"/>
          </Field>
          <Field label="Comprobante">
            <Archivo accept="image/*,.pdf" onChange={e => s({ comprobanteFile:e.target.files[0] })}/>
          </Field>
          <Button onClick={save_} disabled={guardando}>Guardar pago</Button>
        </Modal>
      )}
    </div>
  )
}

export default Comisiones
