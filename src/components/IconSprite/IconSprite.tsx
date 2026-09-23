import { ICON_SOURCES } from '@/assets/svg'
import './IconSprite.scss'

interface SymbolData {
  id: string
  viewBox: string
  attrs: Record<string, string>
  content: string
}

/** 从单个 .svg 源码里取出 <symbol> 需要的数据 */
function parseSymbol(name: string, source: string): SymbolData {
  const rawAttrs = /<svg\b([^>]*)>/i.exec(source)?.[1] ?? ''

  const attrs: Record<string, string> = {}
  for (const [, key, value] of rawAttrs.matchAll(/([a-zA-Z:-]+)="([^"]*)"/g)) {
    // xmlns 由精灵图根元素提供；viewBox 单独传递；宽高交给 <Icon> 的 size
    if (key === 'xmlns' || key === 'viewBox' || key === 'width' || key === 'height') continue
    // 其余表现属性（fill / stroke / stroke-width…）原样搬到 symbol 上，保证图形与文件一致
    attrs[key] = value
  }

  return {
    id: `icon-${name}`,
    viewBox: /viewBox="([^"]*)"/.exec(rawAttrs)?.[1] ?? '0 0 24 24',
    attrs,
    // <svg> 标签之外的内部图形
    content: source
      .replace(/^[\s\S]*?<svg\b[^>]*>/i, '')
      .replace(/<\/svg>[\s\S]*$/i, '')
      .trim(),
  }
}

/** 图标 → <symbol>，模块加载时编译一次 */
const SYMBOLS = Object.entries(ICON_SOURCES).map(([name, source]) => parseSymbol(name, source))

/**
 * SVG 精灵图：把 src/assets/svg 下所有图标编译成 <symbol>，全应用只挂一次（见 App.tsx）。
 * <Icon name="home" /> 内部通过 <use href="#icon-home" /> 引用这里的 symbol。
 *
 * 注：内容来自项目自己的 .svg 文件（构建期确定，非用户输入），因此这里的
 * dangerouslySetInnerHTML 是安全的；这样任意结构的 SVG 都能原样进精灵图。
 */
export function IconSprite() {
  return (
    <svg className="icon-sprite" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
      {SYMBOLS.map((symbol) => (
        <symbol
          key={symbol.id}
          id={symbol.id}
          viewBox={symbol.viewBox}
          {...symbol.attrs}
          dangerouslySetInnerHTML={{ __html: symbol.content }}
        />
      ))}
    </svg>
  )
}
