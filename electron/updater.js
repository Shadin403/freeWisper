/**
 * FreeWispr GitHub Release Updater
 *
 * Checks Shadin403/freeWisper for the release tagged "FreeWispr" (with a
 * fallback to the repository's latest release), downloads the newest Windows
 * Setup executable, reports progress to the renderer, and launches it safely.
 */

const { app, shell } = require('electron');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

const OWNER = 'Shadin403';
const REPO = 'freeWisper';
const PREFERRED_TAG = 'FreeWispr';
const RELEASE_PAGE = `https://github.com/${OWNER}/${REPO}/releases/tag/${PREFERRED_TAG}`;
const API_BASE = `https://api.github.com/repos/${OWNER}/${REPO}`;
const USER_AGENT = 'FreeWispr-Voice-Assistant-Updater';

function normalizeVersion(value = '') {
  const match = String(value).match(/\d+(?:\.\d+){0,3}/);
  if (!match) return null;
  const parts = match[0].split('.').map((part) => Number.parseInt(part, 10) || 0);
  while (parts.length < 4) parts.push(0);
  return parts.slice(0, 4);
}

function compareVersions(a, b) {
  const av = normalizeVersion(a);
  const bv = normalizeVersion(b);
  if (!av || !bv) return 0;
  for (let i = 0; i < 4; i += 1) {
    if (av[i] !== bv[i]) return av[i] > bv[i] ? 1 : -1;
  }
  return 0;
}

function inferReleaseVersion(release) {
  const candidates = [release?.tag_name, release?.name, release?.body];
  for (const candidate of candidates) {
    const version = normalizeVersion(candidate);
    if (version) return version.slice(0, 3).join('.');
  }
  return null;
}

function findWindowsInstaller(release) {
  const assets = Array.isArray(release?.assets) ? release.assets : [];
  return (
    assets.find((asset) => /freewispr.*setup.*\.exe$/i.test(asset.name)) ||
    assets.find((asset) => /setup.*\.exe$/i.test(asset.name)) ||
    assets.find((asset) => /\.exe$/i.test(asset.name)) ||
    null
  );
}

async function fetchRelease() {
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': USER_AGENT,
    'X-GitHub-Api-Version': '2022-11-28',
  };

  try {
    const tagged = await axios.get(`${API_BASE}/releases/tags/${encodeURIComponent(PREFERRED_TAG)}`, {
      headers,
      timeout: 15000,
    });
    return tagged.data;
  } catch (error) {
    if (error.response?.status !== 404) throw error;
    const latest = await axios.get(`${API_BASE}/releases/latest`, { headers, timeout: 15000 });
    return latest.data;
  }
}

class GitHubUpdater {
  constructor() {
    this.downloadInProgress = false;
  }

  async checkForUpdates() {
    const currentVersion = app.getVersion();
    try {
      const release = await fetchRelease();
      const installer = findWindowsInstaller(release);
      const releaseVersion = inferReleaseVersion(release);
      const hasUpdate = releaseVersion
        ? compareVersions(releaseVersion, currentVersion) > 0
        : Boolean(installer);

      return {
        success: true,
        hasUpdate,
        currentVersion,
        latestVersion: releaseVersion || release.tag_name || release.name || 'Available',
        releaseName: release.name || release.tag_name || 'FreeWispr Update',
        releaseNotes: release.body || 'A new FreeWispr release is available.',
        publishedAt: release.published_at || null,
        releaseUrl: release.html_url || RELEASE_PAGE,
        installer: installer
          ? {
              name: installer.name,
              size: installer.size,
              downloadUrl: installer.browser_download_url,
            }
          : null,
        message: installer
          ? hasUpdate
            ? 'A new FreeWispr update is available.'
            : 'This GitHub release is available to install.'
          : 'The release exists, but it does not contain a Windows Setup executable.',
      };
    } catch (error) {
      const status = error.response?.status;
      const message =
        status === 404
          ? 'No published FreeWispr GitHub release was found.'
          : error.response?.data?.message || error.message || 'Unable to check GitHub for updates.';
      return {
        success: false,
        hasUpdate: false,
        currentVersion,
        latestVersion: null,
        releaseUrl: RELEASE_PAGE,
        installer: null,
        error: message,
      };
    }
  }

  async downloadUpdate(installer, sender) {
    if (this.downloadInProgress) {
      return { success: false, error: 'An update download is already in progress.' };
    }
    if (!installer?.downloadUrl || !/^https:\/\/github\.com\//i.test(installer.downloadUrl)) {
      return { success: false, error: 'The GitHub release does not contain a valid Setup download.' };
    }

    this.downloadInProgress = true;
    const safeName = path.basename(installer.name || 'FreeWispr-Setup.exe').replace(/[^a-zA-Z0-9._ -]/g, '_');
    const destination = path.join(os.tmpdir(), safeName);
    const partialPath = `${destination}.part`;

    try {
      for (const file of [destination, partialPath]) {
        if (fs.existsSync(file)) fs.unlinkSync(file);
      }

      const response = await axios.get(installer.downloadUrl, {
        responseType: 'stream',
        maxRedirects: 10,
        timeout: 120000,
        headers: { 'User-Agent': USER_AGENT },
      });
      const total = Number(response.headers['content-length']) || Number(installer.size) || 0;
      let received = 0;
      const writer = fs.createWriteStream(partialPath);

      response.data.on('data', (chunk) => {
        received += chunk.length;
        const percent = total > 0 ? Math.min(100, Math.round((received / total) * 100)) : null;
        if (sender && !sender.isDestroyed()) {
          sender.send('update-download-progress', { received, total, percent });
        }
      });

      await new Promise((resolve, reject) => {
        response.data.on('error', reject);
        writer.on('error', reject);
        writer.on('finish', resolve);
        response.data.pipe(writer);
      });

      fs.renameSync(partialPath, destination);
      return { success: true, filePath: destination, name: safeName };
    } catch (error) {
      try {
        if (fs.existsSync(partialPath)) fs.unlinkSync(partialPath);
      } catch (_) { /* ignore cleanup errors */ }
      return { success: false, error: error.message || 'Update download failed.' };
    } finally {
      this.downloadInProgress = false;
    }
  }

  async installUpdate(filePath) {
    if (!filePath || !fs.existsSync(filePath) || !/\.exe$/i.test(filePath)) {
      return { success: false, error: 'The downloaded FreeWispr Setup file was not found.' };
    }

    try {
      const child = spawn(filePath, [], {
        detached: true,
        stdio: 'ignore',
        windowsHide: false,
      });
      child.unref();
      setTimeout(() => {
        app.isQuitting = true;
        app.quit();
      }, 900);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message || 'Could not launch the FreeWispr Setup installer.' };
    }
  }

  openReleasePage() {
    return shell.openExternal(RELEASE_PAGE);
  }
}

module.exports = new GitHubUpdater();
module.exports._test = { normalizeVersion, compareVersions, inferReleaseVersion, findWindowsInstaller };
