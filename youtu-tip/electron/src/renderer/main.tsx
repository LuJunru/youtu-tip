import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import { SettingsApp } from './SettingsApp'
import { SessionApp } from './SessionApp'
import { ChatApp } from './ChatApp'
import { IndicatorApp } from './IndicatorApp'
import { ReportApp } from './ReportApp'
import { GuideApp } from './GuideApp'
import './styles/tailwind.css'

const params = new URLSearchParams(window.location.search)
const hash = window.location.hash?.replace(/^#/, '')
const view = params.get('view') || (hash === 'settings' ? 'settings' : null)
let RootComponent = App
if (view === 'settings') {
  RootComponent = SettingsApp
} else if (view === 'session') {
  RootComponent = SessionApp
} else if (view === 'chat') {
  RootComponent = ChatApp
} else if (view === 'indicator') {
  RootComponent = IndicatorApp
} else if (view === 'report') {
  RootComponent = ReportApp
} else if (view === 'guide') {
  RootComponent = GuideApp
}
console.info('[Tip] renderer init', { href: window.location.href, view })

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <RootComponent />
  </React.StrictMode>,
)
