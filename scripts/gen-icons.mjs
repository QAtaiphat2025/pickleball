// Sinh icon PNG cho PWA bằng Node thuần (không cần thư viện ngoài).
// Vẽ nền bo góc tối + quả bóng pickleball cyan có lỗ, khớp favicon.svg.
import zlib from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, '..', 'public')
mkdirSync(outDir, { recursive: true })

function crc32(buf) {
  let c = ~0
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]
    for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1
  }
  return ~c >>> 0
}

function chunk(type, data) {
  const t = Buffer.from(type, 'ascii')
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0)
  return Buffer.concat([len, t, data, crc])
}

// Trộn màu foreground (có alpha) lên background
function over(fg, bg) {
  const a = fg[3] / 255
  return [
    Math.round(fg[0] * a + bg[0] * (1 - a)),
    Math.round(fg[1] * a + bg[1] * (1 - a)),
    Math.round(fg[2] * a + bg[2] * (1 - a)),
  ]
}

function lerp(c1, c2, t) {
  return [
    c1[0] + (c2[0] - c1[0]) * t,
    c1[1] + (c2[1] - c1[1]) * t,
    c1[2] + (c2[2] - c1[2]) * t,
  ]
}

function makePng(size) {
  const s = size
  const r = s / 512 // scale factor so toạ độ 512 dùng lại được
  const raw = Buffer.alloc(s * (s * 3 + 1))
  const cx = 256 * r
  const cy = 256 * r
  const ballR = 150 * r
  const radius = 112 * r // bo góc nền
  const holes = [
    [256, 188], [212, 222], [300, 222], [256, 256],
    [212, 290], [300, 290], [256, 324],
  ].map(([x, y]) => [x * r, y * r])
  const holeR = 20 * r

  const bgTop = [23, 58, 99]
  const bgBot = [7, 16, 31]
  const ballLight = [126, 240, 255]
  const ballDark = [63, 217, 255]
  const holeColor = [7, 16, 31]

  for (let y = 0; y < s; y++) {
    const rowStart = y * (s * 3 + 1)
    raw[rowStart] = 0 // filter type none
    for (let x = 0; x < s; x++) {
      // nền gradient chéo
      const g = (x / s) * 0.5 + (y / s) * 0.5
      let px = lerp(bgTop, bgBot, g).map(Math.round)

      // bo góc: ngoài vùng rounded-rect -> trong suốt (để nền app xuyên qua)
      const inRounded = insideRoundedRect(x, y, 0, 0, s, s, radius)

      if (inRounded) {
        // quả bóng
        const d = Math.hypot(x - cx, y - cy)
        if (d <= ballR) {
          const t = Math.min(1, d / ballR)
          let ball = lerp(ballLight, ballDark, t)
          // lỗ trên bóng
          for (const [hx, hy] of holes) {
            if (Math.hypot(x - hx, y - hy) <= holeR) {
              ball = holeColor
              break
            }
          }
          px = ball.map(Math.round)
        }
      }

      const o = rowStart + 1 + x * 3
      raw[o] = px[0]
      raw[o + 1] = px[1]
      raw[o + 2] = px[2]
    }
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(s, 0)
  ihdr.writeUInt32BE(s, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 2 // color type RGB
  const idat = zlib.deflateSync(raw, { level: 9 })
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ])
  return png
}

function insideRoundedRect(px, py, x, y, w, h, rad) {
  const nx = Math.max(x + rad - px, px - (x + w - rad), 0)
  const ny = Math.max(y + rad - py, py - (y + h - rad), 0)
  return nx * nx + ny * ny <= rad * rad
}

for (const size of [192, 512]) {
  const png = makePng(size)
  writeFileSync(join(outDir, `icon-${size}.png`), png)
  console.log(`icon-${size}.png (${png.length} bytes)`)
}
