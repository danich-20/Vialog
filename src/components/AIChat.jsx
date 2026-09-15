import { useState } from 'react'
import { C } from '../lib/colors'
import Ic from './ui/Icons'

const AIChat = ({ viajes, gastos, conductores, camiones, clientes }) => {
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState([{ role:"bot", text:"Hola. Soy el asistente de Vialog. Pregúntame sobre viajes, gastos, conductores o flota." }])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [chips, setChips] = useState(true)

  const ctx = () => {
    const tf = viajes.reduce((s,v) => s + v.flete, 0)
    const tg = gastos.reduce((s,g) => s + g.monto_usd, 0)
    const pc = viajes.filter(v => !v.pagado).reduce((s,v) => s + v.flete, 0)
    const vInfo = viajes.map(v => {
      const cam  = camiones.find(c => c.id === v.camion_id)
      const cond = conductores.find(c => c.id === v.conductor_id)
      const cli  = clientes.find(c => c.id === v.cliente_id)
      const mg   = gastos.filter(g => g.viaje_id === v.id).reduce((s,g) => s + g.monto_usd, 0)
      return `${v.numero}: ${v.origen}→${v.destino}, camión ${cam?.placa}, conductor ${cond?.nombre}, cliente ${cli?.nombre}, flete $${v.flete}, gastos $${mg.toFixed(0)}, utilidad $${(v.flete - mg).toFixed(0)}, estado ${v.estado}, pagado ${v.pagado ? 'sí' : 'no'}`
    }).join('\n')
    return `Eres el asistente de Vialog, sistema de gestión de flota. Responde en español, conciso y directo.\n\nRESUMEN: Ingresos $${tf}, Gastos $${tg.toFixed(0)}, Utilidad $${(tf - tg).toFixed(0)}, Por cobrar $${pc}\nCamiones: ${camiones.map(c => c.placa).join(', ')}\nConductores: ${conductores.map(c => c.nombre).join(', ')}\n\nVIAJES:\n${vInfo}`
  }

  const send = async (t) => {
    const txt = t || input.trim()
    if (!txt || loading) return
    setInput("")
    setChips(false)
    setMsgs(p => [...p, { role:"user", text:txt }])
    setLoading(true)
    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ system: ctx(), messages: [{ role:"user", content: txt }] })
      })
      const d = await r.json()
      setMsgs(p => [...p, { role:"bot", text: d.content?.map(b => b.text || "").join("") || "Error al procesar." }])
    } catch {
      setMsgs(p => [...p, { role:"bot", text:"Error de conexión." }])
    }
    setLoading(false)
  }

  const chipList = ["¿Cuánto me deben en total?", "¿Cuál fue el viaje más rentable?", "¿Qué camión tuvo más gastos?"]

  return (
    <>
      {open && (
        <div style={{ position:"fixed", bottom:"calc(122px + env(safe-area-inset-bottom))", right:"14px", width:"min(295px, calc(100vw - 28px))", background:C.bg1, border:`1px solid ${C.border}`, borderRadius:"12px", display:"flex", flexDirection:"column", zIndex:500, boxShadow:"0 8px 32px rgba(0,0,0,0.5)" }}>
          <div style={{ background:C.bg2, borderBottom:`1px solid ${C.border}`, padding:"10px 13px", display:"flex", alignItems:"center", gap:"7px" }}>
            <div style={{ width:"6px", height:"6px", borderRadius:"50%", background:C.accent }}/>
            <span style={{ fontSize:"13px", fontWeight:600, color:C.textPrimary }}>Asistente Vialog</span>
            <span style={{ fontSize:"10px", color:C.textMuted, marginLeft:"auto" }}>Haiku</span>
          </div>
          <div style={{ padding:"10px", display:"flex", flexDirection:"column", gap:"7px", maxHeight:"min(240px, 38vh)", overflowY:"auto" }}>
            {msgs.map((m,i) => (
              <div key={i} style={{ alignSelf:m.role==="user"?"flex-end":"flex-start", background:m.role==="user"?C.blueBg:C.bg2, border:`1px solid ${m.role==="user"?C.blueBorder:C.border}`, color:m.role==="user"?C.blue:C.textSecondary, fontSize:"12px", padding:"7px 10px", borderRadius:m.role==="user"?"10px 10px 2px 10px":"10px 10px 10px 2px", maxWidth:"88%", lineHeight:"1.5", whiteSpace:"pre-wrap" }}>
                {m.text}
              </div>
            ))}
            {loading && (
              <div style={{ alignSelf:"flex-start", background:C.bg2, border:`1px solid ${C.border}`, color:C.textMuted, fontSize:"12px", padding:"7px 10px", borderRadius:"10px 10px 10px 2px" }}>
                Consultando...
              </div>
            )}
          </div>
          {chips && (
            <div style={{ padding:"0 10px 8px", display:"flex", flexDirection:"column", gap:"4px" }}>
              {chipList.map(c => (
                <button key={c} onClick={() => send(c)} style={{ background:C.bg2, border:`1px solid ${C.border}`, borderRadius:"6px", padding:"6px 10px", fontSize:"11px", color:C.textMuted, cursor:"pointer", textAlign:"left" }}>
                  {c}
                </button>
              ))}
            </div>
          )}
          <div style={{ borderTop:`1px solid ${C.border}`, padding:"7px 9px", display:"flex", gap:"6px", background:C.bg2 }}>
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} placeholder="Pregunta algo..." style={{ flex:1, background:C.bg0, border:`1px solid ${C.border}`, borderRadius:"6px", padding:"6px 9px", color:C.textPrimary, fontSize:"12px", outline:"none" }}/>
            <button onClick={() => send()} style={{ background:C.accent, border:"none", borderRadius:"6px", padding:"6px 10px", color:"#fff", cursor:"pointer", display:"flex", alignItems:"center" }}>
              <Ic n="send" s={13}/>
            </button>
          </div>
        </div>
      )}
      <button onClick={() => setOpen(p => !p)} style={{ position:"fixed", bottom:"calc(68px + env(safe-area-inset-bottom))", right:"14px", width:"44px", height:"44px", borderRadius:"50%", background:C.accent, border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", zIndex:501, boxShadow:`0 4px 20px ${C.accent}66` }}>
        {open ? <Ic n="close" s={19}/> : <Ic n="ai" s={19}/>}
      </button>
    </>
  )
}

export default AIChat