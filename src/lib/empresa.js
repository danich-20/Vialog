// ============================================================
//  DATOS DE LA EMPRESA — todo esto es opcional
//  Lo que pongas aquí sale impreso en el membrete del PDF.
//  Lo que dejes en "" no aparece, y si están todos vacíos el
//  documento sale sin membrete, limpio, sin huecos ni textos raros.
//  Para activarlo más adelante basta con escribir los datos aquí.
// ============================================================

export const EMPRESA = {
  nombre:    "",
  rif:       "",
  direccion: "",
  telefono:  "",
  correo:    "",

  // Pon el archivo del logo dentro de la carpeta public/ y escribe
  // aquí su nombre con la barra delante, por ejemplo "/logo.png".
  // Si lo dejas en "", el PDF sale sin logo y se ve bien igual.
  logo: "",
}

// Texto que aparece al pie de cada estado de cuenta. Déjalo en "" para quitarlo.
export const NOTA_PIE = "Para cualquier aclaratoria sobre este estado de cuenta, contáctenos."

// Colores del PDF, en formato [rojo, verde, azul] de 0 a 255.
// El principal es el de las franjas de las tablas.
export const PDF_COLOR = {
  principal: [193, 42, 34],
  texto:     [26, 27, 29],
  tenue:     [120, 120, 120],
  fila:      [246, 244, 242],
  borde:     [205, 200, 195],
  pendiente: [176, 42, 34],
  cobrado:   [30, 105, 70],
}
