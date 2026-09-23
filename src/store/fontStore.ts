/**
 * 字体库状态（内存态，不持久化）。
 * 负责读文件、调用解析器，并把字体注册进 document.fonts 供预览渲染。
 */
import { create } from 'zustand'
import { parseFont, type ParsedFont } from '@/features/font/parseFont'

export interface FontEntry {
  id: string
  fileName: string
  size: number
  bytes: Uint8Array
  /** 注册到 document.fonts 后使用的字体族名 */
  cssFamily: string
  status: 'loading' | 'ready' | 'error'
  parsed?: ParsedFont
  /** 解析失败的原始信息（错误码或错误消息） */
  error?: string
}

interface FontLibraryState {
  fonts: FontEntry[]
  activeId: string | null
  addFiles: (files: File[]) => Promise<void>
  removeFont: (id: string) => void
  clearAll: () => void
  setActive: (id: string) => void
}

/** 字体二进制体积较大，不写入 localStorage，仅保留在当前会话内存中 */
const registeredFaces = new Map<string, FontFace>()
let seq = 0

const KNOWN_ERRORS = new Set([
  'UNSUPPORTED_FONT_FORMAT',
  'FONT_COLLECTION_UNSUPPORTED',
  'NOT_A_FONT_FILE',
  'INVALID_FONT_FILE',
  'WOFF2_INVALID_BASE128',
  'WOFF2_BASE128_OVERFLOW',
  'UNSUPPORTED_BROWSER',
])

function normalizeError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  if (KNOWN_ERRORS.has(message)) return message
  return `UNKNOWN:${message}`
}

function mimeOf(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase()
  if (ext === 'woff2') return 'font/woff2'
  if (ext === 'woff') return 'font/woff'
  if (ext === 'otf') return 'font/otf'
  return 'font/ttf'
}

function createId(): string {
  seq += 1
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `font-${Date.now()}-${seq}`
}

export const useFontLibrary = create<FontLibraryState>()((set, get) => ({
  fonts: [],
  activeId: null,

  addFiles: async (files) => {
    if (files.length === 0) return

    const entries: FontEntry[] = files.map((file) => {
      seq += 1
      return {
        id: createId(),
        fileName: file.name,
        size: file.size,
        bytes: new Uint8Array(0),
        cssFamily: `IconFontPreview-${seq}`,
        status: 'loading',
      }
    })

    // 新导入的字体直接切到预览，避免还停留在上一个字体上
    set({
      fonts: [...get().fonts, ...entries],
      activeId: entries[0]?.id ?? get().activeId,
    })

    await Promise.all(
      entries.map(async (entry, index) => {
        try {
          const file = files[index]
          const buffer = await file.arrayBuffer()
          const bytes = new Uint8Array(buffer)
          const parsed = await parseFont(buffer, file.name)
          if (parsed.glyphs.length === 0) throw new Error('INVALID_FONT_FILE')

          const url = URL.createObjectURL(new Blob([bytes.slice().buffer], { type: mimeOf(file.name) }))
          const face = new FontFace(entry.cssFamily, `url(${url})`)
          await face.load()
          document.fonts.add(face)
          registeredFaces.set(entry.id, face)

          set({
            fonts: get().fonts.map((item) =>
              item.id === entry.id ? { ...item, bytes, status: 'ready', parsed } : item,
            ),
          })
        } catch (error) {
          set({
            fonts: get().fonts.map((item) =>
              item.id === entry.id ? { ...item, status: 'error', error: normalizeError(error) } : item,
            ),
          })
        }
      }),
    )
  },

  removeFont: (id) => {
    const face = registeredFaces.get(id)
    if (face) {
      document.fonts.delete(face)
      registeredFaces.delete(id)
    }
    const remaining = get().fonts.filter((item) => item.id !== id)
    set({
      fonts: remaining,
      activeId: get().activeId === id ? (remaining[0]?.id ?? null) : get().activeId,
    })
  },

  clearAll: () => {
    registeredFaces.forEach((face) => document.fonts.delete(face))
    registeredFaces.clear()
    set({ fonts: [], activeId: null })
  },

  setActive: (id) => set({ activeId: id }),
}))
