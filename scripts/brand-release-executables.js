#!/usr/bin/env node
/**
 * Finds and brands every FreeWispr executable created by electron-builder.
 * This runs after packaging so the app executable and NSIS installer both
 * receive FreeWispr icon/version metadata without winCodeSign privileges.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const projectDir = path.resolve(__dirname, '..');
const outputDir = path.join(projectDir, 'dist-electron');
const brandScript = path.join(__dirname, 'brand-windows-exe.js');

function walk(dir, results = []) {
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(fullPath, results);
    else if (entry.isFile() && /\.exe$/i.test(entry.name)) results.push(fullPath);
  }
  return results;
}

const executables = walk(outputDir).filter((file) => {
  const base = path.basename(file).toLowerCase();
  // NSIS installers contain an integrity checksum over their contents. Editing
  // the final Setup EXE after packaging would invalidate it, so only brand the
  // unpacked application executable; NSIS already uses build/icon.ico itself.
  return base === 'freewispr voice assistant.exe';
});

if (executables.length === 0) {
  console.error('[ERROR] No FreeWispr executable was found in dist-electron.');
  process.exit(1);
}

for (const executable of executables) {
  const result = spawnSync(process.execPath, [brandScript, executable], {
    stdio: 'inherit',
    windowsHide: true,
  });
  if (result.status !== 0) process.exit(result.status || 1);
}

const installer = walk(outputDir).find((file) => /freewispr-setup-.*\.exe$/i.test(path.basename(file)));
if (!installer) {
  console.error('[ERROR] NSIS setup executable was not created.');
  process.exit(1);
}

console.log(`✅ FreeWispr release installer ready: ${installer}`);
