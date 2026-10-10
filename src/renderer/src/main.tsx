import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Shelf } from './Shelf'
import { SettingsView } from './Settings'
import './styles.css'

const isSettings = location.hash === '#settings'
document.documentElement.dataset.view = isSettings ? 'settings' : 'shelf'

createRoot(document.getElementById('root')!).render(
  <StrictMode>{isSettings ? <SettingsView /> : <Shelf />}</StrictMode>
)
