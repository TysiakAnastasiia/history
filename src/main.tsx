import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { AuthGate } from './components/AuthGate'
import { consumeAuthRedirect } from './lib/auth'
import { getSupabase } from './lib/storage'

// Спершу забираємо токени входу з адреси, потім запускаємо застосунок
void consumeAuthRedirect(getSupabase).finally(() =>
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      {/* HashRouter: на GitHub Pages немає серверних редиректів, тому маршрути йдуть після # */}
      <HashRouter>
        <AuthGate>
          <App />
        </AuthGate>
      </HashRouter>
    </StrictMode>,
  ),
)
