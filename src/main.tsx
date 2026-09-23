import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/assets/styles/index.scss'
import { App } from '@/App'
import '@/locales/i18n'
import { setupAppSync } from '@/store'
import { setupRootFontSize } from '@/utils/rem'

// 尺寸适配：先定好根字号再渲染，避免首屏尺寸跳动
setupRootFontSize()
setupAppSync()

const container = document.getElementById('root')
if (!container) throw new Error('Root container #root not found')

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
