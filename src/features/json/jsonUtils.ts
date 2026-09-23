/** JSON 解析 / 排序 / 统计等纯函数，不依赖 React 与全局状态 */

/** JSON 输出的缩进方式 */
export type JsonIndent = 2 | 4 | 'tab'

export interface JsonErrorInfo {
  message: string
  line?: number
  column?: number
  position?: number
}

export type JsonParseResult =
  | { ok: true; value: unknown }
  | { ok: false; error: JsonErrorInfo }

export type JsonRootType = 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null'

export interface JsonStats {
  chars: number
  lines: number
  keys: number
  nodes: number
  depth: number
  rootType: JsonRootType
}

/** 从 JSON.parse 的报错信息里提取行列位置 */
function extractErrorInfo(error: unknown, source: string): JsonErrorInfo {
  const message = error instanceof Error ? error.message : String(error)
  const positionMatch = /position (\d+)/.exec(message)
  const lineColumnMatch = /line (\d+) column (\d+)/.exec(message)

  if (lineColumnMatch) {
    return {
      message,
      line: Number(lineColumnMatch[1]),
      column: Number(lineColumnMatch[2]),
      position: positionMatch ? Number(positionMatch[1]) : undefined,
    }
  }

  if (positionMatch) {
    const position = Number(positionMatch[1])
    const before = source.slice(0, position)
    const lines = before.split('\n')
    return { message, position, line: lines.length, column: lines[lines.length - 1].length + 1 }
  }

  return { message }
}

export function parseJson(source: string): JsonParseResult {
  try {
    return { ok: true, value: JSON.parse(source) as unknown }
  } catch (error) {
    return { ok: false, error: extractErrorInfo(error, source) }
  }
}

export function rootTypeOf(value: unknown): JsonRootType {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  return typeof value as JsonRootType
}

/** 递归按键名排序（数组保持原顺序） */
export function sortJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortJsonValue)
  if (value !== null && typeof value === 'object') {
    const source = value as Record<string, unknown>
    const sorted: Record<string, unknown> = {}
    for (const key of Object.keys(source).sort((a, b) => a.localeCompare(b))) {
      sorted[key] = sortJsonValue(source[key])
    }
    return sorted
  }
  return value
}

export function stringifyJson(value: unknown, indent: JsonIndent, minify: boolean): string {
  if (minify) return JSON.stringify(value)
  return JSON.stringify(value, null, indent === 'tab' ? '\t' : indent)
}

export function analyzeJson(value: unknown, source: string): JsonStats {
  let keys = 0
  let nodes = 0
  let depth = 0

  const walk = (node: unknown, level: number): void => {
    nodes += 1
    depth = Math.max(depth, level)
    if (Array.isArray(node)) {
      node.forEach((child) => walk(child, level + 1))
      return
    }
    if (node !== null && typeof node === 'object') {
      const entries = Object.entries(node as Record<string, unknown>)
      keys += entries.length
      entries.forEach(([, child]) => walk(child, level + 1))
    }
  }

  walk(value, 1)

  return {
    chars: source.length,
    lines: source ? source.split('\n').length : 0,
    keys,
    nodes,
    depth,
    rootType: rootTypeOf(value),
  }
}
