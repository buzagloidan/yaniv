import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { PostHogProvider } from '@posthog/react'
import { getAnalyticsClient } from './analytics'

const posthogClient = getAnalyticsClient()
const app = <App />
const wrappedApp = posthogClient ? <PostHogProvider client={posthogClient}>{app}</PostHogProvider> : app

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {wrappedApp}
  </StrictMode>,
)
