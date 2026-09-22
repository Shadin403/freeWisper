#!/usr/bin/env node
/**
 * Applies FreeWispr icon and Windows version metadata without winCodeSign.
 * Uses the pure-JavaScript `resedit` dependency, so it does not require
 * Developer Mode, Administrator rights, symlink privileges, Wine or signing tools.
 *
 * Usage: node scripts/brand-windows-exe.js <path-to-exe>
 */

const fs = require('fs');
const path = require('path');
const ResEdit = require('resedit');

const projectDir = path.resolve(__dirname, '..');
const exePath = path.resolve(
  process.argv[2] || path.join(projectDir, 'dist-electron', 'win-unpacked', 'FreeWispr Voice Assistant.exe')
);
const iconPath = path.join(projectDir, 'build', 'icon.ico');
const packageJson = require(path.join(projectDir, 'package.json'));

function parseVersion(version) {
  const parts = String(version || '1.0.0').split('.').map((n) => Math.max(0, Math.min(65535, Number.parseInt(n, 10) || 0)));
  while (parts.length < 4) parts.push(0);
  return parts.slice(0, 4);
}

if (!fs.existsSync(exePath)) {
  console.error(`[ERROR] FreeWispr executable not found: ${exePath}`);
  process.exit(1);
}
if (!fs.existsSync(iconPath)) {
  console.error(`[ERROR] FreeWispr icon not found: ${iconPath}`);
  process.exit(1);
}

try {
  const input = fs.readFileSync(exePath);
  const exe = ResEdit.NtExecutable.from(input, { ignoreCert: true });
  const resources = ResEdit.NtExecutableResource.from(exe);

  // Replace the Electron icon group with every image from our multi-size ICO.
  const iconFile = ResEdit.Data.IconFile.from(fs.readFileSync(iconPath));
  const existingGroups = ResEdit.Resource.IconGroupEntry.fromEntries(resources.entries);
  const targetGroup = existingGroups[0];
  const iconGroupId = targetGroup ? targetGroup.id : 1;
  const iconLang = targetGroup ? targetGroup.lang : 1033;
  ResEdit.Resource.IconGroupEntry.replaceIconsForResource(
    resources.entries,
    iconGroupId,
    iconLang,
    iconFile.icons.map((item) => item.data)
  );

  // Replace Electron's embedded file/product details shown by Explorer/taskbar.
  let versionInfo = ResEdit.Resource.VersionInfo.fromEntries(resources.entries)[0];
  if (!versionInfo) {
    versionInfo = ResEdit.Resource.VersionInfo.create(1033, {}, []);
  }
  const [major, minor, patch, revision] = parseVersion(packageJson.version);
  versionInfo.setFileVersion(major, minor, patch, revision, 1033);
  versionInfo.setProductVersion(major, minor, patch, revision, 1033);
  versionInfo.setStringValues(
    { lang: 1033, codepage: 1200 },
    {
      CompanyName: packageJson.author || 'Shadin Sarkar',
      FileDescription: 'FreeWispr Voice Assistant',
      InternalName: 'FreeWispr Voice Assistant',
      LegalCopyright: packageJson.build?.copyright || 'Copyright © 2026 Shadin Sarkar',
      OriginalFilename: 'FreeWispr Voice Assistant.exe',
      ProductName: 'FreeWispr Voice Assistant',
      FileVersion: `${major}.${minor}.${patch}.${revision}`,
      ProductVersion: `${major}.${minor}.${patch}.${revision}`,
    }
  );
  versionInfo.outputToResourceEntries(resources.entries);

  resources.outputResource(exe);
  const output = Buffer.from(exe.generate());
  const tempPath = `${exePath}.freewispr.tmp`;
  fs.writeFileSync(tempPath, output);
  fs.renameSync(tempPath, exePath);

  console.log(`✅ FreeWispr icon and Windows metadata applied: ${exePath}`);
} catch (error) {
  console.error('[ERROR] Failed to brand the FreeWispr executable:', error.stack || error.message);
  process.exit(1);
}
