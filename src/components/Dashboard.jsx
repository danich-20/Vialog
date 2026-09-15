import { useState } from 'react'
import { C } from '../lib/colors'
import { fmt, fmtNum, calcEstado, nombreMes } from '../lib/helpers'
import Badge from './ui/Badge'
import Ic from './ui/Icons'

const KpiCard = ({ label, value, sub, color = C.accentLight, icon }) => (
  <div style={{ background:C.bg1, border:`1px solid ${C.border}`, borderRadius:"10px", padding:"14px 16px" }}>
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:"8px", marginBottom:"6px" }}>
      <span style={{ fontSize:"10px", fontWeight:600, color:C.textMuted, textTransform:"uppercase", letterSpacing:"0.08em" }}>{label}</span>
      <span style={{ color, opacity:0.7, flexShrink:0 }}>{icon}</span>
    </div>
    <div style={{ fontSize:"21px", fontWeight:600, color:C.textPrimary, letterSpacing:"-0.02em" }}>{value}</div>
    {sub && <div style={{ fontSize:"11px", color:C.textSecondary, marginTop:"3px" }}>{sub}</div>}
  </div>
)

const Dashboard = ({ viajes, gastos, conductores, camiones, mantenimientos, pagos = [] }) => {
  const [mes, setMes] = useState(() => {
    const hoy = new Date()
    return `${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,'0')}`
  })

  const meses = [...new Set([
    ...viajes.map(v => v.salida?.slice(0,7)),
    ...gastos.map(g => g.fecha?.slice(0,7)),
  ].filter(Boolean))].sort().reverse()

  const viajesMes = viajes.filter(v => v.salida?.startsWith(mes))
  const gastosMes = gastos.filter(g => g.fecha?.startsWith(mes))
  const pagosMes = pagos.filter(p => p.fecha?.startsWith(mes))

  const tf = viajesMes.reduce((s,v) => s + v.flete, 0)
  const tg = gastosMes.reduce((s,g) => s + g.monto_usd, 0)
  const util = tf - tg
  const pc = viajesMes.reduce((s,v) => {
    const cobrado = pagosMes.filter(p => p.viaje_id === v.id).reduce((s,p) => s + p.monto_usd, 0)
    return s + Math.max(v.flete - cobrado, 0)
  }, 0)
  const cob = pagosMes.reduce((s,p) => s + p.monto_usd, 0)
  const ec = viajesMes.filter(v => v.estado === "en curso").length
  const tl = viajesMes.reduce((s,v) => s + (v.litros_combustible || 0), 0)

  const alertas = mantenimientos.filter(m => {
    const c = camiones.find(x => x.id === m.camion_id)
    return calcEstado(m, c?.km) !== "ok"
  })

  const gxT = ["Gasoil","Viáticos","Peajes","Pago del chofer","Reparación","Multa","Grúa","Otros"].map(t => ({
    tipo: t,
    total: gastosMes.filter(g => g.subcategoria === t).reduce((s,g) => s + g.monto_usd, 0)
  })).filter(g => g.total > 0)

  const coms = conductores.map(c => {
    const mis = viajesMes.filter(v => v.conductor_id === c.id)
    const cobradoCond = mis.reduce((s,v) => {
      const p = pagosMes.filter(x => x.viaje_id === v.id).reduce((s,p) => s + p.monto_usd, 0)
      return s + p
    }, 0)
    return { nombre:c.nombre, com:cobradoCond * (c.comision / 100), fletes:cobradoCond, cnt:mis.length }
  })

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"16px" }}>
      <div>
        <h2 style={{ margin:"0 0 2px", fontSize:"19px", fontWeight:600, color:C.textPrimary }}>Panel de control</h2>
        <p style={{ margin:0, color:C.textSecondary, fontSize:"12px" }}>Resumen general</p>
      </div>

      <div style={{ display:"flex", alignItems:"center", gap:"6px", flexWrap:"wrap" }}>
        {meses.map(m => (
          <button key={m} onClick={() => setMes(m)} style={{ padding:"3px 10px", borderRadius:"20px", border:"1px solid", fontSize:"11px", fontWeight:600, cursor:"pointer", background:mes===m?C.accent:"transparent", color:mes===m?"#fff":C.textMuted, borderColor:mes===m?C.accent:C.border }}>
            {nombreMes(m)}
          </button>
        ))}
      </div>

      {alertas.length > 0 && (
        <div style={{ background:"#1a0e00", border:`1px solid ${C.yellowBorder}`, borderRadius:"8px", padding:"10px 13px", display:"flex", gap:"9px", alignItems:"flex-start" }}>
          <span style={{ color:C.yellow, marginTop:"1px" }}><Ic n="alert" s={14}/></span>
          <div>
            <div style={{ fontSize:"12px", fontWeight:600, color:C.yellow }}>{alertas.length} alerta{alertas.length > 1 ? "s" : ""} de mantenimiento</div>
            <div style={{ fontSize:"11px", color:"#d97706", marginTop:"1px" }}>
              {alertas.slice(0,3).map(a => { const c = camiones.find(x => x.id === a.camion_id); return `${c?.placa} – ${a.tipo}` }).join(" · ")}
            </div>
          </div>
        </div>
      )}

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))", gap:"9px" }}>
        <KpiCard label="Ingresos"   value={`$${fmt(tf)}`}   sub={`${viajesMes.length} viajes`} color={C.accentLight} icon={<Ic n="money" s={16}/>}/>
        <KpiCard label="Gastos"     value={`$${fmt(tg)}`}   color={C.red}    icon={<Ic n="truck" s={16}/>}/>
        <KpiCard label="Utilidad"   value={`$${fmt(util)}`} sub={`${tf > 0 ? ((util/tf)*100).toFixed(1) : 0}% margen`} color={util >= 0 ? C.green : C.red} icon={<Ic n="money" s={16}/>}/>
        <KpiCard label="Por cobrar" value={`$${fmt(pc)}`}   color={C.yellow} icon={<Ic n="clients" s={16}/>}/>
        <KpiCard label="Cobrado"    value={`$${fmt(cob)}`}  color={C.green}  icon={<Ic n="check" s={16}/>}/>
        <KpiCard label="En curso"   value={ec}              sub={`${fmtNum(tl)} lts`} color="#c084fc" icon={<Ic n="route" s={16}/>}/>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))", gap:"12px" }}>
        <div style={{ background:C.bg1, border:`1px solid ${C.border}`, borderRadius:"10px", padding:"14px" }}>
          <h4 style={{ margin:"0 0 10px", fontSize:"10px", fontWeight:600, color:C.textMuted, textTransform:"uppercase", letterSpacing:"0.08em" }}>Gastos por categoría</h4>
          {gxT.length === 0 ? <div style={{ color:C.textMuted, fontSize:"12px" }}>Sin gastos este mes</div> : gxT.map(g => (
            <div key={g.tipo} style={{ marginBottom:"8px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:"11px", marginBottom:"2px" }}>
                <span style={{ color:C.textSecondary }}>{g.tipo}</span>
                <span style={{ color:C.textPrimary, fontWeight:600 }}>${fmt(g.total)}</span>
              </div>
              <div style={{ height:"3px", background:C.bg3, borderRadius:"2px" }}>
                <div style={{ height:"100%", width:`${Math.min((g.total/tg)*100,100)}%`, background:C.accent, borderRadius:"2px" }}/>
              </div>
            </div>
          ))}
        </div>

        <div style={{ background:C.bg1, border:`1px solid ${C.border}`, borderRadius:"10px", padding:"14px" }}>
          <h4 style={{ margin:"0 0 10px", fontSize:"10px", fontWeight:600, color:C.textMuted, textTransform:"uppercase", letterSpacing:"0.08em" }}>Comisiones</h4>
          {coms.filter(c => c.fletes > 0).length === 0 ? <div style={{ color:C.textMuted, fontSize:"12px" }}>Sin datos este mes</div> :
            coms.filter(c => c.fletes > 0).map(c => (
              <div key={c.nombre} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"6px 0", borderBottom:`1px solid ${C.bg3}` }}>
                <div>
                  <div style={{ fontSize:"12px", color:C.textPrimary, fontWeight:600 }}>{c.nombre}</div>
                  <div style={{ fontSize:"10px", color:C.textMuted }}>{c.cnt} viajes</div>
                </div>
                <div style={{ fontSize:"14px", fontWeight:700, color:C.green }}>${fmt(c.com)}</div>
              </div>
            ))
          }
        </div>

        <div style={{ background:C.bg1, border:`1px solid ${C.border}`, borderRadius:"10px", padding:"14px" }}>
          <h4 style={{ margin:"0 0 10px", fontSize:"10px", fontWeight:600, color:C.textMuted, textTransform:"uppercase", letterSpacing:"0.08em" }}>Estado flota</h4>
          {camiones.map(cam => {
            const mis = mantenimientos.filter(m => m.camion_id === cam.id)
            const v = mis.filter(m => calcEstado(m, cam.km) === "vencido").length
            const p = mis.filter(m => calcEstado(m, cam.km) === "pendiente").length
            return (
              <div key={cam.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"6px 0", borderBottom:`1px solid ${C.bg3}` }}>
                <div>
                  <div style={{ fontSize:"12px", color:C.accentLight, fontWeight:700 }}>{cam.placa}</div>
                  <div style={{ fontSize:"10px", color:C.textMuted }}>{fmtNum(cam.km)} km</div>
                </div>
                <div style={{ display:"flex", gap:"4px" }}>
                  {v > 0 && <Badge label={`${v} vencido`} color="red"/>}
                  {p > 0 && <Badge label={`${p} próximo`} color="yellow"/>}
                  {v === 0 && p === 0 && <Badge label="OK" color="green"/>}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default Dashboard