import { useState } from 'react'
import { supabase } from '../supabase'
import { C } from '../lib/colors'

const Login = ({ onLogin }) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Supabase distingue varios motivos de fallo. Mostrarlos todos como
  // "contraseña incorrecta" deja al usuario sin saber qué arreglar.
  const motivo = error => {
    const cod = error.code || ''
    if (cod === 'invalid_credentials') return 'Correo o contraseña incorrectos'
    if (cod === 'email_not_confirmed') return 'Falta confirmar el correo. Revisa tu bandeja de entrada.'
    if (cod === 'over_request_rate_limit' || error.status === 429) return 'Demasiados intentos. Espera un minuto y vuelve a probar.'
    if (cod === 'user_not_found') return 'No existe una cuenta con ese correo'
    return error.message || 'No se pudo iniciar sesión'
  }

  const submit = async () => {
    if (!email || !password) return setError('Completa los campos')
    setLoading(true)
    setError('')
    try {
      // El teclado del teléfono suele agregar un espacio o poner mayúscula inicial
      const correo = email.trim().toLowerCase()
      const { data, error } = await supabase.auth.signInWithPassword({ email: correo, password })
      if (error) {
        setError(motivo(error))
        setLoading(false)
      } else {
        onLogin(data.user)
      }
    } catch {
      setError('Sin conexión con el servidor. Revisa tu internet.')
      setLoading(false)
    }
  }

  return (
    <div style={{ background:C.bg0, minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", padding:"20px" }}>
      <div style={{ background:C.bg1, border:`1px solid ${C.border}`, borderRadius:"14px", padding:"32px", width:"100%", maxWidth:"360px" }}>
        <div style={{ textAlign:"center", marginBottom:"28px" }}>
          <div style={{ fontSize:"26px", fontWeight:700, color:C.accentLight, letterSpacing:"-0.03em", marginBottom:"6px" }}>Vialog</div>
          <div style={{ fontSize:"13px", color:C.textMuted }}>Ingresa a tu cuenta</div>
        </div>

        <div style={{ marginBottom:"14px" }}>
          <label style={{ display:"block", fontSize:"10px", fontWeight:600, color:C.textMuted, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:"5px" }}>Correo</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()}
            placeholder="tucorreo@gmail.com"
            inputMode="email"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            style={{ width:"100%", background:C.bg0, border:`1px solid ${C.border}`, borderRadius:"7px", padding:"9px 11px", color:C.textPrimary, fontSize:"13px", outline:"none", boxSizing:"border-box" }}
          />
        </div>

        <div style={{ marginBottom:"20px" }}>
          <label style={{ display:"block", fontSize:"10px", fontWeight:600, color:C.textMuted, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:"5px" }}>Contraseña</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()}
            placeholder="••••••••"
            autoComplete="current-password"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            style={{ width:"100%", background:C.bg0, border:`1px solid ${C.border}`, borderRadius:"7px", padding:"9px 11px", color:C.textPrimary, fontSize:"13px", outline:"none", boxSizing:"border-box" }}
          />
        </div>

        {error && (
          <div style={{ background:C.redBg, border:`1px solid ${C.redBorder}`, borderRadius:"7px", padding:"9px 12px", fontSize:"12px", color:C.red, marginBottom:"14px" }}>
            {error}
          </div>
        )}

        <button
          onClick={submit}
          disabled={loading}
          style={{ width:"100%", background:loading?C.bg3:C.accent, border:"none", borderRadius:"7px", padding:"11px", color:"#fff", fontSize:"14px", fontWeight:600, cursor:loading?"not-allowed":"pointer" }}
        >
          {loading ? "Ingresando..." : "Ingresar"}
        </button>
      </div>
    </div>
  )
}

export default Login