import { useState } from 'react'
import { C } from '../../lib/colors'
import { PERIODOS, calcularRango } from '../../lib/helpers'
import Button from './Button'
import Modal from './Modal'
import { Inp, Field } from './Input'

const PeriodoPDF = ({ onClose, onExportar }) => {
  const [tipo, setTipo] = useState("mes")
  const [desde, setDesde] = useState("")
  const [hasta, setHasta] = useState("")

  return (
    <Modal title="Exportar PDF" onClose={onClose}>
      <Field label="Período">
        <div style={{ display:"flex", flexWrap:"wrap", gap:"6px" }}>
          {PERIODOS.map(p => (
            <button
              key={p.id}
              onClick={() => setTipo(p.id)}
              style={{ padding:"7px 12px", borderRadius:"7px", border:"1px solid", fontSize:"12px", fontWeight:600, cursor:"pointer", background:tipo===p.id?C.accent:"transparent", color:tipo===p.id?"#fff":C.textMuted, borderColor:tipo===p.id?C.accent:C.border }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </Field>

      {tipo === "rango" && (
        <div className="form-grid">
          <Field label="Desde"><Inp type="date" value={desde} onChange={e => setDesde(e.target.value)}/></Field>
          <Field label="Hasta"><Inp type="date" value={hasta} onChange={e => setHasta(e.target.value)}/></Field>
        </div>
      )}

      <Button onClick={() => onExportar(calcularRango(tipo, desde, hasta))}>Generar PDF</Button>
    </Modal>
  )
}

export default PeriodoPDF
