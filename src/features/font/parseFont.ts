/**
 * 纯前端字体解析器。
 *
 * 支持 sfnt(TTF/OTF)、WOFF、WOFF2 三种容器，读取 cmap / post / name / maxp / head 表，
 * 得到「有哪些图标码位可用」这一核心信息。
 *
 * - WOFF 的表使用 zlib(deflate) 压缩，交给浏览器原生 DecompressionStream 解压；
 * - WOFF2 整体使用 brotli 压缩，使用 brotli 解码器解压后按目录顺序切片。
 *   （glyf/loca 的二次变换不影响 cmap/post/name 等表，因此无需还原字形数据）
 */

export type FontFormat = 'ttf' | 'otf' | 'woff' | 'woff2'

export interface FontGlyph {
  /** Unicode 码位 */
  codePoint: number
  /** 字形名，仅当字体包含 post 2.0 表时可用 */
  name?: string
  /** cmap 中的字形 ID */
  glyphId: number
}

export interface ParsedFont {
  format: FontFormat
  familyName: string
  subfamilyName?: string
  version?: string
  unitsPerEm?: number
  numGlyphs: number
  glyphs: FontGlyph[]
}

type TableMap = Map<string, Uint8Array>

/* ------------------------------------------------------------------ */
/* 基础读取工具                                                        */
/* ------------------------------------------------------------------ */

function u8(b: Uint8Array, o: number): number {
  return b[o]
}

function u16(b: Uint8Array, o: number): number {
  return (b[o] << 8) | b[o + 1]
}

function u32(b: Uint8Array, o: number): number {
  return ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0
}

function tagName(b: Uint8Array, o: number): string {
  return String.fromCharCode(b[o], b[o + 1], b[o + 2], b[o + 3])
}

/** 带指针的游标，用于读取变长结构 */
class Cursor {
  bytes: Uint8Array
  offset: number

  constructor(bytes: Uint8Array, offset = 0) {
    this.bytes = bytes
    this.offset = offset
  }

  u8(): number {
    return u8(this.bytes, this.offset++)
  }

  u16(): number {
    const v = u16(this.bytes, this.offset)
    this.offset += 2
    return v
  }

  u32(): number {
    const v = u32(this.bytes, this.offset)
    this.offset += 4
    return v
  }

  /** WOFF2 的 UIntBase128 变长整数 */
  base128(): number {
    let result = 0
    for (let i = 0; i < 5; i++) {
      const byte = this.u8()
      if (i === 0 && byte === 0x80) throw new Error('WOFF2_INVALID_BASE128')
      if (result & 0xfe000000) throw new Error('WOFF2_BASE128_OVERFLOW')
      result = (result << 7) | (byte & 0x7f)
      if ((byte & 0x80) === 0) return result >>> 0
    }
    throw new Error('WOFF2_INVALID_BASE128')
  }
}

/* ------------------------------------------------------------------ */
/* 容器解析：把不同格式统一成「表名 -> 表数据」                        */
/* ------------------------------------------------------------------ */

const WOFF2_KNOWN_TAGS = [
  'cmap', 'head', 'hhea', 'hmtx', 'maxp', 'name', 'OS/2', 'post',
  'cvt ', 'fpgm', 'glyf', 'loca', 'prep', 'CFF ', 'VORG', 'EBDT',
  'EBLC', 'gasp', 'hdmx', 'kern', 'LTSH', 'PCLT', 'VDMX', 'vhea',
  'vmtx', 'BASE', 'GDEF', 'GPOS', 'GSUB', 'EBSC', 'JSTF', 'MATH',
  'CBDT', 'CBLC', 'COLR', 'CPAL', 'SVG ', 'sbix', 'acnt', 'avar',
  'bdat', 'bloc', 'bsln', 'cvar', 'fdsc', 'feat', 'fmtx', 'fvar',
  'gvar', 'hsty', 'just', 'lcar', 'mort', 'morx', 'opbd', 'prop',
  'trak', 'Zapf', 'Silf', 'Glat', 'Gloc', 'Feat', 'Sill',
]

function readSfntTables(bytes: Uint8Array): TableMap {
  const numTables = u16(bytes, 4)
  const tables: TableMap = new Map()
  for (let i = 0; i < numTables; i++) {
    const rec = 12 + i * 16
    const name = tagName(bytes, rec)
    const offset = u32(bytes, rec + 8)
    const length = u32(bytes, rec + 12)
    if (offset + length <= bytes.length) tables.set(name, bytes.subarray(offset, offset + length))
  }
  return tables
}

async function inflateZlib(src: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === 'undefined') throw new Error('UNSUPPORTED_BROWSER')
  const copy = new Uint8Array(src.length)
  copy.set(src)
  const stream = new Blob([copy.buffer]).stream().pipeThrough(new DecompressionStream('deflate'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

async function readWoffTables(bytes: Uint8Array): Promise<TableMap> {
  const numTables = u16(bytes, 12)
  const tables: TableMap = new Map()
  for (let i = 0; i < numTables; i++) {
    const rec = 44 + i * 20
    const name = tagName(bytes, rec)
    const offset = u32(bytes, rec + 4)
    const compLength = u32(bytes, rec + 8)
    const origLength = u32(bytes, rec + 12)
    if (offset + compLength > bytes.length) continue
    const raw = bytes.subarray(offset, offset + compLength)
    if (compLength >= origLength) {
      tables.set(name, raw.subarray(0, origLength))
    } else {
      try {
        tables.set(name, await inflateZlib(raw))
      } catch {
        // 单表解压失败不影响其它表
      }
    }
  }
  return tables
}

async function readWoff2Tables(bytes: Uint8Array): Promise<TableMap> {
  const numTables = u16(bytes, 12)
  const totalCompressedSize = u32(bytes, 20)
  const cursor = new Cursor(bytes, 48)
  const entries: { tag: string; length: number }[] = []

  for (let i = 0; i < numTables; i++) {
    const flags = cursor.u8()
    const tagIndex = flags & 0x3f
    const transformVersion = (flags >> 6) & 0x03
    const name = tagIndex === 0x3f ? tagName(bytes, cursor.offset) : WOFF2_KNOWN_TAGS[tagIndex]
    if (tagIndex === 0x3f) cursor.offset += 4

    const origLength = cursor.base128()
    // glyf/loca 的默认变换版本为 0（已变换），hmtx 的变换版本为 1
    const transformed =
      name === 'glyf' || name === 'loca'
        ? transformVersion !== 3
        : name === 'hmtx'
          ? transformVersion === 1
          : false
    const transformLength = transformed ? cursor.base128() : undefined
    entries.push({ tag: name ?? '', length: transformLength ?? origLength })
  }

  const compressedStart = cursor.offset
  const compressed = bytes.subarray(compressedStart, compressedStart + totalCompressedSize)
  // brotli 解码器体积较大，仅在真的遇到 woff2 时按需加载
  const { default: decompressBrotli } = await import('brotli/decompress.js')
  const data = decompressBrotli(compressed)

  // 解压后的表数据按目录顺序紧密排列（变换后的 glyf 长度可能不是 4 的倍数，不做对齐填充）
  const tables: TableMap = new Map()
  let offset = 0
  for (const entry of entries) {
    if (offset + entry.length <= data.length) {
      tables.set(entry.tag, data.subarray(offset, offset + entry.length))
    }
    offset += entry.length
  }
  return tables
}

/**
 * 字体是二进制数据，头部会包含大量 0x00/非可打印字节。
 * 若开头几乎全是可打印 ASCII，说明拿到的是 HTML/JSON/XML 之类的文本。
 */
function looksLikeTextFile(bytes: Uint8Array): boolean {
  const head = bytes.subarray(0, Math.min(bytes.length, 256))
  let printable = 0
  for (let i = 0; i < head.length; i++) {
    const byte = head[i]
    if (byte === 0x09 || byte === 0x0a || byte === 0x0d || (byte >= 0x20 && byte <= 0x7e)) {
      printable += 1
    }
  }
  return printable / head.length > 0.95
}

/** 判断并解析字体容器，返回统一的表集合 */
async function readTables(bytes: Uint8Array): Promise<{ tables: TableMap; format: FontFormat }> {
  const signature = tagName(bytes, 0)

  if (signature === 'wOFF') return { tables: await readWoffTables(bytes), format: 'woff' }
  if (signature === 'wOF2') return { tables: await readWoff2Tables(bytes), format: 'woff2' }

  const sfntVersion = u32(bytes, 0)
  if (sfntVersion === 0x4f54544f) return { tables: readSfntTables(bytes), format: 'otf' } // OTTO
  if (sfntVersion === 0x00010000 || sfntVersion === 0x74727565) {
    return { tables: readSfntTables(bytes), format: 'ttf' }
  }
  // ttcf：字体集合（.ttc），单个文件里包含多套字体，暂不支持
  if (sfntVersion === 0x74746366) throw new Error('FONT_COLLECTION_UNSUPPORTED')
  // 下载被重定向到登录页 / 404 页时，保存下来的其实是 HTML
  if (looksLikeTextFile(bytes)) throw new Error('NOT_A_FONT_FILE')
  throw new Error('UNSUPPORTED_FONT_FORMAT')
}

/* ------------------------------------------------------------------ */
/* cmap：码位 -> 字形 ID                                               */
/* ------------------------------------------------------------------ */

function subtableScore(platformId: number, encodingId: number, format: number): number {
  if (format !== 0 && format !== 4 && format !== 6 && format !== 12) return 0
  if (platformId === 3 && encodingId === 10) return 60
  if (platformId === 0 && (encodingId === 4 || encodingId === 6)) return 60
  if (platformId === 3 && encodingId === 1) return 50
  if (platformId === 0 && encodingId === 3) return 40
  if (platformId === 0) return 30
  if (platformId === 3 && encodingId === 0) return 20
  if (platformId === 1 && encodingId === 0) return 10
  return 0
}

function parseCmapFormat4(cm: Uint8Array, base: number, out: Map<number, number>): void {
  const segCountX2 = u16(cm, base + 6)
  const segCount = segCountX2 >> 1
  const endCodePos = base + 14
  const startCodePos = endCodePos + segCountX2 + 2
  const idDeltaPos = startCodePos + segCountX2
  const idRangeOffsetPos = idDeltaPos + segCountX2

  for (let seg = 0; seg < segCount; seg++) {
    const end = u16(cm, endCodePos + seg * 2)
    const start = u16(cm, startCodePos + seg * 2)
    const delta = u16(cm, idDeltaPos + seg * 2)
    const rangeOffset = u16(cm, idRangeOffsetPos + seg * 2)
    if (start > end) continue

    for (let code = start; code <= end && code !== 0xffff; code++) {
      let glyphId: number
      if (rangeOffset === 0) {
        glyphId = (code + delta) & 0xffff
      } else {
        const index = idRangeOffsetPos + seg * 2 + rangeOffset + (code - start) * 2
        if (index + 1 >= cm.length) continue
        glyphId = u16(cm, index)
        if (glyphId !== 0) glyphId = (glyphId + delta) & 0xffff
      }
      if (glyphId !== 0) out.set(code, glyphId)
    }
  }
}

function parseCmapFormat12(cm: Uint8Array, base: number, out: Map<number, number>): void {
  const nGroups = u32(cm, base + 12)
  for (let g = 0; g < nGroups; g++) {
    const pos = base + 16 + g * 12
    if (pos + 12 > cm.length) break
    const start = u32(cm, pos)
    const end = u32(cm, pos + 4)
    const startGlyph = u32(cm, pos + 8)
    if (end - start > 0x10ffff) continue
    for (let code = start; code <= end; code++) {
      const glyphId = startGlyph + (code - start)
      if (glyphId !== 0) out.set(code, glyphId)
    }
  }
}

function parseCmapFormat6(cm: Uint8Array, base: number, out: Map<number, number>): void {
  const firstCode = u16(cm, base + 6)
  const entryCount = u16(cm, base + 8)
  for (let i = 0; i < entryCount; i++) {
    const glyphId = u16(cm, base + 10 + i * 2)
    if (glyphId !== 0) out.set(firstCode + i, glyphId)
  }
}

function parseCmapFormat0(cm: Uint8Array, base: number, out: Map<number, number>): void {
  for (let code = 0; code < 256; code++) {
    const glyphId = u8(cm, base + 6 + code)
    if (glyphId !== 0) out.set(code, glyphId)
  }
}

function parseCmap(cm: Uint8Array): Map<number, number> {
  const out = new Map<number, number>()
  const numTables = u16(cm, 2)
  let bestOffset = -1
  let bestScore = 0

  for (let i = 0; i < numTables; i++) {
    const rec = 4 + i * 8
    const platformId = u16(cm, rec)
    const encodingId = u16(cm, rec + 2)
    const offset = u32(cm, rec + 4)
    if (offset + 4 > cm.length) continue
    const format = u16(cm, offset)
    const score = subtableScore(platformId, encodingId, format)
    if (score > bestScore) {
      bestScore = score
      bestOffset = offset
    }
  }

  if (bestOffset < 0) return out
  const format = u16(cm, bestOffset)
  if (format === 0) parseCmapFormat0(cm, bestOffset, out)
  else if (format === 4) parseCmapFormat4(cm, bestOffset, out)
  else if (format === 6) parseCmapFormat6(cm, bestOffset, out)
  else if (format === 12) parseCmapFormat12(cm, bestOffset, out)
  return out
}

/* ------------------------------------------------------------------ */
/* post：字形名（仅 2.0 版本带名字）                                   */
/* ------------------------------------------------------------------ */

const STANDARD_MAC_GLYPH_COUNT = 258

function parsePostNames(post: Uint8Array | undefined, numGlyphs: number): (string | undefined)[] {
  const names: (string | undefined)[] = []
  if (!post || post.length < 34 || u32(post, 0) !== 0x00020000) return names

  const glyphCount = u16(post, 32)
  const total = Math.min(glyphCount, numGlyphs || glyphCount)
  const indexPos = 34
  const stringPos = indexPos + glyphCount * 2
  const custom: string[] = []

  let cursor = stringPos
  while (cursor < post.length && custom.length < 10000) {
    const len = u8(post, cursor)
    cursor += 1
    if (cursor + len > post.length) break
    let name = ''
    for (let i = 0; i < len; i++) name += String.fromCharCode(post[cursor + i])
    cursor += len
    custom.push(name)
  }

  for (let i = 0; i < total; i++) {
    const index = u16(post, indexPos + i * 2)
    if (index === 0) names.push('.notdef')
    else if (index < STANDARD_MAC_GLYPH_COUNT) names.push(undefined)
    else names.push(custom[index - STANDARD_MAC_GLYPH_COUNT])
  }
  return names
}

/* ------------------------------------------------------------------ */
/* name：字体名称                                                      */
/* ------------------------------------------------------------------ */

interface NameRecord {
  platformId: number
  languageId: number
  nameId: number
  value: string
}

function parseNames(name: Uint8Array | undefined): NameRecord[] {
  const records: NameRecord[] = []
  if (!name || name.length < 6) return records

  const count = u16(name, 2)
  const storagePos = u16(name, 4)
  const decoder = new TextDecoder('utf-16be')

  for (let i = 0; i < count; i++) {
    const rec = 6 + i * 12
    if (rec + 12 > name.length) break
    // 记录结构：platformID(2) encodingID(2) languageID(2) nameID(2) length(2) offset(2)
    const platformId = u16(name, rec)
    const languageId = u16(name, rec + 4)
    const nameId = u16(name, rec + 6)
    const length = u16(name, rec + 8)
    const offset = storagePos + u16(name, rec + 10)
    if (offset + length > name.length) continue

    const bytes = name.subarray(offset, offset + length)
    let value: string
    if (platformId === 0 || platformId === 3) {
      value = decoder.decode(bytes)
    } else {
      let latin = ''
      for (let j = 0; j < bytes.length; j++) latin += String.fromCharCode(bytes[j])
      value = latin
    }
    if (value) records.push({ platformId, languageId, nameId, value })
  }
  return records
}

function pickName(records: NameRecord[], nameId: number): string | undefined {
  const candidates = records.filter((r) => r.nameId === nameId)
  if (candidates.length === 0) return undefined

  const ranked = candidates
    .map((r) => {
      let score = 0
      if (r.platformId === 3 && r.languageId === 0x0409) score = 4
      else if (r.platformId === 3) score = 3
      else if (r.platformId === 0) score = 2
      else score = 1
      return { r, score }
    })
    .sort((a, b) => b.score - a.score)

  return ranked[0].r.value.trim() || undefined
}

/* ------------------------------------------------------------------ */
/* 对外入口                                                            */
/* ------------------------------------------------------------------ */

/** 解析字体二进制，得到码位列表等元信息 */
export async function parseFont(data: ArrayBuffer, fileName = ''): Promise<ParsedFont> {
  const bytes = new Uint8Array(data)
  if (bytes.length < 12) throw new Error('INVALID_FONT_FILE')

  const { tables, format } = await readTables(bytes)
  const cmap = tables.get('cmap')
  const nameTable = tables.get('name')
  const maxp = tables.get('maxp')
  const head = tables.get('head')

  const numGlyphs = maxp && maxp.length >= 6 ? u16(maxp, 4) : 0
  const codePoints = cmap ? parseCmap(cmap) : new Map<number, number>()
  const glyphNames = parsePostNames(tables.get('post'), numGlyphs)

  const glyphs: FontGlyph[] = [...codePoints.entries()]
    .map(([codePoint, glyphId]) => ({ codePoint, glyphId, name: glyphNames[glyphId] }))
    .sort((a, b) => a.codePoint - b.codePoint)

  const records = parseNames(nameTable)
  const fallbackName = fileName.replace(/\.(woff2?|ttf|otf)$/i, '') || 'Unknown Font'

  return {
    format,
    familyName: pickName(records, 1) ?? fallbackName,
    subfamilyName: pickName(records, 2),
    version: pickName(records, 5),
    unitsPerEm: head && head.length >= 20 ? u16(head, 18) : undefined,
    numGlyphs,
    glyphs,
  }
}

/** U+E600 形式 */
export function toUnicodeLabel(codePoint: number): string {
  return `U+${codePoint.toString(16).toUpperCase().padStart(4, '0')}`
}

/** \e600 形式（CSS content 转义） */
export function toCssEscape(codePoint: number): string {
  return `\\${codePoint.toString(16).toLowerCase()}`
}

/** 私有使用区（图标字体常用区域） */
export function isPrivateUse(codePoint: number): boolean {
  return (
    (codePoint >= 0xe000 && codePoint <= 0xf8ff) ||
    (codePoint >= 0xf0000 && codePoint <= 0xffffd) ||
    (codePoint >= 0x100000 && codePoint <= 0x10fffd)
  )
}
