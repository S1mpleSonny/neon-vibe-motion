import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './locales/i18n'
import { AppRouter } from './router'

// 清理旧的主题偏好数据（仅保留默认主题）
localStorage.removeItem('motion-platform:theme-preference')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppRouter />
  </StrictMode>
)
