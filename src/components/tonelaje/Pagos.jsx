import { useState } from 'react'
import jsPDF from 'jspdf'
import { supabase } from '../../supabase'
import { C } from '../../lib/colors'
import { avisar, confirmar } from '../../lib/dialogo'
import { uid, fmt, today, nombreMes, coincide, enRango } from '../../lib/helpers'
import { METODOS } from '../../lib/constants'
import { subirArchivo, borrarArchivo } from '../../lib/upload'
import Button from '../ui/Button'
import Modal from '../ui/Modal'
import Ic from '../ui/Icons'
import PeriodoPDF from '../ui/PeriodoPDF'
import { Inp, Sel, Field, Archivo, Buscador } from '../ui/Input'

const Pagos = ({ viajes, pagos, setPagos, conductores, camiones, rutas }) => {
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({})
  const [guardando, setGuardando] = useState(false)
  const [filtro, setFiltro] = useState("pendientes")
  const [busca, setBusca] = useState("")
  const [modalPDF, setModalPDF] = useState(false)
  // Arranca en "todo": filtrar por mes escondería saldos viejos por cobrar
  const [mes, setMes] = useState("todo")
  const s = f => setForm(p => ({ ...p, ...f }))

  const openNew = () => {
    setForm({ id:uid(), fecha:today(), monto_usd:0, monto_bs:0, tasa:0, metodo:"Transferencia" })
    setModal("new")
  }
  const openEdit = p => { setForm({ ...p }); setModal("edit") }

  const save_ = async () => {
    if (guardando) return
    setGuardando(true)
    try {
      if (!form.viaje_id || !form.monto_usd) return avisar("Completa los campos obligatorios")
      const { comprobanteFile, ...rest } = form
      let comprobante_url = rest.comprobante_url || null
      if (comprobanteFile) {
        comprobante_url = await subirArchivo(comprobanteFile, 'pagos')
        if (rest.comprobante_url) await borrarArchivo(rest.comprobante_url)
      }
      const payload = { ...rest, comprobante_url }
      if (modal === "new") {
        const { data: { user } } = await supabase.auth.getUser()
        const { data, error } = await supabase.from('pagos_tonelaje').insert([{ ...payload, user_id: user.id }]).select()
        if (error || !data?.[0]) return avisar('No se pudo guardar: ' + (error?.message || 'intenta de nuevo'))
        setPagos(p => [...p, data[0]])
      } else {
        await supabase.from('pagos_tonelaje').update(payload).eq('id', payload.id)
        setPagos(p => p.map(x => x.id === payload.id ? payload : x))
      }
      setModal(null)
    } finally {
      setGuardando(false)
    }
  }

  const del = async p => {
    if (!await confirmar("¿Eliminar pago?")) return
    const previos = pagos
    setPagos(x => x.filter(y => y.id !== p.id))
    const { error } = await supabase.from('pagos_tonelaje').delete().eq('id', p.id)
    if (error) { setPagos(previos); return avisar('No se pudo eliminar: ' + error.message) }
    await borrarArchivo(p.comprobante_url)
  }

  const porViaje = viajes.map(v => {
    const misPagos = pagos.filter(p => p.viaje_id === v.id)
    const cobrado = misPagos.reduce((s,p) => s + p.monto_usd, 0)
    const pendiente = v.ingreso_bruto - cobrado
    const pct = Math.min((cobrado / v.ingreso_bruto) * 100, 100)
    const ruta = rutas.find(r => r.id === v.ruta_id)
    const cam = camiones.find(c => c.id === v.camion_id)
    const cond = conductores.find(c => c.id === v.conductor_id)
    return { viaje:v, pagos:misPagos, cobrado, pendiente, pct, ruta, cam, cond }
  }).filter(x => x.viaje.ingreso_bruto > 0)

  const meses = [...new Set(viajes.map(v => v.fecha?.slice(0,7)).filter(Boolean))].sort().reverse()

  // El total del encabezado sigue mes y búsqueda, pero no la pestaña:
  // "cobrado" dentro de Pendientes no querría decir nada.
  const porViajeMes = porViaje
    .filter(({ viaje }) => mes === "todo" || viaje.fecha?.startsWith(mes))
    .filter(({ viaje, ruta, cam, cond, pagos:misPagos }) => coincide(
      busca,
      viaje.fecha, ruta?.nombre, cond?.nombre, cam?.numero,
      misPagos.map(p => `${p.referencia || ""} ${p.metodo || ""}`).join(" "),
    ))

  const total = porViajeMes.reduce((s,x) => s + x.cobrado, 0)

  // Solo viajes con saldo. Al editar se incluye el ya seleccionado, si no
  // el select quedaría vacío y al guardar se perdería el viaje_id.
  const viajesDisponibles = porViaje
    .filter(x => x.pendiente > 0 || x.viaje.id === form.viaje_id)
    .sort((a,b) => (b.viaje.fecha || "").localeCompare(a.viaje.fecha || ""))

  const porViajeFiltrado = porViajeMes.filter(x => filtro === "pendientes" ? x.pendiente > 0 : x.pendiente <= 0)

  const exportarPDF = rango => {
    setModalPDF(false)
    const doc = new jsPDF()
    doc.setFontSize(16)
    doc.text("Reporte de Pagos - Volteos", 14, 15)
    doc.setFontSize(10)
    doc.text(`Período: ${rango.etiqueta}`, 14, 21)
    doc.text(`Generado: ${today()}`, 14, 26)

    let y = 37
    const encabezado = titulo => {
      doc.setFontSize(13)
      doc.text(titulo, 14, y)
      y += 7
      doc.setFontSize(9)
      doc.setFont(undefined, "bold")
      doc.text("Fecha", 14, y)
      doc.text("Ruta/Destino", 42, y)
      doc.text("Total", 118, y)
      doc.text("Cobrado", 145, y)
      doc.text("Pendiente", 172, y)
      doc.setFont(undefined, "normal")
      y += 5
    }

    const filas = lista => {
      if (lista.length === 0) {
        doc.text("Sin viajes", 14, y)
        y += 6
        return
      }
      lista.forEach(x => {
        if (y > 280) { doc.addPage(); y = 15 }
        doc.text(x.viaje.fecha || "", 14, y)
        doc.text((x.ruta?.nombre || "Sin ruta").slice(0, 35), 42, y)
        doc.text(`$${fmt(x.viaje.ingreso_bruto)}`, 118, y)
        doc.text(`$${fmt(x.cobrado)}`, 145, y)
        doc.text(`$${fmt(x.pendiente)}`, 172, y)
        y += 6
      })
    }

    const delPeriodo = porViaje.filter(x => rango.desde || rango.hasta ? enRango(x.viaje.fecha, rango) : true)
    const pendientes = delPeriodo.filter(x => x.pendiente > 0)
    const cobrados = delPeriodo.filter(x => x.pendiente <= 0)

    encabezado("Viajes pendientes")
    filas(pendientes)
    y += 8
    if (y > 260) { doc.addPage(); y = 15 }
    encabezado("Viajes cobrados")
    filas(cobrados)

    doc.save(`pagos_volteos_${today()}.pdf`)
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"13px" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:"9px" }}>
        <div>
          <h2 style={{ margin:"0 0 2px", fontSize:"19px", fontWeight:600, color:C.textPrimary }}>Pagos</h2>
          <p style={{ margin:0, color:C.textSecondary, fontSize:"12px" }}>Total cobrado: ${fmt(total)}</p>
        </div>
        <div style={{ display:"flex", gap:"7px" }}>
          <Button onClick={() => setModalPDF(true)} variant="ghost"><Ic n="send" s={14}/> Exportar PDF</Button>
          <Button onClick={openNew}><Ic n="plus" s={14}/> Registrar pago</Button>
        </div>
      </div>

      <div style={{ display:"flex", alignItems:"center", gap:"6px", flexWrap:"wrap" }}>
        {["todo", ...meses].map(m => (
          <button key={m} onClick={() => setMes(m)} style={{ padding:"3px 10px", borderRadius:"20px", border:"1px solid", fontSize:"11px", fontWeight:600, cursor:"pointer", background:mes===m?C.accent:"transparent", color:mes===m?"#fff":C.textMuted, borderColor:mes===m?C.accent:C.border }}>
            {m === "todo" ? "Todo" : nombreMes(m)}
          </button>
        ))}
      </div>

      <Buscador value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar ruta, chofer, unidad, referencia..."/>

      <div style={{ display:"flex", gap:"5px", flexWrap:"wrap" }}>
        <button onClick={() => setFiltro("pendientes")} style={{ padding:"3px 10px", borderRadius:"20px", border:"1px solid", fontSize:"11px", fontWeight:600, cursor:"pointer", background:filtro==="pendientes"?C.accent:"transparent", color:filtro==="pendientes"?"#fff":C.textMuted, borderColor:filtro==="pendientes"?C.accent:C.border }}>
          Pendientes
        </button>
        <button onClick={() => setFiltro("cobrados")} style={{ padding:"3px 10px", borderRadius:"20px", border:"1px solid", fontSize:"11px", fontWeight:600, cursor:"pointer", background:filtro==="cobrados"?C.accent:"transparent", color:filtro==="cobrados"?"#fff":C.textMuted, borderColor:filtro==="cobrados"?C.accent:C.border }}>
          Cobrados
        </button>
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
        {porViajeFiltrado.length === 0 && <div style={{ color:C.textMuted, textAlign:"center", padding:"36px", fontSize:"12px" }}>Sin viajes {filtro}</div>}
        {porViajeFiltrado.map(({ viaje, pagos:misPagos, cobrado, pendiente, pct, ruta, cam, cond }) => (
          <div key={viaje.id} style={{ background:C.bg1, border:`1px solid ${C.border}`, borderRadius:"9px", overflow:"hidden" }}>
            <div style={{ padding:"10px 13px", borderBottom:`1px solid ${C.border}`, background:C.bg2, display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:"6px" }}>
              <div>
                <span style={{ fontSize:"12px", fontWeight:700, color:C.accentLight }}>{viaje.fecha}</span>
                <span style={{ fontSize:"11px", color:C.textMuted, marginLeft:"8px" }}>{ruta?.nombre || "Sin ruta"}</span>
                <div style={{ fontSize:"10px", color:C.textMuted, marginTop:"1px" }}>Unidad {cam?.numero} · {cond?.nombre}</div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:"12px", color:C.green, fontWeight:700 }}>Cobrado: ${fmt(cobrado)}</div>
                {pendiente > 0 && <div style={{ fontSize:"11px", color:C.yellow }}>Pendiente: ${fmt(pendiente)}</div>}
              </div>
            </div>

            <div style={{ padding:"8px 13px", borderBottom:`1px solid ${C.border}` }}>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:"10px", color:C.textMuted, marginBottom:"4px" }}>
                <span>Total: ${fmt(viaje.ingreso_bruto)}</span>
                <span>{pct.toFixed(0)}% cobrado</span>
              </div>
              <div style={{ height:"4px", background:C.bg3, borderRadius:"2px" }}>
                <div style={{ height:"100%", width:`${pct}%`, background:pendiente <= 0 ? C.green : C.accent, borderRadius:"2px", transition:"width 0.3s" }}/>
              </div>
            </div>

            {misPagos.length === 0 && <div style={{ padding:"10px 13px", color:C.textMuted, fontSize:"12px" }}>Sin pagos registrados</div>}
            {misPagos.map(p => (
              <div key={p.id} style={{ padding:"9px 13px", borderBottom:`1px solid ${C.bg3}`, display:"flex", justifyContent:"space-between", alignItems:"center", gap:"8px" }}>
                <div>
                  <div style={{ display:"flex", alignItems:"center", gap:"6px", marginBottom:"1px" }}>
                    <span style={{ display:"inline-block", padding:"2px 8px", borderRadius:"20px", fontSize:"10px", fontWeight:700, background:C.blueBg, color:C.blue, border:`1px solid ${C.blueBorder}` }}>{p.metodo}</span>
                    <span style={{ fontSize:"10px", color:C.textMuted }}>{p.fecha}</span>
                    {p.referencia && <span style={{ fontSize:"10px", color:C.textMuted }}>Ref: {p.referencia}</span>}
                  </div>
                  {p.tasa > 0 && <div style={{ fontSize:"10px", color:C.textMuted }}>Bs {fmt(p.monto_bs)} · Tasa {p.tasa}</div>}
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:"7px" }}>
                  {p.comprobante_url && (
                    <a href={p.comprobante_url} target="_blank" rel="noreferrer" style={{ color:C.blue, display:"flex" }}>
                      <Ic n="file" s={14}/>
                    </a>
                  )}
                  <span style={{ fontSize:"14px", fontWeight:700, color:C.green }}>${fmt(p.monto_usd)}</span>
                  <Button onClick={() => openEdit(p)} variant="ghost" small><Ic n="edit" s={12}/></Button>
                  <Button onClick={() => del(p)} variant="danger" small><Ic n="trash" s={12}/></Button>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {modalPDF && <PeriodoPDF onClose={() => setModalPDF(false)} onExportar={exportarPDF}/>}

      {modal && (
        <Modal title={modal === "new" ? "Registrar pago" : "Editar pago"} onClose={() => setModal(null)}>
          <Field label="Viaje *">
            <Sel value={form.viaje_id || ""} onChange={e => s({ viaje_id:e.target.value })}>
              <option value="">Seleccionar</option>
              {viajesDisponibles.map(({ viaje: v, ruta: r, pendiente }) => (
                <option key={v.id} value={v.id}>
                  {v.fecha} · {r?.nombre || "Sin ruta"} · Pendiente ${fmt(Math.max(pendiente, 0))}
                </option>
              ))}
            </Sel>
            {viajesDisponibles.length === 0 && (
              <div style={{ marginTop:"6px", fontSize:"11px", color:C.yellow }}>
                No hay viajes con saldo pendiente: ya están todos cobrados.
              </div>
            )}
          </Field>
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
            <Sel value={form.metodo || "Transferencia"} onChange={e => s({ metodo:e.target.value })}>
              {METODOS.map(m => <option key={m}>{m}</option>)}
            </Sel>
          </Field>
          <Field label="Referencia">
            <Inp value={form.referencia || ""} onChange={e => s({ referencia:e.target.value })} placeholder="Número de referencia"/>
          </Field>
          <Field label="Comprobante">
            <Archivo accept="image/*,.pdf" onChange={e => s({ comprobanteFile:e.target.files[0] })}/>
            {form.comprobante_url && !form.comprobanteFile && (
              <a href={form.comprobante_url} target="_blank" rel="noreferrer" style={{ display:"inline-flex", alignItems:"center", gap:"5px", marginTop:"7px", fontSize:"11px", color:C.blue }}>
                <Ic n="file" s={13}/> Ver comprobante actual
              </a>
            )}
          </Field>
          <Button onClick={save_} disabled={guardando}>{modal === "new" ? "Guardar pago" : "Guardar cambios"}</Button>
        </Modal>
      )}
    </div>
  )
}

export default Pagos
