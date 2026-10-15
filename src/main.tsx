import React from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import App from './App.tsx'
import { initialContent, validContent } from './content'
import {resolvePublishedTranslations} from './lib/localized-content'
import './index.css'
const root = document.getElementById('root')!
let content = initialContent
try { const parsed: unknown = JSON.parse(document.getElementById('kumeel-content')?.textContent || 'null'); if (validContent(parsed)) content = parsed } catch { /* Use bundled content if bootstrap data is missing. */ }
void resolvePublishedTranslations(content).then(safe=>{
 const app = <React.StrictMode><App startingContent={safe} startingPath={window.location.pathname} /></React.StrictMode>
 if (root.hasChildNodes()) hydrateRoot(root, app)
 else createRoot(root).render(app)
})
