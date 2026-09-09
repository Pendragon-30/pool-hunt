import { supabase } from '../lib/supabaseClient'

// Gemini image generation doesn't reliably support true alpha transparency
// -- when the prompt asks for a "transparent background" it renders a
// literal grey/white checkerboard swatch as actual pixel content instead of
// real transparency, which is exactly the artifact showing up on the site.
// So the edge functions ask Gemini for a solid chroma-key MAGENTA
// background instead (a color that won't appear on a pool or its
// accessories), and this file keys that color out to real transparency in
// the browser before the image is uploaded to Supabase Storage.

const KEY_COLOR = { r: 255, g: 0, b: 255 }

// Pixels within HARD_THRESHOLD of the key color become fully transparent.
// Pixels between HARD_THRESHOLD and HARD_THRESHOLD + FEATHER fade smoothly
// from transparent to opaque, which avoids a hard, aliased cutout edge
// around the subject.
const HARD_THRESHOLD = 60
const FEATHER = 50

// What the RGB channel gets blended toward as a pixel's alpha drops to
// zero. A plain, unsaturated "matte" color -- specifically NOT changing
// this used to be a real bug: only the alpha channel was ever touched, so a
// fully keyed-out pixel kept its ORIGINAL magenta RGB value sitting
// underneath an alpha of 0. That's invisible in a normal browser (which
// respects alpha), but any downstream consumer that flattens or ignores
// the alpha channel sees that leftover magenta bleed straight through --
// which is exactly what was happening when a pool photo's "transparent"
// background was later fed into Gemini for the composite-photo edit
// pipeline: Gemini doesn't handle alpha, so it saw the raw (still-magenta)
// RGB data and reproduced it as a magenta background/border in its output.
const NEUTRAL_MATTE = { r: 255, g: 255, b: 255 }

function colorDistance(r: number, g: number, b: number): number {
  const dr = r - KEY_COLOR.r
  const dg = g - KEY_COLOR.g
  const db = b - KEY_COLOR.b
  return Math.sqrt(dr * dr + dg * dg + db * db)
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Failed to load generated image'))
    img.src = src
  })
}

/**
 * Takes the base64 PNG the edge function returned (still on its magenta
 * chroma-key background), keys the magenta out to real alpha transparency,
 * and uploads the resulting PNG to the given Supabase Storage
 * bucket/filename. Returns a cache-busted public URL.
 */
export async function chromaKeyAndUpload(
  dataBase64: string,
  mimeType: string,
  bucket: string,
  fileName: string,
): Promise<string> {
  const img = await loadImage(`data:${mimeType};base64,${dataBase64}`)

  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D context is not available in this browser')
  ctx.drawImage(img, 0, 0)

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const pixels = imageData.data
  for (let i = 0; i < pixels.length; i += 4) {
    const dist = colorDistance(pixels[i], pixels[i + 1], pixels[i + 2])

    // alphaFactor: 0 = fully keyed out (magenta), 1 = fully kept as-is.
    let alphaFactor: number
    if (dist < HARD_THRESHOLD) {
      alphaFactor = 0
    } else if (dist < HARD_THRESHOLD + FEATHER) {
      alphaFactor = (dist - HARD_THRESHOLD) / FEATHER
    } else {
      alphaFactor = 1
    }

    // Blend RGB toward the neutral matte by the SAME factor used for alpha
    // -- not just fading alpha while leaving the original (magenta-tinted)
    // color data sitting underneath it. See NEUTRAL_MATTE above for why.
    pixels[i] = Math.round(pixels[i] * alphaFactor + NEUTRAL_MATTE.r * (1 - alphaFactor))
    pixels[i + 1] = Math.round(pixels[i + 1] * alphaFactor + NEUTRAL_MATTE.g * (1 - alphaFactor))
    pixels[i + 2] = Math.round(pixels[i + 2] * alphaFactor + NEUTRAL_MATTE.b * (1 - alphaFactor))
    pixels[i + 3] = Math.round(pixels[i + 3] * alphaFactor)
  }
  ctx.putImageData(imageData, 0, 0)

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Failed to encode processed PNG'))), 'image/png')
  })

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(fileName, blob, { contentType: 'image/png', upsert: true })
  if (uploadError) throw uploadError

  const { data: pub } = supabase.storage.from(bucket).getPublicUrl(fileName)
  return `${pub.publicUrl}?v=${Date.now()}`
}
