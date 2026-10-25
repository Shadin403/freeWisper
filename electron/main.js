/**
 * FreeWispr Voice Assistant - Electron Main Process
 * Handles system permissions, floating widget, settings window, and IPC pipeline.
 */

const { app, BrowserWindow, ipcMain, globalShortcut, Tray, Menu, screen, nativeImage, session, powerMonitor } = require('electron');
const path = require('path');
const fs = require('fs');
const storage = require('./db');
const autoPaster = require('./autoPaste');
const aiEngine = require('./aiEngine');
const autoStarter = require('./autoStart');
const updater = require('./updater');

let widgetWindow = null;
let settingsWindow = null;
let chatWindow = null;
let tray = null;
let widgetWatchdog = null;

// Set application identity BEFORE any window is created. This controls the
// Windows taskbar title, jump-list name, notifications and icon grouping.
app.setName('FreeWispr Voice Assistant');
if (process.platform === 'win32') {
  app.setAppUserModelId('com.freewispr.voicetyping');
}

// Single Instance Lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  process.exit(0);
}

app.on('second-instance', () => {
  showOrRestoreWidget();
});

// Robustly show the widget; recreate it if it was accidentally destroyed
function showOrRestoreWidget() {
  if (!widgetWindow || widgetWindow.isDestroyed()) {
    createWidgetWindow();
    return;
  }
  try {
    if (widgetWindow.isMinimized()) widgetWindow.restore();
    widgetWindow.show();
    widgetWindow.setAlwaysOnTop(true, 'screen-saver');
    widgetWindow.setVisibleOnAllWorkspaces(true);

    // Sanity check coordinates so it never hides off-screen
    const [curX, curY] = widgetWindow.getPosition();
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenW, height: screenH } = primaryDisplay.workAreaSize;
    if (curX < 0 || curX > screenW - 60 || curY < 0 || curY > screenH - 40) {
      const width = widgetWindow.getBounds().width || 280;
      widgetWindow.setPosition(Math.round((screenW - width) / 2), Math.round(screenH - 100));
    }
  } catch (err) {
    console.error('showOrRestoreWidget error:', err);
    createWidgetWindow();
  }
}

function startWidgetWatchdog() {
  if (widgetWatchdog) clearInterval(widgetWatchdog);
  widgetWatchdog = setInterval(() => {
    if (app.isQuitting) return;
    if (!widgetWindow || widgetWindow.isDestroyed()) {
      createWidgetWindow();
      return;
    }
    try {
      if (!widgetWindow.isVisible()) {
        widgetWindow.show();
      }
      if (widgetWindow.isMinimized()) {
        widgetWindow.restore();
      }
      if (!widgetWindow.isAlwaysOnTop()) {
        widgetWindow.setAlwaysOnTop(true, 'screen-saver');
      }
      const [curX, curY] = widgetWindow.getPosition();
      const primaryDisplay = screen.getPrimaryDisplay();
      const { width: screenW, height: screenH } = primaryDisplay.workAreaSize;
      if (curX < -50 || curX > screenW || curY < -30 || curY > screenH) {
        const width = widgetWindow.getBounds().width || 280;
        widgetWindow.setPosition(Math.round((screenW - width) / 2), Math.round(screenH - 100));
      }
    } catch (e) {
      // ignore
    }
  }, 3500);
}

function loadView(windowInstance, viewName) {
  const distIndex = path.join(__dirname, '../dist/index.html');
  if (process.env.VITE_DEV_SERVER_URL) {
    windowInstance.loadURL(`${process.env.VITE_DEV_SERVER_URL}?view=${viewName}`);
  } else if (fs.existsSync(distIndex)) {
    windowInstance.loadFile(distIndex, { query: { view: viewName } });
  } else {
    windowInstance.loadURL(`http://localhost:5173?view=${viewName}`);
  }
}

function createWidgetWindow() {
  const config = storage.getConfig();
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenW, height: screenH } = primaryDisplay.workAreaSize;

  const width = config.ui?.widget_collapsed ? 110 : 280;
  const height = 48;

  let x = config.ui?.pill_position_x;
  let y = config.ui?.pill_position_y;

  if (x == null || y == null || x < 10 || x > screenW - 100 || y < 10 || y > screenH - 50) {
    x = Math.round((screenW - width) / 2);
    y = Math.round(screenH - height - 60);
  }

  const iconPath = path.join(__dirname, 'icon.png');

  widgetWindow = new BrowserWindow({
    width,
    height,
    x,
    y,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    icon: iconPath,
    focusable: false,        // Clicking the widget NEVER steals focus from your input field
    acceptFirstMouse: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  widgetWindow.setAlwaysOnTop(true, 'screen-saver');
  widgetWindow.setVisibleOnAllWorkspaces(true);

  // Prevent the widget from ever being hidden or closed unintentionally
  widgetWindow.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      widgetWindow.show();
      widgetWindow.setAlwaysOnTop(true, 'screen-saver');
    }
  });

  // If Windows minimized it (Win+D / Show Desktop), snap it back on top immediately
  widgetWindow.on('minimize', (e) => {
    e.preventDefault();
    if (widgetWindow && !widgetWindow.isDestroyed()) {
      widgetWindow.restore();
      widgetWindow.show();
      widgetWindow.setAlwaysOnTop(true, 'screen-saver');
    }
  });

  // Auto-reload if the WebContents render process ever crashes or unloads
  widgetWindow.webContents.on('render-process-gone', (event, details) => {
    console.warn('Widget render process gone, reloading view:', details);
    if (widgetWindow && !widgetWindow.isDestroyed()) {
      loadView(widgetWindow, 'widget');
    }
  });

  loadView(widgetWindow, 'widget');

  widgetWindow.on('moved', () => {
    if (widgetWindow && !widgetWindow.isDestroyed()) {
      const [newX, newY] = widgetWindow.getPosition();
      const primaryDisplay = screen.getPrimaryDisplay();
      const { width: screenW, height: screenH } = primaryDisplay.workAreaSize;
      // Only persist coordinates if they are cleanly on-screen
      if (newX >= 0 && newX <= screenW - 80 && newY >= 0 && newY <= screenH - 40) {
        storage.updateConfig({
          ui: {
            ...storage.getConfig().ui,
            pill_position_x: newX,
            pill_position_y: newY,
          },
        });
      }
    }
  });

  widgetWindow.on('closed', () => {
    widgetWindow = null;
  });
}

function openChatWindow() {
  if (chatWindow && !chatWindow.isDestroyed()) {
    if (chatWindow.isMinimized()) chatWindow.restore();
    chatWindow.show();
    chatWindow.focus();
    return;
  }

  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenW, height: screenH } = primaryDisplay.workAreaSize;
  const width = 430;
  const height = 620;

  let x = screenW - width - 40;
  let y = Math.max(40, screenH - height - 80);

  if (widgetWindow && !widgetWindow.isDestroyed()) {
    const [wX, wY] = widgetWindow.getPosition();
    const wBounds = widgetWindow.getBounds();
    x = Math.round(wX + (wBounds.width - width) / 2);
    y = Math.round(wY - height - 16);
    x = Math.max(16, Math.min(x, screenW - width - 16));
    if (y < 20) {
      y = Math.max(20, Math.min(wY + wBounds.height + 16, screenH - height - 20));
    }
  }

  const iconPath = path.join(__dirname, 'icon.png');

  chatWindow = new BrowserWindow({
    width,
    height,
    minWidth: 350,
    minHeight: 460,
    x,
    y,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: false,
    resizable: true,
    hasShadow: true,
    icon: iconPath,
    backgroundColor: '#0B0C13',
    title: 'FreeWispr AI Chat',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  loadView(chatWindow, 'chat');

  chatWindow.on('closed', () => {
    chatWindow = null;
  });
}

function toggleChatWindow() {
  if (chatWindow && !chatWindow.isDestroyed() && chatWindow.isVisible()) {
    chatWindow.close();
  } else {
    openChatWindow();
  }
}

function openSettingsWindow() {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.show();
    settingsWindow.focus();
    return;
  }

  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenW, height: screenH } = primaryDisplay.workAreaSize;

  const iconPath = path.join(__dirname, 'icon.png');

  settingsWindow = new BrowserWindow({
    width: 840,
    height: 740,
    minWidth: 780,
    minHeight: 660,
    center: true,
    frame: true,
    icon: iconPath,
    backgroundColor: '#0B0C13',
    autoHideMenuBar: true,
    title: 'FreeWispr Control Center',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  loadView(settingsWindow, 'settings');

  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });
}

function createTray() {
  const trayIconPath = path.join(__dirname, 'tray-icon.png');
  const appIconPath = path.join(__dirname, 'icon.png');

  let iconImg;
  if (fs.existsSync(trayIconPath)) {
    iconImg = nativeImage.createFromPath(trayIconPath);
  } else if (fs.existsSync(appIconPath)) {
    iconImg = nativeImage.createFromPath(appIconPath);
  } else {
    iconImg = nativeImage.createEmpty();
  }

  tray = new Tray(iconImg);
  tray.setToolTip('FreeWispr Voice Assistant');

  const updateMenu = () => {
    const config = storage.getConfig();
    const presets = config.presets || [];
    const activePresetId = config.active_preset_id;

    const presetMenuItems = presets.map((p) => ({
      label: `${p.icon || '✨'} ${p.name}`,
      type: 'radio',
      checked: p.id === activePresetId,
      click: () => {
        storage.updateConfig({ active_preset_id: p.id });
        if (widgetWindow) widgetWindow.webContents.send('cycle-mode');
        updateMenu();
      },
    }));

    const contextMenu = Menu.buildFromTemplate([
      {
        label: '💬 Open AI Chat',
        click: () => openChatWindow(),
      },
      {
        label: '🎙️ Toggle Voice Typing',
        click: () => {
          if (widgetWindow) widgetWindow.webContents.send('toggle-record');
        },
      },
      {
        label: '✨ Active AI Mode',
        submenu: presetMenuItems,
      },
      { type: 'separator' },
      {
        label: '📍 Center Floating Widget',
        click: () => {
          showOrRestoreWidget();
          if (widgetWindow) {
            const primaryDisplay = screen.getPrimaryDisplay();
            const { width: screenW, height: screenH } = primaryDisplay.workAreaSize;
            const width = widgetWindow.getBounds().width;
            const x = Math.round((screenW - width) / 2);
            const y = Math.round(screenH - 100);
            widgetWindow.setPosition(x, y);
            widgetWindow.show();
          }
        },
      },
      {
        label: '👁️ Show Floating Widget',
        click: () => showOrRestoreWidget(),
      },
      {
        label: '⚙️ Settings & API Keys',
        click: () => openSettingsWindow(),
      },
      { type: 'separator' },
      {
        label: '❌ Exit FreeWispr',
        click: () => {
          app.isQuitting = true;
          app.quit();
        },
      },
    ]);

    tray.setContextMenu(contextMenu);
  };

  updateMenu();
  tray.on('double-click', () => openSettingsWindow());
}

function registerGlobalHotkeys() {
  globalShortcut.unregisterAll();
  const config = storage.getConfig();
  const hotkey = config.hotkeys?.record_toggle || 'F8';

  try {
    const registered = globalShortcut.register(hotkey, () => {
      if (!widgetWindow || widgetWindow.isDestroyed()) {
        createWidgetWindow();
        return;
      }
      widgetWindow.webContents.send('toggle-record');
    });

    if (registered) {
      console.log(`Registered global hotkey: ${hotkey}`);
    } else {
      console.warn(`Failed to register global hotkey: ${hotkey}`);
    }
  } catch (e) {
    console.error('Error registering global hotkey:', e);
  }
}

// IPC Handlers
ipcMain.handle('get-config', () => storage.getConfig());
ipcMain.handle('save-config', (e, config) => {
  storage.saveConfig(config);
  registerGlobalHotkeys();
  if (config.ui && typeof config.ui.autostart_on_boot !== 'undefined') {
    autoStarter.setAutoStart(Boolean(config.ui.autostart_on_boot));
  }
  return true;
});
ipcMain.handle('update-config', (e, partial) => {
  const updated = storage.updateConfig(partial);
  registerGlobalHotkeys();
  if (partial.ui && typeof partial.ui.autostart_on_boot !== 'undefined') {
    autoStarter.setAutoStart(Boolean(partial.ui.autostart_on_boot));
  }
  return updated;
});

ipcMain.handle('set-autostart', (e, enable) => autoStarter.setAutoStart(enable));
ipcMain.handle('get-autostart', () => autoStarter.isAutoStartEnabled());

ipcMain.handle('get-history', (e, query) => storage.getHistory(query));
ipcMain.handle('add-history', (e, entry) => storage.addHistoryEntry(entry));
ipcMain.handle('clear-history', () => storage.clearHistory());

ipcMain.handle('open-settings', () => openSettingsWindow());
ipcMain.handle('close-settings', () => {
  if (settingsWindow) settingsWindow.close();
});

ipcMain.handle('set-widget-size', (e, { width, height }) => {
  if (widgetWindow && !widgetWindow.isDestroyed()) {
    const [curX, curY] = widgetWindow.getPosition();
    const curWidth = widgetWindow.getBounds().width;
    const dx = Math.round((curWidth - width) / 2);
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenW, height: screenH } = primaryDisplay.workAreaSize;
    const targetX = Math.max(10, Math.min(curX + dx, screenW - width - 10));
    const targetY = Math.max(10, Math.min(curY, screenH - height - 10));
    widgetWindow.setBounds({
      x: targetX,
      y: targetY,
      width,
      height,
    });
  }
});

ipcMain.handle('set-widget-position', (e, { x, y }) => {
  if (widgetWindow) {
    widgetWindow.setPosition(Math.round(x), Math.round(y));
  }
});

ipcMain.handle('center-widget', () => {
  showOrRestoreWidget();
  if (widgetWindow) {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenW, height: screenH } = primaryDisplay.workAreaSize;
    const width = widgetWindow.getBounds().width;
    const x = Math.round((screenW - width) / 2);
    const y = Math.round(screenH - 100);
    widgetWindow.setPosition(x, y);
    widgetWindow.show();
    widgetWindow.setAlwaysOnTop(true, 'screen-saver');
  }
});

ipcMain.handle('auto-paste', async (e, text) => {
  return await autoPaster.paste(text);
});

ipcMain.handle('process-voice-pipeline', async (e, { audioData, preset, options }) => {
  return await aiEngine.processVoicePipeline(audioData, preset, options);
});

ipcMain.handle('transcribe-audio', async (e, { audioData, options }) => {
  return await aiEngine.transcribeAudio(audioData, options);
});

ipcMain.handle('refine-text', async (e, { transcription, preset, options }) => {
  return await aiEngine.refineText(transcription, preset, options);
});

ipcMain.handle('test-stt', async (e, config) => {
  return await aiEngine.testSTT(config);
});

ipcMain.handle('fetch-models', async (e, { baseUrl, apiKey }) => {
  return await aiEngine.fetchModels(baseUrl, apiKey);
});

ipcMain.handle('check-for-updates', async () => updater.checkForUpdates());

ipcMain.handle('download-update', async (e, installer) => {
  return await updater.downloadUpdate(installer, e.sender);
});

ipcMain.handle('install-update', async (e, filePath) => {
  return await updater.installUpdate(filePath);
});

ipcMain.handle('open-chat', () => openChatWindow());
ipcMain.handle('close-chat', () => {
  if (chatWindow && !chatWindow.isDestroyed()) chatWindow.close();
});
ipcMain.handle('toggle-chat', () => toggleChatWindow());
ipcMain.handle('chat-message', async (e, { messages, presetId }) => {
  const config = storage.getConfig();
  const activeProviderId = config.active_provider || 'omniroute';
  const providerConfig = config.providers?.[activeProviderId] || {};
  const preset = config.presets?.find((p) => p.id === (presetId || config.active_preset_id)) || config.presets?.[0];

  return await aiEngine.chatWithAI(messages, preset, {
    baseUrl: providerConfig.base_url,
    apiKey: providerConfig.api_key,
    model: providerConfig.model,
    temperature: config.llm?.temperature ?? 0.4,
    maxTokens: config.llm?.max_tokens ?? 1500,
  });
});

ipcMain.handle('open-release-page', async () => {
  await updater.openReleasePage();
  return true;
});

ipcMain.handle('open-external', async (e, url) => {
  const { shell } = require('electron');
  if (url) shell.openExternal(url);
});

// App Lifecycle
app.whenReady().then(() => {

  // Automatically grant microphone & media permissions to Electron windows
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'media' || permission === 'microphone') {
      return callback(true); // Always approve microphone access
    }
    callback(true);
  });

  createWidgetWindow();
  createTray();
  registerGlobalHotkeys();

  // Start persistent watchdog to ensure widget never disappears
  startWidgetWatchdog();

  // Re-assert widget visibility and on-top status when waking from sleep or unlocking
  if (powerMonitor) {
    powerMonitor.on('resume', () => {
      setTimeout(() => showOrRestoreWidget(), 1000);
    });
    powerMonitor.on('unlock-screen', () => {
      setTimeout(() => showOrRestoreWidget(), 1000);
    });
  }

  // Ensure Auto-Start on Windows Boot is active if configured (default true)
  const initialConfig = storage.getConfig();
  if (initialConfig.ui?.autostart_on_boot !== false) {
    autoStarter.setAutoStart(true);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWidgetWindow();
    }
  });
});

app.on('before-quit', () => {
  app.isQuitting = true;
});

app.on('will-quit', () => {
  if (widgetWatchdog) {
    clearInterval(widgetWatchdog);
  }
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', (e) => {
  e.preventDefault();
});
