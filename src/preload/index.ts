import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import { IPC } from '../shared/ipc'
import type { CardAction, PerchApi, Settings, SettingsResult, ShelfState } from '../shared/types'

function listen<T>(channel: string, cb: (value: T) => void): () => void {
  const handler = (_e: IpcRendererEvent, value: T): void => cb(value)
  ipcRenderer.on(channel, handler)
  return () => ipcRenderer.removeListener(channel, handler)
}

const api: PerchApi = {
  onState: (cb) => listen<ShelfState>(IPC.state, cb),
  onReveal: (cb) => listen<boolean>(IPC.reveal, cb),
  ready: () => ipcRenderer.send(IPC.ready),
  startDrag: (ids: string[]) => ipcRenderer.send(IPC.startDrag, ids),
  action: (id: string, action: CardAction) => ipcRenderer.send(IPC.action, id, action),
  setHover: (hovering: boolean) => ipcRenderer.send(IPC.hover, hovering),
  reportHeight: (px: number) => ipcRenderer.send(IPC.height, px),
  getSettings: () => ipcRenderer.invoke(IPC.getSettings) as Promise<Settings>,
  saveSettings: (next: Settings) => ipcRenderer.invoke(IPC.saveSettings, next) as Promise<SettingsResult>,
  closeSettings: () => ipcRenderer.send(IPC.closeSettings)
}

contextBridge.exposeInMainWorld('perch', api)
