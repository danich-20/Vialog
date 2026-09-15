import { C } from '../../lib/colors'

const iS = { width:"100%", background:C.bg0, border:`1px solid ${C.border}`, borderRadius:"7px", padding:"8px 10px", color:C.textPrimary, fontSize:"13px", outline:"none", boxSizing:"border-box" };

export const Inp = (props) => <input style={iS} {...props} />;
export const Sel = ({ children, ...props }) => <select style={{ ...iS, cursor:"pointer" }} {...props}>{children}</select>;

export const Field = ({ label, children }) => (
  <div style={{ marginBottom:"12px" }}>
    <label style={{ display:"block", fontSize:"10px", fontWeight:600, color:C.textMuted, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:"4px" }}>{label}</label>
    {children}
  </div>
);

export const Archivo = (props) => (
  <input type="file" style={{ ...iS, padding:"7px 10px", fontSize:"12px" }} {...props} />
);

export const Buscador = ({ value, onChange, placeholder = "Buscar..." }) => (
  <div style={{ position:"relative" }}>
    <span style={{ position:"absolute", left:"10px", top:"50%", transform:"translateY(-50%)", color:C.textMuted, display:"flex", pointerEvents:"none" }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
    </span>
    <input
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      style={{ ...iS, paddingLeft:"31px", paddingRight: value ? "31px" : "10px" }}
    />
    {value && (
      <button
        onClick={() => onChange({ target:{ value:"" } })}
        aria-label="Limpiar búsqueda"
        style={{ position:"absolute", right:"7px", top:"50%", transform:"translateY(-50%)", background:"none", border:"none", color:C.textMuted, cursor:"pointer", fontSize:"15px", lineHeight:1, padding:"2px 4px" }}
      >
        ✕
      </button>
    )}
  </div>
);
