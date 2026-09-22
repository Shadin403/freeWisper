/**
 * Electron Preload Script
 * Securely bridges Native Node.js / Electron capabilities to React Frontend
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Config & Storage
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  updateConfig: (partial) => ipcRenderer.invoke('update-config', partial),

  // History
  getHistory: (query) => ipcRenderer.invoke('get-history', query),
  addHistory: (entry) => ipcRenderer.invoke('add-history', entry),
  clearHistory: () => ipcRenderer.invoke('clear-history'),

  // Windows & Layout
  openSettings: () => ipcRenderer.invoke('open-settings'),
  closeSettings: () => ipcRenderer.invoke('close-settings'),
  centerWidget: () => ipcRenderer.invoke('center-widget'),
  setWidgetSize: (width, height) => ipcRenderer.invoke('set-widget-size', { width, height }),
  setWidgetPosition: (x, y) => ipcRenderer.invoke('set-widget-position', { x, y }),

  // Auto-Paste
  autoPaste: (text) => ipcRenderer.invoke('auto-paste', text),

  // AI & STT Engine Calls
  processVoicePipeline: (audioData, preset, options) => ipcRenderer.invoke('process-voice-pipeline', { audioData, preset, options }),
  transcribeAudio: (audioData, options) => ipcRenderer.invoke('transcribe-audio', { audioData, options }),
  refineText: (transcription, preset, options) => ipcRenderer.invoke('refine-text', { transcription, preset, options }),
  fetchModels: (baseUrl, apiKey) => ipcRenderer.invoke('fetch-models', { baseUrl, apiKey }),
  testSTT: (config) => ipcRenderer.invoke('test-stt', config),
  testAI: (config) => ipcRenderer.invoke('test-ai', config),

  // GitHub Release Updater
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: (installer) => ipcRenderer.invoke('download-update', installer),
  installUpdate: (filePath) => ipcRenderer.invoke('install-update', filePath),
  openReleasePage: () => ipcRenderer.invoke('open-release-page'),
  onUpdateDownloadProgress: (callback) => {
    const handler = (_event, progress) => callback(progress);
    ipcRenderer.on('update-download-progress', handler);
    return () => ipcRenderer.removeListener('update-download-progress', handler);
  },
  openExternal: (url) => ipcRenderer.invoke('open-external', url),

  // Auto-Start on Windows Boot
  setAutoStart: (enable) => ipcRenderer.invoke('set-autostart', enable),
  getAutoStart: () => ipcRenderer.invoke('get-autostart'),

  // Hotkey Events (from Main to Renderer)
  onToggleRecord: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('toggle-record', handler);
    return () => ipcRenderer.removeListener('toggle-record', handler);
  },
  onCycleMode: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('cycle-mode', handler);
    return () => ipcRenderer.removeListener('cycle-mode', handler);
  },
  onResetWidgetPosition: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('reset-widget-position', handler);
    return () => ipcRenderer.removeListener('reset-widget-position', handler);
  },
});
