/** IPC channel names, shared by main and preload. */
export const IPC = {
  state: 'perch:state',
  reveal: 'perch:reveal',
  ready: 'perch:ready',
  startDrag: 'perch:start-drag',
  action: 'perch:action',
  hover: 'perch:hover',
  height: 'perch:height',
  getSettings: 'perch:get-settings',
  saveSettings: 'perch:save-settings',
  closeSettings: 'perch:close-settings',
  appInfo: 'perch:app-info'
} as const
