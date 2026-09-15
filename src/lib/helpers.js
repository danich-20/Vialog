const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const uid = () => Math.random().toString(36).slice(2, 9);

// Dinero: siempre 2 decimales. Sin maximumFractionDigits, Intl llega a 3 por defecto.
export const fmt = n => new Intl.NumberFormat("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);

// Cantidades (km, litros, toneladas): hasta 2 decimales, sin rellenar con ceros
export const fmtNum = n => new Intl.NumberFormat("es-VE", { maximumFractionDigits: 2 }).format(n || 0);

// Fecha local: toISOString() devuelve el dia siguiente despues de las 8pm en Venezuela
export const today = () => iso(new Date());

export const nombreMes = ym => {
  if (!ym) return "";
  const [anio, mes] = ym.split("-");
  return `${MESES[+mes - 1] || mes} ${anio}`;
};

export const norm = s => (s ?? "").toString().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

// Busca todas las palabras de la consulta dentro de los campos dados, sin acentos
export const coincide = (consulta, ...campos) => {
  const q = norm(consulta).trim();
  if (!q) return true;
  const texto = norm(campos.filter(Boolean).join(" "));
  return q.split(/\s+/).every(palabra => texto.includes(palabra));
};

export const PERIODOS = [
  { id: "mes", label: "Este mes" },
  { id: "mesPasado", label: "Mes pasado" },
  { id: "semana", label: "Esta semana" },
  { id: "anio", label: "Este año" },
  { id: "todo", label: "Todo" },
  { id: "rango", label: "Rango personalizado" },
];

export const calcularRango = (id, desde, hasta) => {
  const hoy = new Date();
  const a = hoy.getFullYear();
  const m = hoy.getMonth();
  if (id === "mes") return { desde: iso(new Date(a, m, 1)), hasta: iso(new Date(a, m + 1, 0)), etiqueta: `${MESES[m]} ${a}` };
  if (id === "mesPasado") {
    const ini = new Date(a, m - 1, 1);
    return { desde: iso(ini), hasta: iso(new Date(a, m, 0)), etiqueta: `${MESES[ini.getMonth()]} ${ini.getFullYear()}` };
  }
  if (id === "semana") {
    const corrimiento = (hoy.getDay() + 6) % 7;
    const lunes = new Date(a, m, hoy.getDate() - corrimiento);
    const domingo = new Date(a, m, hoy.getDate() - corrimiento + 6);
    return { desde: iso(lunes), hasta: iso(domingo), etiqueta: `Semana del ${iso(lunes)}` };
  }
  if (id === "anio") return { desde: `${a}-01-01`, hasta: `${a}-12-31`, etiqueta: `Año ${a}` };
  if (id === "rango") return { desde: desde || "", hasta: hasta || "", etiqueta: `${desde || "inicio"} a ${hasta || "hoy"}` };
  return { desde: "", hasta: "", etiqueta: "Todos los períodos" };
};

export const enRango = (fecha, rango) => {
  if (!fecha) return false;
  if (rango.desde && fecha < rango.desde) return false;
  if (rango.hasta && fecha > rango.hasta) return false;
  return true;
};

export const calcEstado = (m, km) => {
  const hoy = new Date();
  const pf = m.proxima_fecha ? new Date(m.proxima_fecha) : null;
  const dd = pf ? Math.ceil((pf - hoy) / (1000 * 60 * 60 * 24)) : 999;
  const dk = m.proximo_km ? (m.proximo_km - (km || 0)) : 999;
  if (dd < 0 || dk < 0) return "vencido";
  if (dd <= 15 || dk <= 500) return "pendiente";
  return "ok";
};
