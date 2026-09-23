/**
 * 尺寸适配（rem 方案）—— 全站缩放的运行时开关。
 *
 * 分工：
 *   - 构建期：vite.config.ts 里的 postcss-pxtorem 把样式里按设计稿写的 px 编译成 rem；
 *   - 运行期：本模块监听窗口变化，把算好的根元素 font-size 写到 <html> 上，
 *     所有 rem 尺寸随之等比缩放。
 *
 * 基准与 vite.config.ts 里 postcss-pxtorem 的 rootValue 保持一致：1920 设计稿下 1rem = 16px。
 */

/** 设计稿宽度 */
export const DESIGN_WIDTH = 1920

/** 设计稿下 1rem 对应的 px（= vite.config.ts 里 pxtorem 的 rootValue） */
export const DESIGN_ROOT_FONT_SIZE = 16

/** 根字号下限：窄屏不再继续缩小，保证可读性 */
const ROOT_FONT_SIZE_MIN = 15

/** 根字号上限：超宽屏不再继续放大 */
const ROOT_FONT_SIZE_MAX = 20

/** 按当前视口宽度算出根字号（px） */
function resolveRootFontSize(): number {
  // 用 clientWidth 而不是 innerWidth / 100vw：clientWidth 不含滚动条宽度，尺寸更准
  const width = document.documentElement.clientWidth || window.innerWidth
  const size = (width / DESIGN_WIDTH) * DESIGN_ROOT_FONT_SIZE
  return Math.min(ROOT_FONT_SIZE_MAX, Math.max(ROOT_FONT_SIZE_MIN, size))
}

/**
 * 监听窗口变化并更新根元素 font-size。首屏渲染前调用一次，之后：
 *   - resize / 横竖屏切换 / 前进后退恢复页面 都会重算；
 *   - 没有 resize 事件但 clientWidth 变了（比如滚动条出现）时，由 ResizeObserver 兜住；
 *   - 值没变就不写样式，避免触发无谓的重排；一个刷新帧内多次触发只算一次。
 */
export function setupRootFontSize(): void {
  const apply = () => {
    const next = `${resolveRootFontSize()}px`
    const root = document.documentElement
    if (root.style.fontSize === next) return
    root.style.fontSize = next
  }

  let queued = false
  const schedule = () => {
    if (queued) return
    queued = true
    requestAnimationFrame(() => {
      queued = false
      apply()
    })
  }

  apply()
  window.addEventListener('resize', schedule, { passive: true })
  window.addEventListener('orientationchange', schedule, { passive: true })
  window.addEventListener('pageshow', schedule, { passive: true })

  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(schedule).observe(document.documentElement)
  }
}

/**
 * 行内样式的动态尺寸换算：把设计稿 px 换算成 rem。
 * 构建期插件处理不了运行时才知道的值（比如字号滑杆），这类值用 toRem()。
 *
 * @example style={{ fontSize: toRem(previewSize) }}
 */
export function toRem(designPx: number): string {
  return `${designPx / DESIGN_ROOT_FONT_SIZE}rem`
}
