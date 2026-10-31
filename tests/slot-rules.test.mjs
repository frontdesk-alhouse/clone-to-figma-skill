// Prueba aislada de las reglas de clasificación del extractor de slots.
// Replica EXACTAMENTE el bloque de reglas del recon; si divergen, este test miente.
function classify({ tag, src, hasBg, r, rootRect, cs, natW = 0, natH = 0 }) {
  const z = parseInt(cs.zIndex, 10)
  const isMedia = ['img', 'picture', 'video', 'svg', 'canvas'].includes(tag)
  if (!isMedia && !hasBg) return null
  if (r.width < 8 || r.height < 8) return null

  if (hasBg && r.width >= 0.9 * rootRect.width) return 'full-bleed-bg'
  if (cs.position !== 'static' && !isNaN(z) && z < 0) return 'full-bleed-bg'
  if (tag === 'svg' || (src && src.endsWith('.svg'))) return r.width <= 64 ? 'icon' : 'vector-illustration'
  if (natW && natH && Math.abs(natW / natH - 1) < 0.05 && r.width <= 96) return 'avatar'
  if (tag === 'video') return 'video'
  if (hasBg) return 'bg-image'
  if (r.width >= 0.9 * rootRect.width) return 'full-bleed-image'
  return 'inline-image'
}

const SECTION = { width: 1440, height: 800 }
const st = { position: 'static', zIndex: 'auto' }

const cases = [
  ['hero con fondo CSS a ancho completo', { tag: 'div', hasBg: true, r: { width: 1440, height: 800 }, rootRect: SECTION, cs: st }, 'full-bleed-bg'],
  ['div con fondo CSS pequeño (card) → fill, no img', { tag: 'div', hasBg: true, r: { width: 320, height: 200 }, rootRect: SECTION, cs: st }, 'bg-image'],
  ['capa decorativa detrás del contenido', { tag: 'img', src: 'blob.png', r: { width: 400, height: 400 }, rootRect: SECTION, cs: { position: 'absolute', zIndex: '-1' } }, 'full-bleed-bg'],
  ['icono svg 24px', { tag: 'svg', r: { width: 24, height: 24 }, rootRect: SECTION, cs: st }, 'icon'],
  ['ilustración svg grande', { tag: 'svg', r: { width: 480, height: 320 }, rootRect: SECTION, cs: st }, 'vector-illustration'],
  ['img con extensión .svg de 32px', { tag: 'img', src: '/logo.svg', r: { width: 32, height: 32 }, rootRect: SECTION, cs: st }, 'icon'],
  ['avatar cuadrado 64px', { tag: 'img', src: 'p.jpg', r: { width: 64, height: 64 }, rootRect: SECTION, cs: st, natW: 400, natH: 400 }, 'avatar'],
  ['foto cuadrada GRANDE (no avatar)', { tag: 'img', src: 'p.jpg', r: { width: 600, height: 600 }, rootRect: SECTION, cs: st, natW: 800, natH: 800 }, 'inline-image'],
  ['video', { tag: 'video', r: { width: 800, height: 450 }, rootRect: SECTION, cs: st }, 'video'],
  ['imagen a ancho completo', { tag: 'img', src: 'w.jpg', r: { width: 1440, height: 600 }, rootRect: SECTION, cs: st, natW: 2880, natH: 1200 }, 'full-bleed-image'],
  ['imagen inline en columna', { tag: 'img', src: 'x.jpg', r: { width: 600, height: 400 }, rootRect: SECTION, cs: st, natW: 1200, natH: 800 }, 'inline-image'],
  ['pixel de tracking 1x1', { tag: 'img', src: 't.gif', r: { width: 1, height: 1 }, rootRect: SECTION, cs: st }, null],
  ['div sin fondo ni media', { tag: 'div', hasBg: false, r: { width: 500, height: 300 }, rootRect: SECTION, cs: st }, null],
  ['imagen a 90% exacto del ancho (borde)', { tag: 'img', src: 'e.jpg', r: { width: 1296, height: 500 }, rootRect: SECTION, cs: st }, 'full-bleed-image'],
]

let pass = 0, fail = 0
for (const [name, input, expected] of cases) {
  const got = classify(input)
  const ok = got === expected
  ok ? pass++ : fail++
  console.log(`${ok ? '✓' : '✗'} ${name}\n    esperado=${expected}  obtenido=${got}`)
}
console.log(`\n${pass} pasaron, ${fail} fallaron`)
process.exit(fail ? 1 : 0)
