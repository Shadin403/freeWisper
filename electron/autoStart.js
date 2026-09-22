/**
 * Windows Auto-Launch on Startup Engine for FreeWispr
 * Automatically registers FreeWispr in Windows Startup so it launches
 * silently when the PC is booted or user logs into Windows.
 */

const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

class AutoStartManager {
  constructor() {
    this.startupDir = path.join(
      process.env.APPDATA || '',
      'Microsoft',
      'Windows',
      'Start Menu',
      'Programs',
      'Startup'
    );
    this.shortcutPath = path.join(this.startupDir, 'FreeWispr.lnk');
    this.vbsPath = path.join(__dirname, '../Start_FreeWispr.vbs');
    this.exePath = path.join(
      __dirname,
      '../dist-electron/win-unpacked/FreeWispr Voice Assistant.exe'
    );
  }

  /**
   * Gets the appropriate executable/launch path for startup
   */
  getTargetPath() {
    if (app && app.isPackaged) {
      return process.execPath;
    }
    if (fs.existsSync(this.exePath)) {
      return this.exePath;
    }
    if (fs.existsSync(this.vbsPath)) {
      return this.vbsPath;
    }
    return process.execPath;
  }

  /**
   * Enables or disables auto-launch on Windows Startup
   * @param {boolean} enable - true to enable, false to disable
   */
  async setAutoStart(enable = true) {
    if (process.platform !== 'win32') return false;

    // 1. Electron Native Login Item Settings
    try {
      if (app && typeof app.setLoginItemSettings === 'function') {
        const target = this.getTargetPath();
        app.setLoginItemSettings({
          openAtLogin: enable,
          path: target,
          args: ['--hidden'],
        });
      }
    } catch (e) {
      console.warn('Native setLoginItemSettings error:', e.message);
    }

    // 2. Windows Startup Folder Shortcut (100% reliable across all Windows 10/11 versions)
    return new Promise((resolve) => {
      if (enable) {
        const target = this.getTargetPath();
        const workingDir = path.dirname(target);
        const iconPath = path.join(__dirname, '../build/icon.ico');

        // PowerShell script to create Windows shortcut (.lnk) in Startup folder
        const psScript = `
$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut('${this.shortcutPath.replace(/'/g, "''")}')
$Shortcut.TargetPath = '${target.replace(/'/g, "''")}'
$Shortcut.WorkingDirectory = '${workingDir.replace(/'/g, "''")}'
$Shortcut.Description = 'FreeWispr Voice Assistant Auto-Launch'
if (Test-Path '${iconPath.replace(/'/g, "''")}') {
  $Shortcut.IconLocation = '${iconPath.replace(/'/g, "''")},0'
}
$Shortcut.Save()
        `.trim();

        exec(
          `powershell -NoProfile -WindowStyle Hidden -Command "${psScript.replace(/"/g, '\\"')}"`,
          { windowsHide: true },
          (err) => {
            if (err) {
              console.error('Failed to create Startup shortcut:', err);
              resolve(false);
            } else {
              console.log('✅ FreeWispr Windows Startup Shortcut enabled at:', this.shortcutPath);
              resolve(true);
            }
          }
        );
      } else {
        // Remove shortcut from Startup folder
        try {
          if (fs.existsSync(this.shortcutPath)) {
            fs.unlinkSync(this.shortcutPath);
          }
        } catch (e) {
          console.error('Failed to delete Startup shortcut:', e);
        }

        // Also clean up any legacy registry run key
        exec(
          'reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "FreeWispr" /f',
          { windowsHide: true },
          () => resolve(true)
        );
      }
    });
  }

  /**
   * Checks if auto-launch is currently enabled
   */
  isAutoStartEnabled() {
    if (process.platform !== 'win32') return false;
    try {
      if (fs.existsSync(this.shortcutPath)) {
        return true;
      }
      if (app && typeof app.getLoginItemSettings === 'function') {
        const settings = app.getLoginItemSettings();
        return Boolean(settings.openAtLogin);
      }
    } catch (e) {
      console.warn('Check autostart error:', e);
    }
    return false;
  }
}

module.exports = new AutoStartManager();
