import { useState } from 'react'
import { C } from '../../lib/colors'
import { PERIODOS, calcularRango } from '../../lib/helpers'
import Button from './Button'
import Modal from './Modal'
import { Inp, Sel, Field } from './Input'

const PeriodoPDF = ({ onClose, onExportar, clientes = null }) => {
  const [tipo, setTipo] = useState("mes")
  const [desde, setDesde] = useState("")
  const [hasta, setHasta] = useState("")
  const [clienteId, setClienteId] = useState("todos")
  const [generando, setGenerando] = useState(false)

  const generar = async () => {
    if (generando) return
    setGenerando(true)
    try {
      await onExportar(calcularRango(tipo, desde, hasta), clienteId)
    } finally {
      setGenerando(false)
    }
  }

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

      {clientes && (
        <Field label="Cliente">
          <Sel value={clienteId} onChange={e => setClienteId(e.target.value)}>
            <option value="todos">Todos (una página por cliente)</option>
            {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </Sel>
        </Field>
      )}

      <Button onClick={generar} disabled={generando}>
        {generando ? "Generando..." : "Generar PDF"}
      </Button>
    </Modal>
  )
}

export default PeriodoPDF
