import { EMPRESA, NOTA_PIE, PDF_COLOR as P } from './empresa'
import { fmt } from './helpers'

// Hoja Carta en milímetros
export const ANCHO = 216
export const ALTO = 279
export const MARGEN = 14
export const UTIL = ANCHO - MARGEN * 2

// Convierte el logo a data URL. Si no hay logo o falla, devuelve null y el PDF sale sin él.
export async function cargarLogo() {
  if (!EMPRESA.logo) return null
  try {
    const r = await fetch(EMPRESA.logo)
    if (!r.ok) return null
    const blob = await r.blob()
    return await new Promise((res, rej) => {
      const fr = new FileReader()
      fr.onload = () => res(fr.result)
      fr.onerror = rej
      fr.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

// Membrete con logo y datos fiscales. Devuelve la Y donde sigue el contenido.
// Si no hay ni nombre ni logo, el documento sale sin membrete: solo la franja
// de color arriba. Queda limpio, no roto.
export function membrete(doc, logo) {
  let y = MARGEN
  let x = MARGEN

  if (logo) {
    try {
      doc.addImage(logo, MARGEN, y, 24, 24)
      x = MARGEN + 30
    } catch {
      // Formato de imagen no soportado: seguimos sin logo
    }
  }

  const lineas = [
    EMPRESA.rif && `RIF ${EMPRESA.rif}`,
    EMPRESA.direccion,
    [EMPRESA.telefono, EMPRESA.correo].filter(Boolean).join('  ·  '),
  ].filter(Boolean)

  let dy = y
  if (EMPRESA.nombre) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(15)
    doc.setTextColor(...P.texto)
    doc.text(EMPRESA.nombre, x, y + 6)
    dy = y + 11.5
  }

  if (lineas.length) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...P.tenue)
    lineas.forEach(l => { doc.text(l, x, dy); dy += 4 })
  }

  const hayMembrete = EMPRESA.nombre || lineas.length || logo
  y = hayMembrete ? Math.max(dy, logo ? MARGEN + 26 : dy) + 2 : MARGEN

  doc.setDrawColor(...P.principal)
  doc.setLineWidth(1)
  doc.line(MARGEN, y, ANCHO - MARGEN, y)
  return y + 9
}

// Título del documento y sus datos (cliente, período)
export function encabezadoDoc(doc, y, textoTitulo, datos = []) {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(...P.texto)
  doc.text(textoTitulo.toUpperCase(), MARGEN, y)
  y += 6

  doc.setFontSize(9)
  datos.filter(Boolean).forEach(([etiqueta, valor]) => {
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...P.tenue)
    doc.text(etiqueta, MARGEN, y)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...P.texto)
    doc.text(String(valor), MARGEN + 26, y)
    y += 4.8
  })
  return y + 4
}

// Dibuja una tabla con franja de encabezado en color y bordes visibles.
// columnas: [{ titulo, ancho, align }]  ·  filas: [[celda, ...]]
export function tabla(doc, y, columnas, filas, opciones = {}) {
  const altoFila = 7
  const altoCab = 8
  const { totales = null, vacio = 'Sin registros' } = opciones

  const dibujarCabecera = yy => {
    doc.setFillColor(...P.principal)
    doc.rect(MARGEN, yy, UTIL, altoCab, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(255, 255, 255)
    let x = MARGEN
    columnas.forEach(c => {
      const tx = c.align === 'right' ? x + c.ancho - 2.5 : x + 2.5
      doc.text(c.titulo, tx, yy + 5.4, { align: c.align === 'right' ? 'right' : 'left' })
      x += c.ancho
    })
    return yy + altoCab
  }

  y = dibujarCabecera(y)

  if (filas.length === 0) {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(9)
    doc.setTextColor(...P.tenue)
    doc.text(vacio, MARGEN + 2.5, y + 5)
    return y + altoFila + 2
  }

  doc.setFontSize(8.5)
  filas.forEach((fila, i) => {
    if (y + altoFila > ALTO - 22) {
      doc.addPage()
      y = MARGEN
      y = dibujarCabecera(y)
      doc.setFontSize(8.5)
    }

    if (i % 2 === 1) {
      doc.setFillColor(...P.fila)
      doc.rect(MARGEN, y, UTIL, altoFila, 'F')
    }

    doc.setDrawColor(...P.borde)
    doc.setLineWidth(0.1)
    doc.line(MARGEN, y + altoFila, ANCHO - MARGEN, y + altoFila)

    let x = MARGEN
    fila.forEach((celda, j) => {
      const c = columnas[j]
      const valor = celda == null ? '' : String(celda)
      doc.setFont('helvetica', c.negrita ? 'bold' : 'normal')
      doc.setTextColor(...(c.color || P.texto))
      const tx = c.align === 'right' ? x + c.ancho - 2.5 : x + 2.5
      const max = c.ancho - 5
      doc.text(doc.splitTextToSize(valor, max)[0] || '', tx, y + 4.9, { align: c.align === 'right' ? 'right' : 'left' })
      x += c.ancho
    })
    y += altoFila
  })

  if (totales) {
    if (y + altoFila > ALTO - 22) { doc.addPage(); y = MARGEN }
    doc.setFillColor(235, 231, 228)
    doc.rect(MARGEN, y, UTIL, altoFila, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(...P.texto)
    let x = MARGEN
    totales.forEach((celda, j) => {
      const c = columnas[j]
      const tx = c.align === 'right' ? x + c.ancho - 2.5 : x + 2.5
      doc.text(celda == null ? '' : String(celda), tx, y + 4.9, { align: c.align === 'right' ? 'right' : 'left' })
      x += c.ancho
    })
    y += altoFila
  }

  return y + 4
}

// Recuadro destacado con el saldo total
export function recuadroTotal(doc, y, etiqueta, monto) {
  if (y + 16 > ALTO - 22) { doc.addPage(); y = MARGEN }
  const ancho = 84
  const x = ANCHO - MARGEN - ancho
  doc.setFillColor(...P.principal)
  doc.rect(x, y, ancho, 13, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(255, 255, 255)
  doc.text(etiqueta.toUpperCase(), x + 4, y + 8.3)
  doc.setFontSize(12)
  doc.text(`$${fmt(monto)}`, x + ancho - 4, y + 8.6, { align: 'right' })
  return y + 19
}

// Pie con nota y numeración. Se llama al final, sobre todas las páginas.
export function pie(doc, generado) {
  const total = doc.getNumberOfPages()
  for (let i = 1; i <= total; i++) {
    doc.setPage(i)
    doc.setDrawColor(...P.borde)
    doc.setLineWidth(0.2)
    doc.line(MARGEN, ALTO - 16, ANCHO - MARGEN, ALTO - 16)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...P.tenue)
    if (NOTA_PIE) doc.text(NOTA_PIE, MARGEN, ALTO - 11)
    doc.text(`Generado el ${generado}`, MARGEN, ALTO - 7.5)
    doc.text(`Página ${i} de ${total}`, ANCHO - MARGEN, ALTO - 7.5, { align: 'right' })
  }
}
