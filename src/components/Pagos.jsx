import { useState } from 'react'
import jsPDF from 'jspdf'
import { supabase } from '../supabase'
import { C } from '../lib/colors'
import { avisar, confirmar } from '../lib/dialogo'
import { uid, fmt, today, nombreMes, coincide, enRango, slug } from '../lib/helpers'
import { METODOS } from '../lib/constants'
import { subirArchivo, borrarArchivo } from '../lib/upload'
import { cargarLogo, membrete, encabezadoDoc, tabla, recuadroTotal, pie } from '../lib/pdf'
import Badge from './ui/Badge'
import Button from './ui/Button'
import Modal from './ui/Modal'
import Ic from './ui/Icons'
import PeriodoPDF from './ui/PeriodoPDF'
import { Inp, Sel, Field, Archivo, Buscador } from './ui/Input'

const Pagos = ({ viajes, clientes, conductores, camiones, pagos, setPagos }) => {
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({})
  const [guardando, setGuardando] = useState(false)
  const [busca, setBusca] = useState("")
  const [modalPDF, setModalPDF] = useState(false)
  // Arranca en "todo": filtrar por mes escondería saldos viejos por cobrar
  const [mes, setMes] = useState("todo")
  const s = f => setForm(p => ({ ...p, ...f }))

  const openNew = () => {
    setForm({ id:uid(), fecha:today(), monto_usd:0, monto_bs:0, tasa:0 })
    setModal("new")
  }
  const openEdit = p => { setForm({ ...p }); setModal("edit") }

  const save_ = async () => {
    if (guardando) return
    setGuardando(true)
    try {
      if (!form.viaje_id || !form.monto_usd) return avisar("Completa los campos obligatorios")
      const viaje = viajes.find(v => v.id === form.viaje_id)
      const cliente = clientes.find(c => c.id === viaje?.cliente_id)
      const conductor = conductores.find(c => c.id === viaje?.conductor_id)
      const camion = camiones.find(c => c.id === viaje?.camion_id)
      const { comprobanteFile, ...rest } = form
      let comprobante_url = rest.comprobante_url || null
      if (comprobanteFile) {
        comprobante_url = await subirArchivo(comprobanteFile, 'pagos')
        if (rest.comprobante_url) await borrarArchivo(rest.comprobante_url)
      }
      const pago = {
        ...rest,
        comprobante_url,
        cliente_id: cliente?.id || '',
        conductor: conductor?.nombre || '',
        camion: camion?.placa || '',
      }
      if (modal === "new") {
        const { data: { user } } = await supabase.auth.getUser()
        const { data, error } = await supabase.from('pagos').insert([{ ...pago, user_id: user.id }]).select()
        if (error || !data?.[0]) return avisar('No se pudo guardar: ' + (error?.message || 'intenta de nuevo'))
        setPagos(p => [...p, data[0]])
      } else {
        await supabase.from('pagos').update(pago).eq('id', pago.id)
        setPagos(p => p.map(x => x.id === pago.id ? pago : x))
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
    const { error } = await supabase.from('pagos').delete().eq('id', p.id)
    if (error) { setPagos(previos); return avisar('No se pudo eliminar: ' + error.message) }
    await borrarArchivo(p.comprobante_url)
  }

  // pagos agrupados por viaje
  const porViaje = viajes.map(v => {
    const misPagos = pagos.filter(p => p.viaje_id === v.id)
    const totalPagado = misPagos.reduce((s,p) => s + p.monto_usd, 0)
    const pendiente = v.flete - totalPagado
    return { viaje:v, pagos:misPagos, totalPagado, pendiente }
  }).filter(x => x.pagos.length > 0 || x.viaje.flete > 0)

  const meses = [...new Set(viajes.map(v => v.salida?.slice(0,7)).filter(Boolean))].sort().reverse()

  const porViajeFiltrado = porViaje
    .filter(({ viaje }) => mes === "todo" || viaje.salida?.startsWith(mes))
    .filter(({ viaje, pagos:misPagos }) => coincide(
      busca,
      viaje.numero, viaje.origen, viaje.destino,
      clientes.find(c => c.id === viaje.cliente_id)?.nombre,
      misPagos.map(p => `${p.referencia || ""} ${p.metodo || ""}`).join(" "),
    ))

  const total = porViajeFiltrado.reduce((s,x) => s + x.totalPagado, 0)

  // Solo viajes con saldo. Al editar se incluye el ya seleccionado, si no
  // el select quedaría vacío y al guardar se perdería el viaje_id.
  const viajesDisponibles = porViaje
    .filter(x => x.pendiente > 0 || x.viaje.id === form.viaje_id)
    .sort((a,b) => (b.viaje.salida || "").localeCompare(a.viaje.salida || ""))

  const exportarPDF = async (rango, clienteId) => {
    setModalPDF(false)
    const logo = await cargarLogo()
    const doc = new jsPDF({ unit: 'mm', format: 'letter' })

    const delPeriodo = porViaje.filter(x => (rango.desde || rango.hasta) ? enRango(x.viaje.salida, rango) : true)

    // Un estado de cuenta por cliente. "Sin cliente asignado" agrupa los sueltos.
    const grupos = clienteId === "todos"
      ? [...clientes, { id:"", nombre:"Sin cliente asignado" }]
          .map(c => ({ cliente:c, items: delPeriodo.filter(x => (x.viaje.cliente_id || "") === c.id) }))
          .filter(g => g.items.length > 0)
      : [{ cliente: clientes.find(c => c.id === clienteId) || { nombre:"Cliente" },
           items: delPeriodo.filter(x => x.viaje.cliente_id === clienteId) }]

    if (grupos.length === 0) {
      avisar("No hay viajes en ese período para generar el estado de cuenta.")
      return
    }

    const cols = [
      { titulo:"FECHA",     ancho:22 },
      { titulo:"N°",        ancho:18 },
      { titulo:"RUTA",      ancho:76 },
      { titulo:"MONTO",     ancho:24, align:"right" },
      { titulo:"ABONADO",   ancho:24, align:"right" },
      { titulo:"SALDO",     ancho:24, align:"right", negrita:true },
    ]

    grupos.forEach((g, idx) => {
      if (idx > 0) doc.addPage()
      let y = membrete(doc, logo)
      const saldo = g.items.reduce((s,x) => s + Math.max(x.pendiente, 0), 0)

      y = encabezadoDoc(doc, y, "Estado de cuenta", [
        ["Cliente:", g.cliente.nombre],
        ["Período:", rango.etiqueta],
        g.cliente.rif && ["RIF:", g.cliente.rif],
        g.cliente.tel && ["Teléfono:", g.cliente.tel],
      ])

      y = tabla(doc, y, cols,
        g.items
          .sort((a,b) => (a.viaje.salida || "").localeCompare(b.viaje.salida || ""))
          .map(x => [
            x.viaje.salida || "",
            x.viaje.numero || "",
            `${x.viaje.origen || ""} - ${x.viaje.destino || ""}`,
            fmt(x.viaje.flete),
            fmt(x.totalPagado),
            fmt(Math.max(x.pendiente, 0)),
          ]),
        {
          vacio: "Sin viajes en este período",
          totales: ["", "", "TOTALES",
            fmt(g.items.reduce((s,x) => s + (x.viaje.flete || 0), 0)),
            fmt(g.items.reduce((s,x) => s + x.totalPagado, 0)),
            fmt(saldo)],
        })

      recuadroTotal(doc, y, "Total adeudado", saldo)
    })

    pie(doc, today())

    // Nombre que dice de quién y de cuándo es, para no acabar con "(1)", "(2)"...
    const periodo = slug(rango.corto)
    const nombre = grupos.length === 1
      ? `estado-de-cuenta_${slug(grupos[0].cliente.nombre)}_${periodo}.pdf`
      : `estados-de-cuenta_${grupos.length}-clientes_${periodo}.pdf`
    doc.save(nombre)
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

      <Buscador value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar viaje, ruta, cliente, referencia..."/>

      <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
        {porViajeFiltrado.length === 0 && <div style={{ color:C.textMuted, textAlign:"center", padding:"36px", fontSize:"12px" }}>Sin resultados</div>}
        {porViajeFiltrado.map(({ viaje, pagos:misPagos, totalPagado, pendiente }) => {
          const cli = clientes.find(c => c.id === viaje.cliente_id)
          return (
            <div key={viaje.id} style={{ background:C.bg1, border:`1px solid ${C.border}`, borderRadius:"9px", overflow:"hidden" }}>
              <div style={{ padding:"10px 13px", borderBottom:`1px solid ${C.border}`, background:C.bg2, display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:"6px" }}>
                <div style={{ minWidth:0, flex:"1 1 160px" }}>
                  <span style={{ fontSize:"12px", fontWeight:700, color:C.accentLight }}>{viaje.numero}</span>
                  <span style={{ fontSize:"11px", color:C.textMuted, marginLeft:"8px" }}>{viaje.origen} → {viaje.destino}</span>
                  {cli && <span style={{ fontSize:"11px", color:C.textMuted }}> · {cli.nombre}</span>}
                </div>
                <div style={{ display:"flex", gap:"10px", alignItems:"center", flexShrink:0, marginLeft:"auto" }}>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontSize:"12px", color:C.green, fontWeight:700 }}>Cobrado: ${fmt(totalPagado)}</div>
                    {pendiente > 0 && <div style={{ fontSize:"11px", color:C.yellow }}>Pendiente: ${fmt(pendiente)}</div>}
                  </div>
                  <div style={{ height:"36px", width:"36px", flexShrink:0, borderRadius:"50%", background:C.bg3, display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <svg viewBox="0 0 36 36" width="36" height="36">
                      <circle cx="18" cy="18" r="14" fill="none" stroke={C.border} strokeWidth="3"/>
                      <circle cx="18" cy="18" r="14" fill="none" stroke={pendiente <= 0 ? C.green : C.accent} strokeWidth="3"
                        strokeDasharray={`${Math.min((totalPagado/viaje.flete)*87.96, 87.96)} 87.96`}
                        strokeLinecap="round" transform="rotate(-90 18 18)"/>
                    </svg>
                  </div>
                </div>
              </div>
              {misPagos.map(p => (
                <div key={p.id} style={{ padding:"9px 13px", borderBottom:`1px solid ${C.bg3}`, display:"flex", justifyContent:"space-between", alignItems:"center", gap:"8px" }}>
                  <div>
                    <div style={{ display:"flex", alignItems:"center", gap:"6px", marginBottom:"1px" }}>
                      <Badge label={p.metodo || "—"} color="blue"/>
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
          )
        })}
      </div>

      {modalPDF && <PeriodoPDF onClose={() => setModalPDF(false)} onExportar={exportarPDF} clientes={clientes}/>}

      {modal && (
        <Modal title={modal === "new" ? "Registrar pago" : "Editar pago"} onClose={() => setModal(null)}>
          <Field label="Viaje *">
            <Sel value={form.viaje_id || ""} onChange={e => s({ viaje_id:e.target.value })}>
              <option value="">Seleccionar</option>
              {viajesDisponibles.map(({ viaje: v, pendiente }) => (
                <option key={v.id} value={v.id}>
                  {v.numero} – {v.origen}→{v.destino} · Pendiente ${fmt(Math.max(pendiente, 0))}
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
          <Field label="Método *">
            <Sel value={form.metodo || ""} onChange={e => s({ metodo:e.target.value })}>
              <option value="">Seleccionar</option>
              {METODOS.map(m => <option key={m}>{m}</option>)}
            </Sel>
          </Field>
          <Field label="Referencia">
            <Inp value={form.referencia || ""} onChange={e => s({ referencia:e.target.value })}/>
          </Field>
          <Field label="Comprobante">
            <Archivo accept="image/*,.pdf" onChange={e => s({ comprobanteFile:e.target.files[0] })}/>
            {form.comprobante_url && !form.comprobanteFile && (
              <a href={form.comprobante_url} target="_blank" rel="noreferrer" style={{ display:"inline-flex", alignItems:"center", gap:"5px", marginTop:"7px", fontSize:"11px", color:C.blue }}>
                <Ic n="file" s={13}/> Ver comprobante actual
              </a>
            )}
          </Field>
          <Button onClick={save_} disabled={guardando}>{modal === "new" ? "Registrar pago" : "Guardar cambios"}</Button>
        </Modal>
      )}
    </div>
  )
}

export default Pagos