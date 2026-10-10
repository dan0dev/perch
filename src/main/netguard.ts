import { app, session, type WebContents } from 'electron'

/** Schemes the app may load. Everything else (http, https, ws…) is cancelled. */
function isAllowed(url: string): boolean {
  if (url.startsWith('file:') || url.startsWith('data:') || url.startsWith('devtools:') || url.startsWith('chrome-extension:')) {
    return true
  }
  // The Vite dev server, only in development.
  const dev = process.env.ELECTRON_RENDERER_URL
  if (!app.isPackaged && dev) {
    const origin = new URL(dev).origin
    const wsOrigin = origin.replace(/^http/, 'ws')
    return url.startsWith(origin) || url.startsWith(wsOrigin)
  }
  return false
}

/** Perch makes no network calls. This makes sure the renderer can't either. */
export function installNetGuard(): void {
  session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
    const ok = isAllowed(details.url)
    if (!ok) console.warn('[perch] blocked request:', details.url)
    callback({ cancel: !ok })
  })
  session.defaultSession.setPermissionRequestHandler((_wc, _perm, cb) => cb(false))
  app.on('web-contents-created', (_e, wc: WebContents) => {
    wc.on('will-navigate', (e) => e.preventDefault())
    wc.setWindowOpenHandler(() => ({ action: 'deny' }))
  })
}
