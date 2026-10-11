import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'
import geminiApiPlugin from './scripts/vite-gemini.mjs'
export default defineConfig(({mode})=>({plugins:[react(),geminiApiPlugin(mode)]}))
