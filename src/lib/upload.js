import { supabase } from '../supabase'
import { avisar } from './dialogo'

const BUCKET = 'comprobantes'
const MAX_LADO = 1600
const CALIDAD = 0.8

// Una foto de celular pesa 3-8 MB. Reducirla antes de subir la deja en 200-400 KB
// sin perder legibilidad del ticket, y ahorra datos moviles y espacio en Supabase.
async function comprimirImagen(file) {
  if (!file.type.startsWith('image/')) return file
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
    const escala = Math.min(1, MAX_LADO / Math.max(bitmap.width, bitmap.height))
    const ancho = Math.round(bitmap.width * escala)
    const alto = Math.round(bitmap.height * escala)
    const canvas = document.createElement('canvas')
    canvas.width = ancho
    canvas.height = alto
    canvas.getContext('2d').drawImage(bitmap, 0, 0, ancho, alto)
    bitmap.close()
    const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', CALIDAD))
    if (!blob || blob.size >= file.size) return file
    return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' })
  } catch {
    return file
  }
}

export async function subirArchivo(file, carpeta) {
  if (!file) return null
  const listo = await comprimirImagen(file)
  const ext = listo.name.split('.').pop()
  const nombre = `${carpeta}/${Date.now()}_${Math.random().toString(36).slice(2, 9)}.${ext}`
  const { error } = await supabase.storage.from(BUCKET).upload(nombre, listo)
  if (error) {
    await avisar('Error al subir archivo: ' + error.message)
    return null
  }
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(nombre)
  return data.publicUrl
}

export async function borrarArchivo(url) {
  if (!url) return
  const marca = `/${BUCKET}/`
  const i = url.indexOf(marca)
  if (i === -1) return
  await supabase.storage.from(BUCKET).remove([url.slice(i + marca.length)])
}
