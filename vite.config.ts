import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import pxtorem from 'postcss-pxtorem'
import { defineConfig } from 'vite'

// ============================================================================
// 尺寸适配：设计稿宽度 1920
//
//   - 构建期：postcss-pxtorem 把样式里按设计稿写的 px 编译成 rem（1rem = 16px）
//   - 运行期：src/utils/rem.ts 按 clientWidth 算出 <html> 的 font-size
//
// 于是样式里一律写设计稿 px，整站随视口等比缩放。行内样式里的【动态值】
// （比如字号滑杆）构建期拿不到，用 @/utils/rem 的 toRem() 在运行时换算。
// ============================================================================
const stylesDir = fileURLToPath(new URL('./src/assets/styles', import.meta.url))

export default defineConfig({
  plugins: [react()],
  // 使用相对路径，便于部署到任意静态目录 / 子路径
  base: './',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        // 每个被 JS 引入的 .scss 自动带上变量与 mixin（_helper 只转发无输出的模块）
        additionalData: "@use 'helper' as *;\n",
        // 让 @use 'mixins' 这类写法不用写相对路径
        loadPaths: [stylesDir],
      },
    },
    postcss: {
      plugins: [
        pxtorem({
          /** 换算比例：设计稿 Npx → N / rootValue rem（1920 稿下 1rem = 16px） */
          rootValue: 16,
          /** 换算结果保留的小数位 */
          unitPrecision: 5,
          /** 所有属性都换算（插件默认只处理 font / font-size / line-height / letter-spacing） */
          propList: ['*'],
          /** 小于该值的 px 不换算，保留 1px 细边框这类真实像素 */
          minPixelValue: 2,
          /**
           * 不换算的选择器：_base.scss 里的兜底根字号（rem 表达不了根字号本身）。
           * 也是「整条规则保留真实像素」的唯一后门，值里的 var() / url() 插件会自动跳过。
           */
          selectorBlackList: ['html:root'],
          /**
           * 注意：插件判的是 `pixels < minPixelValue`，不取绝对值，所以
           * 负值 px（如 top: -8px）不会被换算，得写成 calc(-1 * 8px)，
           * 见 src/pages/HomePage/HomePage.scss 的 .home__glow。
           */
          /** 媒体查询里的 px 是视口宽度，不换算 */
          mediaQuery: false,
        }),
      ],
    },
  },
  server: {
    port: 5273,
    open: false,
  },
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        // brotli 仅在做 woff2 解析时用到，单独拆包避免拖慢首屏
        manualChunks(id: string) {
          if (id.includes('node_modules/brotli')) return 'brotli'
          if (id.includes('node_modules/i18next')) return 'i18n'
          if (id.includes('node_modules/react')) return 'vendor'
          return undefined
        },
      },
    },
  },
})
