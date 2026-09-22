/**
 * Windows Active Window Auto-Paste Engine for Electron
 * Copies text to system clipboard and simulates Ctrl+V into whatever application
 * the user is currently typing in (Chrome, Word, VS Code, Slack, Notepad, etc.)
 *
 * Note: The floating widget is NON-focusable, so it never steals focus from the
 * user's input field. That is what keeps the paste landing in the right place.
 */

const { clipboard } = require('electron');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Temporary VBScript path for instantaneous keystroke simulation
const VBS_PATH = path.join(os.tmpdir(), 'freewispr_paste.vbs');

try {
  // Create single reusable VBScript to send Ctrl+V without child process spawn overhead
  fs.writeFileSync(VBS_PATH, 'Set w = CreateObject("WScript.Shell")\nw.SendKeys "^v"\n', 'utf-8');
} catch (e) {
  console.error('Error creating VBS paste helper:', e);
}

class AutoPaster {
  /**
   * Copies text to Windows clipboard and simulates Ctrl+V
   * @param {string} text - Refined text to insert
   * @param {number} delayMs - Optional delay before keystroke
   */
  async paste(text, delayMs = 60) {
    if (!text || typeof text !== 'string') return false;

    try {
      // 1. Write text directly to Windows system clipboard
      clipboard.writeText(text);

      // 2. Wait a tiny moment for active window focus
      await new Promise((resolve) => setTimeout(resolve, delayMs));

      // 3. Trigger Ctrl+V simulation on Windows
      if (process.platform === 'win32') {
        exec(`cscript //nologo "${VBS_PATH}"`, (err) => {
          if (err) {
            // Fallback to powershell SendKeys
            exec('powershell -command "$wshell = New-Object -ComObject wscript.shell; $wshell.SendKeys(\'^v\')"', (psErr) => {
              if (psErr) console.error('Auto-paste fallback error:', psErr);
            });
          }
        });
      }
      return true;
    } catch (e) {
      console.error('AutoPaster error:', e);
      return false;
    }
  }
}

module.exports = new AutoPaster();