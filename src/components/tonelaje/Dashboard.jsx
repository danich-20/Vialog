import { useState } from 'react'
import { C } from '../../lib/colors'
import { fmt, fmtNum, nombreMes } from '../../lib/helpers'
import Ic from '../ui/Icons'

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

const Dashboard = ({ viajes, gastos, conductores, camiones, rutas }) => {
  const [mes, setMes] = useState(() => {
    const hoy = new Date()
    return `${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,'0')}`
  })

  const meses = [...new Set([
    ...viajes.map(v => v.fecha?.slice(0,7)),
    ...gastos.map(g => g.fecha?.slice(0,7)),
  ].filter(Boolean))].sort().reverse()

  const viajesMes = viajes.filter(v => v.fecha?.startsWith(mes))
  const gastosMes = gastos.filter(g => g.fecha?.startsWith(mes))

  const ingresoBruto = viajesMes.reduce((s,v) => s + (v.ingreso_bruto || 0), 0)
  const totalGastos = gastosMes.reduce((s,g) => s + (g.monto_usd || 0), 0)
  const totalToneladas = viajesMes.reduce((s,v) => s + (v.toneladas || 0), 0)
  const totalTickers = viajesMes.filter(v => v.tickers).length
  const cobranzaChoferes = viajesMes.reduce((s,v) => {
    const cond = conductores.find(c => c.id === v.conductor_id)
    return s + (v.ingreso_bruto || 0) * ((cond?.porcentaje || 0) / 100)
  }, 0)
  const utilidad = ingresoBruto - totalGastos - cobranzaChoferes
  const pagado = viajesMes.filter(v => v.estado === "PAGADO").reduce((s,v) => s + (v.ingreso_bruto || 0), 0)
  const pendiente = viajesMes.filter(v => v.estado === "PENDIENTE").reduce((s,v) => s + (v.ingreso_bruto || 0), 0)

  // gastos por categoria
  const gastosPorCat = {}
  gastosMes.forEach(g => {
    gastosPorCat[g.categoria] = (gastosPorCat[g.categoria] || 0) + (g.monto_usd || 0)
  })
  const gxC = Object.entries(gastosPorCat).map(([cat, total]) => ({ cat, total })).sort((a,b) => b.total - a.total)

  const porChofer = conductores.map(c => {
    const mis = viajesMes.filter(v => v.conductor_id === c.id)
    const ing = mis.reduce((s,v) => s + (v.ingreso_bruto || 0), 0)
    return { nombre:c.nombre, pct:c.porcentaje || 0, monto: ing * ((c.porcentaje || 0) / 100), viajes: mis.length }
  }).filter(c => c.viajes > 0).sort((a,b) => b.monto - a.monto)

  // ingreso por camion
  const porCamion = camiones.map(c => {
    const mis = viajesMes.filter(v => v.camion_id === c.id)
    const ing = mis.reduce((s,v) => s + (v.ingreso_bruto || 0), 0)
    const gas = gastosMes.filter(g => g.camion_id === c.id).reduce((s,g) => s + (g.monto_usd || 0), 0)
    return { numero:c.numero, ing, gas, viajes:mis.length }
  })

  // ingreso por ruta
  const porRuta = rutas.map(r => {
    const mis = viajesMes.filter(v => v.ruta_id === r.id)
    return { nombre:r.nombre, ing: mis.reduce((s,v) => s + (v.ingreso_bruto || 0), 0), viajes:mis.length }
  }).filter(r => r.viajes > 0).sort((a,b) => b.ing - a.ing)

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"16px" }}>
      <div>
        <h2 style={{ margin:"0 0 2px", fontSize:"19px", fontWeight:600, color:C.textPrimary }}>Panel de control</h2>
        <p style={{ margin:0, color:C.textSecondary, fontSize:"12px" }}>Operación de acarreo</p>
      </div>

      <div style={{ display:"flex", alignItems:"center", gap:"6px", flexWrap:"wrap" }}>
        {meses.map(m => (
          <button key={m} onClick={() => setMes(m)} style={{ padding:"3px 10px", borderRadius:"20px", border:"1px solid", fontSize:"11px", fontWeight:600, cursor:"pointer", background:mes===m?C.accent:"transparent", color:mes===m?"#fff":C.textMuted, borderColor:mes===m?C.accent:C.border }}>
            {nombreMes(m)}
          </button>
        ))}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))", gap:"9px" }}>
        <KpiCard label="Ingreso bruto" value={`$${fmt(ingresoBruto)}`} sub={`${viajesMes.length} Viajes`} color={C.accentLight} icon={<Ic n="money" s={16}/>}/>
        <KpiCard label="Gastos" value={`$${fmt(totalGastos)}`} color={C.red} icon={<Ic n="wrench" s={16}/>}/>
        <KpiCard label="Toneladas" value={fmtNum(totalToneladas)} sub={`${totalTickers} Tickers`} color="#c084fc" icon={<Ic n="truck" s={16}/>}/>
        <KpiCard label="Cobranza choferes" value={`$${fmt(cobranzaChoferes)}`} color={C.yellow} icon={<Ic n="users" s={16}/>}/>
        <KpiCard label="Utilidad" value={`$${fmt(utilidad)}`} sub={`${ingresoBruto > 0 ? ((utilidad/ingresoBruto)*100).toFixed(1) : 0}% Margen`} color={utilidad >= 0 ? C.green : C.red} icon={<Ic n="money" s={16}/>}/>
        <KpiCard label="Pagado / Pendiente" value={`$${fmt(pagado)}`} sub={`Pendiente: $${fmt(pendiente)}`} color={C.green} icon={<Ic n="check" s={16}/>}/>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))", gap:"12px" }}>
        <div style={{ background:C.bg1, border:`1px solid ${C.border}`, borderRadius:"10px", padding:"14px" }}>
          <h4 style={{ margin:"0 0 10px", fontSize:"10px", fontWeight:600, color:C.textMuted, textTransform:"uppercase", letterSpacing:"0.08em" }}>Gastos por categoría</h4>
          {gxC.length === 0 ? <div style={{ color:C.textMuted, fontSize:"12px" }}>Sin gastos este mes</div> : gxC.map(g => (
            <div key={g.cat} style={{ marginBottom:"8px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:"11px", marginBottom:"2px" }}>
                <span style={{ color:C.textSecondary }}>{g.cat}</span>
                <span style={{ color:C.textPrimary, fontWeight:600 }}>${fmt(g.total)}</span>
              </div>
              <div style={{ height:"3px", background:C.bg3, borderRadius:"2px" }}>
                <div style={{ height:"100%", width:`${Math.min((g.total/totalGastos)*100,100)}%`, background:C.accent, borderRadius:"2px" }}/>
              </div>
            </div>
          ))}
        </div>

        <div style={{ background:C.bg1, border:`1px solid ${C.border}`, borderRadius:"10px", padding:"14px" }}>
          <h4 style={{ margin:"0 0 10px", fontSize:"10px", fontWeight:600, color:C.textMuted, textTransform:"uppercase", letterSpacing:"0.08em" }}>Cobranza por chofer</h4>
          {porChofer.length === 0 ? <div style={{ color:C.textMuted, fontSize:"12px" }}>Sin datos este mes</div> :
            porChofer.map(c => (
              <div key={c.nombre} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:"8px", padding:"6px 0", borderBottom:`1px solid ${C.bg3}` }}>
                <div style={{ minWidth:0 }}>
                  <div style={{ fontSize:"12px", color:C.textPrimary, fontWeight:600 }}>{c.nombre}</div>
                  <div style={{ fontSize:"10px", color:C.textMuted }}>{c.viajes} viajes · {c.pct}%</div>
                </div>
                <div style={{ fontSize:"14px", fontWeight:700, color:C.green, flexShrink:0 }}>${fmt(c.monto)}</div>
              </div>
            ))
          }
        </div>

        <div style={{ background:C.bg1, border:`1px solid ${C.border}`, borderRadius:"10px", padding:"14px" }}>
          <h4 style={{ margin:"0 0 10px", fontSize:"10px", fontWeight:600, color:C.textMuted, textTransform:"uppercase", letterSpacing:"0.08em" }}>Ingreso por unidad</h4>
          {porCamion.filter(c => c.viajes > 0).length === 0 ? <div style={{ color:C.textMuted, fontSize:"12px" }}>Sin datos este mes</div> :
            porCamion.filter(c => c.viajes > 0).map(c => (
              <div key={c.numero} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"6px 0", borderBottom:`1px solid ${C.bg3}` }}>
                <div>
                  <div style={{ fontSize:"12px", color:C.accentLight, fontWeight:700 }}>Unidad {c.numero}</div>
                  <div style={{ fontSize:"10px", color:C.textMuted }}>{c.viajes} viajes · gastos ${fmt(c.gas)}</div>
                </div>
                <div style={{ fontSize:"14px", fontWeight:700, color:C.textPrimary }}>${fmt(c.ing)}</div>
              </div>
            ))
          }
        </div>

        <div style={{ background:C.bg1, border:`1px solid ${C.border}`, borderRadius:"10px", padding:"14px" }}>
          <h4 style={{ margin:"0 0 10px", fontSize:"10px", fontWeight:600, color:C.textMuted, textTransform:"uppercase", letterSpacing:"0.08em" }}>Ingreso por ruta</h4>
          {porRuta.length === 0 ? <div style={{ color:C.textMuted, fontSize:"12px" }}>Sin datos este mes</div> :
            porRuta.map(r => (
              <div key={r.nombre} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"6px 0", borderBottom:`1px solid ${C.bg3}` }}>
                <div>
                  <div style={{ fontSize:"12px", color:C.textPrimary, fontWeight:600 }}>{r.nombre}</div>
                  <div style={{ fontSize:"10px", color:C.textMuted }}>{r.viajes} viajes</div>
                </div>
                <div style={{ fontSize:"14px", fontWeight:700, color:C.green }}>${fmt(r.ing)}</div>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  )
}

export default Dashboard