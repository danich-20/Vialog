import { createRoot } from 'react-dom/client'
import { C } from './colors'

// confirm() y alert() del navegador son poco fiables: Chrome los desactiva si el
// usuario marca "impedir que esta página cree más diálogos", y varios navegadores
// móviles los suprimen. Este diálogo vive dentro de la app y siempre responde.

function mostrar(mensaje, esConfirmacion) {
  return new Promise(resolve => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const root = createRoot(host)

    const cerrar = valor => {
      document.removeEventListener('keydown', alPulsar)
      // Desmontar fuera del ciclo de render de React
      setTimeout(() => { root.unmount(); host.remove() }, 0)
      resolve(valor)
    }

    const alPulsar = e => {
      if (e.key === 'Escape') cerrar(false)
      if (e.key === 'Enter') cerrar(true)
    }
    document.addEventListener('keydown', alPulsar)

    root.render(
      <div
        onClick={e => { if (e.target === e.currentTarget) cerrar(false) }}
        style={{ position:"fixed", inset:0, zIndex:2000, background:"rgba(0,0,0,0.72)", display:"flex", alignItems:"center", justifyContent:"center", padding:"20px" }}
      >
        <div style={{ background:C.bg1, border:`1px solid ${C.border}`, borderRadius:"12px", width:"100%", maxWidth:"330px", padding:"20px" }}>
          <div style={{ fontSize:"14px", color:C.textPrimary, lineHeight:1.5, marginBottom:"18px" }}>{mensaje}</div>
          <div style={{ display:"flex", gap:"8px", justifyContent:"flex-end" }}>
            {esConfirmacion && (
              <button
                onClick={() => cerrar(false)}
                style={{ background:C.bg3, color:C.textSecondary, border:`1px solid ${C.border}`, borderRadius:"7px", padding:"9px 15px", fontSize:"13px", fontWeight:600, cursor:"pointer" }}
              >
                Cancelar
              </button>
            )}
            <button
              autoFocus
              onClick={() => cerrar(true)}
              style={{ background:esConfirmacion ? C.red : C.accent, color:"#fff", border:"none", borderRadius:"7px", padding:"9px 15px", fontSize:"13px", fontWeight:600, cursor:"pointer" }}
            >
              {esConfirmacion ? "Eliminar" : "Entendido"}
            </button>
          </div>
        </div>
      </div>
    )
  })
}

export const confirmar = mensaje => mostrar(mensaje, true)
export const avisar = mensaje => mostrar(mensaje, false)
