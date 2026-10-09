import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/urbanist'
import '@fontsource/instrument-serif/400.css'
import '@fontsource/instrument-serif/400-italic.css'
import '@/shared/theme/tokens.css'
import '@/shared/theme/motion.css'
import './index.css'
import { App } from './app/App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
