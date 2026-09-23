import type { SVGProps } from 'react'
import type { IconName } from '@/assets/svg'

export type { IconName }

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName
  size?: number
}

/**
 * 图标。
 *
 * 图形本体是 src/assets/svg 下的 .svg 文件（可单独打开预览、直接改路径数据），
 * 由 <IconSprite /> 统一编译成 <symbol> 精灵图，这里只负责引用：
 *   - 引用 id 固定为 `icon-<文件名>`；
 *   - 尺寸用 size（宽高），缩放由 symbol 的 viewBox 完成；
 *   - 颜色跟随 currentColor，所以在父级设置 color 即可（描边粗细等也在 .svg 文件里定义）。
 */
export function Icon({ name, size = 18, ...rest }: IconProps) {
  return (
    <svg width={size} height={size} aria-hidden="true" focusable="false" {...rest}>
      <use href={`#icon-${name}`} />
    </svg>
  )
}
