import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import UaiConta from './App.jsx'
import GlobalBiometricLock from './components/GlobalBiometricLock.jsx'
import PostAuthTransition from './components/PostAuthTransition.jsx'
import './index.css'

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js', { updateViaCache: 'none' })
      .then((registration) => registration.update().catch(() => undefined))
      .catch(() => undefined)
  })
}

const root = document.getElementById('root')
ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <BrowserRouter>
      <UaiConta />
      <GlobalBiometricLock />
      <PostAuthTransition />
    </BrowserRouter>
  </React.StrictMode>,
)

// The production CSP intentionally blocks inline scripts. Remove the static
// mobile splash from this external module so Safari can never remain trapped
// behind the startup screen after React has mounted.
const splash = document.getElementById('uai-mobile-splash')
if (splash) {
  window.setTimeout(() => splash.remove(), 1700)
}
